"""Cliente de la API publica de Iconify (gratis y sin clave).

Iconify agrega 150+ sets (Lucide, Material Symbols, Font Awesome, Tabler,
Phosphor...) y expone busqueda y descarga de SVG. Las funciones son bloqueantes
a proposito, igual que `metadata_sources`: quien las llama lo hace desde un
hilo aparte para no congelar la interfaz.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass

SEARCH_URL = "https://api.iconify.design/search"
COLLECTION_URL = "https://api.iconify.design/{prefix}.json"
USER_AGENT = "Sakura Music"
TIMEOUT = 8


class IconApiError(Exception):
    """Falla de red o respuesta inesperada de la API de Iconify."""


@dataclass(frozen=True)
class Collection:
    """Set al que pertenece un icono, con lo necesario para atribuirlo."""

    prefix: str
    name: str
    license: str
    palette: bool

    @property
    def tintable(self) -> bool:
        """Los sets a color (`palette`) no se tiñen: perderian su paleta."""
        return not self.palette


@dataclass(frozen=True)
class IconHit:
    """Un resultado de busqueda, ya resuelto a su coleccion."""

    id: str
    prefix: str
    name: str
    collection: Collection


@dataclass(frozen=True)
class IconSet:
    """Cuerpos SVG de varios iconos de un set, mas su sistema de coordenadas."""

    prefix: str
    width: int
    height: int
    bodies: dict[str, str]


def _get(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            return response.read()
    except (
        urllib.error.URLError,
        urllib.error.HTTPError,
        TimeoutError,
        OSError,
    ) as exc:
        raise IconApiError(f"No se pudo consultar Iconify: {exc}") from exc


def _get_json(url: str) -> dict:
    try:
        return json.loads(_get(url).decode("utf-8"))
    except ValueError as exc:
        raise IconApiError("Iconify devolvió algo que no es JSON") from exc


def search_icons(query: str, limit: int = 36) -> list[IconHit]:
    """Busca iconos por texto y los devuelve con la info de su coleccion."""
    params = urllib.parse.urlencode({"query": query, "limit": max(1, limit)})
    data = _get_json(f"{SEARCH_URL}?{params}")

    colecciones = {
        str(prefix): Collection(
            prefix=str(prefix),
            name=str(info.get("name", prefix)),
            license=str((info.get("license") or {}).get("title", "")),
            palette=bool(info.get("palette")),
        )
        for prefix, info in (data.get("collections") or {}).items()
    }

    hits: list[IconHit] = []
    for icon_id in data.get("icons", []):
        prefix, _, name = str(icon_id).partition(":")
        coleccion = colecciones.get(prefix) or Collection(prefix, prefix, "", False)
        hits.append(IconHit(str(icon_id), prefix, name, coleccion))
    return hits


def icon_bodies(prefix: str, names: list[str]) -> IconSet:
    """Cuerpos SVG de varios iconos del mismo set, en una sola peticion.

    Sirve para previsualizar una grilla de resultados sin pedir un SVG por
    icono: el set entero viene en una respuesta. El `width`/`height` es el
    sistema de coordenadas del set, que no siempre es 24.
    """
    if not names:
        return IconSet(prefix, 24, 24, {})
    params = urllib.parse.urlencode({"icons": ",".join(names)})
    data = _get_json(f"{COLLECTION_URL.format(prefix=prefix)}?{params}")
    bodies = {
        str(name): str(info.get("body", ""))
        for name, info in (data.get("icons") or {}).items()
    }
    return IconSet(
        prefix=prefix,
        width=int(data.get("width") or 24),
        height=int(data.get("height") or 24),
        bodies=bodies,
    )
