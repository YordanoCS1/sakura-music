"""Animacion de arranque: la flor de cerezo floreciendo.

No hay assets: la flor se dibuja con `QPainter` reutilizando la geometria de
`sakura.py`, y los petalos que caen son particulas simples. Se muestra antes de
la ventana principal, se cierra sola al terminar y no roba el foco.
"""

from __future__ import annotations

import math
import random

from PySide6.QtCore import QElapsedTimer, QPointF, QRectF, Qt, QTimer
from PySide6.QtGui import QColor, QFont, QPainter, QRadialGradient
from PySide6.QtWidgets import QApplication, QWidget

from . import sakura
from .theme import Theme, tint

WIDTH = 440
HEIGHT = 300
CARD_RADIUS = 22

TICK_MS = 16           # ~60 fps mientras dura el arranque
BLOOM_MS = 950         # la flor se abre de a poco
STAGGER_MS = 80        # cada petalo arranca un poco despues del anterior
DURATION_MS = 2000     # se mantiene un momento ya florecida
FADE_MS = 420          # se desvanece al final
PETALOS = 16           # petalos sueltos en el aire

TAGLINE = "Gestor y descargador"


def _ease_out_cubic(value: float) -> float:
    return 1.0 - (1.0 - value) ** 3


def _clamp01(value: float) -> float:
    return 0.0 if value < 0.0 else 1.0 if value > 1.0 else value


class _LoosePetal:
    """Un petalo que cae meciendose de un lado al otro."""

    def __init__(self, rng: random.Random) -> None:
        self.rng = rng
        self.reset(top=False)

    def reset(self, top: bool = True) -> None:
        self.size = self.rng.uniform(2.6, 5.6)
        self.x = self.rng.uniform(16.0, float(WIDTH - 16))
        self.y = self.rng.uniform(-40.0, -8.0) if top else self.rng.uniform(-40.0, HEIGHT)
        self.vy = self.rng.uniform(0.5, 1.5)
        self.angle = self.rng.uniform(0.0, 360.0)
        self.spin = self.rng.uniform(-0.9, 0.9)
        self.sway = self.rng.uniform(0.02, 0.06)
        self.phase = self.rng.uniform(0.0, 6.28)
        self.alpha = self.rng.randint(95, 175)

    def advance(self) -> None:
        self.y += self.vy
        self.x += math.sin(self.phase) * 0.6
        self.phase += self.sway
        self.angle += self.spin
        if self.y - self.size > HEIGHT:
            self.reset()


