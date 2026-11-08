"""Indice SQLite de la biblioteca: cache, actualizacion y limpieza."""

from __future__ import annotations

from pathlib import Path

from sakura.core.library import Track
from sakura.core.library_index import IndexedTrack, LibraryIndex


def _track(path: Path, title_text: str = "Tema") -> Track:
    return Track(
        path=path,
        title=title_text,
        artist="Artista",
        album="Álbum",
        duration=123.0,
        year="2001",
        genre="Pop",
        track_number="3/10",
        size=2048,
    )


def test_guarda_y_recupera_metadatos(tmp_path) -> None:
    path = tmp_path / "index.db"
    carpeta = tmp_path / "pista.mp3"
    item = _track(carpeta, "Uno")

    with LibraryIndex(path) as index:
        index.upsert([IndexedTrack(item, 123456789, item.size)])

    with LibraryIndex(path) as index:
        cached = index.load()

    assert cached[carpeta].track.title == "Uno"
    assert cached[carpeta].track.album == "Álbum"
    assert cached[carpeta].track.track_number == "3/10"
    assert cached[carpeta].mtime_ns == 123456789


def test_actualizar_reemplaza_los_campos(tmp_path) -> None:
    path = tmp_path / "index.db"
    carpeta = tmp_path / "pista.mp3"

    with LibraryIndex(path) as index:
        index.upsert([IndexedTrack(_track(carpeta, "Viejo"), 1, 10)])
        index.upsert([IndexedTrack(_track(carpeta, "Nuevo"), 2, 20)])

    with LibraryIndex(path) as index:
        cached = index.load()

    assert len(cached) == 1
    assert cached[carpeta].track.title == "Nuevo"
    assert cached[carpeta].mtime_ns == 2


def test_prune_borra_solo_lo_que_falta_en_la_raiz(tmp_path) -> None:
    path = tmp_path / "index.db"
    root = tmp_path / "biblioteca"
    dentro = root / "uno.mp3"
    falta = root / "dos.mp3"
    fuera = tmp_path / "otra" / "tres.mp3"

    with LibraryIndex(path) as index:
        index.upsert(
            [
                IndexedTrack(_track(dentro), 1, 10),
                IndexedTrack(_track(falta), 2, 10),
                IndexedTrack(_track(fuera), 3, 10),
            ]
        )
        borradas = index.prune(root, {dentro})

    with LibraryIndex(path) as index:
        cached = index.load()

    assert borradas == 1
    assert set(cached) == {dentro, fuera}


def test_remove_saca_rutas_concretas(tmp_path) -> None:
    path = tmp_path / "index.db"
    uno = tmp_path / "uno.mp3"
    dos = tmp_path / "dos.mp3"

    with LibraryIndex(path) as index:
        index.upsert([IndexedTrack(_track(uno), 1, 10), IndexedTrack(_track(dos), 2, 10)])
        assert index.remove([uno]) == 1

    with LibraryIndex(path) as index:
        assert set(index.load()) == {dos}


def test_recrea_un_archivo_corrupto(tmp_path) -> None:
    path = tmp_path / "index.db"
    path.write_bytes(b"esto no es una base sqlite")

    with LibraryIndex(path) as index:
        assert index.load() == {}
        index.upsert([IndexedTrack(_track(tmp_path / "pista.mp3"), 1, 10)])

    with LibraryIndex(path) as index:
        assert len(index.load()) == 1
