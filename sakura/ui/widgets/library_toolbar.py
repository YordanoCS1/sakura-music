"""Barra de la Biblioteca: filtro, contadores, vistas y acciones.

Dos zonas separadas por un divisor: a la izquierda el filtro y el contador, a
la derecha el control de vista y las acciones. Las acciones de edicion no viven
aca: aparecen en la barra contextual al marcar pistas (`library_selection.py`).
"""

from __future__ import annotations

from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QWidget,
)

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

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("LibraryToolbar")
        bar = QHBoxLayout(self)
        bar.setContentsMargins(0, 0, 0, 10)
        bar.setSpacing(10)

        # --- zona izquierda: filtro y contador -----------------------------
        self.filter_box = QLineEdit()
        self.filter_box.setObjectName("SearchInput")
        self.filter_box.setPlaceholderText("Buscar canciones en toda la biblioteca...")
        self.filter_box.setClearButtonEnabled(True)
        self.filter_box.setMaximumWidth(420)
        self.filter_box.setMinimumWidth(260)
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

        bar.addWidget(self._separator())

        self.open_button = IconButton("folder", "Cambiar carpeta", 38)
        bar.addWidget(self.open_button, 0)

        self.reload_button = IconButton("repeat", "Volver a escanear", 38)
        bar.addWidget(self.reload_button, 0)

        self.undo_button = IconButton("restore", "Deshacer último lote", 38)
        bar.addWidget(self.undo_button, 0)

    def _separator(self) -> QFrame:
        sep = QFrame()
        sep.setObjectName("ToolbarSeparator")
        sep.setFixedWidth(1)
        sep.setFixedHeight(22)
        return sep

    def _view_group(self) -> QWidget:
        """Los cuatro disenos como un control segmentado, no botones sueltos."""
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
            layout.addWidget(button)
            self.view_buttons[mode] = button
        return group

    def set_active_view(self, mode: str) -> None:
        """Marca el boton de la vista activa."""
        for name, button in self.view_buttons.items():
            button.setChecked(name == mode)

    def refresh(self) -> None:
        """Recolorea los botones con icono tras un cambio de tema."""
        self.open_button.refresh()
        self.reload_button.refresh()
        self.undo_button.refresh()
        for button in self.view_buttons.values():
            button.refresh()
