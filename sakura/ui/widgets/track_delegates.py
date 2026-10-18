"""Delegates de pintado de la biblioteca: tarjetas, discos y carrusel."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QModelIndex, QPointF, QRectF, QSize, Qt
from PySide6.QtGui import (
    QColor,
    QFont,
    QFontMetrics,
    QLinearGradient,
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


class TrackGridDelegate(QStyledItemDelegate):
    """Renderiza cada pista como una tarjeta moderna con portada, título y artista."""

    CARD_WIDTH = 168
    CARD_HEIGHT = 228
    COVER_SIZE = 144

    def __init__(self, parent=None):
        super().__init__(parent)
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._folder_covers.clear()

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(self.CARD_WIDTH, self.CARD_HEIGHT)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        t = th.active()
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
        cover_x = card_rect.x() + (card_rect.width() - self.COVER_SIZE) / 2
        cover_y = card_rect.y() + 8
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._folder_covers)

        cache_key = (str(cover_path) if cover_path else "", t.id)
        if cache_key in self._cover_cache:
            pixmap = self._cover_cache[cache_key]
        else:
            pixmap = render_cover(
                cover_path if cover_path and cover_path.exists() else None, self.COVER_SIZE
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
            bx = cover_x + self.COVER_SIZE - bw - 6
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


class TrackShowcaseDelegate(QStyledItemDelegate):
    """Vista de vinilos o carrusel horizontal para las pistas."""

    def __init__(self, mode: str, parent=None):
        super().__init__(parent)
        self.mode = mode
        self.rotation = 0
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._vinyl_cache: dict[tuple[str, str, int], QPixmap] = {}
        self._resolved_covers: dict[Path, Path | None] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def set_rotation(self, degrees: int) -> None:
        self.rotation = degrees % 360

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._vinyl_cache.clear()
        self._resolved_covers.clear()
        self._folder_covers.clear()

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        if self.mode == "carousel":
            return QSize(344, 190)
        return QSize(204, 270)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        theme = th.active()
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
                cover_path if cover_path and cover_path.exists() else None, size
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


# --- vistas nuevas: rollo, polaroid, ficha, librero y muro de posters ---------

_DIGITOS_CN = "零一二三四五六七八九"


def chapter_label(number: int) -> str:
    """Numero de capitulo en chino (1 -> '卷一', 10 -> '卷十', 21 -> '卷二十一')."""
    if number <= 0:
        return "卷"
    if number > 99:
        return f"卷{number}"
    if number <= 10:
        texto = "十" if number == 10 else _DIGITOS_CN[number]
    elif number < 20:
        texto = "十" + _DIGITOS_CN[number % 10]
    elif number % 10 == 0:
        texto = _DIGITOS_CN[number // 10] + "十"
    else:
        texto = _DIGITOS_CN[number // 10] + "十" + _DIGITOS_CN[number % 10]
    return f"卷{texto}"


class CoverCardDelegate(QStyledItemDelegate):
    """Base de las vistas de tarjetas: resuelve y cachea la portada de cada pista."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._cover_cache: dict[tuple[str, str], QPixmap] = {}
        self._folder_covers: dict[Path, Path | None] = CoverCache()

    def clear_cache(self) -> None:
        self._cover_cache.clear()
        self._folder_covers.clear()

    def _cover_path(self, track_item: Track) -> Path | None:
        cover_path = track_item.cover_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_item.path.parent, self._folder_covers)
        return cover_path

    def _cover(self, track_item: Track, size: int, theme) -> QPixmap:
        cover_path = self._cover_path(track_item)
        key = (f"{cover_path or ''}:{size}", theme.id)
        pixmap = self._cover_cache.get(key)
        if pixmap is None:
            pixmap = render_cover(
                cover_path if cover_path and cover_path.exists() else None, size
            )
            if len(self._cover_cache) >= 400:
                self._cover_cache.clear()
            self._cover_cache[key] = pixmap
        return pixmap


