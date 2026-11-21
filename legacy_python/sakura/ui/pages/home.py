"""Pagina de inicio: resumen de la biblioteca y accesos rapidos.

Las cifras salen de `summarize()` y del modelo de la biblioteca, que ya estan
calculados: no se escanea nada extra. El bloque de "sin etiquetar" esta porque
en una app hecha para editar metadatos es lo unico accionable de un resumen.
"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor
from PySide6.QtWidgets import (
    QFrame,
    QGraphicsDropShadowEffect,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from .. import icons, sakura
from .. import theme as th
from ..theme import tint
from ..widgets.buttons import TextButton
from .base import Page


class HeroBanner(QWidget):
    """Encabezado destacado con bienvenida y accesos rápidos."""

    search_clicked = Signal()
    library_clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("HeroBanner")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 22, 24, 22)
        layout.setSpacing(12)

        badge_row = QHBoxLayout()
        # La flor va dentro de la píldora, no al lado: si queda afuera, el borde
        # redondeado del QSS encierra solo el texto y parece un error.
        badge_box = QFrame()
        badge_box.setObjectName("HeroBadge")
        badge_layout = QHBoxLayout(badge_box)
        badge_layout.setContentsMargins(0, 0, 0, 0)
        badge_layout.setSpacing(6)

        self.badge_mark = QLabel()
        self.badge_mark.setFixedSize(12, 12)
        badge_layout.addWidget(self.badge_mark, 0, Qt.AlignmentFlag.AlignVCenter)
        badge = QLabel("TU MÚSICA EN MÁXIMA CALIDAD")
        badge_layout.addWidget(badge)
        badge_row.addWidget(badge_box, 0, Qt.AlignmentFlag.AlignLeft)
        badge_row.addStretch(1)

        self.live = QLabel("LIVE · CURADA")
        self.live.setObjectName("HeroPill")
        badge_row.addWidget(self.live, 0, Qt.AlignmentFlag.AlignRight)
        layout.addLayout(badge_row)

        self.title = QLabel("Bienvenido a Sakura Music")
        self.title.setObjectName("HeroTitle")
        self.subtitle = QLabel(
            "Descubre, descarga de YouTube en alta definición y organiza su "
            "biblioteca local con carátulas y metadatos limpios."
        )
        self.subtitle.setObjectName("HeroSubtitle")
        self.subtitle.setWordWrap(True)

        layout.addWidget(self.title)
        layout.addWidget(self.subtitle)

        self.visual = QLabel()
        self.visual.setObjectName("HeroVisual")
        self.visual.setFixedHeight(80)
        self.visual.setAlignment(Qt.AlignmentFlag.AlignRight)
        layout.addWidget(self.visual)
        self._paint_logo()

        buttons = QHBoxLayout()
        buttons.setSpacing(10)
        self.btn_search = TextButton("Descargar música", "accent", icon="sakura")
        self.btn_search.clicked.connect(self.search_clicked)
        self.btn_library = TextButton("Abrir biblioteca", "ghost", icon="folder")
        self.btn_library.clicked.connect(self.library_clicked)

        buttons.addWidget(self.btn_search, 0)
        buttons.addWidget(self.btn_library, 0)
        buttons.addStretch(1)
        layout.addLayout(buttons)
        self._shadow = QGraphicsDropShadowEffect(self)
        self._shadow.setBlurRadius(26)
        self._shadow.setOffset(0, 12)
        self._shadow.setColor(QColor(255, 93, 168, 70))
        self.setGraphicsEffect(self._shadow)
        self.refresh()

    def _paint_logo(self) -> None:
        """El logo de la flor, al tamaño de la caja `#HeroVisual`.

        A 80 px si entran el halo y los petalos caidos; a 16 px serian manchas,
        por eso el logo grande y la flor simple son dos funciones distintas.

        Los petalos van en `accent_text` y no en `accent`: el gradiente de
        `#HeroVisual` es mas saturado justo del lado derecho, que es donde cae
        el logo, y con el acento encima no se distingue nada.
        """
        t = th.active()
        self.visual.setPixmap(
            sakura.render_logo(
                t.accent_text,
                80,
                halo=tint(t.surface, t.accent, 0.5),
                center_border=t.bg,
            )
        )
        self.badge_mark.setPixmap(sakura.render(t.accent, 12))

    def refresh(self) -> None:
        self._paint_logo()


class StatTile(QWidget):
    """Un número grande con su icono vectorial y etiqueta estilizada."""

    def __init__(self, label: str, icon_name: str = "music", parent=None):
        super().__init__(parent)
        self.setObjectName("StatTile")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._icon_name = icon_name

        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(6)

        header_row = QHBoxLayout()
        self.icon_label = QLabel()
        self.icon_label.setFixedSize(22, 22)
        header_row.addWidget(self.icon_label, 0, Qt.AlignmentFlag.AlignLeft)
        header_row.addStretch(1)
        layout.addLayout(header_row)

        self.value = QLabel("—")
        self.value.setObjectName("StatValue")
        self.label = QLabel(label)
        self.label.setObjectName("StatLabel")

        self._shadow = QGraphicsDropShadowEffect(self)
        self._shadow.setBlurRadius(18)
        self._shadow.setOffset(0, 8)
        self._shadow.setColor(QColor(0, 0, 0, 55))
        self.setGraphicsEffect(self._shadow)

        layout.addWidget(self.value)
        layout.addWidget(self.label)
        self.refresh()

    def set_value(self, text: str) -> None:
        self.value.setText(text)

    def refresh(self) -> None:
        t = th.active()
        self.icon_label.setPixmap(icons.render(self._icon_name, t.accent, 20))


class ActionCard(QWidget):
    """Un acceso rápido con su botón y descripción."""

    clicked = Signal()

    def __init__(self, title_text: str, detail: str, icon_name: str = "music", parent=None):
        super().__init__(parent)
        self.setObjectName("Card")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._icon_name = icon_name

        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 18, 18, 18)
        layout.setSpacing(8)

        top_row = QHBoxLayout()
        self.icon_wrap = QLabel()
        self.icon_wrap.setObjectName("CardIcon")
        self.icon_wrap.setFixedSize(36, 36)
        self.icon_wrap.setAlignment(Qt.AlignmentFlag.AlignCenter)
        top_row.addWidget(self.icon_wrap, 0)

        self.title_text = QLabel(title_text)
        self.title_text.setObjectName("CardTitle")
        top_row.addWidget(self.title_text, 1)
        layout.addLayout(top_row)

        self.detail = QLabel(detail)
        self.detail.setObjectName("EmptyState")
        self.detail.setWordWrap(True)

        self.button = TextButton("Abrir", "ghost", icon=icon_name)
        self.button.clicked.connect(self.clicked)

        layout.addWidget(self.detail)
        layout.addStretch(1)
        layout.addWidget(self.button, 0, Qt.AlignmentFlag.AlignLeft)
        self.refresh()

    def refresh(self) -> None:
        t = th.active()
        self.icon_wrap.setPixmap(icons.render(self._icon_name, t.accent, 16))


class HomePage(Page):
    library_requested = Signal()
    library_review_requested = Signal(str)
    queue_requested = Signal()

    def __init__(self, parent=None):
        super().__init__("Inicio", "Tu centro de control musical", parent)

        # 1. Hero Banner superior
        self.hero = HeroBanner()
        self.content.addWidget(self.hero)
        self.content.addSpacing(6)

        # 2. Tarjetas de métricas de la colección
        self.tiles: dict[str, StatTile] = {}
        grid = QGridLayout()
        grid.setSpacing(12)
        metricas = (
            ("pistas", "Pistas guardadas", "music"),
            ("albumes", "Álbumes completos", "disc"),
            ("artistas", "Artistas", "user"),
            ("duracion", "Horas de música", "clock"),
        )
        for col_index, (key_name, tag, icono) in enumerate(metricas):
            tile = StatTile(tag, icono)
            self.tiles[key_name] = tile
            grid.addWidget(tile, 0, col_index)
        self.content.addLayout(grid)

        # 3. Aviso de pistas sin etiquetar
        self.review_title = QLabel("Revisión rápida")
        self.review_title.setObjectName("PageSubtitle")
        self.content.addWidget(self.review_title)

        self.without_tags = QLabel("")
        self.without_tags.setObjectName("Callout")
        self.without_tags.setWordWrap(True)
        self.tags_btn = TextButton("Revisar", "ghost", icon="edit")
        self.tags_btn.clicked.connect(
            lambda: self.library_review_requested.emit("untagged")
        )

        aviso = QHBoxLayout()
        aviso.setContentsMargins(0, 4, 0, 4)
        aviso.setSpacing(12)
        aviso.addWidget(self.without_tags, 1)
        aviso.addWidget(self.tags_btn, 0)
        self.content.addLayout(aviso)

        self.without_cover = QLabel("")
        self.without_cover.setObjectName("Callout")
        self.without_cover.setWordWrap(True)
        self.covers_btn = TextButton("Revisar", "ghost", icon="info")
        self.covers_btn.clicked.connect(
            lambda: self.library_review_requested.emit("missing_cover")
        )
        covers = QHBoxLayout()
        covers.setContentsMargins(0, 0, 0, 0)
        covers.setSpacing(12)
        covers.addWidget(self.without_cover, 1)
        covers.addWidget(self.covers_btn, 0)
        self.content.addLayout(covers)

        self.duplicadas = QLabel("")
        self.duplicadas.setObjectName("Callout")
        self.duplicadas.setWordWrap(True)
        self.duplicadas_btn = TextButton("Revisar", "ghost", icon="alert-triangle")
        self.duplicadas_btn.clicked.connect(
            lambda: self.library_review_requested.emit("duplicates")
        )
        duplicates = QHBoxLayout()
        duplicates.setContentsMargins(0, 0, 0, 0)
        duplicates.setSpacing(12)
        duplicates.addWidget(self.duplicadas, 1)
        duplicates.addWidget(self.duplicadas_btn, 0)
        self.content.addLayout(duplicates)

        # 4. Accesos directos a funciones principales
        access = QGridLayout()
        access.setSpacing(12)
        self.card_search = ActionCard(
            "Buscar y Descargar", "Encuentra canciones y playlists en YouTube.", "search"
        )
        self.card_library = ActionCard(
            "Biblioteca Local", "Gestiona y edita metadatos de sus archivos.", "folder"
        )
        self.card_queue = ActionCard(
            "Cola de Descargas", "Supervisa las conversiones y descargas activas.", "download"
        )

        self.hero.search_clicked.connect(self.card_search.clicked)
        self.hero.library_clicked.connect(self.card_library.clicked)

        for col_index, card in enumerate(
            (self.card_search, self.card_library, self.card_queue)
        ):
            access.addWidget(card, 0, col_index)
        self.content.addLayout(access)

        self.downloads_alerta = QLabel("")
        self.downloads_alerta.setObjectName("Callout")
        self.downloads_alerta.setWordWrap(True)
        self.downloads_btn = TextButton("Ver cola", "ghost", icon="queue")
        self.downloads_btn.clicked.connect(self.queue_requested)
        downloads = QHBoxLayout()
        downloads.setContentsMargins(0, 4, 0, 0)
        downloads.setSpacing(12)
        downloads.addWidget(self.downloads_alerta, 1)
        downloads.addWidget(self.downloads_btn, 0)
        self.content.addLayout(downloads)
        self.content.addStretch(1)

        self._library_ready = False
        self.set_summary(None)
        self.set_downloads(0, 0, 0)

    # --- datos ---------------------------------------------------------------

    def set_summary(self, summary: dict[str, int] | None) -> None:
        """Actualiza las cifras. `None` = todavia no se escaneo nada."""
        if not summary or not summary.get("pistas"):
            self._library_ready = False
            for tile in self.tiles.values():
                tile.set_value("—")
            self.without_tags.setText(
                "No hay biblioteca configurada todavía. Configúrala en Ajustes."
            )
            self.tags_btn.setVisible(False)
            self.without_cover.clear()
            self.covers_btn.setVisible(False)
            self.duplicadas.clear()
            self.duplicadas_btn.setVisible(False)
            return

        self._library_ready = True
        self.tiles["pistas"].set_value(f"{summary['pistas']}")
        self.tiles["albumes"].set_value(f"{summary['albumes']}")
        self.tiles["artistas"].set_value(f"{summary['artistas']}")
        self.tiles["duracion"].set_value(f"{summary['duracion'] / 3600:.1f} h")

    def set_without_tags(self, count: int) -> None:
        if count <= 0:
            self.without_tags.setText("Todas sus pistas tienen título y artista.")
            self.tags_btn.setVisible(False)
            return

        plural = "s" if count != 1 else ""
        self.without_tags.setText(
            f"{count} pista{plural} sin título o artista, que se ven como "
            "«Desconocido»."
        )
        self.tags_btn.setVisible(True)

    def set_review_counts(self, without_tags: int, without_cover: int, duplicadas: int) -> None:
        if not self._library_ready:
            return
        self.set_without_tags(without_tags)

        if without_cover <= 0:
            self.without_cover.setText("Todas sus pistas tienen carátula.")
            self.covers_btn.setVisible(False)
        else:
            self.without_cover.setText(
                f"{without_cover} pista{'s' if without_cover != 1 else ''} sin carátula."
            )
            self.covers_btn.setVisible(True)

        if duplicadas <= 0:
            self.duplicadas.setText("No se encontraron posibles duplicados.")
            self.duplicadas_btn.setVisible(False)
        else:
            self.duplicadas.setText(
                f"{duplicadas} pista{'s' if duplicadas != 1 else ''} en posibles duplicados."
            )
            self.duplicadas_btn.setVisible(True)

    def set_review_pending(self) -> None:
        """Evita mostrar conteos anteriores mientras se actualiza la revisión."""
        if not self._library_ready:
            return
        self.without_tags.setText("Actualizando la revisión de la biblioteca…")
        self.tags_btn.setVisible(False)
        self.without_cover.clear()
        self.covers_btn.setVisible(False)
        self.duplicadas.clear()
        self.duplicadas_btn.setVisible(False)

    def set_downloads(self, active: int, in_wait: int, failed: int) -> None:
        chunks = []
        if active:
            chunks.append(f"{active} activa{'s' if active != 1 else ''}")
        if in_wait:
            chunks.append(f"{in_wait} en espera")
        if failed:
            chunks.append(f"{failed} con error")
        self.card_queue.detail.setText(" · ".join(chunks) or "No hay descargas en curso.")

        if failed:
            self.downloads_alerta.setText(
                f"{failed} descarga{'s' if failed != 1 else ''} fallida"
                f"{'s' if failed != 1 else ''}. Revisá la cola para ver el error."
            )
            self.downloads_alerta.setVisible(True)
            self.downloads_btn.setVisible(True)
        else:
            self.downloads_alerta.clear()
            self.downloads_alerta.setVisible(False)
            self.downloads_btn.setVisible(False)

    def refresh(self) -> None:
        """Recolorea los iconos tras un cambio de tema."""
        self.hero.refresh()
        for tile in self.tiles.values():
            tile.refresh()
        for card in (self.card_search, self.card_library, self.card_queue):
            card.refresh()