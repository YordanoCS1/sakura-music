"""Animaciones de la interfaz, con un interruptor para entornos sin pantalla.

Los tests corren con `QT_QPA_PLATFORM=offscreen`; ahi un temporizador de animacion
nunca avanza y deja widgets a medio pintar, asi que se salta. `SAKURA_NO_ANIM=1`
desactiva las animaciones tambien en una sesion normal.
"""

from __future__ import annotations

import os


def animations_enabled() -> bool:
    """False en offscreen o con `SAKURA_NO_ANIM`; True en una sesion real."""
    if os.environ.get("SAKURA_NO_ANIM"):
        return False
    return os.environ.get("QT_QPA_PLATFORM", "") != "offscreen"
