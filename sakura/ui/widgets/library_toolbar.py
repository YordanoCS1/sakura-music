"""Barra de la Biblioteca: filtro, contadores, vistas y acciones.

Dos zonas separadas por un divisor: a la izquierda el filtro y el contador, a
la derecha el control de vista y las acciones. Las acciones de edicion no viven
aca: aparecen en la barra contextual al marcar pistas (`library_selection.py`).
"""

from __future__ import annotations

from PySide6.QtCore import QPoint, Qt, Signal
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMenu,
    QWidget,
)

from ...config import load_settings, save_settings
from .buttons import IconButton, TextButton

# Cada forma de ver las pistas y su boton. El orden fija el indice en el stack.
VIEW_SPECS = (
    ("table", "list", "Vista en tabla"),
    ("grid", "grid", "Vista en tarjetas"),
    ("discs", "disc", "Vista de discos"),
    ("carousel", "music", "Vista carrusel"),
)


class LibraryToolbar(QWidget):
    """Barra superior con el filtro, los contadores, las vistas y las acciones."""

    zoom_changed = Signal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("LibraryToolbar")
        self._zoom_percent: int = 100
        bar = QHBoxLayout(self)
        bar.setContentsMargins(0, 0, 0, 10)
        bar.setSpacing(10)

        # --- zona izquierda: filtro y contador -----------------------------
        self.filter_box = QLineEdit()
        self.filter_box.setObjectName("SearchInput")
        self.filter_box.setPlaceholderText("Buscar por título, artista o álbum...")
        self.filter_box.setClearButtonEnabled(True)
        self.filter_box.setMaximumWidth(420)
        self.filter_box.setMinimumWidth(260)
        self.filter_box.setMinimumHeight(38)
        bar.addWidget(self.filter_box)

        self.review_filter_btn = TextButton("Ver toda la biblioteca", "ghost", icon="list")
        self.review_filter_btn.setVisible(False)
        bar.addWidget(self.review_filter_btn, 0)

        self.stats = QLabel("")
        self.stats.setObjectName("ToolbarStats")
        bar.addSpacing(4)
        bar.addWidget(self.stats, 1)

        # --- zona derecha: vistas y acciones -------------------------------
        bar.addWidget(self._separator())

        bar.addWidget(self._view_group(), 0)

        # Controles de escala / zoom
        self.zoom_out_button = IconButton("minus", "Reducir tamaño (100%)", 32)
        self.zoom_in_button = IconButton("plus", "Aumentar tamaño (100%)", 32)
        self.zoom_out_button.clicked.connect(lambda: self._zoom_step(-15))
        self.zoom_in_button.clicked.connect(lambda: self._zoom_step(15))
        bar.addWidget(self.zoom_out_button, 0)
        bar.addWidget(self.zoom_in_button, 0)

        bar.addWidget(self._separator())

        self.open_button = IconButton("folder", "Cambiar carpeta", 38)
        bar.addWidget(self.open_button, 0)

        self.reload_button = IconButton("repeat", "Volver a escanear", 38)
        bar.addWidget(self.reload_button, 0)

        self.undo_button = IconButton("undo", "Deshacer último lote", 38)
        bar.addWidget(self.undo_button, 0)

        self.detail_button = IconButton("info", "Mostrar / ocultar panel de información", 38)
        bar.addWidget(self.detail_button, 0)
        self._apply_hidden_views()

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
        """Las vistas de Biblioteca en un control segmentado."""
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

    def refresh(self) -> None:
        """Recolorea los botones con icono tras un cambio de tema."""
        self.open_button.refresh()
        self.reload_button.refresh()
        self.undo_button.refresh()
        self.detail_button.refresh()
        for button in self.view_buttons.values():
            button.refresh()
