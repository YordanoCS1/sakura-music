"""Ficha de una pista: portada, metadatos y acceso al editor.

Es la ventana que aparece antes de editar. Sirve para revisar que hay en el
archivo de verdad (y no lo que suelen devolver los tags) y decidir si vale la
pena corregirlo.
"""

from __future__ import annotations

from PySide6.QtCore import (
    QEasingCurve,
    QPoint,
    QPropertyAnimation,
    QRectF,
    Qt,
    QTimer,
    QUrl,
    Signal,
)
from PySide6.QtGui import (
    QColor,
    QDesktopServices,
    QLinearGradient,
    QMouseEvent,
    QPainter,
    QPainterPath,
    QPixmap,
)
from PySide6.QtWidgets import (
    QApplication,
    QDialog,
    QFrame,
    QGraphicsDropShadowEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ...core.library import Track
from .. import theme as th
from ..covers import render_cover
from ..motion import animations_enabled
from .buttons import TextButton
from .dialog import ThemedDialog

COVER_SIZE = 288
GAP = 26


class InfoTile(QFrame):
    """Dato breve con etiqueta y valor; un clic lo copia al portapapeles."""

    clicked = Signal(str)

    def __init__(self, label: str, value: str, parent=None):
        super().__init__(parent)
        self.setObjectName("InfoTile")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setToolTip(f"Clic para copiar: {value}")

        layout = QVBoxLayout(self)
        layout.setContentsMargins(12, 8, 12, 8)
        layout.setSpacing(2)

        self.label = QLabel(label)
        self.label.setObjectName("InfoTileLabel")
        layout.addWidget(self.label)

        self.value = QLabel(value)
        self.value.setObjectName("InfoTileValue")
        self.value.setTextInteractionFlags(Qt.TextInteractionFlag.TextSelectableByMouse)
        layout.addWidget(self.value)

        self._value = value

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit(self._value)
        super().mouseReleaseEvent(event)


class CoverStage(QWidget):
    """Portada flotante con fondo desenfocado, vinilo y elevacion al pasar."""

    clicked = Signal()

    def __init__(self, size: int = COVER_SIZE, parent=None):
        super().__init__(parent)
        self._size = size
        self._artwork = QPixmap()
        self._backdrop = QPixmap()
        self._base = QPoint(14, 16)
        self.setFixedSize(size + 28, size + 40)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setToolTip("Clic para abrir la carpeta de la portada")

        self.cover = QLabel(self)
        self.cover.setObjectName("TrackInfoCover")
        self.cover.setFixedSize(size, size)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover.move(self._base)
        # El escenario recibe el mouse: el QLabel solo pinta la portada.
        self.cover.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)

        shadow = QGraphicsDropShadowEffect(self.cover)
        shadow.setBlurRadius(38)
        shadow.setOffset(0, 14)
        shadow.setColor(QColor(0, 0, 0, 120))
        self.cover.setGraphicsEffect(shadow)

        self._lift = QPropertyAnimation(self.cover, b"pos", self)
        self._lift.setDuration(140)
        self._lift.setEasingCurve(QEasingCurve.Type.OutCubic)

    def set_artwork(self, pixmap: QPixmap) -> None:
        self._artwork = QPixmap(pixmap)
        self._backdrop = self._blur(self._artwork)
        self.cover.setPixmap(pixmap)
        self.update()

    @staticmethod
    def _blur(pixmap: QPixmap) -> QPixmap:
        if pixmap.isNull():
            return QPixmap()
        # Bajar y volver a subir con suavizado da un fondo difuso barato: no
        # hace falta un QGraphicsBlurEffect para una imagen que va al 25%.
        return pixmap.scaled(
            32,
            32,
            Qt.AspectRatioMode.IgnoreAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        ).scaled(
            pixmap.size(),
            Qt.AspectRatioMode.IgnoreAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )

    def paintEvent(self, event) -> None:
        t = th.active()
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing)
        painter.setRenderHint(QPainter.RenderHint.SmoothPixmapTransform)

        rect = QRectF(0, 0, self.width(), self.height())
        path = QPainterPath()
        path.addRoundedRect(rect.adjusted(0.5, 0.5, -0.5, -0.5), t.radius + 10, t.radius + 10)
        painter.setClipPath(path)

        painter.fillPath(path, QColor(t.surface_alt))
        if not self._backdrop.isNull():
            painter.setOpacity(0.35)
            painter.drawPixmap(
                self.rect(),
                self._backdrop.scaled(
                    self.size(),
                    Qt.AspectRatioMode.KeepAspectRatioByExpanding,
                    Qt.TransformationMode.SmoothTransformation,
                ),
            )
            painter.setOpacity(1.0)

        # Vinilo asomando por detras de la portada.
        disc = QRectF(self.width() - 150, (self.height() - 220) / 2 + 10, 220, 220)
        disc_color = th.tint(t.surface_alt, t.text, 0.45)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(QColor(disc_color))
        painter.drawEllipse(disc)
        painter.setBrush(Qt.BrushStyle.NoBrush)
        for index in range(1, 6):
            painter.setPen(QColor(th.tint(t.surface_alt, disc_color, 0.45)))
            inset = index * 14
            painter.drawEllipse(disc.adjusted(inset, inset, -inset, -inset))
        painter.setPen(QColor(th.tint(t.accent, disc_color, 0.45)))
        painter.drawEllipse(disc.adjusted(88, 88, -88, -88))
        painter.setBrush(QColor(t.accent))
        painter.setPen(Qt.PenStyle.NoPen)
        painter.drawEllipse(disc.adjusted(102, 102, -102, -102))

        gradient = QLinearGradient(0, 0, 0, self.height())
        gradient.setColorAt(0, QColor(0, 0, 0, 0))
        gradient.setColorAt(0.55, QColor(0, 0, 0, 0))
        gradient.setColorAt(1, QColor(t.surface_alt))
        painter.fillRect(self.rect(), gradient)

        painter.setClipping(False)
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.setPen(QColor(th.tint(t.border, t.accent, 0.35)))
        painter.drawRoundedRect(rect.adjusted(0.5, 0.5, -0.5, -0.5), t.radius + 10, t.radius + 10)
        painter.end()

    def mouseReleaseEvent(self, event: QMouseEvent) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self.clicked.emit()
        super().mouseReleaseEvent(event)

    def enterEvent(self, event) -> None:
        if animations_enabled():
            self._lift.stop()
            self._lift.setStartValue(self.cover.pos())
            self._lift.setEndValue(self._base + QPoint(0, -5))
            self._lift.start()
        super().enterEvent(event)

    def leaveEvent(self, event) -> None:
        if animations_enabled():
            self._lift.stop()
            self._lift.setStartValue(self.cover.pos())
            self._lift.setEndValue(self._base)
            self._lift.start()
        super().leaveEvent(event)


