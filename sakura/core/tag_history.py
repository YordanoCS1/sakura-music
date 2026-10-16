"""Historial de cambios de tags para poder deshacer un lote.

Guardar una copia `.bak` del audio entero es caro: una biblioteca puede pesar
gigas y el archivo no cambia de tamaño de forma significativa al reetiquetar.
Lo que hace falta saber es *que campos cambiaron* y *que tenian antes*. Con eso
se revierte con `update_text_tags`, y el manifiesto JSON queda para auditar que
toco cada lote.

El modulo es puro: no sabe de Qt ni de la carpeta de la app. La ruta donde se
guardan los manifiestos la decide quien llama (`config.tag_history_dir()`).
"""

from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4

from .metadata import TEXT_FIELDS, MetadataError, read_tags, update_text_tags

logger = logging.getLogger(__name__)

MANIFEST_VERSION = 1

# Cuantos manifiestos se conservan. Alcanza para auditar y deshacer varios
# lotes hacia atras sin llenar el disco.
MAX_MANIFESTS = 20


@dataclass(slots=True)
class Change:
    """Lo que se cambio en un archivo: valores previos y aplicados.

    Los dos diccionarios tienen las mismas claves (solo los campos que
    cambiaron). Un valor vacio significa que el campo no existia o se borro.
    """

    path: str
    before: dict[str, str]
    after: dict[str, str]


@dataclass(slots=True)
class TagBatch:
    """Un lote de cambios de tags, para revertir y auditar."""

    label: str
    created_at: str
    changes: list[Change] = field(default_factory=list)

    @property
    def count(self) -> int:
        return len(self.changes)

    @property
    def text_summary(self) -> str:
        plural = "s" if self.count != 1 else ""
        return f"{self.count} pista{plural}"


@dataclass(slots=True)
class RevertResult:
    """Que termino pasando al deshacer un lote."""

    restored: int = 0
    skipped: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def text_summary(self) -> str:
        if not self.restored and not self.skipped:
            return "No se pudo deshacer nada"
        plural = "s" if self.restored != 1 else ""
        chunks = [f"{self.restored} pista{plural} restaurada{plural}"]
        if self.skipped:
            chunks.append(f"{self.skipped} cambiadas por fuera")
        if self.errors:
            chunks.append(f"{len(self.errors)} con problemas")
        return " · ".join(chunks)


def now_iso() -> str:
    """Marca de tiempo en UTC, ordenable como texto."""
    return datetime.now(UTC).isoformat(timespec="seconds")


def diff_fields(
    before: dict[str, str], after: dict[str, str]
) -> tuple[dict[str, str], dict[str, str]]:
    """(before, after) recortados a los campos que de verdad cambian.

    Solo cuenta los campos que estan en `after`: es el estado objetivo, no la
    lista completa. Un campo que `before` tenga y `after` no mencione se deja
    como esta (asi un lote que solo toca el genero no borra el album).
    """
    fields = [
        field_name
        for field_name in TEXT_FIELDS
        if field_name in after and before.get(field_name, "") != after.get(field_name, "")
    ]
    return (
        {field_name: before.get(field_name, "") for field_name in fields},
        {field_name: after.get(field_name, "") for field_name in fields},
    )


def make_change(
    path: Path, before: dict[str, str], after: dict[str, str]
) -> Change | None:
    """Un `Change` con solo los campos que cambian, o None si no cambio nada."""
    before_map, after_map = diff_fields(before, after)
    if not before_map:
        return None
    return Change(path=str(path), before=before_map, after=after_map)


def save_manifest(batch: TagBatch, directory: Path) -> Path | None:
    """Guarda el manifiesto del lote y poda los viejos.

    La escritura es atomica (`.tmp` + `replace`): un manifiesto a medio escribir
    se leería como corrupto al arrancar.
    """
    if not batch.changes:
        return None

    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(UTC).strftime("%Y%m%d-%H%M%S")
    destino = directory / f"{stamp}-{uuid4().hex[:6]}.json"
    payload = {
        "version": MANIFEST_VERSION,
        "label": batch.label,
        "created_at": batch.created_at,
        "changes": [asdict(change) for change in batch.changes],
    }
    temporary = destino.with_suffix(".tmp")
    temporary.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    temporary.replace(destino)
    _prune(directory)
    return destino


def load_manifest(path: Path) -> TagBatch:
    """Lee un manifiesto. Lanza `ValueError` si el JSON no tiene la forma."""
    data = json.loads(path.read_text(encoding="utf-8"))
    changes = [
        Change(
            path=str(item["path"]),
            before=dict(item.get("before", {})),
            after=dict(item.get("after", {})),
        )
        for item in data.get("changes", [])
    ]
    return TagBatch(
        label=str(data.get("label", "")),
        created_at=str(data.get("created_at", "")),
        changes=changes,
    )


def latest_manifest(directory: Path) -> tuple[TagBatch, Path] | None:
    """El manifiesto mas reciente con cambios, y su ruta.

    Los que no se pueden leer se descartan: un archivo corrupto no puede dejar
    sin funcionar el "deshacer".
    """
    if not directory.exists():
        return None

    manifests = sorted(directory.glob("*.json"))
    while manifests:
        path = manifests.pop()
        try:
            batch = load_manifest(path)
        except (OSError, ValueError, KeyError, TypeError):
            logger.warning("Manifiesto de tags ilegible, se descarta: %s", path)
            path.unlink(missing_ok=True)
            continue
        if batch.changes:
            return batch, path
    return None


def revert_batch(batch: TagBatch) -> RevertResult:
    """Restaura los valores previos de cada archivo del lote.

    Si un archivo cambio desde el lote (alguien lo reetiqueto por fuera), no se
    toca: restaurar a ciegas pisaria un cambio que el usuario si quiere. Se
    cuenta como `skipped` y se avisa.
    """
    result = RevertResult()
    for change in batch.changes:
        path = Path(change.path)
        if not path.exists():
            result.errors.append(f"{path.name}: ya no existe")
            continue

        try:
            actual = read_tags(path).as_text_mapping()
        except MetadataError as exc:
            result.errors.append(f"{path.name}: {exc}")
            continue

        changed_outside = any(
            actual.get(field_name, "") != change.after.get(field_name, "")
            for field_name in change.before
        )
        if changed_outside:
            result.skipped += 1
            continue

        try:
            update_text_tags(path, **change.before)
        except MetadataError as exc:
            result.errors.append(f"{path.name}: {exc}")
            continue
        result.restored += 1

    return result


def _prune(directory: Path) -> None:
    """Deja solo los `MAX_MANIFESTS` manifiestos mas nuevos."""
    manifests = sorted(directory.glob("*.json"))
    for viejo in manifests[:-MAX_MANIFESTS]:
        viejo.unlink(missing_ok=True)
