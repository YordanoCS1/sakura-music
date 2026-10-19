"""Cola de descargas: varios procesos a la vez, el resto en espera."""

from __future__ import annotations

import json
import logging
import shutil
from dataclasses import dataclass, field
from pathlib import Path

from PySide6.QtCore import QObject, QTimer, Signal

from ...config import (  # noqa: F401
    download_queue_file,
    downloads_dir,
    downloads_target_dir,
    library_dir,
    load_settings,
    music_dir,
)
from ...core.formats import AudioFormat, get_default, get_format
from ...core.library import find_existing_download, write_cover_folder
from ...core.metadata import (
    MetadataError,
    read_tags,
    update_text_tags,
    write_cover,
)
from ...core.metadata_sources import Candidate, download_cover
from ...core.models import DownloadJob, JobStatus, SearchResult
from ...core.text import clear_title_y_artist
from ...core.tools import (
    ToolMissing,
    build_download_command,
    cookies_navegador,
    ffmpeg_location,
    friendly_error,
    parse_progress_line,
    playlist_output_template,
)
from .process import ProcessRunner

AVERAGE_SUFFIXES = (
    ".mp3",
    ".m4a",
    ".opus",
    ".aac",
    ".flac",
    ".wav",
    ".mp4",
    ".mkv",
    ".webm",
    ".avi",
    ".mov",
)
PARTIAL_SUFFIXES = (".part", ".ytdl", ".temp")

TAGGABLE_SUFFIXES = (".mp3", ".m4a", ".m4b", ".opus", ".flac", ".ogg")


@dataclass
class _Slot:
    """Un proceso de descarga y el trabajo que le corresponde.

    El estado del proceso no puede vivir en el manager: con varios
    downloads en paralelo hay que saber cual de ellos es el que|reporta una
    linea de progreso o termina con codigo de salida != 0.
    """

    runner: ProcessRunner
    job: DownloadJob | None = None
    staging: Path | None = None
    seen_errors: list[str] = field(default_factory=list)

    @property
    def free(self) -> bool:
        return self.job is None and not self.runner.is_running


