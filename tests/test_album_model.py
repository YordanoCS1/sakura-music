"""Agrupacion de pistas para la estanteria de albumes."""

from __future__ import annotations

from pathlib import Path

from sakura.core.library import Track
from sakura.ui.models.album_model import (
    ARTISTA_DESCONOCIDO,
    SIN_ALBUM,
    build_album_groups,
)


def _track(
    tmp_path: Path,
    title: str,
    album: str,
    artist: str = "Daft Punk",
    year: str = "",
    cover_path: Path | None = None,
) -> Track:
    return Track(
        path=tmp_path / f"{title}.mp3",
        title=title,
        artist=artist,
        album=album,
        duration=60,
        year=year,
        cover_path=cover_path,
    )


def test_agrupa_pistas_por_album_y_artista(tmp_path: Path) -> None:
    albums = build_album_groups(
        [
            _track(tmp_path, "One More Time", "Discovery", year="2001"),
            _track(tmp_path, "Aerodynamic", "Discovery", year="2001"),
            _track(tmp_path, "Get Lucky", "Random Access Memories", year="2013"),
        ]
    )

    assert [(album.title, album.track_count, album.year) for album in albums] == [
        ("Discovery", 2, "2001"),
        ("Random Access Memories", 1, "2013"),
    ]


def test_los_albumes_sin_nombre_van_al_final(tmp_path: Path) -> None:
    albums = build_album_groups(
        [
            _track(tmp_path, "Suelta", "", artist=""),
            _track(tmp_path, "Get Lucky", "Random Access Memories"),
        ]
    )

    assert [album.title for album in albums] == ["Random Access Memories", SIN_ALBUM]
    assert albums[1].artist_text == ARTISTA_DESCONOCIDO


def test_la_portada_sale_de_la_primera_pista_que_la_tenga(tmp_path: Path) -> None:
    cover = tmp_path / "cover.png"
    cover.write_bytes(b"png")
    albums = build_album_groups(
        [
            _track(tmp_path, "One More Time", "Discovery"),
            _track(tmp_path, "Aerodynamic", "Discovery", cover_path=cover),
        ]
    )

    assert len(albums) == 1
    assert albums[0].cover_path == cover
    assert albums[0].tracks_text == "2 pistas"
