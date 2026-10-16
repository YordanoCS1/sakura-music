"""Prueba de ida y vuelta: edita tags de verdad y verifica en el archivo.

No toca la interfaz: usa el mismo camino que el editor (core.metadata) sobre
archivos reales de los cuatro formatos.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import mutagen

from sakura.core.library import load_track
from sakura.core.metadata import (
    TrackTags,
    read_cover,
    read_tags,
    remove_cover,
    write_cover,
    write_tags,
)
from sakura.core.tools import ffmpeg_location

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
ROOT = Path("C:/tmp/sakura-roundtrip")

CODECS = {
    "mp3": ["-c:a", "libmp3lame", "-q:a", "9"],
    "m4a": ["-c:a", "aac", "-b:a", "96k"],
    "opus": ["-c:a", "libopus", "-b:a", "64k"],
    "flac": ["-c:a", "flac"],
}

NEW = TrackTags(
    title="One More Time",
    artist="Daft Punk",
    album="Discovery",
    albumartist="Daft Punk",
    year="2001",
    genre="House",
    track_number="1",
)


def _png() -> bytes:
    import struct
    import zlib

    width = 80
    raw = b"".join(b"\x00" + bytes([0x20, 0x80, 0x60]) * width for _ in range(width))

    def chunk(type: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(type + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + type + data + struct.pack(">I", crc)

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, width, 8, 2, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def main() -> int:
    import shutil

    shutil.rmtree(ROOT, ignore_errors=True)
    ROOT.mkdir(parents=True)

    cover = _png()
    fallos = 0

    print(f"{'formato':<8} {'archivo':<26} {'tags':<7} {'portada':<9} {'biblioteca'}")
    print("-" * 74)

    for ext, codec in CODECS.items():
        file_path = ROOT / f"One More Time.{ext}"
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=2", *codec, str(file_path)],
            check=True, capture_output=True,
        )

        write_tags(file_path, NEW)
        write_cover(file_path, cover, "image/png")

        leidos = read_tags(file_path)
        tags_ok = (
            leidos.title == NEW.title
            and leidos.artist == NEW.artist
            and leidos.album == NEW.album
            and leidos.year == NEW.year
            and leidos.genre == NEW.genre
            and leidos.track_number == NEW.track_number
        )

        cover_ok = read_cover(file_path) == cover

        track_item = load_track(file_path)
        library_ok = (
            track_item is not None
            and track_item.title == NEW.title
            and track_item.artist == NEW.artist
            and track_item.album == NEW.album
            and track_item.year == NEW.year
        )

        # Y ahora se quita la portada y se vacian los tags.
        remove_cover(file_path)
        write_tags(file_path, TrackTags())
        clean_ok = read_cover(file_path) is None and read_tags(file_path).is_empty()
        if not clean_ok:
            tags_ok = cover_ok = False

        state = "OK" if (tags_ok and cover_ok and library_ok) else "FALLO"
        if state == "FALLO":
            fallos += 1

        print(
            f"{ext:<8} {file_path.name:<26} "
            f"{'OK' if tags_ok else 'MAL':<7} "
            f"{'OK' if cover_ok else 'MAL':<9} "
            f"{'OK' if library_ok else 'MAL'}  {state}"
        )

        if mutagen.File(file_path) is None:
            print("    el archivo quedo ilegible tras editar")

    print("-" * 74)
    print("TODO OK" if fallos == 0 else f"{fallos} formato(s) con problemas")
    return 1 if fallos else 0


if __name__ == "__main__":
    raise SystemExit(main())