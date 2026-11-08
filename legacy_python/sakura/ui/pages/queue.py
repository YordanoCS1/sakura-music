"""Pagina de la cola: descargas en curso y terminadas."""

from __future__ import annotations

from PySide6.QtCore import QRectF, Qt, Signal
from PySide6.QtGui import QColor, QPainter, QPainterPath, QPen, QPixmap
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ...core.models import DownloadJob, JobStatus
from .. import icons
from .. import theme as th
from ..services.thumbnails import ThumbnailLoader, cache_path
from ..widgets.buttons import IconButton, TextButton
from ..widgets.result_card import ORDINAL_W
from .base import MessageBlock, Page

# Mapea cada estado a su clase de badge en el QSS.
_BADGE = {
    JobStatus.PENDING: "BadgePending",
    JobStatus.DOWNLOADING: "BadgeActive",
    JobStatus.CONVERTING: "BadgeActive",
    JobStatus.DONE: "BadgeDone",
    JobStatus.FAILED: "BadgeFailed",
    JobStatus.CANCELLED: "BadgePending",
    JobStatus.SKIPPED: "BadgeDone",
}

# Etiqueta con la que el QSS colorea la franja izquierda de cada fila.
_ACCENT = {
    JobStatus.PENDING: "pending",
    JobStatus.DOWNLOADING: "active",
    JobStatus.CONVERTING: "active",
    JobStatus.DONE: "done",
    JobStatus.FAILED: "failed",
    JobStatus.CANCELLED: "cancelled",
    JobStatus.SKIPPED: "skipped",
}

_STATUS_TEXT = {
    JobStatus.PENDING: "En espera",
    JobStatus.DOWNLOADING: "Descargando",
    JobStatus.CONVERTING: "Convirtiendo",
    JobStatus.DONE: "Listo",
    JobStatus.FAILED: "Error",
    JobStatus.CANCELLED: "Cancelado",
    JobStatus.SKIPPED: "Ya estaba",
}


BADGE_WIDTH = 128
THUMB_SIZE = 46


