"""Modelo de tabla para la biblioteca.

Usa `QAbstractTableModel` en vez de un widget por fila: con miles de pistas un
`QScrollArea` lleno de labels se arrastra, mientras que la vista de Qt solo
pinta las filas visibles.
"""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import (
    QAbstractItemModel,
    QAbstractTableModel,
    QModelIndex,
    QSortFilterProxyModel,
    Qt,
)
from PySide6.QtGui import QIcon

from ...core.library import UNKNOWN, Track, duplicate_track_paths
from .. import theme as th
from ..covers import render_cover

# (titulo de columna, ancho por defecto, alineacion)
# Los anchos estan pensados para que la tabla entre sin scroll horizontal en
# una ventana de 1240 px con el panel de detalle abierto. Título queda en modo
# Stretch y se lleva lo que sobra, asi que las demas deben ser compactas.
COLUMNS: tuple[tuple[str, int, Qt.AlignmentFlag], ...] = (
    ("#", 44, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter),
    ("Título", 200, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
    ("Artista", 150, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
    ("Álbum", 150, Qt.AlignmentFlag.AlignLeft | Qt.AlignmentFlag.AlignVCenter),
    ("Año", 60, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter),
    ("Duración", 72, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter),
    ("Tamaño", 74, Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter),
)

# Columna que absorbe el ancho sobrante.
STRETCH_COLUMN = 1

SORT_ROLE = Qt.ItemDataRole.UserRole + 1

# Ancho de la parte numerica de la clave. 18 digitos cubren segundos con
# decimales y bytes de archivos gigantes sin perder precision.
_NUM_WIDTH = 18


def _text_key(value: str, fallback: str = "") -> str:
    """Clave de texto que manda al final lo que esta vacio.

    El prefijo hace el trabajo: todo lo que empieza con '0' ordena antes que
    cualquier cosa que empiece con '1', sin importar el resto de la cadena.
    """
    clean = (value or "").strip().lower()
    if clean:
        return f"0{clean}"
    return f"1{(fallback or '').strip().lower()}"


def _num_key(value: float | int | None) -> str:
    """Clave numerica de ancho fijo, comparable como texto.

    Devolver un `float` a secas no sirve para la columna Año (que a veces trae
    texto), y una tupla de Python Qt la convierte a un QVariant que no sabe
    comparar: `lessThan` daria False en ambos sentidos y el orden no cambiaria.
    """
    if value is None:
        return f"1{'0' * _NUM_WIDTH}"
    return f"0{float(value):0{_NUM_WIDTH}.4f}"


def _as_number(text_value: str) -> float | None:
    """Interpreta un Año, que puede venir como '2001' o '2001-05-03'."""
    if not text_value:
        return None
    digits = "".join(c for c in str(text_value)[:4] if c.isdigit())
    return float(digits) if digits else None


class TrackTableModel(QAbstractTableModel):
    """Pistas de la biblioteca con ordenamiento por columna."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._tracks: list[Track] = []
        self._cover_icons: dict[tuple[str, str], QIcon] = {}

    # --- API pública --------------------------------------------------------

    def set_tracks(self, tracks: list[Track]) -> None:
        self._cover_icons.clear()
        self.beginResetModel()
        self._tracks = tracks
        self.endResetModel()

    def append(self, tracks: list[Track]) -> None:
        """Agrega una tanda sin resetear: el scroll y la seleccion sobreviven."""
        if not tracks:
            return
        self._cover_icons.clear()
        start = len(self._tracks)
        self.beginInsertRows(QModelIndex(), start, start + len(tracks) - 1)
        self._tracks.extend(tracks)
        self.endInsertRows()

    def clear(self) -> None:
        self.set_tracks([])

    def track_at(self, row: int) -> Track | None:
        if 0 <= row < len(self._tracks):
            return self._tracks[row]
        return None

    def replace(self, row: int, track_item: Track) -> bool:
        """Reemplaza una pista en su lugar y avisa a la vista.

        Hace falta un metodo propio porque `tracks` devuelve una copia: asignar
        sobre ella no modifica el modelo.
        """
        if not 0 <= row < len(self._tracks):
            return False

        self._tracks[row] = track_item
        self._cover_icons.clear()
        self.dataChanged.emit(
            self.index(row, 0), self.index(row, max(0, self.columnCount() - 1))
        )
        return True

    def row_of(self, track: Track) -> int:
        return self.row_of_path(track.path)

    def row_of_path(self, path) -> int:
        """Fila de una pista por su ruta, que es lo unico que no cambia al releer."""
        for index, candidate in enumerate(self._tracks):
            if candidate.path == path:
                return index
        return -1

    @property
    def tracks(self) -> list[Track]:
        return list(self._tracks)

    def __len__(self) -> int:
        return len(self._tracks)

    # --- QAbstractTableModel -------------------------------------------------

    def rowCount(self, parent=QModelIndex()) -> int:  # noqa: B008
        return 0 if parent.isValid() else len(self._tracks)

    def columnCount(self, parent=QModelIndex()) -> int:  # noqa: B008
        return 0 if parent.isValid() else len(COLUMNS)

    def headerData(self, section, orientation, role=Qt.ItemDataRole.DisplayRole):
        if orientation != Qt.Orientation.Horizontal:
            return None
        if role != Qt.ItemDataRole.DisplayRole:
            return None
        if 0 <= section < len(COLUMNS):
            return COLUMNS[section][0]
        return None

    def data(self, index: QModelIndex, role=Qt.ItemDataRole.DisplayRole):
        if not index.isValid():
            return None

        track_item = self.track_at(index.row())
        if track_item is None:
            return None

        col_index = index.column()

        if role == Qt.ItemDataRole.DisplayRole:
            return self._display(track_item, col_index, index.row())

        if role == Qt.ItemDataRole.DecorationRole and col_index == 1:
            cover = (
                track_item.cover_path
                if track_item.cover_path and track_item.cover_path.is_file()
                else None
            )
            key_name = (str(cover) if cover else "", th.active().id)
            icono = self._cover_icons.get(key_name)
            if icono is None:
                icono = QIcon(render_cover(cover, 40))
                if len(self._cover_icons) >= 500:
                    self._cover_icons.clear()
                self._cover_icons[key_name] = icono
            return icono

        if role == Qt.ItemDataRole.TextAlignmentRole:
            return int(COLUMNS[col_index][2])

        if role == Qt.ItemDataRole.ForegroundRole:
            return th.active().text_dim if col_index in (4, 5, 6) else th.active().text

        if role == SORT_ROLE:
            return self._sort_key(track_item, col_index)

        if role == Qt.ItemDataRole.UserRole:
            return track_item

        return None

    def _display(self, track_item: Track, col_index: int, row_index: int) -> str:
        # La fila viene del indice: buscarla por ruta seria O(n) por celda.
        match col_index:
            case 0:
                return track_item.number_text or str(row_index + 1)
            case 1:
                return track_item.title
            case 2:
                return track_item.artist
            case 3:
                return track_item.album
            case 4:
                return track_item.year
            case 5:
                return track_item.duration_text
            case 6:
                return track_item.size_text
        return ""

    def _sort_key(self, track_item: Track, col_index: int) -> str:
        """Clave de orden de la columna. Siempre un string comparable."""
        match col_index:
            case 0:
                return _text_key(track_item.track_number, track_item.title)
            case 4:
                return _num_key(_as_number(track_item.year))
            case 5:
                return _num_key(track_item.duration)
            case 6:
                return _num_key(track_item.size)
            case 2:
                return _text_key(track_item.artist)
            case 3:
                return _text_key(track_item.album)
        return _text_key(track_item.title)

    # --- ordenamiento --------------------------------------------------------

    def sort(self, column: int, order=Qt.SortOrder.AscendingOrder) -> None:
        self.layoutAboutToBeChanged.emit()
        key_name = self._sort_key
        descendente = order == Qt.SortOrder.DescendingOrder
        self._tracks.sort(key=lambda t: key_name(t, column), reverse=descendente)
        self.layoutChanged.emit()


def _is_in(folder_path: Path, root: Path) -> bool:
    """Si `carpeta` es `raiz` o esta dentro de ella.

    El filtro de carpeta es recursivo a proposito: el contador de la lista de
    carpetas suma tambien las pistas de sus subcarpetas, asi que un filtro por
    carpeta exacta prometeria mas pistas de las que aparecen al abrirla.
    """
    try:
        folder_path.relative_to(root)
    except ValueError:
        return False
    return True


class TrackFilterProxy(QSortFilterProxyModel):
    """Filtra por texto sobre titulo, artista, album y genero."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self._query = ""
        self._review_filter = ""
        self._folder_filter: Path | None = None
        self._duplicate_paths: set[Path] = set()
        self.setSortRole(SORT_ROLE)

    def setSourceModel(self, source_model: QAbstractItemModel | None) -> None:
        super().setSourceModel(source_model)
        if source_model is not None:
            source_model.modelReset.connect(self._refresh_duplicate_paths)
            source_model.rowsInserted.connect(self._refresh_duplicate_paths)
            source_model.dataChanged.connect(self._refresh_duplicate_paths)
        self._refresh_duplicate_paths()

    def set_query(self, text: str) -> None:
        self._query = text.strip().lower()
        # `invalidateFilter()` esta deprecado en Qt 6.
        self.invalidateRowsFilter()

    def set_review_filter(self, review_filter: str) -> None:
        if review_filter not in ("", "untagged", "missing_cover", "duplicates"):
            raise ValueError(f"filtro de revisión desconocido: {review_filter!r}")
        self._review_filter = review_filter
        self.invalidateRowsFilter()

    def set_folder_filter(self, folder: Path | None) -> None:
        self._folder_filter = folder
        self.invalidateRowsFilter()

    def _refresh_duplicate_paths(self, *_args) -> None:
        modelo = self.sourceModel()
        if isinstance(modelo, TrackTableModel):
            self._duplicate_paths = duplicate_track_paths(modelo.tracks)
        else:
            self._duplicate_paths = set()
        self.invalidateRowsFilter()

    def filterAcceptsRow(self, source_row: int, source_parent) -> bool:
        modelo = self.sourceModel()
        if not isinstance(modelo, TrackTableModel):
            return True
        track_item = modelo.track_at(source_row)
        if track_item is None:
            return False

        if self._review_filter == "untagged" and not (
            not track_item.title.strip() or track_item.artist.strip() in ("", UNKNOWN)
        ):
            return False
        if (
            self._review_filter == "missing_cover"
            and track_item.cover_path
            and track_item.cover_path.is_file()
        ):
            return False
        if self._review_filter == "duplicates" and track_item.path not in self._duplicate_paths:
            return False

        if (
            self._folder_filter is not None
            and not self._query
            and not self._review_filter
            and not _is_in(track_item.folder, self._folder_filter)
        ):
            return False

        return not self._query or (
            self._query in track_item.title.lower()
            or self._query in track_item.artist.lower()
            or self._query in track_item.album.lower()
            or self._query in track_item.genre.lower()
        )

    @property
    def query(self) -> str:
        return self._query

    @property
    def review_filter(self) -> str:
        return self._review_filter

    def track_at(self, proxy_row: int) -> Track | None:
        modelo = self.sourceModel()
        if not isinstance(modelo, TrackTableModel) or proxy_row < 0:
            return None
        idx = self.mapToSource(self.index(proxy_row, 0))
        return modelo.track_at(idx.row())