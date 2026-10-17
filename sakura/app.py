"""Punto de entrada de la aplicacion."""

from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtGui import QIcon
from PySide6.QtWidgets import QApplication

from .config import load_settings
from .ui import sakura
from .ui import theme as th
from .ui.main_window import MainWindow
from .ui.splash import SakuraSplash

APP_NAME = "Sakura Music"


def _splash_enabled() -> bool:
    """La animacion de arranque es opt-out y no corre sin pantalla real.

    `SAKURA_NO_SPLASH=1` la salta (util al depurar) y con `QT_QPA_PLATFORM`
    offscreen no tiene sentido mostrar una ventana decorativa.
    """
    import os

    if os.environ.get("SAKURA_NO_SPLASH"):
        return False
    return os.environ.get("QT_QPA_PLATFORM", "").lower() != "offscreen"


def _app_icon(color: str, background: str = "#121625") -> QIcon:
    """Icono de la aplicacion: el logo de la flor de cerezo.

    Se registran varios tamanos porque la barra de tareas de Windows elige el
    pixmap mas cercano al tamano que pide, y con uno solo de 64 px se ve borroso
    a 16 o a 48. Los colores salen del tema, no estan escritos a mano.
    """
    icono = QIcon()
    for lado in (16, 24, 32, 48, 64, 128):
        px = sakura.render_logo(color, lado, halo=background, center_border=background)
        icono.addPixmap(px)
        icono.addPixmap(px, QIcon.Mode.Disabled)
    return icono


def _armar_traza() -> None:
    """Vuelca la pila si la app sigue viva a los 6 s (SAKURA_TRACE=1).

    No mata el proceso: sirve para ver que esta haciendo el hilo principal
    mientras la app parece colgada.
    """
    import os

    if not os.environ.get("SAKURA_TRACE"):
        return
    import faulthandler

    salida = Path(__file__).resolve().parent.parent / "close_hang.txt"
    file = salida.open("w", encoding="utf-8")
    faulthandler.enable(file=file)
    faulthandler.dump_traceback_later(6, exit=False, file=file)


def main() -> int:
    _armar_traza()
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )

    app = QApplication(sys.argv)
    app.setApplicationName(APP_NAME)
    app.setStyle("Fusion")

    saved_theme_id = str(load_settings().get("theme", "modern"))
    theme = th.get_theme(saved_theme_id)
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))
    app.setWindowIcon(_app_icon(theme.accent, theme.surface))

    # La flor florece mientras se arma la ventana: cubre el tiempo de arranque
    # con algo de la marca en vez de un cuadro en blanco.
    splash = SakuraSplash(theme) if _splash_enabled() else None
    if splash is not None:
        splash.show()
        app.processEvents()

    window = MainWindow()
    window.show()

    if splash is not None:
        splash.release(window)

    codigo = app.exec()

    # La limpieza va acá y no en `closeEvent`: si queda un QThread vivo mientras
    # Qt se destruye, la salida se cuelga de forma intermitente.
    window.shutdown()
    del window
    app.processEvents()
    return codigo


if __name__ == "__main__":
    raise SystemExit(main())