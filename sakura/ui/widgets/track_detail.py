"""Panel lateral con la portada y los tags de la pista seleccionada."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QLabel, QVBoxLayout, QWidget

from ...core.library import Track
from .. import theme as th
from ..covers import CoverCache, folder_cover, render_cover


class TrackDetail(QWidget):
    """Panel lateral con la portada y los tags de la pista seleccionada."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedWidth(236)
        self._covers: dict[Path, Path | None] = CoverCache()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 4, 8, 16)
        layout.setSpacing(12)

        self.cover = QLabel()
        self.cover.setFixedSize(204, 204)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover.setObjectName("Card")
        self._show_placeholder()
        layout.addWidget(self.cover)

        self.title = QLabel("—")
        self.title.setWordWrap(True)
        self.meta = QLabel("")
        self.meta.setWordWrap(True)
        self.meta.setObjectName("PageSubtitle")

        layout.addWidget(self.title)
        layout.addWidget(self.meta)
        layout.addStretch(1)

        self.refresh()

    def _show_placeholder(self) -> None:
        self.cover.setPixmap(render_cover(None, 204))

    def set_track(self, track_item: Track | None) -> None:
        if track_item is None:
            self.title.setText("—")
            self.meta.setText("")
            self._show_placeholder()
            self.refresh()
            return

        self.title.setText(track_item.title)

        rows = [track_item.artist, track_item.album]
        if track_item.year:
            rows.append(track_item.year)
        if track_item.genre:
            rows.append(track_item.genre)
        rows.append(f"{track_item.duration_text} · {track_item.size_text}")
        rows.append(track_item.extension.upper())
        self.meta.setText("\n".join(rows))

        # Intentar cover_path asignado por el scanner; si no llega (race condition,
        # pista recién descargada), buscar la imagen de carpeta en tiempo real.
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._covers)

        if cover_path and cover_path.exists():
            pixmap = render_cover(cover_path, 204)
            if not pixmap.isNull():
                self.cover.setPixmap(pixmap)
                self.refresh()
                return

        self._show_placeholder()
        self.refresh()


    def refresh(self) -> None:
        t = th.active()
        self.title.setStyleSheet(
            f"color: {t.text}; font-size: 15px; font-weight: 700; background: transparent;"
        )
        self.meta.setStyleSheet(
            f"color: {t.text_muted}; font-size: 12px; background: transparent;"
        )


