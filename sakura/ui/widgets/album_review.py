"""Revision antes de descargar un album.

La tabla existe por una razon puntual: los tags salen del catalogo y quedan
correctos elija el video que elija. Si el cruce se equivoca, el archivo sale
con metadata impecable y el audio de otra cancion, y eso no se detecta nunca.
Por eso se ve cada eleccion y su motivo antes de encolar nada.
"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QBrush, QColor
from PySide6.QtWidgets import (
    QAbstractItemView,
    QCheckBox,
    QDialog,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
)

from ...core.album_match import Match, Verdict, summary_matches
from .. import theme as th
from .buttons import TextButton

# (titulo, ancho, alineacion)
COLUMNS = (
    ("Usar", 52, Qt.AlignmentFlag.AlignCenter),
    ("Nº", 46, Qt.AlignmentFlag.AlignCenter),
    ("Pista del álbum", 240, Qt.AlignmentFlag.AlignLeft),
    ("Video elegido", 300, Qt.AlignmentFlag.AlignLeft),
    ("Duración", 90, Qt.AlignmentFlag.AlignRight),
    ("Estado", 250, Qt.AlignmentFlag.AlignLeft),
)

_BADGE = {
    Verdict.MATCHES: "BadgeDone",
    Verdict.DOUBTFUL: "BadgeActive",
    Verdict.WITHOUT_MATCH: "BadgeFailed",
}

_STATE = {
    Verdict.MATCHES: "Coincide",
    Verdict.DOUBTFUL: "Revisar",
    Verdict.WITHOUT_MATCH: "Sin match",
}

# El estado se lee en el color del tema: verde, ambar y rojo.
_COLOR = {
    Verdict.MATCHES: lambda t: t.success,
    Verdict.DOUBTFUL: lambda t: t.warning,
    Verdict.WITHOUT_MATCH: lambda t: t.danger,
}


class AlbumReviewDialog(QDialog):
    """Muestra el cruce del album y devuelve las pistas aprobadas."""

    approved = Signal(object)  # list[Match]

    def __init__(self, album: str, matches: list[Match], parent=None):
        super().__init__(parent)
        self._matches = list(matches)
        self._checks: dict[int, QCheckBox] = {}

        self.setWindowTitle(f"Revisar álbum · {album}" if album else "Revisar álbum")
        self.setModal(True)
        self.resize(1040, 620)

        self._build(album)
        self.refresh()

    # --- interfaz -----------------------------------------------------------

    def _build(self, album: str) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(22, 18, 22, 18)
        root.setSpacing(14)

        texts = QVBoxLayout()
        texts.setSpacing(4)
        self.title_text = QLabel(album or "Álbum")
        self.title_text.setObjectName("PageHeader")
        self.title_text.setWordWrap(True)
        texts.addWidget(self.title_text)

        self.subtitle = QLabel(
            "Cada fila dice qué video se eligió y por qué. Revisá las dudosas: "
            "los tags salen del catálogo y no avisan si el audio está equivocado."
        )
        self.subtitle.setObjectName("PageSubtitle")
        self.subtitle.setWordWrap(True)
        texts.addWidget(self.subtitle)
        root.addLayout(texts)

        self.table = QTableWidget(len(self._matches), len(COLUMNS))
        self.table.setHorizontalHeaderLabels([name_text for name_text, _, _ in COLUMNS])
        self.table.verticalHeader().setVisible(False)
        self.table.setAlternatingRowColors(True)
        self.table.setShowGrid(False)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setWordWrap(False)
        for idx, (_, width, _) in enumerate(COLUMNS):
            self.table.setColumnWidth(idx, width)
            if idx == 2:
                header = self.table.horizontalHeader()
                header.setSectionResizeMode(idx, QHeaderView.ResizeMode.Stretch)
        root.addWidget(self.table, 1)

        self.summary = QLabel("")
        self.summary.setObjectName("Callout")
        root.addWidget(self.summary)

        root.addLayout(self._footer())

    def _footer(self) -> QHBoxLayout:
        footer = QHBoxLayout()
        footer.setSpacing(10)

        self.all = TextButton("Marcar todas", "ghost", icon="check")
        self.all.clicked.connect(lambda: self._mark_all(True))
        footer.addWidget(self.all)

        self.ninguna = TextButton("Desmarcar", "ghost", icon="close")
        self.ninguna.clicked.connect(lambda: self._mark_all(False))
        footer.addWidget(self.ninguna)

        footer.addStretch(1)

        self.cancel = TextButton("Cancelar", "ghost", icon="close")
        self.cancel.clicked.connect(self.reject)
        footer.addWidget(self.cancel)

        self.confirmar = TextButton("Descargar lo elegido", "accent", icon="cloud-download")
        self.confirmar.setDefault(True)
        self.confirmar.clicked.connect(self._confirmar)
        footer.addWidget(self.confirmar)
        return footer

    # --- contenido ----------------------------------------------------------

    def refresh(self) -> None:
        self.table.setRowCount(len(self._matches))
        self._checks.clear()

        for row_index, match in enumerate(self._matches):
            check = QCheckBox(self.table)
            check.setChecked(match.verdict is not Verdict.WITHOUT_MATCH)
            check.toggled.connect(self._update_confirmar)
            self._checks[row_index] = check
            self.table.setCellWidget(row_index, 0, check)

            number = match.candidate.track_number or str(row_index + 1)
            self._text(row_index, 1, number)

            artist_name = match.candidate.artist
            self._text(
                row_index,
                2,
                (
                    f"{artist_name} — {match.candidate.title}"
                    if artist_name
                    else match.candidate.title
                ),
            )

            self._text(row_index, 3, match.video.title if match.video else "—")
            self._text(
                row_index,
                4,
                f"{match.video.duration_text} / {match.candidate.duration_text}"
                if match.video
                else "",
            )

            state = QTableWidgetItem(f"{_STATE[match.verdict]} · {match.reason}")
            state.setToolTip(match.reason)
            self._set_state(row_index, state, match.verdict)

        self.summary.setText(summary_matches(self._matches))
        self._update_confirmar()

    def _text(self, row_index: int, col_index: int, text_value: str) -> None:
        item = QTableWidgetItem(text_value)
        item.setTextAlignment(COLUMNS[col_index][2])
        if col_index in (1, 2, 3, 4):
            item.setToolTip(text_value)
        self.table.setItem(row_index, col_index, item)

    def _set_state(self, row_index: int, item: QTableWidgetItem, verdict: Verdict) -> None:
        item.setTextAlignment(COLUMNS[5][2])
        item.setForeground(QBrush(QColor(_COLOR[verdict](th.active()))))
        self.table.setItem(row_index, 5, item)

    # --- acciones ------------------------------------------------------------

    def _mark_all(self, value: bool) -> None:
        for row_index, match in enumerate(self._matches):
            check = self._checks.get(row_index)
            if check is None or match.verdict is Verdict.WITHOUT_MATCH:
                continue
            check.setChecked(value)
        self._update_confirmar()

    def approved_tracks(self) -> list[Match]:
        """Las pistas marcadas que ademas tienen un video elegido."""
        chosen = []
        for row_index, match in enumerate(self._matches):
            check = self._checks.get(row_index)
            if check is not None and check.isChecked() and match.is_bueno:
                chosen.append(match)
        return chosen

    def _update_confirmar(self) -> None:
        self.confirmar.setEnabled(bool(self.approved_tracks()))

    def _confirmar(self) -> None:
        chosen = self.approved_tracks()
        if not chosen:
            return
        self.approved.emit(chosen)
        self.accept()


def open_review(album: str, matches: list[Match], parent=None) -> list[Match]:
    """Muestra la tabla y devuelve lo aprobado, o lista vacia si se cancela."""
    dialog = AlbumReviewDialog(album, matches, parent)
    dialog.exec()
    dialog.deleteLater()
    if dialog.result() != QDialog.DialogCode.Accepted:
        return []
    return dialog.approved_tracks()


__all__ = ["AlbumReviewDialog", "open_review"]