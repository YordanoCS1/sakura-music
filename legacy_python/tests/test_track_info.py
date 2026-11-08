"""La ficha de informacion de una pista."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from PySide6.QtCore import Qt

from sakura.core.library import Track, load_track
from sakura.core.metadata import TrackTags, write_cover, write_tags
from sakura.core.tools import ffmpeg_location
from sakura.ui.widgets.track_info import TrackInfoDialog

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")


@pytest.fixture()
def file_path(tmp_path) -> Path:
    destino = tmp_path / "03 - MIYEON.mp3"
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(destino)],
        check=True, capture_output=True,
    )
    write_tags(
        destino,
        TrackTags(
            title="너는 나의.superstition",
            artist="MIYEON",
            album="Superstition",
            albumartist="MIYEON",
            year="2021",
            genre="R&B",
            track_number="3",
        ),
    )
    return destino


@pytest.fixture()
def track_item(file_path) -> Track:
    loaded = load_track(file_path)
    assert loaded is not None
    return loaded


@pytest.fixture()
def info(qapp, track_item) -> TrackInfoDialog:
    return TrackInfoDialog(track_item)


# --- contenido ---------------------------------------------------------------


def test_muestra_titulo_y_artista(info, track_item) -> None:
    assert info.title_text.text() == track_item.title
    assert info.artist_name.text() == "MIYEON"


def test_muestra_la_ruta(info, file_path) -> None:
    assert info.file_path.text() == str(file_path)


def test_lista_los_datos(info) -> None:
    text_value = info.data_text()
    for expected_value in ("Superstition", "2021", "R&B", "0:01", "MP3", "Pista"):
        assert expected_value in text_value, f"falta {expected_value}"


def test_oculta_campos_vacios(info, track_item) -> None:
    """Sin genero no deberia aparecer la fila Genero con valor vacio."""
    track_item.genre = ""
    info.refresh()
    text_value = info.data_text()

    assert "Género" not in text_value
    assert "Año" in text_value


def test_oculta_album_desconocido(info, track_item) -> None:
    track_item.album = "Desconocido"
    info.refresh()
    assert "Álbum" not in info.data_text()


def test_numero_de_pista_sin_total(info, track_item) -> None:
    track_item.track_number = "3"
    info.refresh()
    assert "3" in info.data_text()


def test_muestra_el_total_de_pistas(info, track_item) -> None:
    track_item.track_number = "3/14"
    info.refresh()
    assert "3/14" in info.data_text()


# --- portada -----------------------------------------------------------------


def test_sin_portada_lo_dice(info) -> None:
    assert "no tiene portada" in info.state.text()
    assert info.cover.pixmap() is not None
    assert not info.cover.pixmap().isNull()


@requires_ffmpeg
def test_con_portada_embebida(qapp, file_path) -> None:
    from tests.test_metadata import _png

    write_cover(file_path, _png((0x10, 0x20, 0x30), 120), "image/png")

    track_item = load_track(file_path)
    assert track_item is not None
    track_item.cover_path = file_path.parent / "portada.png"
    # Se copia la portada donde el modelo la espera.
    (file_path.parent / "portada.png").write_bytes(_png((0x10, 0x20, 0x30), 120))

    info = TrackInfoDialog(track_item)
    assert "Portada embebida" in info.state.text()


def test_cover_path_inexistente_cae_al_placeholder(qapp, track_item) -> None:
    track_item.cover_path = Path("C:/no/existe/cartap.jpg")
    info = TrackInfoDialog(track_item)
    assert "no tiene portada" in info.state.text()


def test_archivo_corrupto_no_rompe_la_ficha(qapp, tmp_path) -> None:
    roto = Track(
        path=Path("x.mp3"),
        title="T",
        artist="A",
        album="Desconocido",
        duration=0.0,
        cover_path=Path("C:/roto/no.jpg"),
    )
    info = TrackInfoDialog(roto)
    assert info.title_text.text() == "T"


# --- formato de Duracion y Tamano --------------------------------------------


def test_datos_de_archivo_variantes(qapp, tmp_path) -> None:
    larga = Track(
        path=Path("larga.flac"),
        title="X",
        artist="Y",
        album="Z",
        duration=3725.0,
        size=5 * 1024 * 1024,
    )
    info = TrackInfoDialog(larga)
    text_value = info.data_text()
    assert "1:02:05" in text_value
    assert "5.0 MB" in text_value
    assert "FLAC" in text_value


# --- pisos -------------------------------------------------------------------


def test_pistas_hermanas_lista_vacia_por_defecto(info) -> None:
    assert info.hermanas == []


def test_hermanas_se_pueden_asignar(qapp, track_item, file_path) -> None:
    info = TrackInfoDialog(track_item)
    other = Track(path=file_path.parent / "04 - Otra.mp3", title="Otra", artist="A",
                 album="B", duration=0.0)
    info.hermanas = [other]
    assert info.hermanas[0].title == "Otra"


def test_refresh_es_idempotente(info) -> None:
    before = info.title_text.text()
    info.refresh()
    info.refresh()
    assert info.title_text.text() == before


# --- cromo temado e interacciones -------------------------------------------


def test_la_ficha_no_usa_el_marco_nativo(info) -> None:
    assert info.windowFlags() & Qt.WindowType.FramelessWindowHint
    assert info.surface.objectName() == "DialogSurface"
    assert info.header.title.text() == "Información de la pista"


def test_clic_en_un_dato_lo_copia(qapp, info) -> None:
    info._copy_value("R&B")

    assert qapp.clipboard().text() == "R&B"
    assert "Copiado" in info.state.text()


def test_copiar_la_ruta_completa(qapp, info, file_path) -> None:
    info.copy_path()

    assert qapp.clipboard().text() == str(file_path)
    assert "Ruta copiada" in info.state.text()