"""Barra lateral de navegacion principal."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QButtonGroup,
    QFrame,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from .. import icons, sakura
from .. import theme as th

NAV_ITEMS: list[tuple[str, str]] = [
    ("home", "Inicio"),
    ("search", "Buscar"),
    ("library", "Biblioteca"),
    ("queue", "Cola"),
]


class Sidebar(QFrame):
    """Navegacion lateral con secciones, seleccion exclusiva y modo dock compacto."""

    page_selected = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("Sidebar")
        self._slim = False
        self.setFixedWidth(th.active().sidebar_w)

        self._layout = QVBoxLayout(self)
        self._layout.setContentsMargins(10, 16, 10, 14)
        self._layout.setSpacing(4)

        self._layout.addWidget(self._brand())

        group = QButtonGroup(self)
        group.setExclusive(True)
        self._group = group
        self._buttons: dict[str, QPushButton] = {}

        self._sec_label = self._section("Navegación")
        self._layout.addWidget(self._sec_label)

        for key, label in NAV_ITEMS:
            btn = self._nav_button(key, label)
            btn.clicked.connect(lambda _=False, k=key: self.page_selected.emit(k))
            btn.toggled.connect(lambda _=None, b=btn: self._recolor(b))
            group.addButton(btn)
            self._buttons[key] = btn
            self._layout.addWidget(btn)

        # Aqui iran las playlists del usuario
        self._playlists = QWidget()
        playlist_layout = QVBoxLayout(self._playlists)
        playlist_layout.setContentsMargins(0, 0, 0, 0)
        playlist_layout.setSpacing(2)
        self._layout.addWidget(self._playlists)

        self._layout.addStretch(1)

        settings = self._nav_button("settings", "Ajustes")
        settings.clicked.connect(lambda: self.page_selected.emit("settings"))
        settings.toggled.connect(lambda _=None, b=settings: self._recolor(b))
        self._settings_button = settings
        group.addButton(settings)
        self._layout.addWidget(settings)

    def _brand(self) -> QWidget:
        brand = QWidget()
        self._brand_layout = QVBoxLayout(brand)
        self._brand_layout.setContentsMargins(10, 0, 10, 18)
        self._brand_layout.setSpacing(2)

        self._brand_icon = QLabel()
        self._brand_icon.setFixedSize(24, 24)
        self._brand_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self._brand_title = QLabel("Sakura Music")
        self._brand_subtitle = QLabel("Gestor y descargador")
        self._brand_subtitle.setObjectName("SidebarBrandSubtitle")
        self._recolor_brand()

        header_row = QHBoxLayout()
        header_row.setContentsMargins(0, 0, 0, 0)
        header_row.setSpacing(8)
        header_row.addWidget(self._brand_icon)
        header_row.addWidget(self._brand_title)

        self._brand_layout.addLayout(header_row)
        self._brand_layout.addWidget(self._brand_subtitle)
        return brand

    def _recolor_brand(self) -> None:
        t = th.active()
        self._brand_icon.setPixmap(sakura.render(t.accent, 24))
        # El titulo va en linea porque `test_theme_switch` comprueba que cambie
        # de color en vivo; el subtitulo lo pinta el QSS por objectName.
        self._brand_title.setStyleSheet(
            f"color: {t.text}; font-size: 15px; font-weight: 800; background: transparent;"
        )

    def _section(self, label: str) -> QLabel:
        lbl = QLabel(label)
        lbl.setObjectName("SidebarSection")
        lbl.setFixedHeight(22)
        return lbl

    def _nav_button(self, key: str, label: str) -> QPushButton:
        btn = QPushButton(f"  {label}" if not self._slim else "")
        btn.setObjectName("NavButton")
        btn.setCheckable(True)
        btn.setCursor(Qt.CursorShape.PointingHandCursor)
        btn.setIconSize(QSize(18, 18))
        btn.setIcon(icons.icon(key, th.active().text_dim, 18, dimmed=th.active().text_muted))
        btn.setProperty("iconName", key)
        btn.setProperty("label", label)
        btn.setToolTip(label)
        btn.setFixedHeight(38)
        return btn

    def set_slim(self, slim: bool) -> None:
        """Alterna entre barra lateral ancha y mini dock vertical compacto (68px)."""
        self._slim = slim
        t = th.active()
        self.setFixedWidth(68 if slim else t.sidebar_w)
        self._sec_label.setVisible(not slim)
        self._brand_title.setVisible(not slim)
        self._brand_subtitle.setVisible(not slim)

        for button in (*self._buttons.values(), self._settings_button):
            label = button.property("label")
            button.setText("" if slim else f"  {label}")
            # El modo compacto se pinta por propiedad en el QSS, no en linea:
            # asi el tema manda y no queda un estilo pegado al cambiar.
            button.setProperty("slim", slim)
            button.style().unpolish(button)
            button.style().polish(button)
            self._recolor(button)

    def select(self, page: str) -> None:
        btn = self._buttons.get(page) or (
            self._settings_button if page == "settings" else None
        )
        if btn and not btn.isChecked():
            btn.setChecked(True)

    def _recolor(self, button: QPushButton) -> None:
        """El icono sigue al estado: atenuado en reposo, acento si esta activo."""
        t = th.active()
        color = t.accent if button.isChecked() else t.text_dim
        button.setIcon(
            icons.icon(button.property("iconName"), color, 18, dimmed=t.text_muted)
        )

    def refresh(self) -> None:
        """Reaplica tamano e iconos tras un cambio de tema."""
        t = th.active()
        self.setFixedWidth(68 if self._slim else t.sidebar_w)
        self._recolor_brand()
        for button in (*self._buttons.values(), self._settings_button):
            self._recolor(button)