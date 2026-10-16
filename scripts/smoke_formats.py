"""Descarga real en los tres formatos y verifica el archivo resultante.

Uso:
    python scripts/smoke_formats.py            # opus (default)
    python scripts/smoke_formats.py m4a mp3
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PySide6.QtCore import QCoreApplication, QTimer

from sakura.config import load_settings, save_settings
from sakura.core.formats import FORMATS, get_format
from sakura.ui.services import DownloadManager

VIDEO = "https://youtu.be/aqz-KE-bpKQ"


class Fake:
    id = "fmt"
    title = "prueba formatos"
    url = VIDEO
    uploader = "Blender"
    duration = 10
    thumbnail = ""
    view_count = 0
    channel_verified = False
    duration_text = "0:10"


def probe(path: Path) -> str:
    from sakura.core.tools import ffmpeg_location

    result = subprocess.run(
        [
            str(Path(ffmpeg_location()) / "ffprobe.exe"),
            "-v",
            "error",
            "-show_entries",
            "stream=codec_name,bit_rate",
            "-show_entries",
            "format=bit_rate",
            "-of",
            "default=noprint_wrappers=1",
            str(path),
        ],
        capture_output=True,
        text=True,
    )
    data = dict(
        line.split("=", 1) for line in result.stdout.splitlines() if "=" in line
    )
    return f"{data.get('codec_name', '?')} @ {int(data.get('bit_rate') or 0) // 1000} kbps"


def main() -> int:
    app = QCoreApplication(sys.argv)
    pedidos = sys.argv[1:] or [f.id for f in FORMATS]

    original = load_settings()["audio_format"]
    manager = DownloadManager()
    results: dict[str, bool] = {}
    pending = list(pedidos)

    def finish(job) -> None:
        fmt = job.audio_format
        if job.filepath is not None:
            kb = job.filepath.stat().st_size / 1024
            mark = "sin recodificar" if not fmt.transcodes else f"recodificar a {fmt.quality}"
            print(
                f"{fmt.id:<5} {job.filepath.suffix:<6} {probe(job.filepath):<22} "
                f"{kb:>8.0f} KB   ({mark})"
            )
            results[fmt.id] = job.filepath.suffix == f".{fmt.extension}"
        else:
            print(f"{fmt.id:<5} FALLO: {job.error}")
            results[fmt.id] = False

        if pending:
            next = pending.pop(0)
            save_settings({"audio_format": next})
            manager.enqueue(Fake(), audio_format=get_format(next))
        else:
            save_settings({"audio_format": original})
            app.exit(0 if all(results.values()) else 1)

    manager.job_finished.connect(finish)

    first = pending.pop(0)
    save_settings({"audio_format": first})
    print(f"formato inicial: {first}")
    QTimer.singleShot(0, lambda: manager.enqueue(Fake(), audio_format=get_format(first)))
    QTimer.singleShot(240_000, lambda: (print("TIMEOUT"), app.exit(1)))
    app.exec()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())