class SakuraSplash(QWidget):
    """Pantalla de arranque con la flor floreciendo y petalos cayendo."""

    def __init__(self, theme: Theme, parent=None):
        super().__init__(parent)
        self.setWindowFlags(
            Qt.WindowType.SplashScreen
            | Qt.WindowType.FramelessWindowHint
            | Qt.WindowType.WindowStaysOnTopHint
        )
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setFixedSize(WIDTH, HEIGHT)

        self._window: QWidget | None = None
        self._clock: QElapsedTimer | None = None
        self._elapsed = 0
        self._started = False

        self._rng = random.Random(7)
        self._petals = [_LoosePetal(self._rng) for _ in range(PETALOS)]

        self._card = self._with_alpha(theme.surface, 247)
        self._border = QColor(tint(theme.border, theme.accent, 0.55))
        self._glow = QColor(tint(theme.surface, theme.accent, 0.55))
        self._petal = QColor(theme.accent)
        self._center = QColor(tint(theme.accent, theme.text, 0.45))
        self._text = QColor(theme.text)
        self._muted = QColor(theme.text_muted)

        self._timer = QTimer(self)
        self._timer.setInterval(TICK_MS)
        self._timer.timeout.connect(self._tick)

        self._center_on_screen()

    # --- ciclo de vida ------------------------------------------------------

    @staticmethod
    def _with_alpha(color: str, alpha: int) -> QColor:
        result = QColor(color)
        result.setAlpha(alpha)
        return result

    def _center_on_screen(self) -> None:
        screen = QApplication.primaryScreen()
        if screen is None:
            return
        geo = screen.availableGeometry()
        self.move(geo.center() - self.rect().center())

    def showEvent(self, event) -> None:
        super().showEvent(event)
        if self._started:
            return
        self._started = True
        self._clock = QElapsedTimer()
        self._clock.start()
        self._timer.start()

    def release(self, window: QWidget) -> None:
        """Avisa que la ventana principal ya esta lista para recibir el foco."""
        self._window = window

    # --- animacion ----------------------------------------------------------

    def _tick(self) -> None:
        assert self._clock is not None
        self._elapsed = self._clock.elapsed()
        for petal in self._petals:
            petal.advance()

        if self._elapsed >= DURATION_MS:
            fade = _clamp01((self._elapsed - DURATION_MS) / FADE_MS)
            self.setWindowOpacity(1.0 - fade)
            if fade >= 1.0:
                self._finish()
                return
        self.update()

    def _finish(self) -> None:
        self._timer.stop()
        self.close()
        if self._window is not None:
            self._window.raise_()
            self._window.activateWindow()

    # --- pintado ------------------------------------------------------------

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        rect = QRectF(0.5, 0.5, self.width() - 1.0, self.height() - 1.0)
        painter.setPen(self._border)
        painter.setBrush(self._card)
        painter.drawRoundedRect(rect, CARD_RADIUS, CARD_RADIUS)

        center = QPointF(self.width() / 2.0, self.height() * 0.40)
        painter.save()
        painter.setClipRect(rect)
        self._draw_glow(painter, center)
        self._draw_loose(painter)
        painter.restore()

        self._draw_flower(painter, center)
        self._draw_text(painter)

    def _draw_glow(self, painter: QPainter, center: QPointF) -> None:
        bloom = _ease_out_cubic(_clamp01(self._elapsed / BLOOM_MS))
        radius = 120.0 + 40.0 * bloom
        gradient = QRadialGradient(center, radius)
        start = QColor(self._glow)
        start.setAlpha(int(120 * bloom))
        end = QColor(self._glow)
        end.setAlpha(0)
        gradient.setColorAt(0.0, start)
        gradient.setColorAt(1.0, end)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(gradient)
        painter.drawEllipse(center, radius, radius)

    def _draw_loose(self, painter: QPainter) -> None:
        painter.setPen(Qt.PenStyle.NoPen)
        for petal in self._petals:
            color = QColor(self._petal)
            color.setAlpha(petal.alpha)
            painter.save()
            painter.translate(petal.x, petal.y)
            painter.rotate(petal.angle)
            painter.setBrush(color)
            painter.drawEllipse(QPointF(0.0, 0.0), petal.size, petal.size * 0.55)
            painter.restore()

    def _draw_flower(self, painter: QPainter, center: QPointF) -> None:
        radio = 74.0
        scale = radio / sakura.RADIO
        forma = sakura.petalo_path()

        painter.save()
        painter.translate(center)
        painter.scale(scale, scale)
        painter.setPen(Qt.PenStyle.NoPen)
        for index in range(sakura.PETALOS):
            local = _ease_out_cubic(
                _clamp01((self._elapsed - index * STAGGER_MS) / (BLOOM_MS - 4 * STAGGER_MS))
            )
            if local <= 0.0:
                continue
            color = QColor(self._petal)
            color.setAlpha(int(255 * local))
            painter.save()
            painter.rotate(-90.0 + index * 360.0 / sakura.PETALOS + (1.0 - local) * -26.0)
            grow = 0.25 + 0.75 * local
            painter.scale(grow, grow)
            painter.setBrush(color)
            painter.drawPath(forma)
            painter.restore()
        painter.restore()

        center_progress = _ease_out_cubic(_clamp01((self._elapsed - 640.0) / 340.0))
        if center_progress > 0.0:
            center_color = QColor(self._center)
            center_color.setAlpha(int(255 * center_progress))
            radius = sakura.CENTER_R * scale * center_progress
            painter.setPen(Qt.PenStyle.NoPen)
            painter.setBrush(center_color)
            painter.drawEllipse(center, radius, radius)

    def _draw_text(self, painter: QPainter) -> None:
        appear = _clamp01((self._elapsed - 520.0) / 520.0)
        text = QColor(self._text)
        text.setAlpha(int(255 * appear))
        muted = QColor(self._muted)
        muted.setAlpha(int(255 * appear))

        title_font = QFont(self.font())
        title_font.setPointSize(20)
        title_font.setBold(True)
        painter.setFont(title_font)
        painter.setPen(text)
        painter.drawText(
            QRectF(0.0, self.height() - 96.0, self.width(), 32.0),
            Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter,
            "Sakura Music",
        )

        tag_font = QFont(self.font())
        tag_font.setPointSize(10)
        painter.setFont(tag_font)
        painter.setPen(muted)
        painter.drawText(
            QRectF(0.0, self.height() - 62.0, self.width(), 24.0),
            Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignVCenter,
            TAGLINE,
        )


__all__ = ["SakuraSplash"]
