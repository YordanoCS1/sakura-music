"""Agrupacion de pistas por album para la vista de estanteria."""

from __future__ import annotations

from dataclasses import dataclass, field

from PySide6.QtCore import QAbstractListModel, QModelIndex, Qt

from ...core.library import Track
from .track_model import TrackFilterProxy

SIN_ALBUM = "Sin álbum"
ARTISTA_DESCONOCIDO = "Artista desconocido"


@dataclass(slots=True)
class AlbumGroup:
    """Una pila de pistas que comparten album y artista."""

    album: str
    artist: str
    tracks: list[Track] = field(default_factory=list)

    @property
    def title(self) -> str:
        return self.album.strip() or SIN_ALBUM

    @property
    def artist_text(self) -> str:
        return self.artist.strip() or ARTISTA_DESCONOCIDO

    @property
    def track_count(self) -> int:
        return len(self.tracks)

    @property
    def tracks_text(self) -> str:
        return "1 pista" if self.track_count == 1 else f"{self.track_count} pistas"

    @property
    def year(self) -> str:
        return next((track.year for track in self.tracks if track.year), "")

    @property
    def first_track(self) -> Track | None:
        return self.tracks[0] if self.tracks else None

    @property
    def cover_path(self):
        for track in self.tracks:
            if track.cover_path and track.cover_path.is_file():
                return track.cover_path
        return None

    @property
    def duration(self) -> float:
        return sum(track.duration for track in self.tracks)

    @property
    def duration_text(self) -> str:
        seconds = max(0, int(self.duration))
        hours, rest = divmod(seconds, 3600)
        minutes, secs = divmod(rest, 60)
        return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"


def _group_key(track: Track) -> tuple[str, str]:
    album = (track.album or "").strip().casefold()
    artist = (track.artist or "").strip().casefold()
    return album, artist


def _sort_key(group: AlbumGroup) -> tuple[int, str, str]:
    """Los discos sin album van al final, como en una estanteria real."""
    return (
        1 if not group.album.strip() else 0,
        group.title.casefold(),
        group.artist_text.casefold(),
    )


def build_album_groups(tracks: list[Track]) -> list[AlbumGroup]:
    groups: dict[tuple[str, str], AlbumGroup] = {}
    for track in tracks:
        key = _group_key(track)
        group = groups.get(key)
        if group is None:
            group = AlbumGroup(
                album=(track.album or "").strip(),
                artist=(track.artist or "").strip(),
            )
            groups[key] = group
        group.tracks.append(track)
    return sorted(groups.values(), key=_sort_key)


class AlbumShelfModel(QAbstractListModel):
    """Modelo de albumes derivado del filtro actual de la biblioteca."""

    def __init__(self, proxy: TrackFilterProxy, parent=None):
        super().__init__(parent)
        self._proxy = proxy
        self._albums: list[AlbumGroup] = []
        self._fingerprint: tuple | None = None

        proxy.modelReset.connect(self.refresh)
        proxy.rowsInserted.connect(self.refresh)
        proxy.rowsRemoved.connect(self.refresh)
        proxy.layoutChanged.connect(self.refresh)
        proxy.dataChanged.connect(self.refresh)
        self.refresh()

    def refresh(self, *_args) -> None:
        tracks = [
            track
            for row in range(self._proxy.rowCount())
            if (track := self._proxy.track_at(row)) is not None
        ]
        albums = build_album_groups(tracks)
        fingerprint = tuple(
            (
                group.album,
                group.artist,
                group.year,
                tuple(track.path for track in group.tracks),
                tuple(str(track.cover_path) for track in group.tracks),
            )
            for group in albums
        )
        if fingerprint == self._fingerprint:
            return

        self.beginResetModel()
        self._albums = albums
        self._fingerprint = fingerprint
        self.endResetModel()

    def rowCount(self, parent=QModelIndex()) -> int:  # noqa: B008
        return 0 if parent.isValid() else len(self._albums)

    def data(self, index: QModelIndex, role=Qt.ItemDataRole.DisplayRole):
        if not index.isValid() or not 0 <= index.row() < len(self._albums):
            return None

        group = self._albums[index.row()]
        if role == Qt.ItemDataRole.DisplayRole:
            return group.title
        if role == Qt.ItemDataRole.ToolTipRole:
            return (
                f"{group.title}\n{group.artist_text}\n"
                f"{group.tracks_text} - {group.duration_text}"
            )
        if role == Qt.ItemDataRole.UserRole:
            return group
        return None

    def album_at(self, row: int) -> AlbumGroup | None:
        if 0 <= row < len(self._albums):
            return self._albums[row]
        return None

    @property
    def albums(self) -> list[AlbumGroup]:
        return list(self._albums)

    def __len__(self) -> int:
        return len(self._albums)
