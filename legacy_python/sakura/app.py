"""Punto de entrada de la aplicacion."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from PySide6.QtCore import Qt
from PySide6.QtWidgets import QApplication

from .config import load_settings
from .ui import icons, sakura
from .ui import theme as th
from .ui.launcher import LauncherWindow
from .ui.main_window import MainWindow
from .ui.splash import SakuraSplash

APP_NAME = "Sakura Music"


def _splash_enabled() -> bool:
    """La animacion de arranque es opt-out y no corre sin pantalla real.

    `SAKURA_NO_SPLASH=1` la salta (util al depurar) y con `QT_QPA_PLATFORM`
    offscreen no tiene sentido mostrar una ventana decorativa.
    """
    if os.environ.get("SAKURA_NO_SPLASH"):
        return False
    return os.environ.get("QT_QPA_PLATFORM", "").lower() != "offscreen"


def _launcher_enabled() -> bool:
    """El launcher visual se saltea en pruebas y se puede apagar por consola.

    `SAKURA_NO_LAUNCHER=1` es util para depurar la ventana principal directamente
    sin volver a tocar el codigo; con `QT_QPA_PLATFORM=offscreen` no se muestra
    ninguna ventana decorativa.
    """
    if os.environ.get("SAKURA_NO_LAUNCHER"):
        return False
    return os.environ.get("QT_QPA_PLATFORM", "").lower() != "offscreen"


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

    skip_launcher = "--no-launcher" in sys.argv
    argv = [arg for arg in sys.argv if arg != "--no-launcher"] or [sys.argv[0]]
    app = QApplication(argv)
    app.setApplicationName(APP_NAME)
    app.setStyle("Fusion")

    saved_theme_id = str(load_settings().get("theme", "modern"))
    theme = th.get_theme(saved_theme_id)
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))
    app.setWindowIcon(sakura.application_icon(theme))

    # Los PNG elegidos en Ajustes reemplazan a los iconos por nombre en toda la
    # UI. Se cargan antes de armar la ventana, que ya construye los del lateral.
    icons.load_overrides(load_settings().get("icon_overrides", {}))

    launcher: LauncherWindow | None = None
    splash: SakuraSplash | None = None
    window: MainWindow | None = None

    def abrir(pagina: str) -> None:
        nonlocal window
        if window is not None:
            return
        window = MainWindow()
        window.show()
        if pagina != "home":
            window.show_page(pagina)
        if splash is not None:
            splash.release(window)
        if launcher is not None:
            launcher.close()

    if _launcher_enabled() and not skip_launcher:
        launcher = LauncherWindow()
        launcher.open_requested.connect(abrir)
        launcher.show()
    else:
        # La flor florece mientras se arma la ventana: cubre el tiempo de
        # arranque con algo de la marca en vez de un cuadro en blanco.
        splash = SakuraSplash(theme) if _splash_enabled() else None
        if splash is not None:
            splash.show()
            app.processEvents()
        abrir("home")

    codigo = app.exec()

    # La limpieza va aquí y no en `closeEvent`: si queda un QThread vivo mientras
    # Qt se destruye, la salida se cuelga de forma intermitente.
    if window is not None:
        window.shutdown()
        del window
    app.processEvents()
    return codigo


if __name__ == "__main__":
    raise SystemExit(main())