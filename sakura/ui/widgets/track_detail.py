"""Panel lateral con la portada y los tags de la pista seleccionada."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QGridLayout, QLabel, QVBoxLayout, QWidget

from ...core.library import Track
from .. import theme as th
from ..covers import CoverCache, folder_cover, render_cover

COVER_SIZE = 204


class TrackDetail(QWidget):
    """Panel lateral: portada, titulo, artista/album y chips de tags."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedWidth(236)
        self._covers: dict[Path, Path | None] = CoverCache()

        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 4, 8, 16)
        layout.setSpacing(12)

        self.cover = QLabel()
        self.cover.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover.setObjectName("DetailCover")
        self._show_placeholder()
        layout.addWidget(self.cover)

        self.title = QLabel("—")
        self.title.setObjectName("DetailTitle")
        self.title.setWordWrap(True)
        self.meta = QLabel("")
        self.meta.setWordWrap(True)
        self.meta.setObjectName("PageSubtitle")
        layout.addWidget(self.title)
        layout.addWidget(self.meta)

        self._chips = []
        self._chips_layout = QGridLayout()
        self._chips_layout.setContentsMargins(0, 0, 0, 0)
        self._chips_layout.setHorizontalSpacing(6)
        self._chips_layout.setVerticalSpacing(6)
        layout.addLayout(self._chips_layout)

        layout.addStretch(1)
        self.refresh()

    def _show_placeholder(self) -> None:
        self.cover.setPixmap(render_cover(None, COVER_SIZE))

    def _set_chips(self, tags: list[str]) -> None:
        while self._chips_layout.count():
            item = self._chips_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()
        self._chips.clear()
        for index, text in enumerate(tags):
            chip = QLabel(text)
            chip.setObjectName("TagChip")
            chip.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self._chips_layout.addWidget(chip, index // 2, index % 2)
            self._chips.append(chip)

    def set_track(self, track_item: Track | None) -> None:
        if track_item is None:
            self.title.setText("—")
            self.meta.setText("")
            self._set_chips([])
            self._show_placeholder()
            self.refresh()
            return

        self.title.setText(track_item.title)

        subtitle = " · ".join(
            part for part in (track_item.artist, track_item.album) if part
        )
        self.meta.setText(f"{subtitle}\n{track_item.extension.upper()}")

        tags = []
        if track_item.year:
            tags.append(track_item.year)
        if track_item.genre:
            tags.append(track_item.genre)
        if track_item.duration_text:
            tags.append(track_item.duration_text)
        if track_item.size_text:
            tags.append(track_item.size_text)
        self._set_chips(tags)

        # Intentar cover_path asignado por el scanner; si no llega (race condition,
        # pista recién descargada), buscar la imagen de carpeta en tiempo real.
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._covers)

        if cover_path and cover_path.exists():
            pixmap = render_cover(cover_path, COVER_SIZE)
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
        chip_style = (
            f"color: {t.text_dim}; font-size: 11px;"
            f" border: 1px solid {t.border}; border-radius: 9px;"
            f" padding: 3px 8px; background: {t.surface_alt};"
        )
        for chip in self._chips:
            chip.setStyleSheet(chip_style)
