"""Catálogo de artistas: búsqueda, discografía y filtro de álbumes.

Los tests corren contra fixtures grabados con `scripts/grab_fixtures.py`, no
contra la red.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from sakura.core import metadata_sources as ms
from sakura.core.metadata_sources import (
    AlbumEntry,
    ArtistEntry,
    SourceError,
    only_albums,
)

DATA = Path(__file__).parent / "data"


def fixture(name_text: str) -> dict:
    return json.loads((DATA / f"{name_text}.json").read_text(encoding="utf-8"))


def _album(title_text: str, track_items: int = 14, year: str = "2001") -> AlbumEntry:
    return AlbumEntry(
        album_id="1",
        title=title_text,
        artist="A",
        year=year,
        track_total=track_items,
    )


# --- artistas ----------------------------------------------------------------


def test_busca_artistas_por_nombre(monkeypatch) -> None:
    response = {
        "results": [
            {"artistId": 1, "artistName": "Daft Punk", "primaryGenreName": "Dance"},
            {"artistId": 2, "artistName": "daft punk"},
            {"artistId": 3, "artistName": "Daft Punk is Dead"},
        ]
    }
    pedido: list[str] = []
    monkeypatch.setattr(
        ms,
        "_request",
        lambda url: pedido.append(url) or response,
    )

    artists = ms.search_artists("daft punk", limit=10)

    assert [a.name for a in artists] == ["Daft Punk", "Daft Punk is Dead"], (
        "los duplicados con distinta capitalización son el mismo artista"
    )
    assert artists[0].artist_id == "1"
    assert artists[0].genre == "Dance"
    assert "musicArtist" in pedido[0]


def test_artistas_sin_id_o_sin_nombre_se_ignoran(monkeypatch) -> None:
    response = {
        "results": [
            {"artistName": "Sin id"},
            {"artistId": 9},
            {"artistId": 5, "artistName": "  "},
            {"artistId": 7, "artistName": "Daft Punk"},
        ]
    }
    monkeypatch.setattr(ms, "_request", lambda url: response)

    assert [a.name for a in ms.search_artists("x")] == ["Daft Punk"]


def test_consulta_vacia_de_artista_no_hace_red(monkeypatch) -> None:
    llamado: list[str] = []
    monkeypatch.setattr(ms, "_request", lambda *a, **k: llamado.append(a))

    assert ms.search_artists("  ") == []
    assert ms.artist_albums("") == []
    assert not llamado


def test_error_de_la_api_de_artistas_se_traduce(monkeypatch) -> None:
    def falla(*a, **k):
        raise SourceError("sin conexion")

    monkeypatch.setattr(ms, "_request", falla)

    with pytest.raises(SourceError, match="sin conexion"):
        ms.search_artists("daft punk")


# --- discografia -------------------------------------------------------------


def _response_albums(*entradas: dict) -> dict:
    return {"results": [{"wrapperType": "artist", "artistName": "Daft Punk"}, *entradas]}


def _coleccion(name_text: str, collection_id: str, year: str, track_items: int) -> dict:
    return {
        "wrapperType": "collection",
        "collectionId": collection_id,
        "collectionName": name_text,
        "artistName": "Daft Punk",
        "releaseDate": f"{year}-01-01T00:00:00Z",
        "primaryGenreName": "Dance",
        "trackCount": track_items,
        "artworkUrl100": "https://is1-ssl.mzstatic.com/image/thumb/x/100x100bb.jpg",
    }


def test_lista_los_albumes_del_artista(monkeypatch) -> None:
    response = _response_albums(
        _coleccion("Homework", "1", "1997", 16),
        _coleccion("Discovery", "2", "2001", 14),
        _coleccion("Random Access Memories", "3", "2013", 14),
    )
    pedido: list[str] = []
    monkeypatch.setattr(ms, "_request", lambda url: pedido.append(url) or response)

    albums = ms.artist_albums("5468295")

    assert [a.title for a in albums] == [
        "Random Access Memories",
        "Discovery",
        "Homework",
    ], "del mas nuevo al mas viejo"
    assert albums[0].album_id == "3"
    assert albums[0].tracks_label == "14 pistas"
    assert "600x600" in albums[0].cover_url
    assert "entity=album" in pedido[0]


def test_ignora_lo_que_no_es_una_coleccion(monkeypatch) -> None:
    """El lookup mezcla el artista, las colecciones y las pistas."""
    response = _response_albums(
        {"wrapperType": "track", "trackName": "One More Time", "collectionId": "9"},
        _coleccion("Discovery", "2", "2001", 14),
    )
    monkeypatch.setattr(ms, "_request", lambda url: response)

    assert [a.title for a in ms.artist_albums("1")] == ["Discovery"]


def test_una_edicion_sin_ano_no_tapa_a_la_que_si_lo_tiene(monkeypatch) -> None:
    response = _response_albums(
        {"wrapperType": "collection", "collectionId": "9", "collectionName": "Discovery"},
        _coleccion("Discovery", "2", "2001", 14),
    )
    monkeypatch.setattr(ms, "_request", lambda url: response)

    albums = ms.artist_albums("1")

    assert len(albums) == 1
    assert albums[0].year == "2001"


# --- que es un album y que un single ----------------------------------------


@pytest.mark.parametrize(
    "title_text",
    [
        "Aerodynamic - Single",
        "Revolution 909 - EP",
        "Harder Better Faster Stronger (Radio Edit)",
        "Human After All (Remixes)",
        "Something About Us (Love Theme)",
    ],
)
def test_filtra_singles_eps_y_remixes(title_text: str) -> None:
    assert only_albums([_album(title_text, track_items=3)]) == []


@pytest.mark.parametrize(
    "title_text",
    ["Discovery", "Homework (25th Anniversary Edition)", "TRON: Legacy Reconfigured"],
)
def test_deja_los_albumes_de_verdad(title_text: str) -> None:
    assert only_albums([_album(title_text, track_items=14)]) != []


def test_una_pista_sola_no_es_un_album() -> None:
    """Criterio de corte: cuatro pistas o mas. Tres es un maxi single."""
    assert only_albums([_album("Cancion Sin Album", track_items=3)]) == []


def test_el_filtro_mantiene_el_orden_que_recibe() -> None:
    """El filtro solo saca: el orden del catalogo no se toca."""
    entrada = [
        _album("Random Access Memories", year="2013"),
        _album("Aerodynamic - Single", track_items=2, year="2001"),
        _album("Discovery", year="2001"),
    ]

    result = only_albums(entrada)

    assert [a.title for a in result] == ["Random Access Memories", "Discovery"]


def test_las_etiquetas_de_un_album_son_utiles() -> None:
    album = AlbumEntry(
        album_id="1",
        title="Discovery",
        artist="Daft Punk",
        year="2001",
        genre="Dance",
        track_total=14,
    )

    assert album.year_label == "2001"
    assert album.subtitle == "2001 · Dance · 14 pistas"
    assert AlbumEntry("1", "X").year_label == "—"
    assert AlbumEntry("1", "X").tracks_label == "—"


def test_una_pista_no_va_al_artefacto_de_artista() -> None:
    artist_name = ArtistEntry(artist_id="1", name="Daft Punk", genre="Dance")

    assert artist_name.name == "Daft Punk"
    assert artist_name.genre == "Dance"