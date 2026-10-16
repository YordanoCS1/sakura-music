"""Portada del editor de metadatos: pintado y helpers de imagen.

El editor sabe *que* mostrar (bytes elegidos, vista previa del catalogo o
placeholder); este widget solo sabe pintarlo.
"""

from __future__ import annotations

from PySide6.QtCore import QBuffer, QIODevice, QSize, Qt
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QLabel

from ..covers import render_cover

# 190 px en vez de 220: con el panel de tags completo, 220 hacia que el campo
# 'Nº de pista' quedara fuera de la vista en pantallas de 800 de alto.
COVER_SIZE = 190

IMAGE_FILTER = "Imágenes (*.jpg *.jpeg *.png *.webp *.bmp);;Todos (*)"


def size_text(bytes_: int) -> str:
    if bytes_ < 1024:
        return f"{bytes_} B"
    if bytes_ < 1024 * 1024:
        return f"{bytes_ // 1024} KB"
    return f"{bytes_ / (1024 * 1024):.1f} MB"


class MetadataCoverView(QLabel):
    """La portada del editor: placeholder, imagen incrustada o vista previa."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setObjectName("MetadataCover")

    def show_placeholder(self) -> None:
        ratio = self.devicePixelRatioF()
        pixmap = render_cover(None, round(COVER_SIZE * ratio))
        pixmap.setDevicePixelRatio(ratio)
        self.setPixmap(pixmap)

    def show_bytes(self, data: bytes) -> None:
        ratio = self.devicePixelRatioF()
        pixmap = render_cover(data, round(COVER_SIZE * ratio))
        pixmap.setDevicePixelRatio(ratio)
        self.setPixmap(pixmap)

    def show_pixmap(self, pixmap: QPixmap) -> None:
        """Ajusta un pixmap suelto (la vista previa) al tamano del widget."""
        ratio = self.devicePixelRatioF()
        size = QSize(round(self.width() * ratio), round(self.height() * ratio))
        display = pixmap.scaled(
            size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        display.setDevicePixelRatio(ratio)
        self.setPixmap(display)


def pixmap_bytes(pixmap: QPixmap) -> bytes:
    """Los bytes PNG de un pixmap, para guardarlo como portada."""
    buffer = QBuffer()
    if not buffer.open(QIODevice.OpenModeFlag.WriteOnly):
        return b""
    if not pixmap.save(buffer, "PNG"):
        return b""
    return bytes(buffer.data())


def paint_thumbnail(label: QLabel, pixmap: QPixmap) -> None:
    label.setPixmap(
        pixmap.scaled(
            label.size(),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
    )
