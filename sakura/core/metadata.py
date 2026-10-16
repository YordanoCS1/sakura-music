"""Lectura y escritura de tags y portadas.

`mutagen` expone tres capas distintas segun el formato, y confundirlas es la
trampa clasica:

- `mutagen.File(path, easy=True)` -> claves planas (`title`, `artist`) iguais
  para todos los formatos. Es lo que se usa para los tags de texto.
- `mutagen.File(path)` -> el objeto nativo (ID3, MP4, FLAC, OggOpus). La
  portada vive aca y cambia de API segun el formato: frame `APIC` en ID3,
  `covr` en MP4, `pictures` en FLAC y bloque `metadata_block_picture` en Opus.

Por eso la portada se busca y se escribe siempre sobre el objeto nativo, nunca
sobre el "easy".
"""

from __future__ import annotations

import base64
import logging
from dataclasses import dataclass
from pathlib import Path

import mutagen
from mutagen import id3

from .library import MAX_COVER_BYTES, UNKNOWN

logger = logging.getLogger(__name__)

# Formatos cuya escritura de portada es soportada.
COVER_FORMATS = frozenset({".mp3", ".m4a", ".m4b", ".flac", ".opus", ".ogg", ".oga"})

IMAGE_MIME = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".bmp": "image/bmp",
}

# Campo de `TrackTags` -> clave "easy" de mutagen. El nombre de la clave no
# siempre coincide con el del campo (`year` es `date` en los tags planos).
#
# `comment` queda fuera a proposito: EasyID3 no lo acepta como clave escribible
# ("'comment' is not a valid key"), habria que hacerlo frame por frame y con
# una API distinta en cada formato.
TEXT_FIELDS = {
    "title": "title",
    "artist": "artist",
    "album": "album",
    "albumartist": "albumartist",
    "year": "date",
    "genre": "genre",
    "track_number": "tracknumber",
}


class MetadataError(Exception):
    """No se pudo leer o escribir el archivo."""


@dataclass(slots=True)
class TrackTags:
    """Tags de texto de una pista, tal como se ven en el editor."""

    title: str = ""
    artist: str = ""
    album: str = ""
    albumartist: str = ""
    year: str = ""
    genre: str = ""
    track_number: str = ""

    def as_text_mapping(self) -> dict[str, str]:
        """Campo -> valor, solo los que tienen contenido."""
        return {
            field_name: getattr(self, field_name)
            for field_name in TEXT_FIELDS
            if getattr(self, field_name)
        }

    def is_empty(self) -> bool:
        return not any(getattr(self, field_name) for field_name in TEXT_FIELDS)


# --- lectura -----------------------------------------------------------------


def read_tags(path: Path) -> TrackTags:
    """Lee los tags de texto. Si el formato no soporta la capa "easy", vacio."""
    audio = _open_easy(path)
    if audio is None:
        raise MetadataError("No se pudo leer el archivo")

    tags = audio.tags
    return TrackTags(
        **{
            field_name: _first(tags, key_name)
            for field_name, key_name in TEXT_FIELDS.items()
        }
    )


def read_cover(path: Path) -> bytes | None:
    """Bytes de la portada embebida, o None si no hay."""
    audio = _open_native(path)
    if audio is None:
        return None
    return _cover_bytes(audio)


# --- escritura de texto ------------------------------------------------------


def write_tags(path: Path, tags: TrackTags) -> None:
    """Escribe los tags de texto.

    Los campos vacios se borran en vez de quedar con string vacio, que es como
    Word/MP3Tag los guardan y ensucian el archivo.
    """
    audio = _open_easy(path)
    if audio is None:
        raise MetadataError("No se pudo abrir el archivo para escribir")

    try:
        for field_name, key_name in TEXT_FIELDS.items():
            value = getattr(tags, field_name)
            if key_name in audio:
                del audio[key_name]
            if value:
                audio[key_name] = value
        audio.save()
    except Exception as exc:
        raise MetadataError(f"No se pudieron escribir los tags: {exc}") from exc


def update_text_tags(path: Path, **changes: str) -> TrackTags:
    """Lee, aplica solo los campos indicados y vuelve a guardar."""
    tags = read_tags(path)
    for field_name, value in changes.items():
        if field_name not in TEXT_FIELDS:
            raise MetadataError(f"Campo desconocido: {field_name}")
        setattr(tags, field_name, value)
    write_tags(path, tags)
    return tags


# --- escritura de portada ----------------------------------------------------


def write_cover(path: Path, image: bytes, mime: str = "image/jpeg") -> None:
    """Reemplaza la portada embebida."""
    if not image:
        raise MetadataError("La imagen está vacía")
    if len(image) > MAX_COVER_BYTES:
        raise MetadataError(
            f"La imagen pesa {len(image) // (1024 * 1024)} MB y el límite es "
            f"{MAX_COVER_BYTES // (1024 * 1024)} MB"
        )

    extension = path.suffix.lower()
    if extension not in COVER_FORMATS:
        raise MetadataError(f"{extension} no admite portada embebida")

    audio = _open_native(path)
    if audio is None:
        raise MetadataError("No se pudo abrir el archivo")

    try:
        match extension:
            case ".mp3":
                _write_id3_cover(audio, image, mime)
            case ".m4a" | ".m4b":
                _write_mp4_cover(audio, image, mime)
            case ".flac":
                _write_flac_cover(audio, image, mime)
            case _:
                _write_vorbis_cover(audio, image, mime)
        audio.save()
    except MetadataError:
        raise
    except Exception as exc:
        raise MetadataError(f"No se pudo escribir la portada: {exc}") from exc


