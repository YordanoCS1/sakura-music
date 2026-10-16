"""Barra de la Biblioteca: filtro, contadores, vistas y acciones."""

from __future__ import annotations

from PySide6.QtWidgets import QHBoxLayout, QLabel, QLineEdit, QWidget

from .. import theme as th
from .buttons import IconButton, TextButton

# Cada forma de ver las pistas y su boton. El orden fija el indice en el stack.
VIEW_SPECS = (
    ("table", "list", "Vista en tabla"),
    ("grid", "grid", "Vista en tarjetas"),
    ("discs", "disc", "Vista de discos"),
    ("carousel", "music", "Vista carrusel"),
)


class LibraryToolbar(QWidget):
    """Barra superior con el filtro, los contadores y los botones de accion.

    Vive aparte de la pagina para que `library.py` no arme la veintena de
    widgets de la barra: solo conecta sus senales.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        bar = QHBoxLayout(self)
        bar.setContentsMargins(0, 0, 0, 10)
        bar.setSpacing(10)

        self.filter_box = QLineEdit()
        self.filter_box.setObjectName("SearchInput")
        self.filter_box.setPlaceholderText("Buscar canciones en toda la biblioteca...")
        self.filter_box.setClearButtonEnabled(True)
        self.filter_box.setMaximumWidth(420)
        self.filter_box.setMinimumWidth(260)
        bar.addWidget(self.filter_box)

        self.review_filter_btn = TextButton("Ver toda la biblioteca", "ghost")
        self.review_filter_btn.setVisible(False)
        bar.addWidget(self.review_filter_btn, 0)

        self.stats = QLabel("")
        self.stats.setObjectName("EmptyState")
        bar.addSpacing(8)
        bar.addWidget(self.stats, 1)

        self.view_buttons: dict[str, IconButton] = {}
        for mode, icon_name, tooltip in VIEW_SPECS:
            button = IconButton(icon_name, tooltip, 38)
            bar.addWidget(button, 0)
            self.view_buttons[mode] = button

        self.open_button = IconButton("folder", "Cambiar carpeta", 38)
        bar.addWidget(self.open_button, 0)

        self.reload_button = IconButton("repeat", "Volver a escanear", 38)
        bar.addWidget(self.reload_button, 0)

        self.undo_button = IconButton("restore", "Deshacer último lote", 38)
        bar.addWidget(self.undo_button, 0)

        self.edit_button = TextButton("Editar metadatos", "ghost")
        self.edit_button.setEnabled(False)
        bar.addWidget(self.edit_button, 0)

        # Con varias pistas marcadas el boton anterior pasa a ser el de lote:
        # editar de a una con diez seleccionadas no es lo que se quiere.
        self.batch_button = TextButton("Editar en lote", "accent")
        self.batch_button.setEnabled(False)
        self.batch_button.setVisible(False)
        bar.addWidget(self.batch_button, 0)

    def set_active_view(self, mode: str) -> None:
        """Marca el boton de la vista activa."""
        t = th.active()
        active_style = (
            f"background: {t.surface_hover}; border: 1px solid {t.accent}; "
            f"border-radius: {t.radius_sm}px;"
        )
        for name, button in self.view_buttons.items():
            button.setStyleSheet(active_style if name == mode else "")

    def refresh(self) -> None:
        """Recolorea los botones con icono tras un cambio de tema."""
        self.open_button.refresh()
        self.reload_button.refresh()
        self.undo_button.refresh()
        for button in self.view_buttons.values():
            button.refresh()
