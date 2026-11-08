"""Indice SQLite de la biblioteca local.

El escaneo abre cada archivo con `mutagen`, que es la parte lenta. Este cache
guarda los metadatos ya leidos para que el segundo escaneo solo abra lo nuevo o
lo que cambio. La validez de una fila se decide por `mtime_ns` y tamano: juntos
detectan una edicion o un reemplazo sin leer el contenido.

Sin Qt a proposito: la capa que lo usa desde un hilo vive en
`sakura/ui/services/library.py`.
"""

from __future__ import annotations

import logging
import os
import sqlite3
from dataclasses import dataclass
from pathlib import Path

from .library import Track

logger = logging.getLogger(__name__)

# Si cambia la forma de la tabla se sube este numero y se recrea entera: el
# cache es descartable, no hay datos del usuario que migrar.
SCHEMA_VERSION = 1

_COLUMNS = (
    "path, title, artist, album, duration, year, genre, track_number, "
    "size, mtime_ns, cover_path, lyrics_path"
)

_SCHEMA = """
CREATE TABLE IF NOT EXISTS tracks (
    path TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    artist TEXT NOT NULL DEFAULT '',
    album TEXT NOT NULL DEFAULT '',
    duration REAL NOT NULL DEFAULT 0,
    year TEXT NOT NULL DEFAULT '',
    genre TEXT NOT NULL DEFAULT '',
    track_number TEXT NOT NULL DEFAULT '',
    size INTEGER NOT NULL DEFAULT 0,
    mtime_ns INTEGER NOT NULL DEFAULT 0,
    cover_path TEXT,
    lyrics_path TEXT
);
CREATE INDEX IF NOT EXISTS tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS tracks_album ON tracks(album);
"""


@dataclass(frozen=True, slots=True)
class IndexedTrack:
    """Una pista con los datos de disco que deciden si sigue vigente."""

    track: Track
    mtime_ns: int
    size: int


class LibraryIndex:
    """Cache persistente de metadatos, con una conexion por hilo.

    No se comparte entre hilos: SQLite no permite usar una conexion desde otro
    hilo por defecto. Cada escaneo abre la suya y la cierra al terminar.
    """

    def __init__(self, path: Path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        try:
            self._conn = self._connect()
            self._migrate()
        except sqlite3.DatabaseError:
            # Un archivo corrupto o de otra version no puede impedir escanear:
            # se tira y se empieza de cero.
            logger.warning("Indice de biblioteca ilegible; se recrea: %s", self.path)
            if getattr(self, "_conn", None) is not None:
                self._conn.close()
            self.path.unlink(missing_ok=True)
            self._conn = self._connect()
            self._migrate()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.path), timeout=5.0)
        try:
            conn.row_factory = sqlite3.Row
            conn.execute("PRAGMA journal_mode=WAL")
            conn.execute("PRAGMA synchronous=NORMAL")
        except Exception:
            # Sin cerrarla, Windows no deja borrar el archivo corrupto.
            conn.close()
            raise
        return conn

    def _migrate(self) -> None:
        version = int(self._conn.execute("PRAGMA user_version").fetchone()[0])
        if version != SCHEMA_VERSION:
            self._conn.execute("DROP TABLE IF EXISTS tracks")
        self._conn.executescript(_SCHEMA)
        self._conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
        self._conn.commit()

    def load(self, root: Path | None = None) -> dict[Path, IndexedTrack]:
        """Pistas guardadas, opcionalmente solo las que estan bajo `root`."""
        rows = self._conn.execute(f"SELECT {_COLUMNS} FROM tracks").fetchall()
        cached: dict[Path, IndexedTrack] = {}
        for row in rows:
            path = Path(row["path"])
            if root is not None and not _within(path, root):
                continue
            cached[path] = IndexedTrack(
                track=Track(
                    path=path,
                    title=row["title"],
                    artist=row["artist"],
                    album=row["album"],
                    duration=row["duration"],
                    year=row["year"],
                    genre=row["genre"],
                    track_number=row["track_number"],
                    size=row["size"],
                    cover_path=Path(row["cover_path"]) if row["cover_path"] else None,
                    lyrics_path=Path(row["lyrics_path"]) if row["lyrics_path"] else None,
                ),
                mtime_ns=row["mtime_ns"],
                size=row["size"],
            )
        return cached

    def upsert(self, items: list[IndexedTrack]) -> None:
        """Guarda o actualiza pistas. Las filas ausentes no se tocan."""
        if not items:
            return
        self._conn.executemany(
            """
            INSERT INTO tracks (
                path, title, artist, album, duration, year, genre,
                track_number, size, mtime_ns, cover_path, lyrics_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                title = excluded.title,
                artist = excluded.artist,
                album = excluded.album,
                duration = excluded.duration,
                year = excluded.year,
                genre = excluded.genre,
                track_number = excluded.track_number,
                size = excluded.size,
                mtime_ns = excluded.mtime_ns,
                cover_path = excluded.cover_path,
                lyrics_path = excluded.lyrics_path
            """,
            [
                (
                    str(item.track.path),
                    item.track.title,
                    item.track.artist,
                    item.track.album,
                    item.track.duration,
                    item.track.year,
                    item.track.genre,
                    item.track.track_number,
                    item.size,
                    item.mtime_ns,
                    str(item.track.cover_path) if item.track.cover_path else None,
                    str(item.track.lyrics_path) if item.track.lyrics_path else None,
                )
                for item in items
            ],
        )
        self._conn.commit()

    def remove(self, paths: list[Path] | set[Path]) -> int:
        """Borra las filas de esas rutas y devuelve cuantas existian."""
        if not paths:
            return 0
        before = self._conn.total_changes
        self._conn.executemany(
            "DELETE FROM tracks WHERE path = ?", [(str(path),) for path in paths]
        )
        self._conn.commit()
        return self._conn.total_changes - before

    def prune(self, root: Path, existing: set[Path]) -> int:
        """Saca de `root` las filas de archivos que ya no estan en disco."""
        rows = self._conn.execute("SELECT path FROM tracks").fetchall()
        stale = [
            Path(row["path"])
            for row in rows
            if _within(Path(row["path"]), root) and Path(row["path"]) not in existing
        ]
        return self.remove(stale)

    def clear(self) -> None:
        self._conn.execute("DELETE FROM tracks")
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    def __enter__(self) -> LibraryIndex:
        return self

    def __exit__(self, *_exc) -> None:
        self.close()


def _within(path: Path, root: Path) -> bool:
    """Si `path` esta bajo `root`, sin depender de mayusculas en Windows."""
    clean_path = os.path.normcase(os.path.abspath(str(path)))
    clean_root = os.path.normcase(os.path.abspath(str(root)))
    return clean_path == clean_root or clean_path.startswith(clean_root + os.sep)
