"""Ventana de resumen cuando se vacia la cola de descargas."""

from __future__ import annotations

from PySide6.QtCore import QPointF, Qt, Signal
from PySide6.QtGui import QPainter
from PySide6.QtWidgets import QDialog, QHBoxLayout, QLabel, QVBoxLayout, QWidget

from ...core.models import (
    DownloadSummary,
    text_summary_downloads,
)
from .. import sakura
from .. import theme as th
from ..theme import tint
from .buttons import TextButton

PETALOS = sakura.PETALOS


class BlossomSeal(QWidget):
    """Sello de flor de cerezo dibujado con el acento del tema activo.

    La geometria vive en `sakura.paint`, que es la misma que usan la marca del
    lateral y el icono de la ventana.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedSize(104, 104)
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)

    def paintEvent(self, event) -> None:
        t = th.active()
        pintor = QPainter(self)
        sakura.paint(
            pintor,
            QPointF(self.width() / 2, self.height() / 2),
            37.0,
            petalos=tint(t.surface, t.accent, 0.62),
            border=tint(t.accent, t.bg, 0.18),
            thickness_border=1.5,
            center_color=t.accent,
            center_border=t.bg,
            halo=tint(t.surface_alt, t.accent, 0.42),
            caidos=True,
        )
        pintor.end()

    def refresh(self) -> None:
        self.update()


class CompletionDialog(QDialog):
    """Resumen final de un lote de descargas ya terminadas."""

    queue_requested = Signal()

    def __init__(self, summary: DownloadSummary, parent=None):
        super().__init__(parent)
        self._summary = summary
        title_text = (
            "Descargas completadas"
            if not summary.failed
            else "Descargas terminadas"
        )

        self.setWindowTitle(title_text)
        self.setModal(True)
        self.setMinimumWidth(480)

        root = QVBoxLayout(self)
        root.setContentsMargins(24, 22, 24, 22)
        root.setSpacing(16)

        encabezado = QHBoxLayout()
        encabezado.setSpacing(16)
        text_value = QVBoxLayout()
        text_value.setSpacing(6)

        self.title_text = QLabel(title_text)
        self.title_text.setObjectName("PageHeader")
        self.title_text.setWordWrap(True)
        text_value.addWidget(self.title_text)

        self.subtitle = QLabel(
            "Tu música ya está en la biblioteca."
            if not summary.failed
            else "Algunas no llegaron: revisá la cola para ver el motivo."
        )
        self.subtitle.setObjectName("PageSubtitle")
        self.subtitle.setWordWrap(True)
        text_value.addWidget(self.subtitle)
        text_value.addStretch(1)

        encabezado.addLayout(text_value, 1)
        self.seal = BlossomSeal(self)
        encabezado.addWidget(self.seal, 0, Qt.AlignmentFlag.AlignTop)
        root.addLayout(encabezado)

        card = QWidget()
        card.setObjectName("Card")
        card.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        count_layout = QHBoxLayout(card)
        count_layout.setContentsMargins(18, 14, 18, 14)
        count_layout.setSpacing(12)

        self.count = QLabel(str(summary.downloaded))
        self.count.setObjectName("StatValue")
        count_layout.addWidget(self.count, 0, Qt.AlignmentFlag.AlignVCenter)

        tag = QLabel(
            "descargada" if summary.downloaded == 1 else "descargadas"
        )
        tag.setObjectName("StatLabel")
        count_layout.addWidget(tag, 1, Qt.AlignmentFlag.AlignVCenter)

        self.state = QLabel("Todo listo" if not summary.failed else "Con errores")
        self.state.setObjectName("BadgeDone" if not summary.failed else "BadgeFailed")
        count_layout.addWidget(self.state, 0, Qt.AlignmentFlag.AlignVCenter)
        root.addWidget(card)

        self.detail = QLabel(text_summary_downloads(summary))
        self.detail.setObjectName("Callout")
        self.detail.setWordWrap(True)
        root.addWidget(self.detail)

        buttons = QHBoxLayout()
        buttons.setSpacing(10)
        buttons.addStretch(1)
        self.view_queue = TextButton("Ver cola", "ghost")
        self.view_queue.clicked.connect(self._view_queue)
        buttons.addWidget(self.view_queue)
        self.close = TextButton("Cerrar", "accent")
        self.close.setDefault(True)
        self.close.clicked.connect(self.accept)
        buttons.addWidget(self.close)
        root.addLayout(buttons)

        self.refresh()

    def _view_queue(self) -> None:
        self.queue_requested.emit()
        self.accept()

    def refresh(self) -> None:
        self.seal.refresh()


__all__ = ["BlossomSeal", "CompletionDialog"]
