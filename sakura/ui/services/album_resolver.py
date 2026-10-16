"""Resolver un album del catalogo contra YouTube, en un hilo aparte.

Cada pista necesita su propia busqueda, asi que son N procesos de yt-dlp. Va
todo en un hilo de Qt: son subprocess calls bloqueantes y la UI no puede
esperar.
"""

from __future__ import annotations

from PySide6.QtCore import QObject, QThread, Signal

from ...core.album_match import Match, Verdict, key_track, match_track
from ...core.metadata_sources import (
    AlbumEntry,
    ArtistEntry,
    Candidate,
    SourceError,
    artist_albums,
    itunes_album,
    search,
    search_artists,
)
from ...core.models import SearchResult
from ...core.text import normalize
from .process import ProcessRunner

# Cuantos videos se piden por pista. Con cinco alcanza para encontrar el bueno y
# tener un par de alternativas, y son menos peticiones que veinte.
RESULTS_BY_TRACK = 5


def query_track(candidate: Candidate) -> str:
    """El texto que se busca en YouTube para una pista del catalogo."""
    artist_name = candidate.artist.strip()
    title_text = candidate.title.strip()
    return f"{artist_name} {title_text}".strip()


def _match_duplicates(results: list[SearchResult]) -> list[SearchResult]:
    """Un video por id, dejando el primero."""
    seen: set[str] = set()
    unique: list[SearchResult] = []
    for result in results:
        key_name = result.id or result.url
        if key_name in seen:
            continue
        seen.add(key_name)
        unique.append(result)
    return unique


class _ArtistLoader(QThread):
    """Busca artistas y sus discos en el catálogo, sin tocar la red desde la UI."""

    artists_found = Signal(object)  # list[ArtistEntry]
    albums_found = Signal(object)  # (ArtistEntry, list[AlbumEntry])
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._artist_id = ""
        self._query = ""
        self._request_albums = False

    @property
    def is_running(self) -> bool:
        return self.isRunning()

    def do_search(self, query: str) -> None:
        self._query = query
        self._request_albums = False
        self.start()

    def albums(self, artist_id: str) -> None:
        self._artist_id = artist_id
        self._request_albums = True
        self.start()

    def cancel(self) -> None:
        self._artist_id = ""

    def run(self) -> None:
        try:
            if self._request_albums:
                albums = artist_albums(self._artist_id)
                self.albums_found.emit(albums)
                return
            artists = search_artists(self._query)
            self.artists_found.emit(artists)
        except SourceError as exc:
            self.failed.emit(str(exc))
        except OSError as exc:
            self.failed.emit(f"No se pudo conectar: {exc}")


class _AlbumResolver(QObject):
    """Busca el video de cada pista y arma los veredictos."""

    progress = Signal(str)  # "Buscando 3 de 12…"
    finished = Signal(object, object)  # album, list[Match]
    failed = Signal(str)
    cancelled = Signal()

    def __init__(
        self,
        album_id: str,
        track_items: list[Candidate],
        parent: QObject | None = None,
    ):
        super().__init__(parent)
        self._album_id = album_id
        self._tracks = list(track_items)
        self._runner = ProcessRunner(self)
        self._runner.line.connect(self._on_line)
        self._runner.failed.connect(self._on_failed)
        self._runner.completed.connect(self._on_completed)

        self._index = 0
        self._videos: dict[str, list[SearchResult]] = {}
        self._cancelled = False

    @property
    def is_running(self) -> bool:
        return self._runner.is_running

    def start(self) -> None:
        self._index = 0
        self._videos.clear()
        self._cancelled = False
        self._search_next()

    def cancel(self) -> None:
        self._cancelled = True
        self._runner.kill()

    def shutdown(self) -> None:
        """Corta la busqueda en curso y espera al hilo (usar al cerrar)."""
        self._cancelled = True
        self._runner.shutdown()

    def _search_next(self) -> None:
        if self._cancelled:
            self.cancelled.emit()
            return

        if self._index >= len(self._tracks):
            self.finished.emit(self._tracks, self._matches())
            return

        candidate = self._tracks[self._index]
        self.progress.emit(
            f"Buscando {self._index + 1} de {len(self._tracks)}: {candidate.title}"
        )
        query = query_track(candidate)
        if not query:
            # Sin texto no hay busqueda posible: se deja sin resultados y se pasa.
            self._videos.setdefault(key_track(candidate), [])
            self._index += 1
            self._search_next()
            return

        self._runner.start(_comando(query))

    def _matches(self) -> list[Match]:
        return [
            match_track(candidate, self._videos.get(key_track(candidate), []))
            for candidate in self._tracks
        ]

    def _on_line(self, line: str) -> None:
        from ...core.tools import parse_search_line

        result = parse_search_line(line)
        if result is None:
            return
        key_name = key_track(self._tracks[self._index])
        self._videos.setdefault(key_name, []).append(result)

    def _on_completed(self, exit_code: int) -> None:
        if self._cancelled:
            self.cancelled.emit()
            return

        key_name = key_track(self._tracks[self._index])
        found = _match_duplicates(self._videos.get(key_name, []))
        self._videos[key_name] = found[:RESULTS_BY_TRACK]
        self._index += 1
        self._search_next()

    def _on_failed(self, message: str) -> None:
        if self._cancelled:
            self.cancelled.emit()
            return
        # Una pista que no se pudo buscar no frena el album: queda sin match.
        self._videos.setdefault(key_track(self._tracks[self._index]), [])
        self._index += 1
        self._search_next()


def _comando(query: str) -> list[str]:
    from ...core.tools import build_search_command

    return build_search_command(query, RESULTS_BY_TRACK)


