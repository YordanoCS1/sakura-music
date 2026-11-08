"""Escritura y lectura de tags y portadas sobre archivos reales.

Genera audio con ffmpeg en mp3, m4a, opus y flac, y verifica que lo que se
escribe se vuelve a leer igual. Es donde aparecen los bugs de mutagen, que son
distintos por formato.
"""

from __future__ import annotations

import struct
import subprocess
import zlib
from pathlib import Path

import mutagen
import pytest

from sakura.core.metadata import (
    IMAGE_MIME,
    MetadataError,
    TrackTags,
    read_cover,
    read_cover_file,
    read_tags,
    remove_cover,
    track_from_tags,
    update_text_tags,
    write_cover,
    write_tags,
)
from sakura.core.tools import ffmpeg_location

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"

requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")

EXTENSIONES = ["mp3", "m4a", "opus", "flac"]

# Codec de ffmpeg para cada formato. Los nombres de encoder no coinciden con la
# extension (`.m4a` se codifica con `aac`, no con `m4a`).
CODEC = {
    "mp3": ["-c:a", "libmp3lame", "-q:a", "9"],
    "m4a": ["-c:a", "aac", "-b:a", "96k"],
    "opus": ["-c:a", "libopus", "-b:a", "64k"],
    "flac": ["-c:a", "flac"],
}


def _png(color: tuple[int, int, int] = (0x4A, 0x2A, 0x5E), width: int = 64) -> bytes:
    """PNG solido generado a mano, sin depender de Pillow."""
    r, g, b = color
    raw = b"".join(b"\x00" + bytes([r, g, b]) * width for _ in range(width))

    def chunk(type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + type + data + struct.pack(">I", crc)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, width, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


@pytest.fixture(scope="session")
def track_items(tmp_path_factory) -> dict[str, Path]:
    """Un archivo de audio vacio por formato."""
    root = tmp_path_factory.mktemp("meta")

    files = {}
    for ext in EXTENSIONES:
        destino = root / f"pista.{ext}"
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", *CODEC[ext], str(destino)],
            check=True, capture_output=True,
        )
        files[ext] = destino
    return files


@pytest.fixture()
def clean(track_items, tmp_path) -> dict[str, Path]:
    """Copias limpias, porque escribir tags es destructivo."""
    import shutil

    copias = {}
    for ext, original in track_items.items():
        destino = tmp_path / f"{original.stem}.{ext}"
        shutil.copy(original, destino)
        remove_all(destino)
        copias[ext] = destino
    return copias


def remove_all(path: Path) -> None:
    """Deja el archivo sin tags ni portada."""
    audio = mutagen.File(path)
    if audio is None:
        return
    import contextlib

    with contextlib.suppress(Exception):
        # Algunos formatos no implementan `delete()`.
        audio.delete()


ALL = TrackTags(
    title="Around the World",
    artist="Daft Punk",
    album="Homework",
    albumartist="Daft Punk",
    year="1997",
    genre="House",
    track_number="5",
)


# --- texto -------------------------------------------------------------------


@requires_ffmpeg
@pytest.mark.parametrize("ext", EXTENSIONES)
def test_escribir_y_leer_tags(clean, ext) -> None:
    file_path = clean[ext]
    write_tags(file_path, ALL)

    leidos = read_tags(file_path)
    assert leidos.title == "Around the World"
    assert leidos.artist == "Daft Punk"
    assert leidos.album == "Homework"
    assert leidos.albumartist == "Daft Punk"
    assert leidos.year == "1997"
    assert leidos.genre == "House"
    assert leidos.track_number == "5"


@requires_ffmpeg
@pytest.mark.parametrize("ext", EXTENSIONES)
def test_sobrescribir_tags_no_duplica(clean, ext) -> None:
    file_path = clean[ext]
    write_tags(file_path, ALL)
    write_tags(file_path, TrackTags(title="Solo el titulo"))

    leidos = read_tags(file_path)
    assert leidos.title == "Solo el titulo"
    assert leidos.artist == "", "el campo vacio deberia borrarse"
    assert leidos.album == ""


@requires_ffmpeg
def test_update_text_tags_aplica_lo_pedido(clean) -> None:
    file_path = clean["mp3"]
    write_tags(file_path, ALL)

    result = update_text_tags(file_path, title="Cambiado", artist="Otro")
    assert result.title == "Cambiado"
    assert result.artist == "Otro"
    assert result.album == "Homework", "los demas campos deben sobrevivir"
    assert read_tags(file_path).title == "Cambiado"


