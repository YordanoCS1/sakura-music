"""Vigila la carpeta de la biblioteca y avisa cuando algo cambia.

`QFileSystemWatcher` no es recursivo: hay que registrar cada subcarpeta. Se
agrega el arbol al arrancar y las carpetas nuevas a medida que aparecen. Los
eventos se agrupan con un temporizador porque copiar un album dispara decenas
de avisos seguidos.
"""

from __future__ import annotations

import os
from pathlib import Path

from PySide6.QtCore import QFileSystemWatcher, QObject, QTimer, Signal

DEBOUNCE_MS = 900


class LibraryWatcher(QObject):
    """Emite `changed` una sola vez por tanda de cambios en disco."""

    changed = Signal()

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._watcher = QFileSystemWatcher(self)
        self._watcher.directoryChanged.connect(self._on_directory_changed)
        self._timer = QTimer(self)
        self._timer.setSingleShot(True)
        self._timer.setInterval(DEBOUNCE_MS)
        self._timer.timeout.connect(self.changed)
        self._root: Path | None = None

    @property
    def root(self) -> Path | None:
        return self._root

    @property
    def is_watching(self) -> bool:
        return self._root is not None and bool(self._watcher.directories())

    def start(self, root: Path) -> None:
        """Vigila `root` y todas sus subcarpetas."""
        root = Path(root).resolve()
        if not root.is_dir():
            self.stop()
            return
        if root == self._root and self._watcher.directories():
            return

        self.stop()
        self._root = root
        self._add_tree(root)

    def stop(self) -> None:
        folders = self._watcher.directories()
        if folders:
            self._watcher.removePaths(folders)
        self._timer.stop()
        self._root = None

    def _add_tree(self, root: Path) -> None:
        """Registra `root` y sus descendientes que aun no estuvieran vigilados."""
        pendientes = [root]
        vigiladas = set(self._watcher.directories())

        while pendientes:
            folder = pendientes.pop()
            texto = str(folder)
            if texto not in vigiladas:
                if not self._watcher.addPath(texto):
                    continue
                vigiladas.add(texto)

            try:
                entradas = list(os.scandir(folder))
            except OSError:
                continue
            for entrada in entradas:
                if entrada.is_dir(follow_symlinks=False):
                    pendientes.append(Path(entrada.path))

    def _on_directory_changed(self, path: str) -> None:
        carpeta = Path(path)
        if self._root is not None and not _within(carpeta, self._root):
            return
        self._add_tree(carpeta)
        self._timer.start()


def _within(path: Path, root: Path) -> bool:
    try:
        path.resolve().relative_to(root)
    except (OSError, ValueError):
        return False
    return True
