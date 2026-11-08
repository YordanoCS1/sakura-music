"""Panel lateral de informacion: portada, metadatos y acciones de la pista."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt, QTimer, QUrl, Signal
from PySide6.QtGui import QDesktopServices
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ...core.library import Track
from .. import icons
from .. import theme as th
from ..covers import CoverCache, folder_cover, render_cover
from .buttons import IconButton, TextButton
from .elided import ElidedLabel

COVER_SIZE = 176


class TrackDetail(QWidget):
    """Tarjeta lateral con la portada, los metadatos y las acciones de la pista."""

    edit_requested = Signal()
    lyrics_requested = Signal()
    folder_requested = Signal()
    info_requested = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("TrackDetailPanel")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setFixedWidth(300)
        self.library_theme = None
        self._track: Track | None = None
        self._covers: dict[Path, Path | None] = CoverCache()

        # El tooltip vuelve solo a los 2 s. El timer es hijo del panel para que
        # se destruya con el; un `singleShot` con un lambda seguiria vivo y
        # tocaria un boton ya borrado si el panel se cierra antes.
        self._tooltip_timer = QTimer(self)
        self._tooltip_timer.setSingleShot(True)
        self._tooltip_timer.setInterval(2000)
        self._tooltip_timer.timeout.connect(self._restore_copy_tooltip)

        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # Scroll para garantizar que nada se corte en pantallas pequeñas
        self.scroll = QScrollArea()
        self.scroll.setObjectName("TrackDetailScroll")
        self.scroll.setWidgetResizable(True)
        self.scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        root.addWidget(self.scroll)

        self.content_widget = QWidget()
        self.content_widget.setObjectName("TrackDetailContent")
        self.content_layout = QVBoxLayout(self.content_widget)
        self.content_layout.setContentsMargins(14, 14, 14, 14)
        self.content_layout.setSpacing(10)
        self.scroll.setWidget(self.content_widget)

        # Estado vacío (cuando no hay selección)
        self._build_empty_state()

        # Cabecera: titulo del panel y estado en la biblioteca
        self.header_row = QHBoxLayout()
        self.header_row.setSpacing(6)
        self.eyebrow = QLabel("FICHA")
        self.eyebrow.setObjectName("DetailEyebrow")
        self.header_row.addWidget(self.eyebrow, 1)

        self.info_btn = IconButton("info", "Ver ficha completa", 26)
        self.info_btn.clicked.connect(self.info_requested)
        self.header_row.addWidget(self.info_btn, 0)

        self.status_pill = QLabel("En biblioteca")
        self.status_pill.setObjectName("DetailStatusPill")
        self.status_pill.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.header_row.addWidget(self.status_pill, 0)
        self.content_layout.addLayout(self.header_row)

        # Portada
        self.cover = QLabel()
        self.cover.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover.setObjectName("DetailCover")
        self._show_placeholder()
        self.content_layout.addWidget(self.cover, 0, Qt.AlignmentFlag.AlignHCenter)

        # Título y Subtítulo
        self.title = QLabel("—")
        self.title.setObjectName("DetailTitle")
        self.title.setWordWrap(True)
        self.title.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        self.content_layout.addWidget(self.title)

        self.meta = QLabel("")
        self.meta.setObjectName("DetailMeta")
        self.meta.setWordWrap(True)
        self.meta.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        self.content_layout.addWidget(self.meta)

        # Chips de formato y tamaño
        self._chips: list[QLabel] = []
        self._chips_layout = QHBoxLayout()
        self._chips_layout.setSpacing(6)
        self.content_layout.addLayout(self._chips_layout)

        self.meta_section = QLabel("METADATOS")
        self.meta_section.setObjectName("DetailSectionLabel")
        self.content_layout.addWidget(self.meta_section)

        # Grilla de propiedades técnicas
        self.prop_box = QFrame()
        self.prop_box.setObjectName("DetailPropBox")
        prop_layout = QGridLayout(self.prop_box)
        prop_layout.setContentsMargins(10, 8, 10, 8)
        prop_layout.setHorizontalSpacing(10)
        prop_layout.setVerticalSpacing(6)
        prop_layout.setColumnStretch(1, 1)

        self._lbl_year_key = QLabel("Año")
        self._lbl_year_val = ElidedLabel("—", Qt.TextElideMode.ElideRight)
        self._lbl_genre_key = QLabel("Género")
        self._lbl_genre_val = ElidedLabel("—", Qt.TextElideMode.ElideRight)
        self._lbl_track_key = QLabel("Pista")
        self._lbl_track_val = ElidedLabel("—", Qt.TextElideMode.ElideRight)
        self._lbl_lyrics_key = QLabel("Letra")
        self._lbl_lyrics_val = ElidedLabel("—", Qt.TextElideMode.ElideRight)

        prop_layout.addWidget(self._lbl_year_key, 0, 0)
        prop_layout.addWidget(self._lbl_year_val, 0, 1)
        prop_layout.addWidget(self._lbl_genre_key, 1, 0)
        prop_layout.addWidget(self._lbl_genre_val, 1, 1)
        prop_layout.addWidget(self._lbl_track_key, 2, 0)
        prop_layout.addWidget(self._lbl_track_val, 2, 1)
        prop_layout.addWidget(self._lbl_lyrics_key, 3, 0)
        prop_layout.addWidget(self._lbl_lyrics_val, 3, 1)
        for value_label in (
            self._lbl_year_val,
            self._lbl_genre_val,
            self._lbl_track_val,
            self._lbl_lyrics_val,
        ):
            value_label.setAlignment(
                Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter
            )
        self.content_layout.addWidget(self.prop_box)

        self.file_section = QLabel("ARCHIVO")
        self.file_section.setObjectName("DetailSectionLabel")
        self.content_layout.addWidget(self.file_section)

        # Bloque de ruta del archivo con acceso a carpeta y copia
        self.file_box = QFrame()
        self.file_box.setObjectName("DetailFileBox")
        path_box = QHBoxLayout(self.file_box)
        path_box.setContentsMargins(10, 6, 8, 6)
        path_box.setSpacing(4)
        self.path_label = ElidedLabel("", Qt.TextElideMode.ElideMiddle)
        self.path_label.setObjectName("DetailPathLabel")
        path_box.addWidget(self.path_label, 1)

        self.folder_btn = IconButton("folder-open", "Abrir carpeta", 26)
        self.folder_btn.clicked.connect(self._open_folder)
        path_box.addWidget(self.folder_btn, 0)

        self.copy_path_btn = IconButton("copy", "Copiar ruta completa", 26)
        self.copy_path_btn.clicked.connect(self._copy_path)
        path_box.addWidget(self.copy_path_btn, 0)
        self.content_layout.addWidget(self.file_box)

        # Acción principal
        self.edit_btn = TextButton("Editar", "accent", icon="edit")
        self.edit_btn.setToolTip("Editar metadatos")
        self.edit_btn.setProperty("compact", True)
        self.edit_btn.clicked.connect(self.edit_requested)
        self.content_layout.addWidget(self.edit_btn)

        self.lyrics_btn = TextButton("Buscar e incrustar letra", "ghost", icon="file-text")
        self.lyrics_btn.setProperty("compact", True)
        self.lyrics_btn.clicked.connect(self.lyrics_requested)
        self.content_layout.addWidget(self.lyrics_btn)
        self.content_layout.addStretch(1)

        self.set_track(None)
        self.refresh()

    def _build_empty_state(self) -> None:
        self.empty_widget = QWidget()
        empty_layout = QVBoxLayout(self.empty_widget)
        empty_layout.setContentsMargins(16, 56, 16, 24)
        empty_layout.setSpacing(12)
        empty_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.empty_icon = QLabel()
        self.empty_icon.setFixedSize(56, 56)
        self.empty_icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_layout.addWidget(self.empty_icon, 0, Qt.AlignmentFlag.AlignHCenter)

        self.empty_title = QLabel("Sin selección")
        self.empty_title.setObjectName("EmptyTitle")
        self.empty_title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_layout.addWidget(self.empty_title)

        self.empty_desc = QLabel(
            "Aquí verás la portada, los metadatos y las acciones del archivo."
        )
        self.empty_desc.setObjectName("EmptyState")
        self.empty_desc.setWordWrap(True)
        self.empty_desc.setAlignment(Qt.AlignmentFlag.AlignCenter)
        empty_layout.addWidget(self.empty_desc)

        self.content_layout.addWidget(self.empty_widget)

    def _show_placeholder(self) -> None:
        self.cover.setPixmap(
            render_cover(None, COVER_SIZE, self.library_theme or th.active())
        )

    def _open_folder(self) -> None:
        if self._track is not None and self._track.path.exists():
            folder = self._track.path.parent
            if folder.is_dir():
                QDesktopServices.openUrl(QUrl.fromLocalFile(str(folder)))
        self.folder_requested.emit()

    def _copy_path(self) -> None:
        if self._track is not None:
            QApplication.clipboard().setText(str(self._track.path))
            self.copy_path_btn.setToolTip("¡Ruta copiada al portapapeles!")
            self._tooltip_timer.start()

    def _restore_copy_tooltip(self) -> None:
        self.copy_path_btn.setToolTip("Copiar ruta completa")

    def flash_saved(self) -> None:
        """Feedback visual tras guardar cambios de metadatos en SQLite."""
        self.status_pill.setText("✓ Guardado")
        t = self.library_theme or th.active()
        self.status_pill.setStyleSheet(
            f"color: {t.accent}; background: {t.surface_hover};"
            f" border: 1px solid {t.accent}; border-radius: 9px; padding: 2px 8px;"
            f" font-weight: 700; font-size: 11px;"
        )
        QTimer.singleShot(2500, self._restore_status_pill)

    def _restore_status_pill(self) -> None:
        self.status_pill.setText("En biblioteca")
        self.status_pill.setStyleSheet("")
        self.refresh()

    def _set_chips(self, tags: list[str]) -> None:
        while self._chips_layout.count():
            item = self._chips_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()
        self._chips.clear()
        for text in tags:
            chip = QLabel(text)
            chip.setObjectName("TagChip")
            chip.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self._chips_layout.addWidget(chip)
            self._chips.append(chip)
        self._chips_layout.addStretch(1)

    def set_track(self, track_item: Track | None) -> None:
        self._track = track_item
        has_track = track_item is not None

        self.empty_widget.setVisible(not has_track)
        self.eyebrow.setVisible(has_track)
        self.status_pill.setVisible(has_track)
        self.cover.setVisible(has_track)
        self.meta_section.setVisible(has_track)
        self.prop_box.setVisible(has_track)
        self.file_section.setVisible(has_track)
        self.file_box.setVisible(has_track)
        self.edit_btn.setVisible(has_track)
        self.lyrics_btn.setVisible(has_track)
        self.folder_btn.setVisible(has_track)
        self.info_btn.setVisible(has_track)

        if track_item is None:
            self.title.setText("—")
            self.title.setVisible(False)
            self.meta.setText("")
            self.meta.setVisible(False)
            self._set_chips([])
            self._show_placeholder()
            self.path_label.setText("")
            self.lyrics_btn.setText("Buscar e incrustar letra")
            self.refresh()
            return

        self.title.setVisible(True)
        self.meta.setVisible(True)
        self.title.setText(track_item.title)

        subtitle_parts = [part for part in (track_item.artist, track_item.album) if part]
        self.meta.setText(" · ".join(subtitle_parts) or "Sin artista")

        # Chips de formato y duración
        chips = [f"[{track_item.extension.upper()}]"]
        if track_item.duration_text:
            chips.append(track_item.duration_text)
        if track_item.size_text:
            chips.append(track_item.size_text)
        self._set_chips(chips)

        # Propiedades técnicas
        self._lbl_year_val.setText(track_item.year or "—")
        self._lbl_genre_val.setText(track_item.genre or "—")
        self._lbl_track_val.setText(track_item.track_number or "—")
        self._lbl_lyrics_val.setText("✓ .lrc sincronizada" if track_item.has_lyrics else "No")
        if track_item.has_lyrics:
            self.lyrics_btn.setText("Reincrustar letra")
            self.lyrics_btn.setToolTip("Vuelve a incrustar el archivo de letra actual")
        else:
            self.lyrics_btn.setText("Buscar e incrustar letra")
            self.lyrics_btn.setToolTip("Busca la letra en LRCLIB y la incrusta en el audio")

        self.path_label.setText(track_item.path.name)
        self.path_label.setToolTip(str(track_item.path))

        # Portada
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._covers)

        if cover_path and cover_path.exists():
            pixmap = render_cover(
                cover_path, COVER_SIZE, self.library_theme or th.active()
            )
            if not pixmap.isNull():
                self.cover.setPixmap(pixmap)
                self.refresh()
                return

        self._show_placeholder()
        self.refresh()

    def refresh(self) -> None:
        t = self.library_theme or th.active()
        self.empty_icon.setPixmap(icons.render("disc", t.text_dim, 64))

        if self._track is None:
            self._show_placeholder()
        else:
            cover_path = self._track.cover_path
            if not cover_path or not cover_path.exists():
                cover_path = folder_cover(self._track.path.parent, self._covers)
            if cover_path and cover_path.exists():
                self.cover.setPixmap(render_cover(cover_path, COVER_SIZE, t))
            else:
                self._show_placeholder()

        # Estilo para las etiquetas de propiedad
        key_style = (
            f"color: {t.text_dim}; font-size: 11px; font-weight: 600; background: transparent;"
        )
        val_style = (
            f"color: {t.text}; font-size: 12px; font-weight: 600; background: transparent;"
        )
        keys = (
            self._lbl_year_key,
            self._lbl_genre_key,
            self._lbl_track_key,
            self._lbl_lyrics_key,
        )
        vals = (
            self._lbl_year_val,
            self._lbl_genre_val,
            self._lbl_track_val,
            self._lbl_lyrics_val,
        )
        for lbl in keys:
            lbl.setStyleSheet(key_style)
        for lbl in vals:
            lbl.setStyleSheet(val_style)

        chip_style = (
            f"color: {t.text_dim}; font-size: 11px;"
            f" border: 1px solid {t.border}; border-radius: 9px;"
            f" padding: 2px 8px; background: {t.surface_alt};"
        )
        for chip in self._chips:
            chip.setStyleSheet(chip_style)

        self.lyrics_btn.refresh()


__all__ = ["TrackDetail"]
