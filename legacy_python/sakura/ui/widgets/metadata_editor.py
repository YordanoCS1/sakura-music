"""Editor de metadatos: portada y tags de texto de una pista."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QKeySequence, QPixmap, QShortcut
from PySide6.QtWidgets import (
    QApplication,
    QDialog,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QStackedWidget,
    QVBoxLayout,
    QWidget,
)

from ...config import tag_history_dir
from ...core.library import Track
from ...core.metadata import (
    TEXT_FIELDS,
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
from ...core.tag_history import TagBatch, make_change, now_iso, save_manifest
from ..covers import render_cover
from ..services.metadata_search import MetadataSearch, apply_album
from ..services.thumbnails import ThumbnailLoader, cache_path
from ..widgets.buttons import IconButton, TextButton
from .dialog import ThemedDialog
from .elided import ElidedLabel
from .metadata_artwork import (
    IMAGE_FILTER,
    MetadataCoverView,
    paint_thumbnail,
    pixmap_bytes,
    size_text,
)
from .metadata_catalog import CandidateRow, CatalogPanel, make_result_item

SOURCE_LABELS = {
    "itunes": "APPLE MUSIC · ITUNES",
    "deezer": "DEEZER",
    "musicbrainz": "MUSICBRAINZ",
}


class MetadataEditor(ThemedDialog):
    """Formulario de edicion de una pista.

    Lee los tags al abrir y escribe recien al confirmar, asi que cancelar no
    toca el archivo. Ademas deja buscar el tema en un catalogo publico y llenar
    todo solo, o aplicar los tags a todo el album de la carpeta.
    """

    def __init__(self, path: Path, parent=None, album_tracks: list[Track] | None = None):
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
        self._original_tags: dict[str, str] = {}
        self._original_cover_bytes: bytes | None = None
        self._field_labels: dict[str, QLabel] = {}
        self._reset_buttons: dict[str, IconButton] = {}

        super().__init__(
            title="Editar metadatos",
            eyebrow="BIBLIOTECA · PISTA",
            subtitle=path.name,
            parent=parent,
        )
        # El alto nunca pasa de la pantalla: antes pedia 800 fijos y en un monitor
        # de 800 de alto el encabezado quedaba cortado arriba.
        pantalla = QApplication.primaryScreen()
        available = pantalla.availableGeometry().height() if pantalla else 900
        self.resize(860, max(580, min(780, available - 70)))
        self.setMinimumSize(700, 540)

        self._build()
        self._connect_search()
        self.thumbnails = ThumbnailLoader(self)
        self.thumbnails.loaded.connect(self._on_thumbnail_loaded)
        self.thumbnails.failed.connect(self._on_thumbnail_failed)
        self._show_view_current()
        self._load()
        self.search_box.setPlaceholderText(self.query_sugerida())
        self._install_shortcuts()

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        root = self.content_layout
        root.setContentsMargins(22, 12, 22, 14)
        root.setSpacing(12)

        root.addWidget(self._file_current())
        self.views = QStackedWidget()

        self.editar_view = QScrollArea()
        self.editar_view.setWidgetResizable(True)
        self.editar_view.setFrameShape(QScrollArea.Shape.NoFrame)
        self.editar_container = QWidget()
        self.editar_layout = QVBoxLayout(self.editar_container)
        self.editar_layout.setContentsMargins(0, 0, 0, 0)
        self.editar_layout.setSpacing(12)
        # Dos columnas: la portada como ficha y el formulario con el resto del
        # ancho. El layout de arriba sigue siendo vertical (`TopToBottom`).
        columns = QWidget()
        columns_layout = QHBoxLayout(columns)
        columns_layout.setContentsMargins(0, 0, 0, 0)
        columns_layout.setSpacing(14)
        columns_layout.addWidget(self._block_cover(), 0, Qt.AlignmentFlag.AlignTop)
        columns_layout.addWidget(self._block_tags(), 1)
        self.editar_layout.addWidget(columns)
        self.editar_view.setWidget(self.editar_container)
        self.views.addWidget(self.editar_view)

        self.catalog_view = CatalogPanel()
        self._alias_catalog()
        self._connect_catalog()
        self.views.addWidget(self.catalog_view)
        root.addWidget(self.views, 1)

        self.show_footer(True)
        self._build_footer()

    def _alias_catalog(self) -> None:
        """Deja a mano en el editor los widgets del panel que se usan afuera."""
        panel = self.catalog_view
        self.platform_box = panel.platform_box
        self.search_box = panel.search_box
        self.artist_search_box = panel.artist_search_box
        self.search_btn = panel.search_btn
        self.list = panel.list
        self.results_title = panel.results_title
        self.source_badge = panel.source_badge
        self.search_status = panel.search_status
        self.use_btn = panel.use_btn
        self.compare = panel.compare

    def _connect_catalog(self) -> None:
        self.search_box.returnPressed.connect(self._search)
        self.search_btn.clicked.connect(self._search)
        self.list.itemDoubleClicked.connect(self._use_candidate)
        self.list.itemSelectionChanged.connect(self._selection_candidate)
        self.use_btn.clicked.connect(lambda: self._use_candidate())

    def _file_current(self) -> QWidget:
        """Barra de contexto: qué archivo se edita y qué vista está activa."""
        header = QFrame()
        header.setObjectName("MetadataContextBar")
        header.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        row = QHBoxLayout(header)
        row.setContentsMargins(12, 7, 7, 7)
        row.setSpacing(12)

        self.path_label = ElidedLabel("")
        self.path_label.setObjectName("MetadataPath")
        self.path_label.setToolTip("La ruta del archivo en su biblioteca")
        row.addWidget(self.path_label, 1)

        row.addWidget(self._view_toggle(), 0, Qt.AlignmentFlag.AlignVCenter)
        return header

    def _view_toggle(self) -> QWidget:
        """Control segmentado para saltar entre metadatos y catálogo.

        Reemplaza al "Volver a metadatos" del pie: la vuelta está a la vista
        todo el tiempo, no al final de una lista larga de resultados.
        """
        toggle = QFrame()
        toggle.setObjectName("SegmentedControl")
        row = QHBoxLayout(toggle)
        row.setContentsMargins(4, 4, 4, 4)
        row.setSpacing(6)

        self.edit_tab = QPushButton("Metadatos")
        self.catalog_tab = QPushButton("Catálogo")
        for button in (self.edit_tab, self.catalog_tab):
            button.setObjectName("SegmentButton")
            # Marca las pastillas de texto para darles aire lateral; los botones
            # con icono de la biblioteca usan el mismo objectName sin padding.
            button.setProperty("segmentKind", "text")
            button.setCheckable(True)
            button.setCursor(Qt.CursorShape.PointingHandCursor)
            button.setMinimumHeight(30)
            row.addWidget(button)

        self.edit_tab.clicked.connect(self._back_editor)
        self.catalog_tab.clicked.connect(self._open_catalog)
        self.edit_tab.setChecked(True)
        return toggle

    def _block_cover(self) -> QWidget:
        """La portada como ficha vertical: imagen, identidad y acciones.

        La imagen tambien acepta clics y arrastres, asi que la accion principal
        esta sobre la propia portada y no escondida en un boton.
        """
        holder = QFrame()
        holder.setObjectName("MetadataArtworkPanel")
        holder.setFixedWidth(254)

        layout = QVBoxLayout(holder)
        layout.setContentsMargins(16, 16, 16, 16)
        layout.setSpacing(10)

        self.cover = MetadataCoverView()
        self.cover.clicked.connect(self._choose_image)
        self.cover.image_dropped.connect(self._load_cover_path)
        layout.addWidget(self.cover, 0, Qt.AlignmentFlag.AlignHCenter)

        self.track_title = ElidedLabel("Editando su música")
        self.track_title.setObjectName("MetadataTrackTitle")
        layout.addWidget(self.track_title)

        self.track_artist = ElidedLabel("Ajusta la portada y los detalles")
        self.track_artist.setObjectName("MetadataTrackArtist")
        layout.addWidget(self.track_artist)

        self.cover_status = QLabel("La portada se guardará junto con los metadatos.")
        self.cover_status.setObjectName("MetadataHint")
        self.cover_status.setWordWrap(True)
        layout.addWidget(self.cover_status)
        layout.addStretch(1)

        self.catalog_btn = TextButton("Buscar en catálogo", "accent", icon="search")
        self.catalog_btn.clicked.connect(self._open_catalog)
        layout.addWidget(self.catalog_btn)

        actions = QHBoxLayout()
        actions.setSpacing(8)
        self.change_cover = IconButton("download", "Elegir imagen", 38)
        self.change_cover.clicked.connect(self._choose_image)
        actions.addWidget(self.change_cover)
        self.clear_cover = IconButton("trash", "Quitar portada", 38)
        self.clear_cover.clicked.connect(self._remove_cover)
        actions.addWidget(self.clear_cover)
        actions.addStretch(1)
        layout.addLayout(actions)
        return holder

    def _block_tags(self) -> QWidget:
        panel = QFrame()
        panel.setObjectName("MetadataFormPanel")
        form = QVBoxLayout(panel)
        form.setContentsMargins(18, 13, 18, 13)
        form.setSpacing(12)

        # Campos agrupados por sentido: antes eran siete en una rejilla plana sin
        # jerarquía, con "Nº de pista" ocupando dos columnas de la nada.
        groups = (
            (
                "Identidad",
                (
                    ("title", "Título"),
                    ("artist", "Artista"),
                    ("albumartist", "Artista del álbum"),
                ),
            ),
            (
                "Álbum",
                (
                    ("album", "Álbum"),
                    ("year", "Año"),
                    ("track_number", "Nº de pista"),
                ),
            ),
            ("Clasificación", (("genre", "Género"),)),
        )

        self.field_map: dict[str, QLineEdit] = {}
        for group_name, fields in groups:
            form.addWidget(self._group(panel, group_name, fields))
        form.addStretch(1)
        return panel

    def _group(self, parent: QWidget, group_name: str, fields) -> QWidget:
        group = QWidget(parent)
        layout = QVBoxLayout(group)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(7)

        header = QHBoxLayout()
        title = QLabel(group_name)
        title.setObjectName("MetadataGroupTitle")
        header.addWidget(title)
        header.addStretch(1)
        # "Aplicar a todo el álbum" vive con el álbum, no perdido en el pie.
        if group_name == "Álbum":
            self.album_btn = QPushButton("Aplicar a todo el álbum")
            self.album_btn.setObjectName("GhostButton")
            self.album_btn.setCursor(Qt.CursorShape.PointingHandCursor)
            self.album_btn.clicked.connect(self._apply_album)
            self.album_btn.setVisible(False)
            header.addWidget(self.album_btn)
        layout.addLayout(header)

        grid = QGridLayout()
        grid.setHorizontalSpacing(14)
        grid.setVerticalSpacing(7)
        grid.setColumnStretch(0, 1)
        grid.setColumnStretch(1, 1)
        for index, (field_name, tag) in enumerate(fields):
            grid.addWidget(self._field(tag, field_name), index // 2, index % 2)
        layout.addLayout(grid)
        return group

    def _field(self, tag: str, field_name: str) -> QWidget:
        field = QFrame()
        field.setObjectName("MetadataFieldBox")
        field.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        field_layout = QVBoxLayout(field)
        field_layout.setContentsMargins(8, 6, 8, 8)
        field_layout.setSpacing(4)

        label_row = QHBoxLayout()
        label_row.setContentsMargins(0, 0, 0, 0)
        label_row.setSpacing(4)

        label_widget = QLabel(tag)
        label_widget.setObjectName("FieldLabel")
        self._field_labels[field_name] = label_widget
        label_row.addWidget(label_widget)
        label_row.addStretch(1)

        reset = IconButton("undo", "Restaurar el valor original", 22)
        reset.setGraphicsEffect(None)
        reset.setFocusPolicy(Qt.FocusPolicy.NoFocus)
        reset.setVisible(False)
        reset.clicked.connect(lambda: self._reset_field(field_name))
        self._reset_buttons[field_name] = reset
        label_row.addWidget(reset)
        field_layout.addLayout(label_row)

        editor = QLineEdit()
        editor.setObjectName("MetadataField")
        editor.setMinimumHeight(38)
        self.field_map[field_name] = editor
        field_layout.addWidget(editor)
        return field

    def _reset_field(self, field_name: str) -> None:
        """Devuelve un campo a lo que tenia el archivo al abrir el editor."""
        editor = self.field_map.get(field_name)
        if editor is None:
            return
        editor.setText(self._original_tags.get(field_name, ""))
        editor.setFocus()

    def _build_footer(self) -> None:
        self.dirty_label = QLabel("")
        self.dirty_label.setObjectName("MetadataDirty")
        self.footer_layout.addWidget(self.dirty_label)

        self.state = QLabel("")
        self.state.setObjectName("EmptyState")
        self.footer_layout.addWidget(self.state, 1)

        self.back_btn = TextButton("Volver a metadatos", "ghost", icon="arrow-left")
        self.back_btn.clicked.connect(self._back_editor)
        self.back_btn.setVisible(False)
        self.footer_layout.addWidget(self.back_btn)

        self.cancel_btn = TextButton("Cancelar", "ghost", icon="close")
        self.cancel_btn.clicked.connect(self.reject)
        self.footer_layout.addWidget(self.cancel_btn)

        self.save = TextButton("Guardar cambios", "accent", icon="check")
        self.save_btn = self.save
        self.save.setToolTip("Guardar cambios (Ctrl+S)")
        self.save.clicked.connect(self._save)
        self.footer_layout.addWidget(self.save)

    def _install_shortcuts(self) -> None:
        for sequence in (QKeySequence.StandardKey.Save, QKeySequence("Ctrl+Return")):
            shortcut = QShortcut(sequence, self)
            shortcut.activated.connect(self._save)

    def showEvent(self, event) -> None:
        super().showEvent(event)
        # Sin foco explicito, el primer boton de la ficha se lleva el foco y
        # QScrollArea arranca desplazado hacia abajo. El timer deja que Qt
        # termine de colocar el foco antes de fijar la posicion.
        self.field_map["title"].setFocus()
        QTimer.singleShot(0, self._scroll_top)

    def _scroll_top(self) -> None:
        self.editar_view.verticalScrollBar().setValue(0)

    def _show_view_current(self) -> None:
        in_editor = self.views.currentWidget() == self.editar_view
        self.edit_tab.setChecked(in_editor)
        self.catalog_tab.setChecked(not in_editor)
        self.back_btn.setVisible(not in_editor)
        self.cancel_btn.setVisible(in_editor)
        self.save_btn.setVisible(in_editor)
        self.album_btn.setVisible(
            in_editor
            and bool(
                self._candidate
                and self._candidate.source == "itunes"
                and self._candidate.album_id
                and self.album_tracks
            )
        )
        self._update_dirty()

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

        # Las conexiones van despues de cargar: si no, cada `setText` marcaria el
        # campo como modificado antes de que exista la referencia original.
        self._original_tags = {
            field_name: editor.text().strip()
            for field_name, editor in self.field_map.items()
        }
        for editor in self.field_map.values():
            editor.textChanged.connect(self._update_identidad)
            editor.textChanged.connect(self._update_dirty)

        self._update_identidad()
        self._cover_bytes = read_cover(self.path)
        self._original_cover_bytes = self._cover_bytes
        self._paint_cover()
        self._update_dirty()

    def _update_identidad(self, *_args) -> None:
        title_text = self.field_map["title"].text().strip() or self.path.stem
        artist_name = self.field_map["artist"].text().strip()
        self.track_title.setText(title_text)
        self.track_artist.setText(artist_name or "Edita la portada y los detalles de esta pista")

    def _update_dirty(self, *_args) -> None:
        """Marca los campos tocados y resume los cambios sin guardar."""
        changed = {
            field_name
            for field_name, editor in self.field_map.items()
            if editor.text().strip() != self._original_tags.get(field_name, "")
        }
        for field_name, label in self._field_labels.items():
            modified = field_name in changed
            self._mark_modified(label, modified)
            self._mark_modified(self.field_map[field_name], modified)
            reset = self._reset_buttons.get(field_name)
            if reset is not None:
                reset.setVisible(modified)

        cover_dirty = self._cover_removed or (
            self._cover_bytes != self._original_cover_bytes
        )
        total = len(changed) + (1 if cover_dirty else 0)
        if total == 0:
            self.dirty_label.setText("")
        elif total == 1:
            self.dirty_label.setText("1 cambio sin guardar")
        else:
            self.dirty_label.setText(f"{total} cambios sin guardar")
        self.save.setEnabled(total > 0 and not self._cover_request_pending)

    @staticmethod
    def _mark_modified(widget: QWidget, modified: bool) -> None:
        if widget.property("modified") == modified:
            return
        widget.setProperty("modified", modified)
        widget.style().unpolish(widget)
        widget.style().polish(widget)

    def tags_current(self) -> TrackTags:
        return TrackTags(
            **{
                field_name: editor.text().strip()
                for field_name, editor in self.field_map.items()
            }
        )

    # --- portada ------------------------------------------------------------

    def _paint_cover(self) -> None:
        if self._cover_removed or not self._cover_bytes:
            self.cover.show_placeholder()
            self.cover_status.setText(
                "Portada quitada" if self._cover_removed else "Sin portada incrustada"
            )
            self._state("Sin portada" if self._cover_removed else "")
            return

        self.cover.show_bytes(self._cover_bytes)
        self.cover_status.setText(f"Portada lista · {size_text(len(self._cover_bytes))}")
        self._state(f"Portada · {size_text(len(self._cover_bytes))}")

    def _choose_image(self) -> None:
        chosen = QFileDialog.getOpenFileName(
            self, "Elegir portada", str(self.path.parent), IMAGE_FILTER
        )[0]
        if not chosen:
            return
        self._load_cover_path(chosen)

    def _load_cover_path(self, chosen: str) -> None:
        """Carga una portada elegida en el dialogo o soltada sobre la imagen."""
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
        self._update_dirty()

    def _remove_cover(self) -> None:
        self._cover_bytes = None
        self._cover_removed = True
        self._chosen_cover_url = ""
        self._cover_request_pending = False
        self.save.setEnabled(True)
        self._paint_cover()
        self._update_dirty()

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
            before = read_tags(self.path)
        except MetadataError:
            before = None

        try:
            write_tags(self.path, tags)

            if self._cover_removed:
                remove_cover(self.path)
            elif self._cover_bytes:
                write_cover(self.path, self._cover_bytes, getattr(self, "_mime", "image/jpeg"))
        except MetadataError as exc:
            self._error(str(exc))
            return

        self._record_history(before, tags)
        self.accept()

    def _record_history(self, before: TrackTags | None, tags: TrackTags) -> None:
        """Guarda el manifiesto del cambio para poder deshacerlo despues.

        Una edicion suelta es un lote de una pista, para que "Deshacer ultimo
        lote" tambien la alcance.
        """
        if before is None:
            return
        after = {field_name: getattr(tags, field_name) for field_name in TEXT_FIELDS}
        change = make_change(self.path, before.as_text_mapping(), after)
        if change is None:
            return
        batch = TagBatch(
            label=f"Edición de {self.path.name}",
            created_at=now_iso(),
            changes=[change],
        )
        save_manifest(batch, tag_history_dir())

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
        self.compare.clear()
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
        self.compare.clear()
        self.use_btn.setEnabled(False)

        for candidate in candidates:
            source_name = SOURCE_LABELS.get(candidate.source, candidate.source.upper())
            item = make_result_item(candidate, source_name)
            self.list.addItem(item)
            row = CandidateRow(candidate, source_name, self.list)
            self.list.setItemWidget(item, row)
            self._set_result_thumbnail(candidate.cover_url, row.artwork)

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
        self._candidate = None
        self.compare.clear()
        self.results_title.setText("Sin resultados")
        self.source_badge.setText("SIN COINCIDENCIAS")
        self.search_status.setText(message_text)
        self._state(message_text)

    def _selection_candidate(self) -> None:
        candidate = self._candidate_selected()
        self.use_btn.setEnabled(candidate is not None)
        if candidate is not None:
            self._previsualizar(candidate)
            self.compare.show_candidate(candidate, self._current_fields())
        else:
            self.compare.clear()

    def _current_fields(self) -> dict[str, str]:
        return {name: editor.text() for name, editor in self.field_map.items()}

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
            self._preview_artwork_bytes = pixmap_bytes(pixmap)
            self.cover.show_pixmap(pixmap)
            self.cover_status.setText("Vista previa de portada del catálogo")
        elif candidate.cover_url and candidate.cover_url in self._artwork_pixmaps:
            pixmap = self._artwork_pixmaps[candidate.cover_url]
            self._preview_artwork_bytes = pixmap_bytes(pixmap)
            self.cover.show_pixmap(pixmap)
            self.cover_status.setText("Vista previa de portada del catálogo")
        elif candidate.cover_url:
            self.cover.show_placeholder()
            self.cover_status.setText("Cargando portada del catálogo…")
            detail += " · cargando portada…"
        else:
            self.cover.show_placeholder()
            self.cover_status.setText("El catálogo no ofrece portada para esta pista")
            detail += " · sin portada en el catálogo"
        self._state(detail)

    def _use_candidate(self) -> None:
        """Llena el formulario con el candidato elegido."""
        candidate = self._candidate_selected()
        if candidate is None:
            return

        self._candidate = candidate
        chosen = candidate.to_tags()
        if self.compare.candidate() is candidate:
            chosen = self.compare.selected_fields()
        for field_name, value in chosen.items():
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
                    data = pixmap_bytes(pixmap)
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
            paint_thumbnail(label, pixmap)
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
        self._artwork_pixmaps[url] = QPixmap(pixmap)
        for label in self._thumbnail_labels.pop(url, []):
            paint_thumbnail(label, pixmap)
        data = pixmap_bytes(pixmap) if url in (
            self._preview_cover_url,
            self._chosen_cover_url,
        ) else None
        if url == self._preview_cover_url:
            self._preview_artwork_bytes = data
            self.cover.show_pixmap(pixmap)
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
        self._paint_cover()
        self._update_dirty()
        self._state(f"No se pudo cargar la portada ({razon}); se conservará la portada actual.")

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
            self.cover.show_pixmap(pixmap)
        self.cover_status.setText("Portada del catálogo lista para guardar")
        origin = self._candidate.source if self._candidate else "Catálogo"
        self._state(f"{origin}: portada lista para guardar.")
        self._update_dirty()

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