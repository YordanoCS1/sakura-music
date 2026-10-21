"""Launcher visual de Sakura Music.

Reemplaza el arranque directo por una pantalla de bienvenida que resume el
estado de la biblioteca y de las herramientas antes de abrir la aplicacion.
No es un bootstrap: no descarga ni actualiza nada. Su trabajo es que abrir la
app se sienta como una decision, no como esperar una consola.

El launcher comparte los tokens, el QSS y el logo dibujado con Qt del resto de
la interfaz. La flor del panel izquierdo se anima solo con `QPainter`, sin
assets ni dependencias extra.
"""

from __future__ import annotations

import json
import math
import sqlite3
from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from PySide6.QtCore import (
    QEasingCurve,
    QPoint,
    QPropertyAnimation,
    QRectF,
    Qt,
    QTimer,
    Signal,
)
from PySide6.QtGui import (
    QColor,
    QLinearGradient,
    QPainter,
    QPainterPath,
    QPixmap,
    QRadialGradient,
)
from PySide6.QtWidgets import (
    QApplication,
    QFrame,
    QGraphicsDropShadowEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QPushButton,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from ..config import (
    download_queue_file,
    library_dir,
    library_index_file,
    save_settings,
)
from ..core.library_index import LibraryIndex
from ..core.tools import find_ffmpeg
from . import icons, sakura
from . import theme as th
from .motion import animations_enabled
from .theme import Theme, tint
from .widgets.buttons import IconButton, TextButton
from .widgets.elided import ElidedLabel

WIDTH = 1040
HEIGHT = 640
SHADOW_MARGIN = 16
HERO_LOGO = 280

_ACTIVE_STATES = frozenset({"pending", "downloading", "converting"})


@dataclass(frozen=True, slots=True)
class LauncherStatus:
    """Lo que el launcher puede mostrar sin abrir la ventana principal."""

    library_path: Path
    track_count: int | None
    pending_downloads: int
    ffmpeg_ready: bool
    ytdlp_version: str


def _package_version(name: str) -> str:
    try:
        return version(name)
    except PackageNotFoundError:
        return ""


def collect_status() -> LauncherStatus:
    """Resume biblioteca, cola y herramientas sin lanzar procesos ni escanear audio."""
    library_path = library_dir()
    track_count: int | None = None
    index_path = library_index_file()
    if index_path.exists():
        try:
            with LibraryIndex(index_path) as index:
                track_count = len(index.load(library_path))
        except (OSError, sqlite3.DatabaseError, ValueError):
            track_count = None

    pending_downloads = 0
    try:
        stored = json.loads(download_queue_file().read_text(encoding="utf-8"))
        if isinstance(stored, list):
            pending_downloads = sum(
                1
                for item in stored
                if isinstance(item, dict) and str(item.get("status", "")) in _ACTIVE_STATES
            )
    except (OSError, ValueError):
        pass

    return LauncherStatus(
        library_path=library_path,
        track_count=track_count,
        pending_downloads=pending_downloads,
        ffmpeg_ready=find_ffmpeg() is not None,
        ytdlp_version=_package_version("yt-dlp"),
    )


class LauncherHero(QWidget):
    """Panel de marca con flor, halo y petalos que flotan despacio."""

    def __init__(self, theme: Theme, parent=None):
        super().__init__(parent)
        self.setObjectName("LauncherHero")
        self.setMinimumWidth(400)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        self._theme = theme
        self._phase = 0.0
        self._logo_size = HERO_LOGO
        self._logo = self._render_logo(theme)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 24, 28, 26)
        layout.setSpacing(0)

        self.eyebrow = QLabel("COLECCIÓN PERSONAL")
        self.eyebrow.setObjectName("LauncherHeroEyebrow")
        layout.addWidget(self.eyebrow, 0, Qt.AlignmentFlag.AlignLeft)

        layout.addStretch(1)

        self._logo_slot = QWidget()
        self._logo_slot.setFixedHeight(248)
        self._logo_slot.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        layout.addWidget(self._logo_slot)

        self.title = QLabel("Tu música,\nen armonía.")
        self.title.setObjectName("LauncherHeroTitle")
        layout.addWidget(self.title)
        layout.addSpacing(10)

        self.caption = QLabel(
            "Buscá, descargá y ordená tu biblioteca desde un solo lugar."
        )
        self.caption.setObjectName("LauncherHeroText")
        self.caption.setWordWrap(True)
        self.caption.setMaximumWidth(320)
        layout.addWidget(self.caption)

        layout.addSpacing(20)
        self.meta = QLabel("BIBLIOTECA LOCAL  ·  SIN CUENTAS")
        self.meta.setObjectName("LauncherHeroMeta")
        layout.addWidget(self.meta)

        self._timer = QTimer(self)
        self._timer.setInterval(33)
        self._timer.timeout.connect(self._advance)

    def set_theme(self, theme: Theme) -> None:
        self._theme = theme
        self._logo = self._render_logo(theme)
        self.update()

    @staticmethod
    def _render_logo(theme: Theme) -> QPixmap:
        return sakura.render_logo(
            theme.accent,
            HERO_LOGO,
            halo=tint(theme.surface, theme.accent, 0.5),
            center_border=theme.bg,
        )

    def showEvent(self, event) -> None:
        super().showEvent(event)
        if animations_enabled():
            self._timer.start()

    def hideEvent(self, event) -> None:
        self._timer.stop()
        super().hideEvent(event)

    def _advance(self) -> None:
        self._phase += 0.028
        self.update()

    def paintEvent(self, event) -> None:
        painter = QPainter(self)
        painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
        painter.setRenderHint(QPainter.RenderHint.TextAntialiasing, True)

        t = self._theme
        rect = QRectF(self.rect()).adjusted(0.5, 0.5, -0.5, -0.5)
        path = QPainterPath()
        path.addRoundedRect(rect, t.radius + 10, t.radius + 10)

        fill = QLinearGradient(rect.topLeft(), rect.bottomRight())
        fill.setColorAt(0.0, QColor(tint(t.surface_alt, t.accent, 0.34)))
        fill.setColorAt(0.46, QColor(t.surface_alt))
        fill.setColorAt(1.0, QColor(t.surface))
        painter.fillPath(path, fill)

        painter.save()
        painter.setClipPath(path)

        slot = self._logo_slot.geometry()
        center = (
            QRectF(slot).center()
            if slot.isValid()
            else QRectF(rect.center().x(), rect.height() * 0.42, 1, 1).center()
        )

        glow = QRadialGradient(center, max(180.0, self.width() * 0.52))
        start = QColor(t.accent)
        start.setAlpha(58)
        end = QColor(t.accent)
        end.setAlpha(0)
        glow.setColorAt(0.0, start)
        glow.setColorAt(1.0, end)
        painter.setPen(Qt.PenStyle.NoPen)
        painter.setBrush(glow)
        painter.drawEllipse(center, glow.radius(), glow.radius())

        ring = QColor(tint(t.accent, t.bg, 0.5))
        ring.setAlpha(34)
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.setPen(ring)
        for factor in (0.54, 0.72, 0.92, 1.14):
            radius = 96.0 * factor
            painter.drawEllipse(center, radius, radius)

        self._draw_petals(painter, rect)
        painter.restore()

        breath = 1.0 + 0.012 * math.sin(self._phase * 0.8)
        painter.save()
        painter.setOpacity(0.96)
        painter.translate(center)
        painter.scale(breath, breath)
        painter.drawPixmap(
            QPoint(-self._logo_size // 2, -self._logo_size // 2),
            self._logo,
        )
        painter.restore()

        border = QColor(tint(t.border, t.accent, 0.42))
        painter.setBrush(Qt.BrushStyle.NoBrush)
        painter.setPen(border)
        painter.drawPath(path)

    def _draw_petals(self, painter: QPainter, rect: QRectF) -> None:
        """Petalos sueltos con movimiento determinista y muy bajo contraste."""
        painter.setPen(Qt.PenStyle.NoPen)
        for index in range(8):
            x = rect.left() + (index + 0.6) * rect.width() / 8.6
            x += math.sin(self._phase * 0.7 + index * 1.7) * 18.0
            y = rect.top() + ((self._phase * 14.0 + index * 91.0) % (rect.height() + 50))
            color = QColor(tint(self._theme.accent, self._theme.text, 0.25))
            color.setAlpha(46 + (index * 9) % 48)
            painter.save()
            painter.translate(x, y)
            painter.rotate(self._phase * 34.0 + index * 31.0)
            painter.setBrush(color)
            painter.drawEllipse(QRectF(0.0, 0.0, 5.4, 2.9))
            painter.restore()


class LauncherHeader(QFrame):
    """Cabecera arrastrable con marca y controles de ventana."""

    def __init__(self, window: QWidget, parent=None):
        super().__init__(parent)
        self.setObjectName("LauncherHeader")
        self.setFixedHeight(54)
        self._window = window
        self._drag_offset = None

        layout = QHBoxLayout(self)
        layout.setContentsMargins(22, 0, 10, 0)
        layout.setSpacing(10)

        self.mark = QLabel()
        self.mark.setFixedSize(24, 24)
        layout.addWidget(self.mark, 0, Qt.AlignmentFlag.AlignVCenter)

        texts = QVBoxLayout()
        texts.setSpacing(0)
        self.brand = QLabel("Sakura Music")
        self.brand.setObjectName("LauncherBrand")
        self.tag = QLabel("LAUNCHER")
        self.tag.setObjectName("LauncherBrandTag")
        texts.addWidget(self.brand)
        texts.addWidget(self.tag)
        layout.addLayout(texts)
        layout.addStretch(1)

        self.minimize_btn = self._control("minus", "Minimizar")
        self.minimize_btn.clicked.connect(self._window.showMinimized)
        self.close_btn = self._control("close", "Cerrar")
        self.close_btn.setProperty("variant", "close")
        self.close_btn.clicked.connect(self._window.close)
        layout.addWidget(self.minimize_btn)
        layout.addWidget(self.close_btn)

        self.refresh()

    def _control(self, name: str, tooltip: str) -> IconButton:
        button = IconButton(name, tooltip, 38, parent=self)
        button.setProperty("winControl", True)
        button.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        button.setCursor(Qt.CursorShape.ArrowCursor)
        button.setGraphicsEffect(None)
        return button

    def refresh(self) -> None:
        t = th.active()
        self.mark.setPixmap(sakura.render(t.accent, 24, center_color=t.accent))
        self.minimize_btn.refresh()
        self.close_btn.refresh()

    def mousePressEvent(self, event) -> None:
        if event.button() == Qt.MouseButton.LeftButton:
            self._drag_offset = (
                event.globalPosition().toPoint() - self._window.frameGeometry().topLeft()
            )
            event.accept()

    def mouseMoveEvent(self, event) -> None:
        if self._drag_offset is not None and event.buttons() & Qt.MouseButton.LeftButton:
            self._window.move(event.globalPosition().toPoint() - self._drag_offset)
            event.accept()


class LauncherCard(QPushButton):
    """Tarjeta pulsable con icono, etiqueta, valor y detalle."""

    def __init__(
        self,
        icon_name: str,
        label: str,
        value: str,
        hint: str,
        parent=None,
    ):
        super().__init__(parent)
        self.setObjectName("LauncherCard")
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(104)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)

        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(12)

        self.icon_label = QLabel()
        self.icon_label.setObjectName("LauncherCardIcon")
        self.icon_label.setFixedSize(38, 38)
        self.icon_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.icon_label, 0, Qt.AlignmentFlag.AlignTop)

        texts = QVBoxLayout()
        texts.setSpacing(2)
        self.label = QLabel(label)
        self.label.setObjectName("LauncherCardLabel")
        self.value = QLabel(value)
        self.value.setObjectName("LauncherCardValue")
        self.hint = ElidedLabel(hint, Qt.TextElideMode.ElideMiddle)
        self.hint.setObjectName("LauncherCardHint")
        self.hint.setMinimumHeight(18)
        texts.addWidget(self.label)
        texts.addWidget(self.value)
        texts.addWidget(self.hint)
        layout.addLayout(texts, 1)

        self._icon_name = icon_name
        for widget in (self.icon_label, self.label, self.value, self.hint):
            widget.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents, True)
        self.refresh()

    def set_value(self, value: str) -> None:
        self.value.setText(value)

    def set_hint(self, hint: str) -> None:
        self.hint.setText(hint)

    def refresh(self) -> None:
        t = th.active()
        self.icon_label.setPixmap(icons.render(self._icon_name, t.accent, 20))


