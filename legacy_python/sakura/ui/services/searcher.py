"""Busqueda en YouTube via yt-dlp."""

from __future__ import annotations

from PySide6.QtCore import QObject, Signal

from ...core.tools import build_search_command, friendly_error, parse_search_line
from .process import ProcessRunner


class SearchService(QObject):
    """Ejecuta consultas y emite los resultados a medida que llegan."""

    result_found = Signal(object)  # SearchResult
    finished = Signal(int)  # cantidad de resultados
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._runner = ProcessRunner(self)
        self._runner.line.connect(self._on_line)
        self._runner.failed.connect(self.failed)
        self._runner.completed.connect(self._on_completed)
        self._count = 0

    @property
    def is_running(self) -> bool:
        return self._runner.is_running

    def search(self, query: str, limit: int = 20) -> None:
        query = query.strip()
        if not query or self._runner.is_running:
            return

        self._count = 0
        self._runner.start(build_search_command(query, limit))

    def cancel(self) -> None:
        self._runner.kill()

    def shutdown(self) -> None:
        """Corta la busqueda y espera al hilo (usar al cerrar la app)."""
        self._runner.shutdown()

    def _on_line(self, line: str) -> None:
        result = parse_search_line(line)
        if result is not None:
            self._count += 1
            self.result_found.emit(result)

    def _on_completed(self, exit_code: int) -> None:
        if exit_code == 0:
            self.finished.emit(self._count)
            return
        self.failed.emit(friendly_error(f"ERROR: la busqueda fallo (codigo {exit_code})"))