def test_update_text_tags_rechaza_campo_desconocido(clean) -> None:
    file_path = clean["mp3"]
    with pytest.raises(MetadataError):
        update_text_tags(file_path, color="rojo")


@requires_ffmpeg
@pytest.mark.parametrize("ext", EXTENSIONES)
def test_tags_vacios_dejan_el_archivo_limpio(clean, ext) -> None:
    write_tags(clean[ext], TrackTags())
    assert read_tags(clean[ext]).is_empty()


def test_archivo_ilegible_lanza_metadata_error(tmp_path) -> None:
    fake = tmp_path / "x.mp3"
    fake.write_bytes(b"no es audio")
    with pytest.raises(MetadataError):
        read_tags(fake)


# --- portada -----------------------------------------------------------------


@requires_ffmpeg
@pytest.mark.parametrize("ext", EXTENSIONES)
def test_escribir_y_leer_portada(clean, ext) -> None:
    file_path = clean[ext]
    image = _png((0x10, 0x80, 0x30))

    write_cover(file_path, image, "image/png")
    assert read_cover(file_path) == image


@requires_ffmpeg
def test_reemplazar_portada_no_deja_dos(clean) -> None:
    file_path = clean["mp3"]
    primera = _png((0x10, 0x80, 0x30))
    segunda = _png((0x90, 0x20, 0x60))

    write_cover(file_path, primera, "image/png")
    write_cover(file_path, segunda, "image/png")

    assert read_cover(file_path) == segunda
    assert len(mutagen.File(file_path).tags.getall("APIC")) == 1


@requires_ffmpeg
@pytest.mark.parametrize("ext", EXTENSIONES)
def test_quitar_portada(clean, ext) -> None:
    file_path = clean[ext]
    write_cover(file_path, _png(), "image/png")
    assert read_cover(file_path) is not None

    remove_cover(file_path)
    assert read_cover(file_path) is None


@requires_ffmpeg
def test_quitar_portada_sin_portada_no_falla(clean) -> None:
    remove_cover(clean["flac"])  # no tiene ninguna
    assert read_cover(clean["flac"]) is None


@requires_ffmpeg
def test_portada_no_destruye_los_tags(clean) -> None:
    file_path = clean["mp3"]
    write_tags(file_path, ALL)
    write_cover(file_path, _png(), "image/png")

    assert read_cover(file_path) is not None
    assert read_tags(file_path).title == "Around the World"


def test_portada_vacia_rechazada(clean) -> None:
    with pytest.raises(MetadataError, match="vac"):
        write_cover(clean["mp3"], b"", "image/png")


def test_portada_demasiado_grande_rechazada(clean) -> None:
    with pytest.raises(MetadataError, match="límite"):
        write_cover(clean["mp3"], b"x" * (5 * 1024 * 1024), "image/png")


def test_formato_sin_portada_rechazado(tmp_path) -> None:
    from sakura.core.metadata import write_cover as write

    with pytest.raises(MetadataError, match="no admite"):
        write(tmp_path / "x.wav", b"x", "image/png")


# --- imagenes del disco ------------------------------------------------------


def test_read_cover_file_detecta_mime(tmp_path) -> None:
    jpg = tmp_path / "portada.jpg"
    jpg.write_bytes(b"\xff\xd8\xff" + b"0" * 40)
    data, mime = read_cover_file(jpg)
    assert mime == "image/jpeg"
    assert data.startswith(b"\xff\xd8\xff")


def test_read_cover_file_rechaza_formato_desconocido(tmp_path) -> None:
    bmp = tmp_path / "portada.tiff"
    bmp.write_bytes(b"II*")
    with pytest.raises(MetadataError, match="no soportado"):
        read_cover_file(bmp)


def test_read_cover_file_rechaza_vacio(tmp_path) -> None:
    empty = tmp_path / "vacia.png"
    empty.write_bytes(b"")
    with pytest.raises(MetadataError, match="vacío"):
        read_cover_file(empty)


def test_mimes_conocidos() -> None:
    assert IMAGE_MIME[".jpg"] == "image/jpeg"
    assert IMAGE_MIME[".png"] == "image/png"


# --- TrackTags ---------------------------------------------------------------


def test_track_tags_mapping_descarta_vacios() -> None:
    tags = TrackTags(title="T", artist="")
    assert tags.as_text_mapping() == {"title": "T"}


def test_track_from_tags_usa_el_nombre_del_archivo() -> None:
    data = track_from_tags(Path("cancion.mp3"), TrackTags())
    assert data["title"] == "cancion"
    assert data["artist"] == "Desconocido"
    assert data["album"] == "Desconocido"