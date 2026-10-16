"""Pagina de busqueda con resultados descargables y selector de formato/calidad.

Soporta dos modos:
- Busqueda por texto: consulta ytsearch y muestra hasta 20 resultados.
- URL de playlist: resuelve la playlist con yt-dlp --flat-playlist y muestra
  todos los videos con un boton "Descargar todo" en la cabecera.
"""

from __future__ import annotations

from PySide6.QtCore import QTimer, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QComboBox, QHBoxLayout, QLabel, QWidget

from ...config import load_settings, save_settings
from ...core.formats import FORMATS, MediaFormat, get_format
from ...core.metadata_sources import AlbumEntry, ArtistEntry, Candidate, itunes_album
from ...core.models import SearchResult
from ...core.tools import is_playlist_url, summarize_hidden
from .. import theme as th
from ..services import PlaylistResolver, SearchService, ThumbnailLoader
from ..services.album_resolver import (
    AlbumResolver,
    ArtistCatalog,
    folder_album,
    tracks_album,
)
from ..widgets.album_review import open_review
from ..widgets.buttons import TextButton
from ..widgets.discography import open_discography
from ..widgets.result_card import ResultCard, thumbnail_target
from .base import Page

SEARCH_DEBOUNCE_MS = 450
RESULT_LIMIT = 20


