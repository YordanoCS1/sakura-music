"""Registro persistente de descargas terminadas.

La cola guarda solo lo que se puede reanudar. Este módulo guarda el resultado
final de cada trabajo: descargado, con error, ya estaba o cancelado. Vive en
`core` para que no dependa de Qt y se pueda testear sin la interfaz.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from typing import Any

from ..config import download_history_file
from .models import DownloadJob, JobStatus

logger = logging.getLogger(__name__)

# Tope de registros: el historial se consulta, no es un archivo de auditoría.
# Con 1000 entradas recientes alcanza para revisar lo último sin crecer de más.
MAX_ENTRIES = 1000

_STATUS_LABELS = {
    JobStatus.DONE: "Descargada",
    JobStatus.FAILED: "Con error",
    JobStatus.SKIPPED: "Ya estaba",
    JobStatus.CANCELLED: "Cancelada",
    JobStatus.PENDING: "En espera",
    JobStatus.DOWNLOADING: "Descargando",
    JobStatus.CONVERTING: "Convirtiendo",
}


class DownloadHistory:
    """Lista plana de trabajos terminados, con la más reciente primero."""

    @classmethod
    def record(cls, job: DownloadJob) -> None:
        """Guarda o actualiza el resultado final de un trabajo.

        Un trabajo que falla y después se reintenta hasta salir bien no debe
        quedar dos veces: `history_id` reemplaza la entrada anterior.
        """
        entry = cls._entry(job)
        entries = cls.load()
        for index, existing in enumerate(entries):
            if existing.get("id") == entry["id"]:
                entries[index] = entry
                break
        else:
            entries.insert(0, entry)

        cls._write(entries[:MAX_ENTRIES])

    @classmethod
    def load(cls) -> list[dict[str, Any]]:
        """Entradas guardadas. Un archivo corrupto no debe romper la app."""
        try:
            raw = json.loads(download_history_file().read_text(encoding="utf-8"))
        except (OSError, ValueError):
            return []
        if not isinstance(raw, list):
            return []
        return [item for item in raw if isinstance(item, dict)]

    @classmethod
    def clear(cls) -> None:
        download_history_file().unlink(missing_ok=True)

    @staticmethod
    def _entry(job: DownloadJob) -> dict[str, Any]:
        return {
            "id": job.history_id,
            "timestamp": datetime.now().astimezone().isoformat(timespec="seconds"),
            "title": job.result.title,
            "artist": job.result.uploader,
            "url": job.result.url,
            "status": job.status.value,
            "status_label": _STATUS_LABELS.get(job.status, job.status.value),
            "error": job.error,
            "filepath": str(job.filepath) if job.filepath else "",
            "audio_format": job.audio_format.label,
            "playlist_title": job.playlist_title,
        }

    @staticmethod
    def _write(entries: list[dict[str, Any]]) -> None:
        path = download_history_file()
        temporary = path.with_suffix(".tmp")
        try:
            temporary.write_text(
                json.dumps(entries, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            temporary.replace(path)
        except OSError:
            logger.warning("No se pudo guardar el historial de descargas", exc_info=True)


__all__ = ["MAX_ENTRIES", "DownloadHistory"]
