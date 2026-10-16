"""Tokens de diseno, paletas y generacion de QSS.

Regla del proyecto: ningun widget escribe un color literal. Todo sale de `Theme`.
Agregar un tema nuevo = agregar un `Theme` mas; no se toca ningun widget.

El paquete separa tres cosas: los tokens (`tokens`), las paletas concretas
(`palettes`) y el generador de stylesheet (`qss`). Reexporta todo para que
`from sakura.ui import theme` siga funcionando igual.
"""

from .palettes import (
    CATPPUCCIN,
    CYBERPUNK,
    EMERALD,
    MODERN,
    NORD,
    OLED,
    SAKURA_LIGHT,
    SUNSET,
    THEME_LIST,
    THEMES,
    active,
    get_theme,
    set_active,
)
from .qss import build_qss
from .tokens import FONT_STACK, Theme, px, tint

__all__ = [
    "CATPPUCCIN",
    "CYBERPUNK",
    "EMERALD",
    "FONT_STACK",
    "MODERN",
    "NORD",
    "OLED",
    "SAKURA_LIGHT",
    "SUNSET",
    "THEMES",
    "THEME_LIST",
    "Theme",
    "active",
    "build_qss",
    "get_theme",
    "px",
    "set_active",
    "tint",
]