class SearchPage(Page):
    """Busca mientras se escribe y permite encolar descargas con un clic."""

    download_requested = Signal(object, object)   # (SearchResult, MediaFormat | None)
    download_all_requested = Signal(list, object, str)  # (resultados, formato, playlist)
    # Pistas de un album ya cruzadas con YouTube, para encolar con tags correctos.
    album_download_requested = Signal(list, object, str)  # (matches, formato, carpeta)

    def __init__(self, parent=None):
        super().__init__("Buscar", "Encuentra y descarga música y videos", parent)

        self.search_service = SearchService(self)
        self.playlist_resolver = PlaylistResolver(self)
        self.thumbnails = ThumbnailLoader(self)
        self.album_resolver = AlbumResolver(self)
        self.artist_catalog = ArtistCatalog(self)
        self._artists: list[ArtistEntry] = []
        self._disc_albums: list[AlbumEntry] = []
        self._disc_artist: ArtistEntry | None = None
        self._cards: dict[str, ResultCard] = {}
        self._playlist_results: list[SearchResult] = []
        self._query = ""
        self._playlist_mode = False
        self._album_tracks: list[Candidate] = []

        # Búsqueda normal
        self.search_service.result_found.connect(self._on_result)
        self.search_service.finished.connect(self._on_search_finished)
        self.search_service.failed.connect(self._on_failed)

        # Playlist
        self.playlist_resolver.result_found.connect(self._on_result)
        self.playlist_resolver.progress.connect(self._on_playlist_progress)
        self.playlist_resolver.finished.connect(self._on_playlist_finished)
        self.playlist_resolver.hidden_found.connect(self._on_playlist_hidden)
        self.playlist_resolver.failed.connect(self._on_failed)

        self.thumbnails.loaded.connect(self._on_thumbnail)

        self._debounce = QTimer(self)
        self._debounce.setSingleShot(True)
        self._debounce.setInterval(SEARCH_DEBOUNCE_MS)
        self._debounce.timeout.connect(self._run_search)

        # Barra de herramientas: estado / selector de calidad / botón playlist
        self._toolbar = self._build_toolbar()
        self._toolbar.setVisible(False)
        self.content.addWidget(self._toolbar)

        self._message = self.empty_state("Escribe algo para buscar música o videos.")
        self.content.addWidget(self._message)

    # --- barra de herramientas y selector de calidad ------------------------

    def _build_toolbar(self) -> QWidget:
        toolbar = QWidget()
        layout = QHBoxLayout(toolbar)
        layout.setContentsMargins(4, 0, 4, 6)
        layout.setSpacing(12)

        self._status = QLabel("")
        self._status.setObjectName("EmptyState")
        layout.addWidget(self._status, 1)

        fmt_label = QLabel("Formato:")
        fmt_label.setStyleSheet("font-size: 12px; font-weight: 600;")
        self._fmt_label = fmt_label
        layout.addWidget(fmt_label, 0)

        self._format_combo = QComboBox()
        for fmt in FORMATS:
            self._format_combo.addItem(fmt.label, fmt.id)
        current_fmt_id = load_settings().get("audio_format", "opus")
        idx = self._format_index(current_fmt_id)
        self._format_combo.setCurrentIndex(idx)
        self._format_combo.setFixedWidth(240)
        self._format_combo.currentIndexChanged.connect(self._on_format_combo_changed)
        layout.addWidget(self._format_combo, 0)

        self._dl_all_btn = TextButton("Descargar todo", "accent", icon="cloud-download")
        self._dl_all_btn.clicked.connect(self._on_download_all)
        self._dl_all_btn.setVisible(False)
        layout.addWidget(self._dl_all_btn, 0)

        # Un album del catalogo trae los tags correctos (año, género, pista), que
        # una busqueda suelta no puede dar. Se resuelve aparte y se revisa antes.
        self._album_btn = TextButton("Traer álbum del catálogo", "ghost", icon="disc")
        self._album_btn.clicked.connect(self._on_album_from_catalog)
        self._album_btn.setVisible(False)
        layout.addWidget(self._album_btn, 0)

        # Por nombre no se sabe qué disco querés. Con el artista se ve la
        # discografía entera y se elige de la lista.
        self._artist_btn = TextButton("Ver albums del artista", "ghost", icon="user")
        self._artist_btn.clicked.connect(self._on_artist_from_catalog)
        self._artist_btn.setVisible(False)
        layout.addWidget(self._artist_btn, 0)

        return toolbar

    def _format_index(self, format_id: str) -> int:
        for idx, fmt in enumerate(FORMATS):
            if fmt.id == format_id:
                return idx
        return 0

    def selected_format(self) -> MediaFormat:
        fmt_id = self._format_combo.currentData()
        return get_format(fmt_id)

    def set_active_format(self, format_id: str) -> None:
        idx = self._format_index(format_id)
        if self._format_combo.currentIndex() != idx:
            self._format_combo.blockSignals(True)
            self._format_combo.setCurrentIndex(idx)
            self._format_combo.blockSignals(False)

    def _on_format_combo_changed(self, index: int) -> None:
        fmt_id = self._format_combo.itemData(index)
        save_settings({"audio_format": fmt_id})

    # --- entrada -------------------------------------------------------------

    def set_query(self, text: str) -> None:
        """La llama el MainWindow cuando cambia el campo de busqueda."""
        text = text.strip()
        if not text:
            self._debounce.stop()
            self.search_service.cancel()
            self.playlist_resolver.cancel()
            self._clear_cards()
            self._show_message("Escribe algo para buscar música o videos.")
            self._toolbar.setVisible(False)
            return

        if text == self._query:
            return

        self._query = text
        self._debounce.start()

    def shutdown(self) -> None:
        """Corta busqueda, playlist y miniaturas al cerrar la app.

        Sin esto un yt-dlp de busqueda o de playlist sobrevive al cierre y su
        salida llega a widgets ya destruidos.
        """
        self._debounce.stop()
        self.search_service.shutdown()
        self.playlist_resolver.shutdown()
        self.thumbnails.shutdown()
        self.album_resolver.shutdown()
        self.artist_catalog.shutdown()

    def _run_search(self) -> None:
        if not self._query:
            return

        self._clear_cards()
        self._show_message("")
        self._dl_all_btn.setVisible(False)
        self._album_btn.setVisible(False)
        self._artist_btn.setVisible(False)
        self._album_tracks = []
        self._toolbar.setVisible(True)

        if is_playlist_url(self._query):
            self._playlist_mode = True
            self._playlist_results = []
            self._playlist_hidden = {}
            self._set_status("Leyendo playlist…")
            self.playlist_resolver.resolve(self._query)
        else:
            self._playlist_mode = False
            self._set_status("Buscando…")
            self.search_service.search(self._query, RESULT_LIMIT)

    # --- resultados ----------------------------------------------------------

    def _on_result(self, result: SearchResult) -> None:
        self._show_message("")
        # En playlist el orden es el de la lista y se numera; en busqueda el
        # orden es por relevancia y numerar no significaria nada.
        index = len(self._playlist_results) + 1 if self._playlist_mode else None
        card = ResultCard(result, index)
        card.download_requested.connect(self._on_card_download)
        self.content.addWidget(card)
        self._cards[result.url] = card

        if self._playlist_mode:
            self._playlist_results.append(result)

        if result.thumbnail:
            target = thumbnail_target(result)
            if target.exists():
                card.set_thumbnail(QPixmap(str(target)))
            else:
                self.thumbnails.request(result.thumbnail, target)

    def _on_card_download(self, result: SearchResult, custom_fmt: MediaFormat | None) -> None:
        fmt = custom_fmt or self.selected_format()
        self.download_requested.emit(result, fmt)

    def _on_thumbnail(self, url: str, pixmap: QPixmap) -> None:
        for card in self._cards.values():
            if card.result.thumbnail == url:
                card.set_thumbnail(pixmap)

    # --- búsqueda normal -----------------------------------------------------

    def _on_search_finished(self, count: int) -> None:
        if count == 0:
            self._show_message("Sin resultados para esa búsqueda.")
            self._set_status("")
        else:
            self._set_status(f"{count} resultado{'s' if count != 1 else ''}")
        # El album del catalogo solo tiene sentido en una busqueda de texto: en
        # una playlist ya sabes que hay y se baja entera.
        self._album_btn.setVisible(count > 0 and not self._playlist_mode)
        self._artist_btn.setVisible(count > 0 and not self._playlist_mode)

    # --- playlist ------------------------------------------------------------

    def _on_playlist_progress(self, count: int) -> None:
        self._set_status(f"Leyendo playlist… {count} video{'s' if count != 1 else ''}")

    def _on_playlist_hidden(self, hidden: dict) -> None:
        """Se guarda para el resumen final; llega antes que `finished`."""
        self._playlist_hidden = dict(hidden)

    def _on_playlist_finished(self, title_text: str, total: int) -> None:
        self._set_status(self._text_playlist(total))
        self._dl_all_btn.setEnabled(bool(self._playlist_results))
        self._dl_all_btn.setVisible(total > 0)
        self._album_btn.setVisible(False)
        self._artist_btn.setVisible(False)

        if total == 0:
            self._show_message(self._message_playlist_empty())
            return

        self._show_message("")

    def _text_playlist(self, total: int) -> str:
        """'12 videos · 3 videos ocultos (2 privados, 1 eliminado)'."""
        chunks = [f"{total} video{'s' if total != 1 else ''}"]
        hidden = sum(self._playlist_hidden.values())
        if hidden:
            detail = summarize_hidden(self._playlist_hidden)
            chunks.append(
                f"{hidden} video{'s' if hidden != 1 else ''} "
                f"oculto{'s' if hidden != 1 else ''} ({detail})"
            )
        return " · ".join(chunks)

    def _message_playlist_empty(self) -> str:
        if not self._playlist_hidden:
            return "La playlist no tiene videos accesibles."
        return (
            f"La playlist no tiene videos descargables: hay "
            f"{summarize_hidden(self._playlist_hidden)}."
        )

    def _on_download_all(self) -> None:
        if self._playlist_results:
            fmt = self.selected_format()
            # Se manda el nombre de la playlist para que las canciones caigan
            # todas en una carpeta con ese nombre.
            self.download_all_requested.emit(
                list(self._playlist_results), fmt, self._playlist_name()
            )

    def _playlist_name(self) -> str:
        return self.playlist_resolver.title.strip()

    # --- album del catalogo ---------------------------------------------------

    def _on_album_from_catalog(self) -> None:
        """Busca el album escrito en el catálogo y lo cruza con YouTube."""
        query = self._query.strip()
        if not query:
            return

        self._album_btn.setEnabled(False)
        self._set_status("Buscando el álbum en el catálogo…")
        self.album_resolver.progress.connect(self._set_status)
        self.album_resolver.album_found.connect(self._on_album_ready)
        self.album_resolver.failed.connect(self._on_album_failed)
        self._load_album(query)

    def _load_album(self, query: str) -> None:
        track_items = tracks_album(query)
        if not track_items:
            self._on_album_failed("El catálogo no encontró ese álbum")
            return
        self.album_resolver.resolve_tracks(track_items)

    def _on_album_ready(self, track_items: list[Candidate], matches: list) -> None:
        self._album_btn.setEnabled(True)
        self._album_tracks = list(track_items)
        album = track_items[0].album if track_items else ""
        self._set_status(f"{len(matches)} pistas cruzadas con YouTube")

        chosen_tracks = open_review(album, matches, self)
        if not chosen_tracks:
            self._set_status("No se seleccionó ninguna pista")
            return

        fmt = self.selected_format()
        self.album_download_requested.emit(
            chosen_tracks, fmt, folder_album(chosen_tracks[0].candidate)
        )

    def _on_album_failed(self, message: str) -> None:
        self._album_btn.setEnabled(True)
        self._set_status("")
        self._show_message(f"No se pudo traer el álbum: {message}")

    # --- artista y discografia ------------------------------------------------

    def _on_artist_from_catalog(self) -> None:
        """Busca el artista escrito y muestra sus discos."""
        query = self._query.strip()
        if not query:
            return

        self._artist_btn.setEnabled(False)
        self._set_status("Buscando el artista en el catálogo…")
        self.artist_catalog.artists_found.connect(self._on_artists_found)
        self.artist_catalog.albums_found.connect(self._on_discography_found)
        self.artist_catalog.failed.connect(self._on_artist_failed)
        self.artist_catalog.do_search(query)

    def _on_artists_found(self, artists: list[ArtistEntry]) -> None:
        self._artist_btn.setEnabled(True)
        if not artists:
            self._set_status("")
            self._show_message("El catálogo no encontró ese artista.")
            return

        self._artists = list(artists)
        chosen = artists[0]
        if len(artists) > 1:
            self._set_status(
                f"{len(artists)} artistas parecidos · usando “{chosen.name}”"
            )
        else:
            self._set_status(f"{chosen.name} · buscando sus álbumes…")
        self.artist_catalog.albums(chosen.artist_id, chosen)

    def _on_discography_found(self, artist_name, albums: list[AlbumEntry]) -> None:
        self._artist_btn.setEnabled(True)
        self._disc_artist = artist_name
        self._disc_albums = list(albums)
        if not albums:
            self._set_status("")
            self._show_message("El catálogo no tiene álbumes de ese artista.")
            return

        album = open_discography(artist_name, albums, self)
        if album is None:
            self._set_status("No se eligió ningún álbum")
            return

        self._fetch_album_by_id(album)

    def _fetch_album_by_id(self, album: AlbumEntry) -> None:
        """Cruza el álbum elegido contra YouTube, igual que por nombre."""
        track_items = itunes_album(album.album_id)
        if not track_items:
            self._on_album_failed("El álbum no devolvió pistas")
            return
        self.album_resolver.resolve_tracks(track_items)

    def _on_artist_failed(self, message: str) -> None:
        self._artist_btn.setEnabled(True)
        self._set_status("")
        self._show_message(f"No se pudo buscar el artista: {message}")

    # --- error ---------------------------------------------------------------

    def _on_failed(self, message: str) -> None:
        self._show_message(f"No se pudo buscar: {message}")
        self._set_status("")

    # --- utilidades ----------------------------------------------------------

    def _clear_cards(self) -> None:
        self._cards.clear()
        self._playlist_results = []
        self._playlist_hidden = {}
        # Los primeros 2 widgets son: _toolbar, _message
        while self.content.count() > 2:
            item = self.content.takeAt(2)
            widget = item.widget()
            if widget is not None:
                widget.setParent(None)
                widget.deleteLater()

    def _show_message(self, text: str) -> None:
        """Muestra u oculta el placeholder sin recrear el layout."""
        self._message.setVisible(bool(text))
        if text:
            self._message.set_text(text)

    def _set_status(self, text: str) -> None:
        self._status.setText(text)

    def refresh(self) -> None:
        """Recolorea las tarjetas y controles tras un cambio de tema."""
        t = th.active()
        self._fmt_label.setStyleSheet(f"color: {t.text_dim}; font-size: 12px; font-weight: 600;")
        self._format_combo.setStyleSheet(
            f"QComboBox {{ background: {t.surface_alt}; color: {t.text};"
            f" border: 1px solid {t.border}; border-radius: {t.radius}px;"
            " padding: 6px 10px; font-size: 12px; }"
            f"QComboBox QAbstractItemView {{ background: {t.surface_alt};"
            f" color: {t.text}; selection-background-color: {t.accent};"
            f" border: 1px solid {t.border}; }}"
        )
        for card in self._cards.values():
            card.refresh(t)