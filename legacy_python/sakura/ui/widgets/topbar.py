"""Barra superior: navegación en cápsula (TopNav) y búsqueda global.

Tiene dos modos, y el modo lo decide el layout de navegación elegido:

- `top`: la barra ES el menú. Marca, cápsula de navegación, buscador y acciones.
- `sidebar` / `dock`: navega la barra lateral, así que aquí solo queda el buscador
  para no duplicar el menú (antes `sidebar` se resolvía como `top` y convivían
  las dos navegaciones).
"""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QButtonGroup,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QSizePolicy,
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

# Ancho fijo del buscador por modo: en `top` compite con la navegación, y en
# compacto una caja elastica dejaba un hueco entre el campo y el botón.
SEARCH_W_TOP = 340
SEARCH_W_COMPACT = 440


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

        # 1. Marca (solo en modo `top`)
        self.brand_widget = QWidget()
        brand_layout = QHBoxLayout(self.brand_widget)
        brand_layout.setContentsMargins(0, 0, 0, 0)
        brand_layout.setSpacing(8)

        self.brand_icon = QLabel()
        self.brand_icon.setFixedSize(24, 24)
        self.brand_title = QLabel("Sakura Music")
        self.brand_title.setObjectName("BrandTitle")
        brand_layout.addWidget(self.brand_icon)
        brand_layout.addWidget(self.brand_title)
        self._main_layout.addWidget(self.brand_widget)

        # 2. Cápsula de navegación: las píldoras viven dentro de un marco para
        #    leerse como un grupo y no como botones sueltos sobre el fondo.
        self.nav_container = QFrame()
        self.nav_container.setObjectName("NavCapsule")
        self.nav_container.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        nav_layout = QHBoxLayout(self.nav_container)
        nav_layout.setContentsMargins(4, 4, 4, 4)
        nav_layout.setSpacing(2)

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

        # Dos separadores con factor alternable: el sobrante va al de `top`
        # (grupo a la derecha) o al compacto (grupo a la izquierda). Sin ninguno
        # con factor, el `QBoxLayout` reparte el sobrante entre todos los ítems y
        # el buscador queda flotando en el medio.
        self._lead_index = self._main_layout.count()
        self._main_layout.addStretch(1)

        # 3. Buscador con icono guia
        self.search = QLineEdit()
        self.search.setObjectName("SearchInput")
        self.search.setPlaceholderText("Buscar canciones, artistas, álbumes...")
        self.search.setClearButtonEnabled(True)
        # `Fixed`: sin esto el `QLineEdit` reclama expansion (su politica por
        # defecto) y el layout reparte el sobrante a los costados, dejando el
        # campo flotando en el medio en vez de alineado.
        self.search.setSizePolicy(
            QSizePolicy.Policy.Fixed, QSizePolicy.Policy.Fixed
        )
        self._search_action = self.search.addAction(
            icons.icon("search", th.active().text_muted, 16),
            QLineEdit.ActionPosition.LeadingPosition,
        )
        self.search.textChanged.connect(self.search_changed)
        self._main_layout.addWidget(self.search)

        # 4. Acciones
        self.download_btn = IconButton("download", "Ir a buscar", 36)
        self.download_btn.clicked.connect(self.download_clicked)
        self._main_layout.addWidget(self.download_btn, 0, Qt.AlignmentFlag.AlignVCenter)

        self.settings_btn = IconButton("settings", "Ajustes", 36)
        self.settings_btn.clicked.connect(lambda: self.page_selected.emit("settings"))
        self._main_layout.addWidget(self.settings_btn, 0, Qt.AlignmentFlag.AlignVCenter)

        self._trail_index = self._main_layout.count()
        self._main_layout.addStretch(0)

        self.set_nav_layout("top")
        self.refresh()

    def set_nav_layout(self, mode: str) -> None:
        """Cápsula completa en modo `top`; solo el buscador en sidebar/dock."""
        self._nav_layout = mode if mode in ("top", "dock", "sidebar") else "top"
        is_top = self._nav_layout == "top"
        self.brand_widget.setVisible(is_top)
        self.nav_container.setVisible(is_top)
        self.settings_btn.setVisible(is_top)
        # El grupo se pega a la derecha en `top` y a la izquierda en compacto.
        self._main_layout.setStretch(self._lead_index, 1 if is_top else 0)
        self._main_layout.setStretch(self._trail_index, 0 if is_top else 1)
        self.search.setFixedWidth(SEARCH_W_TOP if is_top else SEARCH_W_COMPACT)

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
        if self._search_action is not None:
            self._search_action.setIcon(icons.icon("search", t.text_muted, 16))
        self.download_btn.refresh()
        self.settings_btn.refresh()
        for button in self._pills.values():
            self._recolor_pill(button)

    def focus_search(self) -> None:
        if self.isVisible() and self.search.isVisible():
            self.search.setFocus()
            self.search.selectAll()
