"""Busca en el catalogo real y aplica tags + portada a archivos reales.

Toca la red a proposito: es la unica forma de verificar que la API y el
emparejado funcionan contra el servicio de verdad.

    python scripts/smoke_lookup.py
"""

from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sakura.core.library import load_track
from sakura.core.metadata import read_tags
from sakura.core.metadata_sources import (
    download_cover,
    itunes_album,
    match_by_title,
    search,
)
from sakura.core.tools import ffmpeg_location
from sakura.ui.services.metadata_search import apply_album, apply_candidate

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"

# Nombres de archivo "sucios", como quedan al descargar un álbum.
FILES = [
    "01 - One More Time.mp3",
    "02 - Aerodynamic.mp3",
    "03 - Digital Love.mp3",
]


def create_album(destino: Path) -> list[Path]:
    """Archivos sin tags, con nombres reales de descarga."""
    paths = []
    for name_text in FILES:
        file_path = destino / name_text
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(file_path)],
            check=True, capture_output=True,
        )
        paths.append(file_path)
    return paths


def main() -> int:
    tmp = Path(tempfile.mkdtemp(prefix="sakura-lookup-"))
    paths = create_album(tmp)

    print(f"{len(paths)} archivos sin tags en {tmp}\n")

    print("buscando 'daft punk one more time'...")
    candidates = search("daft punk one more time", limit=10)
    print(f"  {len(candidates)} resultados")
    if not candidates:
        print("  la API no devolvio nada")
        return 1

    best = candidates[0]
    print(f"  mejor: {best.title} · {best.artist} · {best.album} ({best.year})")
    print(f"  pistas: {best.track_number}/{best.track_total} · {best.duration_text}")
    print(f"  portada: {best.cover_url[:70]}...")

    cover = download_cover(best.cover_url)
    if cover:
        print(f"  portada descargada: {len(cover[0]) // 1024} KB ({cover[1]})")
    else:
        print("  NO se pudo descargar la portada")

    print("\naplicando el resultado a una sola pista...")
    problema = apply_candidate(paths[0], best)
    if problema:
        print(f"  error: {problema}")
        return 1

    tags = read_tags(paths[0])
    track_item = load_track(paths[0])
    print(f"  archivo  -> {paths[0].name}")
    print(f"  titulo   -> {tags.title}")
    print(f"  artista  -> {tags.artist}")
    print(f"  album    -> {tags.album}")
    print(f"  anio     -> {tags.year}")
    print(f"  genero   -> {tags.genre}")
    print(f"  pista    -> {tags.track_number}")
    print(f"  biblioteca -> {track_item.title} / {track_item.artist} / {track_item.album}")

    print(f"\nbajando el album completo ({best.album_id})...")
    tracks_album = itunes_album(best.album_id)
    print(f"  {len(tracks_album)} pistas del album")

    pares = match_by_title(tracks_album, [r.stem for r in paths])
    print(f"  emparejadas {len(pares)} de {len(paths)} por titulo:")
    for title_text, candidate in pares.items():
        print(f"    {title_text:<28} -> {candidate.title}")

    print("\naplicando a todo el album...")
    applied, errors = apply_album(paths, tracks_album)
    print(f"  {applied}/{len(paths)} pistas etiquetadas")
    for error in errors:
        print(f"  error: {error}")

    print("\nresultado final en disco:")
    all_ok = True
    for file_path in paths:
        leidos = read_tags(file_path)
        info = load_track(file_path)
        ok = bool(leidos.title and leidos.artist and leidos.album)
        all_ok = all_ok and ok
        tag = "OK " if ok else "MAL"
        print(f"  {tag} {file_path.name}")
        print(f"      {leidos.title} · {leidos.artist} · {leidos.album} ({leidos.year})")
        print(f"      pista {leidos.track_number}")
        print(f"      biblioteca: {info.title} · nº {info.number_text}")

    print()
    if all_ok and not errors:
        print("TODO OK")
        return 0
    print("FALLO: alguna pista quedo sin completar")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())