class LauncherWindow(QWidget):
    """Pantalla de inicio con estado del entorno y accesos directos."""

    open_requested = Signal(str)  # pagina inicial de la ventana principal

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Sakura Music")
        self.setWindowFlags(Qt.WindowType.Window | Qt.WindowType.FramelessWindowHint)
        self.setAttribute(Qt.WidgetAttribute.WA_TranslucentBackground, True)
        self.setFixedSize(WIDTH, HEIGHT)

        self._theme = th.active()
        self.setWindowIcon(sakura.application_icon(self._theme))
        self._status = collect_status()
        self._opening = False
        self._pending_page = "home"

        outer = QVBoxLayout(self)
        outer.setContentsMargins(
            SHADOW_MARGIN, SHADOW_MARGIN, SHADOW_MARGIN, SHADOW_MARGIN
        )
        outer.setSpacing(0)

        self.surface = QFrame()
        self.surface.setObjectName("LauncherSurface")
        self.surface.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        outer.addWidget(self.surface)

        shadow = QGraphicsDropShadowEffect(self.surface)
        shadow.setBlurRadius(54)
        shadow.setOffset(0, 16)
        shadow.setColor(QColor(0, 0, 0, 150))
        self.surface.setGraphicsEffect(shadow)

        surface_layout = QVBoxLayout(self.surface)
        surface_layout.setContentsMargins(0, 0, 0, 0)
        surface_layout.setSpacing(0)
        self.header = LauncherHeader(self, self.surface)
        surface_layout.addWidget(self.header)

        body = QWidget()
        body.setObjectName("LauncherBody")
        body_layout = QHBoxLayout(body)
        body_layout.setContentsMargins(18, 10, 18, 18)
        body_layout.setSpacing(18)

        self.hero = LauncherHero(self._theme)
        body_layout.addWidget(self.hero, 46)

        self.panel = QWidget()
        self.panel.setObjectName("LauncherPanel")
        self.panel_layout = QVBoxLayout(self.panel)
        self.panel_layout.setContentsMargins(8, 10, 8, 8)
        self.panel_layout.setSpacing(9)
        body_layout.addWidget(self.panel, 54)
        surface_layout.addWidget(body, 1)

        self._build_panel()
        self._apply_status()
        self._apply_theme_widgets()

        self._fade = QPropertyAnimation(self, b"windowOpacity", self)
        self._fade.setDuration(220)
        self._fade.setStartValue(0.0)
        self._fade.setEndValue(1.0)
        self._fade.setEasingCurve(QEasingCurve.Type.OutCubic)

        self._center_on_screen()

    def _build_panel(self) -> None:
        self.eyebrow = QLabel("BIENVENIDO DE NUEVO")
        self.eyebrow.setObjectName("LauncherEyebrow")
        self.panel_layout.addWidget(self.eyebrow)

        self.title = QLabel("Todo listo para empezar.")
        self.title.setObjectName("LauncherTitle")
        self.panel_layout.addWidget(self.title)

        self.subtitle = QLabel(
            "Abrí Sakura para buscar, descargar y ordenar tu colección."
        )
        self.subtitle.setObjectName("LauncherSubtitle")
        self.subtitle.setWordWrap(True)
        self.panel_layout.addWidget(self.subtitle)
        self.panel_layout.addSpacing(5)

        grid = QGridLayout()
        grid.setContentsMargins(0, 0, 0, 0)
        grid.setHorizontalSpacing(10)
        grid.setVerticalSpacing(10)

        self.library_card = LauncherCard(
            "library", "BIBLIOTECA", "Sin analizar", "Abrí Sakura para generar el índice"
        )
        self.queue_card = LauncherCard(
            "download", "DESCARGAS", "Sin pendientes", "La cola se reanuda al abrir"
        )
        self.tools_card = LauncherCard(
            "settings", "HERRAMIENTAS", "Comprobando", "FFmpeg y yt-dlp"
        )
        self.theme_card = LauncherCard(
            "palette", "APARIENCIA", self._theme.name, "Clic para cambiar el tema"
        )
        for index, card in enumerate(
            (self.library_card, self.queue_card, self.tools_card, self.theme_card)
        ):
            grid.addWidget(card, index // 2, index % 2)
        self.panel_layout.addLayout(grid)

        self.library_card.clicked.connect(lambda: self._open("library"))
        self.queue_card.clicked.connect(lambda: self._open("queue"))
        self.tools_card.clicked.connect(lambda: self._open("settings"))
        self.theme_card.clicked.connect(self.cycle_theme)

        self.panel_layout.addStretch(1)

        status_line = QHBoxLayout()
        status_line.setSpacing(8)
        self.status_dot = QLabel()
        self.status_dot.setObjectName("LauncherStatusDot")
        self.status_dot.setFixedSize(8, 8)
        self.status_text = QLabel("")
        self.status_text.setObjectName("LauncherStatusText")
        status_line.addWidget(self.status_dot)
        status_line.addWidget(self.status_text)
        status_line.addStretch(1)
        self.panel_layout.addLayout(status_line)

        actions = QHBoxLayout()
        actions.setSpacing(10)
        self.open_btn = TextButton("Abrir Sakura", "accent", icon="play")
        self.open_btn.setProperty("launcherPrimary", True)
        self.open_btn.setMinimumHeight(50)
        self.open_btn.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed
        )
        self.open_btn.clicked.connect(lambda: self._open("home"))

        self.library_btn = TextButton("Biblioteca", "ghost", icon="library")
        self.library_btn.setProperty("launcherSecondary", True)
        self.library_btn.setMinimumHeight(50)
        self.library_btn.clicked.connect(lambda: self._open("library"))

        actions.addWidget(self.open_btn, 1)
        actions.addWidget(self.library_btn, 0)
        self.panel_layout.addLayout(actions)

        self.footer = QLabel(self._footer_text())
        self.footer.setObjectName("LauncherFooter")
        self.panel_layout.addWidget(self.footer)

    def _footer_text(self) -> str:
        app_version = _package_version("sakura-music") or "0.1.0"
        return f"Sakura Music {app_version}  ·  datos y biblioteca en tu equipo"

    def _apply_status(self) -> None:
        if self._status.track_count is None:
            self.library_card.set_value("Sin analizar")
            self.library_card.set_hint("Abrí Sakura para generar el índice")
        elif self._status.track_count == 1:
            self.library_card.set_value("1 pista")
            self.library_card.set_hint(str(self._status.library_path))
        else:
            self.library_card.set_value(f"{self._status.track_count} pistas")
            self.library_card.set_hint(str(self._status.library_path))

        pending = self._status.pending_downloads
        if pending == 0:
            self.queue_card.set_value("Sin pendientes")
            self.queue_card.set_hint("La cola se reanuda al abrir")
        elif pending == 1:
            self.queue_card.set_value("1 en cola")
            self.queue_card.set_hint("Se reanuda al abrir Sakura")
        else:
            self.queue_card.set_value(f"{pending} en cola")
            self.queue_card.set_hint("Se reanudan al abrir Sakura")

        tools_ready = self._status.ffmpeg_ready
        self.tools_card.set_value("Todo listo" if tools_ready else "Falta FFmpeg")
        ytdlp = self._status.ytdlp_version
        ytdlp_text = f"yt-dlp {ytdlp}" if ytdlp else "yt-dlp no instalado"
        self.tools_card.set_hint(
            f"FFmpeg {'detectado' if tools_ready else 'no encontrado'}  ·  {ytdlp_text}"
        )
        self.theme_card.set_value(self._theme.name)
        self.theme_card.set_hint("Clic para cambiar el tema")

        self.status_dot.setProperty("state", "ok" if tools_ready else "warning")
        self.status_dot.style().unpolish(self.status_dot)
        self.status_dot.style().polish(self.status_dot)
        self.status_text.setText(
            "Entorno listo para trabajar"
            if tools_ready
            else "Instalá FFmpeg para descargar audio"
        )

    def _apply_theme_widgets(self) -> None:
        self.header.refresh()
        self.hero.set_theme(self._theme)
        for card in (
            self.library_card,
            self.queue_card,
            self.tools_card,
            self.theme_card,
        ):
            card.refresh()
        self.open_btn.refresh()
        self.library_btn.refresh()

    def apply_theme(self, theme: Theme) -> None:
        """Aplica un tema a toda la app y lo guarda para el próximo arranque."""
        self._theme = theme
        th.set_active(theme)
        self.setWindowIcon(sakura.application_icon(theme))
        app = QApplication.instance()
        if app is not None:
            app.setStyleSheet(th.build_qss(theme))
        self._apply_theme_widgets()
        self._apply_status()

    def cycle_theme(self) -> None:
        current = next(
            (i for i, item in enumerate(th.THEME_LIST) if item.id == self._theme.id),
            -1,
        )
        theme = th.THEME_LIST[(current + 1) % len(th.THEME_LIST)]
        save_settings({"theme": theme.id})
        self.apply_theme(theme)

    def _open(self, page: str) -> None:
        if self._opening:
            return
        self._opening = True
        self._pending_page = page
        self.open_btn.setEnabled(False)
        self.library_btn.setEnabled(False)
        self.status_text.setText("Abriendo Sakura…")
        QTimer.singleShot(55, self._emit_open)

    def _emit_open(self) -> None:
        if not self._opening:
            return
        self.open_requested.emit(self._pending_page)

    def showEvent(self, event) -> None:
        super().showEvent(event)
        if not animations_enabled():
            self.setWindowOpacity(1.0)
            return
        self.setWindowOpacity(0.0)
        self._fade.stop()
        self._fade.start()

    def keyPressEvent(self, event) -> None:
        if event.key() in (Qt.Key.Key_Return, Qt.Key.Key_Enter):
            self._open("home")
            event.accept()
            return
        if event.key() == Qt.Key.Key_Escape:
            self.close()
            event.accept()
            return
        super().keyPressEvent(event)

    def _center_on_screen(self) -> None:
        screen = QApplication.primaryScreen()
        if screen is None:
            return
        geo = screen.availableGeometry()
        self.move(geo.center() - self.rect().center())


__all__ = ["LauncherStatus", "LauncherWindow", "collect_status"]
