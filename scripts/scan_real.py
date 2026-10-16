"""Escanea la biblioteca real del usuario con el codigo actual.

    python scripts/scan_real.py "D:\\Music\\Música\\idle"
"""

from __future__ import annotations

import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console

from sakura.config import covers_dir
from sakura.core.library import (
    extract_cover,
    find_lyrics,
    folder_covers,
    load_track,
    scan_paths,
)


def main() -> int:
    utf8_console()
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    if not root.is_dir():
        print(f"no existe: {root}")
        return 1

    start = time.perf_counter()
    paths = scan_paths(root)
    covers = folder_covers(root)
    mapa = time.perf_counter() - start

    print(f"carpeta   : {root}")
    print(f"pistas    : {len(paths)}  ({mapa * 1000:.0f} ms para el indice)")
    print(f"portadas de carpeta: {len(covers)}")
    for folder_path, image in covers.items():
        tracks_in_folder = sum(1 for r in paths if r.parent == folder_path)
        print(f"   {image.name} -> {tracks_in_folder} pistas")

    start = time.perf_counter()
    track_items = []
    with_embebida = with_folder = with_letter = 0
    for file_path in paths:
        track_item = load_track(file_path)
        if track_item is None:
            continue

        embebida = extract_cover(file_path, covers_dir())
        if embebida is not None:
            track_item.cover_path = embebida
            with_embebida += 1
        else:
            track_item.cover_path = covers.get(file_path.parent)
            if track_item.cover_path is not None:
                with_folder += 1

        track_item.lyrics_path = find_lyrics(file_path)
        if track_item.lyrics_path is not None:
            with_letter += 1

        track_items.append(track_item)

    scan = time.perf_counter() - start

    print(f"\nlectura    : {len(track_items)} pistas en {scan:.2f}s "
          f"({scan / max(1, len(track_items)) * 1000:.0f} ms cada una)")

    print("\nportadas:")
    print(f"  embebidas en el archivo : {with_embebida:>4}")
    print(f"  heredadas de la carpeta : {with_folder:>4}")
    print(f"  sin portada            : {len(track_items) - with_embebida - with_folder:>4}")
    if track_items:
        print(f"  -> con portada visible: "
              f"{100 * (with_embebida + with_folder) // max(1, len(track_items))}%")

    print(f"\nletras: {with_letter} pistas con .lrc")
    for track_item in track_items:
        if track_item.lyrics_path is not None:
            print(f"   {track_item.title[:40]:<42} <- {track_item.lyrics_path.name}")

    empty = Counter()
    for field_name in ("artist", "album", "year", "genre", "track_number"):
        empty[field_name] = sum(1 for p in track_items if not getattr(p, field_name))

    print("\nmetadatos faltantes:")
    for field_name, missing in empty.items():
        if missing:
            print(f"  {field_name:<14} {missing:>4} de {len(track_items)}")
    if not any(empty.values()):
        print("  ninguno")

    artists = Counter(p.artist for p in track_items)
    print(f"\n  {len(artists)} artistas distintos, {len(track_items)} pistas")

    # Lo que una busqueda en el catalogo arreglaria de un saque.
    if empty["genre"] or empty["track_number"]:
        print(f"\naplicar el catalogo a lo que falta:"
              f" {empty['genre']} generos + {empty['track_number']} numeros de pista")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())