class TrackInfoDialog(ThemedDialog):
    """Muestra la portada y los datos completos de una pista."""

    def __init__(self, track: Track, parent=None):
        self.track = track
        self.hermanas: list[Track] = []
        self._status_text = ""

        super().__init__(
            title="Información de la pista",
            eyebrow="BIBLIOTECA · FICHA",
            subtitle=track.path.name,
            parent=parent,
        )
        self._toast_timer = QTimer(self)
        self._toast_timer.setSingleShot(True)
        self._toast_timer.timeout.connect(self._restore_status)
        self.setMinimumSize(720, 540)
        self.resize(790, 580)
        self._build()
        self.refresh()

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        self.content_layout.setContentsMargins(24, 20, 24, 20)
        self.content_layout.setSpacing(GAP)

        body = QHBoxLayout()
        body.setSpacing(GAP)
        body.addWidget(self._block_cover(), 0, Qt.AlignmentFlag.AlignTop)
        body.addWidget(self._block_data(), 1)
        self.content_layout.addLayout(body, 1)

        self.show_footer(True)
        self._footer()
        self.header.subtitle.setToolTip(str(self.track.path))

    def _block_cover(self) -> QWidget:
        holder = QWidget()
        layout = QVBoxLayout(holder)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        self.stage = CoverStage(COVER_SIZE)
        self.cover = self.stage.cover
        self.stage.clicked.connect(self.open_folder)
        layout.addWidget(self.stage)

        self.file_path = QLabel("")
        self.file_path.setObjectName("MetadataPath")
        self.file_path.setWordWrap(True)
        self.file_path.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
        )
        layout.addWidget(self.file_path)

        copy = TextButton("Copiar ruta", "ghost", icon="copy")
        copy.clicked.connect(self.copy_path)
        layout.addWidget(copy)
        layout.addStretch(1)
        return holder

    def _block_data(self) -> QWidget:
        holder = QWidget()
        holder.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Preferred)

        layout = QVBoxLayout(holder)
        layout.setContentsMargins(0, 4, 0, 0)
        layout.setSpacing(10)

        self.title_text = QLabel("")
        self.title_text.setObjectName("InfoTitle")
        self.title_text.setWordWrap(True)
        layout.addWidget(self.title_text)

        self.artist_name = QLabel("")
        self.artist_name.setObjectName("InfoArtist")
        self.artist_name.setWordWrap(True)
        layout.addWidget(self.artist_name)

        self.chips_row = QHBoxLayout()
        self.chips_row.setSpacing(8)
        self.chips: dict[str, QLabel] = {}
        for key in ("album", "year", "genre"):
            chip = QLabel("")
            chip.setObjectName("InfoChip")
            chip.setVisible(False)
            self.chips[key] = chip
            self.chips_row.addWidget(chip)
        self.chips_row.addStretch(1)
        layout.addLayout(self.chips_row)

        self.line = QFrame()
        self.line.setObjectName("Divider")
        self.line.setFixedHeight(1)
        layout.addWidget(self.line)

        self.info_host = QWidget()
        self.info_grid = QGridLayout(self.info_host)
        self.info_grid.setContentsMargins(0, 0, 0, 0)
        self.info_grid.setHorizontalSpacing(10)
        self.info_grid.setVerticalSpacing(8)
        self.info_grid.setColumnStretch(0, 1)
        self.info_grid.setColumnStretch(1, 1)
        layout.addWidget(self.info_host)

        layout.addStretch(1)
        return holder

    def _footer(self) -> None:
        self.state = QLabel("")
        self.state.setObjectName("EmptyState")
        self.state.setWordWrap(True)
        self.footer_layout.addWidget(self.state, 1)

        open_folder = TextButton("Abrir carpeta", "ghost", icon="folder-open")
        open_folder.clicked.connect(self.open_folder)
        self.footer_layout.addWidget(open_folder)

        self.editar = TextButton("Editar metadatos", "accent", icon="edit")
        self.editar.clicked.connect(self._editar)
        self.footer_layout.addWidget(self.editar)

    # --- contenido ----------------------------------------------------------

    def refresh(self) -> None:
        """Vuelve a pintar todo desde el estado actual de la pista."""
        track = self.track

        self.file_path.setText(str(track.path))
        self.file_path.setToolTip(str(track.path))
        self.header.subtitle.setText(track.path.name)
        self.header.subtitle.setToolTip(str(track.path))

        self.title_text.setText(track.title)
        self.artist_name.setText(track.artist)

        chips = {
            "album": track.album if track.album and track.album != "Desconocido" else "",
            "year": track.year,
            "genre": track.genre,
        }
        for key, chip in self.chips.items():
            chip.setText(chips[key])
            chip.setVisible(bool(chips[key]))

        self._rebuild_rows()
        # `_paint_cover` deja el estado sobre si la pista tiene caratula o no.
        self._paint_cover()

    def _rows(self) -> list[tuple[str, str]]:
        track = self.track
        rows = []
        if track.number_text:
            rows.append(("Pista", track.track_number.strip() or track.number_text))
        rows.append(("Duración", track.duration_text))
        rows.append(("Formato", track.extension.upper()))
        rows.append(("Tamaño", track.size_text))
        rows.append(("Carpeta", track.folder.name))
        return rows

    def _rebuild_rows(self) -> None:
        while self.info_grid.count():
            item = self.info_grid.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

        for index, (label, value) in enumerate(self._rows()):
            tile = InfoTile(label, value)
            tile.clicked.connect(self._copy_value)
            self.info_grid.addWidget(tile, index // 2, index % 2)

    def data_text(self) -> str:
        """Todos los datos visibles, util para tests y accesibilidad."""
        chip_labels = {"album": "Álbum", "year": "Año", "genre": "Género"}
        parts = [
            f"{chip_labels[key]} {chip.text()}"
            for key, chip in self.chips.items()
            if not chip.isHidden()
        ]
        for index in range(self.info_grid.count()):
            tile = self.info_grid.itemAt(index).widget()
            if isinstance(tile, InfoTile):
                parts.extend((tile.label.text(), tile.value.text()))
        return " · ".join(part for part in parts if part)

    def _paint_cover(self) -> None:
        """Portada embebida si la hay; si no, un placeholder con nota musical."""
        destino = self.track.cover_path
        has_cover = destino is not None and destino.exists()

        ratio = self.devicePixelRatioF()
        pixmap = render_cover(
            destino if has_cover else None, round(COVER_SIZE * ratio)
        )
        pixmap.setDevicePixelRatio(ratio)
        self.stage.set_artwork(pixmap)
        self._status_text = self._origin_cover()
        self._state(self._status_text)

    def _state(self, text_value: str) -> None:
        chunks = [text_value]
        if self.track.has_lyrics:
            chunks.append(f"letra en {self.track.lyrics_path.name}")
        self.state.setText(" · ".join(chunks))

    def _restore_status(self) -> None:
        self.state.setText(self._status_text)

    def _flash(self, message_text: str) -> None:
        self.state.setText(message_text)
        self._toast_timer.start(1600)

    def _copy_value(self, value: str) -> None:
        if not value:
            return
        QApplication.clipboard().setText(value)
        self._flash(f"Copiado al portapapeles: {value}")

    def copy_path(self) -> None:
        QApplication.clipboard().setText(str(self.track.path))
        self._flash("Ruta copiada al portapapeles")

    def _origin_cover(self) -> str:
        """De donde sale la caratula: embebida, de la carpeta o ninguna."""
        from ...core.library import find_folder_cover

        destino = self.track.cover_path
        if destino is None or not destino.exists():
            return "Esta pista no tiene portada"

        folder = find_folder_cover(self.track.folder)
        if folder is not None:
            try:
                if destino.resolve() == folder.resolve():
                    return f"Portada de la carpeta ({folder.name})"
            except OSError:
                pass
        return "Portada embebida en el archivo"

    def _refresh_track(self) -> None:
        """Relee el archivo para mostrar lo que se acaba de escribir."""
        from ...config import covers_dir
        from ...core.library import (
            extract_cover,
            find_folder_cover,
            find_lyrics,
            load_track,
        )

        updated = load_track(self.track.path)
        if updated is not None:
            updated.cover_path = extract_cover(self.track.path, covers_dir())
            if updated.cover_path is None:
                updated.cover_path = find_folder_cover(self.track.folder)
            updated.lyrics_path = find_lyrics(self.track.path)
            self.track = updated
        self.refresh()

    def _editar(self) -> None:
        """Abre el editor de metadatos para esta pista."""
        from .metadata_editor import MetadataEditor

        dialog = MetadataEditor(self.track.path, self, album_tracks=self.hermanas)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self._refresh_track()
        dialog.deleteLater()

    def open_folder(self) -> None:
        """Abre la carpeta que contiene la pista."""
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(self.track.path.parent)))

    def open_cover_outside(self) -> None:
        """Muestra la portada en el explorador de archivos."""
        destino = self.track.cover_path
        if destino is None or not destino.exists():
            self._flash("No hay portada para mostrar")
            return
        QDesktopServices.openUrl(QUrl.fromLocalFile(str(destino.parent)))


def open_info(track: Track, parent=None) -> None:
    """Muestra la ficha de la pista."""
    dialog = TrackInfoDialog(track, parent)
    dialog.exec()
    dialog.deleteLater()