class TrackScrollDelegate(CoverCardDelegate):
    """Rollo de estilo chino: paisaje a tinta, portada en luna y sello."""

    CARD_W = 640
    CARD_H = 176
    COVER = 126

    def __init__(self, parent=None):
        super().__init__(parent)
        self._phase = 0

    def set_phase(self, phase: int) -> None:
        self._phase = phase % 720

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(self.CARD_W, self.CARD_H)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        theme = th.active()
        rect = option.rect
        width = float(min(self.CARD_W, max(360, rect.width() - 48)))
        card = QRectF(
            rect.center().x() - width / 2,
            rect.y() + (rect.height() - self.CARD_H) / 2,
            width,
            self.CARD_H,
        )
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)
        radius = float(theme.radius_sm)

        fill = theme.selection if selected else (
            theme.surface_hover if hovered else theme.surface_alt
        )
        if selected:
            borde = QPen(QColor(theme.accent), 2)
        elif hovered:
            color = QColor(theme.accent)
            color.setAlpha(150)
            borde = QPen(color, 1)
        else:
            borde = QPen(QColor(theme.border), 1)
        painter.setPen(borde)
        painter.setBrush(QColor(fill))
        painter.drawRoundedRect(card, radius, radius)

        # Paisaje a tinta tras el texto, recortado al panel.
        card_path = QPainterPath()
        card_path.addRoundedRect(card, radius, radius)
        painter.save()
        painter.setClipPath(card_path)
        self._ink_mountains(
            painter,
            QRectF(card.x() + card.width() * 0.42, card.y(), card.width() * 0.58, card.height()),
            theme.text,
            selected or hovered,
        )
        sheen = card.x() + ((self._phase * 7) % (card.width() + 320)) - 160
        grad = QLinearGradient(sheen - 95, card.y(), sheen + 95, card.bottom())
        grad.setColorAt(0.0, QColor(255, 255, 255, 0))
        grad.setColorAt(0.5, QColor(255, 255, 255, 12))
        grad.setColorAt(1.0, QColor(255, 255, 255, 0))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(grad)
        painter.drawRect(card)
        painter.restore()

        # Portada en luna (月洞门): circulo con doble anillo.
        d = self.COVER
        cx = card.x() + 38
        cy = card.y() + (card.height() - d) / 2
        center = QPointF(cx + d / 2, cy + d / 2)
        painter.save()
        clip = QPainterPath()
        clip.addEllipse(center, d / 2, d / 2)
        painter.setClipPath(clip)
        painter.drawPixmap(int(cx), int(cy), self._cover(track_item, d, theme))
        painter.restore()
        painter.setPen(QPen(QColor(theme.accent), 2))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawEllipse(center, d / 2, d / 2)
        ring = QColor(theme.border)
        painter.setPen(QPen(ring, 1))
        painter.drawEllipse(center, d / 2 - 4, d / 2 - 4)

        self._draw_text_block(
            painter, theme, track_item, card, index, cx + d + 30, selected, hovered
        )
        self._draw_seal(
            painter, theme, QRectF(card.right() - 58, card.bottom() - 58, 34, 34), index.row() + 1
        )

        painter.restore()

    @staticmethod
    def _ink_mountains(painter: QPainter, rect: QRectF, ink: str, active: bool) -> None:
        """Silueta de montanas a tinta con degradado, al fondo del panel."""
        painter.save()
        painter.setClipRect(rect)
        painter.setPen(Qt.PenStyle.NoPen)
        grad = QLinearGradient(rect.x(), rect.top(), rect.x(), rect.bottom())
        alto, bajo = (32, 84) if active else (24, 66)
        for stop, alpha in ((0.0, 0), (0.55, alto), (1.0, bajo)):
            color = QColor(ink)
            color.setAlpha(alpha)
            grad.setColorAt(stop, color)
        painter.setBrush(grad)
        path = QPainterPath()
        path.moveTo(rect.x(), rect.bottom())
        for fx, fy in (
            (0.00, 0.60),
            (0.16, 0.32),
            (0.30, 0.50),
            (0.46, 0.22),
            (0.62, 0.46),
            (0.78, 0.34),
            (1.00, 0.56),
        ):
            path.lineTo(rect.x() + fx * rect.width(), rect.y() + fy * rect.height())
        path.lineTo(rect.right(), rect.bottom())
        path.closeSubpath()
        painter.drawPath(path)
        painter.restore()

    @staticmethod
    def _draw_seal(painter: QPainter, theme, box: QRectF, number: int) -> None:
        """Sello (印章) ligeramente girado con el numero de capitulo."""
        painter.save()
        painter.translate(box.center())
        painter.rotate(-5)
        square = QRectF(-box.width() / 2, -box.height() / 2, box.width(), box.height())
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(theme.accent))
        painter.drawRoundedRect(square, 5, 5)
        inner = QColor(theme.accent_text)
        inner.setAlpha(150)
        painter.setPen(QPen(inner, 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRoundedRect(square.adjusted(3, 3, -3, -3), 3, 3)
        font = painter.font()
        font.setPixelSize(14)
        font.setBold(True)
        font.setFamily(theme.heading_family or th.SERIF_STACK)
        painter.setFont(font)
        painter.setPen(QColor(theme.accent_text))
        painter.drawText(square, Qt.AlignmentFlag.AlignCenter, str(number))
        painter.restore()

    @staticmethod
    def _draw_text_block(
        painter: QPainter,
        theme,
        track_item: Track,
        card: QRectF,
        index: QModelIndex,
        text_x: float,
        selected: bool,
        hovered: bool,
    ) -> None:
        heading = theme.heading_family or th.SERIF_STACK
        text_w = max(40, int(card.right() - text_x - 92))

        eyebrow_font = painter.font()
        eyebrow_font.setPixelSize(11)
        eyebrow_font.setBold(True)
        eyebrow_font.setFamily(heading)
        eyebrow_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 2.0)
        painter.setFont(eyebrow_font)
        painter.setPen(QColor(theme.accent))
        painter.drawText(
            int(text_x),
            int(card.y() + 36),
            text_w,
            14,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            chapter_label(index.row() + 1),
        )

        title_font = painter.font()
        title_font.setPixelSize(21)
        title_font.setBold(True)
        title_font.setFamily(heading)
        title_font.setLetterSpacing(QFont.SpacingType.AbsoluteSpacing, 0.0)
        painter.setFont(title_font)
        painter.setPen(QColor(theme.text))
        painter.drawText(
            int(text_x),
            int(card.y() + 52),
            text_w,
            28,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            QFontMetrics(title_font).elidedText(
                track_item.title, Qt.TextElideMode.ElideRight, text_w
            ),
        )

        # Pincelada bajo el titulo: crece con el foco.
        stroke_w = 128 if (selected or hovered) else 92
        ink = QColor(theme.accent)
        ink.setAlpha(255 if (selected or hovered) else 205)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(ink)
        brush = QPainterPath()
        y = card.y() + 84
        brush.moveTo(text_x, y)
        brush.lineTo(text_x + stroke_w, y)
        brush.lineTo(text_x + stroke_w, y + 3)
        brush.lineTo(text_x, y + 6)
        brush.closeSubpath()
        painter.drawPath(brush)

        artist_font = painter.font()
        artist_font.setPixelSize(13)
        artist_font.setBold(False)
        artist_font.setFamily(heading)
        painter.setFont(artist_font)
        painter.setPen(QColor(theme.text_dim))
        painter.drawText(
            int(text_x),
            int(card.y() + 94),
            text_w,
            16,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            QFontMetrics(artist_font).elidedText(
                track_item.artist, Qt.TextElideMode.ElideRight, text_w
            ),
        )

        meta = track_item.album or track_item.extension.upper()
        if track_item.year:
            meta = f"{meta} · {track_item.year}"
        meta = f"{meta} · {track_item.duration_text}"
        meta_font = painter.font()
        meta_font.setPixelSize(11)
        meta_font.setBold(False)
        painter.setFont(meta_font)
        painter.setPen(QColor(theme.text_muted))
        painter.drawText(
            int(text_x),
            int(card.y() + 116),
            text_w,
            14,
            Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
            QFontMetrics(meta_font).elidedText(
                meta, Qt.TextElideMode.ElideRight, text_w
            ),
        )


class TrackPolaroidDelegate(CoverCardDelegate):
    """Album de fotos: cada pista es una polaroid con marco claro y pie de foto."""

    CARD_W = 202
    CARD_H = 254
    FRAME = 12

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(self.CARD_W, self.CARD_H)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        theme = th.active()
        rect = option.rect
        card = QRectF(rect.x() + 8, rect.y() + 8, rect.width() - 16, rect.height() - 16)
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)

        # Sombra proyectada.
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(0, 0, 0, 70))
        painter.drawRoundedRect(card.translated(3, 4), 4, 4)

        frame_fill = theme.selection if selected else (
            theme.surface_hover if hovered else theme.surface
        )
        painter.setPen(QPen(QColor(theme.accent if selected else theme.border), 1))
        painter.setBrush(QColor(frame_fill))
        painter.drawRoundedRect(card, 4, 4)

        photo = int(card.width() - 2 * self.FRAME)
        photo_x = card.x() + self.FRAME
        photo_y = card.y() + self.FRAME
        painter.drawPixmap(int(photo_x), int(photo_y), self._cover(track_item, photo, theme))
        painter.setPen(QPen(QColor(theme.border), 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(int(photo_x), int(photo_y), photo, photo)

        caption_font = painter.font()
        caption_font.setPixelSize(12)
        caption_font.setBold(True)
        caption_font.setFamily(theme.heading_family or th.SERIF_STACK)
        painter.setFont(caption_font)
        painter.setPen(QColor(theme.text))
        caption_w = int(card.width() - 20)
        painter.drawText(
            int(card.x() + 10),
            int(photo_y + photo + 8),
            caption_w,
            22,
            Qt.AlignmentFlag.AlignCenter,
            QFontMetrics(caption_font).elidedText(
                track_item.title, Qt.TextElideMode.ElideRight, caption_w
            ),
        )

        painter.restore()


class TrackCatalogDelegate(CoverCardDelegate):
    """Ficha de catalogo: mini-portada a la izquierda y datos etiquetados."""

    CARD_W = 424
    CARD_H = 118
    COVER = 80
    LABEL_W = 62

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(self.CARD_W, self.CARD_H)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        theme = th.active()
        rect = option.rect
        card = QRectF(rect.x() + 5, rect.y() + 5, rect.width() - 10, rect.height() - 10)
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)

        fill = theme.selection if selected else (
            theme.surface_hover if hovered else theme.surface_alt
        )
        painter.setPen(
            QPen(QColor(theme.accent if selected else theme.border), 2 if selected else 1)
        )
        painter.setBrush(QColor(fill))
        painter.drawRoundedRect(card, float(theme.radius_sm), float(theme.radius_sm))

        cover_x = card.x() + 14
        cover_y = card.center().y() - self.COVER / 2
        painter.drawPixmap(int(cover_x), int(cover_y), self._cover(track_item, self.COVER, theme))
        painter.setPen(QPen(QColor(theme.border), 1))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(int(cover_x), int(cover_y), self.COVER, self.COVER)

        label_x = int(cover_x + self.COVER + 16)
        value_x = label_x + self.LABEL_W
        value_w = max(20, int(card.right() - value_x - 12))

        label_font = painter.font()
        label_font.setPixelSize(9)
        label_font.setBold(True)
        painter.setFont(label_font)
        painter.setPen(QColor(theme.text_muted))

        value_font = painter.font()
        value_font.setPixelSize(12)
        value_font.setBold(False)
        value_fm = QFontMetrics(value_font)

        rows = (
            ("TÍTULO", track_item.title),
            ("ARTISTA", track_item.artist),
            ("ÁLBUM", track_item.album or "—"),
            ("AÑO", str(track_item.year) if track_item.year else "—"),
        )
        for i, (label, value) in enumerate(rows):
            y = int(card.y() + 12 + i * 23)
            painter.setFont(label_font)
            painter.setPen(QColor(theme.text_muted))
            painter.drawText(
                label_x, y, self.LABEL_W, 18,
                Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
                label,
            )
            painter.setFont(value_font)
            painter.setPen(QColor(theme.text))
            painter.drawText(
                value_x, y, value_w, 18,
                Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter,
                value_fm.elidedText(value, Qt.TextElideMode.ElideRight, value_w),
            )

        painter.restore()


class TrackShelfDelegate(CoverCardDelegate):
    """Librero: portadas apoyadas sobre una balda continua."""

    CARD_W = 150
    CARD_H = 188
    COVER = 116
    PLANK = 7

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(self.CARD_W, self.CARD_H)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        theme = th.active()
        rect = option.rect
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        hovered = bool(option.state & QStyle.StateFlag.State_MouseOver)

        plank_y = rect.bottom() - self.PLANK - 3
        cover_x = rect.center().x() - self.COVER / 2
        cover_y = plank_y - self.COVER

        # La balda va a lo ancho del item: sin separacion entre items, las de una
        # misma fila se leen como un estante continuo.
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(theme.accent if selected else theme.border))
        painter.drawRoundedRect(
            QRectF(rect.x(), plank_y, rect.width(), self.PLANK), 3, 3
        )

        # Sombra contra la balda y luego la portada.
        painter.setBrush(QColor(0, 0, 0, 80))
        painter.drawRect(int(cover_x) + 3, int(cover_y) + 5, self.COVER, self.COVER)
        painter.drawPixmap(int(cover_x), int(cover_y), self._cover(track_item, self.COVER, theme))
        painter.setPen(
            QPen(
                QColor(theme.accent if selected or hovered else theme.border),
                2 if selected else 1,
            )
        )
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(int(cover_x), int(cover_y), self.COVER, self.COVER)

        title_font = painter.font()
        title_font.setPixelSize(11)
        title_font.setBold(True)
        title_font.setFamily(theme.heading_family or th.SERIF_STACK)
        painter.setFont(title_font)
        painter.setPen(QColor(theme.text_dim))
        title_w = int(rect.width() - 16)
        painter.drawText(
            int(rect.x() + 8),
            int(rect.y() + 4),
            title_w,
            18,
            Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter,
            QFontMetrics(title_font).elidedText(
                track_item.title, Qt.TextElideMode.ElideRight, title_w
            ),
        )

        painter.restore()


