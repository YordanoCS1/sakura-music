"""Busqueda de metadatos en un hilo, para que la UI no se congele."""

from __future__ import annotations

import threading
from pathlib import Path

from PySide6.QtCore import QObject, QThread, Signal

from ...core.library import load_track
from ...core.metadata import (
    MetadataError,
    TrackTags,
    read_cover,
    remove_cover,
    write_cover,
    write_tags,
)
from ...core.metadata_sources import (
    Candidate,
    SourceError,
    download_cover,
    itunes_album,
    match_by_title,
    rank_candidates,
    search_deezer,
    search_itunes,
)


class _SearchWorker(QThread):
    results_ready = Signal(object)  # list[Candidate]
    failed = Signal(str)
    source_changed = Signal(str)
    warning = Signal(str)

    def __init__(
        self,
        query: str,
        limit: int,
        source: str,
        parent: QObject | None = None,
        *,
        artist_query: str = "",
    ):
        super().__init__(parent)
        self._query = query
        self._limit = limit
        self._source = source
        self._artist_query = artist_query.strip()

    def _itunes_results(self) -> list[Candidate]:
        if self._artist_query:
            return search_itunes(
                self._query, self._limit, artist_query=self._artist_query
            )
        return search_itunes(self._query, self._limit)

    def _deezer_results(self) -> list[Candidate]:
        query = " ".join(part for part in (self._query, self._artist_query) if part)
        return search_deezer(query, self._limit)

    def run(self) -> None:
        aviso_parcial = ""
        try:
            if self._source == "itunes":
                self.source_changed.emit("itunes")
                found = self._itunes_results()
            elif self._source == "deezer":
                self.source_changed.emit("deezer")
                found = self._deezer_results()
            else:
                self.source_changed.emit("itunes")
                results_by_source: list[Candidate] = []
                errors: list[str] = []
                try:
                    results_by_source.extend(self._itunes_results())
                except SourceError as exc:
                    errors.append(f"iTunes: {exc}")

                self.source_changed.emit("deezer")
                try:
                    results_by_source.extend(self._deezer_results())
                except SourceError as exc:
                    errors.append(f"Deezer: {exc}")

                if not results_by_source and errors:
                    raise SourceError(" · ".join(errors))
                if errors:
                    aviso_parcial = "Resultados parciales; " + " · ".join(errors)
                keys_views: set[tuple[str, str, str]] = set()
                unique: list[Candidate] = []
                for candidate in results_by_source:
                    key_name = (
                        candidate.title.casefold().strip(),
                        candidate.artist.casefold().strip(),
                        candidate.album.casefold().strip(),
                    )
                    if key_name not in keys_views:
                        keys_views.add(key_name)
                        unique.append(candidate)
                sort_by = " ".join(
                    part for part in (self._query, self._artist_query) if part
                )
                found = rank_candidates(unique, sort_by)[: self._limit]
        except SourceError as exc:
            self.failed.emit(str(exc))
            return

        if not found:
            self.failed.emit(f'Sin resultados para "{self._query}"')
            return
        self.results_ready.emit(found)
        if aviso_parcial:
            self.warning.emit(aviso_parcial)


class _AlbumWorker(QThread):
    tracks_ready = Signal(object)  # list[Candidate]
    failed = Signal(str)

    def __init__(self, album_id: str, parent: QObject | None = None):
        super().__init__(parent)
        self._album_id = album_id

    def run(self) -> None:
        try:
            track_items = itunes_album(self._album_id)
        except SourceError as exc:
            self.failed.emit(str(exc))
            return

        if not track_items:
            self.failed.emit("El álbum no devolvió pistas")
            return
        self.tracks_ready.emit(track_items)


# Hilos de busqueda que sobrevivieron al cierre del editor. Un `QThread` no se
# puede destruir mientras corre (Qt aborta el proceso), asi que se los deja
# terminar y se liberan desde su propia señal `finished`.
_ZOMBIES: list[QThread] = []


