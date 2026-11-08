"""Barra de navegacion inferior: el menu en la base de la ventana."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import QButtonGroup, QFrame, QHBoxLayout, QPushButton

from .. import icons
from .. import theme as th

# Los mismos destinos que la barra lateral, con su icono y su etiqueta.
BOTTOM_ITEMS: list[tuple[str, str, str]] = [
    ("home", "Inicio", "home"),
    ("search", "Buscar", "search"),
    ("library", "Biblioteca", "library"),
    ("queue", "Cola", "queue"),
    ("settings", "Ajustes", "settings"),
]


class BottomBar(QFrame):
    """Menu inferior con las paginas principales, centrado y en pildoras."""

    page_selected = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("BottomBar")
        self.setFixedHeight(56)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(20, 6, 20, 6)
        layout.setSpacing(6)
        # Dos resortes envuelven al grupo para dejarlo centrado: con uno solo
        # queda pegado a la izquierda.
        layout.addStretch(1)

        self._group = QButtonGroup(self)
        self._group.setExclusive(True)
        self._pills: dict[str, QPushButton] = {}

        for key, label, icon_name in BOTTOM_ITEMS:
            btn = QPushButton(f" {label}")
            btn.setObjectName("NavPill")
            btn.setCheckable(True)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setIconSize(QSize(16, 16))
            btn.setProperty("iconName", icon_name)
            btn.clicked.connect(lambda _=False, k=key: self.page_selected.emit(k))
            btn.toggled.connect(lambda _=None, b=btn: self._recolor(b))
            self._group.addButton(btn)
            self._pills[key] = btn
            layout.addWidget(btn)

        layout.addStretch(1)
        self.refresh()

    def select(self, page: str) -> None:
        btn = self._pills.get(page)
        if btn and not btn.isChecked():
            btn.setChecked(True)

    def _recolor(self, button: QPushButton) -> None:
        t = th.active()
        color = t.accent if button.isChecked() else t.text_dim
        button.setIcon(icons.icon(button.property("iconName"), color, 16))

    def refresh(self) -> None:
        """Repinta los iconos al cambiar de tema."""
        for button in self._pills.values():
            self._recolor(button)