def remove_cover(path: Path) -> None:
    """Quita la portada. Si el archivo no tiene, no hace nada."""
    extension = path.suffix.lower()
    if extension not in COVER_FORMATS:
        raise MetadataError(f"{extension} no admite portada embebida")

    audio = _open_native(path)
    if audio is None or audio.tags is None:
        return

    try:
        match extension:
            case ".mp3":
                audio.tags.delall("APIC")
            case ".m4a" | ".m4b":
                # MP4Tags no tiene `delall`, se borra la clave entera.
                if "covr" in audio.tags:
                    del audio.tags["covr"]
            case ".flac":
                audio.clear_pictures()
            case _:
                if "metadata_block_picture" in audio.tags:
                    del audio.tags["metadata_block_picture"]
        audio.save()
    except MetadataError:
        raise
    except Exception as exc:
        raise MetadataError(f"No se pudo quitar la portada: {exc}") from exc


def read_cover_file(image_path: Path) -> tuple[bytes, str]:
    """Lee una imagen del disco y devuelve (bytes, mime) para embeberla."""
    mime = IMAGE_MIME.get(image_path.suffix.lower())
    if mime is None:
        raise MetadataError(
            f"Formato no soportado: {image_path.suffix}. "
            "Usá JPG, PNG, WebP o BMP."
        )
    try:
        data = image_path.read_bytes()
    except OSError as exc:
        raise MetadataError(f"No se pudo leer la imagen: {exc}") from exc

    if not data:
        raise MetadataError("El archivo de imagen está vacío")
    return data, mime


# --- internos ----------------------------------------------------------------


def _open_easy(path: Path):
    """Abre el archivo en la capa "easy", o None si no se puede.

    No se cae de vuelta al objeto nativo: sus claves son distintas (MP4 usa
    `\\xa9nam`, ID3 usa `TIT2`) y escribir con las claves equivocadas dejaria
    tags basura.
    """
    try:
        return mutagen.File(path, easy=True)
    except Exception as exc:
        logger.debug("No se pudo abrir %s (easy): %s", path, exc)
        return None


def _open_native(path: Path):
    try:
        return mutagen.File(path)
    except Exception as exc:
        logger.debug("No se pudo abrir %s (nativo): %s", path, exc)
        return None


def _first(tags, key_name: str) -> str:
    if not tags:
        return ""
    value = tags.get(key_name)
    if isinstance(value, list):
        value = value[0] if value else None
    return str(value).strip() if value else ""


def _cover_bytes(audio) -> bytes | None:
    """Bytes de la imagen, buscando en la API que corresponda a cada formato."""
    tags = getattr(audio, "tags", None)
    if tags is None:
        return None

    # MP3 / ID3: frame APIC
    if hasattr(tags, "getall"):
        frames = tags.getall("APIC")
        if frames:
            return frames[0].data

    # M4A / MP4: clave covr
    covr = tags.get("covr")
    if covr:
        return bytes(covr[0])

    # FLAC: las Pictures viven en el objeto, no en `tags`
    pictures = getattr(audio, "pictures", None)
    if pictures:
        return pictures[0].data

    # Opus / Ogg: bloque FLAC Picture en base64, hay que desempaquetarlo
    block = tags.get("metadata_block_picture")
    if block:
        crudo = block[0] if isinstance(block, list) else block
        try:
            from mutagen.flac import Picture

            return Picture(base64.b64decode(str(crudo))).data
        except (ValueError, TypeError, ImportError):
            return None

    return None


def _write_id3_cover(audio, image: bytes, mime: str) -> None:
    if audio.tags is None:
        audio.add_tags()
    audio.tags.delall("APIC")
    audio.tags.add(
        id3.APIC(encoding=3, mime=mime, type=3, desc="Cover", data=image)
    )


def _write_mp4_cover(audio, image: bytes, mime: str) -> None:
    if audio.tags is None:
        audio.add_tags()

    # MP4 distingue solo entre JPEG y PNG, asi que hay que declarar el formato
    # correcto o el archivo queda con una portada que no se abre.
    if mime == "image/png":
        formato = mutagen.mp4.MP4Cover.FORMAT_PNG
    else:
        formato = mutagen.mp4.MP4Cover.FORMAT_JPEG

    # MP4Tags no tiene `delall`: se borra la clave entera.
    if "covr" in audio.tags:
        del audio.tags["covr"]

    audio.tags["covr"] = [mutagen.mp4.MP4Cover(image, imageformat=formato)]


def _write_flac_cover(audio, image: bytes, mime: str) -> None:
    if audio.tags is None:
        audio.add_tags()
    picture = mutagen.flac.Picture()
    picture.type = id3.PictureType.COVER_FRONT
    picture.mime = mime
    picture.desc = "Cover"
    picture.data = image
    audio.clear_pictures()
    audio.add_picture(picture)


def _write_vorbis_cover(audio, image: bytes, mime: str) -> None:
    from mutagen.flac import Picture

    if audio.tags is None:
        audio.add_tags()

    picture = Picture()
    picture.type = id3.PictureType.COVER_FRONT
    picture.mime = mime
    picture.desc = "Cover"
    picture.data = image

    block = base64.b64encode(picture.write()).decode("ascii")
    audio["metadata_block_picture"] = [block]


def track_from_tags(path: Path, tags: TrackTags) -> dict:
    """Datos para actualizar la fila de la tabla tras guardar."""
    return {
        "title": tags.title or path.stem,
        "artist": tags.artist or tags.albumartist or UNKNOWN,
        "album": tags.album or UNKNOWN,
        "year": tags.year,
        "genre": tags.genre,
        "track_number": tags.track_number,
    }