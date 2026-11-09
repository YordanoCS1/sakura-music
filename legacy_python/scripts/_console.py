"""Prepara la consola para texto no-ASCII.

La consola de Windows viene en cp1252 y revienta con `UnicodeEncodeError` al
imprimir un nombre en coreano o japones. Como la biblioteca del usuario tiene
archivos así, cualquier script que imprima sus nombres necesita esto.
"""

from __future__ import annotations

import sys


def utf8_console() -> None:
    """Fuerza UTF-8 con reemplazo en stdout y stderr."""
    import contextlib

    for flujo in (sys.stdout, sys.stderr):
        reconfigure = getattr(flujo, "reconfigure", None)
        if reconfigure is None:
            continue
        with contextlib.suppress(ValueError, OSError):
            reconfigure(encoding="utf-8", errors="replace")


def safe(text_value: str) -> str:
    """Texto siempre imprimible, sin importar la codificacion."""
    return text_value.encode("utf-8", errors="replace").decode("utf-8", errors="replace")