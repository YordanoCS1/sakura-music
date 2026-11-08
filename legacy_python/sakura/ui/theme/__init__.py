"""Tokens de diseno, paletas y generacion de QSS.

Regla del proyecto: ningun widget escribe un color literal. Todo sale de `Theme`.
Agregar un tema nuevo = agregar un `Theme` mas; no se toca ningun widget.

El paquete separa tres cosas: los tokens (`tokens`), las paletas concretas
(`palettes`) y el generador de stylesheet (`qss`). Reexporta todo para que
`from sakura.ui import theme` siga funcionando igual.
"""

from .ambient import dominant_color
from .palettes import (
    ANIME,
    CATPPUCCIN,
    CHILE,
    CYBERPUNK,
    EDITORIAL,
    EMERALD,
    FAUNA,
    MODERN,
    NORD,
    OLED,
    POKEMON,
    SAKURA_LIGHT,
    SUNSET,
    THEME_LIST,
    THEMES,
    WUXIA,
    active,
    get_theme,
    set_active,
)
from .qss import build_qss
from .tokens import FONT_STACK, SERIF_STACK, Theme, px, tint

__all__ = [
    "ANIME",
    "CATPPUCCIN",
    "CHILE",
    "CYBERPUNK",
    "EDITORIAL",
    "EMERALD",
    "FAUNA",
    "FONT_STACK",
    "MODERN",
    "NORD",
    "OLED",
    "POKEMON",
    "SAKURA_LIGHT",
    "SERIF_STACK",
    "SUNSET",
    "THEMES",
    "THEME_LIST",
    "WUXIA",
    "Theme",
    "active",
    "build_qss",
    "dominant_color",
    "get_theme",
    "px",
    "set_active",
    "tint",
]
