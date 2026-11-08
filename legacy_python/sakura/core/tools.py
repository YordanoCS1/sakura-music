"""Construccion de comandos yt-dlp y parseo de su salida.

Sin Qt: todo son funciones puras sobre texto, faciles de testear. La capa que
si necesita Qt (procesos y senales) vive en `sakura/ui/services/`.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from ..config import OUTPUT_TEMPLATE, PLAYLIST_TEMPLATE, load_settings
from .formats import AudioFormat, get_default
from .models import SearchResult

# Prefijo de las lineas de progreso que pedimos a yt-dlp. Evita depender del
# formato humano, que cambia entre versiones.
PROGRESS_MARKER = "sakuradl"
PROGRESS_TEMPLATE = (
    f"{PROGRESS_MARKER}|%(progress.status)s|%(progress.downloaded_bytes)s|"
    "%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s"
)

# Errores de yt-dlp que normalmente no son culpa del usuario.
_FRIENDLY_ERRORS = {
    "Private video": "El video es privado",
    "Video unavailable": "El video no esta disponible",
    "Sign in to confirm your age": "El video tiene restriccion de edad",
    "members-only": "El video es solo para miembros",
    "copyright": "El video tiene copyright",
    "This video is not available": "El video no esta disponible",
}


class ToolMissing(RuntimeError):
    """Falta una dependencia externa (ffmpeg, yt-dlp)."""


YOUTUBE_COOKIE_BROWSERS = frozenset({"brave", "chrome", "edge", "firefox", "vivaldi"})


def ytdlp_command() -> list[str]:
    """Comando base para invocar yt-dlp.

    Se usa el modulo instalado con pip, asi no hace falta un binario aparte.
    """
    return [sys.executable, "-m", "yt_dlp"]


def cookies_navegador() -> str:
    """Navegador del que se toman cookies, o "" si no se usan.

    No lanza por un valor guardado invalido: devuelve "" y asi la app arranca en
    vez de morir al construir el primer comando.
    """
    browser = str(load_settings().get("youtube_cookies_browser") or "").strip().lower()
    return browser if browser in YOUTUBE_COOKIE_BROWSERS else ""


def _youtube_cookie_arguments() -> list[str]:
    browser = cookies_navegador()
    if not browser:
        return []
    return ["--cookies-from-browser", browser]


def playlist_output_template(playlist_title: str) -> str:
    """Usa el nombre de playlist conocido al encolar cada video por separado."""
    folder = re.sub(r'[<>:"/\\|?*\x00-\x1f%]', "_", playlist_title).strip(" .")
    folder = folder[:120].rstrip(" .")
    if not folder or folder in {".", ".."}:
        folder = "Playlist"
    if re.fullmatch(r"(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])", folder, re.IGNORECASE):
        folder = f"_{folder}"
    return PLAYLIST_TEMPLATE.replace("%(playlist_title)s", folder)


def find_ffmpeg() -> str | None:
    """Localiza ffmpeg en el PATH o en la carpeta local de la app."""
    local = _local_tool("ffmpeg.exe" if os.name == "nt" else "ffmpeg")
    if local:
        return local
    return shutil.which("ffmpeg")


def find_ffprobe() -> str | None:
    local = _local_tool("ffprobe.exe" if os.name == "nt" else "ffprobe")
    if local:
        return local
    return shutil.which("ffprobe")


def _local_tool(name: str) -> str | None:
    candidate = Path(os.environ.get("LOCALAPPDATA", ".")) / "SakuraMusic" / "bin" / name
    return str(candidate) if candidate.exists() else None


def require_ffmpeg() -> str:
    ffmpeg = find_ffmpeg()
    if not ffmpeg:
        raise ToolMissing(
            "ffmpeg no está instalado. Se necesita para convertir el audio a mp3."
        )
    return ffmpeg


def ffmpeg_location() -> str:
    """Carpeta que contiene ffmpeg y ffprobe.

    Hay que pasar el directorio, no la ruta de `ffmpeg.exe`: yt-dlp busca a
    `ffprobe` en el PATH salvo que se le indique la carpeta donde vive el binario,
    y en instalaciones winget `ffprobe` suele no estar en el PATH.
    """
    return str(Path(require_ffmpeg()).parent)


def build_ytdlp_update_command() -> list[str]:
    """Actualiza yt-dlp en el mismo entorno de Python que ejecuta Sakura."""
    return [sys.executable, "-m", "pip", "install", "--upgrade", "yt-dlp"]


def build_ffmpeg_update_command() -> list[str]:
    """Actualiza la instalación de FFmpeg administrada por winget en Windows."""
    if os.name != "nt":
        raise ToolMissing("La actualización automática de FFmpeg requiere Windows y winget.")
    return [
        "winget",
        "upgrade",
        "--id",
        "Gyan.FFmpeg.Shared",
        "--exact",
        "--source",
        "winget",
        "--accept-source-agreements",
        "--accept-package-agreements",
        "--disable-interactivity",
    ]


# --- construccion de comandos ------------------------------------------------


def is_playlist_url(text: str) -> bool:
    """Devuelve True si `text` parece ser una URL de playlist de YouTube.

    Detecta:
      - https://www.youtube.com/playlist?list=PL...
      - https://www.youtube.com/watch?v=xxx&list=PL...
      - https://music.youtube.com/playlist?list=PL...
    """
    t = text.strip()
    if not t.startswith(("http://", "https://")):
        return False
    return (
        "youtube.com/playlist" in t
        or "music.youtube.com/playlist" in t
        or ("youtube.com" in t and "list=" in t)
    )


def build_playlist_info_command(url: str) -> list[str]:
    """Enumera los videos de una playlist sin descargar nada.

    `--flat-playlist --dump-json` hace que yt-dlp emita un JSON por video
    con id, title, url, duration y thumbnail, que `parse_search_line` ya sabe leer.
    """
    return [
        *ytdlp_command(),
        "--ignore-config",
        *_youtube_cookie_arguments(),
        "--no-warnings",
        "--flat-playlist",
        "--dump-json",
        "--",
        url,
    ]


def build_search_command(query: str, limit: int = 20) -> list[str]:
    """Busqueda en YouTube: un JSON por linea, rapido de parsear."""
    return [
        *ytdlp_command(),
        "--ignore-config",
        *_youtube_cookie_arguments(),
        "--no-warnings",
        "--flat-playlist",
        "--dump-json",
        f"ytsearch{max(1, limit)}:{query}",
    ]


def build_download_command(
    url: str,
    output_dir: Path,
    audio_format: AudioFormat | None = None,
    output_template: str | None = None,
) -> list[str]:
    """Descarga el audio o video en el formato pedido.

    `-P` fija la ruta base y `-o` la plantilla de nombre; confundirlos hace que
    yt-dlp intente escribir un archivo llamado como el directorio destino.

    `output_template` permite agrupar una playlist en una sola carpeta en vez de
    una por artista.
    """
    fmt = audio_format or get_default()
    ffmpeg = ffmpeg_location()

    if fmt.is_video:
        if fmt.height:
            format_selector = (
                f"bestvideo[height<={fmt.height}][ext=mp4]+bestaudio[ext=m4a]/"
                f"bestvideo[height<={fmt.height}]+bestaudio/"
                f"best[height<={fmt.height}]/best"
            )
        else:
            format_selector = (
                "bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best"
            )

        command = [
            *ytdlp_command(),
            "--ignore-config",
            *_youtube_cookie_arguments(),
            "--no-warnings",
            "--newline",
            "--no-playlist",
            "--progress-template",
            PROGRESS_TEMPLATE,
            "--ffmpeg-location",
            ffmpeg,
            "-f",
            format_selector,
            "--merge-output-format",
            "mp4",
        ]
    else:
        command = [
            *ytdlp_command(),
            "--ignore-config",
            *_youtube_cookie_arguments(),
            "--no-warnings",
            "--newline",
            "--no-playlist",
            "--progress-template",
            PROGRESS_TEMPLATE,
            "--ffmpeg-location",
            ffmpeg,
            "-x",
            "--audio-format",
            fmt.extension,
        ]

        # Opus se remuxea: pasarle un bitrate lo ignora y solo confunde.
        if fmt.transcodes:
            command += ["--audio-quality", fmt.quality]

    command += [
        # Los reintentos los lleva la app, para que el usuario los vea en la
        # cola. Acá solo se acota el comportamiento interno de yt-dlp, que si
        # no reintenta solo y se come el fallo.
        "--retries",
        "2",
        "--fragment-retries",
        "2",
        "--retry-sleep",
        "linear=1::3",
        "--paths",
        str(output_dir),
        "--output",
        output_template or OUTPUT_TEMPLATE,
        "--",
        url,
    ]
    return command



def spawn_kwargs() -> dict:
    """Argumentos de `subprocess` que evitan abrir una consola en Windows."""
    startupinfo = None
    if os.name == "nt":
        startupinfo = subprocess.STARTUPINFO()
        startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW
        startupinfo.wShowWindow = subprocess.SW_HIDE

    return {
        "startupinfo": startupinfo,
        "creationflags": getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0,
    }


# --- parseo de salida --------------------------------------------------------


def parse_search_line(line: str) -> SearchResult | None:
    """Convierte una linea JSON de busqueda en `SearchResult`.

    Devuelve None si la linea no es un resultado valido, para poder seguir
    consumiendo el stream sin cortar.
    """
    line = line.strip()
    if not line.startswith("{"):
        return None
    try:
        return SearchResult.from_json(json.loads(line))
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


# --- entradas que no se pueden descargar --------------------------------------

# `availability` es el campo con el que yt-dlp marca el acceso a un video. Los
# que no son "public"/"unlisted" no se pueden bajar.
NO_DESCARGABLE = frozenset(
    {
        "private",
        "needs_auth",
        "subscriber_only",
        "premium_only",
        "geo_restricted",
        "premium_only_noprogress",
    }
)

# yt-dlp lista los videos privados y eliminados con el titulo entre corchetes y
# sin url jugable, asi que el titulo es la unica pista.
TITLES_HIDDEN = {
    "[private video]": "private",
    "[deleted video]": "deleted",
    "[unavailable video]": "deleted",
}


def hidden_reason(data: dict) -> str | None:
    """Motivo por el que una entrada de playlist no se puede descargar.

    Devuelve la clave del motivo, o None si la entrada es jugable. Antes estas
    entradas se descartaban en silencio y el usuario no se enteraba de que
    faltaban.
    """
    disponibilidad = str(data.get("availability") or "").strip().lower()
    if disponibilidad in NO_DESCARGABLE:
        return disponibilidad

    title_text = str(data.get("title") or "").strip().lower()
    if title_text in TITLES_HIDDEN:
        return TITLES_HIDDEN[title_text]

    # Sin url no hay nada que descargar, aunque el titulo parezca normal.
    if not (data.get("webpage_url") or data.get("url")):
        return "sin_url"

    return None


REASON_LABELS = {
    "private": "privados",
    "deleted": "eliminados",
    "needs_auth": "con restricción de edad",
    "subscriber_only": "solo para suscriptores",
    "premium_only": "solo para YouTube Premium",
    "geo_restricted": "bloqueados en tu región",
    "sin_url": "sin enlace",
}


def summarize_hidden(hidden: dict[str, int]) -> str:
    """'2 privados, 1 eliminado' para mostrar junto al total de la playlist."""
    chunks = []
    for reason, count in hidden.items():
        tag = REASON_LABELS.get(reason, reason.replace("_", " "))
        chunks.append(f"{count} {tag}")
    return ", ".join(chunks)


class ProgressUpdate:
    """Progreso de descarga parseado desde una linea de yt-dlp."""

    __slots__ = ("downloaded", "speed", "status", "total")

    def __init__(self, status: str, downloaded: int, total: int, speed: str):
        self.status = status
        self.downloaded = downloaded
        self.total = total
        self.speed = speed

    def __repr__(self) -> str:
        return (
            f"ProgressUpdate(status={self.status!r}, downloaded={self.downloaded}, "
            f"total={self.total}, speed={self.speed!r})"
        )


def parse_progress_line(line: str) -> ProgressUpdate | None:
    """Parsea una linea emitida con `PROGRESS_TEMPLATE`.

    Devuelve None para las lineas de yt-dlp que no son de progreso.
    """
    line = line.strip()
    if not line.startswith(f"{PROGRESS_MARKER}|"):
        return None

    parts = line.split("|")
    if len(parts) < 6:
        return None

    _, status, downloaded, total, estimate, speed = parts[:6]
    return ProgressUpdate(
        status=status,
        downloaded=_to_int(downloaded),
        total=_to_int(total) or _to_int(estimate),
        speed=_clean_speed(speed),
    )


def _to_int(value: str) -> int:
    try:
        return int(float(value))
    except (TypeError, ValueError):
        return 0


def _clean_speed(value: str) -> str:
    """yt-dlp usa 'NA' y 'None' para indicar que no hay valor."""
    return "" if value in ("NA", "None", "") else value


def friendly_error(raw: str) -> str:
    """Traduce los errores mas comunes de yt-dlp a un mensaje en espanol."""
    text = raw.strip()
    for needle, message in _FRIENDLY_ERRORS.items():
        if needle.lower() in text.lower():
            return message
    # yt-dlp antepone "ERROR:" a sus mensajes.
    if text.upper().startswith("ERROR:"):
        text = text[6:].strip()
    return text or "Error desconocido"