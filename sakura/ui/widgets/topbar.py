"""Barra superior: navegación en cápsula (TopNav) y búsqueda global."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QButtonGroup,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QWidget,
)

from .. import icons, sakura
from .. import theme as th
from .buttons import IconButton

NAV_PILLS: list[tuple[str, str, str]] = [
    ("home", "Inicio", "home"),
    ("search", "Buscar", "search"),
    ("library", "Biblioteca", "library"),
    ("queue", "Cola", "queue"),
]


class TopBar(QFrame):
    """Barra superior con navegación en cápsula o buscador global."""

    page_selected = Signal(str)
    search_changed = Signal(str)
    download_clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("TopBar")
        self.setFixedHeight(64)
        self._nav_layout = "top"
        self._pills: dict[str, QPushButton] = {}

        self._main_layout = QHBoxLayout(self)
        self._main_layout.setContentsMargins(20, 8, 20, 8)
        self._main_layout.setSpacing(14)

        # 1. Logo / Brand para modo TopNav
        self.brand_widget = QWidget()
        brand_layout = QHBoxLayout(self.brand_widget)
        brand_layout.setContentsMargins(0, 0, 0, 0)
        brand_layout.setSpacing(8)

        self.brand_icon = QLabel()
        self.brand_icon.setFixedSize(24, 24)
        self.brand_title = QLabel("Sakura Music")
        self.brand_title.setObjectName("PageHeader")
        self.brand_title.setStyleSheet("font-size: 16px; font-weight: 800;")
        brand_layout.addWidget(self.brand_icon)
        brand_layout.addWidget(self.brand_title)
        self._main_layout.addWidget(self.brand_widget)

        # 2. Cápsula de navegación central (TopNav Pills)
        self.nav_container = QWidget()
        nav_layout = QHBoxLayout(self.nav_container)
        nav_layout.setContentsMargins(0, 0, 0, 0)
        nav_layout.setSpacing(6)

        self._group = QButtonGroup(self)
        self._group.setExclusive(True)

        for key, label, icon_name in NAV_PILLS:
            btn = QPushButton(f" {label}")
            btn.setObjectName("NavPill")
            btn.setCheckable(True)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setIconSize(QSize(16, 16))
            btn.setProperty("iconName", icon_name)
            btn.setProperty("pageKey", key)
            btn.clicked.connect(lambda _=False, k=key: self.page_selected.emit(k))
            btn.toggled.connect(lambda _=None, b=btn: self._recolor_pill(b))
            self._group.addButton(btn)
            self._pills[key] = btn
            nav_layout.addWidget(btn)

        self._main_layout.addWidget(self.nav_container)
        self._main_layout.addStretch(1)

        # 3. Buscador
        self.search = QLineEdit()
        self.search.setObjectName("SearchInput")
        self.search.setPlaceholderText("Buscar canciones, artistas, álbumes...")
        self.search.setClearButtonEnabled(True)
        self.search.setMaximumWidth(380)
        self.search.setMinimumWidth(220)
        self.search.textChanged.connect(self.search_changed)
        self._main_layout.addWidget(self.search, 1)

        # 4. Botón de descarga / acción
        self.download_btn = IconButton("download", "Ir a buscar", 36)
        self.download_btn.clicked.connect(self.download_clicked)
        self._main_layout.addWidget(self.download_btn, 0, Qt.AlignmentFlag.AlignVCenter)

        # 5. Botón de Ajustes para modo TopNav
        self.settings_btn = IconButton("settings", "Ajustes", 36)
        self.settings_btn.clicked.connect(lambda: self.page_selected.emit("settings"))
        self._main_layout.addWidget(self.settings_btn, 0, Qt.AlignmentFlag.AlignVCenter)

        self.set_nav_layout("top")
        self.refresh()

    def set_nav_layout(self, mode: str) -> None:
        """Alterna entre barra superior completa o buscador simple para sidebar."""
        self._nav_layout = mode if mode in ("top", "dock") else "top"
        is_top = self._nav_layout == "top"
        self.brand_widget.setVisible(is_top)
        self.nav_container.setVisible(is_top)
        self.settings_btn.setVisible(is_top)

    def select(self, page: str) -> None:
        btn = self._pills.get(page)
        if btn and not btn.isChecked():
            btn.setChecked(True)

    def _recolor_pill(self, button: QPushButton) -> None:
        t = th.active()
        color = t.accent if button.isChecked() else t.text_dim
        button.setIcon(icons.icon(button.property("iconName"), color, 16))

    def refresh(self) -> None:
        """Recolorea los iconos y píldoras al cambiar de tema."""
        t = th.active()
        self.brand_icon.setPixmap(sakura.render(t.accent, 24))
        self.brand_title.setStyleSheet(f"color: {t.text}; font-size: 16px; font-weight: 800;")
        self.download_btn.refresh()
        self.settings_btn.refresh()
        for button in self._pills.values():
            self._recolor_pill(button)

    def focus_search(self) -> None:
        if self.isVisible() and self.search.isVisible():
            self.search.setFocus()
            self.search.selectAll()