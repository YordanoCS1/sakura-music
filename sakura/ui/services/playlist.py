"""Resolucion de playlists de YouTube en background.

Usa yt-dlp --flat-playlist para enumerar los videos sin descargar nada,
emitiendo resultados a medida que llegan (igual que SearchService).
"""

from __future__ import annotations

from PySide6.QtCore import QObject, Signal

from ...core.tools import (
    build_playlist_info_command,
    friendly_error,
    hidden_reason,
    parse_search_line,
)
from .process import ProcessRunner


class PlaylistResolver(QObject):
    """Resuelve una URL de playlist y emite sus videos uno a uno.

    La señal `result_found` llega por cada video conforme yt-dlp los vuelca,
    así la UI puede empezar a mostrar tarjetas antes de terminar con playlists
    largas. `finished(titulo, total)` llega al final; `failed(mensaje)` si hay
    error.

    Las entradas que no se pueden descargar (privadas, eliminadas, bloqueadas por
    región) no se emiten como resultado, pero se cuentan: `hidden_found` lleva el
    detalle para que la UI pueda decir cuántas son en vez de ocultarlas en
    silencio.
    """

    result_found = Signal(object)   # SearchResult
    finished = Signal(str, int)     # titulo_playlist, total_videos
    failed = Signal(str)
    progress = Signal(int)          # videos procesados hasta ahora
    hidden_found = Signal(object)   # dict[str, int] motivo -> cantidad

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._runner = ProcessRunner(self)
        self._runner.line.connect(self._on_line)
        self._runner.failed.connect(self._on_failed)
        self._runner.completed.connect(self._on_completed)
        self._count = 0
        self._playlist_title = ""
        self._hidden: dict[str, int] = {}

    @property
    def is_running(self) -> bool:
        return self._runner.is_running

    @property
    def hidden(self) -> dict[str, int]:
        """Motivo -> cantidad, de los videos que no se pueden descargar."""
        return dict(self._hidden)

    @property
    def hidden_count(self) -> int:
        return sum(self._hidden.values())

    @property
    def title(self) -> str:
        """Nombre de la playlist resuelta. Da nombre a la carpeta de descarga."""
        return self._playlist_title

    def resolve(self, url: str) -> None:
        """Empieza a resolver la playlist en background. Ignora si ya hay una activa."""
        if self._runner.is_running:
            return
        self._count = 0
        self._playlist_title = ""
        self._hidden = {}
        self._runner.start(build_playlist_info_command(url))

    def cancel(self) -> None:
        self._runner.kill()

    def shutdown(self) -> None:
        """Corta la lectura de la playlist y espera al hilo (usar al cerrar)."""
        self._runner.shutdown()

    # --- privado -------------------------------------------------------------

    def _on_line(self, line: str) -> None:
        dato = _json(line)
        if dato is None:
            return

        reason = hidden_reason(dato)
        if reason is not None:
            # No se puede descargar, pero no se pierde: se cuenta para avisar.
            self._hidden[reason] = self._hidden.get(reason, 0) + 1
            return

        result = parse_search_line(line)
        if result is None:
            return
        # El nombre de la playlist viene en `playlist_title`, que `from_json`
        # ignora porque no es del video. Es lo que despues da nombre a la
        # carpeta donde cae toda la descarga.
        if not self._playlist_title:
            self._playlist_title = str(dato.get("playlist_title") or "").strip()

        if not result.url:
            return

        # Fallback: si el JSON no trajo el nombre, se usa el canal del primer
        # video, que es lo mejor que se puede saber sin pedir nada.
        if not self._playlist_title:
            self._playlist_title = result.uploader

        self._count += 1
        self.progress.emit(self._count)
        self.result_found.emit(result)

    def _emit_end(self) -> None:
        if self._hidden:
            self.hidden_found.emit(dict(self._hidden))
        self.finished.emit(self._playlist_title, self._count)

    def _on_failed(self, message: str) -> None:
        self.failed.emit(friendly_error(message))

    def _on_completed(self, exit_code: int) -> None:
        if exit_code == 0:
            self._emit_end()
        else:
            # Si ya emitimos resultados parciales, consideramos éxito parcial.
            if self._count > 0:
                self._emit_end()
            else:
                self.failed.emit(
                    friendly_error(f"ERROR: no se pudo resolver la playlist (código {exit_code})")
                )


def _json(line: str) -> dict | None:
    """La linea como dict, o None si no es un objeto JSON."""
    import json

    line = line.strip()
    if not line.startswith("{"):
        return None
    try:
        dato = json.loads(line)
    except (json.JSONDecodeError, TypeError, ValueError):
        return None
    return dato if isinstance(dato, dict) else None
