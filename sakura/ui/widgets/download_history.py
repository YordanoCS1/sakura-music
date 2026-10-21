"""Dialogo con el registro de descargas terminadas, saltadas o con error."""

from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path

from PySide6.QtCore import Qt, QUrl, Signal
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import (
    QComboBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ...core.download_history import DownloadHistory
from .buttons import IconButton, TextButton
from .dialog import ThemedDialog

_STATUS_BADGE = {
    "done": "BadgeDone",
    "failed": "BadgeFailed",
    "skipped": "BadgeDone",
    "cancelled": "BadgePending",
}

_STATUS_TEXT = {
    "done": "Descargada",
    "failed": "Con error",
    "skipped": "Ya estaba",
    "cancelled": "Cancelada",
}

_FILTERS = (
    ("all", "Todos"),
    ("done", "Descargadas"),
    ("failed", "Con error"),
    ("skipped", "Ya estaban"),
    ("cancelled", "Canceladas"),
)

_MONTHS = (
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
)


def _format_time(timestamp: str) -> str:
    """Convierte el timestamp ISO a formato legible y amigable."""
    if not timestamp:
        return ""
    try:
        dt = datetime.fromisoformat(timestamp)
        now = datetime.now(dt.tzinfo)
        if dt.date() == now.date():
            return f"Hoy, {dt.strftime('%H:%M')}"
        if dt.date() == (now - timedelta(days=1)).date():
            return f"Ayer, {dt.strftime('%H:%M')}"
        if dt.year == now.year:
            mes = _MONTHS[dt.month - 1]
            return f"{dt.day} {mes}, {dt.strftime('%H:%M')}"
        return dt.strftime("%d/%m/%Y, %H:%M")
    except Exception:
        return timestamp


class HistoryRow(QFrame):
    """Una fila del historial: titulo, meta, estado, motivo y fecha."""

    def __init__(self, entry: dict, parent=None):
        super().__init__(parent)
        self.setObjectName("HistoryRow")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Minimum)
        self.setMinimumHeight(64)
        self._entry = entry
        self._status = str(entry.get("status", ""))
        self.setProperty("status", self._status)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(12)

        self.badge = QLabel(_STATUS_TEXT.get(self._status, self._status))
        self.badge.setObjectName("Badge")
        self.badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.badge.setFixedWidth(96)
        layout.addWidget(self.badge, 0, Qt.AlignmentFlag.AlignVCenter)

        texts = QVBoxLayout()
        texts.setSpacing(3)
        texts.setContentsMargins(0, 0, 0, 0)

        top_row = QHBoxLayout()
        top_row.setSpacing(8)

        self.title = QLabel(str(entry.get("title", "")))
        self.title.setObjectName("HistoryTitle")
        self.title.setToolTip(str(entry.get("title", "")))
        self.title.setSizePolicy(QSizePolicy.Policy.Ignored, QSizePolicy.Policy.Preferred)
        top_row.addWidget(self.title, 1)

        time_str = _format_time(str(entry.get("timestamp", "")))
        self.time_label = QLabel(time_str)
        self.time_label.setObjectName("HistoryTime")
        self.time_label.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
        top_row.addWidget(self.time_label, 0)
        texts.addLayout(top_row)

        meta_parts = [
            str(entry.get("artist", "")),
            str(entry.get("audio_format", "")),
        ]
        playlist = str(entry.get("playlist_title", "")).strip()
        if playlist:
            meta_parts.append(f"Playlist: {playlist}")
        meta = "  ·  ".join(part for part in meta_parts if part)
        self.meta = QLabel(meta)
        self.meta.setObjectName("HistoryMeta")
        texts.addWidget(self.meta)

        detail = str(entry.get("error", "")) or str(entry.get("filepath", ""))
        self.detail = QLabel(detail)
        self.detail.setObjectName("HistoryDetail")
        self.detail.setProperty("error", "true" if self._status == "failed" else "false")
        self.detail.setToolTip(detail)
        self.detail.setWordWrap(True)
        self.detail.setVisible(bool(detail))
        texts.addWidget(self.detail)

        layout.addLayout(texts, 1)

        filepath = str(entry.get("filepath", "")).strip()
        if filepath and Path(filepath).is_file():
            self.folder_btn: IconButton | None = IconButton(
                "folder",
                tooltip="Abrir carpeta contenedora",
                size=32,
            )
            self.folder_btn.clicked.connect(lambda: self._open_folder(filepath))
            layout.addWidget(self.folder_btn, 0, Qt.AlignmentFlag.AlignVCenter)
        else:
            self.folder_btn = None

        self.refresh()

    def _open_folder(self, filepath: str) -> None:
        parent_dir = Path(filepath).parent
        if parent_dir.is_dir():
            QDesktopServices.openUrl(QUrl.fromLocalFile(str(parent_dir)))

    def refresh(self) -> None:
        """Recolorea la fila y el badge tras un cambio de tema."""
        self.badge.setObjectName(_STATUS_BADGE.get(self._status, "BadgePending"))
        if self.property("status") != self._status:
            self.setProperty("status", self._status)
        self.style().unpolish(self)
        self.style().polish(self)
        self.badge.style().unpolish(self.badge)
        self.badge.style().polish(self.badge)
        if self.folder_btn is not None:
            self.folder_btn.refresh()


