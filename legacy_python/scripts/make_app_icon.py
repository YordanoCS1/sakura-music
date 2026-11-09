"""Genera el .ico de Sakura Music para el acceso directo de Windows.

El icono se arma con Qt desde la misma flor que usa la app, sin assets
externos. El .ico incluye varios tamanios para que el explorador y la barra de
tareas no tengan que estirar un solo 256 px.
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

from PySide6.QtCore import QBuffer, QIODevice
from PySide6.QtGui import QPixmap
from PySide6.QtWidgets import QApplication

ROOT = Path(__file__).resolve().parents[1]
SIZES = (16, 24, 32, 48, 64, 128, 256)
DESTINO = ROOT / "resources" / "SakuraMusic.ico"


def _png_bytes(pixmap: QPixmap) -> bytes:
    buffer = QBuffer()
    buffer.open(QIODevice.OpenModeFlag.WriteOnly)
    if not pixmap.save(buffer, "PNG"):
        raise RuntimeError("no se pudo codificar el PNG del icono")
    return bytes(buffer.data())


def build_ico(images: list[tuple[int, bytes]]) -> bytes:
    """Arma un .ico con varias imagenes PNG (formato soportado por Windows)."""
    count = len(images)
    header = struct.pack("<HHH", 0, 1, count)
    offset = 6 + 16 * count
    entries: list[bytes] = []
    body = bytearray()
    for size, png in images:
        width = size if size < 256 else 0
        entries.append(
            struct.pack(
                "<BBBBHHII",
                width,
                width,
                0,
                0,
                1,
                32,
                len(png),
                offset,
            )
        )
        body.extend(png)
        offset += len(png)
    return header + b"".join(entries) + bytes(body)


def main() -> int:
    sys.path.insert(0, str(ROOT))
    QApplication.instance() or QApplication([])
    from sakura.ui import sakura
    from sakura.ui import theme as th

    theme = th.get_theme("modern")
    imagenes: list[tuple[int, bytes]] = []
    for size in SIZES:
        pixmap = sakura.render_logo(theme.accent, size)
        imagenes.append((size, _png_bytes(pixmap)))

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_bytes(build_ico(imagenes))
    print(f"icono: {DESTINO} ({DESTINO.stat().st_size} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
