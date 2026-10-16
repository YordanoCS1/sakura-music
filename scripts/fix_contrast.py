"""Calcula el color de estado que sí pasa el contraste, preservando el tono.

Un tema con el verde de exito ilegible sobre su propia tarjeta no es
profesional. En vez de elegir un color a ojo, se recorre el tono en HLS y se
queda el primero que cumple el minimo de WCAG.
"""

from __future__ import annotations

import sys
from colorsys import hls_to_rgb, rgb_to_hls
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

MINIMUM = 3.0


def luminancia(hex_color: str) -> float:
    def canal(value: int) -> float:
        v = value / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hex_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)


def contrast(a: str, b: str) -> float:
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def ajustar(color: str, background: str, minimum: float = MINIMUM) -> str:
    """Mueve la luminosidad del color hasta que cumpla contra `fondo`."""
    if contrast(color, background) >= minimum:
        return color

    h, light, s = rgb_to_hls(
        *(int(color.lstrip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4))
    )
    background_dark = luminancia(background) < 0.5

    # Si el fondo es oscuro hay que aclarar el color, y al reves.
    pasos = [i / 200 for i in range(0, 201)]
    candidates = sorted(pasos) if background_dark else sorted(pasos, reverse=True)

    for paso in candidates:
        new_light = min(1.0, max(0.0, light + (paso if background_dark else -(light - paso))))
        r, g, b = hls_to_rgb(h, new_light, s)
        hex_new = f"#{round(r * 255):02X}{round(g * 255):02X}{round(b * 255):02X}"
        if contrast(hex_new, background) >= minimum:
            return hex_new

    return color


def main() -> int:
    from sakura.ui import theme as th

    CASOS = (
        ("sakura_light", "success", "surface_alt"),
        ("sakura_light", "warning", "surface_alt"),
        ("nord", "danger", "surface_alt"),
    )

    for theme_id, field_name, background in CASOS:
        theme_name = th.get_theme(theme_id)
        original = getattr(theme_name, field_name)
        new = ajustar(original, getattr(theme_name, background))
        print(
            f"{theme_id}.{field_name}: {original} -> {new}  "
            f"contraste {contrast(original, getattr(theme_name, background)):.2f} -> "
            f"{contrast(new, getattr(theme_name, background)):.2f}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())