"""Barra de titulo personalizada (ventana sin marco nativo)."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel

from .. import theme as th
from .buttons import IconButton

BUTTON_W = 44


class TitleBar(QFrame):
    """Franja superior: arrastre de ventana y controles min/max/close."""

    def __init__(self, window, parent=None):
        super().__init__(parent)
        self.setObjectName("TitleBar")
        self._window = window
        self._drag_offset = None
        self.setFixedHeight(th.active().titlebar_h)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(18, 0, 6, 0)
        layout.setSpacing(2)

        self.title = QLabel(window.windowTitle())
        self.title.setObjectName("TitleBarTitle")
        layout.addWidget(self.title)
        layout.addStretch(1)

        self._min = IconButton("minus", "Minimizar", 40, parent=self)
        self._min.clicked.connect(self._window.showMinimized)
        self._max = IconButton("maximize", "Maximizar", 40, parent=self)
        self._max.clicked.connect(self._toggle_maximize)
        self._close = IconButton("close", "Cerrar", 40, parent=self)
        self._close.clicked.connect(self._window.close)

        for btn in (self._min, self._max, self._close):
            btn.setFixedWidth(BUTTON_W)
            layout.addWidget(btn)

        self.refresh()

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
        name = "restore" if self._window.isMaximized() else "maximize"
        self._max.set_icon_name(name)
        # El rojo de cerrar sale del tema: escrito a mano no seguia a Nord ni a
        # Catppuccin, que tienen su propio `danger`.
        self._close.setStyleSheet(
            "QPushButton#IconButton:hover {"
            f" background: {t.danger}; border-radius: {t.radius_sm}px; }}"
        )
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

        Lo usa tambien `refresh()`: cambiar de tema con el mouse sobre la barra
        dejaba pegado el color del tema anterior hasta el proximo `enterEvent`.
        """
        if active:
            self.setStyleSheet(f"#TitleBar {{ background: {th.active().surface_alt}; }}")
        else:
            self.setStyleSheet("")