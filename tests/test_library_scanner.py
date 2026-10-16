"""Escaneo de la biblioteca: el paralelismo no puede alterar el resultado."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from sakura.core.library import scan_paths
from sakura.core.tools import ffmpeg_location
from sakura.ui import services
from sakura.ui.services.library import _ScanWorker

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")


def _mp3(destino: Path, title_text: str) -> Path:
    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame",
         "-q:a", "9", str(destino)],
        check=True, capture_output=True,
    )
    from sakura.core.metadata import TrackTags, update_text_tags

    update_text_tags(destino, **TrackTags(title=title_text).as_text_mapping())
    return destino


def _scan(root: Path, covers: Path, **kwargs) -> tuple[list, list]:
    worker = _ScanWorker(root, covers, with_covers=False, **kwargs)
    batches: list[list] = []
    totales: list[int] = []
    worker.batch_ready.connect(batches.append)
    worker.scan_finished.connect(lambda total, _resumen: totales.append(total))
    worker.run()
    leidas = [track.path for batch in batches for track in batch]
    return leidas, totales


@requires_ffmpeg
def test_el_paralelismo_conserva_el_orden(qapp, tmp_path) -> None:
    root = tmp_path / "lib"
    for n in range(8):
        _mp3(root / f"album{n % 2}" / f"{n:02d}.mp3", f"Pista {n}")

    leidas, totales = _scan(root, tmp_path / "covers", workers=4)

    assert leidas == scan_paths(root), "el orden tiene que ser el del disco"
    assert totales == [8]


@requires_ffmpeg
def test_un_solo_hilo_da_el_mismo_resultado(qapp, tmp_path) -> None:
    root = tmp_path / "lib"
    for n in range(5):
        _mp3(root / f"{n}.mp3", f"Pista {n}")

    leidas, totales = _scan(root, tmp_path / "covers", workers=1)

    assert leidas == scan_paths(root)
    assert totales == [5]


@requires_ffmpeg
def test_las_pistas_salen_por_tandas(qapp, tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(services.library, "BATCH_SIZE", 2)
    root = tmp_path / "lib"
    for n in range(5):
        _mp3(root / f"{n}.mp3", f"Pista {n}")

    worker = _ScanWorker(root, tmp_path / "covers", with_covers=False, workers=2)
    tamanos: list[int] = []
    worker.batch_ready.connect(lambda batch: tamanos.append(len(batch)))
    worker.run()

    assert tamanos == [2, 2, 1], "la ultima tanda puede quedar corta"


def test_una_carpeta_inexistente_no_revienta(qapp, tmp_path) -> None:
    worker = _ScanWorker(tmp_path / "no-existe", tmp_path / "covers")
    totales: list[int] = []
    worker.scan_finished.connect(lambda total, _resumen: totales.append(total))

    worker.run()

    assert totales == [0]
