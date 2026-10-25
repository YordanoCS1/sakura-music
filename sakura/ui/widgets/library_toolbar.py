"""Barra de la Biblioteca: buscador, secciones, vistas y acciones.

Todo vive en una sola linea: las secciones y el buscador a la izquierda, el
contador y las acciones a la derecha. Asi la pagina gana altura util sin perder
ninguna herramienta.
"""

from __future__ import annotations

from PySide6.QtCore import QPoint, Qt, Signal
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMenu,
    QPushButton,
    QTabBar,
    QWidget,
)

from .. import theme as th
from ...config import load_settings, save_settings
from .buttons import IconButton, TextButton

# Filtros de revisión rápidos, mostrados como chips. Cada chip mapea al valor
# que espera TrackFilterProxy.set_review_filter().
CHIP_SPECS = (
    ("all", "Todos", ""),
    ("untagged", "Sin tags", "untagged"),
    ("missing_cover", "Sin portada", "missing_cover"),
    ("duplicates", "Duplicados", "duplicates"),
)


class FilterChip(QPushButton):
    """Píldora de filtro activa o inactiva."""

    def __init__(self, key: str, label: str, parent=None):
        super().__init__(label, parent)
        self.setObjectName("FilterChip")
        self.setCheckable(True)
        self.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        self._key = key
        self.setCursor(Qt.CursorShape.PointingHandCursor)

    @property
    def key(self) -> str:
        return self._key


class FilterChipsBar(QWidget):
    """Barra horizontal de filtros tipo chip para la Biblioteca.

    Emite `filter_changed(str)` cuando el usuario selecciona un chip.
    """

    filter_changed = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("FilterChipsBar")
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(6)

        self.chips: dict[str, FilterChip] = {}
        for key, label, _value in CHIP_SPECS:
            chip = FilterChip(key, label, self)
            chip.toggled.connect(lambda checked, k=key: self._on_toggled(k, checked))
            layout.addWidget(chip)
            self.chips[key] = chip
        layout.addStretch(1)

        self._active_key = "all"
        self.chips["all"].setChecked(True)

    def _on_toggled(self, key: str, checked: bool) -> None:
        if not checked:
            return
        if key == self._active_key:
            return
        self._active_key = key
        for k, chip in self.chips.items():
            chip.setChecked(k == key)
        self.filter_changed.emit(_value_for_key(key))

    def set_active(self, key: str) -> None:
        """Marca el chip como activo sin disparar la señal."""
        if key == self._active_key:
            return
        self._active_key = key
        for k, chip in self.chips.items():
            chip.setChecked(k == key)

    def active_key(self) -> str:
        return self._active_key


def _value_for_key(key: str) -> str:
    for k, _label, value in CHIP_SPECS:
        if k == key:
            return value
    return ""


# Cada forma de ver las pistas y su boton. El orden fija el indice en el stack.
VIEW_SPECS = (
    ("table", "list", "Vista en tabla"),
    ("grid", "grid", "Vista en tarjetas"),
    ("mosaic", "image", "Vista mosaico"),
    ("albums", "album", "Vista de álbumes"),
    ("discs", "disc", "Vista de discos"),
    ("carousel", "music", "Vista carrusel"),
)

# Secciones de contenido, no formatos de vista. Cada una abre la presentacion
# que mejor le sienta; el usuario puede cambiarla despues en Canciones.
SECTION_SPECS = (
    ("songs", "Canciones"),
    ("folders", "Carpetas"),
)
SECTION_KEYS = tuple(key for key, _label in SECTION_SPECS)

SECTION_VIEWS = {
    "songs": "table",
    "folders": "table",
}


