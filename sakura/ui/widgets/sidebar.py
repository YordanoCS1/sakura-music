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

from .. import icons
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
        self._rail = False
        self._rail_pinned = False
        self._rail_open = True
        self.setFixedWidth(th.active().sidebar_w)

        self._layout = QVBoxLayout(self)
        self._layout.setContentsMargins(10, 16, 10, 14)
        self._layout.setSpacing(4)

        self._layout.addWidget(self._brand())

        # Boton del riel: fija abierto o suelta. Solo se ve en modo `rail`.
        self._rail_btn = QPushButton("»")
        self._rail_btn.setObjectName("RailToggle")
        self._rail_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self._rail_btn.setFixedHeight(24)
        self._rail_btn.setVisible(False)
        self._rail_btn.setToolTip("Fijar el riel abierto")
        self._rail_btn.clicked.connect(self._on_rail_toggle)
        self._layout.addWidget(self._rail_btn)

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
        # Va por `icons` para que el logo tambien respete un PNG personalizado.
        self._brand_icon.setPixmap(icons.render("sakura", t.accent, 24))
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
        self._rail = False
        self._rail_btn.setVisible(False)
        self._apply_mode()

    def set_rail(self, rail: bool) -> None:
        """Modo riel: barra de iconos que se pliega y se despliega.

        Sin fijar, se abre al entrar el puntero y vuelve a plegarse al salir;
        con el boton de la cabecera queda fija abierta.
        """
        self._rail = rail
        self._slim = False
        self._rail_btn.setVisible(rail)
        if rail:
            self._rail_open = self._rail_pinned
        self._apply_mode()

    def _on_rail_toggle(self) -> None:
        self._rail_pinned = not self._rail_pinned
        self._rail_open = self._rail_pinned
        self._apply_mode()

    def _apply_mode(self) -> None:
        """Fija ancho y visibilidad de etiquetas segun el modo actual."""
        t = th.active()
        labels = not (self._slim or (self._rail and not self._rail_open))
        if self._slim:
            ancho = 68
        elif self._rail and not self._rail_open:
            ancho = 72
        else:
            ancho = t.sidebar_w
        self.setFixedWidth(ancho)

        self._sec_label.setVisible(labels)
        self._brand_title.setVisible(labels)
        self._brand_subtitle.setVisible(labels)

        self._rail_btn.setText("«  Soltar" if self._rail_pinned else "»")
        self._rail_btn.setToolTip(
            "Soltar el riel" if self._rail_pinned else "Fijar el riel abierto"
        )

        for button in (*self._buttons.values(), self._settings_button):
            label = button.property("label")
            button.setText(f"  {label}" if labels else "")
            # El modo compacto se pinta por propiedad en el QSS, no en linea:
            # asi el tema manda y no queda un estilo pegado al cambiar.
            button.setProperty("slim", not labels)
            button.style().unpolish(button)
            button.style().polish(button)
            self._recolor(button)

    def enterEvent(self, event) -> None:
        """Con el puntero encima, el riel se despliega (si no esta fijado)."""
        if self._rail and not self._rail_pinned:
            self._rail_open = True
            self._apply_mode()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        if self._rail and not self._rail_pinned:
            self._rail_open = False
            self._apply_mode()
        super().leaveEvent(event)

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
        self._apply_mode()
        self._recolor_brand()