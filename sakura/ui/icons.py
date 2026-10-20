"""Iconos vectoriales.

Markup de Lucide (licencia ISC, viewBox 24x24) renderizado con QtSvg. El SVG
se arma en memoria a partir de `_PATHS`, asi que no hay archivos sueltos que
acompañar al ejecutable.
"""

from __future__ import annotations

from PySide6.QtCore import QRectF, Qt
from PySide6.QtGui import QColor, QIcon, QPainter, QPixmap
from PySide6.QtSvg import QSvgRenderer

from . import sakura

# Nombres que no son SVG de Lucide sino la flor de la marca. Se resuelven con
# `QPainter` (ver `sakura.py`): una sakura de 5 petalos queda mejor como
# Bezier que comprimida en un viewBox de 24x24.
_SAKURA = frozenset({"sakura"})

# Cada entrada es una lista de subpaths en coordenadas 0..24.
_PATHS: dict[str, tuple[str, ...]] = {
    "home": ("M3 9.5 12 2l9 7.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22v-9h6v9"),
    "search": ("M20.5 11a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0z", "M16.5 16.5 21 21"),
    "library": ("M4 4v16", "M8.5 6v14", "M13 6v14", "M17.5 4v16"),
    "queue": (
        "M21 15V6",
        "M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
        "M12 12H3",
        "M16 6 3 12",
        "M16 12H3",
        "M16 18H3",
    ),
    "settings": (
        "M21 4h-7",
        "M10 4H3",
        "M21 12h-9",
        "M8 12H3",
        "M21 20h-5",
        "M12 20H3",
        "M14 2v4",
        "M8 10v4",
        "M16 18v4",
    ),
    "folder": (
        "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z",
    ),
    "folder-open": (
        "m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6"
        "a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.93a2 2 0 0 1 1.66.9"
        "l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2",
    ),
    "play": ("M6 3.5 20 12 6 20.5z",),
    "pause": ("M6.5 4h3.5v16H6.5z", "M14 4h3.5v16H14z"),
    "prev": ("M18.5 19 9 12l9.5-7z", "M5 19V5"),
    "next": ("M5.5 5 15 12l-9.5 7z", "M19 5v14"),
    "volume": (
        "M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z",
        "M16 9.5a4.5 4.5 0 0 1 0 5",
        "M19.4 6.6a9 9 0 0 1 0 10.8",
    ),
    "mute": (
        "M11 4.7a.7.7 0 0 0-1.2-.5L6.4 7.6A1.4 1.4 0 0 1 5.4 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.4a1.4 1.4 0 0 1 1 .4l3.4 3.4a.7.7 0 0 0 1.2-.5z",
        "m22 9-6 6",
        "m16 9 6 6",
    ),
    "repeat": (
        "m17 2 4 4-4 4",
        "M3 11v-1a4 4 0 0 1 4-4h14",
        "m7 22-4-4 4-4",
        "M21 13v1a4 4 0 0 1-4 4H3",
    ),
    "refresh-cw": (
        "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8",
        "M21 3v5h-5",
        "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16",
        "M8 16H3v5",
    ),
    "shuffle": (
        "M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22",
        "m18 2 4 4-4 4",
        "M2 6h1.9c1.5 0 2.9.9 3.6 2.2",
        "M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8",
        "m18 14 4 4-4 4",
    ),
    "heart": (
        "M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2"
        "-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z",
    ),
    "download": ("M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"),
    "cloud-download": (
        "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242",
        "M12 12v9",
        "m8 17 4 4 4-4",
    ),
    "music": ("M9 18V5l12-2v13", "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"),
    "close": ("M18 6 6 18", "m6 6 12 12"),
    "minus": ("M5 12h14",),
    "maximize": ("M6 6h12v12H6z",),
    "restore": (
        "M9 9V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-2",
        "M6 10a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z",
    ),
    "undo": ("M9 14 4 9l5-5", "M4 9h10.5a5.5 5.5 0 0 1 0 11H11"),
    "check": ("M20 6 9 17l-5-5",),
    "circle-check": ("M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z", "m9 12 2 2 4-4"),
    "arrow-left": ("m12 19-7-7 7-7", "M19 12H5"),
    "arrow-up": ("m5 12 7-7 7 7", "M12 19V5"),
    "chevron-down": ("m6 9 6 6 6-6",),
    "trash": ("M4 7h16", "M10 11v6", "M14 11v6", "M6 7l1 13h10l1-13", "M9 7V4h6v3"),
    "copy": (
        "M8 8h12v12H8z",
        "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2",
    ),
    "edit": ("M12 20h9", "M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"),
    "plus": ("M12 5v14", "M5 12h14"),
    "video": ("m22 7-6 5 6 5V7z", "M2 5h14v14H2z"),
    "more-vertical": (
        "M12 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
        "M12 6a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
        "M12 20a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    ),
    "grid": ("M3 3h7v7H3z", "M14 3h7v7h-7z", "M14 14h7v7h-7z", "M3 14h7v7H3z"),
    "list": (
        "M8 6h13",
        "M8 12h13",
        "M8 18h13",
        "M3 6h.01",
        "M3 12h.01",
        "M3 18h.01",
    ),
    "palette": (
        "M13.5 2a8.5 8.5 0 0 0-8.5 8.5c0 1.25.27 2.44.75 3.5.34.75.08 1.63-.58 2.12A3.5 3.5 0 0 0 9 22h3a9 9 0 0 0 9-9c0-6.08-4.92-11-11-11z",
        "M13.5 6.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z",
        "M17.5 10.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z",
        "M8.5 7.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z",
        "M6.5 11.5a.5.5 0 1 1-1 0 .5.5 0 0 1 1 0z",
    ),
    "disc": (
        "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
        "M14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0z",
    ),
    "user": (
        "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",
        "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0z",
    ),
    "clock": (
        "M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z",
        "M12 6v6l4 2",
    ),
    "sparkles": (
        "m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3z",
    ),
    "info": ("M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z", "M12 16v-4", "M12 8h.01"),
    "alert-triangle": (
        "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
        "M12 9v4",
        "M12 17h.01",
    ),
}


# Iconos que se dibujan rellenos en vez de contornados.
# Solo los que son solidos de verdad: play, pause, prev y next son triangulos.
# `maximize` NO va aca: es un cuadrado y llenado sale como un bloque negro.
_FILLED = {"play", "pause", "prev", "next"}

_SVG_CACHE: dict[tuple, QSvgRenderer] = {}

# Tope de renderers cacheados. La clave lleva el color, y el color cambia con
# cada tema y con cada estado (normal / deshabilitado), asi que sin tope la
# cache solo crece: cada tema nuevo deja su juego de SVG parseado para siempre.
MAX_CACHE = 256

# Overrides elegidos por el usuario desde Ajustes. Cada entrada reemplaza al
# vector por nombre en toda la app, asi que no hay que tocar cada widget: basta
# con que el icono se pida por su nombre. `tint` decide si el PNG se pinta con el
# color que pide cada widget (el acento del tema, el texto, etc.) en vez de
# respetar su color original.
_OVERRIDES: dict[str, dict] = {}


def has_override(name: str) -> bool:
    return name in _OVERRIDES


def override_specs() -> dict[str, dict]:
    """Copia serializable del estado actual, para guardar en `config.json`."""
    return {
        name: {"path": spec["path"], "tint": spec["tint"]}
        for name, spec in _OVERRIDES.items()
    }


def set_override(name: str, path: str, tint: bool = False) -> bool:
    """Usa el PNG o SVG de `path` para el icono `name`. False si no se pudo leer."""
    pixmap = _load_source(str(path))
    if pixmap is None or pixmap.isNull():
        return False
    _OVERRIDES[name] = {"path": str(path), "tint": bool(tint), "pixmap": pixmap}
    return True


def clear_override(name: str) -> None:
    _OVERRIDES.pop(name, None)


def clear_overrides() -> None:
    _OVERRIDES.clear()


def load_overrides(specs: dict | None) -> None:
    """Carga los overrides guardados. Un PNG faltante o ilegible se ignora."""
    clear_overrides()
    for name, spec in (specs or {}).items():
        if isinstance(spec, dict) and spec.get("path"):
            set_override(name, str(spec["path"]), bool(spec.get("tint", False)))


def _fit(renderer: QSvgRenderer, side: float) -> QRectF:
    """Rectangulo centrado que encaja el viewBox del SVG sin deformarlo."""
    view = renderer.viewBoxF()
    if view.isEmpty():
        return QRectF(0, 0, side, side)
    scale = min(side / view.width(), side / view.height())
    ancho, alto = view.width() * scale, view.height() * scale
    return QRectF((side - ancho) / 2, (side - alto) / 2, ancho, alto)


def _rasterize(svg: bytes, size: int, color: str | None, ratio: int = 2) -> QPixmap | None:
    """Renderiza un SVG a pixmap y, si hay `color`, lo tiñe respetando su alfa."""
    renderer = QSvgRenderer(svg)
    if not renderer.isValid():
        return None

    lado = size * ratio
    px = QPixmap(lado, lado)
    px.setDevicePixelRatio(ratio)
    px.fill(Qt.GlobalColor.transparent)
    painter = QPainter(px)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
    renderer.render(painter, _fit(renderer, lado))
    if color:
        painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)
        painter.fillRect(px.rect(), QColor(color))
    painter.end()
    return px


