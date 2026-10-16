"""Parseo de la salida de yt-dlp y construccion de comandos."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from sakura.core.formats import AudioFormat
from sakura.core.models import JobStatus, SearchResult
from sakura.core.tools import (
    OUTPUT_TEMPLATE,
    PROGRESS_MARKER,
    build_download_command,
    build_playlist_info_command,
    build_search_command,
    ffmpeg_location,
    friendly_error,
    parse_progress_line,
    parse_search_line,
    playlist_output_template,
)

SAMPLE = {
    "id": "abc123",
    "title": "Daft Punk - Get Lucky",
    "webpage_url": "https://www.youtube.com/watch?v=abc123",
    "channel": "Daft Punk",
    "duration": 249,
    "view_count": 879101277,
    "thumbnails": [
        {"url": "http://x/small.jpg", "width": 120, "height": 90},
        {"url": "http://x/big.jpg", "width": 1280, "height": 720},
    ],
}


# --- busqueda ----------------------------------------------------------------


def test_parse_search_line_deserializa() -> None:
    result = parse_search_line(json.dumps(SAMPLE))
    assert result is not None
    assert result.id == "abc123"
    assert result.uploader == "Daft Punk"
    assert result.duration_text == "4:09"


def test_parse_search_line_elige_la_thumbnail_mayor() -> None:
    result = parse_search_line(json.dumps(SAMPLE))
    assert result is not None
    assert result.thumbnail == "http://x/big.jpg"


def test_parse_search_line_ignora_ruido() -> None:
    assert parse_search_line("[youtube] Extracting URL") is None
    assert parse_search_line("") is None
    assert parse_search_line("{no es json") is None


def test_parse_search_line_sin_url_devuelve_none() -> None:
    assert parse_search_line(json.dumps({"title": "sin url"})) is None


def test_search_result_usa_url_de_respaldo() -> None:
    payload = {"id": "x", "title": "t", "url": "https://youtu.be/x"}
    result = parse_search_line(json.dumps(payload))
    assert result is not None
    assert result.url == "https://youtu.be/x"
    assert result.uploader == "Desconocido"


def test_build_search_command_usa_ytsearch() -> None:
    command = build_search_command("daft punk", limit=5)
    assert "ytsearch5:daft punk" in command
    assert "--dump-json" in command
    assert "--flat-playlist" in command


def test_comandos_yt_dlp_usan_cookies_del_navegador_configurado(monkeypatch) -> None:
    monkeypatch.setattr(
        "sakura.core.tools.load_settings",
        lambda: {"youtube_cookies_browser": "edge"},
    )
    commands = (
        build_search_command("daft punk"),
        build_playlist_info_command("https://youtube.com/playlist?list=PL1"),
        build_download_command("https://youtu.be/x", Path("C:/tmp/out")),
    )
    for command in commands:
        index = command.index("--cookies-from-browser")
        assert command[index + 1] == "edge"


def test_comandos_yt_dlp_no_usan_cookies_por_defecto() -> None:
    assert "--cookies-from-browser" not in build_search_command("daft punk")
    assert "--cookies-from-browser" not in build_playlist_info_command("https://youtube.com/playlist?list=PL1")


@pytest.mark.parametrize(
    ("title", "expected"),
    [
        ("Mi playlist", "Mi playlist/%(title)s.%(ext)s"),
        ("../CON: 100%", "_CON_ 100_/%(title)s.%(ext)s"),
        ("  ", "Playlist/%(title)s.%(ext)s"),
        ("NUL", "_NUL/%(title)s.%(ext)s"),
    ],
)
def test_plantilla_de_playlist_usa_un_nombre_de_carpeta_seguro(title, expected) -> None:
    assert playlist_output_template(title) == expected


def test_comando_de_actualizacion_usa_pip_para_yt_dlp() -> None:
    import sys

    from sakura.core.tools import build_ytdlp_update_command

    assert build_ytdlp_update_command() == [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--upgrade",
        "yt-dlp",
    ]


def test_comando_de_actualizacion_de_ffmpeg_usa_winget_en_windows(monkeypatch) -> None:
    from sakura.core.tools import build_ffmpeg_update_command

    monkeypatch.setattr("sakura.core.tools.os.name", "nt")
    command = build_ffmpeg_update_command()
    assert command[:5] == ["winget", "upgrade", "--id", "Gyan.FFmpeg.Shared", "--exact"]


# --- progreso ---------------------------------------------------------------


def test_parse_progress_line() -> None:
    line = f"{PROGRESS_MARKER}|downloading|1048576|10485760|NA|5242880.5"
    update = parse_progress_line(line)
    assert update is not None
    assert update.status == "downloading"
    assert update.downloaded == 1048576
    assert update.total == 10485760
    assert update.speed == "5242880.5"


def test_parse_progress_usa_el_estimate_cuando_falta_el_total() -> None:
    line = f"{PROGRESS_MARKER}|downloading|100|NA|500|NA"
    update = parse_progress_line(line)
    assert update is not None
    assert update.total == 500


def test_parse_progress_ignora_NA_en_velocidad() -> None:
    line = f"{PROGRESS_MARKER}|finished|100|100|NA|NA"
    update = parse_progress_line(line)
    assert update is not None
    assert update.speed == ""


def test_parse_progress_ignora_lineas_corrientes() -> None:
    assert parse_progress_line("[download] 100% of 9.73MiB") is None
    assert parse_progress_line("") is None
    assert parse_progress_line(f"{PROGRESS_MARKER}|roto") is None


# --- comandos de descarga ----------------------------------------------------


def test_build_download_separa_ruta_de_plantilla() -> None:
    command = build_download_command("https://youtu.be/x", Path("C:/tmp/out"))

    paths = command[command.index("--paths") + 1]
    template = command[command.index("--output") + 1]
    # Windows normaliza las barras al construir el Path.
    assert paths.replace("\\", "/") == "C:/tmp/out"
    assert template == OUTPUT_TEMPLATE
    # La URL va al final, tras "--", para que no se confunda con una opcion.
    assert command[-2] == "--"
    assert command[-1] == "https://youtu.be/x"


def test_build_download_pide_el_formato_pedido() -> None:
    fmt = AudioFormat("mp3", "mp3 · 320 kbps", "mp3", "320K")
    command = build_download_command("https://youtu.be/x", Path("C:/tmp/out"), fmt)
    assert command[command.index("--audio-format") + 1] == "mp3"
    assert command[command.index("--audio-quality") + 1] == "320K"


def test_opus_no_pasa_audio_quality() -> None:
    """Opus se remuxea; mandarle un bitrate se ignora y confunde."""
    command = build_download_command(
        "https://youtu.be/x", Path("C:/tmp/out"), AudioFormat("opus", "opus", "opus", None)
    )
    assert command[command.index("--audio-format") + 1] == "opus"
    assert "--audio-quality" not in command


def test_build_download_video_usa_merge_output_format() -> None:
    fmt = AudioFormat("mp4_1080p", "Video 1080p", "mp4", None, is_video=True, height=1080)
    command = build_download_command("https://youtu.be/x", Path("C:/tmp/out"), fmt)
    assert "--merge-output-format" in command
    assert command[command.index("--merge-output-format") + 1] == "mp4"
    assert "-x" not in command
    assert "--audio-format" not in command
    assert "-f" in command
    format_arg = command[command.index("-f") + 1]
    assert "height<=1080" in format_arg


def test_build_download_video_best_calidad() -> None:
    fmt = AudioFormat("mp4_best", "Video Best", "mp4", None, is_video=True, height=None)
    command = build_download_command("https://youtu.be/x", Path("C:/tmp/out"), fmt)
    assert "--merge-output-format" in command
    assert "-f" in command



def test_build_download_pasa_carpeta_de_ffmpeg() -> None:
    command = build_download_command("https://youtu.be/x", Path("C:/tmp/out"))
    location = command[command.index("--ffmpeg-location") + 1]
    # Debe ser la carpeta, no el ejecutable: si no, yt-dlp no encuentra ffprobe.
    assert Path(location).is_dir()
    assert not Path(location).suffix


def test_ffmpeg_location_existe() -> None:
    assert Path(ffmpeg_location()).is_dir()


# --- errores -----------------------------------------------------------------


@pytest.mark.parametrize(
    ("raw", "expected_value"),
    [
        ("ERROR: Private video. Sign in", "El video es privado"),
        ("ERROR: Video unavailable", "El video no esta disponible"),
        ("ERROR: members-only content", "El video es solo para miembros"),
        ("ERROR: something rare happened", "something rare happened"),
    ],
)
def test_friendly_error(raw: str, expected_value: str) -> None:
    assert friendly_error(raw) == expected_value


def test_friendly_error_vacio() -> None:
    assert friendly_error("") == "Error desconocido"


# --- modelos -----------------------------------------------------------------


def test_progress_percent_indeterminado() -> None:
    from sakura.core.models import DownloadJob

    job = DownloadJob(result=SearchResult(id="1", title="t", url="u"))
    assert job.is_indeterminate
    assert job.progress_percent == -1

    job.total_bytes = 100
    job.downloaded_bytes = 25
    assert job.progress_percent == 25


def test_estados_activos_y_terminados() -> None:
    assert JobStatus.DOWNLOADING.is_active
    assert JobStatus.CONVERTING.is_active
    assert JobStatus.DONE.is_finished
    assert JobStatus.FAILED.is_finished
    assert not JobStatus.PENDING.is_finished