def _leave_finish(worker: QThread | None) -> None:
    """Suelta un hilo que sigue vivo para que se libere solo al terminar."""
    if worker is None or not worker.isRunning():
        return

    _ZOMBIES.append(worker)
    worker.finished.connect(lambda w=worker: _release(w))


def _release(worker: QThread) -> None:
    if worker in _ZOMBIES:
        _ZOMBIES.remove(worker)
    worker.deleteLater()


class MetadataSearch(QObject):
    """Busca candidatos y los aplica a uno o a varios archivos."""

    results_found = Signal(object)
    album_found = Signal(object)
    failed = Signal(str)
    source_changed = Signal(str)
    warning = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._search_worker: _SearchWorker | None = None
        self._album_worker: _AlbumWorker | None = None
        self._busy = threading.Event()

    @property
    def is_running(self) -> bool:
        return self._busy.is_set()

    def shutdown(self, timeout_ms: int = 1500) -> None:
        """Espera un momento lo que este en vuelo y suelta el resto.

        Una busqueda en curso es una peticion HTTP que no se puede cancelar:
        esperar a que venza su timeout congelaria el cierre de la ventana. Lo
        que no termina a tiempo se deja que termine solo, sin destruirlo.
        """
        for worker in (self._search_worker, self._album_worker):
            if worker is not None and worker.isRunning():
                worker.wait(timeout_ms)
            _leave_finish(worker)

        self._search_worker = None
        self._album_worker = None
        self._busy.clear()

    def search(
        self, query: str, limit: int = 50, source: str = "auto", artist_query: str = ""
    ) -> None:
        if self.is_running or not query.strip():
            return

        self._busy.set()
        self._search_worker = _SearchWorker(
            query, limit, source, artist_query=artist_query
        )
        self._search_worker.results_ready.connect(self._on_results)
        self._search_worker.failed.connect(self._on_failed)
        self._search_worker.source_changed.connect(self.source_changed)
        self._search_worker.warning.connect(self.warning)
        self._search_worker.start()

    def load_album(self, album_id: str) -> None:
        if self.is_running or not album_id.strip():
            return

        self._busy.set()
        self._album_worker = _AlbumWorker(album_id)
        self._album_worker.tracks_ready.connect(self._on_album)
        self._album_worker.failed.connect(self._on_failed)
        self._album_worker.start()

    def _on_results(self, results: list[Candidate]) -> None:
        self._busy.clear()
        self.results_found.emit(results)

    def _on_album(self, track_items: list[Candidate]) -> None:
        self._busy.clear()
        self.album_found.emit(track_items)

    def _on_failed(self, message_text: str) -> None:
        self._busy.clear()
        self.failed.emit(message_text)


def apply_candidate(file_path: Path, candidate: Candidate) -> str | None:
    """Escribe tags y portada de un candidato sobre un archivo.

    Devuelve un mensaje de error, o None si todo salio bien.
    """
    cover = download_cover(candidate.cover_url)

    try:
        write_tags(file_path, TrackTags(**candidate.to_tags()))
        if cover:
            write_cover(file_path, cover[0], cover[1])
        else:
            remove_cover(file_path)
    except MetadataError as exc:
        return str(exc)
    return None


def apply_album(paths: list[Path], track_items: list[Candidate]) -> tuple[int, list[str]]:
    """Aplica un album completo emparejando por titulo.

    Devuelve cuantas pistas quedaron etiquetadas y los errores encontrados.
    """
    titles = [file_path.stem for file_path in paths]
    pares = match_by_title(track_items, titles)

    errors: list[str] = []
    applied = 0

    for title_text, candidate in pares.items():
        file_path = next((r for r in paths if r.stem == title_text), None)
        if file_path is None:
            continue
        problema = apply_candidate(file_path, candidate)
        if problema is None:
            applied += 1
        else:
            errors.append(f"{title_text}: {problema}")

    return applied, errors


def reread(file_path: Path):
    """Vuelve a leer la pista del disco tras escribir tags."""
    return load_track(file_path)


__all__ = [
    "MetadataSearch",
    "apply_album",
    "apply_candidate",
    "read_cover",
    "reread",
]