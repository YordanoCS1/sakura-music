"""Comprueba que la portada sale redondeada y con marco, mirando los pixeles.

Una esquinas redondeada se comprueba por el canal alfa de la esquina: tiene que
ser transparente. Con el fixture de color solido, ademas, el marco tiene que ser
un pixel mas claro que el interior.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console
from PySide6.QtGui import QImage


def main() -> int:
    utf8_console()

    from PySide6.QtWidgets import QApplication

    from sakura.ui import theme as th
    from sakura.ui.covers import render_cover

    QApplication([])
    th.set_active(th.MODERN)

    size = 200
    destino = Path(tempfile.mkdtemp()) / "cover.png"
    from tests.test_metadata import _png

    destino.write_bytes(_png((0x3A, 0x1F, 0x4A), size))

    pixmap = render_cover(destino, size)
    image: QImage = pixmap.toImage()

    def alfa(x: int, y: int) -> int:
        return image.pixelColor(x, y).alpha()

    def rgb(x: int, y: int) -> tuple[int, int, int]:
        c = image.pixelColor(x, y)
        return c.red(), c.green(), c.blue()

    print(f"imagen {image.width()}x{image.height()}")
    print(f"esquina (0,0)        alfa={alfa(0, 0)}   <- 0 = redondeada")
    print(f"esquina (199,0)      alfa={alfa(size - 1, 0)}")
    print(f"esquina (0,199)      alfa={alfa(0, size - 1)}")
    print(f"borde (1,100)        {rgb(1, size // 2)}   <- marco")
    print(f"interior (100,100)   {rgb(size // 2, size // 2)}")
    print(f"borde (100,2)        {rgb(size // 2, 2)}")

    problemas = []
    if alfa(0, 0) != 0:
        problemas.append("la esquina (0,0) no es transparente: no hay redondeo")
    if alfa(size // 2, size // 2) != 255:
        problemas.append("el centro deberia ser opaco")
    if rgb(1, size // 2) == rgb(size // 2, size // 2):
        problemas.append("no se ve diferencia entre el borde y el interior: falta el marco")

    print()
    if problemas:
        for p in problemas:
            print(f"FALLA: {p}")
        return 1

    print("OK: esquinas redondeadas, marco visible y centro opaco")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())