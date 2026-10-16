"""Registra una fuente del sistema para que los previews offline tengan texto.

El platform plugin `offscreen` no expone las fuentes instaladas, asi que en los
renders de previsualizacion hay que cargarlas a mano.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from _console import utf8_console
from PySide6.QtGui import QFontDatabase
from PySide6.QtWidgets import QApplication

utf8_console()

CANDIDATES = [
    r"C:\Windows\Fonts\segoeui.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\segoeuisl.ttf",
    r"C:\Windows\Fonts\arial.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    # Conasianas: sin esto los titulos en coreano salen como cajas en el preview.
    r"C:\Windows\Fonts\malgun.ttf",
    r"C:\Windows\Fonts\malgunbd.ttf",
    r"C:\Windows\Fonts\msgothic.ttc",
    r"C:\Windows\Fonts\meiryo.ttc",
    r"C:\Windows\Fonts\msyh.ttc",
]

# Entorno con el plugin de plataforma sin pantalla, para scripts headless.
PATH_ENV = {**os.environ, "QT_QPA_PLATFORM": "offscreen"}


def install_fonts() -> list[str]:
    """Carga las fuentes de `CANDIDATES` y devuelve las familias registradas."""
    QFontDatabase  # noqa: B018 - asegura que QtWidgets se inicializo antes
    loaded: list[str] = []
    for path in CANDIDATES:
        if not Path(path).exists():
            continue
        font_id = QFontDatabase.addApplicationFont(path)
        if font_id != -1:
            loaded.extend(QFontDatabase.applicationFontFamilies(font_id))
    return loaded


def boot() -> QApplication:
    app = QApplication.instance() or QApplication(sys.argv)
    families = install_fonts()
    if not families:
        print("[preview] no se pudo cargar ninguna fuente del sistema")
    else:
        print(f"[preview] fuentes: {', '.join(sorted(set(families)))}")
    return app