def _load_source(path: str) -> QPixmap | None:
    """Carga el archivo de override: rasteriza SVG, o lee el PNG tal cual.

    El SVG se dibuja a 256 px para que escalar hacia abajo a 48 o 16 quede
    nitido; leerlo como imagen daria solo su tamano intrinseco (24 px).
    """
    if path.lower().endswith(".svg"):
        datos = None
        try:
            with open(path, "rb") as archivo:
                datos = archivo.read()
        except OSError:
            return None
        return _rasterize(datos, 256, None, ratio=1)

    pixmap = QPixmap(path)
    return None if pixmap.isNull() else pixmap


def _render_override(name: str, color: str, size: int) -> QPixmap:
    """Dibuja el PNG elegido centrado y, si corresponde, teñido con `color`."""
    spec = _OVERRIDES[name]
    ratio = 2
    side = size * ratio
    scaled = spec["pixmap"].scaled(
        side,
        side,
        Qt.AspectRatioMode.KeepAspectRatio,
        Qt.TransformationMode.SmoothTransformation,
    )
    if spec["tint"]:
        # `SourceIn` reemplaza el color dejando intacta la silueta del PNG.
        tinted = QPixmap(scaled.size())
        tinted.fill(Qt.GlobalColor.transparent)
        painter = QPainter(tinted)
        painter.drawPixmap(0, 0, scaled)
        painter.setCompositionMode(QPainter.CompositionMode.CompositionMode_SourceIn)
        painter.fillRect(tinted.rect(), QColor(color))
        painter.end()
        scaled = tinted

    px = QPixmap(side, side)
    px.setDevicePixelRatio(ratio)
    px.fill(Qt.GlobalColor.transparent)
    painter = QPainter(px)
    painter.drawPixmap((side - scaled.width()) // 2, (side - scaled.height()) // 2, scaled)
    painter.end()
    return px


def _renderer(name: str, color: str, stroke: float) -> QSvgRenderer:
    """SVG cacheado por (icono, color, grosor)."""
    key = (name, color, stroke)
    if key not in _SVG_CACHE:
        if len(_SVG_CACHE) >= MAX_CACHE:
            _SVG_CACHE.clear()
        filled = name in _FILLED
        if filled:
            paint = f'fill="{color}" stroke="none"'
        else:
            paint = (
                f'fill="none" stroke="{color}" stroke-width="{stroke}"'
                ' stroke-linecap="round" stroke-linejoin="round"'
            )
        body = "".join(f'<path d="{d}"/>' for d in _PATHS[name])
        svg = (
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" '
            f"{paint}>{body}</svg>"
        )
        renderer = QSvgRenderer()
        # `load` con bytes: el constructor con str no es valido en PySide6.
        renderer.load(svg.encode("utf-8"))
        _SVG_CACHE[key] = renderer
    return _SVG_CACHE[key]


def render(name: str, color: str, size: int, stroke: float = 2.0) -> QPixmap:
    """Dibuja el icono `name` en un pixmap logico de `size`x`size`."""
    if name in _OVERRIDES:
        return _render_override(name, color, size)
    if name in _SAKURA:
        return sakura.render(color, size)
    if name not in _PATHS:
        raise KeyError(f"icono desconocido: {name!r}")

    ratio = 2  # retina
    px = QPixmap(size * ratio, size * ratio)
    px.setDevicePixelRatio(ratio)
    px.fill(Qt.GlobalColor.transparent)

    renderer = _renderer(name, color, stroke)
    painter = QPainter(px)
    painter.setRenderHint(QPainter.RenderHint.Antialiasing, True)
    renderer.render(painter, QRectF(0, 0, size, size))
    painter.end()
    return px


_render = render


def icon(
    name: str,
    color: str,
    size: int = 20,
    stroke: float = 2.0,
    dimmed: str | None = None,
) -> QIcon:
    """QIcon con estados Normal y Disabled, para que QSS pueda atenuarla."""
    if name in _OVERRIDES:
        result = QIcon()
        result.addPixmap(
            _render_override(name, color, size), QIcon.Mode.Normal, QIcon.State.Off
        )
        disabled = QColor(dimmed) if dimmed else QColor(color)
        if not dimmed:
            disabled.setAlpha(110)
        result.addPixmap(
            _render_override(name, disabled.name(QColor.NameFormat.HexArgb), size),
            QIcon.Mode.Disabled,
            QIcon.State.Off,
        )
        return result
    if name in _SAKURA:
        return sakura.icon(color, size, dimmed=dimmed)
    if name not in _PATHS:
        raise KeyError(f"icono desconocido: {name!r}")

    result = QIcon()
    result.addPixmap(_render(name, color, size, stroke), QIcon.Mode.Normal, QIcon.State.Off)

    disabled = QColor(dimmed) if dimmed else QColor(color)
    if not dimmed:
        disabled.setAlpha(110)
    result.addPixmap(
        _render(name, disabled.name(QColor.NameFormat.HexArgb), size, stroke),
        QIcon.Mode.Disabled,
        QIcon.State.Off,
    )
    return result