"""Escaneo de la biblioteca: el paralelismo no puede alterar el resultado."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest

from sakura.core.library import Track, scan_paths
from sakura.core.library_index import LibraryIndex
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


# --- cache de metadatos ------------------------------------------------------


def _fake_track(path: Path, title_text: str) -> Track:
    return Track(
        path=path,
        title=title_text,
        artist="Artista",
        album="Álbum",
        duration=1.0,
        size=path.stat().st_size,
    )


def _scan_indexed(root: Path, index_path: Path) -> list[Track]:
    worker = _ScanWorker(
        root,
        root / "covers",
        with_covers=False,
        workers=2,
        index_path=index_path,
    )
    pistas: list[Track] = []
    worker.batch_ready.connect(lambda batch: pistas.extend(batch))
    worker.run()
    return pistas


def test_el_segundo_escaneo_reusa_el_indice(qapp, tmp_path, monkeypatch) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    for name in ("uno.mp3", "dos.mp3"):
        (root / name).write_bytes(b"x" * 10)

    lecturas: list[Path] = []
    titulos = {"uno.mp3": "Uno", "dos.mp3": "Dos"}

    def falso(path: Path) -> Track:
        lecturas.append(path)
        return _fake_track(path, titulos.get(path.name, path.stem))

    monkeypatch.setattr(services.library, "load_track", falso)
    index_path = tmp_path / "index.db"

    primera = _scan_indexed(root, index_path)
    assert len(primera) == 2
    assert len(lecturas) == 2

    # Cambiar lo que devolveria mutagen no alcanza: si el archivo no cambio,
    # el segundo escaneo ni siquiera lo abre.
    titulos["uno.mp3"] = "Cambiado"
    segunda = _scan_indexed(root, index_path)

    assert len(lecturas) == 2, "no debe releer pistas sin cambios"
    assert {t.title for t in segunda} == {"Uno", "Dos"}

    # Un byte mas cambia tamano y mtime: ahora si hay que releer una.
    (root / "uno.mp3").write_bytes(b"y" * 11)
    tercera = _scan_indexed(root, index_path)

    assert len(lecturas) == 3
    assert "Cambiado" in {t.title for t in tercera}


def test_el_indice_descarta_las_pistas_borradas(qapp, tmp_path, monkeypatch) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    for name in ("uno.mp3", "dos.mp3"):
        (root / name).write_bytes(b"x" * 10)

    monkeypatch.setattr(
        services.library,
        "load_track",
        lambda path: _fake_track(path, path.stem),
    )
    index_path = tmp_path / "index.db"
    _scan_indexed(root, index_path)

    (root / "dos.mp3").unlink()
    pistas = _scan_indexed(root, index_path)

    assert [t.path for t in pistas] == [root / "uno.mp3"]
    with LibraryIndex(index_path) as index:
        assert set(index.load(root)) == {root / "uno.mp3"}


def test_el_cache_no_relista_carpetas_sin_letras(qapp, tmp_path, monkeypatch) -> None:
    """Regresión: sin .lrc se volvía a listar la carpeta por cada pista.

    En un disco lento eso agregaba segundos al entrar a Biblioteca. El índice
    de letras ya dice que la carpeta no tiene ninguna: hay que pasarle un mapa
    vacío, no `None`, para que no vuelva a recorrerla.
    """
    root = tmp_path / "lib"
    root.mkdir()
    for name in ("uno.mp3", "dos.mp3"):
        (root / name).write_bytes(b"x" * 10)

    monkeypatch.setattr(
        services.library, "load_track", lambda path: _fake_track(path, path.stem)
    )
    index_path = tmp_path / "index.db"
    _scan_indexed(root, index_path)

    indices: list[object] = []
    original = services.library.find_lyrics

    def espia(path: Path, idx=None):
        indices.append(idx)
        return original(path, idx)

    monkeypatch.setattr(services.library, "find_lyrics", espia)
    _scan_indexed(root, index_path)

    assert indices, "el escaneo cacheado tiene que resolver las letras"
    assert all(idx is not None for idx in indices), "no puede caer en relistar la carpeta"
