"""Ficha de una pista: portada, metadatos y acceso al editor.

Es la ventana que aparece antes de editar. Sirve para revisar que hay en el
archivo de verdad (y no lo que suelen devolver los tags) y decidir si vale la
pena corregirlo.
"""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QDialog,
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from ...core.library import Track
from .. import theme as th
from ..covers import render_cover
from .buttons import TextButton

COVER_SIZE = 300
GAP = 24


class TrackInfoDialog(QDialog):
    """Muestra la portada y los datos completos de una pista."""

    def __init__(self, track: Track, parent=None):
        super().__init__(parent)
        self.track = track
        self.hermanas: list[Track] = []

        self.setWindowTitle("Información de la pista")
        self.setModal(True)
        self.resize(680, 470)

        self._build()
        self.refresh()

    # --- interfaz -----------------------------------------------------------

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(24, 20, 24, 20)
        root.setSpacing(GAP)

        body = QHBoxLayout()
        body.setSpacing(GAP)
        body.addWidget(self._block_cover())
        body.addWidget(self._block_data(), 1)
        root.addLayout(body, 1)
        root.addLayout(self._footer())

    def _block_cover(self) -> QWidget:
        holder = QWidget()
        holder.setFixedWidth(COVER_SIZE)

        layout = QVBoxLayout(holder)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(10)

        # QLabel y no QFrame: hace falta setPixmap para pintar la portada.
        self.cover = QLabel()
        self.cover.setFixedSize(COVER_SIZE, COVER_SIZE)
        self.cover.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(self.cover)

        self.file_path = QLabel("")
        self.file_path.setObjectName("EmptyState")
        self.file_path.setWordWrap(True)
        self.file_path.setTextInteractionFlags(
            self.file_path.textInteractionFlags().TextSelectableByMouse
        )
        layout.addWidget(self.file_path)

        layout.addStretch(1)
        return holder

    def _block_data(self) -> QWidget:
        holder = QWidget()

        layout = QVBoxLayout(holder)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(GAP)

        self.title_text = QLabel("")
        self.title_text.setWordWrap(True)
        layout.addWidget(self.title_text)

        self.artist_name = QLabel("")
        self.artist_name.setWordWrap(True)
        layout.addWidget(self.artist_name)

        self.line = QFrame()
        self.line.setObjectName("Divider")
        self.line.setFixedHeight(1)
        layout.addWidget(self.line)

        self.data = QLabel("")
        self.data.setWordWrap(True)
        layout.addWidget(self.data)

        layout.addStretch(1)
        return holder

    def _footer(self) -> QHBoxLayout:
        footer = QHBoxLayout()
        footer.setSpacing(10)

        self.state = QLabel("")
        self.state.setObjectName("EmptyState")
        footer.addWidget(self.state, 1)

        close = TextButton("Cerrar", "ghost", icon="close")
        close.clicked.connect(self.reject)
        footer.addWidget(close)

        self.editar = TextButton("Editar metadatos", "accent", icon="edit")
        self.editar.clicked.connect(self._editar)
        footer.addWidget(self.editar)
        return footer

    # --- contenido ----------------------------------------------------------

    def refresh(self) -> None:
        """Vuelve a pintar todo desde el estado actual de la pista."""
        track = self.track
        t = th.active()

        self.file_path.setText(str(track.path))

        self.title_text.setText(track.title)
        self.title_text.setStyleSheet(
            f"color: {t.text}; font-size: 22px; font-weight: 800; background: transparent;"
        )

        self.artist_name.setText(track.artist)
        # `text_dim` y no `accent`: el nombre del artista es contenido, no una
        # accion. Dejarlo en el color de marca hacia que el acento significara
        # cuatro cosas distintas a la vez.
        self.artist_name.setStyleSheet(
            f"color: {t.text_dim}; font-size: 14px; font-weight: 600;"
            " background: transparent;"
        )

        rows = []
        if track.album and track.album != "Desconocido":
            rows.append(("Álbum", track.album))
        if track.year:
            rows.append(("Año", track.year))
        if track.genre:
            rows.append(("Género", track.genre))
        if track.number_text:
            # Aca si conviene el total ("3/14"), a diferencia de la columna
            # estrecha de la tabla, donde solo cabe el numero.
            rows.append(("Pista", track.track_number.strip() or track.number_text))
        rows.append(("Duración", track.duration_text))
        rows.append(("Tamaño", track.size_text))
        rows.append(("Formato", track.extension.upper()))
        rows.append(("Carpeta", track.folder.name))

        # El ancho del separador lo fija la etiqueta mas larga de la columna.
        width = max(len(tag) for tag, _ in rows)
        self.data.setText("\n".join(f"{e:<{width}}  {v}" for e, v in rows))
        self.data.setStyleSheet(
            f"color: {t.text_dim}; font-size: 12px; background: transparent;"
            " font-family: Consolas, monospace;"
        )

        # `_pintar_portada` deja el estado sobre si la pista tiene caratula o no.
        self._paint_cover()

    def _paint_cover(self) -> None:
        """Portada embebida si la hay; si no, un placeholder con nota musical."""
        destino = self.track.cover_path
        has_cover = destino is not None and destino.exists()

        self.cover.setPixmap(render_cover(destino if has_cover else None, COVER_SIZE))
        self.cover.setStyleSheet("")
        self._state(self._origin_cover())

    def _state(self, text_value: str) -> None:
        chunks = [text_value]
        if self.track.has_lyrics:
            chunks.append(f"letra en {self.track.lyrics_path.name}")
        self.state.setText(" · ".join(chunks))

    def _origin_cover(self) -> str:
        """De donde sale la caratula: embebida, de la carpeta o ninguna."""
        from ...core.library import find_folder_cover

        destino = self.track.cover_path
        if destino is None or not destino.exists():
            return "Esta pista no tiene portada"

        folder = find_folder_cover(self.track.folder)
        if folder is not None:
            try:
                if destino.resolve() == folder.resolve():
                    return f"Portada de la carpeta ({folder.name})"
            except OSError:
                pass
        return "Portada embebida en el archivo"

    def _refresh_track(self) -> None:
        """Relee el archivo para mostrar lo que se acaba de escribir."""
        from ...config import covers_dir
        from ...core.library import (
            extract_cover,
            find_folder_cover,
            find_lyrics,
            load_track,
        )

        updated = load_track(self.track.path)
        if updated is not None:
            updated.cover_path = extract_cover(self.track.path, covers_dir())
            if updated.cover_path is None:
                updated.cover_path = find_folder_cover(self.track.folder)
            updated.lyrics_path = find_lyrics(self.track.path)
            self.track = updated
        self.refresh()

    def _editar(self) -> None:
        """Abre el editor de metadatos para esta pista."""
        from .metadata_editor import MetadataEditor

        dialog = MetadataEditor(self.track.path, self, album_tracks=self.hermanas)
        if dialog.exec() == QDialog.DialogCode.Accepted:
            self._refresh_track()
        dialog.deleteLater()

    def open_cover_outside(self) -> None:
        """Muestra la portada en el explorador de archivos."""
        destino = self.track.cover_path
        if destino is None or not destino.exists():
            self._state("No hay portada para mostrar")
            return
        QFileDialog.getOpenFileName(self, "Portada", str(destino))


def open_info(track: Track, parent=None) -> None:
    """Muestra la ficha de la pista."""
    dialog = TrackInfoDialog(track, parent)
    dialog.exec()
    dialog.deleteLater()