class TrackPosterDelegate(CoverCardDelegate):
    """Muro de posters: portadas grandes levemente giradas que se superponen."""

    CARD_W = 208
    CARD_H = 208
    COVER = 186

    def sizeHint(self, option: QStyleOptionViewItem, index: QModelIndex) -> QSize:
        return QSize(self.CARD_W, self.CARD_H)

    def paint(self, painter: QPainter, option: QStyleOptionViewItem, index: QModelIndex) -> None:
        track_item: Track | None = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            return

        painter.save()
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform, True)

        theme = th.active()
        selected = bool(option.state & QStyle.StateFlag.State_Selected)
        # Giro determinista: el mismo indice siempre cae en el mismo angulo.
        angle = ((index.row() * 37) % 9) - 4

        painter.translate(option.rect.center())
        painter.rotate(angle)

        cover = QRectF(-self.COVER / 2, -self.COVER / 2, self.COVER, self.COVER)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(0, 0, 0, 85))
        painter.drawRoundedRect(cover.translated(4, 5), 3, 3)
        painter.drawPixmap(cover.toRect(), self._cover(track_item, self.COVER, theme))
        painter.setPen(
            QPen(QColor(theme.accent if selected else theme.border), 3 if selected else 1)
        )
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.drawRect(cover)

        painter.restore()

