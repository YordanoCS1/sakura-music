"""Editor de metadatos: portada y tags de texto de una pista."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QBuffer, QIODevice, QSize, Qt
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import (
    QApplication,
    QComboBox,
    QDialog,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QListWidget,
    QListWidgetItem,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from ...core.library import Track
from ...core.metadata import (
    MetadataError,
    TrackTags,
    read_cover,
    read_cover_file,
    read_tags,
    remove_cover,
    write_cover,
    write_tags,
)
from ...core.metadata_sources import Candidate
from ..covers import render_cover
from ..services.metadata_search import MetadataSearch, apply_album
from ..services.thumbnails import ThumbnailLoader, cache_path
from ..widgets.buttons import TextButton
from .elided import ElidedLabel

# 190 px en vez de 220: con el panel deTags completo, 220 hacia que el campo
# 'Nº de pista' quedara fuera de la vista en pantallas de 800 de alto.
COVER_SIZE = 190
SOURCE_LABELS = {
    "itunes": "APPLE MUSIC · ITUNES",
    "deezer": "DEEZER",
}

IMAGE_FILTER = "Imágenes (*.jpg *.jpeg *.png *.webp *.bmp);;Todos (*)"


def _size_text(bytes_: int) -> str:
    if bytes_ < 1024:
        return f"{bytes_} B"
    if bytes_ < 1024 * 1024:
        return f"{bytes_ // 1024} KB"
    return f"{bytes_ / (1024 * 1024):.1f} MB"


class MetadataEditor(QDialog):
    """Formulario de edicion de una pista.

    Lee los tags al abrir y escribe recien al confirmar, asi que cancelar no
    toca el archivo. Ademas deja buscar el tema en un catalogo publico y llenar
    todo solo, o aplicar los tags a todo el album de la carpeta.
    """

    def __init__(self, path: Path, parent=None, album_tracks: list[Track] | None = None):
        super().__init__(parent)
        self.path = path
        self.album_tracks = album_tracks or []
        self._cover_bytes: bytes | None = None
        self._cover_removed = False
        self._mime = "image/jpeg"
        self._candidate: Candidate | None = None
        self._album_pending: list[Track] = []
        self._preview_cover_url = ""
        self._chosen_cover_url = ""
        self._cover_request_pending = False
        self._artwork_pixmaps: dict[str, QPixmap] = {}
        self._preview_artwork_bytes: bytes | None = None
        self._thumbnail_labels: dict[str, list[QLabel]] = {}

        self.setWindowTitle("Editar metadatos")
        self.setModal(True)
        # El alto nunca pasa de la pantalla: antes pedia 800 fijos y en un monitor
        # de 800 de alto el encabezado quedaba cortado arriba.
        pantalla = QApplication.primaryScreen()
        available = pantalla.availableGeometry().height() if pantalla else 900
        self.resize(820, max(560, min(720, available - 80)))
        self.setMinimumSize(680, 520)

        self._build()
        self._connect_search()
        self.thumbnails = ThumbnailLoader(self)
        self.thumbnails.loaded.connect(self._on_thumbnail_loaded)
        self.thumbnails.failed.connect(self._on_thumbnail_failed)
        self._show_view_current()
        self._load()
        self.search_box.setPlaceholderText(self.query_sugerida())

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(22, 18, 22, 18)
        root.setSpacing(12)

        root.addLayout(self._file_current())
        self.views = QStackedWidget()

        self.editar_view = QScrollArea()
        self.editar_view.setWidgetResizable(True)
        self.editar_view.setFrameShape(QScrollArea.Shape.NoFrame)
        self.editar_container = QWidget()
        self.editar_layout = QVBoxLayout(self.editar_container)
        self.editar_layout.setContentsMargins(0, 0, 0, 0)
        self.editar_layout.setSpacing(12)
        self.editar_layout.addWidget(self._block_cover())
        self.editar_layout.addWidget(self._block_tags(), 1)
        self.editar_view.setWidget(self.editar_container)
        self.views.addWidget(self.editar_view)

        self.catalog_view = QWidget()
        catalog_layout = QVBoxLayout(self.catalog_view)
        catalog_layout.setContentsMargins(0, 0, 0, 0)
        catalog_layout.setSpacing(14)
        catalog_layout.addWidget(self._bar_search())
        catalog_layout.addWidget(self._block_results(), 1)
        self.views.addWidget(self.catalog_view)
        root.addWidget(self.views, 1)
        root.addLayout(self._footer())

    def _file_current(self) -> QHBoxLayout:
        """Una sola linea: qué pista es y dónde está.

        Antes eran tres lineas de texto de marca ('SAKURA MUSIC / TRACK STUDIO',
        'Personaliza tu biblioteca', una bajada) mas la ruta. Compitian con el
        título real de la pista, que es lo único que importa al abrir el editor.
        """
        header = QHBoxLayout()
        header.setSpacing(12)

        texts = QVBoxLayout()
        texts.setSpacing(2)
        title = QLabel("Editar metadatos")
        title.setObjectName("MetadataPageTitle")
        texts.addWidget(title)

        self.path_label = ElidedLabel("")
        self.path_label.setObjectName("MetadataPath")
        self.path_label.setToolTip("La ruta del archivo en tu biblioteca")
        texts.addWidget(self.path_label)
        header.addLayout(texts, 1)
        return header

    def _block_cover(self) -> QWidget:
        """Portada, nombre de la pista y las acciones, en fila.

        El ancho lo fija la portada (fija) y no el texto de al lado: las
        etiquetas no(envuelven y no imponen minimo, asi que el panel se deja
        encoger y el formulario aprovecha el ancho sobrante.
        """
        holder = QFrame()
        holder.setObjectName("MetadataArtworkPanel")

        layout = QHBoxLayout(holder)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(18)

        self.cover = QLabel()
        self.cover.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.cover.setObjectName("MetadataCover")
        layout.addWidget(self.cover, 0, Qt.AlignmentFlag.AlignVCenter)

        identity = QVBoxLayout()
        identity.setSpacing(5)
        # La portada fija marca la altura del panel (220 px). Centro el bloque de
        # texto con stretch arriba y abajo para que no quede pegado al techo ni
        # un hueco muerto al pie; antes solo empujaba hacia abajo.
        identity.addStretch(1)
        self.track_title = ElidedLabel("Editando tu música")
        self.track_title.setObjectName("MetadataTrackTitle")
        identity.addWidget(self.track_title)

        self.track_artist = ElidedLabel("Ajusta la portada y los detalles")
        self.track_artist.setObjectName("MetadataTrackArtist")
        identity.addWidget(self.track_artist)

        self.cover_status = QLabel("La portada se guardará junto con los metadatos.")
        self.cover_status.setObjectName("MetadataHint")
        self.cover_status.setWordWrap(True)
        identity.addWidget(self.cover_status)
        identity.addStretch(1)
        layout.addLayout(identity, 1)

        # Acciones en columna pero sin estirar: antes tenian un `addStretch` que
        # empujaba los botones hacia arriba y dejaba un hueco debajo.
        actions_panel = QWidget()
        actions = QVBoxLayout(actions_panel)
        actions.setContentsMargins(0, 0, 0, 0)
        actions.setSpacing(7)
        self.catalog_btn = TextButton("Buscar en catálogo", "accent")
        self.catalog_btn.clicked.connect(self._open_catalog)
        actions.addWidget(self.catalog_btn)

        self.change_cover = TextButton("Elegir imagen", "ghost")
        self.change_cover.clicked.connect(self._choose_image)
        actions.addWidget(self.change_cover)

        self.clear_cover = TextButton("Quitar portada", "ghost")
        self.clear_cover.clicked.connect(self._remove_cover)
        actions.addWidget(self.clear_cover)
        # Sin stretch interno: la columna se centra contra la portada para no
        # dejar espacio sobrante arriba ni abajo.
        layout.addWidget(actions_panel, 0, Qt.AlignmentFlag.AlignVCenter)
        return holder

    def _block_tags(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("MetadataFormPanel")
        form = QVBoxLayout(panel)
        form.setContentsMargins(18, 14, 18, 14)
        form.setSpacing(10)

        # Encabezado de seccion: dos lineas de texto y un separador. Antes eran
        # tres bloques (overline, titulo, bajada) y el divisor, que empujaban los
        # campos para abajo sin decir nada util.
        heading = QLabel("Información de la pista")
        heading.setObjectName("MetadataSectionTitle")
        form.addWidget(heading)

        divider = QFrame()
        divider.setObjectName("MetadataDivider")
        divider.setFixedHeight(1)
        form.addWidget(divider)

        fields = QGridLayout()
        fields.setHorizontalSpacing(14)
        fields.setVerticalSpacing(8)
        self.field_map: dict[str, QLineEdit] = {}
        field_specs = (
            ("title", "Título", 0, 0, 1),
            ("artist", "Artista", 0, 1, 1),
            ("album", "Álbum", 1, 0, 1),
            ("albumartist", "Artista del álbum", 1, 1, 1),
            ("year", "Año", 2, 0, 1),
            ("genre", "Género", 2, 1, 1),
            ("track_number", "Nº de pista", 3, 0, 2),
        )
        for field_name, tag, row_index, col_index, width in field_specs:
            field = QWidget()
            field_layout = QVBoxLayout(field)
            field_layout.setContentsMargins(0, 0, 0, 0)
            field_layout.setSpacing(5)

            label_widget = QLabel(tag)
            label_widget.setObjectName("FieldLabel")

            editor = QLineEdit()
            editor.setObjectName("MetadataField")
            editor.setMinimumHeight(38)
            self.field_map[field_name] = editor

            field_layout.addWidget(label_widget)
            field_layout.addWidget(editor)
            fields.addWidget(field, row_index, col_index, 1, width)

        fields.setColumnStretch(0, 1)
        fields.setColumnStretch(1, 1)
        form.addLayout(fields)
        form.addStretch(1)
        return panel

    def _bar_search(self) -> QWidget:
        """Panel de búsqueda con proveedor visible antes y durante la consulta."""
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
        self.search_box.returnPressed.connect(self._search)
        self.search_box.setMinimumHeight(42)
        row.addWidget(self.search_box, 2)

        self.artist_search_box = QLineEdit()
        self.artist_search_box.setObjectName("SearchInput")
        self.artist_search_box.setPlaceholderText("Artista (opcional)")
        self.artist_search_box.setMinimumHeight(42)
        row.addWidget(self.artist_search_box, 1)

        self.search_btn = TextButton("Buscar catálogo", "accent")
        self.search_btn.clicked.connect(self._search)
        self.search_btn.setMinimumWidth(148)
        row.addWidget(self.search_btn)
        layout.addLayout(row)
        return panel

    def _block_results(self) -> QWidget:
        """Lista de candidatos encontrados."""
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
        self.list.itemDoubleClicked.connect(self._use_candidate)
        self.list.itemSelectionChanged.connect(self._selection_candidate)
        layout.addWidget(self.list, 1)

        self.use_btn = TextButton("Usar datos seleccionados", "ghost")
        self.use_btn.clicked.connect(lambda: self._use_candidate())
        self.use_btn.setEnabled(False)
        layout.addWidget(self.use_btn)

        return holder

    def _footer(self) -> QHBoxLayout:
        footer = QHBoxLayout()
        footer.setSpacing(10)

        self.state = QLabel("")
        self.state.setObjectName("EmptyState")
        footer.addWidget(self.state, 1)

        self.album_btn = QPushButton("Aplicar a todo el álbum")
        self.album_btn.setObjectName("GhostButton")
        self.album_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.album_btn.clicked.connect(self._apply_album)
        self.album_btn.setVisible(False)
        footer.addWidget(self.album_btn)

        self.back_btn = TextButton("Volver a metadatos", "ghost")
        self.back_btn.clicked.connect(self._back_editor)
        self.back_btn.setVisible(False)
        footer.addWidget(self.back_btn)

        self.cancel_btn = TextButton("Cancelar", "ghost")
        self.cancel_btn.clicked.connect(self.reject)
        footer.addWidget(self.cancel_btn)

        self.save = TextButton("Guardar cambios", "accent")
        self.save_btn = self.save
        self.save.clicked.connect(self._save)
        footer.addWidget(self.save)
        return footer

    def _show_view_current(self) -> None:
        in_editor = self.views.currentWidget() == self.editar_view
        self.back_btn.setVisible(not in_editor)
        self.cancel_btn.setVisible(in_editor)
        self.save_btn.setVisible(in_editor)
        self.album_btn.setVisible(
            in_editor
            and bool(self._candidate and self._candidate.album_id and self.album_tracks)
        )

    def _open_catalog(self) -> None:
        self.search_box.setText(self.query_sugerida())
        artist_name = self.field_map["artist"].text().strip()
        self.artist_search_box.setText(
            "" if artist_name.lower() == "desconocido" else artist_name
        )
        self.views.setCurrentWidget(self.catalog_view)
        self._show_view_current()
        self.search_box.setFocus()

    def _back_editor(self) -> None:
        self.views.setCurrentWidget(self.editar_view)
        self._show_view_current()
        self._preview_cover_url = ""
        self._preview_artwork_bytes = None
        self._paint_cover()

    # --- carga --------------------------------------------------------------

    def _load(self) -> None:
        self.path_label.setText(str(self.path))

        try:
            tags = read_tags(self.path)
        except MetadataError:
            tags = TrackTags()

        for field_name, editor in self.field_map.items():
            editor.setText(getattr(tags, field_name, "") or "")
            editor.setPlaceholderText(self.path.stem if field_name == "title" else "")
            if field_name in {"title", "artist"}:
                editor.textChanged.connect(self._update_identidad)

        self._update_identidad()
        self._cover_bytes = read_cover(self.path)
        self._paint_cover()

    def _update_identidad(self, *_args) -> None:
        title_text = self.field_map["title"].text().strip() or self.path.stem
        artist_name = self.field_map["artist"].text().strip()
        self.track_title.setText(title_text)
        self.track_artist.setText(artist_name or "Edita la portada y los detalles de esta pista")

    def tags_current(self) -> TrackTags:
        return TrackTags(
            **{
                field_name: editor.text().strip()
                for field_name, editor in self.field_map.items()
            }
        )

    # --- portada ------------------------------------------------------------

    def _paint_cover(self) -> None:
        ratio = self.cover.devicePixelRatioF()
        lado_pixeles = round(COVER_SIZE * ratio)
        if self._cover_removed or not self._cover_bytes:
            cover = render_cover(None, lado_pixeles)
            cover.setDevicePixelRatio(ratio)
            self.cover.setPixmap(cover)
            self.cover_status.setText(
                "Portada quitada" if self._cover_removed else "Sin portada incrustada"
            )
            self._state("Sin portada" if self._cover_removed else "")
            return

        pixmap = render_cover(self._cover_bytes, lado_pixeles)
        if not pixmap.isNull():
            pixmap.setDevicePixelRatio(ratio)
            self.cover.setPixmap(pixmap)
            self.cover_status.setText(f"Portada lista · {_size_text(len(self._cover_bytes))}")
            self._state(f"Portada · {_size_text(len(self._cover_bytes))}")
        else:
            self._cover_bytes = None
            self._paint_cover()

    def _choose_image(self) -> None:
        chosen = QFileDialog.getOpenFileName(
            self, "Elegir portada", str(self.path.parent), IMAGE_FILTER
        )[0]
        if not chosen:
            return

        try:
            data, mime = read_cover_file(Path(chosen))
        except MetadataError as exc:
            self._error(str(exc))
            return

        self._cover_bytes = data
        self._cover_removed = False
        self._chosen_cover_url = ""
        self._cover_request_pending = False
        self.save.setEnabled(True)
        self._mime = mime
        self._paint_cover()

    def _remove_cover(self) -> None:
        self._cover_bytes = None
        self._cover_removed = True
        self._chosen_cover_url = ""
        self._cover_request_pending = False
        self.save.setEnabled(True)
        self._paint_cover()

    # --- guardar ------------------------------------------------------------

    def done(self, result: int) -> None:
        """Suelta la busqueda en curso antes de cerrar.

        El editor se puede cerrar con un `MetadataSearch` a medio camino (una
        peticion a iTunes o un "Aplicar a todo el album"): si el hilo sobrevive
        al dialogo, escribe tags y baja portadas sobre widgets ya destruidos.
        """
        self.searcher.shutdown()
        self.thumbnails.shutdown()
        super().done(result)

    def _save(self) -> None:
        if self._cover_request_pending:
            self._state("Esperá a que termine la descarga de la portada antes de guardar.")
            return
        tags = self.tags_current()

        try:
            write_tags(self.path, tags)

            if self._cover_removed:
                remove_cover(self.path)
            elif self._cover_bytes:
                write_cover(self.path, self._cover_bytes, getattr(self, "_mime", "image/jpeg"))
        except MetadataError as exc:
            self._error(str(exc))
            return

        self.accept()

    # --- catalogo ------------------------------------------------------------

    def _connect_search(self) -> None:
        self.searcher = MetadataSearch(self)
        self.searcher.results_found.connect(self._on_results)
        self.searcher.failed.connect(self._search_failed)
        self.searcher.album_found.connect(self._album_applied)
        self.searcher.source_changed.connect(self._on_source_changed)
        self.searcher.warning.connect(self._on_search_warning)

    def query_sugerida(self) -> str:
        """Título sugerido para buscar en los catálogos."""
        tags = self.field_map
        title_text = tags["title"].text().strip()
        return title_text or self.path.stem

    def _search(self) -> None:
        if self.searcher.is_running:
            return
        query = self.search_box.text().strip() or self.query_sugerida()
        if not query:
            return
        artist_name = self.artist_search_box.text().strip()
        if not artist_name:
            artist_name = self.field_map["artist"].text().strip()
        if artist_name.lower() == "desconocido":
            artist_name = ""

        self.search_box.setText(query)
        self.search_btn.setEnabled(False)
        self.search_box.setEnabled(False)
        self.artist_search_box.setEnabled(False)
        self.platform_box.setEnabled(False)
        self._thumbnail_labels.clear()
        self._preview_cover_url = ""
        self._chosen_cover_url = ""
        self._cover_request_pending = False
        self.save.setEnabled(True)
        self.list.clear()
        self._candidate = None
        self.use_btn.setEnabled(False)
        self.results_title.setText("Buscando…")
        self.search_status.setText("Conectando con el catálogo seleccionado…")
        source = str(self.platform_box.currentData())
        self.searcher.search(query, source=source, artist_query=artist_name)

    def _on_source_changed(self, source: str) -> None:
        label = SOURCE_LABELS.get(source, source.upper())
        self.source_badge.setText(label)
        self.search_status.setText(f"Buscando en {label.title()}…")

    def _on_search_warning(self, message_text: str) -> None:
        self.search_status.setText(message_text)
        self._state(message_text)

    def _on_results(self, candidates: list[Candidate]) -> None:
        self.search_btn.setEnabled(True)
        self.search_box.setEnabled(True)
        self.artist_search_box.setEnabled(True)
        self.platform_box.setEnabled(True)
        self._thumbnail_labels.clear()
        self.list.clear()
        self._candidate = None
        self.use_btn.setEnabled(False)

        for candidate in candidates:
            source_name = SOURCE_LABELS.get(candidate.source, candidate.source.upper())
            album = candidate.album or "Álbum desconocido"
            year_track = []
            if candidate.year:
                year_track.append(candidate.year)
            if candidate.track_number:
                track = f"Pista {candidate.track_number}"
                if candidate.track_total:
                    track += f"/{candidate.track_total}"
                year_track.append(track)
            details = " · ".join(
                part for part in (candidate.artist, album, " / ".join(year_track)) if part
            )
            item = QListWidgetItem("")
            item.setData(Qt.ItemDataRole.UserRole, candidate)
            item.setToolTip(f"{candidate.title}\n{candidate.subtitle}\nOrigen: {source_name}")
            item.setSizeHint(QSize(0, 72))
            self.list.addItem(item)
            row = QWidget(self.list)
            row_layout = QHBoxLayout(row)
            row_layout.setContentsMargins(5, 3, 5, 3)
            row_layout.setSpacing(10)
            artwork = QLabel()
            artwork.setFixedSize(52, 52)
            artwork.setAlignment(Qt.AlignmentFlag.AlignCenter)
            artwork.setObjectName("Card")
            row_layout.addWidget(artwork)
            labels = QVBoxLayout()
            labels.setSpacing(3)
            source_label = QLabel(source_name)
            source_label.setObjectName("FieldLabel")
            source_label.setProperty("metadataResultRole", "source")
            title_label = QLabel(candidate.title)
            title_label.setObjectName("CardTitle")
            title_label.setProperty("metadataResultRole", "title")
            title_label.setWordWrap(False)
            details_label = QLabel(details or candidate.subtitle)
            details_label.setObjectName("PageSubtitle")
            details_label.setProperty("metadataResultRole", "details")
            details_label.setWordWrap(False)
            labels.addWidget(source_label)
            labels.addWidget(title_label)
            labels.addWidget(details_label)
            row_layout.addLayout(labels, 1)
            self.list.setItemWidget(item, row)
            self._set_result_thumbnail(candidate.cover_url, artwork)

        self.results_title.setText(f"{len(candidates)} resultados")
        sources = {candidate.source for candidate in candidates}
        if len(sources) == 1:
            source = next(iter(sources))
            self.source_badge.setText(SOURCE_LABELS.get(source, source.upper()))
            self.search_status.setText(
                "Selecciona una coincidencia para revisar sus datos antes de aplicarlos."
            )
        else:
            self.source_badge.setText("VARIOS CATÁLOGOS")
            self.search_status.setText("Los resultados muestran su origen en cada fila.")
        if self.list.count():
            self.list.setCurrentRow(0)
        else:
            self.search_status.setText("No hay coincidencias. Prueba con otro nombre.")
        self._state("Selecciona un resultado para previsualizarlo.")

    def _search_failed(self, message_text: str) -> None:
        self.search_btn.setEnabled(True)
        self.search_box.setEnabled(True)
        self.artist_search_box.setEnabled(True)
        self.platform_box.setEnabled(True)
        self.list.clear()
        self.results_title.setText("Sin resultados")
        self.source_badge.setText("SIN COINCIDENCIAS")
        self.search_status.setText(message_text)
        self._state(message_text)

    def _selection_candidate(self) -> None:
        candidate = self._candidate_selected()
        self.use_btn.setEnabled(candidate is not None)
        if candidate is not None:
            self._previsualizar(candidate)

    def _candidate_selected(self) -> Candidate | None:
        row = self.list.currentRow()
        if row < 0:
            return None
        item = self.list.item(row)
        return item.data(Qt.ItemDataRole.UserRole) if item else None

    def _previsualizar(self, candidate: Candidate) -> None:
        """Muestra los datos del candidato sin tocar los campos."""
        detail = f"{candidate.title} · {candidate.artist}"
        if candidate.album:
            detail += f" · {candidate.album}"
        if candidate.year:
            detail += f" ({candidate.year})"
        if candidate.track_number:
            total = f"/{candidate.track_total}" if candidate.track_total else ""
            detail += f" · pista {candidate.track_number}{total}"
        self._preview_cover_url = candidate.cover_url
        self._preview_artwork_bytes = None
        path_cover = cache_path(candidate.cover_url) if candidate.cover_url else None
        pixmap = QPixmap(str(path_cover)) if path_cover and path_cover.is_file() else None
        if candidate.cover_url and pixmap is not None and not pixmap.isNull():
            self._preview_artwork_bytes = self._pixmap_bytes(pixmap)
            self._show_image_candidate(pixmap)
            self.cover_status.setText("Vista previa de portada del catálogo")
        elif candidate.cover_url and candidate.cover_url in self._artwork_pixmaps:
            pixmap = self._artwork_pixmaps[candidate.cover_url]
            self._preview_artwork_bytes = self._pixmap_bytes(pixmap)
            self._show_image_candidate(pixmap)
            self.cover_status.setText("Vista previa de portada del catálogo")
        elif candidate.cover_url:
            self.cover.setPixmap(render_cover(None, COVER_SIZE))
            self.cover_status.setText("Cargando portada del catálogo…")
            detail += " · cargando portada…"
        else:
            self.cover.setPixmap(render_cover(None, COVER_SIZE))
            self.cover_status.setText("El catálogo no ofrece portada para esta pista")
            detail += " · sin portada en el catálogo"
        self._state(detail)

    def _use_candidate(self) -> None:
        """Llena el formulario con el candidato elegido."""
        candidate = self._candidate_selected()
        if candidate is None:
            return

        self._candidate = candidate
        for field_name, value in candidate.to_tags().items():
            editor = self.field_map.get(field_name)
            if editor is not None:
                editor.setText(value)

        self.views.setCurrentWidget(self.editar_view)
        self._show_view_current()
        self._chosen_cover_url = candidate.cover_url
        if candidate.cover_url:
            data = (
                self._preview_artwork_bytes
                if self._preview_cover_url == candidate.cover_url
                else None
            )
            if data is None:
                pixmap = QPixmap(str(cache_path(candidate.cover_url)))
                if pixmap.isNull():
                    pixmap = self._artwork_pixmaps.get(candidate.cover_url, QPixmap())
                if not pixmap.isNull():
                    data = self._pixmap_bytes(pixmap)
            if data is not None:
                self._use_cover_candidate(candidate.cover_url, data)
            else:
                self._cover_request_pending = True
                self.save.setEnabled(False)
                self.cover_status.setText("Preparando portada para guardar…")
                self._state("Datos cargados; esperando la portada antes de guardar…")
                self._request_thumbnail(candidate.cover_url)
        else:
            self._cover_request_pending = False
            self.save.setEnabled(True)
            self.cover_status.setText("Se conservará la portada actual")
            self._state(f"{candidate.source}: datos cargados; el catálogo no tiene portada.")

    def _set_result_thumbnail(self, url: str, label: QLabel) -> None:
        if not url:
            label.setPixmap(render_cover(None, 48))
            return
        self._thumbnail_labels.setdefault(url, []).append(label)
        pixmap = self._artwork_pixmaps.get(url)
        if pixmap is not None:
            self._paint_miniatura(label, pixmap)
        else:
            self._request_thumbnail(url)

    def _request_thumbnail(self, url: str) -> None:
        file_path = cache_path(url)
        if file_path.is_file():
            pixmap = QPixmap(str(file_path))
            if not pixmap.isNull():
                self._on_thumbnail_loaded(url, pixmap)
                return
        self.thumbnails.request(url, file_path)

    def _on_thumbnail_loaded(self, url: str, pixmap: QPixmap) -> None:
        miniatura = pixmap.scaled(
            QSize(52, 52),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        self._artwork_pixmaps[url] = QPixmap(pixmap)
        for label in self._thumbnail_labels.pop(url, []):
            self._paint_miniatura(label, miniatura)
        data = self._pixmap_bytes(pixmap) if url in (
            self._preview_cover_url,
            self._chosen_cover_url,
        ) else None
        if url == self._preview_cover_url:
            self._preview_artwork_bytes = data
            self._show_image_candidate(pixmap)
            self.cover_status.setText("Vista previa de portada del catálogo")
        if url == self._chosen_cover_url and data:
            self._use_cover_candidate(url, data)
        elif url == self._chosen_cover_url:
            self._on_thumbnail_failed(url, "No se pudo preparar la portada para guardar")

    def _on_thumbnail_failed(self, url: str, razon: str) -> None:
        self._thumbnail_labels.pop(url, None)
        if url != self._chosen_cover_url:
            return
        self._cover_request_pending = False
        self.save.setEnabled(True)
        self._paint_cover()
        self._state(f"No se pudo cargar la portada ({razon}); se conservará la portada actual.")

    @staticmethod
    def _pixmap_bytes(pixmap: QPixmap) -> bytes:
        buffer = QBuffer()
        if not buffer.open(QIODevice.OpenModeFlag.WriteOnly):
            return b""
        if not pixmap.save(buffer, "PNG"):
            return b""
        return bytes(buffer.data())

    @staticmethod
    def _paint_miniatura(label: QLabel, pixmap: QPixmap) -> None:
        label.setPixmap(
            pixmap.scaled(
                label.size(),
                Qt.AspectRatioMode.KeepAspectRatio,
                Qt.TransformationMode.SmoothTransformation,
            )
        )

    def _show_image_candidate(self, pixmap: QPixmap) -> None:
        ratio = self.cover.devicePixelRatioF()
        size = QSize(round(self.cover.width() * ratio), round(self.cover.height() * ratio))
        display_pixmap = pixmap.scaled(
            size,
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation,
        )
        display_pixmap.setDevicePixelRatio(ratio)
        self.cover.setPixmap(display_pixmap)

    def _use_cover_candidate(self, url: str, data: bytes) -> None:
        if url != self._chosen_cover_url:
            return
        self._cover_bytes = data
        self._cover_removed = False
        self._mime = "image/png"
        self._cover_request_pending = False
        self.save.setEnabled(True)
        pixmap = QPixmap()
        if pixmap.loadFromData(data):
            self._show_image_candidate(pixmap)
        self.cover_status.setText("Portada del catálogo lista para guardar")
        origin = self._candidate.source if self._candidate else "Catálogo"
        self._state(f"{origin}: portada lista para guardar.")

    def _apply_album(self) -> None:
        """Escribe los tags de todo el álbum de la carpeta, no solo esta pista."""
        candidate = self._candidate
        if candidate is None or not candidate.album_id:
            return

        track_items = [t for t in self.album_tracks if t.path != self.path]
        if not track_items:
            self._state("No hay otras pistas en el álbum")
            return

        confirmacion = QMessageBox.question(
            self,
            "Aplicar a todo el álbum",
            f"Se van a escribir los tags de {len(track_items) + 1} pistas de "
            f"“{candidate.album}”.\n\n¿Continuar?",
        )
        if confirmacion != QMessageBox.StandardButton.Yes:
            return

        self.album_btn.setEnabled(False)
        self._state("Buscando el álbum en el catálogo...")
        self.searcher.load_album(candidate.album_id)
        self._album_pending = track_items

    def _album_applied(self, tracks_album: list[Candidate]) -> None:
        pending = self._album_pending
        if not pending:
            self.album_btn.setEnabled(True)
            return

        # `aplicar_album` empareja por titulo normalizado, asi que los archivos
        # con numero de pista o sufijos ("01 - One More Time.mp3") funcionan.
        paths = [t.path for t in pending] + [self.path]
        applied, errors = apply_album(paths, tracks_album)
        self._album_pending = []

        self.album_btn.setEnabled(True)
        if not applied:
            self._state("Ninguna pista del álbum coincidió con los archivos")
        elif errors:
            self._state(f"{applied} aplicadas, {len(errors)} con problemas: {errors[0]}")
        else:
            self._state(f"{applied} pistas etiquetadas de “{tracks_album[0].album}”")

    # --- utilidades ---------------------------------------------------------

    def _state(self, text_value: str) -> None:
        self.state.setText(text_value)

    def _error(self, message_text: str) -> None:
        self._state("")
        QMessageBox.critical(self, "No se pudo guardar", message_text)


def open_editor(
    path: Path, parent=None, album_tracks: list[Track] | None = None
) -> TrackTags | None:
    """Abre el editor. Devuelve los tags si se confirmó, None si se canceló."""
    dialog = MetadataEditor(path, parent, album_tracks)
    if dialog.exec() != QDialog.DialogCode.Accepted:
        return None
    return dialog.tags_current()