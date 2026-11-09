"""Renderiza la Biblioteca contra una biblioteca real generada con ffmpeg.

Crea pistas con tags y portadas embebidas, escanea y captura la tabla.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import mutagen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from preview_bootstrap import boot
from PySide6.QtCore import Qt, QTimer

from sakura.config import save_settings
from sakura.core.tools import ffmpeg_location
from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
LIBRARY = Path("C:/tmp/sakura-biblioteca")

TRACKS = [
    ("Daft Punk", "Discovery", "One More Time", "2001", "1", 320),
    ("Daft Punk", "Discovery", "Aerodynamic", "2001", "2", 212),
    ("Daft Punk", "Discovery", "Digital Love", "2001", "3", 301),
    ("Daft Punk", "Discovery", "Veridis Quo", "2001", "4", 344),
    ("Daft Punk", "Homework", "Around the World", "1997", "1", 424),
    ("Daft Punk", "Human After All", "Human After All", "2005", "1", 275),
    ("Massive Attack", "Mezzanine", "Teardrop", "1998", "1", 330),
    ("Massive Attack", "Mezzanine", "Angel", "1998", "2", 380),
    ("Portishead", "Dummy", "Glory Box", "1994", "3", 306),
    ("Boards of Canada", "Geogaddi", "Music Has the Right to Children", "2006", "1", 301),
    ("Sin Artista", "Álbum Desconocido", "Pista sin tags", "", "", 180),
]


def _generate(destino: Path, seconds_value: int, with_cover: bool) -> None:
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", f"sine=frequency=440:duration={seconds_value}", str(destino)],
        check=True, capture_output=True,
    )

    if not with_cover:
        return

    tag = mutagen.File(destino)
    tag["APIC"] = mutagen.id3.APIC(
        encoding=3, mime="image/png", type=3, desc="Cover", data=_cover()
    )
    tag.save()


def _cover() -> bytes:
    """PNG solido de 300x300, generado a mano para no depender de Pillow."""
    import struct
    import zlib

    width = height = 300
    r, g, b = 0x4A, 0x2A, 0x5E

    raw = b"".join(b"\x00" + bytes([r, g, b]) * width for _ in range(height))

    def chunk(type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + type + data + struct.pack(">I", crc)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def build_library() -> int:
    import shutil

    shutil.rmtree(LIBRARY, ignore_errors=True)
    LIBRARY.mkdir(parents=True, exist_ok=True)

    for artist_name, album, title_text, year, track, seconds_value in TRACKS:
        folder_path = LIBRARY / artist_name / album
        folder_path.mkdir(parents=True, exist_ok=True)

        # Los parentesis importan: `carpeta / a if track else b` parsea como
        # `carpeta / (a if track else b)` y el archivo sin numero terminaba en el
        # directorio de trabajo en vez de en su carpeta.
        name_text = f"{track.zfill(2)} - {title_text}.mp3" if track else f"{title_text}.mp3"
        destino = folder_path / name_text

        _generate(destino, seconds_value, with_cover=bool(track))

        if not track:
            continue

        tag = mutagen.File(destino)
        tag["TIT2"] = mutagen.id3.TIT2(encoding=3, text=[title_text])
        tag["TPE1"] = mutagen.id3.TPE1(encoding=3, text=[artist_name])
        tag["TALB"] = mutagen.id3.TALB(encoding=3, text=[album])
        tag["TCON"] = mutagen.id3.TCON(encoding=3, text=["Electronic"])
        if year:
            tag["TDRC"] = mutagen.id3.TDRC(encoding=3, text=[year])
        tag["TRCK"] = mutagen.id3.TRCK(encoding=3, text=[f"{track}/4"])
        tag.save()

    return len(TRACKS)


def main() -> None:
    total = build_library()
    save_settings({"library_folder": str(LIBRARY)})
    print(f"biblioteca de prueba: {total} pistas en {LIBRARY}")

    app = boot()
    theme = th.MODERN
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))

    window = MainWindow()
    window.resize(1240, 800)
    window.show()

    library = window.page_map["library"]
    # Mostrar la pagina dispara el escaneo; hay que esperar a que termine.
    window.show_page("library")

    intentos = {"n": 0}

    def wait():
        intentos["n"] += 1
        if len(library.model) == 0 and intentos["n"] < 40:
            QTimer.singleShot(150, wait)
            return
        capture()

    def capture() -> None:
        window.grab().save("preview_library.png")
        print(f"  pistas en el modelo: {len(library.model)}")
        print(f"  stats: {library.stats.text()}")
        print(f"  suma: {sum(t.duration for t in library.model.tracks) / 60:.1f} min")

        library.table.selectRow(1)
        app.processEvents()
        window.grab().save("preview_library_detail.png")

        library.filter_box.setText("daft punk")
        app.processEvents()
        window.grab().save("preview_library_filter.png")
        print(f"  filtrado 'daft punk': {library.proxy.rowCount()} filas")

        library.filter_box.clear()
        library.model.sort(5, Qt.SortOrder.DescendingOrder)
        app.processEvents()
        window.grab().save("preview_library_sorted.png")
        print("  ordenado por duracion descendente")

        app.quit()

    QTimer.singleShot(200, wait)
    app.exec()


if __name__ == "__main__":
    main()