"""Render de portadas: esquinas redondeadas, marco y placeholder.

Estaba copiado en tres widgets (detalle de biblioteca, ficha y editor) y solo
el placeholder daba esquinas: la imagen real salia como un rectángulo duro
contra el fondo. Ademas, al no llevar marco, una portada blanca sobre fondo
oscuro parecia un hole en la ventana.
"""

from __future__ import annotations

from collections import OrderedDict
from pathlib import Path

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QPainter, QPainterPath, QPen, QPixmap

from ..core.library import find_folder_cover
from . import icons
from . import theme as th

# Cuantas carpetas se recuerdan. Una biblioteca puede tener miles; con el tope
# se descartan las que no se usan hace mas tiempo en vez de crecer sin fin.
COVER_CACHE_MAX = 512


class CoverCache(OrderedDict):
    """Cache de portada por carpeta con tope y descarte LRU.

    `folder_cover` guarda el resultado de recorrer cada directorio, pero un
    `dict` comun se queda con todas las carpetas de la biblioteca. Al pasarse
    del tope se tira la entrada usada hace mas tiempo.
    """

    def __init__(self, maxsize: int = COVER_CACHE_MAX):
        super().__init__()
        self._maxsize = maxsize

    def __getitem__(self, folder: Path) -> Path | None:
        value = super().__getitem__(folder)
        self.move_to_end(folder)
        return value

    def __setitem__(self, folder: Path, value: Path | None) -> None:
        super().__setitem__(folder, value)
        self.move_to_end(folder)
        while len(self) > self._maxsize:
            self.popitem(last=False)


def folder_cover(folder: Path, cache: dict[Path, Path | None]) -> Path | None:
    """Portada de `folder`, con el listado resuelto una sola vez por carpeta.

    `find_folder_cover` recorre el directorio entero. Llamarlo en cada repaint
    del grid o en cada cambio de seleccion es tirar trabajo a la basura: el
    escaneo ya dejo la portada en `pista.cover_path` y esto es solo el respaldo
    para una pista recien bajada que todavia no paso por el.
    """
    if folder not in cache:
        cache[folder] = find_folder_cover(folder)
    return cache[folder]


def render_cover(destino: Path | bytes | None, size: int) -> QPixmap:
    """Pixmap de `size` x `size` con la portada de `destino`, o el placeholder.

    `destino` puede ser una ruta (biblioteca, ficha) o los bytes de la imagen
    (el editor, que todavia no la escribio). Siempre sale redondeada y con
    marco, para que las tres pantallas que muestran una portada se vean igual.
    """
    t = th.active()
    radio = t.radius

    pixmap = QPixmap(size, size)
    pixmap.fill(Qt.GlobalColor.transparent)

    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)

    original = _load(destino)
    if original is not None and not original.isNull():
        # Recorta con un clip, no con `CompositionMode_DestinationIn`: ese modo
        # no deja las esquinas transparentes al pintar sobre un QPixmap.
        path = QPainterPath()
        path.addRoundedRect(QRectF(0, 0, size, size), radio, radio)
        painter.setClipPath(path)
        painter.drawPixmap(
            0,
            0,
            original.scaled(
                size,
                size,
                Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                Qt.TransformationMode.SmoothTransformation,
            ),
        )
        painter.setClipping(False)
        painter.end()
        _marco(pixmap, size, radio)
        return pixmap

    painter.setPen(Qt.PenStyle.NoPen)
    painter.setBrush(QColor(t.surface_alt))
    painter.drawRoundedRect(0, 0, size, size, radio, radio)

    icono = size // 3
    painter.drawPixmap(
        (size - icono) // 2,
        (size - icono) // 2,
        icons.render("music", t.text_muted, icono),
    )
    painter.end()
    return pixmap


def _load(destino: Path | bytes | None) -> QPixmap | None:
    """QPixmap desde una ruta o desde bytes. None si no se puede."""
    if destino is None:
        return None
    if isinstance(destino, bytes):
        pixmap = QPixmap()
        return pixmap if pixmap.loadFromData(destino) else None

    if not destino.exists():
        return None
    return QPixmap(str(destino))


def _marco(pixmap: QPixmap, size: int, radio: int) -> None:
    """Linea de 1px alrededor, para que la portada tenga un borde.

    El rectangulo va 1px hacia adentro: en el borde el trazo se reparte entre el
    pixel 0 y el -1, queda medio pixel de nada y al antialiaser se ve sucio.
    """
    t = th.active()
    painter = QPainter(pixmap)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing)
    painter.setPen(QPen(QColor(t.border), 1))
    painter.setBrush(Qt.BrushStyle.NoBrush)
    painter.drawRoundedRect(1, 1, size - 2, size - 2, max(1, radio - 1), max(1, radio - 1))
    painter.end()