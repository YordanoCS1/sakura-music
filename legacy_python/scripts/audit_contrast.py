"""Audita el contraste de todos los temas. Un tema ilegible no es profesional.

WCAG 2.1 define el contraste como (L1 + 0.05) / (L2 + 0.05) con luminancia
relativa. Chequea texto sobre cada superficie, el texto de selección y el acento
como botón primario.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))


def luminancia(hex_color: str) -> float:
    """Luminancia relativa WCAG."""

    def canal(value: int) -> float:
        v = value / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hex_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)


def contrast(a: str, b: str) -> float:
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def main() -> int:
    from sakura.ui import theme as th

    # (foreground, background, minimo, que se lee)
    REGLAS = (
        ("text", "bg", 4.5, "texto normal sobre el fondo"),
        ("text", "surface", 4.5, "texto normal sobre una superficie"),
        ("text", "surface_alt", 4.5, "texto normal sobre superficie_alt"),
        ("text_dim", "surface", 4.5, "texto atenuado sobre superficie"),
        ("text_muted", "bg", 3.0, "texto apagado (metadatos, placeholder)"),
        ("text_muted", "surface_alt", 3.0, "texto apagado sobre tarjeta"),
        ("selection_text", "selection", 4.5, "texto de la fila seleccionada"),
        ("accent_text", "accent", 3.0, "boton primario"),
        ("danger", "surface_alt", 3.0, "texto de error"),
        ("success", "surface_alt", 3.0, "texto de exito"),
        ("warning", "surface_alt", 3.0, "texto de aviso"),
        ("accent", "bg", 3.0, "acento como texto (resaltado)"),
    )

    problemas: list[str] = []
    for theme_name in th.THEME_LIST:
        print(f"\n=== {theme_name.name} ({theme_name.id}) ===")
        for foreground, background, minimum, descripcion in REGLAS:
            value = contrast(
                getattr(theme_name, foreground), getattr(theme_name, background)
            )
            ok = value >= minimum
            mark = "ok " if ok else "FALLA"
            print(f"  {mark} {value:5.2f} (min {minimum})  {descripcion}")
            if not ok:
                problemas.append(
                    f"{theme_name.id}: {descripcion} = {value:.2f}, necesita {minimum} "
                    f"({foreground} sobre {background})"
                )

    print("\n" + "=" * 60)
    if problemas:
        print(f"{len(problemas)} problema(s) de contraste:\n")
        for p in problemas:
            print(f"  - {p}")
        return 1

    print("Todos los temas pasan el contraste.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())