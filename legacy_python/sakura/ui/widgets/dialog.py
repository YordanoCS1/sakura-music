"""Dialogo base sin marco nativo, con cabecera y sombra del tema activo.

Los QDialog con marco del sistema rompen la estetica de la app: la barra azul
de Windows aparece encima de una superficie que ya tiene su propio lenguaje.
Este modulo centraliza el cromo (arrastre, cierre, esquinas y sombra) para que
la ficha y el editor de metadatos solo se ocupen de su contenido.
"""

from __future__ import annotations

from PySide6.QtCore import QEasingCurve, QPoint, QPropertyAnimation, Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QDialog,
    QFrame,
    QGraphicsDropShadowEffect,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from ..motion import animations_enabled
from .buttons import IconButton

# Aire alrededor de la tarjeta para que la sombra no quede recortada contra el
# borde de la ventana transparente.
SHADOW_MARGIN = 18


class DialogHeader(QFrame):
    """Cabecera arrastrable con eyebrow, titulo, subtitulo y cierre."""

    def __init__(self, dialog: QDialog, parent=None):
        super().__init__(parent)
        self.setObjectName("DialogHeader")
        self._dialog = dialog
        self._drag_offset: QPoint | None = None

        layout = QHBoxLayout(self)
        layout.setContentsMargins(22, 14, 12, 14)
        layout.setSpacing(12)

        texts = QVBoxLayout()
        texts.setSpacing(2)

        self.eyebrow = QLabel("")
        self.eyebrow.setObjectName("DialogEyebrow")
        self.eyebrow.setVisible(False)
        texts.addWidget(self.eyebrow)

        self.title = QLabel("")
        self.title.setObjectName("DialogTitle")
        texts.addWidget(self.title)

        self.subtitle = QLabel("")
        self.subtitle.setObjectName("DialogSubtitle")
        self.subtitle.setVisible(False)
        texts.addWidget(self.subtitle)

        layout.addLayout(texts, 1)

        self.close_btn = IconButton("close", "Cerrar", 34)
        self.close_btn.setProperty("variant", "close")
        self.close_btn.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self.close_btn.setCursor(Qt.CursorShape.ArrowCursor)
        self.close_btn.clicked.connect(self._dialog.reject)
        layout.addWidget(self.close_btn, 0, Qt.AlignmentFlag.AlignTop)

    def set_texts(self, eyebrow: str = "", title: str = "", subtitle: str = "") -> None:
        self.eyebrow.setText(eyebrow)
        self.eyebrow.setVisible(bool(eyebrow))
        self.title.setText(title)
        self.subtitle.setText(subtitle)
        self.subtitle.setVisible(bool(subtitle))

    def refresh(self) -> None:
        self.close_btn.refresh()
        for widget in (self.eyebrow, self.title, self.subtitle):
            widget.style().unpolish(widget)
            widget.style().polish(widget)

    # --- arrastre de la ventana ---------------------------------------------

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_offset = (
                event.globalPosition().toPoint() - self._dialog.frameGeometry().topLeft()
            )
            event.accept()

    def mouseMoveEvent(self, event) -> None:
        if self._drag_offset is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self._dialog.move(event.globalPosition().toPoint() - self._drag_offset)
            event.accept()


class ThemedDialog(QDialog):
    """QDialog sin marco con superficie redondeada, sombra y cabecera propia."""

    def __init__(
        self,
        title: str = "",
        eyebrow: str = "",
        subtitle: str = "",
        parent: QWidget | None = None,
    ):
        super().__init__(parent)
        # `Dialog` mantiene el comportamiento modal y la relacion con el padre;
        # `FramelessWindowHint` quita la barra azul del sistema.
        self.setWindowFlags(Qt.WindowType.Dialog | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setProperty("themedDialog", True)
        self.setModal(True)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(SHADOW_MARGIN, SHADOW_MARGIN, SHADOW_MARGIN, SHADOW_MARGIN)
        outer.setSpacing(0)

        self.surface = QFrame()
        self.surface.setObjectName("DialogSurface")
        self.surface.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        outer.addWidget(self.surface)

        self._shadow = QGraphicsDropShadowEffect(self.surface)
        self._shadow.setBlurRadius(42)
        self._shadow.setOffset(0, 14)
        self._shadow.setColor(QColor(0, 0, 0, 130))
        self.surface.setGraphicsEffect(self._shadow)

        surface_layout = QVBoxLayout(self.surface)
        surface_layout.setContentsMargins(0, 0, 0, 0)
        surface_layout.setSpacing(0)

        self.header = DialogHeader(self, self.surface)
        self.header.set_texts(eyebrow, title, subtitle)
        surface_layout.addWidget(self.header)

        self.body = QWidget()
        self.body.setObjectName("DialogBody")
        self.content_layout = QVBoxLayout(self.body)
        self.content_layout.setContentsMargins(22, 16, 22, 18)
        self.content_layout.setSpacing(14)
        surface_layout.addWidget(self.body, 1)

        self.footer = QFrame()
        self.footer.setObjectName("DialogFooter")
        self.footer.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.footer_layout = QHBoxLayout(self.footer)
        self.footer_layout.setContentsMargins(22, 12, 22, 14)
        self.footer_layout.setSpacing(10)
        self.footer.setVisible(False)
        surface_layout.addWidget(self.footer)

        self._fade = QPropertyAnimation(self, b"windowOpacity", self)
        self._fade.setDuration(150)
        self._fade.setStartValue(0.0)
        self._fade.setEndValue(1.0)
        self._fade.setEasingCurve(QEasingCurve.Type.OutCubic)

        self.setWindowTitle(title)

    def setWindowTitle(self, title: str) -> None:
        super().setWindowTitle(title)
        if hasattr(self, "header"):
            self.header.title.setText(title)

    def set_header(self, eyebrow: str = "", title: str = "", subtitle: str = "") -> None:
        self.header.set_texts(eyebrow, title, subtitle)

    def show_footer(self, visible: bool = True) -> None:
        self.footer.setVisible(visible)

    def refresh_theme(self) -> None:
        """Recolorea el cromo cuando cambia el tema con el dialogo abierto."""
        self.header.refresh()
        for widget in (self.surface, self.footer):
            widget.style().unpolish(widget)
            widget.style().polish(widget)

    def showEvent(self, event) -> None:
        super().showEvent(event)
        if not animations_enabled():
            self.setWindowOpacity(1.0)
            return
        self.setWindowOpacity(0.0)
        self._fade.stop()
        self._fade.start()
