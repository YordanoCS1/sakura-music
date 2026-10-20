"""Color dominante de una portada, para el tema ambiente.

La carátula manda: se agrupa el matiz en doce baldes y se queda con el que mas
pesa, ponderando por saturación y brillo. Asi una foto con cielo azul y sujeto
naranja no termina en un gris promedio. Los grises y los casi negros se ignoran:
un acento gris no se distingue de un tema apagado.
"""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QColor, QImage

# Lado de la miniatura. No hace falta mas: el color dominante no cambia al
# mirar la portada de cerca, y 24x24 son 576 pixeles a leer por cambio.
SAMPLE_SIZE = 24

# Un matiz sin saturación es gris; uno muy oscuro no se ve sobre el fondo.
MIN_SATURATION = 40
MIN_VALUE = 30
MIN_ALPHA = 128

# El acento tiene que verse sobre la interfaz, no solo existir. Se sube el piso
# de saturación/brillo sin cambiar el matiz de la portada.
ACCENT_SATURATION = 120
ACCENT_MIN_VALUE = 130
ACCENT_MAX_VALUE = 235


def dominant_color(source: Path | bytes | None) -> QColor | None:
    """Color de acento sacado de una portada. None si no hay color util."""
    image = _load(source)
    if image is None or image.isNull():
        return None

    image = image.scaled(
        SAMPLE_SIZE,
        SAMPLE_SIZE,
        Qt.AspectRatioMode.IgnoreAspectRatio,
        Qt.TransformationMode.SmoothTransformation,
    )

    # Por balde: peso total y suma de rojo, verde y azul ya ponderada.
    weights = [0.0] * 12
    reds = [0.0] * 12
    greens = [0.0] * 12
    blues = [0.0] * 12

    for y in range(image.height()):
        for x in range(image.width()):
            color = image.pixelColor(x, y)
            if color.alpha() < MIN_ALPHA:
                continue

            hue, saturation, value, _alpha = color.getHsv()
            if hue < 0 or saturation < MIN_SATURATION or value < MIN_VALUE:
                continue

            weight = (saturation / 255.0) * (value / 255.0)
            bucket = min(11, hue * 12 // 360)
            weights[bucket] += weight
            reds[bucket] += color.red() * weight
            greens[bucket] += color.green() * weight
            blues[bucket] += color.blue() * weight

    best = max(range(12), key=weights.__getitem__)
    if weights[best] <= 0:
        return None

    average = QColor(
        round(reds[best] / weights[best]),
        round(greens[best] / weights[best]),
        round(blues[best] / weights[best]),
    )
    hue, saturation, value, _alpha = average.getHsv()
    if hue < 0:
        return None

    return QColor.fromHsv(
        hue,
        min(255, max(ACCENT_SATURATION, saturation)),
        min(ACCENT_MAX_VALUE, max(ACCENT_MIN_VALUE, value)),
    )


def _load(source: Path | bytes | None) -> QImage | None:
    if source is None:
        return None

    image = QImage()
    if isinstance(source, bytes):
        return image if image.loadFromData(source) else None

    if not source.exists():
        return None
    return QImage(str(source))
