"""Tarjeta de un resultado de busqueda con su boton de descarga y menu de calidad."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QRectF, Qt, Signal
from PySide6.QtGui import QAction, QColor, QContextMenuEvent, QPainter, QPainterPath, QPen, QPixmap
from PySide6.QtWidgets import QFrame, QHBoxLayout, QLabel, QMenu, QVBoxLayout

from ...core.formats import AUDIO_FORMATS, VIDEO_FORMATS
from ...core.models import SearchResult
from .. import icons
from .. import theme as th
from ..widgets.buttons import IconButton

THUMB_W = 76
THUMB_H = 56

# Ancho del numero de fila segun cuantos digitos tiene, para que playlists de
# 200 temas alineen igual que las de 5.
ORDINAL_W = {1: 22, 2: 28, 3: 34, 4: 42}


class ResultCard(QFrame):
    """Fila con portada panorámica, titulo, canal, duracion y opciones de descarga."""

    download_requested = Signal(object, object)  # (SearchResult, MediaFormat | None)

    def __init__(self, result: SearchResult, index: int | None = None, parent=None):
        super().__init__(parent)
        self.setObjectName("ResultCard")
        self.result = result
        self.setFixedHeight(76)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(14)

        self.ordinal: QLabel | None = None
        if index is not None:
            self.ordinal = QLabel(str(index))
            self.ordinal.setObjectName("Ordinal")
            self.ordinal.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self.ordinal.setFixedWidth(ORDINAL_W.get(len(str(index)), ORDINAL_W[4]))
            layout.addWidget(self.ordinal, 0, Qt.AlignmentFlag.AlignVCenter)

        self.thumb = QLabel()
        self.thumb.setFixedSize(THUMB_W, THUMB_H)
        self.thumb.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._set_placeholder()
        layout.addWidget(self.thumb)

        texts = QVBoxLayout()
        texts.setSpacing(3)
        texts.setContentsMargins(0, 0, 0, 0)

        self.title = QLabel(_elide_middle(result.title, 58))
        self.title.setObjectName("ResultCardTitle")
        self.title.setToolTip(result.title)

        self.meta = QLabel(f"{result.uploader} · {result.duration_text}")
        self.meta.setObjectName("ResultCardMeta")

        texts.addStretch(1)
        texts.addWidget(self.title)
        texts.addWidget(self.meta)
        texts.addStretch(1)
        layout.addLayout(texts, 1)

        btn_box = QHBoxLayout()
        btn_box.setSpacing(4)
        btn_box.setContentsMargins(0, 0, 0, 0)

        self.button = IconButton("download", "Descargar", 38)
        self.button.clicked.connect(self._on_default_download)
        btn_box.addWidget(self.button)

        self.options_button = IconButton("more-vertical", "Elegir formato y calidad", 34)
        self.options_button.clicked.connect(self._show_format_menu)
        btn_box.addWidget(self.options_button)

        layout.addLayout(btn_box, 0)

        self.refresh()

    def _on_default_download(self) -> None:
        self.download_requested.emit(self.result, None)

    def _show_format_menu(self) -> None:
        menu = self._build_format_menu()
        menu.exec(self.options_button.mapToGlobal(self.options_button.rect().bottomLeft()))

    def _build_format_menu(self) -> QMenu:
        menu = QMenu(self)

        # Sección Audio
        audio_header = QAction("Audio", menu)
        audio_header.setEnabled(False)
        menu.addAction(audio_header)

        for fmt in AUDIO_FORMATS:
            action = QAction(fmt.label, menu)
            action.triggered.connect(lambda _, f=fmt: self.download_requested.emit(self.result, f))
            menu.addAction(action)

        menu.addSeparator()

        # Sección Video
        video_header = QAction("Video (MP4)", menu)
        video_header.setEnabled(False)
        menu.addAction(video_header)

        for fmt in VIDEO_FORMATS:
            action = QAction(fmt.label, menu)
            action.triggered.connect(lambda _, f=fmt: self.download_requested.emit(self.result, f))
            menu.addAction(action)

        return menu

    def contextMenuEvent(self, event: QContextMenuEvent) -> None:
        menu = self._build_format_menu()
        menu.exec(event.globalPos())

    def _set_placeholder(self) -> None:
        t = th.active()
        out = QPixmap(THUMB_W, THUMB_H)
        out.fill(Qt.GlobalColor.transparent)
        p = QPainter(out)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setPen(Qt.PenStyle.NoPen)
        p.setBrush(QColor(t.surface_alt))
        p.drawRoundedRect(0, 0, THUMB_W, THUMB_H, 8, 8)
        p.drawPixmap(
            (THUMB_W - 20) // 2,
            (THUMB_H - 20) // 2,
            icons.render("music", t.text_muted, 20),
        )
        self._draw_duration_badge(p)
        p.end()
        self.thumb.setPixmap(out)

    def set_thumbnail(self, pixmap: QPixmap) -> None:
        if pixmap.isNull():
            self._set_placeholder()
            return
        t = th.active()
        radio = 8
        out = QPixmap(THUMB_W, THUMB_H)
        out.fill(Qt.GlobalColor.transparent)
        p = QPainter(out)
        p.setRenderHint(QPainter.RenderHint.Antialiasing)
        p.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)
        path = QPainterPath()
        path.addRoundedRect(QRectF(0, 0, THUMB_W, THUMB_H), radio, radio)
        p.setClipPath(path)
        p.drawPixmap(
            0,
            0,
            pixmap.scaled(
                THUMB_W,
                THUMB_H,
                Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                Qt.TransformationMode.SmoothTransformation,
            ),
        )
        p.setClipping(False)
        p.setPen(QPen(QColor(t.border), 1))
        p.setBrush(Qt.BrushStyle.NoBrush)
        p.drawRoundedRect(1, 1, THUMB_W - 2, THUMB_H - 2, max(1, radio - 1), max(1, radio - 1))
        self._draw_duration_badge(p)
        p.end()
        self.thumb.setPixmap(out)

    def _draw_duration_badge(self, painter: QPainter) -> None:
        dur = self.result.duration_text
        if not dur or dur == "—":
            return
        font = painter.font()
        font.setPixelSize(10)
        font.setBold(True)
        painter.setFont(font)
        fm = painter.fontMetrics()
        w = fm.horizontalAdvance(dur) + 8
        h = 16
        x = THUMB_W - w - 4
        y = THUMB_H - h - 4
        badge_path = QPainterPath()
        badge_path.addRoundedRect(QRectF(x, y, w, h), 3, 3)
        painter.fillPath(badge_path, QColor(0, 0, 0, 185))
        painter.setPen(QColor(255, 255, 255, 240))
        painter.drawText(
            QRectF(x, y, w, h),
            Qt.AlignmentFlag.AlignCenter,
            dur,
        )

    def refresh(self, theme=None) -> None:
        """Recolorea la tarjeta tras un cambio de tema.

        El titulo y el canal los pinta el QSS; el numero de fila es inline, asi
        que hay que repintarlo a mano (y por eso acepta un tema explicito).
        """
        t = theme or th.active()
        if self.ordinal is not None:
            self.ordinal.setStyleSheet(
                f"color: {t.text_muted}; font-size: 13px; font-weight: 700;"
                " background: transparent;"
            )
        self.button.refresh()
        self.options_button.refresh()


def _elide_middle(text: str, limit: int) -> str:
    """Recorta el titulo por el medio, que es donde sobra la informacion."""
    if len(text) <= limit:
        return text
    head = (limit - 1) // 2
    tail = limit - 1 - head
    return f"{text[:head]}…{text[-tail:]}"


def thumbnail_target(result: SearchResult) -> Path:
    """Archivo de cache donde debe guardarse la portada de este resultado."""
    from ..services.thumbnails import cache_path

    return cache_path(result.thumbnail) if result.thumbnail else Path()