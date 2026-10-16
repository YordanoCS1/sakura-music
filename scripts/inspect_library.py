"""Escanea una biblioteca real y reporta lo que encuentra y lo que se le escapa.

    python scripts/inspect_library.py "D:\\Music\\Música\\idle"
"""

from __future__ import annotations

import sys
import time
from collections import Counter
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console

from sakura.core.library import AUDIO_EXTENSIONS, load_track, scan_paths


def main() -> int:
    utf8_console()
    root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("C:/tmp")
    if not root.is_dir():
        print(f"no existe: {root}")
        return 1

    print(f"biblioteca: {root}\n")

    all = [p for p in root.rglob("*") if p.is_file()]
    by_extension = Counter(p.suffix.lower() for p in all)

    print("contenido de la carpeta:")
    for extension, count in by_extension.most_common():
        mark = "" if extension in AUDIO_EXTENSIONS else "   <- la app lo ignora"
        print(f"  {extension or '(sin ext)':<8} {count:>4}{mark}")

    start = time.perf_counter()
    paths = scan_paths(root)
    end = time.perf_counter()

    track_items = []
    failed = []
    for file_path in paths:
        track_item = load_track(file_path)
        if track_item is None:
            failed.append(file_path)
        else:
            track_items.append(track_item)

    scan = time.perf_counter() - end
    print("\nescananeo:")
    print(f"  {len(paths)} rutas de audio en {end - start:.2f}s")
    print(f"  {len(track_items)} pistas leidas en {scan:.2f}s "
          f"({scan / max(1, len(track_items)) * 1000:.0f} ms por pista)")
    if failed:
        print(f"  {len(failed)} descartadas (mutagen no las reconoce)")
        for file_path in failed[:5]:
            print(f"    {file_path.name}")

    if not track_items:
        return 1

    # Que datos hay realmente y cuales hay que completar.
    empty = Counter()
    for field_name in ("artist", "album", "year", "genre", "track_number"):
        missing = sum(1 for p in track_items if not getattr(p, field_name))
        empty[field_name] = missing

    print(f"\ncalidad de los metadatos ({len(track_items)} pistas):")
    for field_name, missing in empty.items():
        print(f"  {field_name:<14} {len(track_items) - missing:>4} con dato   {missing:>4} vacías")

    artists = Counter(p.artist for p in track_items)
    generos = Counter(p.genre for p in track_items if p.genre)
    print(f"\n  artistas distintos: {len(artists)}")
    print(f"  generos distintos : {len(generos)}")
    if generos:
        print("  generos:", ", ".join(f"{g} ({n})" for g, n in generos.most_common(6)))

    with_cover = sum(1 for p in track_items if p.cover_path)
    print(f"\n  pistas con portada embebida: {with_cover}/{len(track_items)}")

    # Portadas de carpeta: la app las ignora y por eso salen sin caratula.
    images = [
        p for p in all
        if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")
    ]
    for image in images:
        alcanzables = sum(1 for p in track_items if p.path.parent == image.parent)
        print(f"  imagen de carpeta ignorada: {image.name} "
              f"({image.stat().st_size // 1024} KB) alcanzaria a {alcanzables} pistas")

    # Letras .lrc emparejadas por nombre.
    lrc = [p for p in all if p.suffix.lower() == ".lrc"]
    if lrc:
        print(f"\n  archivos .lrc (letras) ignorados: {len(lrc)}")
        for file in lrc[:8]:
            print(f"    {file.name}")

    print("\n  nombres con sufijo duplicado tipo 'Wife (Wife).m4a':")
    duplicates = [p for p in track_items if p.title and f"({p.title})" in p.path.stem]
    print(f"    {len(duplicates)} pistas")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())