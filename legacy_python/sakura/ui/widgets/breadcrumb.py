"""Migas de pan clicables para navegar por las carpetas de la biblioteca."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import QHBoxLayout, QLabel, QPushButton, QWidget


class BreadcrumbBar(QWidget):
    """Biblioteca > Artista > Album, con cada nivel navegable."""

    path_selected = Signal(Path)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("BreadcrumbBar")
        self._layout = QHBoxLayout(self)
        self._layout.setContentsMargins(0, 0, 0, 0)
        self._layout.setSpacing(2)

    def set_path(self, root: Path, current: Path) -> None:
        """Muestra la ruta de `root` a `current`; el último nivel no navega."""
        self._clear()
        try:
            relative = current.relative_to(root)
        except ValueError:
            self.set_message("Biblioteca")
            return

        levels = [(root.name or "Biblioteca", root)]
        for part in relative.parts:
            levels.append((part, levels[-1][1] / part))

        for index, (label, path) in enumerate(levels):
            if index:
                self._add_separator()
            if index == len(levels) - 1:
                text = QLabel(label)
                text.setObjectName("BreadcrumbCurrent")
                text.setToolTip(str(path))
                self._layout.addWidget(text, 0, Qt.AlignmentFlag.AlignVCenter)
            else:
                button = QPushButton(label)
                button.setObjectName("BreadcrumbStep")
                button.setFlat(True)
                button.setCursor(Qt.CursorShape.PointingHandCursor)
                button.setToolTip(f"Ir a {label}")
                button.clicked.connect(lambda _checked=False, p=path: self.path_selected.emit(p))
                self._layout.addWidget(button, 0, Qt.AlignmentFlag.AlignVCenter)
        self._layout.addStretch(1)

    def set_message(self, text: str) -> None:
        """Texto simple para estados donde no hay una carpeta activa."""
        self._clear()
        label = QLabel(text)
        label.setObjectName("Breadcrumb")
        self._layout.addWidget(label, 1)

    def _add_separator(self) -> None:
        separator = QLabel("\u203a")
        separator.setObjectName("BreadcrumbSeparator")
        self._layout.addWidget(separator, 0, Qt.AlignmentFlag.AlignVCenter)

    def _clear(self) -> None:
        while self._layout.count():
            item = self._layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.setParent(None)
                widget.deleteLater()


__all__ = ["BreadcrumbBar"]