class DownloadHistoryDialog(ThemedDialog):
    """Lista filtrable del historial de descargas."""

    cleared = Signal()

    def __init__(self, parent=None):
        super().__init__(
            title="Historial de descargas",
            eyebrow="REGISTRO",
            subtitle="Lo descargado y lo que no pudo bajar",
            parent=parent,
        )
        self.setMinimumWidth(860)
        self.setMinimumHeight(560)

        controls = QHBoxLayout()
        controls.setSpacing(10)

        self.search = QLineEdit()
        self.search.setObjectName("SearchInput")
        self.search.setPlaceholderText("Buscar por título o artista")
        self.search.setClearButtonEnabled(True)
        self.search.setMinimumHeight(38)
        controls.addWidget(self.search, 1)

        self.filter_box = QComboBox()
        self.filter_box.setObjectName("SettingsControl")
        for value, label in _FILTERS:
            self.filter_box.addItem(label, value)
        self.filter_box.setFixedWidth(190)
        controls.addWidget(self.filter_box)

        self.count = QLabel("")
        self.count.setObjectName("HistoryCount")
        controls.addWidget(self.count)

        self.scroll = QScrollArea()
        self.scroll.setObjectName("HistoryScroll")
        self.scroll.setWidgetResizable(True)
        self.scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        self.list_widget = QWidget()
        self.list_widget.setObjectName("HistoryList")
        self.rows_layout = QVBoxLayout(self.list_widget)
        self.rows_layout.setContentsMargins(0, 0, 0, 0)
        self.rows_layout.setSpacing(8)
        self.rows_layout.addStretch(1)
        self.scroll.setWidget(self.list_widget)

        self.content_layout.addLayout(controls)
        self.content_layout.addSpacing(6)
        self.content_layout.addWidget(self.scroll, 1)

        self.clear_btn = TextButton("Limpiar historial", "danger", icon="trash")
        self.clear_btn.clicked.connect(self._clear)
        self.close_btn = TextButton("Cerrar", "accent", icon="check")
        self.close_btn.setDefault(True)
        self.close_btn.clicked.connect(self.reject)
        self.footer_layout.addWidget(self.clear_btn)
        self.footer_layout.addStretch(1)
        self.footer_layout.addWidget(self.close_btn)
        self.show_footer(True)

        self.search.textChanged.connect(self._reload)
        self.filter_box.currentIndexChanged.connect(self._reload)
        self._reload()

    def _reload(self) -> None:
        entries = DownloadHistory.load()
        status_filter = self.filter_box.currentData()
        query = self.search.text().strip().lower()
        filtered = [
            entry
            for entry in entries
            if self._matches(entry, status_filter, query)
        ]

        self._clear_rows()
        if not filtered:
            empty = QLabel(
                "Todavía no hay descargas registradas."
                if not entries
                else "Ningún registro coincide con el filtro."
            )
            empty.setObjectName("EmptyState")
            empty.setAlignment(Qt.AlignmentFlag.AlignCenter)
            empty.setWordWrap(True)
            self.rows_layout.addWidget(empty)
        for entry in filtered:
            self.rows_layout.addWidget(HistoryRow(entry))

        self.rows_layout.addStretch(1)
        self.count.setText(f"{len(filtered)} de {len(entries)}")
        self.clear_btn.setEnabled(bool(entries))

    @staticmethod
    def _matches(entry: dict, status_filter: str, query: str) -> bool:
        if status_filter != "all" and str(entry.get("status", "")) != status_filter:
            return False
        if not query:
            return True
        title = str(entry.get("title", "")).lower()
        artist = str(entry.get("artist", "")).lower()
        return query in title or query in artist

    def _clear_rows(self) -> None:
        while self.rows_layout.count():
            item = self.rows_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.setParent(None)
                widget.deleteLater()

    def _clear(self) -> None:
        entries = DownloadHistory.load()
        if not entries:
            return
        confirm = QMessageBox.question(
            self,
            "Limpiar historial",
            "¿Seguro que querés borrar todo el historial de descargas?\n"
            "Esta acción no se puede deshacer.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
            QMessageBox.StandardButton.No,
        )
        if confirm == QMessageBox.StandardButton.Yes:
            DownloadHistory.clear()
            self.cleared.emit()
            self._reload()

    def refresh_theme(self) -> None:
        """Recolorea el cromo y las filas tras un cambio de tema."""
        super().refresh_theme()
        for row in self.findChildren(HistoryRow):
            row.refresh()


__all__ = ["DownloadHistoryDialog", "HistoryRow"]
