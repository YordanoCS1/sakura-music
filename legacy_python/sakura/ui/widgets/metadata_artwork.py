"""Portada del editor de metadatos: pintado y helpers de imagen.

El editor sabe *que* mostrar (bytes elegidos, vista previa del catalogo o
placeholder); este widget solo sabe pintarlo.
"""

from __future__ import annotations

from PySide6.QtCore import QBuffer, QIODevice, QRectF, QSize, Qt, Signal
from PySide6.QtGui import (
    QColor,
    QDragEnterEvent,
    QDropEvent,
    QMouseEvent,
    QPainter,
    QPainterPath,
    QPixmap,
)
from PySide6.QtWidgets import QLabel

from .. import icons
from .. import theme as th
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
    """La portada del editor: placeholder, imagen incrustada o vista previa.

    Tambien es una zona de destino: un clic abre el selector y arrastrar una
    imagen sobre ella la carga directamente. El velo con el icono aparece solo
    al pasar el mouse, para no tapar la portada mientras se revisa.
    """

    clicked = Signal()
    image_dropped = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._hover = False
        self._drag_active = False
        self.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.setObjectName("MetadataCover")
        self.setAcceptDrops(True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setToolTip("Haz clic o arrastra una imagen para cambiar la portada")

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

    # --- interaccion --------------------------------------------------------

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit()
        super().mouseReleaseEvent(event)

    def enterEvent(self, event) -> None:
        self._hover = True
        self.update()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        self._hover = False
        self._drag_active = False
        self.update()
        super().leaveEvent(event)

    def dragEnterEvent(self, event: QDragEnterEvent) -> None:
        if self._drop_path(event) is not None:
            self._drag_active = True
            self.update()
            event.acceptProposedAction()

    def dragLeaveEvent(self, event) -> None:
        self._drag_active = False
        self.update()
        super().dragLeaveEvent(event)

    def dropEvent(self, event: QDropEvent) -> None:
        path = self._drop_path(event)
        self._drag_active = False
        self.update()
        if path is not None:
            event.acceptProposedAction()
            self.image_dropped.emit(path)

    @staticmethod
    def _drop_path(event) -> str | None:
        mime = event.mimeData()
        if not mime.hasUrls():
            return None
        for url in mime.urls():
            if not url.isLocalFile():
                continue
            path = url.toLocalFile()
            if path.lower().endswith((".jpg", ".jpeg", ".png", ".webp", ".bmp")):
                return path
        return None

    def paintEvent(self, event) -> None:
        super().paintEvent(event)
        if not self._hover and not self._drag_active:
            return

        t = th.active()
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        rect = QRectF(0, 0, self.width(), self.height())
        path = QPainterPath()
        path.addRoundedRect(rect, t.radius, t.radius)

        veil = QColor(th.tint(t.bg, t.accent, 0.30))
        veil.setAlpha(170 if self._drag_active else 135)
        painter.fillPath(path, veil)

        icon_name = "download" if self._drag_active else "edit"
        icon_size = 34
        icon = icons.render(icon_name, t.accent, icon_size)
        painter.drawPixmap(
            (self.width() - icon_size) // 2,
            (self.height() - icon_size) // 2,
            icon,
        )
        painter.setPen(QColor(t.accent))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRoundedRect(rect.adjusted(1, 1, -1, -1), t.radius, t.radius)
        painter.end()



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
