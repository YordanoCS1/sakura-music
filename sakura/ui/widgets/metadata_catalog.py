"""Panel de busqueda en el catalogo y filas de resultados.

Solo construye la interfaz: quien lo usa (el editor) conecta los botones y la
lista con su propia logica de busqueda.
"""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFrame,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ...core.metadata_sources import Candidate
from ..widgets.buttons import TextButton
from .elided import ElidedLabel

ROW_HEIGHT = 72
THUMBNAIL_SIZE = 52

# Campos que la comparacion deja elegir, en el orden en que se muestran.
COMPARE_FIELDS = (
    "title",
    "artist",
    "album",
    "albumartist",
    "year",
    "genre",
    "track_number",
)

FIELD_LABELS = {
    "title": "Título",
    "artist": "Artista",
    "album": "Álbum",
    "albumartist": "Artista del álbum",
    "year": "Año",
    "genre": "Género",
    "track_number": "Pista",
}


class CandidateRow(QWidget):
    """Fila de un resultado: miniatura, origen, título y detalles."""

    def __init__(self, candidate: Candidate, source_label: str, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(5, 3, 5, 3)
        layout.setSpacing(10)

        self.artwork = QLabel()
        self.artwork.setFixedSize(THUMBNAIL_SIZE, THUMBNAIL_SIZE)
        self.artwork.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.artwork.setObjectName("Card")
        layout.addWidget(self.artwork)

        labels = QVBoxLayout()
        labels.setSpacing(3)
        source = QLabel(source_label)
        source.setObjectName("FieldLabel")
        source.setProperty("metadataResultRole", "source")
        title = QLabel(candidate.title)
        title.setObjectName("CardTitle")
        title.setProperty("metadataResultRole", "title")
        title.setWordWrap(False)
        details = QLabel(self._details(candidate) or candidate.subtitle)
        details.setObjectName("PageSubtitle")
        details.setProperty("metadataResultRole", "details")
        details.setWordWrap(False)
        labels.addWidget(source)
        labels.addWidget(title)
        labels.addWidget(details)
        layout.addLayout(labels, 1)

    @staticmethod
    def _details(candidate: Candidate) -> str:
        album = candidate.album or "Álbum desconocido"
        extras: list[str] = []
        if candidate.year:
            extras.append(candidate.year)
        if candidate.track_number:
            track = f"Pista {candidate.track_number}"
            if candidate.track_total:
                track += f"/{candidate.track_total}"
            extras.append(track)
        return " · ".join(
            part for part in (candidate.artist, album, " / ".join(extras)) if part
        )


def make_result_item(candidate: Candidate, source_label: str) -> QListWidgetItem:
    """El item de lista (con su fila) listo para meter en el `QListWidget`."""
    item = QListWidgetItem("")
    item.setData(Qt.ItemDataRole.UserRole, candidate)
    item.setToolTip(f"{candidate.title}\n{candidate.subtitle}\nOrigen: {source_label}")
    item.setSizeHint(QSize(0, ROW_HEIGHT))
    return item


class CandidateCompare(QFrame):
    """Compara un candidato con los tags actuales y deja elegir qué aplicar.

    Cada campo del resultado se muestra junto al valor que ya tiene el archivo,
    con una casilla. Solo lo marcado se escribe: asi una fuente con el año pero
    sin portada no pisa lo que sí trae bien otra.
    """

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("MetadataComparePanel")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._candidate: Candidate | None = None
        self._boxes: dict[str, QCheckBox] = {}
        self._values: dict[str, str] = {}

        layout = QVBoxLayout(self)
        layout.setContentsMargins(14, 12, 14, 12)
        layout.setSpacing(8)

        title = QLabel("Comparar antes de aplicar")
        title.setObjectName("MetadataSectionTitle")
        hint = QLabel(
            "Marca qué campos del resultado reemplazan a los que ya tiene el archivo."
        )
        hint.setObjectName("MetadataHint")
        hint.setWordWrap(True)
        layout.addWidget(title)
        layout.addWidget(hint)

        self._rows = QVBoxLayout()
        self._rows.setContentsMargins(0, 4, 0, 0)
        self._rows.setSpacing(6)
        layout.addLayout(self._rows)
        self.setVisible(False)

    def has_candidate(self) -> bool:
        return self._candidate is not None

    def candidate(self) -> Candidate | None:
        return self._candidate

    def clear(self) -> None:
        self._candidate = None
        self._boxes.clear()
        self._values.clear()
        while self._rows.count():
            item = self._rows.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()
        self.setVisible(False)

    def show_candidate(self, candidate: Candidate, current: dict[str, str]) -> None:
        self.clear()
        self._candidate = candidate
        tags = candidate.to_tags()

        header = QHBoxLayout()
        header.setContentsMargins(30, 0, 0, 0)
        header.setSpacing(10)
        col_new = QLabel("Del catálogo")
        col_new.setObjectName("MetadataCompareHeader")
        col_old = QLabel("En el archivo")
        col_old.setObjectName("MetadataCompareHeader")
        header.addWidget(col_new, 1)
        header.addWidget(col_old, 1)
        header_holder = QWidget()
        header_holder.setLayout(header)
        self._rows.addWidget(header_holder)

        for field in COMPARE_FIELDS:
            new_value = tags.get(field, "")
            old_value = current.get(field, "")
            self._rows.addWidget(self._row(field, new_value, old_value))
        self.setVisible(True)

    def _row(self, field: str, new_value: str, old_value: str) -> QWidget:
        row = QWidget()
        layout = QHBoxLayout(row)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        box = QCheckBox()
        box.setChecked(bool(new_value) and new_value != old_value)
        box.setFixedWidth(20)
        layout.addWidget(box)
        self._boxes[field] = box
        self._values[field] = new_value

        label = QLabel(FIELD_LABELS.get(field, field))
        label.setObjectName("MetadataCompareField")
        label.setFixedWidth(110)
        layout.addWidget(label)

        new_label = ElidedLabel(new_value or "—")
        new_label.setObjectName("MetadataCompareNew")
        layout.addWidget(new_label, 1)

        old_label = ElidedLabel(f"antes: {old_value}" if old_value else "antes: —")
        old_label.setObjectName("MetadataCompareOld")
        layout.addWidget(old_label, 1)
        return row

    def selected_fields(self) -> dict[str, str]:
        """Los campos marcados, con el valor que trae el catálogo."""
        return {
            field: self._values[field]
            for field, box in self._boxes.items()
            if box.isChecked() and self._values[field]
        }


class CatalogPanel(QWidget):
    """Busqueda y lista de resultados dentro del editor de metadatos."""

    def __init__(self, parent=None):
        super().__init__(parent)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(14)
        layout.addWidget(self._build_search_bar())
        layout.addWidget(self._build_results(), 1)

    def _build_search_bar(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("MetadataSearchPanel")
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(10)

        header = QHBoxLayout()
        header.setSpacing(8)
        heading = QVBoxLayout()
        heading.setSpacing(3)
        overline = QLabel("CATÁLOGO")
        overline.setObjectName("MetadataEyebrow")
        title = QLabel("Encuentra la versión correcta")
        title.setObjectName("MetadataSectionTitle")
        heading.addWidget(overline)
        heading.addWidget(title)
        header.addLayout(heading)
        header.addStretch(1)

        platform_label = QLabel("Catálogo")
        platform_label.setObjectName("FieldLabel")
        header.addWidget(platform_label)
        self.platform_box = QComboBox()
        self.platform_box.addItem("Automático · iTunes y Deezer", "auto")
        self.platform_box.addItem(
            "Comparar todos · iTunes + Deezer + MusicBrainz", "all"
        )
        self.platform_box.addItem("Apple Music · iTunes", "itunes")
        self.platform_box.addItem("Deezer", "deezer")
        self.platform_box.addItem("MusicBrainz", "musicbrainz")
        self.platform_box.setMinimumWidth(230)
        self.platform_box.setMinimumHeight(38)
        header.addWidget(self.platform_box)
        layout.addLayout(header)

        row = QHBoxLayout()
        row.setSpacing(10)
        self.search_box = QLineEdit()
        self.search_box.setObjectName("SearchInput")
        self.search_box.setPlaceholderText("Título de la canción")
        self.search_box.setMinimumHeight(42)
        row.addWidget(self.search_box, 2)

        self.artist_search_box = QLineEdit()
        self.artist_search_box.setObjectName("SearchInput")
        self.artist_search_box.setPlaceholderText("Artista (opcional)")
        self.artist_search_box.setMinimumHeight(42)
        row.addWidget(self.artist_search_box, 1)

        self.search_btn = TextButton("Buscar catálogo", "accent", icon="search")
        self.search_btn.setMinimumWidth(148)
        row.addWidget(self.search_btn)
        layout.addLayout(row)
        return panel

    def _build_results(self) -> QWidget:
        holder = QFrame()
        holder.setObjectName("MetadataResultsPanel")

        layout = QVBoxLayout(holder)
        layout.setContentsMargins(14, 14, 14, 14)
        layout.setSpacing(8)

        header = QHBoxLayout()
        heading = QVBoxLayout()
        heading.setSpacing(2)
        title = QLabel("Resultados")
        title.setObjectName("MetadataSectionTitle")
        self.results_title = QLabel("Elige un catálogo y busca una canción")
        self.results_title.setObjectName("PageSubtitle")
        heading.addWidget(title)
        heading.addWidget(self.results_title)
        header.addLayout(heading, 1)

        self.source_badge = QLabel("SIN BÚSQUEDA")
        self.source_badge.setObjectName("MetadataSourceBadge")
        self.source_badge.setAlignment(Qt.AlignmentFlag.AlignCenter)
        header.addWidget(self.source_badge, 0, Qt.AlignmentFlag.AlignRight)
        layout.addLayout(header)

        self.search_status = QLabel(
            "La búsqueda automática combina ambos catálogos y muestra la portada de cada resultado."
        )
        self.search_status.setObjectName("MetadataHint")
        self.search_status.setWordWrap(True)
        layout.addWidget(self.search_status)

        self.list = QListWidget()
        self.list.setObjectName("MetadataResultsList")
        self.list.setSpacing(3)
        self.list.setVerticalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOn)
        self.list.setUniformItemSizes(True)
        layout.addWidget(self.list, 1)

        self.compare = CandidateCompare()
        layout.addWidget(self.compare)

        self.use_btn = TextButton("Usar datos seleccionados", "ghost", icon="check")
        self.use_btn.setEnabled(False)
        layout.addWidget(self.use_btn)

        return holder
