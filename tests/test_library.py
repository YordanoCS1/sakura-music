"""Escaneo de biblioteca y lectura de metadatos con mutagen.

Genera audio real con ffmpeg y le pega tags, asi los tests corren contra los
formatos de verdad y no contra mocks.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import mutagen
import pytest

from sakura.core.library import (
    AUDIO_EXTENSIONS,
    Track,
    duplicate_track_paths,
    extract_cover,
    find_existing_download,
    is_audio,
    load_track,
    sanitize_filename,
    scan_paths,
    summarize,
)
from sakura.core.tools import ffmpeg_location

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"


requires_ffmpeg = pytest.mark.skipif(
    not FFMPEG.exists(), reason="ffmpeg no esta instalado"
)


@pytest.fixture(scope="session")
def library(tmp_path_factory) -> Path:
    """Carpeta con audio generado y tags escritos."""
    root = tmp_path_factory.mktemp("biblioteca")

    (root / "Daft Punk").mkdir()
    (root / "Daft Punk" / "Discovery").mkdir()
    (root / "Ports of Call").mkdir()

    _generate(root / "Daft Punk" / "One More Time.mp3", 2)
    _generate(root / "Daft Punk" / "Aerodynamic.mp3", 3)
    _generate(root / "Ports of Call" / "United.flac", 5)
    _generate(root / "Daft Punk" / "Discovery" / "Sin Etiquetas.mp3", 1)
    _generate(root / "corrupto.mp3", 0)
    (root / "corrupto.mp3").write_bytes(b"esto no es un mp3 en absoluto")

    _tags_mp3(
        root / "Daft Punk" / "One More Time.mp3",
        "One More Time",
        "Daft Punk",
        "Discovery",
        "2001",
        "Electronic",
    )
    _tags_mp3(
        root / "Daft Punk" / "Aerodynamic.mp3",
        "Aerodynamic",
        "Daft Punk",
        "Discovery",
        "2001",
        "Electronic",
    )
    _tags_vorbis(
        root / "Ports of Call" / "United.flac",
        "United",
        "The Polish Ambassador",
        "United",
    )

    return root


def _generate(destino: Path, seconds_value: int) -> None:
    if seconds_value <= 0:
        return
    subprocess.run(
        [
            str(FFMPEG),
            "-y",
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            f"sine=frequency=440:duration={seconds_value}",
            str(destino),
        ],
        check=True,
        capture_output=True,
    )


def _tags_mp3(
    file_path: Path, title_text: str, artist_name: str, album: str, year: str, genre: str
) -> None:
    audio = mutagen.File(file_path)
    audio["TIT2"] = mutagen.id3.TIT2(encoding=3, text=[title_text])
    audio["TPE1"] = mutagen.id3.TPE1(encoding=3, text=[artist_name])
    audio["TALB"] = mutagen.id3.TALB(encoding=3, text=[album])
    audio["TDRC"] = mutagen.id3.TDRC(encoding=3, text=[year])
    audio["TCON"] = mutagen.id3.TCON(encoding=3, text=[genre])
    audio["TRCK"] = mutagen.id3.TRCK(encoding=3, text=["2/14"])
    audio.save()


def _tags_vorbis(file_path: Path, title_text: str, artist_name: str, album: str) -> None:
    """Tags planos, para FLAC / Vorbis / Opus."""
    audio = mutagen.File(file_path)
    audio["title"] = title_text
    audio["artist"] = artist_name
    audio["album"] = album
    audio.save()


# --- descubrimiento ----------------------------------------------------------


def test_extensiones_reconocidas() -> None:
    assert ".mp3" in AUDIO_EXTENSIONS
    assert ".flac" in AUDIO_EXTENSIONS
    assert ".opus" in AUDIO_EXTENSIONS
    assert not is_audio(Path("cancion.txt"))
    assert is_audio(Path("cancion.MP3"))


def test_scan_encuentra_todo_y_ordena(library) -> None:
    paths = scan_paths(library)
    assert len(paths) == 5  # 4 audios + el corrupto, que se descarta al leer
    assert all(file_path.suffix in AUDIO_EXTENSIONS for file_path in paths)
    # Orden por carpeta: la raiz va antes que "Daft Punk", que va antes que
    # "Ports of Call".
    folders = [file_path.parent.name for file_path in paths]
    assert folders[0] == library.name
    assert folders[-1] == "Ports of Call"
    assert folders.index("Daft Punk") < folders.index("Ports of Call")


def test_scan_ignora_no_audio_y_carpetas_vacias(library) -> None:
    paths = scan_paths(library)
    assert not any(file_path.suffix == ".txt" for file_path in paths)
    assert not any("vacia" in str(file_path) for file_path in paths)


def test_scan_de_carpeta_inexistente() -> None:
    assert scan_paths(Path("C:/no/existe/esta/carpeta")) == []


# --- metadatos ---------------------------------------------------------------


@requires_ffmpeg
def test_load_lee_tags_id3(library) -> None:
    track_item = load_track(library / "Daft Punk" / "One More Time.mp3")
    assert track_item is not None
    assert track_item.title == "One More Time"
    assert track_item.artist == "Daft Punk"
    assert track_item.album == "Discovery"
    assert track_item.year == "2001"
    assert track_item.genre == "Electronic"
    assert track_item.track_number == "2/14"
    assert track_item.duration > 1.5
    assert track_item.extension == "mp3"
    assert track_item.size > 0


@requires_ffmpeg
def test_load_lee_tags_flac(library) -> None:
    track_item = load_track(library / "Ports of Call" / "United.flac")
    assert track_item is not None
    assert track_item.title == "United"
    assert track_item.artist == "The Polish Ambassador"
    assert track_item.album == "United"
    assert track_item.extension == "flac"


@requires_ffmpeg
def test_audio_sin_tags_entra_con_el_nombre_del_archivo(library) -> None:
    """Un mp3 valido sin tags debe entrar igual, no desaparecer."""
    track_item = load_track(library / "Daft Punk" / "Discovery" / "Sin Etiquetas.mp3")
    assert track_item is not None
    assert track_item.title == "Sin Etiquetas"
    assert track_item.artist == "Desconocido"
    assert track_item.album == "Desconocido"
    assert track_item.duration > 0


@requires_ffmpeg
def test_archivo_corrupto_se_descarta(library) -> None:
    """`corrupto.mp3` tiene extension de audio pero no es audio."""
    assert load_track(library / "corrupto.mp3") is None


def test_archivo_no_audio_devuelve_none(tmp_path) -> None:
    fake = tmp_path / "falso.mp3"
    fake.write_bytes(b"esto no es un mp3")
    assert load_track(fake) is None


def test_formateo_de_duracion() -> None:
    track_item = Track(path=Path("a.mp3"), title="t", artist="a", album="b", duration=0)
    assert track_item.duration_text == "0:00"
    track_item.duration = 185
    assert track_item.duration_text == "3:05"
    track_item.duration = 3725
    assert track_item.duration_text == "1:02:05"
    track_item.duration = -10
    assert track_item.duration_text == "0:00"


def test_formateo_de_tamano() -> None:
    track_item = Track(path=Path("a.mp3"), title="t", artist="a", album="b", duration=0, size=512)
    assert track_item.size_text == "0 KB"
    track_item.size = 5 * 1024 * 1024
    assert track_item.size_text == "5.0 MB"


def test_detecta_duplicados_con_artista_y_titulo_normalizados() -> None:
    track_items = [
        Track(Path("uno.mp3"), "Halo (Official Audio)", "Beyoncé", "A", 100),
        Track(Path("dos.mp3"), "HALO", "Beyonce", "B", 110),
        Track(Path("sin-artista.mp3"), "Halo", "Desconocido", "A", 100),
        Track(Path("unknown.mp3"), "Halo", "Desconocido", "B", 100),
        Track(Path("sin-titulo.mp3"), "", "Beyonce", "A", 100),
    ]

    assert duplicate_track_paths(track_items) == {Path("uno.mp3"), Path("dos.mp3")}


# --- resumen -----------------------------------------------------------------


def test_summarize_cuenta_artistas_y_albumes(library) -> None:
    track_items = [t for t in (load_track(p) for p in scan_paths(library)) if t]
    summary = summarize(track_items)

    assert summary["pistas"] == 4  # el corrupto queda afuera
    assert summary["artistas"] == 3  # Daft Punk, The Polish Ambassador, Desconocido
    assert summary["albumes"] == 3  # Discovery, United, Desconocido
    assert summary["duracion"] > 0


def test_summarize_de_biblioteca_vacia() -> None:
    assert summarize([]) == {"pistas": 0, "artistas": 0, "albumes": 0, "duracion": 0}


# --- portadas ----------------------------------------------------------------


@requires_ffmpeg
def test_extract_cover_sin_portada_devuelve_none(library, tmp_path) -> None:
    destino = extract_cover(library / "Daft Punk" / "One More Time.mp3", tmp_path / "portadas")
    assert destino is None


@requires_ffmpeg
def test_extract_cover_guarda_la_imagen(tmp_path) -> None:
    """Genera un mp3 con portada embebida y la extrae."""
    if not shutil.which("ffmpeg"):
        pytest.skip("ffmpeg no disponible")

    audio = tmp_path / "con portada.mp3"
    _generate(audio, 1)

    tag = mutagen.File(audio)
    tag["APIC"] = mutagen.id3.APIC(
        encoding=3,
        mime="image/png",
        type=3,
        desc="Cover",
        data=_PNG_MINIMUM,
    )
    tag.save()

    destino = extract_cover(audio, tmp_path / "portadas")
    assert destino is not None
    assert destino.exists()
    assert destino.read_bytes() == _PNG_MINIMUM
    # Segunda llamada reutiliza el archivo, no lo vuelve a escribir.
    assert extract_cover(audio, tmp_path / "portadas") == destino


def test_extract_cover_opus_decodifica_flac_picture_y_renueva_cache(
    tmp_path, monkeypatch
) -> None:
    import base64
    import hashlib
    from types import SimpleNamespace

    from mutagen.flac import Picture

    audio = tmp_path / "tema.opus"
    audio.write_bytes(b"audio simulado")
    picture = Picture()
    picture.type = 3
    picture.mime = "image/png"
    picture.width = 1
    picture.height = 1
    picture.depth = 24
    picture.data = _PNG_MINIMUM
    block = base64.b64encode(picture.write()).decode("ascii")
    monkeypatch.setattr(
        "sakura.core.library.mutagen.File",
        lambda *_args, **_kwargs: SimpleNamespace(
            tags={"metadata_block_picture": [block]}
        ),
    )

    covers = tmp_path / "portadas"
    legacy_key = hashlib.sha1(
        f"{audio}|{audio.stat().st_mtime}".encode()
    ).hexdigest()[:20]
    cache_antigua = covers / f"{legacy_key}.img"
    covers.mkdir()
    cache_antigua.write_bytes(picture.write())

    cover = extract_cover(audio, covers)

    assert cover is not None
    assert cover != cache_antigua
    assert cover.read_bytes() == _PNG_MINIMUM


def test_extract_cover_de_archivo_ilegible(tmp_path) -> None:
    fake = tmp_path / "x.mp3"
    fake.write_bytes(b"basura")
    assert extract_cover(fake, tmp_path / "portadas") is None


# --- duplicados --------------------------------------------------------------


@pytest.mark.parametrize(
    ("crudo", "expected_value"),
    [
        ("AC/DC - T.N.T", "ACDC - T.N.T"),  # la barra no puede ir en un archivo
        ('Say "Hello"', "Say Hello"),
        ("Track<>|*?", "Track"),
        ("Cola ", "Cola"),  # sin espacios al final, Windows los quita
        ("Punto.", "Punto"),
        ("///", "Desconocido"),  # no puede quedar un nombre vacio
    ],
)
def test_sanitize_filename(crudo: str, expected_value: str) -> None:
    assert sanitize_filename(crudo) == expected_value


def test_encuentra_el_archivo_que_ya_existe(tmp_path) -> None:
    (tmp_path / "Daft Punk").mkdir()
    (tmp_path / "Daft Punk" / "One More Time.opus").write_bytes(b"x")

    encontrado = find_existing_download(
        [tmp_path], "Daft Punk", "One More Time", (".opus",)
    )

    assert encontrado == tmp_path / "Daft Punk" / "One More Time.opus"


def test_no_encuentra_una_extension_distinta(tmp_path) -> None:
    (tmp_path / "Daft Punk").mkdir()
    (tmp_path / "Daft Punk" / "One More Time.mp3").write_bytes(b"x")

    assert find_existing_download([tmp_path], "Daft Punk", "One More Time", (".opus",)) is None


def test_busca_tambien_en_carpetas_hermanas(tmp_path) -> None:
    """El uploader puede haberse escrito distinto al que trae la busqueda."""
    (tmp_path / "Daft PunkVEVO").mkdir()
    (tmp_path / "Daft PunkVEVO" / "Get Lucky.opus").write_bytes(b"x")

    encontrado = find_existing_download(
        [tmp_path], "Daft Punk", "Get Lucky", (".opus",)
    )

    assert encontrado is not None
    assert encontrado.name == "Get Lucky.opus"


def test_una_carpeta_inexistente_no_revienta(tmp_path) -> None:
    assert find_existing_download(
        [tmp_path / "no-existe"], "X", "Y", (".opus",)
    ) is None


def test_no_toma_una_carpeta_que_tiene_el_mismo_nombre(tmp_path) -> None:
    """Con el mismo nombre pero otra extension no cuenta como duplicado."""
    (tmp_path / "A").mkdir()
    (tmp_path / "A" / "cancion").mkdir()
    (tmp_path / "A" / "cancion.opus").write_bytes(b"x")

    encontrado = find_existing_download([tmp_path], "A", "cancion", (".mp3",))

    assert encontrado is None


# PNG 1x1 valido, minimo posible para probar la extraccion.
_PNG_MINIMUM = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4"
    "890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)