class ArtistCatalog(QObject):
    """Busca un artista y lista sus discos.

    Es el camino para el 'quiero toda la musica de X': en vez de adivinar el
    nombre de cada album, se elige de la discografia que devuelve el catalogo.
    """

    artists_found = Signal(object)  # list[ArtistEntry]
    albums_found = Signal(object)  # (ArtistEntry, list[AlbumEntry])
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._worker = _ArtistLoader(self)
        self._worker.artists_found.connect(self._on_artists)
        self._worker.albums_found.connect(self._on_albums)
        self._worker.failed.connect(self.failed)
        self._artist: ArtistEntry | None = None

    @property
    def is_running(self) -> bool:
        return self._worker.is_running

    def do_search(self, query: str) -> None:
        if self.is_running or not query.strip():
            return
        self._worker.do_search(query)

    def albums(self, artist_id: str, artist_name: ArtistEntry | None = None) -> None:
        if self.is_running or not artist_id.strip():
            return
        self._artist = artist_name
        self._worker.albums(artist_id)

    def cancel(self) -> None:
        self._worker.cancel()

    def shutdown(self) -> None:
        self.cancel()
        self._worker.wait(3000)

    def _on_artists(self, artists: list[ArtistEntry]) -> None:
        self.artists_found.emit(artists)

    def _on_albums(self, albums: list[AlbumEntry]) -> None:
        self.albums_found.emit(self._artist, albums)


class AlbumResolver(QObject):
    """API de alto nivel: pide el album al catalogo y lo cruza con YouTube."""

    album_found = Signal(object, object)  # pistas de iTunes, list[Match]
    progress = Signal(str)
    failed = Signal(str)
    cancelled = Signal()

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._loader = _AlbumLoader(self)
        self._loader.tracks_found.connect(self._on_album)
        self._loader.failed.connect(self._on_failed)

        self._resolver: _AlbumResolver | None = None
        self._tracks: list[Candidate] = []

    @property
    def is_running(self) -> bool:
        return self._loader.is_running or (
            self._resolver is not None and self._resolver.is_running
        )

    def resolve_album(self, album_id: str) -> None:
        if self.is_running or not album_id.strip():
            return
        self._loader.load(album_id)

    def resolve_tracks(self, track_items: list[Candidate]) -> None:
        """Cruza unas pistas yavenance del catalogo, sin volver a pedirlas."""
        if self.is_running or not track_items:
            return
        self._tracks = list(track_items)
        self._resolver = _AlbumResolver("", self._tracks, self)
        self._resolver.progress.connect(self.progress)
        self._resolver.finished.connect(self._on_matches)
        self._resolver.failed.connect(self._on_failed)
        self._resolver.cancelled.connect(self.cancelled)
        self._resolver.start()

    def cancel(self) -> None:
        self._loader.cancel()
        if self._resolver is not None:
            self._resolver.cancel()

    def shutdown(self) -> None:
        self.cancel()
        self._loader.wait(3000)
        if self._resolver is not None:
            self._resolver.shutdown()

    def _on_album(self, track_items: list[Candidate]) -> None:
        if not track_items:
            self.failed.emit("El álbum no devolvió pistas")
            return
        self.resolve_tracks(track_items)

    def _on_matches(self, track_items: list[Candidate], matches: list[Match]) -> None:
        self._resolver = None
        self.album_found.emit(track_items, matches)

    def _on_failed(self, message: str) -> None:
        self._resolver = None
        self.failed.emit(message)


class _AlbumLoader(QThread):
    """Pide las pistas de un album al catalogo."""

    tracks_found = Signal(object)  # list[Candidate]
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._album_id = ""

    @property
    def is_running(self) -> bool:
        return self.isRunning()

    def load(self, album_id: str) -> None:
        self._album_id = album_id
        self.start()

    def cancel(self) -> None:
        # No se puede interrumpir `urllib` a mitad: se deja terminar y se ignora.
        self._album_id = ""

    def run(self) -> None:
        album_id = self._album_id
        if not album_id:
            return
        try:
            track_items = itunes_album(album_id)
        except SourceError as exc:
            self.failed.emit(str(exc))
            return
        if not track_items:
            self.failed.emit("El álbum no tiene pistas descargables")
            return
        self.tracks_found.emit(track_items)


def tracks_album(query: str) -> list[Candidate]:
    """Busca un album por nombre y devuelve sus pistas, ya ordenadas por numero.

    Es el camino corto para cuando el usuario escribe el album en el buscador y
    no tiene el `collectionId` a mano.
    """
    results = search(query, limit=25)
    if not results:
        return []

    albums: dict[str, list[Candidate]] = {}
    for candidate in results:
        if candidate.album_id:
            albums.setdefault(candidate.album_id, []).append(candidate)

    if not albums:
        return []
    best_id = max(albums, key=lambda id_: len(albums[id_]))
    track_items = albums[best_id]
    return sorted(track_items, key=lambda c: _number_track(c))


def _number_track(candidate: Candidate) -> int:
    digitos = "".join(caracter for caracter in candidate.track_number if caracter.isdigit())
    return int(digitos) if digitos else 10_000


def folder_album(candidate: Candidate) -> str:
    """La carpeta donde debe caer el album, tal como quedaria en la biblioteca."""
    album = candidate.album.strip() or "Album"
    artist_name = candidate.artist.strip()
    if artist_name and normalize(artist_name) != normalize(album):
        return f"{artist_name}/{album}"
    return album


__all__ = [
    "AlbumResolver",
    "ArtistCatalog",
    "Match",
    "Verdict",
    "folder_album",
    "query_track",
    "tracks_album",
]