class LibraryToolbar(QWidget):
    """Encabezado de la Biblioteca con busqueda, secciones y acciones."""

    zoom_changed = Signal(int)
    section_changed = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("LibraryToolbar")
        self._zoom_percent: int = 100

        bar = QHBoxLayout(self)
        bar.setContentsMargins(0, 0, 0, 4)
        bar.setSpacing(12)

        self.filter_box = QLineEdit()
        self.filter_box.setObjectName("SearchInput")
        self.filter_box.setPlaceholderText("Buscar por título, artista o álbum...")
        self.filter_box.setClearButtonEnabled(True)
        self.filter_box.setMaximumWidth(380)
        self.filter_box.setMinimumWidth(220)
        self.filter_box.setMinimumHeight(36)
        bar.addWidget(self.filter_box, 1)

        self.section_bar = QTabBar()
        self.section_bar.setObjectName("LibrarySections")
        self.section_bar.setDrawBase(False)
        self.section_bar.setExpanding(False)
        self.section_bar.setUsesScrollButtons(False)
        self.section_bar.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        for key, label in SECTION_SPECS:
            index = self.section_bar.addTab(label)
            self.section_bar.setTabData(index, key)
        self.section_bar.currentChanged.connect(self._on_section_changed)
        bar.addWidget(self.section_bar, 0)

        self.review_filter_btn = TextButton("Ver toda la biblioteca", "ghost", icon="list")
        self.review_filter_btn.setVisible(False)
        bar.addWidget(self.review_filter_btn, 0)

        self.stats = QLabel("")
        self.stats.setObjectName("ToolbarStats")
        bar.addWidget(self.stats, 0)

        bar.addStretch(1)

        self.view_group = self._view_group()
        bar.addWidget(self.view_group, 0)

        self.zoom_out_button = IconButton("minus", "Reducir tamaño (100%)", 30)
        self.zoom_in_button = IconButton("plus", "Aumentar tamaño (100%)", 30)
        self.zoom_out_button.clicked.connect(lambda: self._zoom_step(-15))
        self.zoom_in_button.clicked.connect(lambda: self._zoom_step(15))
        bar.addWidget(self.zoom_out_button, 0)
        bar.addWidget(self.zoom_in_button, 0)

        bar.addWidget(self._separator(), 0)

        self.open_button = IconButton("folder", "Cambiar carpeta", 36)
        bar.addWidget(self.open_button, 0)

        self.reload_button = IconButton("repeat", "Volver a escanear", 36)
        bar.addWidget(self.reload_button, 0)

        self.undo_button = IconButton("undo", "Deshacer último lote", 36)
        bar.addWidget(self.undo_button, 0)

        self._apply_hidden_views()

    def _on_section_changed(self, index: int) -> None:
        key = self.section_bar.tabData(index)
        if key:
            self.section_changed.emit(str(key))

    def set_active_section(self, section: str) -> None:
        """Marca una seccion sin volver a emitir la senal."""
        for index in range(self.section_bar.count()):
            if self.section_bar.tabData(index) == section:
                was_blocked = self.section_bar.blockSignals(True)
                self.section_bar.setCurrentIndex(index)
                self.section_bar.blockSignals(was_blocked)
                return

    def _zoom_step(self, delta: int) -> None:
        new_val = max(70, min(160, self._zoom_percent + delta))
        if new_val != self._zoom_percent:
            self._zoom_percent = new_val
            self.zoom_out_button.setToolTip(f"Reducir tamaño ({self._zoom_percent}%)")
            self.zoom_in_button.setToolTip(f"Aumentar tamaño ({self._zoom_percent}%)")
            self.zoom_changed.emit(self._zoom_percent)

    def _separator(self) -> QFrame:
        sep = QFrame()
        sep.setObjectName("ToolbarSeparator")
        sep.setFixedWidth(1)
        sep.setFixedHeight(22)
        return sep

    def _view_group(self) -> QWidget:
        """Las vistas de Canciones en un control segmentado."""
        group = QFrame()
        group.setObjectName("SegmentedControl")
        layout = QHBoxLayout(group)
        layout.setContentsMargins(4, 4, 4, 4)
        layout.setSpacing(2)

        self.view_buttons: dict[str, IconButton] = {}
        for mode, icon_name, tooltip in VIEW_SPECS:
            button = IconButton(icon_name, tooltip, 32)
            button.setObjectName("SegmentButton")
            button.setCheckable(True)
            button.setGraphicsEffect(None)
            button.setContextMenuPolicy(Qt.ContextMenuPolicy.CustomContextMenu)
            button.customContextMenuRequested.connect(
                lambda pos, m=mode: self._on_view_button_context_menu(pos, m)
            )
            layout.addWidget(button)
            self.view_buttons[mode] = button
        return group

    def _on_view_button_context_menu(self, pos: QPoint, mode: str) -> None:
        button = self.view_buttons.get(mode)
        if button is None:
            return
        menu = QMenu(self)
        label = next((desc for m, _, desc in VIEW_SPECS if m == mode), mode)
        clean_label = label.replace("Vista ", "").capitalize()
        hidden_views = set(load_settings().get("hidden_library_views", []))
        visible_count = sum(1 for m in self.view_buttons if m not in hidden_views)

        action_hide = menu.addAction(f"Ocultar «{clean_label}» de la barra")
        action_hide.setEnabled(visible_count > 1)
        action_hide.triggered.connect(lambda: self.hide_view(mode))

        if hidden_views:
            menu.addSeparator()
            action_restore = menu.addAction(
                f"Mostrar todas las vistas ({len(hidden_views)} ocultas)"
            )
            action_restore.triggered.connect(self.restore_all_views)

        menu.exec(button.mapToGlobal(pos))

    def hide_view(self, mode: str) -> None:
        hidden = list(load_settings().get("hidden_library_views", []))
        if mode not in hidden:
            hidden.append(mode)
            save_settings({"hidden_library_views": hidden})
        self._apply_hidden_views()
        btn = self.view_buttons.get(mode)
        if btn and btn.isChecked():
            for other_btn in self.view_buttons.values():
                if other_btn.isVisible():
                    other_btn.click()
                    break

    def restore_all_views(self) -> None:
        save_settings({"hidden_library_views": []})
        self._apply_hidden_views()

    def _apply_hidden_views(self) -> None:
        hidden = set(load_settings().get("hidden_library_views", []))
        for m, btn in self.view_buttons.items():
            btn.setVisible(m not in hidden)

    def set_active_view(self, mode: str) -> None:
        """Marca el boton de la vista activa."""
        for name, button in self.view_buttons.items():
            button.setChecked(name == mode)

    def set_view_controls_visible(self, visible: bool) -> None:
        self.view_group.setVisible(visible)
        self.zoom_out_button.setVisible(visible)
        self.zoom_in_button.setVisible(visible)

    def refresh(self) -> None:
        """Recolorea los botones con icono tras un cambio de tema."""
        self.open_button.refresh()
        self.reload_button.refresh()
        self.undo_button.refresh()
        for button in self.view_buttons.values():
            button.refresh()


