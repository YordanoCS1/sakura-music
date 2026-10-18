"""Rutas y constantes de la aplicacion."""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

APP_NAME = "Sakura Music"
APP_SLUG = "SakuraMusic"
ORG_NAME = "SakuraMusic"

# Plantilla de salida. Se organiza por canal para no apilar todo en la raiz.
OUTPUT_TEMPLATE = "%(uploader,Unknown Artist)s/%(title)s.%(ext)s"

# Al bajar una playlist, todo junto en una carpeta con el nombre de la playlist.
# Si se usara la plantilla de arriba, una playlist de 30 temas de 12 artistas
# quedaria dispersa en 12 carpetas y seria imposible de encontrar.
PLAYLIST_TEMPLATE = "%(playlist_title)s/%(title)s.%(ext)s"

DEFAULTS: dict[str, object] = {
    "audio_format": "opus",
    "volume": 80,
    "library_folder": "",
    "downloads_folder": "",
    "youtube_cookies_browser": "",
    # Descargas simultaneas. El tope real lo decide `DownloadManager`, que lo
    # baja a uno solo si se usan cookies del navegador.
    "max_concurrent_downloads": 2,
    # Escribir la portada del álbum como `folder.jpg` en su carpeta.
    "write_folder_cover": True,
    "theme": "modern",
    "library_view": "table",
    "nav_layout": "sidebar",
    # PNG con los que el usuario reemplaza iconos de la UI, por nombre de icono.
    # Cada valor es {"path": ruta del PNG, "tint": si se tiñe con el tema}.
    "icon_overrides": {},
}



def _physical_path(path: Path) -> str:
    """Ruta fisica real de `path`, resolviendo la redireccion de Windows.

    La build de Microsoft Store de Python corre en un sandbox que redirige las
    escrituras dentro de `%LOCALAPPDATA%` hacia `AppData/Local/VirtualStore`.
    ffmpeg y ffprobe no estan sandboxed, asi que ven la ruta real y no
    encuentran los archivos que escribe Python. Comparar la ruta fisica con la
    logica delata esa situacion.
    """
    if sys.platform != "win32":
        return str(path)

    import ctypes  # import local: solo aplica en Windows

    GENERIC_READ = 0x80000000
    FILE_SHARE_ALL = 0x07
    OPEN_EXISTING = 3
    FILE_ATTRIBUTE_NORMAL = 0x80

    kernel32 = ctypes.windll.kernel32
    handle = kernel32.CreateFileW(
        str(path),
        GENERIC_READ,
        FILE_SHARE_ALL,
        None,
        OPEN_EXISTING,
        FILE_ATTRIBUTE_NORMAL,
        None,
    )
    invalid = ctypes.c_void_p(-1).value
    if handle in (None, 0, invalid):
        return str(path)

    try:
        buffer = ctypes.create_unicode_buffer(32768)
        length = kernel32.GetFinalPathNameByHandleW(handle, buffer, len(buffer), 0)
    finally:
        kernel32.CloseHandle(handle)

    if not length:
        return str(path)

    real = buffer.value
    if real.startswith("\\\\?\\"):
        real = real[4:]
    return real


def _is_shared_with_external_tools(path: Path) -> bool:
    """True si `path` se ve igual desde Python y desde un proceso externo."""
    path.mkdir(parents=True, exist_ok=True)
    probe = path / ".sonda"
    try:
        probe.write_bytes(b"ok")
    except OSError:
        return False
    try:
        physical = _physical_path(probe).replace("/", "\\").lower()
        expected = str(probe).replace("/", "\\").lower()
        return physical == expected
    finally:
        probe.unlink(missing_ok=True)


_base_dir: Path | None = None


def base_dir() -> Path:
    """Carpeta base de datos de la app, visible para ffmpeg y ffprobe.

    Se cae al perfil del usuario cuando `%LOCALAPPDATA%` esta redirigido.
    """
    global _base_dir
    if _base_dir is not None:
        return _base_dir

    candidates: list[Path] = []
    local_appdata = os.environ.get("LOCALAPPDATA")
    if local_appdata:
        candidates.append(Path(local_appdata) / APP_SLUG)
    profile = os.environ.get("USERPROFILE")
    if profile:
        candidates.append(Path(profile) / APP_SLUG)

    for candidate in candidates:
        if _is_shared_with_external_tools(candidate):
            _base_dir = candidate
            return _base_dir

    _base_dir = Path(tempfile.gettempdir()) / APP_SLUG
    return _base_dir


def data_dir() -> Path:
    """Carpeta de datos de la app (config, logs, cache)."""
    path = base_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def music_dir() -> Path:
    """Carpeta base por defecto para la musica."""
    path = data_dir() / "Musica"
    path.mkdir(parents=True, exist_ok=True)
    return path


def library_dir() -> Path:
    """Carpeta donde vive la biblioteca del usuario (configurada o por defecto)."""
    custom = load_settings().get("library_folder")
    path = Path(str(custom)) if custom else music_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path


def downloads_target_dir() -> Path:
    """Carpeta destino donde se mueven las descargas terminadas."""
    settings = load_settings()
    custom = settings.get("downloads_folder") or settings.get("library_folder")
    path = Path(str(custom)) if custom else music_dir()
    path.mkdir(parents=True, exist_ok=True)
    return path



def downloads_dir() -> Path:
    """Carpeta de descargas en curso (staging temporal)."""
    path = data_dir() / "Descargas"
    path.mkdir(parents=True, exist_ok=True)
    return path



def covers_dir() -> Path:
    """Cache de portadas descargadas."""
    path = data_dir() / "Portadas"
    path.mkdir(parents=True, exist_ok=True)
    return path


def icons_dir() -> Path:
    """Copia estable de los PNG elegidos en Ajustes.

    Se guarda acá en vez de apuntar al archivo original: si el usuario mueve o
    borra su PNG, la personalización no se rompe.
    """
    path = data_dir() / "Iconos"
    path.mkdir(parents=True, exist_ok=True)
    return path


def config_file() -> Path:
    return data_dir() / "config.json"


def download_queue_file() -> Path:
    return data_dir() / "download_queue.json"


def tag_history_dir() -> Path:
    """Manifiestos de cambios de tags, para deshacer un lote."""
    path = data_dir() / "Historial"
    path.mkdir(parents=True, exist_ok=True)
    return path


def load_settings() -> dict:
    """Ajustes guardados, mezclados con los valores por defecto.

    Un JSON corrupto no debe impedir arrancar la app: se ignora y se usan los
    defaults.
    """
    import json

    data = dict(DEFAULTS)
    path = config_file()
    if path.exists():
        try:
            stored = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(stored, dict):
                data.update({k: v for k, v in stored.items() if k in DEFAULTS})
        except (OSError, ValueError):
            pass
    return data


def save_settings(settings: dict) -> None:
    """Guarda solo las claves conocidas, de forma atomica."""
    import json

    data = load_settings()
    data.update({k: v for k, v in settings.items() if k in DEFAULTS})
    path = config_file()
    temporary = path.with_suffix(".tmp")
    temporary.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    temporary.replace(path)


def logs_dir() -> Path:
    path = data_dir() / "Logs"
    path.mkdir(parents=True, exist_ok=True)
    return path