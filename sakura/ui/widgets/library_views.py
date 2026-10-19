"""Las cuatro vistas de la Biblioteca: tabla, tarjetas, discos y carrusel."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import (
    QAbstractItemView,
    QHeaderView,
    QListView,
    QStackedWidget,
    QTableView,
)

from ..models.track_model import COLUMNS, STRETCH_COLUMN
from .track_delegates import TrackGridDelegate, TrackShowcaseDelegate

# Orden del stack. Tiene que coincidir con los botones de la barra.
VIEW_ORDER = ("table", "grid", "discs", "carousel")


class LibraryViewStack(QStackedWidget):
    """Stack con las vistas de pistas y sus delegates.

    La pagina conecta las senales de seleccion y doble clic; esto solo arma los
    widgets y sabe cual esta activo.
    """

    def __init__(self, proxy, parent=None):
        super().__init__(parent)
        self._build_table(proxy)
        self._build_grid(proxy)
        self._build_discs(proxy)
        self._build_carousel(proxy)

    # --- construccion -------------------------------------------------------

    def _build_table(self, proxy) -> None:
        self.table = QTableView()
        self.table.setModel(proxy)
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
        self.table.setHorizontalScrollMode(QAbstractItemView.ScrollMode.ScrollPerPixel)
        self.table.setVerticalScrollMode(QAbstractItemView.ScrollMode.ScrollPerPixel)

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

        self.addWidget(self.table)

    def _build_grid(self, proxy) -> None:
        self.grid_view = QListView()
        self.grid_view.setObjectName("TrackGrid")
        self.grid_view.setModel(proxy)
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
        self.addWidget(self.grid_view)

    def _build_discs(self, proxy) -> None:
        self.discs_view = self._create_showcase_view(proxy, "discs")
        self.discs_delegate = TrackShowcaseDelegate("discs", self)
        self.discs_view.setItemDelegate(self.discs_delegate)
        self.addWidget(self.discs_view)

    def _build_carousel(self, proxy) -> None:
        self.carousel_view = self._create_showcase_view(proxy, "carousel")
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
        self.addWidget(self.carousel_view)

    def _create_showcase_view(self, proxy, mode: str) -> QListView:
        view = QListView()
        view.setObjectName(f"Track{mode.title()}")
        view.setModel(proxy)
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

    # --- API ----------------------------------------------------------------

    @property
    def card_views(self) -> dict[str, QListView]:
        return {
            "grid": self.grid_view,
            "discs": self.discs_view,
            "carousel": self.carousel_view,
        }

    @property
    def card_delegates(self) -> dict[str, object]:
        return {
            "grid": self.grid_delegate,
            "discs": self.discs_delegate,
            "carousel": self.carousel_delegate,
        }

    @property
    def mode(self) -> str:
        return VIEW_ORDER[self.currentIndex()]

    def set_mode(self, mode: str) -> None:
        self.setCurrentIndex(VIEW_ORDER.index(mode))

    def active_card_view(self) -> QListView | None:
        return self.card_views.get(self.mode)

    def clear_selections(self) -> None:
        self.table.clearSelection()
        for view in self.card_views.values():
            view.clearSelection()

    def clear_caches(self) -> None:
        for delegate in self.card_delegates.values():
            delegate.clear_cache()

    def update_viewports(self) -> None:
        for view in self.card_views.values():
            view.viewport().update()
