"""Portada de carpeta y letras .lrc, con casos copiados de bibliotecas reales.

El caso motivador: una carpeta con 201 .m4a sin ninguna portada embebida y un
`folder.jpg` al lado. Sin esto, las 201 se ven sin caratula.
"""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from sakura.core.library import (
    find_folder_cover,
    find_lyrics,
    folder_covers,
    load_track,
    lyrics_indexes,
    parse_lrc,
    scan_paths,
)
from sakura.core.tools import ffmpeg_location

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")

NOMBRES_FOLDER = ("folder.jpg", "cover.jpg", "Front.png", "album.jpeg", "cover.webp")


def _png() -> bytes:
    import struct
    import zlib

    width = 16
    raw = b"".join(b"\x00" + bytes([0x40, 0x20, 0x60]) * width for _ in range(width))

    def chunk(type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + type + data + struct.pack(">I", crc)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, width, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


@pytest.fixture()
def library(tmp_path) -> Path:
    """Carpeta con pistas, una portada y un .lrc, como las reales."""
    root = tmp_path / "idle"
    root.mkdir()

    for _number, title_text in ((1, "I DO"), (2, "I Want That")):
        file_path = root / f"{title_text}.m4a"
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", "-c:a", "aac", str(file_path)],
            check=True, capture_output=True,
        )

    (root / "folder.jpg").write_bytes(_png())
    return root


# --- portada de carpeta -------------------------------------------------------


@pytest.mark.parametrize("name_text", NOMBRES_FOLDER)
def test_reconoce_los_nombres_comunes(tmp_path, name_text) -> None:
    (tmp_path / name_text).write_bytes(_png())
    found = find_folder_cover(tmp_path)
    assert found is not None
    assert found.name == name_text


def test_no_confunde_una_foto_con_la_portada(tmp_path) -> None:
    """`foto.jpg` es una foto del grupo, no la caratula."""
    (tmp_path / "foto.jpg").write_bytes(_png())
    assert find_folder_cover(tmp_path) is None


def test_carpeta_sin_imagen(library) -> None:
    (library / "folder.jpg").unlink()
    assert find_folder_cover(library) is None


def test_carpeta_inexistente() -> None:
    assert find_folder_cover(Path("C:/no/existe")) is None


def test_folder_covers_mapea_una_sola_vez(library) -> None:
    mapa = folder_covers(library)
    assert len(mapa) == 1
    assert mapa[library].name == "folder.jpg"


def test_folder_covers_ignora_carpetas_sin_audio(tmp_path) -> None:
    empty = tmp_path / "vacia"
    empty.mkdir()
    (empty / "folder.jpg").write_bytes(_png())
    assert folder_covers(tmp_path) == {}


def test_indices_reutilizan_las_rutas_de_audio(tmp_path, monkeypatch) -> None:
    audio = tmp_path / "cancion.mp3"
    audio.write_bytes(b"")
    cover = tmp_path / "folder.jpg"
    cover.write_bytes(_png())
    letter = tmp_path / "cancion.lrc"
    letter.write_text("[00:01.00] hola", encoding="utf-8")

    def no_reescanear(_root: Path) -> list[Path]:
        pytest.fail("se volvió a recorrer la biblioteca")

    monkeypatch.setattr("sakura.core.library.scan_paths", no_reescanear)

    assert folder_covers(tmp_path, [audio]) == {tmp_path: cover}
    assert lyrics_indexes(tmp_path, [audio]) == {tmp_path: {"cancion": letter}}


def test_carpeta_vacia(tmp_path) -> None:
    assert folder_covers(tmp_path) == {}
    assert folder_covers(Path("C:/no/existe")) == {}


# --- letras -------------------------------------------------------------------


def test_encuentra_lrc_con_el_mismo_nombre(library) -> None:
    letter = library / "I DO.lrc"
    letter.write_text("[00:01.00] hola", encoding="utf-8")
    assert find_lyrics(library / "I DO.m4a") == letter


def test_encuentra_lrc_con_sufijo_extra(library) -> None:
    """Los descargadores ponen '(Official Audio)' solo en un lado."""
    letter = library / "I Want That (Official Audio).lrc"
    letter.write_text("[00:01.00] hola", encoding="utf-8")
    assert find_lyrics(library / "I Want That.m4a") == letter


def test_ignora_txt_si_hay_lrc(library) -> None:
    (library / "I DO.txt").write_text("letra", encoding="utf-8")
    (library / "I DO.lrc").write_text("[00:01.00] hola", encoding="utf-8")
    assert find_lyrics(library / "I DO.m4a").suffix == ".lrc"


def test_acepta_txt_como_ultimo_recurso(library) -> None:
    (library / "I DO.txt").write_text("letra", encoding="utf-8")
    assert find_lyrics(library / "I DO.m4a") is not None


def test_sin_letra(library) -> None:
    assert find_lyrics(library / "I DO.m4a") is None


def test_leer_letra_utf8(library) -> None:
    letter = library / "I DO.lrc"
    letter.write_text("[00:01.00] 안녕하세요", encoding="utf-8")

    track_item = load_track(library / "I DO.m4a")
    track_item.lyrics_path = letter
    assert "안녕하세요" in track_item.read_lyrics()
    assert track_item.has_lyrics is True