class JobRow(QWidget):
    """Una fila de la cola: numero, titulo, meta, progreso, estado y detalle."""

    retry_requested = Signal(object)  # DownloadJob

    def __init__(self, job: DownloadJob, index: int | None = None, parent=None):
        super().__init__(parent)
        self.job = job
        self._pixmap: QPixmap | None = None
        self.setObjectName("JobRow")
        # Un QWidget puro ignora el fondo del QSS sin este atributo.
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        # Alto natural: sin esto, con pocas filas el layout las estira.
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 12, 16, 12)
        layout.setSpacing(12)

        self.ordinal: QLabel | None = None
        if index is not None:
            self.ordinal = QLabel(str(index))
            self.ordinal.setObjectName("Ordinal")
            self.ordinal.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.ordinal.setFixedWidth(ORDINAL_W.get(len(str(index)), ORDINAL_W[4]))
            layout.addWidget(self.ordinal, 0, Qt.AlignmentFlag.AlignTop)

        self.artwork = QLabel()
        self.artwork.setObjectName("JobThumb")
        self.artwork.setFixedSize(THUMB_SIZE, THUMB_SIZE)
        self.artwork.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.artwork, 0, Qt.AlignmentFlag.AlignTop)

        body = QVBoxLayout()
        body.setSpacing(7)
        body.setContentsMargins(0, 1, 0, 1)

        top = QHBoxLayout()
        top.setSpacing(10)
        self.title = QLabel(_shorten(job.title, 56))
        self.title.setToolTip(job.title)
        self.title.setAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
        # Un QLabel normal pide el ancho completo del texto como minimo y, con un
        # titulo largo, empujaria el badge fuera de la tarjeta.
        self.title.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred)
        top.addWidget(self.title, 1)

        self.badge = QLabel("")
        self.badge.setObjectName("Badge")
        self.badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        # Ancho fijo: el texto mas largo es "Convirtiendo" y sin esto la fila
        # de error reparte el espacio sobrante y estira el badge.
        self.badge.setFixedWidth(BADGE_WIDTH)
        top.addWidget(self.badge, 0, Qt.AlignmentFlag.AlignVCenter)
        body.addLayout(top)

        meta_row = QHBoxLayout()
        meta_row.setSpacing(12)
        meta_row.setContentsMargins(0, 0, 0, 0)
        self.meta = QLabel("")
        self.meta.setObjectName("JobMeta")
        self.meta.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred)
        meta_row.addWidget(self.meta, 1)

        self.detail = QLabel("")
        self.detail.setObjectName("JobDetail")
        self.detail.setFixedWidth(132)
        self.detail.setAlignment(
            Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter
        )
        meta_row.addWidget(self.detail)
        body.addLayout(meta_row)

        self.progress = QProgressBar()
        self.progress.setTextVisible(False)
        self.progress.setFixedHeight(6)
        body.addWidget(self.progress)
        layout.addLayout(body, 1)

        self.retry_button = IconButton("repeat", "Reintentar esta descarga", 30)
        self.retry_button.clicked.connect(self._retry)
        self.retry_button.setVisible(False)
        layout.addWidget(self.retry_button, 0, Qt.AlignmentFlag.AlignVCenter)

        self.refresh()

    def _retry(self) -> None:
        """Avisa a quien escucha de la vista: el gestor es el que reencola."""
        self.retry_requested.emit(self.job)

    def set_thumbnail(self, pixmap: QPixmap) -> None:
        self._pixmap = None if pixmap.isNull() else pixmap
        self._paint_artwork()

    def _paint_artwork(self) -> None:
        """Miniatura redondeada de la portada, o el icono de musica de relleno."""
        t = th.active()
        radio = max(2, t.radius_sm - 2)
        out = QPixmap(THUMB_SIZE, THUMB_SIZE)
        out.fill(Qt.GlobalColor.transparent)
        painter = QPainter(out)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        path = QPainterPath()
        path.addRoundedRect(
            QRectF(0, 0, THUMB_SIZE, THUMB_SIZE), radio, radio
        )
        if self._pixmap is None:
            painter.fillPath(path, QColor(t.surface_hover))
            note = icons.render("music", t.text_muted, 20)
            painter.drawPixmap(
                (THUMB_SIZE - note.width()) // 2,
                (THUMB_SIZE - note.height()) // 2,
                note,
            )
        else:
            painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
            painter.setClipPath(path)
            painter.drawPixmap(
                0,
                0,
                self._pixmap.scaled(
                    THUMB_SIZE,
                    THUMB_SIZE,
                    Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                    Qt.TransformationMode.SmoothTransformation,
                ),
            )
            painter.setClipping(False)
        painter.setPen(QPen(QColor(t.border), 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRoundedRect(
            QRectF(0.5, 0.5, THUMB_SIZE - 1, THUMB_SIZE - 1), radio, radio
        )
        painter.end()
        self.artwork.setPixmap(out)

    def refresh(self, theme=None) -> None:
        """Recolorea la fila. Acepta un tema para poder probarla sin la app."""
        t = theme or th.active()
        job = self.job

        color = t.danger if job.status is JobStatus.FAILED else t.text
        self.title.setStyleSheet(f"color: {color}; font-size: 13px; font-weight: 600;")
        if self.ordinal is not None:
            self.ordinal.setStyleSheet(
                f"color: {t.text_muted}; font-size: 13px; font-weight: 700;"
                " background: transparent;"
            )

        # La franja izquierda se colorea por estado (QSS). El cambio de
        # propiedad obliga a repintar la hoja de estilo.
        accent = _ACCENT.get(job.status, "pending")
        if accent != self.property("status"):
            self.setProperty("status", accent)
            self.style().unpolish(self)
            self.style().polish(self)

        # Se conserva la propiedad `failed`, que otras vistas leen.
        failed = job.status is JobStatus.FAILED
        if failed != self.property("failed"):
            self.setProperty("failed", failed)

        if job.status is JobStatus.FAILED:
            self.detail.setText(job.error)
        elif job.status.is_active and not job.is_indeterminate:
            self.detail.setText(f"{job.progress_percent}% · {job.speed}".strip(" ·"))
        elif job.status.is_active:
            self.detail.setText(job.speed)
        else:
            self.detail.setText("")

        # La barra se mantiene visible en todos los estados (pista vacia si no
        # aplica) para que las filas compartan la misma geometria.
        if job.is_indeterminate and job.status.is_active:
            self.progress.setRange(0, 0)
        else:
            self.progress.setRange(0, 100)
            self.progress.setValue(max(0, job.progress_percent))

        self.progress.setObjectName(
            "ProgressInverted" if job.status is JobStatus.DONE else "Progress"
        )
        self.progress.style().polish(self.progress)

        self.title.setText(f"{_shorten(job.title, 52)}")
        self.meta.setText(_meta_text(job))
        self.badge.setObjectName(_BADGE.get(job.status, "BadgePending"))
        self.badge.setText(_STATUS_TEXT.get(job.status, ""))
        self.badge.style().unpolish(self.badge)
        self.badge.style().polish(self.badge)
        tooltip_info = f"Formato: {job.audio_format.label}"
        if job.error:
            tooltip_info += f"\nError: {job.error}"
        elif job.filepath:
            tooltip_info += f"\nArchivo: {job.filepath}"
        self.badge.setToolTip(tooltip_info)

        # Solo tiene sentido volver a intentar lo que se puede repetir: un fallo
        # o una cancelacion. Un trabajo que termino bien ya esta.
        self.retry_button.setVisible(
            job.status in (JobStatus.FAILED, JobStatus.CANCELLED)
        )

        self._paint_artwork()


def _meta_text(job: DownloadJob) -> str:
    """Linea secundaria: artista, formato y duracion."""
    chunks: list[str] = []
    if job.artist:
        chunks.append(job.artist)
    chunks.append(_format_tag(job))
    if job.result.duration:
        chunks.append(job.result.duration_text)
    return "  ·  ".join(chunk for chunk in chunks if chunk)


def _format_tag(job: DownloadJob) -> str:
    fmt = job.audio_format
    if fmt.is_video and fmt.height:
        return f"[{fmt.height}p]"
    if fmt.is_video:
        return "[VIDEO]"
    return f"[{fmt.extension.upper()}]"


def _shorten(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1]}…"


class QueuePage(Page):
    """Sigue las descargas y permite cancelar o limpiar lo terminado."""

    # La vista se limpia sola; quien escuche esto saca los trabajos del gestor.
    # Estaba conectado dos veces al mismo boton, una aca y otra en MainWindow.
    clear_requested = Signal()
    # El estado vacio ofrece saltar a Buscar, que es de donde se encola.
    search_requested = Signal()
    # La vista no puede matar procesos: solo avisa y el MainWindow cancela.
    cancel_requested = Signal()
    # Reintento de una sola fila, con el trabajo que se quiere repetir.
    retry_one_requested = Signal(object)  # DownloadJob
    retry_requested = Signal()
    # El historial es persistente: la pagina solo avisa que lo quieren abrir.
    history_requested = Signal()

    def __init__(self, parent=None):
        super().__init__("Cola", "Tus descargas en curso y terminadas", parent)
        self._rows: dict[int, JobRow] = {}
        # El numero no se recalcula al limpiar: si encolaste 10 y 5 terminaron,
        # ver "6, 7, 8" dice exactamente cuales quedan.
        self._enqueued = 0
        self.thumbnails = ThumbnailLoader(self)
        self.thumbnails.loaded.connect(self._on_thumbnail)
        self._build_controls()
        self._message = MessageBlock(
            "Las descargas que encoles desde Buscar van a aparecer acá, "
            "con su progreso y su estado."
        )
        self._message.set_title("Todavía no hay descargas")
        self._message.set_icon("cloud-download")
        self._message.set_action("Buscar música", icon="search")
        self._message.action_clicked.connect(self.search_requested)
        self._message.set_secondary_action("Ver historial", icon="clock")
        self._message.secondary_clicked.connect(self.history_requested)
        self.content.addWidget(self._message)
        # Arranca vacia: la cabecera de resumen recien aparece con trabajos.
        self._sync_stats()

    def _build_controls(self) -> None:
        controles = QWidget()
        controles.setObjectName("QueueControls")
        controles.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        controles.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        bar = QHBoxLayout(controles)
        bar.setContentsMargins(16, 12, 16, 12)
        bar.setSpacing(10)

        self.stats = QLabel("")
        self.stats.setObjectName("QueueStats")
        bar.addWidget(self.stats, 1)

        self.cancel_button = TextButton("Cancelar descargas", "danger", icon="close")
        self.cancel_button.clicked.connect(self._on_cancel_clicked)
        self.cancel_button.setEnabled(False)
        bar.addWidget(self.cancel_button, 0)

        self.retry_button = TextButton("Reintentar errores", "accent", icon="refresh-cw")
        self.retry_button.clicked.connect(self.retry_requested)
        self.retry_button.setEnabled(False)
        bar.addWidget(self.retry_button, 0)

        self.clear_button = TextButton("Limpiar terminados", "ghost", icon="trash")
        self.clear_button.clicked.connect(self._on_clear_clicked)
        self.clear_button.setEnabled(False)
        bar.addWidget(self.clear_button, 0)

        self.history_button = TextButton("Historial", "ghost", icon="clock")
        self.history_button.clicked.connect(self.history_requested)
        bar.addWidget(self.history_button, 0)

        self.content.addWidget(controles)
        self._controls = controles

    def shutdown(self) -> None:
        """Corta las miniaturas en vuelo antes de cerrar la ventana."""
        self.thumbnails.shutdown()

    def _on_clear_clicked(self) -> None:
        """Un solo camino: limpia la vista y avisa para que se vacie el gestor."""
        self.clear_finished()
        self.clear_requested.emit()

    def _on_cancel_clicked(self) -> None:
        """Pide cancelar todo lo pendiente y en curso, sin tocar los procesos."""
        self.cancel_requested.emit()

    def add_job(self, job: DownloadJob) -> None:
        self._message.setVisible(False)
        self._enqueued += 1
        row = JobRow(job, self._enqueued)
        row.retry_requested.connect(self._on_retry_one)
        self._rows[id(job)] = row
        self.content.insertWidget(self.content.count() - 1, row)
        self._request_thumbnail(job, row)
        self._sync_buttons()
        self._sync_stats()

    def _request_thumbnail(self, job: DownloadJob, row: JobRow) -> None:
        url = job.result.thumbnail
        if not url:
            return
        target = cache_path(url)
        if target.exists():
            pixmap = QPixmap(str(target))
            if not pixmap.isNull():
                row.set_thumbnail(pixmap)
                return
        self.thumbnails.request(url, target)

    def _on_thumbnail(self, url: str, pixmap: QPixmap) -> None:
        for row in self._rows.values():
            if row.job.result.thumbnail == url:
                row.set_thumbnail(pixmap)

    def _on_retry_one(self, job: DownloadJob) -> None:
        """Pide reintentar un solo trabajo; el gestor decide y avisa del estado."""
        self.retry_one_requested.emit(job)

    def refresh_job(self, job: DownloadJob) -> None:
        row = self._rows.get(id(job))
        if row is not None:
            row.refresh()
        # El estado pudo cambiar a "listo" o "error": el resumen tiene que seguir.
        self._sync_buttons()
        self._sync_stats()

    def clear_finished(self) -> None:
        for key, row in list(self._rows.items()):
            if row.job.status.is_finished:
                self._rows.pop(key)
                self.content.removeWidget(row)
                row.deleteLater()

        if not self._rows:
            self._message.setVisible(True)
        self._sync_buttons()
        self._sync_stats()

    def _sync_stats(self) -> None:
        """'3 listas de 7 · 1 con error' para saber cuantas descargas terminó."""
        # La cabecera solo tiene sentido con trabajos: en la cola vacia estorba.
        self._controls.setVisible(bool(self._rows))
        if not self._rows:
            self.stats.setText("")
            return

        counts: dict[JobStatus, int] = {}
        for row_index in self._rows.values():
            state = row_index.job.status
            counts[state] = counts.get(state, 0) + 1

        lists = counts.get(JobStatus.DONE, 0)
        total = len(self._rows)

        chunks = [f"{lists} lista{'s' if lists != 1 else ''} de {total}"]

        failed = counts.get(JobStatus.FAILED, 0)
        if failed:
            chunks.append(f"{failed} con error")

        saltadas = counts.get(JobStatus.SKIPPED, 0)
        if saltadas:
            # "1 ya estaba" / "3 ya estaban": el verbo concuerda con la cantidad.
            chunks.append(f"{saltadas} ya estaba{'n' if saltadas != 1 else ''}")

        self.stats.setText(" · ".join(chunks))

    def _sync_buttons(self) -> None:
        self._sync_clear_button()
        self._sync_cancel_button()
        self.retry_button.setEnabled(
            any(
                row.job.status in (JobStatus.FAILED, JobStatus.CANCELLED)
                for row in self._rows.values()
            )
        )

    def refresh(self) -> None:
        """Recolorea las filas tras un cambio de tema.

        Cada fila pinta su titulo con estilos en linea, y sin esto quedaban con
        el color del tema con el que se construyeron. Se ve al arrancar con la
        cola guardada: las filas se crean antes de aplicar el tema.
        """
        for row in self._rows.values():
            row.refresh()
        self._message.refresh()
        self._sync_buttons()
        self._sync_stats()

    def _sync_clear_button(self) -> None:
        """El botón solo sirve si hay algo terminado que sacar."""
        self.clear_button.setEnabled(
            any(row.job.status.is_finished for row in self._rows.values())
        )

    def _sync_cancel_button(self) -> None:
        """El botón solo sirve si hay algo pendiente o en curso."""
        self.cancel_button.setEnabled(
            any(
                row.job.status is JobStatus.PENDING or row.job.status.is_active
                for row in self._rows.values()
            )
        )
