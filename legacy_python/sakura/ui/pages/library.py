"""Pagina de biblioteca local con varios diseños, filtros y detalle."""

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import (
    QFileDialog,
    QHBoxLayout,
    QListView,
    QListWidgetItem,
    QMessageBox,
    QVBoxLayout,
    QWidget,
)

from ...config import (
    covers_dir,
    library_index_file,
    load_settings,
    music_dir,
    save_settings,
    tag_history_dir,
)
from ...core.library import Track, extract_cover, load_track
from ...core.library_index import IndexedTrack, LibraryIndex
from ...core.tag_history import latest_manifest, revert_batch
from .. import icons
from .. import theme as th
from ..covers import CoverCache, folder_cover, render_cover
from ..models.track_model import COLUMNS, STRETCH_COLUMN, TrackFilterProxy, TrackTableModel
from ..services.library import LibraryDeltaScanner, LibraryRefresher, LibraryScanner
from ..services.lyrics import LyricsEmbedder
from ..widgets.batch_editor import open_edicion_batch
from ..widgets.breadcrumb import BreadcrumbBar
from ..widgets.buttons import TextButton
from ..widgets.cover_preview import CoverPreviewWidget
from ..widgets.library_folders import LibraryFolderPanel
from ..widgets.library_selection import LibrarySelectionBar
from ..widgets.library_toolbar import (
    SECTION_KEYS,
    SECTION_VIEWS,
    DensitySelector,
    FilterChipsBar,
    LibraryToolbar,
)
from ..widgets.library_views import VIEW_ORDER, LibraryViewStack
from ..widgets.metadata_editor import open_editor
from ..widgets.track_detail import TrackDetail
from ..widgets.track_info import TrackInfoDialog
from .base import Page

logger = logging.getLogger(__name__)

# Un cambio de seleccion con las flechas dispara decenas de lecturas de portada
# en un segundo. Se espera a que el usuario se detenga antes de recolorear.
AMBIENT_DEBOUNCE_MS = 220


@lru_cache(maxsize=256)
def _cover_accent(path: Path, mtime_ns: int) -> str | None:
    """Color de acento de una portada, recordado por ruta y fecha."""
    color = th.dominant_color(path)
    return color.name() if color is not None else None


