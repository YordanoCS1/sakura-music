"""Previsualizacion de portada al pasar el mouse sobre una pista.

Es un popup flotante (sin bordes, siempre encima) que se posiciona cerca del
cursor y muestra la portada de la pista seleccionada. Ideal para el descubrimiento
visual en la biblioteca: el usuario ve la caratula sin tener que hacer clic.
"""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QPoint, Qt, QTimer
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QLabel, QWidget

from ..covers import folder_cover, render_cover, CoverCache
from .. import theme as th


class CoverPreviewWidget(QWidget):
    """Popup flotante que muestra la portada de una pista bajo el cursor."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("CoverPreview")
        self.setWindowFlags(
            Qt.WindowType.Tool
            | Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
            | Qt.WindowType.NoDropShadowWindowHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setAttribute(Qt.WidgetAttribute.WA_ShowWithoutActivating, True)

        self._size = 220
        self._label = QLabel(self)
        self._label.setFixedSize(self._size, self._size)
        self._label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self._label.setScaledContents(False)

        self._cache: CoverCache | None = None
        self._hide_timer = QTimer(self)
        self._hide_timer.setSingleShot(True)
        self._hide_timer.timeout.connect(self.hide)

    def set_cover_cache(self, cache: CoverCache) -> None:
        self._cache = cache

    def show_for_track(self, track_path: Path, anchor: QPoint) -> None:
        """Muestra la portada de `track_path` anclada a `anchor` (coordenadas globales)."""
        if self._cache is None:
            return

        cover_path = track_path
        if not cover_path or not cover_path.exists():
            cover_path = folder_cover(track_path.parent, self._cache)

        pixmap = render_cover(
            cover_path if cover_path and cover_path.exists() else None,
            self._size,
            th.active(),
        )

        self._label.setPixmap(pixmap)
        self._label.setFixedSize(self._size, self._size)

        # Posiciona el popup un poco debajo y a la derecha del cursor.
        x = anchor.x() + 16
        y = anchor.y() + 16
        self.move(x, y)
        self._hide_timer.stop()
        self.show()

    def hide_preview(self) -> None:
        """Oculta el preview tras un breve retraso para evitar parpadeo."""
        self._hide_timer.start(120)

    def cancel_hide(self) -> None:
        self._hide_timer.stop()

    def refresh(self) -> None:
        """Recolorea tras un cambio de tema."""
        self.update()