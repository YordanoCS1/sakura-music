"""Escaneo de la biblioteca local y lectura de metadatos.

Sin Qt: son funciones sobre el sistema de archivos, faciles de testear. La
capa que las corre en un hilo vive en `sakura/ui/services/library.py`.
"""

from __future__ import annotations

import base64
import hashlib
import logging
import re
from dataclasses import dataclass
from fnmatch import fnmatch
from pathlib import Path

import mutagen

from .text import normalize, without_parentesis

logger = logging.getLogger(__name__)

# Extensiones que la app reconoce como pistas. `mutagen.File` solo devuelve un
# objeto para las que sabe leer.
AUDIO_EXTENSIONS: frozenset[str] = frozenset(
    {".mp3", ".m4a", ".m4b", ".aac", ".opus", ".ogg", ".oga", ".flac", ".wav", ".wma"}
)

# Tope de la portada embebida: los PNG de album pueden pesar varios MB y solo
# vamos a mostrar un thumbnail.
MAX_COVER_BYTES = 4 * 1024 * 1024

UNKNOWN = "Desconocido"

# Nombres que se usan para la portada de una carpeta cuando las pistas no traen
# una embebida. Es una convencion extendida de los taggingSCANNERs y de los
# descargadores, y evita ver 200 pistas sin caratula.
FOLDER_COVER_PATTERNS = (
    "folder.*",
    "cover.*",
    "front.*",
    "album.*",
    "albumart.*",
    "artwork.*",
    "thumb.*",
    "wp-content/uploads/*cover*.*",
)

IMAGE_SUFFIXES = (".jpg", ".jpeg", ".png", ".webp", ".bmp")

# Las pistas suelen traer la letra en un `.lrc` con el mismo nombre.
LYRICS_SUFFIXES = (".lrc", ".txt")


@dataclass(slots=True)
class Track:
    """Una pista de la biblioteca local."""

    path: Path
    title: str
    artist: str
    album: str
    duration: float
    year: str = ""
    genre: str = ""
    track_number: str = ""
    size: int = 0
    cover_path: Path | None = None
    lyrics_path: Path | None = None

    @property
    def extension(self) -> str:
        return self.path.suffix.lower().lstrip(".")

    @property
    def number_text(self) -> str:
        """Numero de track sin el total: '3/14' -> '3'."""
        return self.track_number.split("/")[0].strip() if self.track_number else ""

    @property
    def duration_text(self) -> str:
        seconds = max(0, int(self.duration or 0))
        hours, rest = divmod(seconds, 3600)
        minutes, secs = divmod(rest, 60)
        return f"{hours}:{minutes:02d}:{secs:02d}" if hours else f"{minutes}:{secs:02d}"

    @property
    def size_text(self) -> str:
        megabytes = self.size / (1024 * 1024)
        return f"{megabytes:.1f} MB" if megabytes >= 1 else f"{self.size / 1024:.0f} KB"

    @property
    def folder(self) -> Path:
        return self.path.parent

    @property
    def has_lyrics(self) -> bool:
        return self.lyrics_path is not None

    def read_lyrics(self) -> str:
        """Texto de la letra, o cadena vacia."""
        if self.lyrics_path is None:
            return ""
        try:
            # Varios .lrc vienen en UTF-16 o con BOM.
            crudo = self.lyrics_path.read_bytes()
        except OSError:
            return ""

        for codificacion in ("utf-8-sig", "utf-16", "cp1252", "utf-8"):
            try:
                return crudo.decode(codificacion)
            except UnicodeDecodeError:
                continue
        return crudo.decode("utf-8", errors="replace")


# --- portada de carpeta y letras ---------------------------------------------


def find_folder_cover(folder: Path) -> Path | None:
    """Portada de una carpeta: `folder.jpg`, `cover.png`, `front.jpeg`...

    Se buscan en mayusculas y minusculas porque la convencion no es consistente
    entre quien organiza la biblioteca.
    """
    if not folder.is_dir():
        return None

    try:
        entradas = list(folder.iterdir())
    except OSError:
        return None

    for entrada in entradas:
        if not entrada.is_file() or entrada.suffix.lower() not in IMAGE_SUFFIXES:
            continue
        name_text = entrada.name.lower()
        for patron in FOLDER_COVER_PATTERNS:
            if fnmatch(name_text, patron.lower()):
                return entrada

    return None


