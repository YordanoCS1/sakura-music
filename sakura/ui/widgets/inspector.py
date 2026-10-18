"""Panel inspector: la cola de descargas siempre a la vista."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QFrame,
    QHBoxLayout,
    QLabel,
    QProgressBar,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ...core.models import DownloadJob, JobStatus
from .. import theme as th

# Ancho fijo del panel: es una columna de seguimiento, no compite con la pagina.
INSPECTOR_W = 320

# Solo lo que esta vivo o fallo: lo terminado ya no necesita seguimiento.
_OCULTOS = frozenset({JobStatus.DONE, JobStatus.SKIPPED})

# Mapea cada estado a su clase de badge y a su texto (igual que la cola).
_BADGE = {
    JobStatus.PENDING: "BadgePending",
    JobStatus.DOWNLOADING: "BadgeActive",
    JobStatus.CONVERTING: "BadgeActive",
    JobStatus.DONE: "BadgeDone",
    JobStatus.FAILED: "BadgeFailed",
    JobStatus.CANCELLED: "BadgePending",
    JobStatus.SKIPPED: "BadgeDone",
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

_BADGE_W = 96


def _shorten(text: str, limit: int) -> str:
    if len(text) <= limit:
        return text
    return f"{text[: limit - 1]}…"


class InspectorJobRow(QFrame):
    """Una descarga en el panel: titulo, estado y progreso."""

    def __init__(self, job: DownloadJob, parent=None):
        super().__init__(parent)
        self.job = job
        self.setObjectName("InspectorRow")
        # Un QWidget puro ignora el fondo del QSS sin este atributo.
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)

        outer = QVBoxLayout(self)
        outer.setContentsMargins(14, 10, 14, 10)
        outer.setSpacing(7)

        row = QHBoxLayout()
        row.setSpacing(8)
        row.setContentsMargins(0, 0, 0, 0)

        self.title = QLabel(_shorten(job.title, 30))
        self.title.setToolTip(job.title)
        # Un QLabel normal pide el ancho completo del texto y empujaria el badge.
        self.title.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred)
        row.addWidget(self.title, 1)

        self.badge = QLabel("")
        self.badge.setObjectName("Badge")
        self.badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.badge.setFixedWidth(_BADGE_W)
        row.addWidget(self.badge, 0)

        outer.addLayout(row)

        self.progress = QProgressBar()
        self.progress.setTextVisible(False)
        self.progress.setFixedHeight(5)
        outer.addWidget(self.progress)

        self.refresh()

    def refresh(self, theme=None) -> None:
        """Recolorea la fila; acepta un tema para poder probarla sin la app."""
        t = theme or th.active()
        job = self.job

        color = t.danger if job.status is JobStatus.FAILED else t.text
        self.title.setStyleSheet(f"color: {color}; font-size: 12px; font-weight: 600;")

        self.badge.setObjectName(_BADGE.get(job.status, "BadgePending"))
        self.badge.setText(_STATUS_TEXT.get(job.status, ""))
        self.badge.style().unpolish(self.badge)
        self.badge.style().polish(self.badge)

        if job.is_indeterminate and job.status.is_active:
            self.progress.setRange(0, 0)
        else:
            self.progress.setRange(0, 100)
            self.progress.setValue(max(0, job.progress_percent))
        self.progress.setObjectName(
            "ProgressInverted" if job.status is JobStatus.DONE else "Progress"
        )
        self.progress.style().polish(self.progress)


class InspectorPanel(QFrame):
    """Columna derecha con las descargas que piden seguimiento."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("Inspector")
        self.setFixedWidth(INSPECTOR_W)
        self._rows: dict[int, InspectorJobRow] = {}

        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)

        title = QLabel("Descargas")
        title.setObjectName("InspectorTitle")
        title.setContentsMargins(14, 14, 14, 10)
        layout.addWidget(title)

        self._empty = QLabel("Sin descargas activas.")
        self._empty.setObjectName("InspectorEmpty")
        self._empty.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._empty.setWordWrap(True)
        self._empty.setContentsMargins(24, 24, 24, 24)
        layout.addWidget(self._empty)

        container = QWidget()
        container.setObjectName("InspectorList")
        self._list = QVBoxLayout(container)
        self._list.setContentsMargins(0, 0, 0, 0)
        self._list.setSpacing(0)
        self._list.addStretch(1)

        scroll = QScrollArea()
        scroll.setObjectName("InspectorScroll")
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setWidget(container)
        layout.addWidget(scroll, 1)
        self._scroll = scroll

    def set_jobs(self, jobs: list[DownloadJob]) -> None:
        """Sincroniza las filas con los trabajos que siguen vivos o fallaron."""
        visibles = [job for job in jobs if job.status not in _OCULTOS]
        vivos = {id(job) for job in visibles}

        for key in list(self._rows):
            if key not in vivos:
                row = self._rows.pop(key)
                self._list.removeWidget(row)
                row.deleteLater()

        for job in visibles:
            key = id(job)
            row = self._rows.get(key)
            if row is None:
                row = InspectorJobRow(job)
                self._rows[key] = row
                self._list.insertWidget(self._list.count() - 1, row)
            else:
                row.refresh()

        self._empty.setVisible(not visibles)
        self._scroll.setVisible(bool(visibles))

    def refresh(self) -> None:
        """Repinta las filas tras un cambio de tema."""
        for row in self._rows.values():
            row.refresh()