class LibraryPage(Page):
    """Escanea la carpeta de musica y lista todo lo que encuentre."""

    review_data_changed = Signal()
    # El estado vacio ofrece saltar a Buscar para llenar la biblioteca.
    search_requested = Signal()
    # La ventana usa el color de la portada como acento mientras esta pagina
    # esta visible; al salir se vuelve al tema elegido.
    ambient_requested = Signal(str)  # #RRGGBB
    ambient_cleared = Signal()

    def __init__(self, parent=None):
        super().__init__("Biblioteca", "Tu música local", parent)
        self.layout().setContentsMargins(32, 4, 32, 24)
        self.layout().setSpacing(12)

        self.model = TrackTableModel(self)
        self.proxy = TrackFilterProxy(self)
        self.proxy.setSourceModel(self.model)

        self.view_mode = str(load_settings().get("library_view", "table"))
        if self.view_mode not in VIEW_ORDER:
            self.view_mode = "table"
        self._songs_view = self.view_mode
        self.section = str(load_settings().get("library_section", "songs"))
        if self.section not in SECTION_KEYS:
            self.section = "songs"
        self._review_filter = str(load_settings().get("library_review_filter", "all"))
        self._density = float(load_settings().get("library_density", th.active().density))
        self._syncing_selection = False
        self._covers: dict[Path, Path | None] = CoverCache()
        self._library_root: Path | None = None
        self._current_folder: Path | None = None
        self._review_mode = False
        self._ambient_source: tuple[Path, int] | None = None
        self._ambient_color = ""
        self._ambient_enabled = bool(load_settings().get("ambient_theme", True))
        self._changes_pending = False
        self._ambient_timer = QTimer(self)
        self._ambient_timer.setSingleShot(True)
        self._ambient_timer.setInterval(AMBIENT_DEBOUNCE_MS)
        self._ambient_timer.timeout.connect(self._emit_ambient)

        self.scanner = LibraryScanner(self)
        self.scanner.tracks_found.connect(self._on_tracks)
        self.scanner.finished.connect(self._on_finished)
        self.scanner.failed.connect(self._on_failed)
        self.scanner.progress.connect(self._on_progress)

        self.refresher = LibraryRefresher(self)
        self.refresher.tracks_refreshed.connect(self._on_refreshed)
        self.refresher.finished.connect(self._on_refresh_done)
        self.refresher.failed.connect(self._on_refresh_failed)

        self.lyrics_embedder = LyricsEmbedder(self)
        self.lyrics_embedder.progress.connect(self._on_lyrics_progress)
        self.lyrics_embedder.finished.connect(self._on_lyrics_finished)

        self.delta = LibraryDeltaScanner(self)
        self.delta.tracks_changed.connect(self._on_delta_changed)
        self.delta.tracks_removed.connect(self._on_delta_removed)
        self.delta.finished.connect(self._on_delta_finished)
        self.delta.failed.connect(self._on_delta_failed)
        self._disc_rotation = 0
        self._disc_timer = QTimer(self)
        self._disc_timer.setInterval(50)
        self._disc_timer.timeout.connect(self._advance_disc_animation)
        self._build()
        self.apply_theme_to_table()

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        self.toolbar = LibraryToolbar()
        self._alias_toolbar()
        self._connect_toolbar()
        self.content.addWidget(self.toolbar)

        self.selection_bar = LibrarySelectionBar()
        self._alias_selection()
        self._connect_selection()
        self.content.addWidget(self.selection_bar)

        # Filtros rápidos tipo chip: sin tags, sin portada, duplicados.
        self.filter_chips = FilterChipsBar()
        self.filter_chips.filter_changed.connect(self._on_review_filter_changed)
        self.content.addWidget(self.filter_chips)
        self._apply_saved_review_filter()

        # Selector de densidad de la biblioteca.
        self.density_selector = DensitySelector()
        self.density_selector.set_density(self._density)
        self.density_selector.density_changed.connect(self._on_density_changed)
        self.content.addWidget(self.density_selector)

        body = QWidget()
        body.setObjectName("LibraryBody")
        self.library_body = body
        body_layout = QHBoxLayout(body)
        body_layout.setContentsMargins(0, 0, 0, 0)
        body_layout.setSpacing(18)

        library = QWidget()
        library_layout = QVBoxLayout(library)
        library_layout.setContentsMargins(0, 0, 0, 0)
        library_layout.setSpacing(12)

        # Navegacion: volver + migas de pan, que reemplazan el titulo suelto.
        navegacion = QWidget()
        navegacion.setObjectName("LibraryNavigation")
        navegacion_layout = QHBoxLayout(navegacion)
        navegacion_layout.setContentsMargins(0, 0, 0, 0)
        navegacion_layout.setSpacing(8)
        self.up_folder_button = TextButton("Volver", "ghost", icon="arrow-left")
        self.up_folder_button.clicked.connect(self._open_parent_folder)
        self.up_folder_button.setVisible(False)
        navegacion_layout.addWidget(self.up_folder_button, 0)
        self.folder_location = BreadcrumbBar()
        self.folder_location.path_selected.connect(self._open_folder)
        navegacion_layout.addWidget(self.folder_location, 1)
        library_layout.addWidget(navegacion)
        self.navigation = navegacion

        self.folder_panel = LibraryFolderPanel()
        self.folder_list = self.folder_panel.folder_list
        self.folder_list.itemClicked.connect(self._activate_folder_item)
        library_layout.addWidget(self.folder_panel)

        # Stack de vistas: tabla, tarjetas, discos y carrusel horizontal.
        self.view_stack = LibraryViewStack(self.proxy)
        self._alias_views()
        self._connect_views()

        # Previsualizacion de portada al pasar el mouse sobre una pista.
        self.cover_preview = CoverPreviewWidget()
        self.cover_preview.set_cover_cache(self._covers)
        self.cover_preview.hide()

        # Conectar el hover de las vistas de tarjetas (QListView) para mostrar
        # la portada al pasar el mouse.
        for view in self.view_stack.card_views.values():
            view.entered.connect(self._on_card_entered)

        library_layout.addWidget(self.view_stack, 1)
        body_layout.addWidget(library, 1)

        self.detail = TrackDetail()
        self.detail.edit_requested.connect(self._on_edit)
        self.detail.lyrics_requested.connect(self._on_embed_current_lyrics)
        self.detail.info_requested.connect(self._on_info)
        # El panel es parte fija de la Biblioteca: muestra la seleccion actual
        # o un estado vacio, sin robarle espacio a la barra superior.
        self.detail.setVisible(True)
        body_layout.addWidget(self.detail)
        self.content.addWidget(body, 1)

        self.message = self.empty_state("")
        self.message.action_clicked.connect(self.search_requested)
        self.content.addWidget(self.message)

        # Estado vacio ilustrado: se muestra cuando la biblioteca esta vacia
        # sin errores. Reemplaza visualmente al MessageBlock simple.
        self.empty_illustrated = self.empty_state_illustrated(
            "Tu biblioteca esta vacia.",
            title="Empieza a coleccionar musica",
            action="Importar carpeta",
            illustration_size=170,
        )
        self.empty_illustrated.action_clicked.connect(self.search_requested)
        self.empty_illustrated.set_petal_note("Pétalos caen alrededor del silencio...")
        self.empty_illustrated.setVisible(False)
        self.content.addWidget(self.empty_illustrated)

        self.set_section(self.section, save=False)
        self._update_undo_state()

    def _alias_toolbar(self) -> None:
        """Deja a mano en la pagina los widgets de la barra que se usan afuera."""
        bar = self.toolbar
        self.filter_box = bar.filter_box
        self.stats = bar.stats
        self.review_filter_btn = bar.review_filter_btn
        self.undo_button = bar.undo_button
        self.view_buttons = bar.view_buttons

    def _alias_selection(self) -> None:
        bar = self.selection_bar
        self.edit_button = bar.edit_button
        self.batch_button = bar.batch_button
        self.lyrics_button = bar.lyrics_button

    def _connect_toolbar(self) -> None:
        bar = self.toolbar
        bar.filter_box.textChanged.connect(self._on_filter)
        bar.review_filter_btn.clicked.connect(lambda: self.set_review_filter(""))
        for mode, button in bar.view_buttons.items():
            button.clicked.connect(lambda _checked=False, m=mode: self.set_view_mode(m))
        bar.open_button.clicked.connect(self._on_pick_folder)
        bar.reload_button.clicked.connect(lambda: self.rescan())
        bar.undo_button.clicked.connect(self._on_undo)
        bar.zoom_changed.connect(self._on_zoom_changed)
        bar.section_changed.connect(self.set_section)

    def _apply_saved_review_filter(self) -> None:
        """Aplica el filtro de revisión guardado y marca su chip."""
        key = self._review_filter
        value = "" if key == "all" else key
        self.proxy.set_review_filter(value)
        self.filter_chips.set_active(key)

    def _on_review_filter_changed(self, value: str) -> None:
        """El usuario eligió un chip de filtro: aplica y persiste."""
        self.proxy.set_review_filter(value)
        key = value if value else "all"
        self._review_filter = key
        save_settings({"library_review_filter": key})

    def _on_density_changed(self, value: float) -> None:
        """El usuario cambio la densidad: recrea el tema y lo aplica."""
        self._density = value
        t = th.active()
        new_t = t.with_density(value)
        window = self.window()
        if hasattr(window, "apply_theme"):
            window.apply_theme(new_t)
        save_settings({"library_density": value})

    def _on_card_entered(self, index) -> None:
        """Muestra la portada de la pista bajo el cursor en un popup flotante."""
        if not index.isValid():
            self.cover_preview.hide_preview()
            return
        track_item = index.data(Qt.ItemDataRole.UserRole)
        if track_item is None:
            track_item = self.proxy.track_at(index.row())
        if track_item is None:
            return
        from PySide6.QtGui import QCursor

        pos = QCursor.pos()
        self.cover_preview.cancel_hide()
        self.cover_preview.show_for_track(track_item.path, pos)

    def _on_zoom_changed(self, percent: int) -> None:
        self.view_stack.set_zoom(percent / 100.0)

    def _update_navigation_visibility(self) -> None:
        """Las migas solo aparecen cuando hay una carpeta abierta o en Carpetas."""
        root = self._library_root
        current = self._current_folder
        outside_root = root is not None and current is not None and current != root
        self.navigation.setVisible(self.section == "folders" or outside_root)

    def _connect_selection(self) -> None:
        bar = self.selection_bar
        bar.edit_button.clicked.connect(self._on_edit)
        bar.batch_button.clicked.connect(self._on_batch_edit)
        bar.lyrics_button.clicked.connect(self._on_embed_selected_lyrics)
        bar.clear_button.clicked.connect(self._clear_selections)

    def _alias_views(self) -> None:
        """Deja a mano en la pagina las vistas y delegates que se usan afuera."""
        stack = self.view_stack
        self.table = stack.table
        self.albums_model = stack.albums_model
        for mode in VIEW_ORDER:
            if mode == "table":
                continue
            view = stack.card_views[mode]
            delegate = stack.card_delegates[mode]
            setattr(self, f"{mode}_view", view)
            setattr(self, f"{mode}_delegate", delegate)
        self.card_views = stack.card_views
        self.card_delegates = stack.card_delegates

    def _connect_views(self) -> None:
        self.table.selectionModel().selectionChanged.connect(self._on_selection)
        self.table.doubleClicked.connect(lambda _index: self._on_info())
        self.grid_view.selectionModel().selectionChanged.connect(self._on_grid_selection)
        self.grid_view.doubleClicked.connect(lambda _index: self._on_info())
        for mode, view in self.card_views.items():
            if mode != "grid":
                view.selectionModel().selectionChanged.connect(
                    lambda *_args, selected_view=view: self._on_card_selection(selected_view)
                )
            view.doubleClicked.connect(lambda _index: self._on_info())

    def set_section(self, section: str, save: bool = True) -> None:
        """Cambia la seccion de contenido y ajusta la presentacion."""
        if section not in SECTION_KEYS:
            section = "songs"
        self.section = section
        self.toolbar.set_active_section(section)
        target = self._songs_view if section == "songs" else SECTION_VIEWS[section]
        self.set_view_mode(target, save=False)
        self.toolbar.set_view_controls_visible(section == "songs")
        if save:
            save_settings({"library_section": section})
        self._update_navigation_visibility()
        self._update_filtered_stats()
        self._populate_folder_list()

    def set_view_mode(self, mode: str, save: bool = True) -> None:
        """Alterna entre los diseños disponibles para la biblioteca."""
        if mode not in self.view_buttons:
            mode = "table"
        if mode != self.view_mode:
            self._clear_selections()
        self.view_mode = mode
        if self.section == "songs":
            self._songs_view = mode
        self.view_stack.set_mode(mode)
        self.toolbar.set_active_view(mode)
        if save:
            save_settings({"library_view": self.view_mode})
        self._on_selection()
        self._update_disc_animation()

    def _update_disc_animation(self) -> None:
        if self.view_mode == "discs" and self.isVisible():
            self._disc_timer.start()
        else:
            self._disc_timer.stop()

    def _advance_disc_animation(self) -> None:
        self._disc_rotation = (self._disc_rotation + 2) % 360
        self.discs_delegate.set_rotation(self._disc_rotation)
        self.discs_view.viewport().update()

    def _clear_selections(self) -> None:
        self.view_stack.clear_selections()
        self.detail.set_track(None)
        self._sync_edit_buttons(None)
        self._request_ambient(None)

    def _active_card_view(self) -> QListView | None:
        return self.view_stack.active_card_view()

    def _clear_showcase_caches(self) -> None:
        self.view_stack.clear_caches()

    def apply_theme_to_table(self) -> None:
        t = th.active()
        selection_bg = t.selection
        self.table.setStyleSheet(
            f"QTableView {{ background: {t.bg}; alternate-background-color: {t.bg};"
            f" border: none; gridline-color: transparent; color: {t.text};"
            f" selection-background-color: {selection_bg};"
            f" selection-color: {t.selection_text}; font-size: 13px; outline: none; }}"
            f"QHeaderView::section {{ background: {t.bg}; color: {t.text_dim};"
            f" border: none; border-bottom: 1px solid {t.border}; padding: 8px 12px;"
            f" font-size: 11px; font-weight: 700;"
            f" letter-spacing: 0.8px; text-transform: uppercase; }}"
            f"QTableView::item {{ padding: 2px 10px; border: none; border-radius: 6px; }}"
            f"QTableView::item:hover {{ background: {t.surface_hover}; }}"
            f"QTableView::item:selected {{ background: {selection_bg};"
            f" color: {t.selection_text}; border-radius: 6px; }}"
            f"QTableCornerButton::section {{ background: {t.bg}; border: none; }}"
        )
        self.library_body.setStyleSheet(
            f"QWidget#LibraryBody {{ background: {t.bg}; color: {t.text}; }}"
            f"QListView, QListWidget {{ background: {t.bg}; color: {t.text};"
            f" border: none; selection-background-color: {selection_bg}; }}"
            f"QListWidget#LibraryFolderGrid {{ background: transparent; border: none; }}"
            f"QListWidget#LibraryFolderGrid::item {{ background: {t.surface_alt};"
            f" border: 1px solid {t.border}; border-radius: 14px; padding: 4px 12px;"
            f" font-size: 12px; font-weight: 600; color: {t.text}; }}"
            f"QListWidget#LibraryFolderGrid::item:hover {{"
            f" background: {t.surface_hover}; border-color: {t.accent}; }}"
            f"QListWidget#LibraryFolderGrid::item:selected {{"
            f" background: {selection_bg}; color: {t.selection_text};"
            f" border-color: {t.accent}; }}"
            f"QLabel#Breadcrumb {{ color: {t.text};"
            f" font-size: 14px; font-weight: 700;"
            f" background: transparent; }}"
            f"QPushButton#BreadcrumbStep {{ background: transparent; border: none;"
            f" color: {t.text_dim}; font-size: 14px; font-weight: 600;"
            f" padding: 2px 5px; border-radius: 6px; }}"
            f"QPushButton#BreadcrumbStep:hover {{ background: {t.surface_hover};"
            f" color: {t.text}; }}"
            f"QLabel#BreadcrumbCurrent {{ color: {t.text};"
            f" font-size: 14px; font-weight: 700; padding: 2px 5px; }}"
            f"QLabel#BreadcrumbSeparator {{ color: {t.text_muted};"
            f" font-size: 14px; padding: 0 1px; }}"
            f"QLabel#ToolbarStats {{ color: {t.text_dim};"
            f" font-size: 12px; font-weight: 600;"
            f" background: transparent; }}"
            f"QLabel#DetailCover {{ background: {t.surface_alt};"
            f" border: 1px solid {t.border}; border-radius: {t.radius}px; }}"
        )
        self.toolbar.setStyleSheet(
            f"QWidget#LibraryToolbar {{ background: {t.bg}; }}"
            f"QTabBar#LibrarySections {{ background: transparent; }}"
            f"QTabBar#LibrarySections::tab {{ background: transparent;"
            f" color: {t.text_dim}; padding: 6px 12px; border: none;"
            f" border-bottom: 2px solid transparent; font-size: 12px;"
            f" font-weight: 600; margin-right: 2px; }}"
            f"QTabBar#LibrarySections::tab:selected {{ color: {t.text};"
            f" border-bottom: 2px solid {t.accent}; }}"
            f"QTabBar#LibrarySections::tab:hover {{ color: {t.text}; }}"
            f"QLineEdit#SearchInput {{ background: {t.surface_alt}; color: {t.text};"
            f" border: 1px solid {t.border}; border-radius: 10px;"
            f" padding: 5px 12px; font-size: 12px; }}"
            f"QLineEdit#SearchInput:focus {{ border: 1px solid {t.accent};"
            f" background: {t.surface}; }}"
            f"QLineEdit#SearchInput:focus {{ border-color: {t.accent}; background: {t.surface}; }}"
            f"QFrame#SegmentedControl {{ background: {t.surface_alt};"
            f" border: 1px solid {t.border}; border-radius: 12px; padding: 2px; }}"
            f"QPushButton#SegmentButton {{ background: transparent;"
            f" border: none; border-radius: 8px; }}"
            f"QPushButton#SegmentButton:hover {{ background: {t.surface_hover}; }}"
            f"QPushButton#SegmentButton:checked {{"
            f" background: {selection_bg};"
            f" border: 1px solid {t.accent}; }}"
            f"QWidget#LibraryToolbar QPushButton#IconButton {{"
            f" background: {t.surface_alt}; color: {t.text};"
            f" border: 1px solid {t.border}; border-radius: 10px; }}"
            f"QWidget#LibraryToolbar QPushButton#IconButton:hover {{ background: {t.surface_hover};"
            f" border-color: {t.accent}; }}"
        )
        self.detail.library_theme = t
        self.detail.refresh()
        self.model.library_theme = t
        self.model._cover_icons.clear()
        # No hace falta avisar fila por fila: las portadas visibles se vuelven
        # a pedir al repintar y recorrer miles de filas en cada cambio de tema
        # (o de acento ambiente) trababa la pagina.
        if self.model.rowCount():
            self.table.viewport().update()
        self.view_stack.clear_caches()
        self.view_stack.update_viewports()
        self.toolbar.set_active_view(self.view_mode)
        self.toolbar.refresh()
        self.selection_bar.refresh()
        self._populate_folder_list()

    # --- ciclo de escaneo ---------------------------------------------------

    def library_folder(self) -> Path:
        configurado = load_settings().get("library_folder")
        return Path(configurado) if configurado else music_dir()

    @property
    def library_root(self) -> Path | None:
        return self._library_root

    def rescan(self, folder: Path | None = None) -> None:
        root = folder or self.library_folder()
        if not root.is_dir():
            self._show_message(
                f"La carpeta no existe: {root}",
                title="No se encontró la carpeta",
                icon="folder",
            )
            return

        root = root.resolve()
        self.delta.cancel()
        self._changes_pending = False
        self._library_root = root
        self._current_folder = self._library_root
        self._clear_showcase_caches()
        self._review_mode = False
        self.proxy.set_review_filter("")
        self.proxy.set_folder_filter(self._current_folder)
        self.review_filter_btn.setVisible(False)
        self.model.clear()
        self._update_folder_navigation()
        self.table.setSortingEnabled(False)
        self._show_message(
            "Buscando pistas y leyendo sus metadatos...",
            title="Preparando tu biblioteca",
            icon="music",
        )
        self._set_stats("Leyendo metadatos...")
        self.scanner.scan(root)

    def _on_tracks(self, batch: list[Track]) -> None:
        self.library_body.setVisible(True)
        self.message.setVisible(False)
        self.model.append(batch)

    def _on_progress(self, count: int) -> None:
        self._set_stats(f"{count} pistas...")

    def _on_finished(self, total: int, summary: dict[str, int]) -> None:
        self.table.setSortingEnabled(True)
        self._retry_pending_changes()
        if total == 0:
            self._update_folder_navigation()
            self._show_message(
                f"No hay música en {self.library_folder()}\n\n"
                "Descargá algo desde Buscar y aparecerá acá.",
                title="Tu biblioteca está vacía",
                icon="music",
                action="Buscar música",
            )
            self._set_stats("")
            return

        self.message.setVisible(False)
        self._update_folder_navigation()
        for idx, (_, width, _) in enumerate(COLUMNS):
            if idx != STRETCH_COLUMN:
                self.table.setColumnWidth(idx, width)

        self._on_finished_filter_reset()
        if self.proxy.query or self.proxy.review_filter:
            self._update_filtered_stats()

    def _on_failed(self, message: str) -> None:
        self.table.setSortingEnabled(True)
        self._show_message(
            f"No se pudo escanear: {message}",
            title="No se pudo escanear la biblioteca",
            icon="alert-triangle",
        )
        self._set_stats("")
        self._retry_pending_changes()

    def refresh_changes(self) -> None:
        """Revisa el disco y aplica solo altas, bajas y cambios de metadatos."""
        if self._library_root is None:
            return
        if self.scanner.is_running or self.refresher.is_running or self.delta.is_running:
            # Un cambio a mitad de escaneo no puede perderse: se reintenta al
            # terminar el trabajo en curso.
            self._changes_pending = True
            return
        self._changes_pending = False
        self.delta.scan(self._library_root)

    def _retry_pending_changes(self) -> None:
        if self._changes_pending:
            self._changes_pending = False
            QTimer.singleShot(0, self.refresh_changes)

    def _on_delta_changed(self, batch: list[Track]) -> None:
        self.library_body.setVisible(True)
        self.message.setVisible(False)
        for track_item in batch:
            row_index = self.model.row_of_path(track_item.path)
            if row_index >= 0:
                self.model.replace(row_index, track_item)
            else:
                self.model.append([track_item])

    def _on_delta_removed(self, paths) -> None:
        if self.model.remove_paths(paths):
            self._clear_showcase_caches()
            self._on_selection()

    def _on_delta_finished(self, changed: int, removed: int) -> None:
        self._retry_pending_changes()
        if not changed and not removed:
            return

        self._clear_showcase_caches()
        self._update_folder_navigation()
        if not len(self.model):
            self._show_message(
                f"No hay música en {self.library_folder()}\n\n"
                "Descargá algo desde Buscar y aparecerá acá.",
                title="Tu biblioteca está vacía",
                icon="music",
                action="Buscar música",
            )
            self._set_stats("")
        else:
            self._update_filtered_stats()
        self.review_data_changed.emit()

    def _on_delta_failed(self, message: str) -> None:
        self._set_stats(f"No se pudo revisar la carpeta: {message}")

    def shutdown(self) -> None:
        self.scanner.shutdown()
        self.delta.shutdown()
        self.refresher.shutdown()

    # --- filtros y seleccion -----------------------------------------------

    def _on_filter(self, text: str) -> None:
        self.proxy.set_query(text)
        self._update_folder_navigation()
        self._update_filtered_stats()

    def set_review_filter(self, review_filter: str) -> None:
        """Abre la biblioteca enfocada en una categoria de revision."""
        self.filter_box.clear()
        self.proxy.set_review_filter(review_filter)
        self._review_mode = bool(review_filter)
        self._update_folder_navigation()
        self.review_filter_btn.setVisible(bool(review_filter))
        self._clear_selections()
        self._update_filtered_stats()

    def _update_filtered_stats(self) -> None:
        if not self.proxy.query and not self.proxy.review_filter:
            if self._current_folder and self._library_root:
                if self._current_folder == self._library_root:
                    self._on_finished_filter_reset()
                else:
                    self._set_stats(f"{self.proxy.rowCount()} pistas en esta carpeta")
            return
        visible = self.proxy.rowCount()
        total = self.model.rowCount()
        self._set_stats(f"{visible} de {total} pistas" if visible != total else f"{total} pistas")

    def _on_finished_filter_reset(self) -> None:
        if not len(self.model):
            return
        track_items = self.model.tracks
        hours = sum(p.duration for p in track_items) / 3600
        artists = len({p.artist for p in track_items})
        albums = len({p.album for p in track_items})
        self._set_stats(
            f"{len(track_items)} pistas · {albums} álbumes · {artists} artistas · {hours:.1f} h"
        )

    def _on_selection(self, *_args) -> None:
        if self._syncing_selection:
            return
        self._syncing_selection = True
        try:
            track_item = self.selected_track()
            self._sync_edit_buttons(track_item)
            self.detail.set_track(track_item)
            self._request_ambient(track_item)
        finally:
            self._syncing_selection = False

    def _on_grid_selection(self, *_args) -> None:
        self._on_card_selection(self.grid_view)

    def _on_card_selection(self, view: QListView) -> None:
        if view is not self._active_card_view():
            return
        if self._syncing_selection:
            return
        self._syncing_selection = True
        try:
            marked = len(self.selected_tracks())
            sm = view.selectionModel()
            indices = sm.selectedIndexes() if sm else []
            track_item = self.selected_track()
            if marked == 1 and indices and track_item is not None:
                source_row = self.model.row_of_path(track_item.path)
                if source_row >= 0:
                    proxy_index = self.proxy.mapFromSource(
                        self.model.index(source_row, 0)
                    )
                    if proxy_index.isValid() and self.table.selectionModel():
                        self.table.selectRow(proxy_index.row())
            self._sync_edit_buttons(track_item)
            self.detail.set_track(track_item)
            self._request_ambient(track_item)
        finally:
            self._syncing_selection = False

    def _sync_edit_buttons(self, track_item: Track | None) -> None:
        """Con una pista, editar una; con varias, editar en lote."""
        marked = len(self.selected_tracks())
        self.edit_button.setVisible(marked <= 1)
        self.edit_button.setEnabled(track_item is not None)
        self.batch_button.setVisible(marked > 1)
        self.batch_button.setEnabled(marked > 1)
        self.selection_bar.set_selection(marked)

    def refresh_ambient(self) -> None:
        """Recalcula el acento de la pista marcada (al activar el ajuste)."""
        self._ambient_source = None
        self._ambient_color = ""
        self._request_ambient(self.selected_track())

    def set_ambient_enabled(self, enabled: bool) -> None:
        """Activa o apaga el tema ambiente sin releer el ajuste en cada clic."""
        self._ambient_enabled = enabled
        if enabled:
            self.refresh_ambient()
            return

        self._ambient_timer.stop()
        self._ambient_source = None
        if self._ambient_color:
            self._ambient_color = ""
            self.ambient_cleared.emit()

    def _request_ambient(self, track_item: Track | None) -> None:
        """Pide un acento nuevo para `track_item`, con un respiro por el scroll."""
        if not self._ambient_enabled:
            return

        if track_item is None or track_item.cover_path is None:
            self._ambient_timer.stop()
            self._ambient_source = None
            if self._ambient_color:
                self._ambient_color = ""
                self.ambient_cleared.emit()
            return

        cover = track_item.cover_path
        try:
            mtime_ns = cover.stat().st_mtime_ns
        except OSError:
            return

        source = (cover, mtime_ns)
        if source == self._ambient_source:
            return
        self._ambient_source = source
        self._ambient_timer.start()

    def _emit_ambient(self) -> None:
        source = self._ambient_source
        if source is None:
            return

        path, mtime_ns = source
        color = _cover_accent(path, mtime_ns)
        if color is None:
            if self._ambient_color:
                self._ambient_color = ""
                self.ambient_cleared.emit()
            return

        if color != self._ambient_color:
            self._ambient_color = color
            self.ambient_requested.emit(color)

    def _selected_album_groups(self):
        """Albumes marcados en la estanteria, en el orden visible."""
        if self.view_mode != "albums":
            return []
        view = self.view_stack.albums_view
        sm = view.selectionModel()
        rows = sm.selectedRows() if sm else []
        groups = []
        for idx in rows:
            group = self.view_stack.albums_model.album_at(idx.row())
            if group is not None:
                groups.append(group)
        return groups

    def selected_tracks(self) -> list[Track]:
        """Todas las pistas marcadas, en el orden en que se ven."""
        if self.view_mode == "albums":
            return [
                track
                for group in self._selected_album_groups()
                for track in group.tracks
            ]

        active_view = self._active_card_view()
        if active_view is not None:
            sm = active_view.selectionModel()
            indices = sm.selectedRows() if sm else []
        else:
            sm = self.table.selectionModel()
            indices = sm.selectedRows() if sm else []

        track_items = []
        for idx in indices:
            track_item = self.proxy.track_at(idx.row())
            if track_item is not None and track_item.path is not None:
                track_items.append(track_item)
        return track_items

    def selected_track(self) -> Track | None:
        if self.view_mode == "albums":
            groups = self._selected_album_groups()
            return groups[0].first_track if groups else None

        active_view = self._active_card_view()
        if active_view is not None:
            sm = active_view.selectionModel()
            indices = sm.selectedIndexes() if sm else []
            if indices:
                return self.proxy.track_at(indices[0].row())
        sm = self.table.selectionModel()
        indices = sm.selectedRows() if sm else []
        if not indices:
            return None
        return self.proxy.track_at(indices[0].row())

    # --- ficha y edicion de metadatos -----------------------------------------

    def _on_info(self) -> None:
        """Doble clic: primero la ficha, desde ahi se entra al editor."""
        track_item = self.selected_track()
        if track_item is None:
            return

        dialog = TrackInfoDialog(track_item, self)
        dialog.hermanas = self._tracks_album(track_item)
        dialog.exec()
        dialog.deleteLater()

        # El editor pudo cambiar los tags, asi que hay que releer del disco.
        self._refresh_all()

    def _on_edit(self) -> None:
        track_item = self.selected_track()
        if track_item is None:
            return

        tags = open_editor(track_item.path, self, album_tracks=self._tracks_album(track_item))
        if tags is None:
            return  # cancelado: el editor no toco el archivo

        self._refresh_track(track_item, tags)
        self._update_undo_state()

    def _on_batch_edit(self) -> None:
        """Aplica los mismos tags a todas las pistas marcadas."""
        track_items = self.selected_tracks()
        if not track_items:
            return

        result = open_edicion_batch(track_items, self)
        if result is None:
            return

        if result.applied:
            self._refresh_all()
        self._show_message(result.text_summary)
        self._update_undo_state()

    def _on_embed_current_lyrics(self) -> None:
        track_item = self.selected_track()
        if track_item is not None:
            self._start_lyrics([track_item])

    def _on_embed_selected_lyrics(self) -> None:
        track_items = self.selected_tracks()
        if track_items:
            self._start_lyrics(track_items)

    def _start_lyrics(self, track_items: list[Track]) -> None:
        if self.lyrics_embedder.is_running:
            return

        self._set_lyrics_busy(True)
        self._set_stats(f"Buscando letras para {len(track_items)} pista(s)...")
        self.lyrics_embedder.start(track_items)

    def _set_lyrics_busy(self, busy: bool) -> None:
        self.lyrics_button.setEnabled(not busy)
        self.detail.lyrics_btn.setEnabled(not busy)

    def _on_lyrics_progress(self, done: int, total: int, title: str) -> None:
        if not total:
            return
        current = min(done + 1, total)
        self._set_stats(f"Letras {current}/{total} · {title}")

    def _on_lyrics_finished(self, report) -> None:
        self._set_lyrics_busy(False)
        for outcome in report.outcomes:
            row_index = self.model.row_of_path(outcome.track.path)
            if row_index >= 0:
                self.model.replace(row_index, outcome.track)

        self._clear_showcase_caches()
        self._on_selection()
        self._set_stats(report.summary)
        self.review_data_changed.emit()

        if report.errors and not (report.embedded or report.downloaded or report.already):
            details = [
                item.message
                for item in report.outcomes
                if item.status == "error" and item.message
            ]
            if details:
                QMessageBox.warning(
                    self,
                    "No se pudieron incrustar letras",
                    "\n".join(details[:4]),
                )

    def _on_undo(self) -> None:
        """Restaura los tags previos del ultimo lote escrito."""
        found = latest_manifest(tag_history_dir())
        if found is None:
            self._show_message("No hay ningún lote para deshacer")
            self._update_undo_state()
            return

        batch, manifest_path = found
        confirm = QMessageBox.question(
            self,
            "Deshacer último lote",
            f"Se van a restaurar los tags anteriores de {batch.text_summary}.\n\n{batch.label}",
        )
        if confirm != QMessageBox.StandardButton.Yes:
            return

        result = revert_batch(batch)
        if not result.errors:
            manifest_path.unlink(missing_ok=True)
        self._refresh_all()
        self._show_message(result.text_summary)
        self._update_undo_state()

    def _update_undo_state(self) -> None:
        """Habilita 'Deshacer' solo si hay un lote guardado."""
        self.undo_button.setEnabled(latest_manifest(tag_history_dir()) is not None)

    def _tracks_album(self, track_item: Track) -> list[Track]:
        """Las otras pistas de la misma carpeta, para el 'Aplicar a todo el álbum'."""
        return [
            t
            for t in self.model.tracks
            if t.folder == track_item.folder and t.path != track_item.path
        ]

    def _refresh_all(self) -> None:
        """Relee desde el disco todas las pistas del modelo.

        Va en un hilo aparte: son dos lecturas de mutagen por pista y con miles
        de pistas el hilo de la GUI se congela durante segundos.
        """
        if self.refresher.is_running or self.delta.is_running:
            return

        self.table.setSortingEnabled(False)
        self._set_stats("Actualizando la biblioteca...")
        self.refresher.refresh([t.path for t in self.model.tracks])

    def _on_refreshed(self, batch_items) -> None:
        for file_path, updated in batch_items:
            if not updated.cover_path:
                updated.cover_path = folder_cover(file_path.parent, self._covers)
            row_index = self.model.row_of_path(file_path)
            if row_index >= 0:
                self.model.replace(row_index, updated)

    def _on_refresh_done(self, total: int) -> None:
        self._clear_showcase_caches()
        self.table.setSortingEnabled(True)
        self._on_selection()
        self._set_stats(f"{total} pistas actualizadas")
        self.review_data_changed.emit()
        self._retry_pending_changes()

    def _on_refresh_failed(self, message: str) -> None:
        self.table.setSortingEnabled(True)
        self._show_message(
            f"No se pudo actualizar la biblioteca: {message}",
            title="No se pudo actualizar",
            icon="alert-triangle",
        )
        self._update_filtered_stats()
        self.review_data_changed.emit()
        self._retry_pending_changes()

    def _refresh_track(self, track_item: Track, tags) -> None:
        """Vuelve a leer la pista del disco y actualiza la fila y el detalle."""
        updated = load_track(track_item.path)
        if updated is None:
            self._set_stats("No se pudo releer el archivo")
            return

        updated.cover_path = extract_cover(updated.path, covers_dir())
        if not updated.cover_path:
            updated.cover_path = folder_cover(updated.path.parent, self._covers)
        row_index = self.model.row_of(track_item)
        if row_index < 0:
            return

        self._clear_showcase_caches()
        for field_name in ("title", "artist", "album", "year", "genre", "track_number"):
            setattr(updated, field_name, getattr(tags, field_name) or getattr(updated, field_name))
        if not tags.artist:
            updated.artist = tags.albumartist or updated.artist

        try:
            stat = updated.path.stat()
            indexed = IndexedTrack(track=updated, mtime_ns=stat.st_mtime_ns, size=stat.st_size)
            with LibraryIndex(library_index_file()) as index:
                index.upsert([indexed])
        except Exception:
            logger.warning(
                "No se pudo actualizar la pista en SQLite: %s", updated.path, exc_info=True
            )

        self.model.replace(row_index, updated)

        if self.selected_track() is not None:
            self._on_selection()
        self._update_filtered_stats()
        self.review_data_changed.emit()
        self.detail.flash_saved()

    # --- carpeta -------------------------------------------------------------

    def _on_pick_folder(self) -> None:
        chosen = QFileDialog.getExistingDirectory(
            self, "Carpeta de música", str(self.library_folder())
        )
        if not chosen:
            return
        save_settings({"library_folder": chosen})
        self.subtitle.setText(chosen)
        self.rescan(Path(chosen))

    def _activate_folder_item(self, item: QListWidgetItem) -> None:
        folder = item.data(Qt.ItemDataRole.UserRole)
        if isinstance(folder, Path):
            self._open_folder(folder)

    def _open_folder(self, folder: Path | None) -> None:
        if folder is None or self._library_root is None:
            return
        folder = Path(folder)
        try:
            folder.relative_to(self._library_root)
        except ValueError:
            return
        if not folder.is_dir():
            return

        self._current_folder = folder
        self.proxy.set_folder_filter(folder)
        self._clear_selections()
        self._update_folder_navigation()
        self._update_filtered_stats()

    def _open_parent_folder(self) -> None:
        if (
            self._current_folder is None
            or self._library_root is None
            or self._current_folder == self._library_root
        ):
            return
        parent = self._current_folder.parent
        if parent != self._library_root and self._library_root not in parent.parents:
            return
        self._open_folder(parent)

    def _update_folder_navigation(self) -> None:
        root = self._library_root
        current = self._current_folder
        if root is None or current is None:
            self.folder_panel.setVisible(False)
            self.up_folder_button.setVisible(False)
            self.folder_location.set_message("Biblioteca")
            self._update_navigation_visibility()
            return

        self.up_folder_button.setVisible(
            current != root and not self.proxy.query and not self._review_mode
        )
        if self.proxy.query or self._review_mode:
            self.folder_location.set_message("Toda la biblioteca")
        else:
            self.folder_location.set_path(root, current)
        self._update_navigation_visibility()
        self.proxy.set_folder_filter(
            current if not self.proxy.query and not self._review_mode else None
        )
        self._populate_folder_list()

    def _populate_folder_list(self) -> None:
        if not hasattr(self, "folder_list"):
            return
        self.folder_list.clear()
        root = self._library_root
        current = self._current_folder
        if root is None or current is None or self.proxy.query or self._review_mode:
            self.folder_panel.setVisible(False)
            return

        children: dict[Path, list[Track]] = {}
        for track in self.model.tracks:
            try:
                relative = track.folder.relative_to(current)
            except ValueError:
                continue
            if not relative.parts:
                continue
            child = current / relative.parts[0]
            children.setdefault(child, []).append(track)

        t = th.active()
        for folder, tracks in sorted(children.items(), key=lambda entry: entry[0].name.casefold()):
            cover = next(
                (
                    track.cover_path
                    for track in tracks
                    if track.cover_path and track.cover_path.is_file()
                ),
                None,
            )
            if cover is None:
                cover = folder_cover(folder, self._covers)
            folder_icon = (
                QIcon(render_cover(cover, 28))
                if cover and cover.is_file()
                else icons.icon("folder", t.accent, 22)
            )
            item = QListWidgetItem(
                folder_icon,
                f"{folder.name} · {len(tracks)} pistas",
            )
            item.setTextAlignment(Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter)
            item.setData(Qt.ItemDataRole.UserRole, folder)
            item.setToolTip(f"{folder.name}\n{len(tracks)} pistas\nClic para abrir")
            self.folder_list.addItem(item)

        self.folder_panel.setVisible(self.section == "folders" and bool(children))

    # --- utilidades ---------------------------------------------------------

    def _show_message(self, text: str, title: str = "", icon: str = "", action: str = "") -> None:
        if not text:
            # Sin error: si hay pistas se muestra la biblioteca, si no el
            # estado vacio ilustrado.
            if len(self.model):
                self.message.setVisible(False)
                self.empty_illustrated.setVisible(False)
                self.library_body.setVisible(True)
            else:
                self.message.setVisible(False)
                self.library_body.setVisible(False)
                self.empty_illustrated.setVisible(True)
            return
        # Error: se muestra el MessageBlock normal, no el ilustrado.
        self.library_body.setVisible(False)
        self.empty_illustrated.setVisible(False)
        self.message.set_text(text)
        self.message.set_title(title)
        self.message.set_icon(icon)
        self.message.set_action(action, icon="search" if action else "")
        self.message.setVisible(True)

    def _set_stats(self, text: str) -> None:
        self.stats.setText(text)

    def refresh(self) -> None:
        """Recolorea tras un cambio de tema."""
        self.apply_theme_to_table()
        self.message.refresh()
        self.empty_illustrated.refresh()

    def showEvent(self, event) -> None:
        """Escanea la primera vez que se abre la pagina."""
        super().showEvent(event)
        self._update_disc_animation()
        self.refresh_ambient()
        if not len(self.model) and not self.scanner.is_running:
            self.subtitle.setText(str(self.library_folder()))
            self.rescan()

    def hideEvent(self, event) -> None:
        self._disc_timer.stop()
        super().hideEvent(event)