def test_leer_letra_utf16(library) -> None:
    letter = library / "I DO.lrc"
    letter.write_bytes("[00:01.00] hola".encode("utf-16"))

    track_item = load_track(library / "I DO.m4a")
    track_item.lyrics_path = letter
    assert "hola" in track_item.read_lyrics()


def test_leer_letra_con_bom(library) -> None:
    letter = library / "I DO.lrc"
    letter.write_bytes(b"\xef\xbb\xbf[00:01.00] hola")

    track_item = load_track(library / "I DO.m4a")
    track_item.lyrics_path = letter
    assert track_item.read_lyrics().startswith("[00:01.00]")


def test_leer_letra_inexistente(library) -> None:
    track_item = load_track(library / "I DO.m4a")
    track_item.lyrics_path = library / "no-existe.lrc"
    assert track_item.read_lyrics() == ""


def test_pista_sin_letra(library) -> None:
    track_item = load_track(library / "I DO.m4a")
    assert track_item.has_lyrics is False
    assert track_item.read_lyrics() == ""


# --- parseo LRC ---------------------------------------------------------------


def test_parse_lrc_basico() -> None:
    lines = parse_lrc("[00:12.00] primera\n[01:30.50] segunda")
    assert lines == [(12.0, "primera"), (90.5, "segunda")]


def test_parse_lrc_ordena_por_tiempo() -> None:
    lines = parse_lrc("[02:00.00] tarde\n[00:10.00] temprano")
    assert lines[0][1] == "temprano"


def test_parse_lrc_sin_marcas() -> None:
    assert parse_lrc("letra normal sin tiempo") == []


def test_parse_lrc_una_decima() -> None:
    lines = parse_lrc("[00:05.5] media")
    assert lines == [(5.5, "media")]


def test_parse_lrc_varios_tiempos_en_una_linea() -> None:
    lines = parse_lrc("[00:10.00][01:10.00] coro")
    assert len(lines) == 2
    assert {t for t, _ in lines} == {10.0, 70.0}


def test_parse_lrc_metadata_se_ignora() -> None:
    lines = parse_lrc("[ar:Artista]\n[al:Album]\n[00:01.00] texto")
    assert lines == [(1.0, "texto")]


def test_parse_lrc_vacio() -> None:
    assert parse_lrc("") == []


# --- integracion -------------------------------------------------------------


@requires_ffmpeg
def test_las_pistas_de_la_carpeta_se_asocian(library) -> None:
    paths = scan_paths(library)
    mapa = folder_covers(library)

    assert len(paths) == 2
    for file_path in paths:
        track_item = load_track(file_path)
        assert track_item is not None
        assert mapa.get(file_path.parent) is not None


# --- escribir la portada de la carpeta ----------------------------------------


def test_escribe_folder_jpg_si_no_hay_ninguna(tmp_path) -> None:
    from sakura.core.library import FOLDER_COVER_NAME, write_cover_folder

    escrita = write_cover_folder(tmp_path, b"imagen")

    assert escrita == tmp_path / FOLDER_COVER_NAME
    assert escrita.read_bytes() == b"imagen"
    assert find_folder_cover(tmp_path) == escrita


def test_no_pisa_una_portada_que_ya_esta(tmp_path) -> None:
    """Si el usuario puso `cover.png` a mano, esa gana: no se pisa."""
    from sakura.core.library import write_cover_folder

    (tmp_path / "cover.png").write_bytes(b"del usuario")

    assert write_cover_folder(tmp_path, b" mia") is None
    assert (tmp_path / "cover.png").read_bytes() == b"del usuario"
    assert not (tmp_path / "folder.jpg").exists()


def test_una_carpeta_inexistente_no_revienta(tmp_path) -> None:
    from sakura.core.library import write_cover_folder

    assert write_cover_folder(tmp_path / "no-existe", b"x") is None


def test_la_escrita_respeta_el_ajuste(qapp, monkeypatch, tmp_path) -> None:
    """Con el ajuste apagado no se escribe nada, aunque haya portada."""
    from sakura.config import save_settings
    from sakura.ui.services.downloader import DownloadManager

    save_settings({"write_folder_cover": False})
    gestor = DownloadManager()
    destino = tmp_path / "Daft Punk" / "Discovery"
    destino.mkdir(parents=True)

    gestor._write_cover_folder(destino, b"imagen")

    assert list(destino.iterdir()) == []
    gestor.shutdown()


def test_la_escrita_escribe_con_el_ajuste_encendido(qapp, monkeypatch, tmp_path) -> None:
    from sakura.config import save_settings
    from sakura.core.library import FOLDER_COVER_NAME
    from sakura.ui.services.downloader import DownloadManager

    save_settings({"write_folder_cover": True})
    gestor = DownloadManager()
    destino = tmp_path / "Daft Punk" / "Discovery"
    destino.mkdir(parents=True)

    gestor._write_cover_folder(destino, b"imagen")

    assert (destino / FOLDER_COVER_NAME).read_bytes() == b"imagen"
    gestor.shutdown()