"""Aplicacion de candidatos del catalogo a archivos reales."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from sakura.core.metadata import read_cover, read_tags
from sakura.core.metadata_sources import Candidate, SourceError
from sakura.core.tools import ffmpeg_location
from sakura.ui.services.metadata_search import (
    _SearchWorker,
    apply_album,
    apply_candidate,
)

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")

TITLES = ["01 - One More Time", "02 - Aerodynamic", "03 - Digital Love"]


@pytest.fixture()
def files(tmp_path) -> list[Path]:
    """Tres mp3 sin tags, con los nombres que deja una descarga de album."""
    paths = []
    for title_text in TITLES:
        file_path = tmp_path / f"{title_text}.mp3"
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(file_path)],
            check=True, capture_output=True,
        )
        paths.append(file_path)
    return paths


@pytest.fixture()
def without_red(monkeypatch):
    """Corta la descarga de portadas: los tests no usan la red."""
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.download_cover", lambda *a, **k: None
    )


def candidate(title_text: str, number: str = "1") -> Candidate:
    return Candidate(
        source="itunes",
        title=title_text,
        artist="Daft Punk",
        album="Discovery",
        year="2000",
        genre="Dance",
        track_number=number,
        cover_url="",
    )


def test_busqueda_automatica_avisa_que_cambia_de_itunes_a_deezer(monkeypatch) -> None:
    sources: list[str] = []
    results = [candidate("One More Time")]
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_itunes", lambda *_: []
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_deezer", lambda *_: results
    )
    worker = _SearchWorker("Daft Punk One More Time", 15, "auto")
    worker.source_changed.connect(sources.append)

    worker.run()

    assert sources == ["itunes", "deezer"]


def test_busqueda_automatica_combina_catalogos_aunque_itunes_tenga_resultados(
    monkeypatch,
) -> None:
    itunes = [Candidate("itunes", title="Beam Beam karaoke", artist="Backing Business")]
    deezer = [Candidate("deezer", title="BEAM BEAM", artist="JEON SOYEON")]
    consultadas: list[str] = []
    recibidos: list[list[Candidate]] = []
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_itunes",
        lambda *_: consultadas.append("itunes") or itunes,
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_deezer",
        lambda *_: consultadas.append("deezer") or deezer,
    )
    worker = _SearchWorker("삠삠 (BEAM BEAM) SOYEON", 50, "auto")
    worker.results_ready.connect(recibidos.append)

    worker.run()

    assert consultadas == ["itunes", "deezer"]
    assert recibidos[0][0].artist == "JEON SOYEON"


def test_busqueda_automatica_avisa_si_un_catalogo_falla(monkeypatch) -> None:
    def falla(*_args) -> list[Candidate]:
        raise SourceError("sin conexión")

    monkeypatch.setattr("sakura.ui.services.metadata_search.search_itunes", falla)
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_deezer",
        lambda *_: [Candidate("deezer", title="BEAM BEAM", artist="JEON SOYEON")],
    )
    worker = _SearchWorker("BEAM BEAM SOYEON", 50, "auto")
    avisos: list[str] = []
    worker.warning.connect(avisos.append)

    worker.run()

    assert avisos == ["Resultados parciales; iTunes: sin conexión"]


def test_busqueda_directa_consulta_solo_el_catalogo_seleccionado(monkeypatch) -> None:
    consultadas: list[str] = []
    results = [candidate("One More Time")]
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_itunes",
        lambda *_: consultadas.append("itunes") or results,
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_deezer",
        lambda *_: consultadas.append("deezer") or results,
    )
    worker = _SearchWorker("Daft Punk One More Time", 15, "deezer")
    sources: list[str] = []
    worker.source_changed.connect(sources.append)

    worker.run()

    assert consultadas == ["deezer"]
    assert sources == ["deezer"]


def test_busqueda_del_editor_solicita_hasta_cincuenta_resultados() -> None:
    from sakura.ui.services.metadata_search import MetadataSearch

    assert MetadataSearch.search.__defaults__ == (50, "auto", "")


def test_busqueda_itunes_pasa_artista_separado(monkeypatch) -> None:
    consultas: list[str] = []
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_itunes",
        lambda query, limit, *, artist_query: consultas.append(artist_query)
        or [Candidate("itunes", title="BEAM BEAM", artist="SOYEON")],
    )
    worker = _SearchWorker("BEAM BEAM", 10, "itunes", artist_query="SOYEON")

    worker.run()

    assert consultas == ["SOYEON"]


# --- una pista ---------------------------------------------------------------


@requires_ffmpeg
def test_aplicar_escribe_los_tags(files, without_red) -> None:
    assert apply_candidate(files[0], candidate("One More Time")) is None

    tags = read_tags(files[0])
    assert tags.title == "One More Time"
    assert tags.artist == "Daft Punk"
    assert tags.album == "Discovery"
    assert tags.year == "2000"
    assert tags.genre == "Dance"
    assert tags.track_number == "1"


@requires_ffmpeg
def test_sin_portada_no_toca_la_existente(files, without_red) -> None:
    from sakura.core.metadata import write_cover
    from tests.test_metadata import _png

    write_cover(files[0], _png(), "image/png")
    apply_candidate(files[0], candidate("One More Time"))

    assert read_cover(files[0]) is None, "un candidato sin portada la debe borrar"


@requires_ffmpeg
def test_portada_se_embebe(files, monkeypatch) -> None:
    from tests.test_metadata import _png

    image = _png()
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.download_cover",
        lambda *a, **k: (image, "image/png"),
    )

    assert apply_candidate(files[0], candidate("One More Time")) is None
    assert read_cover(files[0]) == image


@requires_ffmpeg
def test_archivo_ilegible_devuelve_error(tmp_path) -> None:
    fake = tmp_path / "x.mp3"
    fake.write_bytes(b"no es audio")
    assert apply_candidate(fake, candidate("One More Time")) is not None


# --- album completo -----------------------------------------------------------


@requires_ffmpeg
def test_aplicar_album_empareja_por_titulo(files, without_red) -> None:
    tracks_album = [
        candidate("One More Time", "1"),
        candidate("Aerodynamic", "2"),
        candidate("Digital Love", "3"),
    ]

    applied, errors = apply_album(files, tracks_album)

    assert applied == 3
    assert not errors
    assert read_tags(files[0]).title == "One More Time"
    assert read_tags(files[1]).track_number == "2"
    assert read_tags(files[2]).track_number == "3"


@requires_ffmpeg
def test_aplicar_album_ignora_lo_que_no_esta(files, without_red) -> None:
    tracks_album = [candidate("One More Time", "1")]  # solo una del album

    applied, errors = apply_album(files, tracks_album)

    assert applied == 1
    assert not errors
    assert read_tags(files[1]).title == "", "las demas no se tocan"


@requires_ffmpeg
def test_aplicar_album_vacio(files, without_red) -> None:
    assert apply_album(files, []) == (0, [])
    assert apply_album([], [candidate("x")]) == (0, [])


@requires_ffmpeg
def test_aplicar_album_con_versiones_equivocadas(files, without_red) -> None:
    """Un live remix no debe pisar la pista original."""
    tracks_album = [
        candidate("One More Time (Live at Coachella)"),
        candidate("One More Time (Short Radio Edit)"),
    ]

    applied, _ = apply_album(files, tracks_album)

    # Ninguno es "One More Time" limpio, asi que no deberia escribir nada.
    assert applied == 0


@requires_ffmpeg
def test_un_candidato_por_pista(files, without_red) -> None:
    """Dos archivos con el mismo nombre base no pueden tomar el mismo candidato."""
    tracks_album = [candidate("One More Time", "1"), candidate("One More Time", "2")]

    applied, _ = apply_album(files[:1], tracks_album)
    assert applied == 1


# --- MusicBrainz -------------------------------------------------------------


def test_busqueda_musicbrainz_directa_consulta_solo_ese_catalogo(monkeypatch) -> None:
    consultas: list[str] = []
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_musicbrainz",
        lambda query, limit: consultas.append(query)
        or [Candidate("musicbrainz", title="BEAM BEAM", artist="JEON SOYEON")],
    )
    worker = _SearchWorker("BEAM BEAM", 10, "musicbrainz", artist_query="SOYEON")
    sources: list[str] = []
    worker.source_changed.connect(sources.append)

    worker.run()

    assert sources == ["musicbrainz"]
    assert consultas == ["BEAM BEAM SOYEON"]


def test_comparar_todos_suma_musicbrainz(monkeypatch) -> None:
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_itunes",
        lambda *_: [Candidate("itunes", title="Uno", artist="A")],
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_deezer",
        lambda *_: [Candidate("deezer", title="Dos", artist="B")],
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_musicbrainz",
        lambda *_: [Candidate("musicbrainz", title="Tres", artist="C")],
    )
    worker = _SearchWorker("x", 50, "all")
    sources: list[str] = []
    recibidos: list[list[Candidate]] = []
    worker.source_changed.connect(sources.append)
    worker.results_ready.connect(recibidos.append)

    worker.run()

    assert sources == ["itunes", "deezer", "musicbrainz"]
    assert {item.source for item in recibidos[0]} == {
        "itunes",
        "deezer",
        "musicbrainz",
    }


def test_modo_automatico_no_consulta_musicbrainz(monkeypatch) -> None:
    llamado: list[str] = []
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_itunes", lambda *_: []
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_deezer",
        lambda *_: [candidate("One More Time")],
    )
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.search_musicbrainz",
        lambda *_: llamado.append("musicbrainz") or [],
    )
    worker = _SearchWorker("Daft Punk", 15, "auto")

    worker.run()

    assert llamado == [], "el modo automático debe seguir rápido: sin MusicBrainz"