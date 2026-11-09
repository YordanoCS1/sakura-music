"""Reproduce el cierre de la app y vuelca la pila si se queda colgada.

`faulthandler.dump_traceback_later` vuelca la pila de Python y mata el proceso
pasado el tiempo, asi que se ve exactamente en qué está bloqueado.
"""

from __future__ import annotations

import faulthandler
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console

SALIDA = Path(__file__).resolve().parent.parent / "close_trace.txt"
CIERRE_MS = 2500
TIMEOUT_S = 12


def main() -> int:
    utf8_console()
    os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

    from PySide6.QtCore import QTimer
    from PySide6.QtWidgets import QApplication

    from sakura.ui import theme as th
    from sakura.ui.main_window import MainWindow

    app = QApplication(sys.argv)
    theme = th.MODERN
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))

    window = MainWindow()
    window.show()
    window.show_page("library")  # dispara el escaneo de la biblioteca
    app.processEvents()

    marcas: dict[str, float] = {}

    def close() -> None:
        marcas["inicio"] = time.perf_counter()
        window.close()

    def finish() -> None:
        marcas["exec"] = time.perf_counter()

    QTimer.singleShot(CIERRE_MS, close)
    QTimer.singleShot(CIERRE_MS + 1, finish)

    file = SALIDA.open("w", encoding="utf-8")
    faulthandler.enable(file=file)
    faulthandler.dump_traceback_later(TIMEOUT_S, exit=True, file=file)

    start = time.perf_counter()
    app.exec()

    end = time.perf_counter()
    file.close()

    print(f"exec() duro {(end - start):.2f}s")
    if "inicio" in marcas:
        print(f"close() a los {marcas['inicio'] - start:.2f}s")
    print(f"salida completa {end - start:.2f}s (limite de espera {TIMEOUT_S}s)")

    if SALIDA.exists() and SALIDA.stat().st_size > 0:
        print("\n--- pila al colgarse ---")
        print(SALIDA.read_text(encoding="utf-8")[:2000])
        return 1

    print("sin cuelgue")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())