# El nombre con el que se escribe la portada de una carpeta. `find_folder_cover`
# reconoce este y varios mas; este es el que escribe la app.
FOLDER_COVER_NAME = "folder.jpg"


def write_cover_folder(folder_path: Path, image: bytes) -> Path | None:
    """Escribe `folder.jpg` en `carpeta`. Devuelve la ruta, o None si no pudo.

    No pisa una portada que ya existe: si el usuario puso `cover.png` a mano,
    esa gana. Escribir encima seria perder un archivo que el usuario puso.
    """
    if not folder_path.is_dir():
        return None
    if find_folder_cover(folder_path) is not None:
        return None

    destino = folder_path / FOLDER_COVER_NAME
    try:
        destino.write_bytes(image)
    except OSError:
        return None
    return destino


def folder_covers(
    root: Path, audio_paths: list[Path] | None = None
) -> dict[Path, Path]:
    """Mapa `carpeta -> portada` para todo `root`.

    Se resuelve una vez por escaneo y no por pista: con 200 pistas en la misma
    carpeta, buscar 200 veces el mismo `folder.jpg` es trabajo tirado a la basura.
    `audio_paths` permite reutilizar el resultado de `scan_paths`.
    """
    if not root.is_dir():
        return {}

    mapa: dict[Path, Path] = {}
    for folder_path in _folders_with_audio(root, audio_paths):
        cover = find_folder_cover(folder_path)
        if cover is not None:
            mapa[folder_path] = cover
    return mapa


def lyrics_indexes(
    root: Path, audio_paths: list[Path] | None = None
) -> dict[Path, dict[str, Path]]:
    """Índice de letras por cada carpeta con audio, en una sola pasada."""
    if not root.is_dir():
        return {}

    indices: dict[Path, dict[str, Path]] = {}
    for folder_path in _folders_with_audio(root, audio_paths):
        idx = lyrics_index(folder_path)
        if idx:
            indices[folder_path] = idx
    return indices


def _folders_with_audio(root: Path, audio_paths: list[Path] | None = None):
    """Carpetas que contienen al menos una pista, sin repetir."""
    views: set[Path] = set()
    for file_path in audio_paths if audio_paths is not None else scan_paths(root):
        folder_path = file_path.parent
        if folder_path not in views:
            views.add(folder_path)
            yield folder_path


def lyrics_index(folder: Path) -> dict[str, Path]:
    """Índice `nombre normalizado -> .lrc` de una carpeta.

    El emparejado por nombre exacto no alcanza: los descargadores ponen
    sufijos que a veces están en el audio y a veces solo en la letra
    ("I Want That.m4a" contra "I Want That (Official Audio).lrc").
    """
    if not folder.is_dir():
        return {}

    idx: dict[str, Path] = {}
    try:
        entradas = list(folder.iterdir())
    except OSError:
        return {}

    for entrada in entradas:
        if not entrada.is_file() or entrada.suffix.lower() not in LYRICS_SUFFIXES:
            continue
        key_name = normalize(entrada.stem)
        if not key_name:
            continue
        anterior = idx.get(key_name)
        # El .lrc gana sobre el .txt sin importar el orden en que los devuelva
        # el sistema de archivos.
        if anterior is None or (
            anterior.suffix.lower() != ".lrc" and entrada.suffix.lower() == ".lrc"
        ):
            idx[key_name] = entrada
    return idx


def find_lyrics(path: Path, idx: dict[str, Path] | None = None) -> Path | None:
    """Letra asociada a una pista.

    Con `idx` (el índice que arma el escáner) la búsqueda es en memoria: cada
    `is_file` por pista era una vuelta al disco que, con miles de archivos en
    un disco lento, dominaba el arranque de la biblioteca. Sin índice se prueba
    el nombre exacto y después se arma el de la carpeta.
    """
    key_name = normalize(path.stem)
    clean = normalize(without_parentesis(path.stem))

    if idx is not None:
        return idx.get(key_name) or idx.get(clean)

    for suffix in LYRICS_SUFFIXES:
        exacta = path.with_suffix(suffix)
        try:
            if exacta.is_file():
                return exacta
        except OSError:
            continue

    idx = lyrics_index(path.parent)
    return idx.get(key_name) or idx.get(clean)


