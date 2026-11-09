"""Compara mp3 / m4a / opus sobre el mismo origen, con y sin recodificar.

Descarga solo los primeros 20s de un video para que la prueba sea rapida.
Uso el server de la app: mismo ffmpeg, mismo isolation que la app real.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sakura.core.tools import ffmpeg_location, spawn_kwargs

URL = "https://youtu.be/aqz-KE-bpKQ"
OUT = Path("C:/tmp/sakura-codec")
SECTION = "*0-20"


def run(label: str, extra: list[str]) -> None:
    staging = OUT / label
    command = [
        sys.executable,
        "-m",
        "yt_dlp",
        "--ignore-config",
        "--no-warnings",
        "--no-playlist",
        "--ffmpeg-location",
        ffmpeg_location(),
        "--download-sections",
        SECTION,
        "--paths",
        str(staging),
        "--output",
        "out.%(ext)s",
        *extra,
        "--",
        URL,
    ]
    result = subprocess.run(command, capture_output=True, text=True, **spawn_kwargs())
    if result.returncode != 0:
        print(f"{label:<28} FALLO: {result.stderr.strip()[-160:]}")
        return

    file = next((p for p in staging.rglob("*") if p.is_file()), None)
    if file is None:
        print(f"{label:<28} sin archivo")
        return

    probe = subprocess.run(
        [
            str(Path(ffmpeg_location()) / "ffprobe.exe"),
            "-v",
            "error",
            "-show_entries",
            "stream=codec_name,bit_rate,sample_rate",
            "-show_entries",
            "format=format_name,bit_rate",
            "-of",
            "default=noprint_wrappers=1",
            str(file),
        ],
        capture_output=True,
        text=True,
        **spawn_kwargs(),
    )
    data = dict(
        line.split("=", 1)
        for line in probe.stdout.splitlines()
        if "=" in line and not line.startswith("[")
    )
    bitrate = int(data.get("bit_rate") or 0) // 1000
    kb = file.stat().st_size / 1024
    print(
        f"{label:<28} {file.suffix:<6} {data.get('codec_name', '?'):<6} "
        f"{bitrate:>4} kbps  {kb:>7.0f} KB  {file.name}"
    )


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)

    print("--- origen sin recodificar ---")
    run("fuente-bestaudio", ["-f", "bestaudio"])

    print("\n--- mp3 ---")
    run("mp3-v0", ["-x", "--audio-format", "mp3", "--audio-quality", "0"])
    run("mp3-320", ["-x", "--audio-format", "mp3", "--audio-quality", "320K"])

    print("\n--- m4a / AAC ---")
    run("m4a-q0", ["-x", "--audio-format", "m4a", "--audio-quality", "0"])
    run("m4a-192K", ["-x", "--audio-format", "m4a", "--audio-quality", "192K"])
    run("m4a-256K", ["-x", "--audio-format", "m4a", "--audio-quality", "256K"])

    print("\n--- opus ---")
    run("opus-q0", ["-x", "--audio-format", "opus", "--audio-quality", "0"])
    run("opus-160K", ["-x", "--audio-format", "opus", "--audio-quality", "160K"])