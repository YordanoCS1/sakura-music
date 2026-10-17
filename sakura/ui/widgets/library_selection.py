"""Barra contextual que aparece al marcar pistas en la Biblioteca.

Saca las acciones de edicion de la barra principal: solo se muestran cuando hay
una seleccion, con el contador al lado, en vez de botones apagados permanentes.
"""

from __future__ import annotations

from PySide6.QtWidgets import QHBoxLayout, QLabel, QWidget

from .buttons import TextButton


class LibrarySelectionBar(QWidget):
    """Contador de pistas marcadas y sus acciones."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("SelectionBar")
        bar = QHBoxLayout(self)
        bar.setContentsMargins(14, 8, 14, 8)
        bar.setSpacing(10)

        self.count = QLabel("")
        self.count.setObjectName("SelectionCount")
        bar.addWidget(self.count)
        bar.addStretch(1)

        self.edit_button = TextButton("Editar metadatos", "ghost", icon="edit")
        self.edit_button.setEnabled(False)
        bar.addWidget(self.edit_button, 0)

        # Con varias pistas marcadas el boton anterior pasa a ser el de lote:
        # editar de a una con diez seleccionadas no es lo que se quiere.
        self.batch_button = TextButton("Editar en lote", "accent", icon="edit")
        self.batch_button.setEnabled(False)
        self.batch_button.setVisible(False)
        bar.addWidget(self.batch_button, 0)

        self.clear_button = TextButton("Quitar selección", "ghost", icon="close")
        bar.addWidget(self.clear_button, 0)

        self.setVisible(False)

    def set_selection(self, count: int) -> None:
        if count == 1:
            self.count.setText("1 pista seleccionada")
        else:
            self.count.setText(f"{count} pistas seleccionadas")
        self.setVisible(count > 0)

    def refresh(self) -> None:
        """Recolorea los iconos tras un cambio de tema."""
        self.edit_button.refresh()
        self.batch_button.refresh()
        self.clear_button.refresh()
