"""Franja de subcarpetas de la Biblioteca, como chips en una sola linea."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import (
    QAbstractItemView,
    QHBoxLayout,
    QListView,
    QListWidget,
    QWidget,
)


class LibraryFolderPanel(QWidget):
    """Franja horizontal de subcarpetas.

    La pagina solo le carga los items ya armados desde `_populate_folder_list`;
    el widget no sabe de pistas ni de portadas.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        self.folder_list = QListWidget()
        self.folder_list.setObjectName("LibraryFolderGrid")
        self.folder_list.setViewMode(QListView.ViewMode.ListMode)
        self.folder_list.setFlow(QListView.Flow.LeftToRight)
        self.folder_list.setWrapping(False)
        self.folder_list.setResizeMode(QListView.ResizeMode.Adjust)
        self.folder_list.setMovement(QListView.Movement.Static)
        self.folder_list.setIconSize(QSize(22, 22))
        self.folder_list.setSpacing(4)
        self.folder_list.setFixedHeight(50)
        self.folder_list.setVerticalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.folder_list.setHorizontalScrollMode(
            QAbstractItemView.ScrollMode.ScrollPerPixel
        )
        layout.addWidget(self.folder_list)

        self.setVisible(False)
