"""Renderiza el editor de metadatos con datos reales y portada embebida."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import mutagen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tests"))

from preview_bootstrap import boot
from PySide6.QtCore import QTimer
from test_metadata import _png

from sakura.core.metadata import TrackTags, write_cover, write_tags
from sakura.core.tools import ffmpeg_location
from sakura.ui import theme as th
from sakura.ui.widgets.metadata_editor import MetadataEditor

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
TRACK = Path("C:/tmp/sakura-editor/pista.mp3")


def _preparar() -> None:
    TRACK.parent.mkdir(parents=True, exist_ok=True)
    if not TRACK.exists():
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(TRACK)],
            check=True, capture_output=True,
        )

    audio = mutagen.File(TRACK)
    for key_name in list(audio.tags):
        del audio.tags[key_name]
    audio.save()

    write_tags(TRACK, TrackTags(title="One More Time", artist="Daft Punk"))
    write_cover(TRACK, _png((0x4A, 0x2A, 0x5E), 320), "image/png")


def _tracks_album() -> list:
    """Tracks hermanas, para que aparezca el boton de aplicar a todo el album."""
    import subprocess as sp

    from sakura.core.library import load_track

    track_items = []
    for number, title_text in ((2, "Aerodynamic"), (3, "Digital Love")):
        file_path = TRACK.parent / f"{number:02d} - {title_text}.mp3"
        if not file_path.exists():
            sp.run(
                [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
                 "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(file_path)],
                check=True, capture_output=True,
            )
        track_item = load_track(file_path)
        if track_item is not None:
            track_items.append(track_item)

    return track_items


def main() -> None:
    _preparar()

    app = boot()
    theme = th.MODERN
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))

    dialog = MetadataEditor(TRACK, album_tracks=_tracks_album())
    dialog.show()

    def capturar() -> None:
        dialog.grab().save("preview_editor.png")
        print("  preview_editor.png (con portada)")

        # Como se ve con resultados de la busqueda.
        from sakura.core.metadata_sources import Candidate

        candidates = [
            Candidate(source="itunes", title="One More Time", artist="Daft Punk",
                      album="Discovery", year="2000", genre="Dance",
                      track_number="1", track_total=14, duration_ms=320357,
                      cover_url="x", album_id="697194953"),
            Candidate(source="itunes", title="One More Time (Short Radio Edit)",
                      artist="Daft Punk", album="Discovery", year="2000",
                      genre="Dance", track_number="1", duration_ms=214000),
            Candidate(source="itunes", title="One More Time (Live at Coachella)",
                      artist="Daft Punk", album="Daft Punk Live", year="2008",
                      genre="Electronic", duration_ms=402000),
        ]
        dialog._on_results(candidates)
        dialog._use_candidate()
        app.processEvents()
        dialog.grab().save("preview_editor_busqueda.png")
        print("  preview_editor_busqueda.png (con resultados)")

        dialog._remove_cover()
        app.processEvents()
        dialog.grab().save("preview_editor_sin_portada.png")
        print("  preview_editor_sin_portada.png")

        app.quit()

    QTimer.singleShot(300, capturar)
    app.exec()

    # Comprobacion de que la escritura funciona de punta a punta.
    from sakura.core.metadata import read_cover, read_tags

    print("  tags leidos:", read_tags(TRACK).title, "/", read_tags(TRACK).artist)
    print("  portada leida:", "si" if read_cover(TRACK) else "no")


if __name__ == "__main__":
    main()