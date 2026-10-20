"""Escaneo incremental: altas, bajas y cambios contra el indice."""

from __future__ import annotations

from pathlib import Path

from sakura.core.library import Track
from sakura.core.library_index import LibraryIndex
from sakura.ui.services import library as servicio
from sakura.ui.services.library import _DeltaWorker, _ScanWorker


def _fake_track(path: Path) -> Track:
    return Track(
        path=path,
        title=path.stem,
        artist="Artista",
        album="Álbum",
        duration=1.0,
        size=path.stat().st_size,
    )


def _escanear(root: Path, index_path: Path) -> list[Track]:
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


def _delta(root: Path, index_path: Path) -> tuple[list[Track], list[Path], list[tuple[int, int]]]:
    worker = _DeltaWorker(
        root,
        root / "covers",
        with_covers=False,
        workers=2,
        index_path=index_path,
    )
    cambiadas: list[Track] = []
    borradas: list[Path] = []
    terminado: list[tuple[int, int]] = []
    worker.tracks_changed.connect(lambda batch: cambiadas.extend(batch))
    worker.tracks_removed.connect(lambda paths: borradas.extend(paths))
    worker.finished.connect(lambda changed, removed: terminado.append((changed, removed)))
    worker.run()
    return cambiadas, borradas, terminado


def test_detecta_altas_cambios_y_bajas(qapp, tmp_path, monkeypatch) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    (root / "uno.mp3").write_bytes(b"x" * 10)
    (root / "dos.mp3").write_bytes(b"x" * 10)

    monkeypatch.setattr(servicio, "load_track", lambda path: _fake_track(path))
    index_path = tmp_path / "index.db"
    assert len(_escanear(root, index_path)) == 2

    (root / "tres.mp3").write_bytes(b"x" * 10)
    (root / "dos.mp3").write_bytes(b"z" * 20)
    (root / "uno.mp3").unlink()

    cambiadas, borradas, terminado = _delta(root, index_path)

    assert {track.path for track in cambiadas} == {root / "dos.mp3", root / "tres.mp3"}
    assert borradas == [root / "uno.mp3"]
    assert terminado == [(2, 1)]

    with LibraryIndex(index_path) as index:
        assert set(index.load(root)) == {root / "dos.mp3", root / "tres.mp3"}


def test_sin_cambios_no_relee_nada(qapp, tmp_path, monkeypatch) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    for name in ("uno.mp3", "dos.mp3"):
        (root / name).write_bytes(b"x" * 10)

    lecturas: list[Path] = []

    def falso(path: Path) -> Track:
        lecturas.append(path)
        return _fake_track(path)

    monkeypatch.setattr(servicio, "load_track", falso)
    index_path = tmp_path / "index.db"
    _escanear(root, index_path)
    assert len(lecturas) == 2

    cambiadas, borradas, terminado = _delta(root, index_path)

    assert cambiadas == []
    assert borradas == []
    assert terminado == [(0, 0)]
    assert len(lecturas) == 2, "no debe releer pistas sin cambios"


def test_una_pista_ilegible_sale_de_la_lista(qapp, tmp_path, monkeypatch) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    for name in ("uno.mp3", "dos.mp3"):
        (root / name).write_bytes(b"x" * 10)

    monkeypatch.setattr(servicio, "load_track", lambda path: _fake_track(path))
    index_path = tmp_path / "index.db"
    _escanear(root, index_path)

    def rota(path: Path) -> Track | None:
        return None if path.name == "dos.mp3" else _fake_track(path)

    monkeypatch.setattr(servicio, "load_track", rota)
    (root / "dos.mp3").write_bytes(b"z" * 20)

    cambiadas, borradas, terminado = _delta(root, index_path)

    assert cambiadas == []
    assert borradas == [root / "dos.mp3"]
    assert terminado == [(0, 1)]
    with LibraryIndex(index_path) as index:
        assert set(index.load(root)) == {root / "uno.mp3"}
