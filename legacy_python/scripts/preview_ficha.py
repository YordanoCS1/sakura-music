"""Renderiza la ficha de una pista, con portada y sin ella."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import mutagen

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from preview_bootstrap import boot
from PySide6.QtCore import QTimer

from sakura.config import covers_dir
from sakura.core.library import extract_cover, load_track
from sakura.core.metadata import TrackTags, write_cover
from sakura.core.tools import ffmpeg_location
from sakura.ui import theme as th
from sakura.ui.widgets.track_info import TrackInfoDialog

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
ROOT = Path("C:/tmp/sakura-ficha")


def _create(name_text: str, with_cover: bool) -> Path:
    ROOT.mkdir(parents=True, exist_ok=True)
    file_path = ROOT / name_text
    if not file_path.exists():
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(file_path)],
            check=True, capture_output=True,
        )

    audio = mutagen.File(file_path)
    for key_name in list(audio.tags):
        del audio.tags[key_name]
    audio.save()

    from sakura.core.metadata import write_tags

    write_tags(
        file_path,
        TrackTags(
            title="너는 나의 superstitious였다",
            artist="MIYEON",
            album="너는 나의_superstition",
            albumartist="MIYEON",
            year="2021",
            genre="R&B",
            track_number="3",
        ),
    )

    if with_cover:
        from test_metadata import _png

        write_cover(file_path, _png((0x3A, 0x1F, 0x4A), 400), "image/png")
    return file_path


def main() -> None:
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "tests"))

    with_cover = _create("MIYEON - track.mp3", True)
    without_cover = _create("vacia - track.mp3", False)

    app = boot()
    theme = th.MODERN
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))

    track_items = []
    for file_path in (with_cover, without_cover):
        track_item = load_track(file_path)
        if track_item is not None:
            track_item.cover_path = extract_cover(file_path, covers_dir())
            track_items.append(track_item)

    dialogs = [TrackInfoDialog(p, None) for p in track_items]
    for d in dialogs:
        d.show()

    def capturar() -> None:
        dialogs[0].grab().save("preview_ficha.png")
        print("  preview_ficha.png (con portada)")
        dialogs[1].grab().save("preview_ficha_sin_portada.png")
        print("  preview_ficha_sin_portada.png")
        print("  estado con portada:", dialogs[0].state.text())
        print("  estado sin portada:", dialogs[1].state.text())
        for d in dialogs:
            d.close()
        app.quit()

    QTimer.singleShot(300, capturar)
    app.exec()


if __name__ == "__main__":
    main()