# ------------------- selector de densidad ------------------------------------

DENSITY_SPECS = (
    ("compact", "Compacta", 0.85),
    ("comfortable", "Comoda", 1.0),
    ("spacious", "Espaciosa", 1.15),
)


class DensitySelector(QWidget):
    """Toggle de densidad de la biblioteca: compacta / comoda / espaciosa.

    Cambiar la densidad recrea el tema con otro factor `density`, lo que
    escala todos los paddings del QSS sin tocar los colores.
    """

    density_changed = Signal(float)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("DensitySelector")
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(2)

        self.buttons: dict[str, TextButton] = {}
        for key, label, value in DENSITY_SPECS:
            btn = TextButton(label, "ghost")
            btn.setCheckable(True)
            btn.setProperty("density_value", value)
            btn.clicked.connect(lambda checked, v=value, k=key: self._on_clicked(v, k))
            layout.addWidget(btn)
            self.buttons[key] = btn

        self._current_density = float(th.active().density)
        self._update_button_states()

    def _on_clicked(self, value: float, key: str) -> None:
        self._current_density = value
        self._update_button_states()
        self.density_changed.emit(value)

    def _update_button_states(self) -> None:
        for key, btn in self.buttons.items():
            _, _, value = next(s for s in DENSITY_SPECS if s[0] == key)
            btn.setChecked(abs(value - self._current_density) < 0.001)

    def set_density(self, value: float) -> None:
        """Establece la densidad sin disparar la señal."""
        if abs(value - self._current_density) < 0.001:
            return
        self._current_density = value
        self._update_button_states()

    def current_density(self) -> float:
        return self._current_density