class DownloadManager(QObject):
    """Descarga hasta `MAX_CONCURRENT` trabajos a la vez, moviendo el resultado
    a la biblioteca.

    `yt-dlp` corre como subproceso a proposito: la extraccion de metadatos es
    trabajo intensivo de CPU y bloquearia la interfaz si corriera en el mismo
    proceso bajo el GIL. Como cada subproceso corre en su propio hilo, varios a
    la vez no bloquean la interfaz. Ver `max_concurrent` para el caso de cookies.
    """

    job_added = Signal(object)  # DownloadJob
    job_updated = Signal(object)  # DownloadJob
    job_finished = Signal(object)  # DownloadJob
    queue_changed = Signal()
    persistence_error = Signal(str)

    # Un trabajo se reintenta este numero de veces antes de quedar en error.
    # Los reintentos los hace la app, no yt-dlp, para que el usuario los vea.
    MAX_ATTEMPTS = 3

    # yt-dlp ya descarga fragmentos en paralelo, asi que un proceso por descarga
    # ya satura el ancho de banda. El segundo aporta poco y si se usan cookies
    # del navegador estorba: dos procesos leen la misma base de cookies.
    MAX_CONCURRENT = 2
    MAX_CONCURRENT_WITH_COOKIES = 1
    # Rango que ofrece Ajustes. Más de 4 no aporta: el ancho de banda ya está
    # saturado con menos y cada proceso extrae en CPU propia.
    MIN_CONCURRENT = 1
    MAX_CONCURRENT_ALLOWED = 4

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._jobs: list[DownloadJob] = []
        self._counter = 0
        self._closing = False
        self._persistence_error_message = ""
        self._max_concurrent = self._process_limite()
        self._load_jobs()

        self._slots: list[_Slot] = []
        for idx in range(self._max_concurrent):
            runner = ProcessRunner(self)
            # El indice se captura por valor: sin esto, todas las señales
            # apuntarian al ultimo slot creado.
            runner.line.connect(lambda line, i=idx: self._on_line(i, line))
            runner.failed.connect(lambda msg, i=idx: self._on_failed(i, msg))
            runner.completed.connect(lambda code, i=idx: self._on_completed(i, code))
            self._slots.append(_Slot(runner=runner))

    @property
    def max_concurrent(self) -> int:
        """Procesos simultaneos, resuelto al arrancar.

        Se fija una vez porque los slots se crean en el constructor: si el valor
        se volviera a leer en cada `pump()`, un cambio de ajuste daría un numero
        que no coincide con la cantidad de runners y dejaría procesos sin poder
        ser matados.
        """
        return self._max_concurrent

    def _process_limite(self) -> int:
        """Cruza el ajuste guardado con lo que el caso de cookies permite."""
        if cookies_navegador():
            return self.MAX_CONCURRENT_WITH_COOKIES

        crudo = load_settings().get("max_concurrent_downloads")
        try:
            pedido = int(crudo)
        except (TypeError, ValueError):
            pedido = self.MAX_CONCURRENT
        pedido = max(self.MIN_CONCURRENT, min(self.MAX_CONCURRENT_ALLOWED, pedido))
        return pedido

    def shutdown(self) -> None:
        """Corta los procesos en curso y espera a los hilos (usar al cerrar)."""
        self._closing = True
        for slot in self._slots:
            job = slot.job
            if job is not None:
                job.status = JobStatus.PENDING
                job.attempts = 0
                job.downloaded_bytes = 0
                job.total_bytes = 0
                job.speed = ""
                job.error = "Descarga interrumpida al cerrar la aplicación"
        self._save_jobs()
        for slot in self._slots:
            self._cleanup_partial(slot.staging)
            slot.job = None
            slot.staging = None
            slot.runner.shutdown()

    # --- estado --------------------------------------------------------------

    @property
    def jobs(self) -> list[DownloadJob]:
        return list(self._jobs)

    @property
    def active(self) -> list[DownloadJob]:
        """Los trabajos que estan en proceso ahora mismo."""
        return [slot.job for slot in self._slots if slot.job is not None]

    @property
    def current(self) -> DownloadJob | None:
        """Primer trabajo en proceso. Anterior a la concurrencia, se conserva."""
        return next((slot.job for slot in self._slots if slot.job is not None), None)

    @property
    def pending_count(self) -> int:
        return sum(1 for job in self._jobs if job.status is JobStatus.PENDING)

    def resume_pending(self) -> None:
        """Reanuda los trabajos guardados al iniciar la aplicación."""
        if self._persistence_error_message:
            self.persistence_error.emit(self._persistence_error_message)
            self._persistence_error_message = ""
        self._pump_soon()

    def retry_failed(self) -> int:
        """Vuelve a poner en cola los trabajos fallidos o cancelados."""
        retried = 0
        for job in self._jobs:
            if self.retry(job):
                retried += 1

        if retried:
            self._pump_soon()
        return retried

    def retry(self, job: DownloadJob) -> bool:
        """Reintenta un solo trabajo. False si no se puede repetir.

        Devolver False es parte de la regla: un trabajo listo o en curso no se
        reencola, y el llamador necesita saberlo para no anunciarlo.
        """
        if job.status not in (JobStatus.FAILED, JobStatus.CANCELLED):
            return False

        job.attempts = 0
        job.downloaded_bytes = 0
        job.total_bytes = 0
        job.speed = ""
        job.error = ""
        self._set_status(job, JobStatus.PENDING)
        self._pump_soon()
        return True

    def ffmpeg_available(self) -> bool:
        """Misma comprobacion que hace `build_download_command`, sin duplicarla."""
        try:
            ffmpeg_location()
        except ToolMissing:
            return False
        return True

    # --- cola ----------------------------------------------------------------

    def enqueue(
        self,
        result: SearchResult,
        audio_format: AudioFormat | None = None,
        playlist_title: str = "",
    ) -> DownloadJob:
        job = DownloadJob(
            result=result,
            audio_format=audio_format or get_default(),
            playlist_title=playlist_title,
        )
        return self._enqueue(job)

    def enqueue_album_track(
        self,
        result: SearchResult,
        candidate: Candidate,
        audio_format: AudioFormat | None = None,
        folder_path: str = "",
    ) -> DownloadJob:
        """Encola una pista de album con los tags del catalogo para el final.

        La carpeta se pasa ya resuelta a "Artista/Album" porque el titulo de la
        playlist no existe aca: el nombre sale de la ficha del catalogo.
        """
        job = DownloadJob(
            result=result,
            audio_format=audio_format or get_default(),
            playlist_title=folder_path,
            album_track=candidate,
        )
        return self._enqueue(job)

    def _enqueue(self, job: DownloadJob) -> DownloadJob:
        """Agrega el trabajo a la cola y lo manda a la cola de trabajo."""
        self._jobs.append(job)
        self.job_added.emit(job)
        self.queue_changed.emit()

        # Si la pista ya esta en la biblioteca no se vuelve a bajar: ademas de
        # gastar ancho de banda, `shutil.move` pisaria el archivo que ya esta.
        if self._mark_ya_downloaded(job) or self._mark_ya_in_queue(job):
            self.job_finished.emit(job)
            self._pump_soon()
            return job

        self._pump_soon()
        return job

    def _mark_ya_in_queue(self, job: DownloadJob) -> bool:
        """Si el mismo video ya esta pendiente o bajandose, lo saltea.

        Sin esto, dos descargas paralelas del mismo video compiten por el
        mismo archivo destino y una de las dos lo pisa al moverlo.
        """
        ocupada = any(
            other is not job
            and not other.status.is_finished
            and other.result.url == job.result.url
            for other in self._jobs
        )
        if not ocupada:
            return False

        job.error = "Ya está en la cola de descarga"
        self._set_status(job, JobStatus.SKIPPED)
        return True

    def _mark_ya_downloaded(self, job: DownloadJob) -> bool:
        """Si el archivo ya existe, deja el trabajo en SKIPPED. True si lo saltó."""
        extension = f".{job.audio_format.extension.lower()}"
        existing = find_existing_download(
            [library_dir(), downloads_target_dir()],
            job.result.uploader,
            job.result.title,
            (extension,),
        )
        if existing is None:
            return False

        job.filepath = existing
        job.error = f"Ya está en tu biblioteca: {existing.name}"
        self._set_status(job, JobStatus.SKIPPED)
        return True

    def cancel(self, job: DownloadJob) -> None:
        if job.status is JobStatus.PENDING:
            self._set_status(job, JobStatus.CANCELLED)
            return

        for slot in self._slots:
            if slot.job is not job:
                continue
            staging = slot.staging
            slot.job = None
            slot.staging = None
            slot.seen_errors.clear()
            slot.runner.kill()
            self._cleanup_partial(staging)
            # Sin esto el trabajo se queda en DOWNLOADING para siempre, aunque su
            # proceso ya esta muerto.
            self._set_status(job, JobStatus.CANCELLED)
            self.job_finished.emit(job)
            self.queue_changed.emit()
            self._pump_soon()
            return

    def cancel_all(self) -> int:
        """Cancela todo lo pendiente y en curso. Devuelve cuantas cancelo."""
        cancelled = 0
        for job in list(self._jobs):
            if job.status is JobStatus.PENDING or job.status.is_active:
                self.cancel(job)
                cancelled += 1
        return cancelled

    def clear_finished(self) -> None:
        self._jobs = [job for job in self._jobs if not job.status.is_finished]
        self._save_jobs()
        self.queue_changed.emit()

    def pump(self) -> None:
        """Llena los slots libres con los siguientes trabajos pendientes."""
        if self._closing:
            return

        pending = [job for job in self._jobs if job.status is JobStatus.PENDING]
        for slot in self._slots:
            if not pending:
                return
            # Un slot ocupado no corta la pasada: el siguiente puede estar libre.
            if not slot.free:
                continue
            self._start(slot, pending.pop(0))

    def _pump_soon(self) -> None:
        """Reparte los pendientes ahora y otra vez al volver al bucle de eventos.

        La segunda pasada es lo que evita que la cola se quede parada: matar un
        proceso es asincrono, asi que el hilo del slot cancelado sigue vivo un
        instante, `_Slot.libre` da False y `pump()` lo saltea. Sin la repeticion
        diferida, el trabajo que esperaba se queda en PENDING para siempre
        porque nadie vuelve a llamar a `pump()`.
        """
        self.pump()
        QTimer.singleShot(0, self.pump)

    # --- ejecucion -----------------------------------------------------------

    def _start(self, slot: _Slot, job: DownloadJob) -> None:
        job.attempts += 1
        if job.error.startswith("Descarga interrumpida al cerrar"):
            job.error = ""
        slot.job = job
        slot.seen_errors.clear()

        staging = downloads_dir() / f"job-{self._counter:04d}"
        self._counter += 1

        # Un staging sucio hace que yt-dlp crea que el archivo ya fue descargado
        # (`has already been downloaded`) y luego falle al posteprocesarlo.
        shutil.rmtree(staging, ignore_errors=True)
        staging.mkdir(parents=True, exist_ok=True)
        slot.staging = staging

        try:
            command = build_download_command(
                job.result.url,
                staging,
                audio_format=job.audio_format,
                output_template=self._plantilla(job),
            )
        except ToolMissing as exc:
            job.error = str(exc)
            slot.job = None
            slot.staging = None
            self._set_status(job, JobStatus.FAILED)
            self.job_finished.emit(job)
            self.queue_changed.emit()
            return

        self._set_status(job, JobStatus.DOWNLOADING)
        slot.runner.start(command)

    def _plantilla(self, job: DownloadJob) -> str | None:
        """Carpeta del archivo: la de la playlist, o la del artista.

        Una playlist va toda junta en una carpeta con su nombre; una busqueda
        suelta sigue yendo a una carpeta por canal. El nombre se resuelve antes
        de descargar cada video, así que se inserta literalmente en la plantilla.
        """
        if not job.playlist_title.strip():
            return None
        return playlist_output_template(job.playlist_title)

    def _on_line(self, idx: int, line: str) -> None:
        slot = self._slots[idx]
        job = slot.job
        if job is None:
            return

        update = parse_progress_line(line)
        if update is not None:
            job.downloaded_bytes = update.downloaded
            job.total_bytes = update.total
            job.speed = update.speed
            self.job_updated.emit(job)
            return

        lowered = line.lower()
        # "[ExtractAudio]", "[Merger]" y "[VideoConvertor]" indican postproceso.
        if "[extractaudio]" in lowered or "[merger]" in lowered or "[videoconvertor]" in lowered:
            self._set_status(job, JobStatus.CONVERTING)
        elif line.upper().startswith(("ERROR:", "WARNING:")):
            slot.seen_errors.append(line)

    def _on_failed(self, idx: int, message: str) -> None:
        job = self._slots[idx].job
        if job is not None:
            self._fallar(idx, job, message)

    def _on_completed(self, idx: int, exit_code: int) -> None:
        slot = self._slots[idx]
        job, staging = slot.job, slot.staging
        slot.job = None
        slot.staging = None

        if job is None:
            # El proceso termino despues de que su trabajo se cancelara. El slot
            # quedo libre igual, asi que hay que darle paso al que espera.
            self._pump_soon()
            return

        if exit_code != 0:
            last_error = slot.seen_errors[-1] if slot.seen_errors else f"código {exit_code}"
            self._fallar(idx, job, last_error, staging)
            return

        job.error = ""
        moved = self._collect_output(staging, job)
        if moved is None:
            job.error = "No se encontro el archivo descargado"
            self._set_status(job, JobStatus.FAILED)
        else:
            job.filepath = moved
            self._set_status(job, JobStatus.DONE)

        self.job_finished.emit(job)
        self.queue_changed.emit()
        self._pump_soon()

    def _fallar(
        self,
        idx: int,
        job: DownloadJob,
        message_text: str,
        staging: Path | None = None,
    ) -> None:
        """Deja el trabajo en PENDING para reintentar, o en FAILED si se acabaron.

        `staging` se pasa porque `_on_completed` ya vacio el slot y desde ahi no
        se puede saber que carpeta borrar.
        """
        slot = self._slots[idx]
        if staging is None:
            staging = slot.staging
        slot.job = None
        slot.staging = None
        self._cleanup_partial(staging)

        if job.attempts < self.MAX_ATTEMPTS:
            job.downloaded_bytes = 0
            job.total_bytes = 0
            job.speed = ""
            job.error = f"Reintentando ({job.attempts + 1}/{self.MAX_ATTEMPTS})"
            self._set_status(job, JobStatus.PENDING)
            self.queue_changed.emit()
            self._pump_soon()
            return

        job.error = friendly_error(message_text)
        self._set_status(job, JobStatus.FAILED)
        self.job_finished.emit(job)
        self.queue_changed.emit()
        self._pump_soon()

    # --- archivos ------------------------------------------------------------

    def _collect_output(self, staging: Path | None, job: DownloadJob | None = None) -> Path | None:
        """Mueve el archivo producido desde `staging` a la biblioteca.

        Las listas y los álbumes son colecciones: su carpeta va directo a la
        raíz de la biblioteca, nunca dentro de la carpeta de descargas (que
        puede ser la de un artista). Las búsquedas sueltas siguen yendo a la
        carpeta de descargas configurada.
        """
        if staging is None or not staging.exists():
            return None

        files = [p for p in staging.rglob("*") if p.is_file()]
        complete = [p for p in files if not p.name.endswith(PARTIAL_SUFFIXES)]
        average = [p for p in complete if p.suffix.lower() in AVERAGE_SUFFIXES]

        chosen = max(average or complete, key=lambda p: p.stat().st_size, default=None)
        if chosen is None:
            return None

        relative = chosen.relative_to(staging)
        organized = job is not None and bool(job.playlist_title.strip())
        root = library_dir() if organized else downloads_target_dir()
        target = root / relative
        target.parent.mkdir(parents=True, exist_ok=True)

        shutil.move(str(chosen), str(target))

        # yt-dlp deja títulos tipo "Cancion (Official Video) [4K]", así que se
        # sanean title/artist. Importante: `update_text_tags` y no `write_tags`,
        # porque `write_tags` borra album, año, género y número de pista, que
        # yt-dlp acaba de escribir bien.
        if target.suffix.lower() in TAGGABLE_SUFFIXES and job:
            self._sanitize_tags(target, job)

        shutil.rmtree(staging, ignore_errors=True)
        return target

    def _sanitize_tags(self, target: Path, job: DownloadJob) -> None:
        """Pone title/artist limpios sin tocar el resto de los tags."""
        candidate = job.album_track
        if candidate is not None:
            # Con tags del catalogo no hay que adivinar nada: el archivo sale
            # con album, año, género y numero de pista correctos.
            self._write_tags_album(target, candidate)
            return

        try:
            if read_tags(target).title not in ("", target.stem):
                return  # yt-dlp ya dejó un título real

            title, artist = clear_title_y_artist(job.result.title, job.result.uploader)
            update_text_tags(target, title=title, artist=artist)
        except MetadataError:
            # Un archivo ilegible o un formato sin capa "easy" no debe tumbar la
            # descarga: el audio ya esta en la biblioteca, solo faltaron tags.
            pass

    def _write_tags_album(self, target: Path, candidate: Candidate) -> None:
        """Escribe los tags que trajo el catalogo. Un fallo no tumba la descarga."""
        try:
            field_map = candidate.to_tags()
            update_text_tags(target, **field_map)
            cover = download_cover(candidate.cover_url)
            if cover:
                write_cover(target, cover[0], cover[1])
                self._write_cover_folder(target.parent, cover[0])
        except MetadataError:
            pass
        except OSError:
            # La portada se baja por red: sin conexion el archivo sigue valido.
            pass

    def _write_cover_folder(self, folder_path: Path, image: bytes) -> None:
        """Deja `folder.jpg` junto al album, si el usuario lo pidio y no hay otra.

        La primera pista del album es la que escribe: ahi se resuelve una sola
        vez y no en cada archivo. Sin esto, cualquier reproductor externo muestra
        la biblioteca sin caratulas.
        """
        if not bool(load_settings().get("write_folder_cover", True)):
            return
        write_cover_folder(folder_path, image)

    def _cleanup_partial(self, staging: Path | None) -> None:
        """Borra el staging. Acepta la ruta porque el estado ya se vacio al llegar."""
        if staging is not None:
            shutil.rmtree(staging, ignore_errors=True)

    def _set_status(self, job: DownloadJob, status: JobStatus) -> None:
        job.status = status
        self._save_jobs()
        self.job_updated.emit(job)

    def _load_jobs(self) -> None:
        """Restaura los trabajos que se pueden reanudar o reintentar."""
        try:
            path = download_queue_file()
            if not path.exists():
                return
            stored = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            logging.getLogger(__name__).exception("No se pudo leer la cola persistida")
            self._persistence_error_message = "No se pudo leer la cola guardada de descargas"
            return

        if not isinstance(stored, list):
            logging.getLogger(__name__).error("Formato inválido en la cola persistida: %s", path)
            self._persistence_error_message = (
                "La cola guardada de descargas tiene un formato inválido"
            )
            return

        for index, item in enumerate(stored):
            try:
                if not isinstance(item, dict):
                    raise TypeError("El registro no es un objeto")
                result_data = item["result"]
                if not isinstance(result_data, dict):
                    raise TypeError("El resultado no es un objeto")
                result = SearchResult(
                    id=str(result_data["id"]),
                    title=str(result_data["title"]),
                    url=str(result_data["url"]),
                    uploader=str(result_data.get("uploader", "Desconocido")),
                    duration=int(result_data.get("duration", 0)),
                    thumbnail=str(result_data.get("thumbnail", "")),
                    view_count=int(result_data.get("view_count", 0)),
                    channel_verified=bool(result_data.get("channel_verified", False)),
                )
                format_id = str(item["audio_format"])
                audio_format = get_format(format_id)
                if audio_format.id != format_id:
                    raise ValueError(f"Formato de descarga desconocido: {format_id}")

                status = JobStatus(item["status"])
                if status in (JobStatus.DOWNLOADING, JobStatus.CONVERTING):
                    status = JobStatus.PENDING
                if status not in (
                    JobStatus.PENDING,
                    JobStatus.FAILED,
                    JobStatus.CANCELLED,
                ):
                    continue

                job = DownloadJob(
                    result=result,
                    audio_format=audio_format,
                    status=status,
                    attempts=max(0, int(item.get("attempts", 0))),
                    playlist_title=str(item.get("playlist_title", "")),
                    error=str(item.get("error", "")),
                )
            except (KeyError, TypeError, ValueError) as exc:
                logging.getLogger(__name__).warning(
                    "Se omitió el trabajo %s de la cola guardada: %s", index + 1, exc
                )
                continue

            self._jobs.append(job)

    def _save_jobs(self) -> None:
        """Guarda la cola incompleta de forma atómica."""
        stored = []
        for job in self._jobs:
            status = job.status
            if status in (JobStatus.DOWNLOADING, JobStatus.CONVERTING):
                status = JobStatus.PENDING
            if status not in (
                JobStatus.PENDING,
                JobStatus.FAILED,
                JobStatus.CANCELLED,
            ):
                continue

            stored.append(
                {
                    "result": {
                        "id": job.result.id,
                        "title": job.result.title,
                        "url": job.result.url,
                        "uploader": job.result.uploader,
                        "duration": job.result.duration,
                        "thumbnail": job.result.thumbnail,
                        "view_count": job.result.view_count,
                        "channel_verified": job.result.channel_verified,
                    },
                    "audio_format": job.audio_format.id,
                    "status": status.value,
                    "attempts": job.attempts,
                    "playlist_title": job.playlist_title,
                    "error": job.error,
                }
            )

        try:
            path = download_queue_file()
            temporary = path.with_suffix(".tmp")
            temporary.write_text(
                json.dumps(stored, indent=2, ensure_ascii=False), encoding="utf-8"
            )
            temporary.replace(path)
        except OSError as exc:
            logging.getLogger(__name__).exception("No se pudo guardar la cola de descargas")
            self.persistence_error.emit(f"No se pudo guardar la cola de descargas: {exc}")