def parse_lrc(text_value: str) -> list[tuple[float, str]]:
    """Letra LRC a lista de `(segundos, linea)`, ordenada por tiempo.

    Devuelve lista vacia si no hay marcas de tiempo.
    """
    import re as _re

    mark = _re.compile(r"\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]")
    lines: list[tuple[float, str]] = []

    for line in text_value.splitlines():
        found = mark.findall(line)
        if not found:
            continue
        contenido = mark.sub("", line).strip()
        for mins, seconds_value, centisimas in found:
            total = int(mins) * 60 + int(seconds_value)
            if centisimas:
                # `[mm:ss.xx` con una o dos decimales.
                fraccion = int(centisimas.ljust(2, "0"))
                total += fraccion / 100
            lines.append((total, contenido))

    return sorted(lines, key=lambda par: par[0])


def is_audio(path: Path) -> bool:
    return path.suffix.lower() in AUDIO_EXTENSIONS


def scan_paths(root: Path) -> list[Path]:
    """Rutas de audio bajo `root`, en orden de carpeta y luego de nombre.

    Se usa `rglob` con el filtro de la tupla en vez de `rglob("*")`: evita
    recorrer directorios completos que sabemos que no interesan.
    """
    if not root.is_dir():
        return []

    found: list[Path] = []
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in AUDIO_EXTENSIONS:
            found.append(path)

    return sorted(found, key=lambda p: (str(p.parent).lower(), p.name.lower()))


def load_track(path: Path) -> Track | None:
    """Lee los metadatos de una pista.

    Devuelve None si el archivo no es audio decodificable: `mutagen.File` solo
    devuelve un objeto para formatos que reconoce, asi que un `.mp3` corrupto o
    un archivo con la extension cambiada se descarta en vez de ensuciar la
    biblioteca. Un audio valido *sin* tags si entra, con el nombre del archivo
    como titulo.

    Se usa `easy=True` para que las claves sean iguales en todos los formatos
    (`artist` en ID3, MP4, Vorbis y FLAC) en vez de mapear cada formato.
    """
    try:
        audio = mutagen.File(path, easy=True)
    except Exception as exc:
        logger.warning("No se pudo leer el audio de %s: %s", path, exc)
        return None

    if audio is None:
        return None

    tags = audio.tags or {}
    try:
        size = path.stat().st_size
    except OSError:
        size = 0

    raw_title = _first(tags, "title") or path.stem
    raw_artist = _first(tags, "artist") or _first(tags, "albumartist") or UNKNOWN

    if not _first(tags, "title") or _first(tags, "title") == path.stem:
        from .text import clear_title_y_artist

        clean_title, clean_artist = clear_title_y_artist(
            raw_title, raw_artist if raw_artist != UNKNOWN else ""
        )
        title = clean_title or raw_title
        artist = raw_artist if raw_artist != UNKNOWN else clean_artist
    else:
        title = raw_title
        artist = raw_artist


    return Track(
        path=path,
        title=title,
        artist=artist,
        album=_first(tags, "album") or UNKNOWN,
        duration=float(getattr(audio.info, "length", 0.0) or 0.0),
        year=_first(tags, "date") or "",
        genre=_first(tags, "genre") or "",
        track_number=_first(tags, "tracknumber") or "",
        size=size,
    )



def _first(tags: dict, key: str) -> str:
    value = tags.get(key) if hasattr(tags, "get") else None
    if isinstance(value, list):
        value = value[0] if value else None
    if value is None:
        return ""
    return str(value).strip()


def extract_cover(path: Path, covers_root: Path) -> Path | None:
    """Guarda la portada embebida en `covers_root` y devuelve su ruta.

    La clave del archivo es un hash de ruta + marca de tiempo, asi que si se
    reetiqueta el archivo la portada vieja no se reutiliza.
    """
    try:
        audio = mutagen.File(path)
    except Exception as exc:
        logger.warning("No se pudo extraer la portada de %s: %s", path, exc)
        return None

    data = _cover_bytes(audio)
    if not data or len(data) > MAX_COVER_BYTES:
        return None

    fingerprint = hashlib.sha1(
        f"{path}|{path.stat().st_mtime if path.exists() else 0}|"
        f"{hashlib.sha1(data).hexdigest()}".encode()
    ).hexdigest()[:20]

    destino = covers_root / f"{fingerprint}.img"
    if destino.exists():
        return destino

    destino.parent.mkdir(parents=True, exist_ok=True)
    try:
        destino.write_bytes(data)
    except OSError:
        return None
    return destino


