"""Formatos de descarga de salida (Audio y Video).

Para audio:
    opus -> remux del origen, cero perdida generacional, el archivo mas chico
    m4a  -> AAC, mejor calidad por bitrate que mp3, compatibilidad amplia
    mp3  -> maxima compatibilidad, el peor de los tres en tamano y calidad

Para video:
    mp4_best  -> MP4 en la maxima resolucion disponible (1080p o superior) con audio mezclado
    mp4_1080p -> MP4 en Full HD (1080p)
    mp4_720p  -> MP4 en HD (720p)
    mp4_480p  -> MP4 en calidad estandar (480p)
    mp4_360p  -> MP4 en calidad ligera (360p)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class MediaFormat:
    """Un formato de salida (audio o video) y sus ajustes de codificacion."""

    id: str
    label: str
    extension: str
    quality: str | None = None
    is_video: bool = False
    height: int | None = None

    @property
    def transcodes(self) -> bool:
        """True si el stream de audio se vuelve a codificar."""
        return self.quality is not None and not self.is_video


# Alias para retrocompatibilidad
AudioFormat = MediaFormat

AUDIO_FORMATS: tuple[MediaFormat, ...] = (
    MediaFormat("opus", "Opus · original (129 kbps)", "opus", None, is_video=False),
    MediaFormat("m4a", "m4a · AAC 192 kbps", "m4a", "192K", is_video=False),
    MediaFormat("mp3", "mp3 · 320 kbps", "mp3", "320K", is_video=False),
)

VIDEO_FORMATS: tuple[MediaFormat, ...] = (
    MediaFormat(
        "mp4_best",
        "Video MP4 · Mejor calidad (1080p+)",
        "mp4",
        None,
        is_video=True,
        height=None,
    ),
    MediaFormat(
        "mp4_1080p",
        "Video MP4 · 1080p (Full HD)",
        "mp4",
        None,
        is_video=True,
        height=1080,
    ),
    MediaFormat(
        "mp4_720p",
        "Video MP4 · 720p (HD)",
        "mp4",
        None,
        is_video=True,
        height=720,
    ),
    MediaFormat(
        "mp4_480p",
        "Video MP4 · 480p (SD)",
        "mp4",
        None,
        is_video=True,
        height=480,
    ),
    MediaFormat(
        "mp4_360p",
        "Video MP4 · 360p (Baja)",
        "mp4",
        None,
        is_video=True,
        height=360,
    ),
)

FORMATS: tuple[MediaFormat, ...] = AUDIO_FORMATS + VIDEO_FORMATS

DEFAULT_FORMAT_ID = "opus"


def get_format(format_id: str | None) -> MediaFormat:
    """Devuelve el formato pedido, o el de por defecto si no existe."""
    if format_id:
        for fmt in FORMATS:
            if fmt.id == format_id:
                return fmt
    return get_default()


def get_default() -> MediaFormat:
    return get_format(DEFAULT_FORMAT_ID)


def labels() -> list[str]:
    return [fmt.label for fmt in FORMATS]