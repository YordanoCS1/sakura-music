"""Vigilancia de la carpeta de la biblioteca."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtTest import QTest

from sakura.ui.services.watcher import LibraryWatcher


def _vigiladas(watcher: LibraryWatcher) -> set[Path]:
    return {Path(path).resolve() for path in watcher._watcher.directories()}


def test_start_vigila_la_raiz_y_las_subcarpetas(qapp, tmp_path) -> None:
    root = tmp_path / "lib"
    (root / "sub").mkdir(parents=True)

    watcher = LibraryWatcher()
    watcher.start(root)
    try:
        assert watcher.is_watching
        assert _vigiladas(watcher) == {root.resolve(), (root / "sub").resolve()}
    finally:
        watcher.stop()


def test_agrega_las_subcarpetas_nuevas(qapp, tmp_path) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    watcher = LibraryWatcher()
    watcher.start(root)
    try:
        nueva = root / "recien-creada"
        nueva.mkdir()

        watcher._on_directory_changed(str(root))

        assert nueva.resolve() in _vigiladas(watcher)
    finally:
        watcher.stop()


def test_avisa_una_sola_vez_por_tanda(qapp, tmp_path) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    watcher = LibraryWatcher()
    avisos: list[int] = []
    watcher.changed.connect(lambda: avisos.append(1))
    watcher._timer.setInterval(20)
    watcher.start(root)
    try:
        watcher._on_directory_changed(str(root))
        watcher._on_directory_changed(str(root / "sub"))
        watcher._on_directory_changed(str(root))

        QTest.qWait(100)

        assert avisos == [1]
    finally:
        watcher.stop()


def test_stop_deja_de_vigilar(qapp, tmp_path) -> None:
    root = tmp_path / "lib"
    root.mkdir()
    watcher = LibraryWatcher()
    watcher.start(root)

    watcher.stop()

    assert not watcher.is_watching
    assert watcher._watcher.directories() == []
