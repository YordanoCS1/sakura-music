"""Panel de busqueda en el catalogo y filas de resultados.

Solo construye la interfaz: quien lo usa (el editor) conecta los botones y la
lista con su propia logica de busqueda.
"""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import (
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

ROW_HEIGHT = 72
THUMBNAIL_SIZE = 52


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
        overline = QLabel("03  /  CATÁLOGO")
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
        self.platform_box.addItem("Apple Music · iTunes", "itunes")
        self.platform_box.addItem("Deezer", "deezer")
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

        self.use_btn = TextButton("Usar datos seleccionados", "ghost", icon="check")
        self.use_btn.setEnabled(False)
        layout.addWidget(self.use_btn)

        return holder
