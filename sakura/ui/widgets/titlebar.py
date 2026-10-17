"""Barra de titulo personalizada (ventana sin marco nativo)."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel

from .. import theme as th
from .buttons import IconButton

# Ancho de cada boton de ventana. Pegados y a sangre contra el borde derecho,
# como en las ventanas nativas.
BUTTON_W = 46
# El glifo es chico aunque el boton ocupe toda la altura de la barra.
ICON_SIZE = 16


class TitleBar(QFrame):
    """Franja superior: arrastre de ventana y controles min/max/close."""

    def __init__(self, window, parent=None):
        super().__init__(parent)
        self.setObjectName("TitleBar")
        self._window = window
        self._drag_offset = None
        self.setFixedHeight(th.active().titlebar_h)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(18, 0, 0, 0)
        layout.setSpacing(0)

        self.title = QLabel(window.windowTitle())
        self.title.setObjectName("TitleBarTitle")
        layout.addWidget(self.title)
        layout.addStretch(1)

        self._min = self._make_control("minus", "Minimizar")
        self._min.clicked.connect(self._window.showMinimized)
        self._max = self._make_control("maximize", "Maximizar")
        self._max.clicked.connect(self._toggle_maximize)
        self._close = self._make_control("close", "Cerrar")
        self._close.setProperty("variant", "close")
        self._close.clicked.connect(self._window.close)

        for btn in (self._min, self._max, self._close):
            layout.addWidget(btn)

        self.refresh()

    def _make_control(self, icon_name: str, tooltip: str) -> IconButton:
        """Boton de ventana: cuadrado, a sangre, sin foco ni sombra."""
        button = IconButton(icon_name, tooltip, th.active().titlebar_h, parent=self)
        button.setProperty("winControl", True)
        button.setFixedWidth(BUTTON_W)
        button.setIconSize(QSize(ICON_SIZE, ICON_SIZE))
        button.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        button.setCursor(Qt.CursorShape.ArrowCursor)
        button.setGraphicsEffect(None)
        button.refresh()
        return button

    def _toggle_maximize(self) -> None:
        if self._window.isMaximized():
            self._window.showNormal()
            self._max.set_icon_name("maximize")
        else:
            self._window.showMaximized()
            self._max.set_icon_name("restore")

    def set_title(self, text: str) -> None:
        """Texto de contexto (pagina actual). Vacio = solo area de arrastre."""
        self.title.setText(text)

    def refresh(self) -> None:
        t = th.active()
        self.setFixedHeight(t.titlebar_h)
        for btn in (self._min, self._max, self._close):
            btn.setFixedHeight(t.titlebar_h)
        name = "restore" if self._window.isMaximized() else "maximize"
        self._max.set_icon_name(name)
        self._apply_background(self.underMouse())

    # --- arrastre de ventana -------------------------------------------------

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            cursor = event.globalPosition().toPoint()
            self._drag_offset = cursor - self._window.frameGeometry().topLeft()
            event.accept()

    def mouseMoveEvent(self, event) -> None:
        if self._drag_offset is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self._window.move(event.globalPosition().toPoint() - self._drag_offset)
            event.accept()

    def mouseDoubleClickEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._toggle_maximize()

    def enterEvent(self, event) -> None:
        # Resalta el fondo de la barra sobre el fondo de la ventana.
        self._apply_background(True)
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        self._apply_background(False)
        super().leaveEvent(event)

    def _apply_background(self, active: bool) -> None:
        """Fondo aclarado con el mouse encima, del tema activo.

        Se hace por propiedad + `polish` en vez de `setStyleSheet`: el QSS del
        tema decide el color, asi que cambiar de tema con el mouse sobre la barra
        no deja pegado el color anterior.
        """
        self.setProperty("hovered", active)
        self.style().unpolish(self)
        self.style().polish(self)