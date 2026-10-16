"""Modelos de dominio. Sin dependencias de Qt para que sean testeables."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from enum import StrEnum
from pathlib import Path
from typing import TYPE_CHECKING

from .formats import AudioFormat, get_default

if TYPE_CHECKING:
    from .metadata_sources import Candidate


class JobStatus(StrEnum):
    """Estado de un trabajo en la cola."""

    PENDING = "pending"
    DOWNLOADING = "downloading"
    CONVERTING = "converting"
    DONE = "done"
    FAILED = "failed"
    CANCELLED = "cancelled"
    SKIPPED = "skipped"

    @property
    def is_active(self) -> bool:
        return self in (JobStatus.DOWNLOADING, JobStatus.CONVERTING)

    @property
    def is_finished(self) -> bool:
        return self in (JobStatus.DONE, JobStatus.FAILED, JobStatus.CANCELLED, JobStatus.SKIPPED)


@dataclass(slots=True)
class SearchResult:
    """Un video devuelto por la busqueda de yt-dlp."""

    id: str
    title: str
    url: str
    uploader: str = "Desconocido"
    duration: int = 0
    thumbnail: str = ""
    view_count: int = 0
    channel_verified: bool = False

    @property
    def duration_text(self) -> str:
        seconds = max(0, int(self.duration or 0))
        return f"{seconds // 60}:{seconds % 60:02d}"

    @classmethod
    def from_json(cls, data: dict) -> SearchResult | None:
        """Construye el modelo desde un volcado JSON de yt-dlp."""
        url = data.get("webpage_url") or data.get("url")
        title = data.get("title")
        if not url or not title:
            return None
        return cls(
            id=data.get("id") or "",
            title=title,
            url=url,
            uploader=data.get("channel") or data.get("uploader") or "Desconocido",
            duration=int(data.get("duration") or 0),
            thumbnail=data.get("thumbnail") or _best_thumbnail(data),
            view_count=int(data.get("view_count") or 0),
            channel_verified=bool(data.get("channel_is_verified")),
        )


def _best_thumbnail(data: dict) -> str:
    """Elige la miniatura mas grande de la lista `thumbnails`."""
    thumbs = data.get("thumbnails") or []
    best = ""
    best_area = -1
    for thumb in thumbs:
        area = int(thumb.get("width") or 0) * int(thumb.get("height") or 0)
        if area > best_area and thumb.get("url"):
            best, best_area = thumb["url"], area
    return best


@dataclass(slots=True)
class DownloadJob:
    """Una descarga en la cola."""

    result: SearchResult
    audio_format: AudioFormat = field(default_factory=get_default)
    status: JobStatus = JobStatus.PENDING
    attempts: int = 0
    # Nombre de la playlist de origen, vacio si fue una busqueda suelta. Decide
    # si el archivo cae en una carpeta con el nombre de la playlist o en una por
    # artista.
    playlist_title: str = ""
    # Ficha del catalogo cuando la pista viene de un album. Al terminar la
    # descarga se escriben sus tags: es lo que da album, año, género y numero de
    # pista correctos, que una busqueda suelta no puede saber.
    album_track: Candidate | None = None
    downloaded_bytes: int = 0
    total_bytes: int = 0
    speed: str = ""
    error: str = ""
    filepath: Path | None = None

    @property
    def title(self) -> str:
        return self.result.title

    @property
    def artist(self) -> str:
        return self.result.uploader

    @property
    def progress_percent(self) -> int:
        """0-100, o -1 si el total todavia no se conoce ( indeterminate )."""
        if self.total_bytes <= 0:
            return -1
        return min(100, int(self.downloaded_bytes * 100 / self.total_bytes))

    @property
    def is_indeterminate(self) -> bool:
        return self.total_bytes <= 0


@dataclass(frozen=True, slots=True)
class DownloadSummary:
    """Cuantas descargas de un lote terminaron en cada estado."""

    downloaded: int = 0
    failed: int = 0
    omitidas: int = 0
    cancelled: int = 0

    @property
    def hubo_actividad(self) -> bool:
        """Si el lote movio la cola de verdad, no solo duplicados ya vistos."""
        return bool(self.downloaded or self.failed or self.cancelled)


def summarize_downloads(jobs: Iterable[DownloadJob]) -> DownloadSummary:
    """Cuenta los trabajos terminados de un lote de descargas."""
    downloaded = failed = omitidas = cancelled = 0
    for job_item in jobs:
        if job_item.status is JobStatus.DONE:
            downloaded += 1
        elif job_item.status is JobStatus.FAILED:
            failed += 1
        elif job_item.status is JobStatus.SKIPPED:
            omitidas += 1
        elif job_item.status is JobStatus.CANCELLED:
            cancelled += 1
    return DownloadSummary(
        downloaded=downloaded,
        failed=failed,
        omitidas=omitidas,
        cancelled=cancelled,
    )


def text_summary_downloads(summary: DownloadSummary) -> str:
    """'5 descargadas · 1 con error · 2 ya estaban' para el dialogo final."""
    chunks = [f"{summary.downloaded} descargada{'s' if summary.downloaded != 1 else ''}"]
    if summary.failed:
        chunks.append(f"{summary.failed} con error")
    if summary.omitidas:
        chunks.append(
            f"{summary.omitidas} ya estaba{'n' if summary.omitidas != 1 else ''}"
        )
    if summary.cancelled:
        chunks.append(
            f"{summary.cancelled} cancelada{'s' if summary.cancelled != 1 else ''}"
        )
    return " · ".join(chunks)