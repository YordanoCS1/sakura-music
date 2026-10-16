"""Pagina de biblioteca local con varios diseños, filtros y detalle."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QSize, Qt, QTimer, Signal
from PySide6.QtGui import (
    QIcon,
)
from PySide6.QtWidgets import (
    QAbstractItemView,
    QFileDialog,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QListView,
    QListWidget,
    QListWidgetItem,
    QStackedWidget,
    QTableView,
    QVBoxLayout,
    QWidget,
)

from ...config import covers_dir, load_settings, music_dir, save_settings
from ...core.library import Track, extract_cover, load_track
from .. import icons
from .. import theme as th
from ..covers import folder_cover, render_cover
from ..models.track_model import COLUMNS, STRETCH_COLUMN, TrackFilterProxy, TrackTableModel
from ..services.library import LibraryRefresher, LibraryScanner
from ..widgets.batch_editor import open_edicion_batch
from ..widgets.buttons import IconButton, TextButton
from ..widgets.metadata_editor import open_editor
from ..widgets.track_delegates import TrackGridDelegate, TrackShowcaseDelegate
from ..widgets.track_detail import TrackDetail
from ..widgets.track_info import TrackInfoDialog
from .base import Page


class LibraryPage(Page):
    """Escanea la carpeta de musica y lista todo lo que encuentre."""

    review_data_changed = Signal()

    def __init__(self, parent=None):
        super().__init__("Biblioteca", "Tu música local", parent)

        self.model = TrackTableModel(self)
        self.proxy = TrackFilterProxy(self)
        self.proxy.setSourceModel(self.model)

        self.view_mode = str(load_settings().get("library_view", "table"))
        if self.view_mode not in ("table", "grid", "discs", "carousel"):
            self.view_mode = "table"
        self._syncing_selection = False
        self._covers: dict[Path, Path | None] = {}
        self._library_root: Path | None = None
        self._current_folder: Path | None = None
        self._review_mode = False

        self.scanner = LibraryScanner(self)
        self.scanner.tracks_found.connect(self._on_tracks)
        self.scanner.finished.connect(self._on_finished)
        self.scanner.failed.connect(self._on_failed)
        self.scanner.progress.connect(self._on_progress)

        self.refresher = LibraryRefresher(self)
        self.refresher.tracks_refreshed.connect(self._on_refreshed)
        self.refresher.finished.connect(self._on_refresh_done)
        self.refresher.failed.connect(self._on_refresh_failed)

        self._disc_rotation = 0
        self._disc_timer = QTimer(self)
        self._disc_timer.setInterval(50)
        self._disc_timer.timeout.connect(self._advance_disc_animation)
        self._build()
        self.apply_theme_to_table()

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        controles = QWidget()
        bar = QHBoxLayout(controles)
        bar.setContentsMargins(0, 0, 0, 10)
        bar.setSpacing(10)

        self.filter_box = QLineEdit()
        self.filter_box.setObjectName("SearchInput")
        self.filter_box.setPlaceholderText(
            "Buscar canciones en toda la biblioteca..."
        )
        self.filter_box.setClearButtonEnabled(True)
        self.filter_box.setMaximumWidth(420)
        self.filter_box.setMinimumWidth(260)
        self.filter_box.textChanged.connect(self._on_filter)
        bar.addWidget(self.filter_box)

        self.review_filter_btn = TextButton("Ver toda la biblioteca", "ghost")
        self.review_filter_btn.setVisible(False)
        self.review_filter_btn.clicked.connect(lambda: self.set_review_filter(""))
        bar.addWidget(self.review_filter_btn, 0)

        self.stats = QLabel("")
        self.stats.setObjectName("EmptyState")
        bar.addSpacing(8)
        bar.addWidget(self.stats, 1)

        # Diseños alternativos para explorar las pistas.
        self.btn_view_table = IconButton("list", "Vista en tabla", 38)
        self.btn_view_table.clicked.connect(lambda: self.set_view_mode("table"))
        bar.addWidget(self.btn_view_table, 0)

        self.btn_view_grid = IconButton("grid", "Vista en tarjetas", 38)
        self.btn_view_grid.clicked.connect(lambda: self.set_view_mode("grid"))
        bar.addWidget(self.btn_view_grid, 0)

        self.btn_view_discs = IconButton("disc", "Vista de discos", 38)
        self.btn_view_discs.clicked.connect(lambda: self.set_view_mode("discs"))
        bar.addWidget(self.btn_view_discs, 0)

        self.btn_view_carousel = IconButton("music", "Vista carrusel", 38)
        self.btn_view_carousel.clicked.connect(lambda: self.set_view_mode("carousel"))
        bar.addWidget(self.btn_view_carousel, 0)

        self.open_button = IconButton("folder", "Cambiar carpeta", 38)
        self.open_button.clicked.connect(self._on_pick_folder)
        bar.addWidget(self.open_button, 0)

        self.reload_button = IconButton("repeat", "Volver a escanear", 38)
        self.reload_button.clicked.connect(lambda: self.rescan())
        bar.addWidget(self.reload_button, 0)

        self.edit_button = TextButton("Editar metadatos", "ghost")
        self.edit_button.clicked.connect(self._on_edit)
        self.edit_button.setEnabled(False)
        bar.addWidget(self.edit_button, 0)

        # Con varias pistas marcadas el boton anterior pasa a ser el de lote:
        # editar de a una con diez seleccionadas no es lo que se quiere.
        self.batch_button = TextButton("Editar en lote", "accent")
        self.batch_button.clicked.connect(self._on_batch_edit)
        self.batch_button.setEnabled(False)
        self.batch_button.setVisible(False)
        bar.addWidget(self.batch_button, 0)

        self.content.addWidget(controles)

        body = QWidget()
        body_layout = QHBoxLayout(body)
        body_layout.setContentsMargins(0, 0, 0, 0)
        body_layout.setSpacing(0)

        library = QWidget()
        library_layout = QVBoxLayout(library)
        library_layout.setContentsMargins(0, 0, 0, 0)
        library_layout.setSpacing(10)

        navegacion = QWidget()
        navegacion_layout = QHBoxLayout(navegacion)
        navegacion_layout.setContentsMargins(0, 0, 0, 0)
        navegacion_layout.setSpacing(8)
        self.up_folder_button = TextButton("Volver", "ghost")
        self.up_folder_button.clicked.connect(self._open_parent_folder)
        self.up_folder_button.setVisible(False)
        navegacion_layout.addWidget(self.up_folder_button, 0)
        self.folder_location = QLabel("Biblioteca")
        self.folder_location.setObjectName("PageSubtitle")
        navegacion_layout.addWidget(self.folder_location, 1)
        library_layout.addWidget(navegacion)

        self.folder_panel = QWidget()
        folder_panel_layout = QVBoxLayout(self.folder_panel)
        folder_panel_layout.setContentsMargins(0, 0, 0, 0)
        folder_panel_layout.setSpacing(4)
        folder_heading = QWidget()
        folder_heading_layout = QHBoxLayout(folder_heading)
        folder_heading_layout.setContentsMargins(0, 0, 0, 0)
        folder_heading_layout.setSpacing(8)
        self.folder_heading_label = QLabel("Carpetas")
        folder_heading_layout.addWidget(self.folder_heading_label)
        folder_heading_layout.addStretch(1)
        self.open_folder_button = TextButton("Abrir carpeta", "ghost")
        self.open_folder_button.setEnabled(False)
        self.open_folder_button.clicked.connect(self._open_selected_folder)
        folder_heading_layout.addWidget(self.open_folder_button)
        folder_panel_layout.addWidget(folder_heading)

        self.folder_list = QListWidget()
        self.folder_list.setObjectName("LibraryFolderGrid")
        self.folder_list.setViewMode(QListView.ViewMode.IconMode)
        self.folder_list.setResizeMode(QListView.ResizeMode.Adjust)
        self.folder_list.setMovement(QListView.Movement.Static)
        self.folder_list.setWrapping(True)
        self.folder_list.setWordWrap(True)
        self.folder_list.setIconSize(QSize(56, 56))
        self.folder_list.setGridSize(QSize(156, 104))
        self.folder_list.setSpacing(4)
        self.folder_list.setMaximumHeight(176)
        self.folder_list.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.folder_list.setVerticalScrollMode(
            QAbstractItemView.ScrollMode.ScrollPerPixel
        )
        self.folder_list.itemSelectionChanged.connect(
            lambda: self.open_folder_button.setEnabled(
                self.folder_list.currentItem() is not None
            )
        )
        self.folder_list.itemActivated.connect(self._activate_folder_item)
        folder_panel_layout.addWidget(self.folder_list)
        self.folder_panel.setVisible(False)
        library_layout.addWidget(self.folder_panel)

        self.tracks_heading = QLabel("Canciones")
        self.tracks_heading.setObjectName("PageSubtitle")
        library_layout.addWidget(self.tracks_heading)

        # Stack de vistas: tabla, tarjetas, discos y carrusel horizontal.
        self.view_stack = QStackedWidget()

        # 1. Tabla
        self.table = QTableView()
        self.table.setModel(self.proxy)
        self.table.setObjectName("TrackTable")
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setAlternatingRowColors(True)
        self.table.setShowGrid(False)
        self.table.setWordWrap(False)
        self.table.verticalHeader().setVisible(False)
        self.table.verticalHeader().setDefaultSectionSize(52)
        self.table.setIconSize(QSize(40, 40))
        self.table.setSortingEnabled(True)
        self.table.setHorizontalScrollMode(
            QAbstractItemView.ScrollMode.ScrollPerPixel
        )
        self.table.setVerticalScrollMode(QAbstractItemView.ScrollMode.ScrollPerPixel)
        self.table.selectionModel().selectionChanged.connect(self._on_selection)

        header = self.table.horizontalHeader()
        header.setHighlightSections(False)
        header.setMinimumSectionSize(44)

        for idx, (_, width, _) in enumerate(COLUMNS):
            is_stretch = idx == STRETCH_COLUMN
            resize_mode = (
                QHeaderView.ResizeMode.Stretch
                if is_stretch
                else QHeaderView.ResizeMode.Interactive
            )
            header.setSectionResizeMode(idx, resize_mode)
            if not is_stretch:
                self.table.setColumnWidth(idx, width)

        self.table.doubleClicked.connect(lambda _index: self._on_info())
        self.view_stack.addWidget(self.table)

        # 2. Cuadrícula / Galería de Tarjetas
        self.grid_view = QListView()
        self.grid_view.setObjectName("TrackGrid")
        self.grid_view.setModel(self.proxy)
        self.grid_delegate = TrackGridDelegate(self)
        self.grid_view.setItemDelegate(self.grid_delegate)
        self.grid_view.setViewMode(QListView.ViewMode.IconMode)
        self.grid_view.setResizeMode(QListView.ResizeMode.Adjust)
        self.grid_view.setWrapping(True)
        self.grid_view.setSpacing(10)
        self.grid_view.setUniformItemSizes(True)
        self.grid_view.setMovement(QListView.Movement.Static)
        self.grid_view.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        self.grid_view.setVerticalScrollMode(QAbstractItemView.ScrollMode.ScrollPerPixel)
        self.grid_view.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        self.grid_view.selectionModel().selectionChanged.connect(self._on_grid_selection)
        self.grid_view.doubleClicked.connect(lambda _index: self._on_info())
        self.view_stack.addWidget(self.grid_view)

        self.discs_view = self._create_showcase_view("discs")
        self.discs_delegate = TrackShowcaseDelegate("discs", self)
        self.discs_view.setItemDelegate(self.discs_delegate)
        self.view_stack.addWidget(self.discs_view)

        self.carousel_view = self._create_showcase_view("carousel")
        self.carousel_delegate = TrackShowcaseDelegate("carousel", self)
        self.carousel_view.setItemDelegate(self.carousel_delegate)
        self.carousel_view.setViewMode(QListView.ViewMode.ListMode)
        self.carousel_view.setFlow(QListView.Flow.LeftToRight)
        self.carousel_view.setWrapping(False)
        self.carousel_view.setSpacing(12)
        self.carousel_view.setHorizontalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAsNeeded
        )
        self.carousel_view.setVerticalScrollBarPolicy(
            Qt.ScrollBarPolicy.ScrollBarAlwaysOff
        )
        self.carousel_view.setHorizontalScrollMode(
            QAbstractItemView.ScrollMode.ScrollPerPixel
        )
        self.carousel_view.setVerticalScrollMode(
            QAbstractItemView.ScrollMode.ScrollPerPixel
        )
        self.view_stack.addWidget(self.carousel_view)

        self.card_views = {
            "grid": self.grid_view,
            "discs": self.discs_view,
            "carousel": self.carousel_view,
        }
        self.card_delegates = {
            "grid": self.grid_delegate,
            "discs": self.discs_delegate,
            "carousel": self.carousel_delegate,
        }
        self.view_buttons = {
            "table": self.btn_view_table,
            "grid": self.btn_view_grid,
            "discs": self.btn_view_discs,
            "carousel": self.btn_view_carousel,
        }
        for mode, view in self.card_views.items():
            if mode != "grid":
                view.selectionModel().selectionChanged.connect(
                    lambda *_args, selected_view=view: self._on_card_selection(
                        selected_view
                    )
                )
            view.doubleClicked.connect(lambda _index: self._on_info())

        library_layout.addWidget(self.view_stack, 1)
        body_layout.addWidget(library, 1)

        self.detail = TrackDetail()
        body_layout.addWidget(self.detail)
        self.content.addWidget(body, 1)

        self.message = self.empty_state("")
        self.content.addWidget(self.message)

        self.set_view_mode(self.view_mode, save=False)

    def _create_showcase_view(self, mode: str) -> QListView:
        view = QListView()
        view.setObjectName(f"Track{mode.title()}")
        view.setModel(self.proxy)
        view.setViewMode(QListView.ViewMode.IconMode)
        view.setResizeMode(QListView.ResizeMode.Adjust)
        view.setWrapping(True)
        view.setSpacing(10)
        view.setUniformItemSizes(True)
        view.setMovement(QListView.Movement.Static)
        view.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        view.setVerticalScrollMode(QAbstractItemView.ScrollMode.ScrollPerPixel)
        view.setSelectionMode(QAbstractItemView.SelectionMode.ExtendedSelection)
        return view

    def set_view_mode(self, mode: str, save: bool = True) -> None:
        """Alterna entre los diseños disponibles para la biblioteca."""
        if mode not in self.view_buttons:
            mode = "table"
        if mode != self.view_mode:
            self._clear_selections()
        self.view_mode = mode
        index = ("table", "grid", "discs", "carousel").index(self.view_mode)
        self.view_stack.setCurrentIndex(index)
        self._update_view_mode_buttons()
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

    def _update_view_mode_buttons(self) -> None:
        t = th.active()
        active_style = (
            f"background: {t.surface_hover}; border: 1px solid {t.accent}; "
            f"border-radius: {t.radius_sm}px;"
        )
        for mode, button in self.view_buttons.items():
            button.setStyleSheet(active_style if mode == self.view_mode else "")

    def _clear_selections(self) -> None:
        self.table.clearSelection()
        for view in self.card_views.values():
            view.clearSelection()
        self.detail.set_track(None)
        self._sync_edit_buttons(None)

    def _active_card_view(self) -> QListView | None:
        return self.card_views.get(self.view_mode)

    def _clear_showcase_caches(self) -> None:
        for delegate in self.card_delegates.values():
            delegate.clear_cache()

    def apply_theme_to_table(self) -> None:
        t = th.active()
        self.table.setStyleSheet(
            f"QTableView {{ background: {t.bg}; alternate-background-color: {t.surface};"
            f" border: none; gridline-color: transparent; color: {t.text};"
            f" selection-background-color: {t.selection};"
            f" selection-color: {t.selection_text}; font-size: 13px; }}"
            f"QHeaderView::section {{ background: {t.bg}; color: {t.text_muted};"
            f" border: none; border-bottom: 1px solid {t.border}; padding: 8px 10px;"
            f" font-size: 11px; font-weight: 700; letter-spacing: 0.5px; }}"
            f"QTableView::item {{ padding: 0 10px; border: none; }}"
            f"QTableCornerButton::section {{ background: {t.bg}; border: none; }}"
        )
        self._clear_showcase_caches()
        for view in self.card_views.values():
            view.viewport().update()
        self._update_view_mode_buttons()
        self.open_button.refresh()
        self.reload_button.refresh()
        for button in self.view_buttons.values():
            button.refresh()
        self.detail.refresh()
        self._populate_folder_list()

    # --- ciclo de escaneo ---------------------------------------------------

    def library_folder(self) -> Path:
        configurado = load_settings().get("library_folder")
        return Path(configurado) if configurado else music_dir()

    def rescan(self, folder: Path | None = None) -> None:
        root = folder or self.library_folder()
        if not root.is_dir():
            self._show_message(f"La carpeta no existe: {root}")
            return

        root = root.resolve()
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
        self._show_message("Escaneando...")
        self._set_stats("Leyendo metadatos...")
        self.scanner.scan(root)

    def _on_tracks(self, batch: list[Track]) -> None:
        self.message.setVisible(False)
        self.model.append(batch)

    def _on_progress(self, count: int) -> None:
        self._set_stats(f"{count} pistas...")

    def _on_finished(self, total: int, summary: dict[str, int]) -> None:
        self.table.setSortingEnabled(True)
        if total == 0:
            self._update_folder_navigation()
            self._show_message(
                f"No hay música en {self.library_folder()}\n\n"
                "Descargá algo desde Buscar y aparecerá acá."
            )
            self._set_stats("")
            return

        self.message.setVisible(False)
        self._update_folder_navigation()
        for idx, (_, width, _) in enumerate(COLUMNS):
            if idx != STRETCH_COLUMN:
                self.table.setColumnWidth(idx, width)

        hours = summary["duracion"] / 3600
        self._set_stats(
            f"{summary['pistas']} pistas · {summary['albumes']} álbumes · "
            f"{summary['artistas']} artistas · {hours:.1f} h"
        )
        if self.proxy.query or self.proxy.review_filter:
            self._update_filtered_stats()

    def _on_failed(self, message: str) -> None:
        self.table.setSortingEnabled(True)
        self._show_message(f"No se pudo escanear: {message}")
        self._set_stats("")

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
                    self._set_stats(
                        f"{self.proxy.rowCount()} pistas en esta carpeta"
                    )
            return
        visible = self.proxy.rowCount()
        total = self.model.rowCount()
        self._set_stats(
            f"{visible} de {total} pistas"
            if visible != total
            else f"{total} pistas"
        )

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
        if self.view_mode != "table":
            return
        if self._syncing_selection:
            return
        self._syncing_selection = True
        try:
            track_item = self.selected_track()
            self._sync_edit_buttons(track_item)
            self.detail.set_track(track_item)
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
            sm = self.grid_view.selectionModel()
            indices = sm.selectedIndexes() if sm else []
            if marked == 1 and indices and self.table.selectionModel():
                self.table.selectRow(indices[0].row())
            track_item = self.selected_track()
            self._sync_edit_buttons(track_item)
            self.detail.set_track(track_item)
        finally:
            self._syncing_selection = False

    def _sync_edit_buttons(self, track_item: Track | None) -> None:
        """Con una pista, editar una; con varias, editar en lote."""
        marked = len(self.selected_tracks())
        self.edit_button.setVisible(marked <= 1)
        self.edit_button.setEnabled(track_item is not None)
        self.batch_button.setVisible(marked > 1)
        self.batch_button.setEnabled(marked > 1)

    def selected_tracks(self) -> list[Track]:
        """Todas las pistas marcadas, en el orden en que se ven."""
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
        if self.refresher.is_running:
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

    def _on_refresh_failed(self, message: str) -> None:
        self.table.setSortingEnabled(True)
        self._show_message(f"No se pudo actualizar la biblioteca: {message}")
        self._update_filtered_stats()
        self.review_data_changed.emit()

    def _refresh_track(self, track_item: Track, tags) -> None:
        """Vuelve a leer la pista del disco y actualiza la fila y el detalle."""
        updated = load_track(track_item.path)
        if updated is None:
            self._set_stats("No se pudo releer el archivo")
            return

        updated.cover_path = extract_cover(updated.path, covers_dir())
        if not updated.cover_path:
            updated.cover_path = folder_cover(
                updated.path.parent, self._covers
            )
        row_index = self.model.row_of(track_item)
        if row_index < 0:
            return

        self._clear_showcase_caches()
        for field_name in ("title", "artist", "album", "year", "genre", "track_number"):
            setattr(updated, field_name, getattr(tags, field_name) or getattr(updated, field_name))
        if not tags.artist:
            updated.artist = tags.albumartist or updated.artist

        self.model.replace(row_index, updated)

        if self.selected_track() is not None:
            self._on_selection()
        self._update_filtered_stats()
        self.review_data_changed.emit()

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

    def _open_selected_folder(self) -> None:
        item = self.folder_list.currentItem()
        if item is not None:
            self._activate_folder_item(item)

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
            return

        try:
            relative = current.relative_to(root)
        except ValueError:
            relative = Path()
        location = [root.name or str(root), *relative.parts]
        self.up_folder_button.setVisible(
            current != root and not self.proxy.query and not self._review_mode
        )
        self.folder_location.setText(
            "Toda la biblioteca"
            if self.proxy.query or self._review_mode
            else " / ".join(location)
        )
        self.tracks_heading.setText(
            "Resultados de búsqueda"
            if self.proxy.query
            else (
                "Resultados de revisión"
                if self._review_mode
                else "Canciones en esta carpeta"
            )
        )
        self.proxy.set_folder_filter(
            current
            if not self.proxy.query and not self._review_mode
            else None
        )
        self._populate_folder_list()

    def _populate_folder_list(self) -> None:
        if not hasattr(self, "folder_list"):
            return
        self.folder_list.clear()
        root = self._library_root
        current = self._current_folder
        if (
            root is None
            or current is None
            or self.proxy.query
            or self._review_mode
        ):
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
        for folder, tracks in sorted(
            children.items(), key=lambda entry: entry[0].name.casefold()
        ):
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
                QIcon(render_cover(cover, 56))
                if cover and cover.is_file()
                else icons.icon("folder", t.accent, 42)
            )
            item = QListWidgetItem(
                folder_icon,
                f"{folder.name}\n{len(tracks)} pistas",
            )
            item.setTextAlignment(Qt.AlignmentFlag.AlignHCenter)
            item.setData(Qt.ItemDataRole.UserRole, folder)
            item.setToolTip(
                f"{folder.name}\n{len(tracks)} pistas\nDoble clic para abrir"
            )
            self.folder_list.addItem(item)

        self.folder_panel.setVisible(bool(children))

    # --- utilidades ---------------------------------------------------------

    def _show_message(self, text: str) -> None:
        if not text:
            self.message.setVisible(False)
            return
        self.message.set_text(text)
        self.message.setVisible(True)

    def _set_stats(self, text: str) -> None:
        self.stats.setText(text)

    def refresh(self) -> None:
        """Recolorea tras un cambio de tema."""
        self.apply_theme_to_table()

    def showEvent(self, event) -> None:
        """Escanea la primera vez que se abre la pagina."""
        super().showEvent(event)
        self._update_disc_animation()
        if not len(self.model) and not self.scanner.is_running:
            self.subtitle.setText(str(self.library_folder()))
            self.rescan()

    def hideEvent(self, event) -> None:
        self._disc_timer.stop()
        super().hideEvent(event)