def _cover_bytes(audio) -> bytes | None:
    """Saca los bytes de la portada del objeto de mutagen.

    No hay una API unica: en ID3 (mp3) la imagen es un frame `APIC` y hay que
    pedirlo con `getall`, mientras que MP4, FLAC y Vorbis exponen `.pictures`.
    Opus la trae como bloque `metadata_block_picture` en base64.
    """
    tags = getattr(audio, "tags", None)
    if tags is None:
        return None

    if hasattr(tags, "getall"):
        frames = tags.getall("APIC")
        if frames:
            return frames[0].data

    pictures = getattr(tags, "pictures", None)
    if pictures:
        return pictures[0].data

    block_image = tags.get("metadata_block_picture") if hasattr(tags, "get") else None
    if block_image:
        from mutagen.flac import Picture
        from mutagen.flac import error as FlacPictureError

        text_value = block_image[0] if isinstance(block_image, list) else block_image
        try:
            picture = Picture(base64.b64decode(str(text_value)))
        except (ValueError, TypeError, FlacPictureError):
            pass
        else:
            return picture.data

    coverart = tags.get("coverart") if hasattr(tags, "get") else None
    if coverart:
        text_value = coverart[0] if isinstance(coverart, list) else coverart
        try:
            return base64.b64decode(str(text_value))
        except (ValueError, TypeError):
            pass

    return None


def summarize(tracks: list[Track]) -> dict[str, int]:
    """Cifras para la cabecera de la pagina."""
    artists = {t.artist for t in tracks}
    albums = {t.album for t in tracks}
    seconds_value = sum(t.duration for t in tracks)
    return {
        "pistas": len(tracks),
        "artistas": len(artists),
        "albumes": len(albums),
        "duracion": seconds_value,
    }


def duplicate_track_paths(tracks: list[Track]) -> set[Path]:
    """Rutas de pistas con artista y titulo repetidos tras normalizarlos."""
    groups: dict[tuple[str, str], list[Track]] = {}
    for track in tracks:
        artist = normalize(track.artist)
        title = normalize(track.title)
        if artist and artist != normalize(UNKNOWN) and title:
            groups.setdefault((artist, title), []).append(track)

    return {
        track.path
        for group in groups.values()
        if len(group) > 1
        for track in group
    }


# --- duplicados --------------------------------------------------------------

# Caracteres que yt-dlp saca del nombre al escribir en disco. Si no se limpian
# igual, el archivo guardado no se llama como el titulo y el duplicado no aparece.
_ILEGAL = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def sanitize_filename(name_text: str) -> str:
    """Deja el nombre como lo escribiría yt-dlp en Windows."""
    clean = _ILEGAL.sub("", name_text).strip().rstrip(". ")
    return clean or "Desconocido"


def find_existing_download(
    roots: list[Path], artist_name: str, title_text: str, extensions: tuple[str, ...]
) -> Path | None:
    """El archivo de esa pista que ya está en `roots`, o None si no está.

    Se busca primero en la carpeta del artista, que es donde cae según
    `OUTPUT_TEMPLATE`, y después en las carpetas hermanas de primer nivel.
    """
    name_text = sanitize_filename(title_text).casefold()
    folder_artist = sanitize_filename(artist_name)

    for root in roots:
        if not root or not root.is_dir():
            continue

        # Primero la carpeta del artista y despues las hermanas de primer nivel,
        # por si el uploader se escribio con otro nombre.
        candidates = [root / folder_artist, *root.iterdir()]
        for folder_path in candidates:
            if not folder_path.is_dir():
                continue
            try:
                entradas = list(folder_path.iterdir())
            except OSError:
                continue
            for entrada in entradas:
                if entrada.stem.casefold() != name_text:
                    continue
                if entrada.suffix.lower() in extensions:
                    return entrada

    return None