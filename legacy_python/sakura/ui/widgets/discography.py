"""Elegir un álbum de la discografía de un artista.

Resuelve el "quiero toda la música de X": en vez de adivinar títulos, se elige
de lo que el catálogo dice que el artista tiene.
"""

from __future__ import annotations

from PySide6.QtCore import Qt, Signal
from PySide6.QtWidgets import (
    QAbstractItemView,
    QCheckBox,
    QDialog,
    QHBoxLayout,
    QLabel,
    QListWidget,
    QListWidgetItem,
    QVBoxLayout,
    QWidget,
)

from ...core.metadata_sources import AlbumEntry, ArtistEntry, only_albums
from .. import icons
from .. import theme as th
from .buttons import TextButton

COVER_SIZE = 88


class _AlbumRow(QWidget):
    """Una fila: portada, nombre, año y cantidad de pistas."""

    def __init__(self, album: AlbumEntry, parent=None):
        super().__init__(parent)
        self.album = album

        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(14)

        self.cover = QLabel()
        self.cover.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.cover, 0, Qt.AlignmentFlag.AlignVCenter)

        texts = QVBoxLayout()
        texts.setSpacing(3)
        self.title_text = QLabel(album.title)
        self.title_text.setWordWrap(True)
        texts.addWidget(self.title_text)
        self.subtitle = QLabel(album.subtitle)
        self.subtitle.setObjectName("PageSubtitle")
        texts.addWidget(self.subtitle)
        texts.addStretch(1)
        layout.addLayout(texts, 1)

        self.refresh()

    def refresh(self, theme=None) -> None:
        t = theme or th.active()
        self.title_text.setStyleSheet(
            f"color: {t.text}; font-size: 13px; font-weight: 600; background: transparent;"
        )
        # La portada se deja para cuando la haya descargado: pintar una vacia por
        # defecto y cambiarla despues hace parpadear la lista.
        if self.cover.pixmap().isNull():
            self.cover.setPixmap(icons.render("disc", t.accent, 40))

    def set_cover(self, pixmap) -> None:
        self.cover.setPixmap(pixmap)


class DiscographyDialog(QDialog):
    """Los álbumes del artista, del más nuevo al más viejo."""

    album_chosen = Signal(object)  # AlbumEntry

    def __init__(self, artist_name: ArtistEntry, albums: list[AlbumEntry], parent=None):
        super().__init__(parent)
        self._artist = artist_name
        self._albums = list(albums)
        self._chosen: AlbumEntry | None = None
        self._only_albums = True

        self.setWindowTitle(f"Álbumes de {artist_name.name}")
        self.setModal(True)
        self.resize(760, 620)

        self._build()
        self._poblar()

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(22, 18, 22, 18)
        root.setSpacing(12)

        self.title_text = QLabel(self._artist.name)
        self.title_text.setObjectName("PageHeader")
        root.addWidget(self.title_text)

        self.subtitle = QLabel(
            "Elegí un álbum para cruzarlo con YouTube y traerlo con sus tags correctos."
        )
        self.subtitle.setObjectName("PageSubtitle")
        self.subtitle.setWordWrap(True)
        root.addWidget(self.subtitle)

        controles = QHBoxLayout()
        controles.setSpacing(10)
        self.filtro = QCheckBox("Solo álbumes completos")
        self.filtro.setChecked(True)
        self.filtro.toggled.connect(self._change_filtro)
        controles.addWidget(self.filtro)
        controles.addStretch(1)
        self.summary = QLabel("")
        self.summary.setObjectName("EmptyState")
        controles.addWidget(self.summary)
        root.addLayout(controles)

        self.list = QListWidget()
        self.list.setObjectName("AlbumList")
        self.list.setSelectionMode(QAbstractItemView.SelectionMode.SingleSelection)
        self.list.itemDoubleClicked.connect(lambda _item: self._choose_selected())
        root.addWidget(self.list, 1)

        root.addLayout(self._footer())

    def _footer(self) -> QHBoxLayout:
        footer = QHBoxLayout()
        footer.setSpacing(10)
        footer.addStretch(1)

        cancel = TextButton("Cancelar", "ghost", icon="close")
        cancel.clicked.connect(self.reject)
        footer.addWidget(cancel)

        self.fetch = TextButton("Traer el álbum", "accent", icon="cloud-download")
        self.fetch.setDefault(True)
        self.fetch.clicked.connect(self._choose_selected)
        footer.addWidget(self.fetch)
        return footer

    # --- contenido ----------------------------------------------------------

    def _poblar(self) -> None:
        self.list.clear()
        visible = self._visible()

        for album in visible:
            row_index = _AlbumRow(album)
            item = QListWidgetItem()
            item.setSizeHint(row_index.sizeHint())
            item.setData(Qt.ItemDataRole.UserRole, album)
            self.list.addItem(item)
            self.list.setItemWidget(item, row_index)

        if not visible:
            self.list.addItem("No hay álbumes completos de este artista en el catálogo.")

        self.list.itemSelectionChanged.connect(self._sync_button)
        self.summary.setText(
            f"{len(visible)} de {len(self._albums)} álbumes"
            if len(visible) != len(self._albums)
            else f"{len(visible)} álbumes"
        )
        self._sync_button()

    def _visible(self) -> list[AlbumEntry]:
        return only_albums(self._albums) if self._only_albums else list(self._albums)

    def _change_filtro(self, marked: bool) -> None:
        self._only_albums = marked
        self._poblar()

    # --- acciones ------------------------------------------------------------

    def chosen_album(self) -> AlbumEntry | None:
        return self._chosen

    def _sync_button(self) -> None:
        self.fetch.setEnabled(self.list.currentItem() is not None)

    def _choose_selected(self) -> None:
        item = self.list.currentItem()
        if item is None:
            return
        album = item.data(Qt.ItemDataRole.UserRole)
        if isinstance(album, AlbumEntry):
            self._choose(album)

    def _choose(self, album: AlbumEntry) -> None:
        self._chosen = album
        self.album_chosen.emit(album)
        self.accept()

    def refresh(self) -> None:
        for idx in range(self.list.count()):
            widget = self.list.itemWidget(self.list.item(idx))
            if isinstance(widget, _AlbumRow):
                widget.refresh()


def open_discography(
    artist_name: ArtistEntry, albums: list[AlbumEntry], parent=None
) -> AlbumEntry | None:
    """Muestra la discografía y devuelve el álbum elegido, o None si se cancela."""
    dialog = DiscographyDialog(artist_name, albums, parent)
    dialog.exec()
    dialog.deleteLater()
    return dialog.chosen_album()


__all__ = ["DiscographyDialog", "open_discography"]