"""Placeholders animados tipo \"shimmer\" para estados de carga.

Dibujan un gradiente que se desplaza de izquierda a derecha, simulando que el
contenido se esta cargando. No dependen de recursos externos: todo se pinta con
`QPainter` y los colores del tema activo.
"""

from __future__ import annotations

from PySide6.QtCore import QPropertyAnimation, QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QLinearGradient, QPainter, QPixmap
from PySide6.QtWidgets import QWidget

from .. import theme as th


class ShimmerPlaceholder(QWidget):
    """Esqueleto animado: rectangulo con brillo que se desplaza.

    Usalo mientras se cargan portadas, caratulas o cualquier contenido visual
    que tarda unos momentos en aparecer.
    """

    def __init__(
        self,
        width: int = 200,
        height: int = 200,
        radius: int = 12,
        parent=None,
    ):
        super().__init__(parent)
        self.setObjectName("ShimmerPlaceholder")
        self.setFixedSize(width, height)
        self._radius = radius
        self._offset = -width  # empieza fuera a la izquierda

        # Animacion: el brillo recorre el widget de izquierda a derecha.
        self._anim = QPropertyAnimation(self, b"offset", self)
        self._anim.setDuration(1400)
        self._anim.setStartValue(-width)
        self._anim.setEndValue(width + height)
        self._anim.setLoopCount(-1)  # infinito
        self._anim.start()

    # --- propiedad animable --------------------------------------------------

    def _get_offset(self) -> int:
        return self._offset

    def _set_offset(self, value: int) -> None:
        self._offset = value
        self.update()

    offset = property(_get_offset, _set_offset)

    # --- pintado -------------------------------------------------------------

    def paintEvent(self, event) -> None:  # noqa: N802
        t = th.active()
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)

        # Base: surface_alt ligeramente mas oscuro para que el brillo resalte.
        base = QColor(t.surface_alt)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(base)
        painter.drawRoundedRect(QRectF(0, 0, self.width(), self.height()), self._radius, self._radius)

        # Brillo: gradiente que se desplaza.
        w = self.width()
        h = self.height()
        grad = QLinearGradient(self._offset, 0, self._offset + w, 0)
        grad.setColorAt(0.0, QColor(t.border))
        grad.setColorAt(0.5, QColor(t.accent))
        grad.setColorAt(1.0, QColor(t.border))

        painter.setBrush(grad)
        painter.setPen(Qt.PenStyle.NoPen)
        # Mascara redondeada para que el brillo no salga de la forma.
        path = QPixmap(self.size())
        path.fill(Qt.GlobalColor.transparent)
        pm_painter = QPainter(path)
        pm_painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        pm_painter.setPen(Qt.PenStyle.NoPen)
        pm_painter.setBrush(Qt.GlobalColor.white)
        pm_painter.drawRoundedRect(
            QRectF(0, 0, w, h), self._radius, self._radius
        )
        pm_painter.end()

        painter.setClipPath(self._rounded_path())
        painter.drawPixmap(0, 0, path)
        painter.end()

    def _rounded_path(self):
        from PySide6.QtGui import QPainterPath

        path = QPainterPath()
        path.addRoundedRect(
            QRectF(0, 0, self.width(), self.height()), self._radius, self._radius
        )
        return path

    def refresh(self) -> None:
        """Recolorea con el tema activo (se llama tras cambiar de tema)."""
        self.update()


class ShimmerCoverPlaceholder(ShimmerPlaceholder):
    """Version cuadrada con aspect ratio de portada de album."""

    def __init__(self, size: int = 144, parent=None):
        super().__init__(width=size, height=size, radius=max(4, size // 12), parent=parent)