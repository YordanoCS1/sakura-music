"""Edición de tags de varias pistas a la vez.

El editor de una pista no sirve para ordenar una biblioteca: con 200 archivos
sin género hay que editarlos de a uno. Acá se marca un campo, se escribe el
valor y se aplica a todas las pistas seleccionadas.

La regla que define la pantalla: un campo vacío no se toca. Si el usuario
dejó "Álbum" en blanco, es porque no quiere cambiarlo, no porque quiera
borrarlo. Borrar un álbum entero por accident es un trabajo largo de deshacer.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from PySide6.QtWidgets import (
    QCheckBox,
    QDialog,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QVBoxLayout,
    QWidget,
)

from ...config import tag_history_dir
from ...core.library import Track
from ...core.metadata import (
    MetadataError,
    read_tags,
    update_text_tags,
)
from ...core.tag_history import TagBatch, make_change, now_iso, save_manifest
from .. import theme as th
from .buttons import TextButton

# Los campos que tiene sentido cambiar en lote. `title` y `albumartist` quedan
# fuera a proposito: el titulo identifica la pista y el artista de album casi
# nunca es el mismo para todas las seleccionadas.
FIELDS_BATCH = ("artist", "album", "albumartist", "year", "genre", "track_number")

LABELS = {
    "artist": "Artista",
    "album": "Álbum",
    "albumartist": "Artista del álbum",
    "year": "Año",
    "genre": "Género",
    "track_number": "Nº de pista",
}


@dataclass
class BatchResult:
    """Que termino pasando al aplicar los tags a un grupo de pistas."""

    applied: int = 0
    errors: list[str] = field(default_factory=list)
    omitidas: int = 0
    # El lote con los valores previos, para poder deshacerlo. `manifest` es la
    # ruta donde quedo guardado, o None si no habia cambios o no se pidio.
    batch: TagBatch | None = None
    manifest: Path | None = None

    @property
    def text_summary(self) -> str:
        if not self.applied:
            return "No se modificó ninguna pista"
        chunks = [f"{self.applied} pistas actualizadas"]
        if self.omitidas:
            chunks.append(f"{self.omitidas} sin cambios")
        if self.errors:
            chunks.append(f"{len(self.errors)} con problemas")
        return " · ".join(chunks)


def changes_batch(field_map: dict[str, str]) -> dict[str, str]:
    """Saca los campos vacios: vacio significa 'no tocar', no 'borrar'."""
    return {field_name: value.strip() for field_name, value in field_map.items() if value.strip()}


def applying_tags_a_batch(
    tracks: list[Track],
    changes: dict[str, str],
    history_dir: Path | None = None,
) -> BatchResult:
    """Aplica los mismos cambios a varias pistas.

    Va fuera de la UI a proposito: son dos lecturas de mutagen por archivo y con
    una seleccion grande el hilo de la interfaz se congela.

    Si se pasa `history_dir`, guarda un manifiesto con los valores previos para
    poder deshacer el lote.
    """
    result = BatchResult()
    clean = changes_batch(changes)
    if not clean:
        return result

    batch = TagBatch(
        label=f"Lote de {len(tracks)} pistas",
        created_at=now_iso(),
        changes=[],
    )

    for track_item in tracks:
        if track_item.path is None:
            result.omitidas += 1
            continue
        try:
            before = read_tags(track_item.path)
        except MetadataError as exc:
            result.errors.append(f"{track_item.title}: {exc}")
            continue

        if all(getattr(before, field_name) == value for field_name, value in clean.items()):
            result.omitidas += 1
            continue

        try:
            update_text_tags(track_item.path, **clean)
        except MetadataError as exc:
            result.errors.append(f"{track_item.title}: {exc}")
            continue
        result.applied += 1

        change = make_change(track_item.path, before.as_text_mapping(), clean)
        if change is not None:
            batch.changes.append(change)

    result.batch = batch
    if history_dir is not None:
        result.manifest = save_manifest(batch, history_dir)
    return result


def _field_text(value: str, placeholder: str) -> QLineEdit:
    field_name = QLineEdit()
    field_name.setPlaceholderText(placeholder)
    field_name.setClearButtonEnabled(True)
    return field_name


class BatchEditDialog(QDialog):
    """Formulario para aplicar los mismos tags a varias pistas."""

    def __init__(self, tracks: list[Track], parent=None):
        super().__init__(parent)
        self._tracks = list(tracks)

        self.setWindowTitle("Editar metadatos en lote")
        self.setModal(True)
        self.setMinimumWidth(560)
        self._result = BatchResult()

        root = QVBoxLayout(self)
        root.setContentsMargins(22, 18, 22, 18)
        root.setSpacing(14)

        title_text = QLabel(f"{len(self._tracks)} pistas seleccionadas")
        title_text.setObjectName("PageHeader")
        root.addWidget(title_text)

        ayuda = QLabel(
            "Escribí solo los campos que quiera cambiar: los que dejes vacíos no "
            "se tocan. Para borrar un campo hay que vaciarlo en el editor de una pista."
        )
        ayuda.setObjectName("PageSubtitle")
        ayuda.setWordWrap(True)
        root.addWidget(ayuda)

        root.addWidget(self._formulario())

        self.summary = QLabel("")
        self.summary.setObjectName("Callout")
        self.summary.setWordWrap(True)
        self.summary.setVisible(False)
        root.addWidget(self.summary)

        root.addLayout(self._footer())

    def _formulario(self) -> QWidget:
        panel = QWidget()
        grid = QGridLayout(panel)
        grid.setHorizontalSpacing(14)
        grid.setVerticalSpacing(9)

        self.field_map: dict[str, QLineEdit] = {}
        for idx, field_name in enumerate(FIELDS_BATCH):
            tag = QLabel(LABELS[field_name])
            tag.setObjectName("FieldLabel")
            entrada = _field_text("", f"No cambiar {LABELS[field_name].lower()}")
            self.field_map[field_name] = entrada
            grid.addWidget(tag, idx, 0)
            grid.addWidget(entrada, idx, 1)
        return panel

    def _footer(self) -> QHBoxLayout:
        footer = QHBoxLayout()
        footer.setSpacing(10)

        self.select_all = QCheckBox("Marcar todos los campos")
        self.select_all.toggled.connect(self._mark_all)
        footer.addWidget(self.select_all)
        footer.addStretch(1)

        cancel = TextButton("Cancelar", "ghost", icon="close")
        cancel.clicked.connect(self.reject)
        footer.addWidget(cancel)

        self.apply = TextButton("Aplicar a las pistas", "accent", icon="check")
        self.apply.setDefault(True)
        self.apply.clicked.connect(self._apply)
        footer.addWidget(self.apply)
        return footer

    def changes(self) -> dict[str, str]:
        """Los campos marcados con contenido."""
        marked_fields = {
            field_name: entrada.text().strip()
            for field_name, entrada in self.field_map.items()
            if entrada.text().strip()
        }
        return changes_batch(marked_fields)

    def _mark_all(self, checked: bool) -> None:
        for entrada in self.field_map.values():
            entrada.setEnabled(checked)

    def _apply(self) -> None:
        changes = self.changes()
        if not changes:
            QMessageBox.information(
                self,
                "Nada que aplicar",
                "Escribí al menos un campo para aplicar.",
            )
            return

        result = applying_tags_a_batch(
            self._tracks, changes, history_dir=tag_history_dir()
        )
        self._result = result
        self.summary.setText(result.text_summary)
        self.summary.setVisible(True)

        if not result.applied:
            if result.errors:
                QMessageBox.critical(
                    self, "No se pudo aplicar", result.errors[0]
                )
            self.accept()
            return

        if result.errors:
            QMessageBox.warning(
                self,
                "Aplicado con problemas",
                f"{result.text_summary}\n\nPrimero: {result.errors[0]}",
            )
        self.accept()

    def refresh(self) -> None:
        """Recolorea tras un cambio de tema."""
        color = th.active().accent_text
        self.apply.setStyleSheet(f"color: {color};")


def open_edicion_batch(tracks: list[Track], parent=None) -> BatchResult | None:
    """Muestra el formulario y devuelve el resultado, o None si se cancelo."""
    if not tracks:
        return None
    dialog = BatchEditDialog(tracks, parent)
    dialog.exec()
    dialog.deleteLater()
    if dialog.result() != QDialog.DialogCode.Accepted:
        return None
    return BatchResult(
        applied=dialog._result.applied,
        errors=dialog._result.errors,
        omitidas=dialog._result.omitidas,
        batch=dialog._result.batch,
        manifest=dialog._result.manifest,
    )