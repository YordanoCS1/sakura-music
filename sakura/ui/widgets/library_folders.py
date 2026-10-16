"""Panel de subcarpetas de la Biblioteca."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import (
    QAbstractItemView,
    QHBoxLayout,
    QLabel,
    QListView,
    QListWidget,
    QVBoxLayout,
    QWidget,
)

from .buttons import TextButton


class LibraryFolderPanel(QWidget):
    """Encabezado de carpetas, boton de abrir y grilla de subcarpetas.

    La pagina solo le carga los items ya armados desde `_populate_folder_list`;
    el widget no sabe de pistas ni de portadas.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(4)

        heading = QWidget()
        heading_layout = QHBoxLayout(heading)
        heading_layout.setContentsMargins(0, 0, 0, 0)
        heading_layout.setSpacing(8)
        self.heading_label = QLabel("Carpetas")
        heading_layout.addWidget(self.heading_label)
        heading_layout.addStretch(1)
        self.open_button = TextButton("Abrir carpeta", "ghost")
        self.open_button.setEnabled(False)
        heading_layout.addWidget(self.open_button)
        layout.addWidget(heading)

        self.folder_list = QListWidget()
        self.folder_list.setObjectName("LibraryFolderGrid")
        self.folder_list.setViewMode(QListView.ViewMode.IconMode)
        self.folder_list.setResizeMode(QListView.ResizeMode.Adjust)
        self.folder_list.setMovement(QListView.Movement.Static)
        self.folder_list.setWrapping(True)
        self.folder_list.setWordWrap(True)
        self.folder_list.setIconSize(QSize(56, 56))
        self.folder_list.setGridSize(QSize(156, 104))
        self.folder_list.setSpacing(4)
        self.folder_list.setMaximumHeight(176)
        self.folder_list.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.folder_list.setVerticalScrollMode(
            QAbstractItemView.ScrollMode.ScrollPerPixel
        )
        self.folder_list.itemSelectionChanged.connect(
            lambda: self.open_button.setEnabled(self.folder_list.currentItem() is not None)
        )
        layout.addWidget(self.folder_list)

        self.setVisible(False)
