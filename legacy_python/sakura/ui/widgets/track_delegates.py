"""Delegates de pintado de la biblioteca: tarjetas, discos y carrusel."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QModelIndex, QPointF, QRectF, QSize, Qt
from PySide6.QtGui import (
    QColor,
    QFontMetrics,
    QPainter,
    QPainterPath,
    QPen,
    QPixmap,
    QRadialGradient,
)
from PySide6.QtWidgets import QStyle, QStyledItemDelegate, QStyleOptionViewItem

from ...core.library import Track
from .. import theme as th
from ..covers import CoverCache, folder_cover, render_cover


def _active_theme(delegate) -> th.Theme:
    """Usa la paleta propia de Biblioteca cuando el delegate tiene una."""
    return getattr(delegate, "library_theme", None) or th.active()


class TrackGridDelegate(QStyledItemDelegate):
    """Renderiza cada pista como una tarjeta moderna con portada, título y artista."""

    CARD_WIDTH = 168
    CARD_HEIGHT = 228
    COVER_SIZE = 144

    def __init__(self, parent=None):
        super().__init__(parent)
        self._scale: float = 1.0
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def set_scale(self, factor: float) -> None:
        self._scale = max(0.65, min(1.8, factor))

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._folder_covers.clear()

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(int(self.CARD_WIDTH * self._scale), int(self.CARD_HEIGHT * self._scale))

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        t = _active_theme(self)
        rect = option.rect
        card_rect = QRectF(rect.x() + 4, rect.y() + 4, rect.width() - 8, rect.height() - 8)
        radius = float(t.radius)

        is_selected = bool(option.state & QStyle.StateFlag.State_Selected)
        is_hover = bool(option.state & QStyle.StateFlag.State_MouseOver)

        # Fondo y borde de la tarjeta
        if is_selected:
            bg_color = QColor(t.selection)
            border_color = QColor(t.accent)
            border_w = 2.0
        elif is_hover:
            bg_color = QColor(t.surface_hover)
            border_color = QColor(t.accent_hover if hasattr(t, "accent_hover") else t.accent)
            border_w = 1.0
        else:
            bg_color = QColor(t.surface_alt)
            border_color = QColor(t.border)
            border_w = 1.0

        painter.setPen(QPen(border_color, border_w))
        painter.setBrush(bg_color)
        painter.drawRoundedRect(card_rect, radius, radius)

        # Portada
        cover_size = int(self.COVER_SIZE * self._scale)
        cover_x = card_rect.x() + (card_rect.width() - cover_size) / 2
        cover_y = card_rect.y() + 8
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._folder_covers)

        cache_key = (f"{cover_path or ''}:{cover_size}", t.id)
        if cache_key in self._cover_cache:
            pixmap = self._cover_cache[cache_key]
        else:
            pixmap = render_cover(
                cover_path if cover_path and cover_path.exists() else None,
                cover_size,
                t,
            )
            if len(self._cover_cache) > 400:
                self._cover_cache.clear()
            self._cover_cache[cache_key] = pixmap

        painter.drawPixmap(int(cover_x), int(cover_y), pixmap)

        # Badge de formato en la esquina superior derecha de la carátula
        ext = track_item.extension.upper()
        if ext:
            badge_font = painter.font()
            badge_font.setPixelSize(9)
            badge_font.setBold(True)
            painter.setFont(badge_font)
            fm_badge = painter.fontMetrics()
            bw = fm_badge.horizontalAdvance(ext) + 10
            bh = 16
            bx = cover_x + cover_size - bw - 6
            by = cover_y + 6
            b_path = QPainterPath()
            b_path.addRoundedRect(QRectF(bx, by, bw, bh), 4, 4)
            painter.fillPath(b_path, QColor(0, 0, 0, 180))
            painter.setPen(QPen(QColor(255, 255, 255, 70), 1))
            painter.drawPath(b_path)
            painter.setPen(QColor(t.accent if ext in ("FLAC", "OPUS", "WAV") else "#FFFFFF"))
            painter.drawText(
                QRectF(bx, by, bw, bh),
                Qt.AlignmentFlag.AlignCenter,
                ext,
            )

        # Textos de la tarjeta
        text_x = card_rect.x() + 10
        text_w = int(card_rect.width() - 20)

        # Título
        font_title = painter.font()
        font_title.setPixelSize(12)
        font_title.setBold(True)
        painter.setFont(font_title)
        painter.setPen(QColor(t.text))
        fm_title = QFontMetrics(font_title)
        title_text = fm_title.elidedText(track_item.title, Qt.TextElideMode.ElideRight, text_w)
        title_y = int(cover_y + self.COVER_SIZE + 18)
        painter.drawText(
            int(text_x),
            title_y,
            text_w,
            16,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            title_text,
        )

        # Artista
        font_artist = painter.font()
        font_artist.setPixelSize(11)
        font_artist.setBold(False)
        painter.setFont(font_artist)
        painter.setPen(QColor(t.text_dim))
        fm_artist = QFontMetrics(font_artist)
        artist_text = fm_artist.elidedText(track_item.artist, Qt.TextElideMode.ElideRight, text_w)
        artist_y = title_y + 18
        painter.drawText(
            int(text_x),
            artist_y,
            text_w,
            15,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            artist_text,
        )

        # Duración / Formato
        font_sub = painter.font()
        font_sub.setPixelSize(10)
        font_sub.setBold(False)
        painter.setFont(font_sub)
        painter.setPen(QColor(t.text_muted))
        dur_text = f"{track_item.duration_text} · {track_item.extension.upper()}"
        dur_y = artist_y + 16
        painter.drawText(
            int(text_x),
            dur_y,
            text_w,
            14,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            dur_text,
        )

        painter.restore()


class TrackMosaicDelegate(QStyledItemDelegate):
    """Mosaico de portadas: la caratula manda y el texto queda debajo."""

    CARD_WIDTH = 158
    CARD_HEIGHT = 210

    def __init__(self, parent=None):
        super().__init__(parent)
        self._scale: float = 1.0
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def set_scale(self, factor: float) -> None:
        self._scale = max(0.65, min(1.8, factor))

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._folder_covers.clear()

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(
            int(self.CARD_WIDTH * self._scale),
            int(self.CARD_HEIGHT * self._scale),
        )

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        t = _active_theme(self)
        rect = option.rect
        card = QRectF(rect.x() + 4, rect.y() + 4, rect.width() - 8, rect.height() - 8)
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)

        if selected or hovered:
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(
                QColor(t.selection if selected else t.surface_hover)
            )
            painter.drawRoundedRect(card, float(t.radius), float(t.radius))

        cover_size = max(1, int(card.width()))
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._folder_covers)

        cache_key = (f"{cover_path or ''}:{cover_size}", t.id)
        pixmap = self._cover_cache.get(cache_key)
        if pixmap is None:
            pixmap = render_cover(
                cover_path if cover_path and cover_path.exists() else None,
                cover_size,
                t,
            )
            if len(self._cover_cache) > 400:
                self._cover_cache.clear()
            self._cover_cache[cache_key] = pixmap

        cover_rect = QRectF(card.x(), card.y(), cover_size, cover_size)
        painter.drawPixmap(int(cover_rect.x()), int(cover_rect.y()), pixmap)
        if selected:
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(QColor(t.accent), 2))
            painter.drawRoundedRect(cover_rect.adjusted(1, 1, -1, -1), t.radius, t.radius)

        ext = track_item.extension.upper()
        if ext:
            badge_font = painter.font()
            badge_font.setPixelSize(9)
            badge_font.setBold(True)
            painter.setFont(badge_font)
            fm_badge = painter.fontMetrics()
            bw = fm_badge.horizontalAdvance(ext) + 10
            bh = 16
            bx = cover_rect.right() - bw - 6
            by = cover_rect.y() + 6
            path = QPainterPath()
            path.addRoundedRect(QRectF(bx, by, bw, bh), 4, 4)
            painter.fillPath(path, QColor(0, 0, 0, 180))
            painter.setPen(QPen(QColor(255, 255, 255, 70), 1))
            painter.drawPath(path)
            painter.setPen(QColor(t.accent if ext in ("FLAC", "OPUS", "WAV") else "#FFFFFF"))
            painter.drawText(QRectF(bx, by, bw, bh), Qt.AlignmentFlag.AlignCenter, ext)

        text_x = card.x()
        text_w = int(card.width())
        title_y = cover_rect.y() + cover_size + 8

        font_title = painter.font()
        font_title.setPixelSize(max(9, int(12 * self._scale)))
        font_title.setBold(True)
        painter.setFont(font_title)
        painter.setPen(QColor(t.text))
        fm_title = QFontMetrics(font_title)
        title_text = fm_title.elidedText(
            track_item.title, Qt.TextElideMode.ElideRight, text_w
        )
        painter.drawText(
            int(text_x),
            int(title_y),
            text_w,
            max(14, int(16 * self._scale)),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            title_text,
        )

        font_artist = painter.font()
        font_artist.setPixelSize(max(8, int(10 * self._scale)))
        font_artist.setBold(False)
        painter.setFont(font_artist)
        painter.setPen(QColor(t.text_dim))
        fm_artist = QFontMetrics(font_artist)
        artist_text = fm_artist.elidedText(
            track_item.artist, Qt.TextElideMode.ElideRight, text_w
        )
        painter.drawText(
            int(text_x),
            int(title_y + 16 * self._scale),
            text_w,
            max(12, int(15 * self._scale)),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            artist_text,
        )

        painter.restore()


class AlbumShelfDelegate(QStyledItemDelegate):
    """Estanteria de albumes: una pila de fundas con su portada principal."""

    CARD_WIDTH = 190
    CARD_HEIGHT = 236
    COVER_SIZE = 154

    def __init__(self, parent=None):
        super().__init__(parent)
        self._scale: float = 1.0
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def set_scale(self, factor: float) -> None:
        self._scale = max(0.65, min(1.8, factor))

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._folder_covers.clear()

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(
            int(self.CARD_WIDTH * self._scale),
            int(self.CARD_HEIGHT * self._scale),
        )

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        group = index.data(Qt.ItemDataRole.UserRole)
        if group is None or not group.tracks:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        t = _active_theme(self)
        rect = option.rect
        card = QRectF(rect.x() + 4, rect.y() + 4, rect.width() - 8, rect.height() - 8)
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)

        if selected or hovered:
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(QColor(t.selection if selected else t.surface_hover))
            painter.drawRoundedRect(card, float(t.radius), float(t.radius))

        cover_size = max(1, int(self.COVER_SIZE * self._scale))
        cover_x = card.x() + (card.width() - cover_size) / 2
        cover_y = card.y() + 10 * self._scale
        offset = max(2, int(6 * self._scale))

        # Fundas apiladas detras de la portada principal.
        painter.setPen(QPen(QColor(t.border), 1))
        painter.setBrush(QColor(t.surface_alt))
        for depth in range(min(2, max(0, group.track_count - 1)), 0, -1):
            shift = offset * depth
            painter.drawRoundedRect(
                QRectF(
                    cover_x + shift,
                    cover_y + shift,
                    cover_size,
                    cover_size,
                ),
                float(t.radius),
                float(t.radius),
            )

        cover_path = group.cover_path
        if not cover_path:
            first_track = group.first_track
            if first_track is not None:
                cover_path = folder_cover(first_track.path.parent, self._folder_covers)

        cache_key = (f"{cover_path or ''}:{cover_size}", t.id)
        pixmap = self._cover_cache.get(cache_key)
        if pixmap is None:
            pixmap = render_cover(
                cover_path if cover_path and cover_path.exists() else None,
                cover_size,
                t,
            )
            if len(self._cover_cache) > 300:
                self._cover_cache.clear()
            self._cover_cache[cache_key] = pixmap

        cover_rect = QRectF(cover_x, cover_y, cover_size, cover_size)
        painter.drawPixmap(int(cover_x), int(cover_y), pixmap)
        if selected:
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(QColor(t.accent), 2))
            painter.drawRoundedRect(cover_rect.adjusted(1, 1, -1, -1), t.radius, t.radius)

        text_x = card.x() + 8
        text_w = int(card.width() - 16)
        title_y = cover_y + cover_size + 8 * self._scale

        font_title = painter.font()
        font_title.setPixelSize(max(9, int(12 * self._scale)))
        font_title.setBold(True)
        painter.setFont(font_title)
        painter.setPen(QColor(t.text))
        fm_title = QFontMetrics(font_title)
        title_text = fm_title.elidedText(group.title, Qt.TextElideMode.ElideRight, text_w)
        painter.drawText(
            int(text_x),
            int(title_y),
            text_w,
            max(14, int(16 * self._scale)),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            title_text,
        )

        font_artist = painter.font()
        font_artist.setPixelSize(max(8, int(10 * self._scale)))
        font_artist.setBold(False)
        painter.setFont(font_artist)
        painter.setPen(QColor(t.text_dim))
        fm_artist = QFontMetrics(font_artist)
        artist_text = fm_artist.elidedText(
            group.artist_text, Qt.TextElideMode.ElideRight, text_w
        )
        painter.drawText(
            int(text_x),
            int(title_y + 16 * self._scale),
            text_w,
            max(12, int(15 * self._scale)),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            artist_text,
        )

        meta = group.tracks_text
        if group.year:
            meta = f"{meta} · {group.year}"
        font_meta = painter.font()
        font_meta.setPixelSize(max(8, int(9 * self._scale)))
        painter.setFont(font_meta)
        painter.setPen(QColor(t.text_muted))
        fm_meta = QFontMetrics(font_meta)
        painter.drawText(
            int(text_x),
            int(title_y + 31 * self._scale),
            text_w,
            max(11, int(14 * self._scale)),
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            fm_meta.elidedText(meta, Qt.TextElideMode.ElideRight, text_w),
        )

        painter.restore()


class TrackShowcaseDelegate(QStyledItemDelegate):
    """Vista de vinilos o carrusel horizontal para las pistas."""

    def __init__(self, mode: str, parent=None):
        super().__init__(parent)
        self.mode = mode
        self.rotation = 0
        self._scale: float = 1.0
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._vinyl_cache: dict[tuple[str, str, int], QPixmap] = {}
        self._resolved_covers: dict[Path, Path | None] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def set_scale(self, factor: float) -> None:
        self._scale = max(0.65, min(1.8, factor))

    def set_rotation(self, degrees: int) -> None:
        self.rotation = degrees % 360

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._vinyl_cache.clear()
        self._resolved_covers.clear()
        self._folder_covers.clear()

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        if self.mode == "carousel":
            return QSize(int(344 * self._scale), int(190 * self._scale))
        return QSize(int(204 * self._scale), int(270 * self._scale))

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        theme = _active_theme(self)
        rect = option.rect
        card = QRectF(rect.x() + 5, rect.y() + 5, rect.width() - 10, rect.height() - 10)
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)
        fill = theme.selection if selected else (
            theme.surface_hover if hovered else theme.surface_alt
        )
        border = theme.accent if selected or hovered else theme.border
        painter.setPen(QPen(QColor(border), 2 if selected else 1))
        painter.setBrush(QColor(fill))
        painter.drawRoundedRect(card, float(theme.radius), float(theme.radius))

        if self.mode == "carousel":
            cover_size = 146
            cover_x = card.x() + 12
            cover_y = card.y() + (card.height() - cover_size) / 2
            disc_center_x = cover_x + cover_size - 3
            disc_center_y = cover_y + cover_size / 2
            self._draw_disc(painter, disc_center_x, disc_center_y, cover_size * 0.47, theme)
            self._draw_cover(painter, track_item, int(cover_x), int(cover_y), cover_size, theme)

            text_x = int(cover_x + cover_size + 14)
            text_width = max(20, int(card.right()) - text_x - 12)
            self._draw_text(
                painter,
                track_item,
                text_x,
                int(card.y() + 40),
                text_width,
                theme,
                compact=False,
            )
        else:
            cover_size = 130
            cover_y = card.y() + 12
            disc_center_x = card.center().x()
            disc_center_y = cover_y + cover_size / 2
            self._draw_disc(
                painter,
                disc_center_x,
                disc_center_y,
                cover_size / 2,
                theme,
                track_item,
            )
            self._draw_text(
                painter,
                track_item,
                int(card.x() + 12),
                int(cover_y + cover_size + 26),
                int(card.width() - 24),
                theme,
                compact=True,
            )

        painter.restore()

    def _draw_disc(
        self,
        painter: QPainter,
        x: float,
        y: float,
        radius: float,
        theme,
        track_item: Track | None = None,
    ) -> None:
        if track_item is not None:
            diameter = round(radius * 2)
            record = self._vinyl_pixmap(track_item, diameter, theme)
            painter.save()
            painter.translate(x, y)
            painter.rotate(self.rotation)
            painter.drawPixmap(-diameter // 2, -diameter // 2, record)
            painter.restore()
            painter.setPen(QPen(QColor(theme.border), 1))
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.drawEllipse(QPointF(x, y), radius - 1, radius - 1)
            return

        painter.save()
        painter.translate(x, y)
        gradient = QRadialGradient(-radius * 0.25, -radius * 0.3, radius * 1.4)
        gradient.setColorAt(0, QColor(theme.surface_hover))
        gradient.setColorAt(0.55, QColor("#25212A"))
        gradient.setColorAt(1, QColor("#09090D"))
        painter.setPen(QPen(QColor(0, 0, 0, 150), 1))
        painter.setBrush(gradient)
        painter.drawEllipse(QPointF(0, 0), radius, radius)

        for fraction, alpha in ((0.25, 65), (0.45, 50), (0.66, 42), (0.84, 35)):
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(QColor(255, 255, 255, alpha), 1))
            ring = radius * fraction
            painter.drawEllipse(QPointF(0, 0), ring, ring)

        painter.setPen(QPen(QColor(255, 255, 255, 95), max(1, radius * 0.025)))
        painter.drawLine(QPointF(radius * 0.34, 0), QPointF(radius * 0.88, 0))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(255, 255, 255, 125))
        painter.drawEllipse(QPointF(radius * 0.76, 0), radius * 0.035, radius * 0.035)

        center = radius * 0.22
        painter.setPen(QPen(QColor(theme.accent), 1))
        painter.setBrush(QColor(theme.accent))
        painter.drawEllipse(QPointF(0, 0), center, center)
        painter.setBrush(QColor("#111116"))
        painter.drawEllipse(QPointF(0, 0), max(2, center * 0.22), max(2, center * 0.22))
        painter.restore()

    def _vinyl_pixmap(self, track_item: Track, diameter: int, theme) -> QPixmap:
        cover_path = self._resolve_cover_path(track_item)
        key = (f"{track_item.path}:{cover_path or ''}", theme.id, diameter)
        cached = self._vinyl_cache.get(key)
        if cached is not None:
            return cached

        radius = diameter / 2
        pixmap = QPixmap(diameter, diameter)
        pixmap.fill(Qt.GlobalColor.transparent)
        painter = QPainter(pixmap)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        gradient = QRadialGradient(
            diameter * 0.38, diameter * 0.35, radius * 1.4
        )
        gradient.setColorAt(0, QColor(theme.surface_hover))
        gradient.setColorAt(0.55, QColor("#25212A"))
        gradient.setColorAt(1, QColor("#09090D"))
        painter.setPen(QPen(QColor(0, 0, 0, 150), 1))
        painter.setBrush(gradient)
        painter.drawEllipse(QPointF(radius, radius), radius, radius)

        cover = self._cover_pixmap(track_item, diameter, theme)
        clip = QPainterPath()
        clip.addEllipse(QPointF(radius, radius), radius - 1, radius - 1)
        painter.save()
        painter.setClipPath(clip)
        painter.drawPixmap(0, 0, cover)
        painter.restore()

        for fraction in (0.25, 0.45, 0.66, 0.84):
            painter.setBrush(Qt.BrushStyle.NoBrush)
            painter.setPen(QPen(QColor(255, 255, 255, 24), 1))
            ring = radius * fraction
            painter.drawEllipse(QPointF(radius, radius), ring, ring)

        painter.setPen(QPen(QColor(255, 255, 255, 115), max(1, radius * 0.025)))
        painter.drawLine(
            QPointF(radius + radius * 0.34, radius),
            QPointF(radius + radius * 0.88, radius),
        )
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(255, 255, 255, 125))
        painter.drawEllipse(
            QPointF(radius + radius * 0.76, radius),
            radius * 0.035,
            radius * 0.035,
        )

        center = radius * 0.10
        painter.setPen(QPen(QColor(theme.accent), 1))
        painter.setBrush(QColor(theme.surface_alt))
        painter.drawEllipse(QPointF(radius, radius), center, center)
        painter.setBrush(QColor("#111116"))
        painter.drawEllipse(
            QPointF(radius, radius), max(2, center * 0.22), max(2, center * 0.22)
        )
        painter.end()

        if len(self._vinyl_cache) >= 200:
            self._vinyl_cache.clear()
        self._vinyl_cache[key] = pixmap
        return pixmap

    def _resolve_cover_path(self, track_item: Track) -> Path | None:
        if track_item.path not in self._resolved_covers:
            cover_path = track_item.cover_path
            if not cover_path or not cover_path.exists():
                cover_path = folder_cover(track_item.path.parent, self._folder_covers)
            self._resolved_covers[track_item.path] = cover_path
        return self._resolved_covers[track_item.path]

    def _draw_cover(
        self, painter: QPainter, track_item: Track, x: int, y: int, size: int, theme
    ) -> None:
        pixmap = self._cover_pixmap(track_item, size, theme)
        painter.setPen(QPen(QColor(theme.border), 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawPixmap(x, y, pixmap)
        painter.drawRect(x, y, size, size)

    def _cover_pixmap(self, track_item: Track, size: int, theme) -> QPixmap:
        cover_path = self._resolve_cover_path(track_item)
        key = (f"{cover_path or ''}:{size}", theme.id)
        pixmap = self._cover_cache.get(key)
        if pixmap is None:
            pixmap = render_cover(
                cover_path if cover_path and cover_path.exists() else None,
                size,
                theme,
            )
            if len(self._cover_cache) >= 400:
                self._cover_cache.clear()
            self._cover_cache[key] = pixmap
        return pixmap

    @staticmethod
    def _draw_text(
        painter: QPainter,
        track_item: Track,
        x: int,
        y: int,
        width: int,
        theme,
        compact: bool,
    ) -> None:
        title_font = painter.font()
        title_font.setPixelSize(13 if compact else 15)
        title_font.setBold(True)
        painter.setFont(title_font)
        painter.setPen(QColor(theme.text))
        title = QFontMetrics(title_font).elidedText(
            track_item.title, Qt.TextElideMode.ElideRight, width
        )
        painter.drawText(x, y, width, 20, Qt.AlignmentFlag.AlignVCenter, title)

        artist_font = painter.font()
        artist_font.setPixelSize(11 if compact else 12)
        artist_font.setBold(False)
        painter.setFont(artist_font)
        painter.setPen(QColor(theme.text_dim))
        artist = QFontMetrics(artist_font).elidedText(
            track_item.artist, Qt.TextElideMode.ElideRight, width
        )
        painter.drawText(x, y + 23, width, 18, Qt.AlignmentFlag.AlignVCenter, artist)

        album_font = painter.font()
        album_font.setPixelSize(10)
        painter.setFont(album_font)
        painter.setPen(QColor(theme.text_muted))
        album = QFontMetrics(album_font).elidedText(
            track_item.album or track_item.extension.upper(), Qt.TextElideMode.ElideRight, width
        )
        painter.drawText(x, y + 44, width, 16, Qt.AlignmentFlag.AlignVCenter, album)
