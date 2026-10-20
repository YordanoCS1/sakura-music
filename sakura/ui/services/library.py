"""Escaneo de la biblioteca en un hilo aparte.

Leer tags de miles de archivos con `mutagen` tarda segundos; hacerlo en el hilo
de la UI congelaría la ventana.
"""

from __future__ import annotations

import logging
import os
import threading
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from pathlib import Path

from PySide6.QtCore import QObject, QThread, Signal

from ...config import covers_dir, library_index_file
from ...core.library import (
    UNKNOWN,
    Track,
    duplicate_track_paths,
    extract_cover,
    find_lyrics,
    folder_covers,
    load_track,
    lyrics_indexes,
    scan_paths,
    summarize,
)
from ...core.library_index import IndexedTrack, LibraryIndex

logger = logging.getLogger(__name__)

BATCH_SIZE = 150

# Leer tags es I/O de disco con bastante parsing en Python. Con demasiados
# hilos el disco golpea sin ganar nada; con unos pocos el primer escaneo de
# miles de pistas baja de minutos a segundos.
SCAN_WORKERS = max(2, min(8, os.cpu_count() or 4))


class _ScanWorker(QThread):
    """Recorre `root` y emite las pistas por tandas."""

    batch_ready = Signal(object)  # list[Track]
    scan_finished = Signal(int, object)  # total, resumen
    scan_failed = Signal(str)

    def __init__(
        self,
        root: Path,
        covers_root: Path,
        with_covers: bool = True,
        parent: QObject | None = None,
        workers: int | None = None,
        index_path: Path | None = None,
    ):
        super().__init__(parent)
        self._root = root
        self._covers_root = covers_root
        self._with_covers = with_covers
        self._workers = workers or SCAN_WORKERS
        self._index_path = index_path
        self._cancelled = threading.Event()
        self._covers_folder: dict[Path, Path] = {}
        self._lyrics_indices: dict[Path, dict[str, Path]] = {}
        self._cached: dict[Path, IndexedTrack] = {}

    def cancel(self) -> None:
        self._cancelled.set()

    def run(self) -> None:
        try:
            paths = scan_paths(self._root)
        except OSError as exc:
            self.scan_failed.emit(f"No se pudo leer la carpeta: {exc}")
            return

        index = self._open_index()
        if index is not None:
            try:
                self._cached = index.load(self._root)
            except Exception as exc:  # un cache roto no puede impedir escanear
                logger.warning("No se pudo leer el indice de la biblioteca: %s", exc)
                index.close()
                index = None

        # Las portadas y las letras se resuelven una vez por carpeta, no una
        # vez por pista: son lecturas del mismo directorio repetidas 200 veces.
        if self._with_covers:
            self._covers_folder = folder_covers(self._root, paths)
        self._lyrics_indices = lyrics_indexes(self._root, paths)

        track_items: list[Track] = []
        chunk: list[Track] = []
        dirty: list[IndexedTrack] = []
        broken: list[Path] = []

        # El trabajo se lanza en ventanas acotadas en vez de mandar las miles de
        # pistas de una: con `Executor.map` todos los futures se crean de golpe y
        # una cancelacion tendria que esperar a que corran igual.
        window = max(BATCH_SIZE, self._workers * 4)
        try:
            with ThreadPoolExecutor(max_workers=self._workers) as pool:
                for start in range(0, len(paths), window):
                    if self._cancelled.is_set():
                        return

                    batch_paths = paths[start : start + window]
                    for loaded in pool.map(self._load_one, batch_paths):
                        if self._cancelled.is_set():
                            return
                        if loaded is None:
                            continue

                        file_path, track_item, mtime_ns, is_dirty = loaded
                        if track_item is None:
                            broken.append(file_path)
                            continue
                        if is_dirty:
                            dirty.append(IndexedTrack(track_item, mtime_ns, track_item.size))
                            if len(dirty) >= BATCH_SIZE and index is not None:
                                index.upsert(dirty)
                                dirty = []

                        track_items.append(track_item)
                        chunk.append(track_item)
                        if len(chunk) >= BATCH_SIZE:
                            self.batch_ready.emit(chunk)
                            chunk = []
        finally:
            if index is not None:
                if dirty:
                    index.upsert(dirty)
                if broken:
                    index.remove(broken)
                if not self._cancelled.is_set():
                    index.prune(self._root, set(paths))
                index.close()

        if chunk:
            self.batch_ready.emit(chunk)

        self.scan_finished.emit(len(track_items), summarize(track_items))

    def _open_index(self) -> LibraryIndex | None:
        """Abre el cache de metadatos del hilo. None si no hay o esta roto."""
        if self._index_path is None:
            return None
        try:
            return LibraryIndex(self._index_path)
        except Exception as exc:
            logger.warning("No se pudo abrir el indice de la biblioteca: %s", exc)
            return None

    def _load_one(self, file_path: Path) -> tuple[Path, Track | None, int, bool] | None:
        """Lee una pista y le cuelga la portada y las letras. Corre en un hilo.

        Devuelve tambien si la fila del cache quedo vieja (`is_dirty`), para que
        el hilo principal la guarde sin tocar la base desde varios hilos.
        """
        try:
            stat = file_path.stat()
        except OSError:
            return None

        cached = self._cached.get(file_path)
        if (
            cached is not None
            and cached.mtime_ns == stat.st_mtime_ns
            and cached.size == stat.st_size
        ):
            track_item = self._from_cache(file_path, cached)
            if track_item is not None:
                return file_path, track_item, stat.st_mtime_ns, False

        track_item = self._load_fresh(file_path)
        return file_path, track_item, stat.st_mtime_ns, True

    def _from_cache(self, file_path: Path, cached: IndexedTrack) -> Track | None:
        """Pista cacheada, revisando que portada y letra sigan existiendo."""
        track_item = replace(cached.track)
        if not self._with_covers:
            track_item.cover_path = None
        elif track_item.cover_path is not None and not track_item.cover_path.is_file():
            track_item.cover_path = self._covers_folder.get(file_path.parent)
            if track_item.cover_path is None:
                # La portada embebida desaparecio: hay que volver a extraerla.
                return None

        lyrics = track_item.lyrics_path
        if lyrics is None or not lyrics.is_file():
            lyrics = find_lyrics(file_path, self._lyrics_indices.get(file_path.parent))
        track_item.lyrics_path = lyrics
        return track_item

    def _load_fresh(self, file_path: Path) -> Track | None:
        return _read_track(
            file_path,
            self._covers_folder,
            self._lyrics_indices.get(file_path.parent),
            self._covers_root,
            self._with_covers,
        )


def _read_track(
    file_path: Path,
    covers_folder: dict[Path, Path],
    lyrics_index: dict[str, Path] | None,
    covers_root: Path,
    with_covers: bool,
) -> Track | None:
    """Lee una pista y le cuelga la portada y las letras.

    La portada embebida gana sobre la de la carpeta; si la extraccion falla,
    la pista sigue siendo valida sin portada.
    """
    track_item = load_track(file_path)
    if track_item is None:
        return None

    if with_covers:
        try:
            embebida = extract_cover(file_path, covers_root)
        except OSError:
            embebida = None
        track_item.cover_path = embebida or covers_folder.get(file_path.parent)
    else:
        track_item.cover_path = None

    track_item.lyrics_path = find_lyrics(file_path, lyrics_index)
    return track_item


class LibraryScanner(QObject):
    """API de alto nivel para escanear la biblioteca."""

    tracks_found = Signal(object)  # list[Track]
    finished = Signal(int, object)  # total, resumen
    failed = Signal(str)
    progress = Signal(int)  # pistas leidas hasta ahora

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._worker: _ScanWorker | None = None
        self._count = 0

    @property
    def is_running(self) -> bool:
        return self._worker is not None and self._worker.isRunning()

    def scan(self, root: Path, with_covers: bool = True) -> None:
        if self.is_running:
            return
        self._count = 0

        covers = covers_dir() if with_covers else Path(root)
        self._worker = _ScanWorker(
            root,
            covers,
            with_covers,
            index_path=library_index_file(),
        )
        self._worker.batch_ready.connect(self._on_batch)
        self._worker.scan_finished.connect(self._on_finished)
        self._worker.scan_failed.connect(self.failed)
        self._worker.start()

    def cancel(self) -> None:
        if self._worker is not None:
            self._worker.cancel()

    def shutdown(self) -> None:
        self.cancel()
        if self._worker is not None:
            self._worker.wait(5000)

    def _on_batch(self, batch: list[Track]) -> None:
        self._count += len(batch)
        self.progress.emit(self._count)
        self.tracks_found.emit(batch)

    def _on_finished(self, total: int, summary: dict[str, int]) -> None:
        self.finished.emit(total, summary)
        if self._worker is not None:
            self._worker.deleteLater()
            self._worker = None


class _DeltaWorker(QThread):
    """Detecta altas, bajas y cambios leyendo solo lo que hace falta."""

    tracks_changed = Signal(object)  # list[Track]
    tracks_removed = Signal(object)  # list[Path]
    finished = Signal(int, int)  # cambiadas, borradas
    failed = Signal(str)

    def __init__(
        self,
        root: Path,
        covers_root: Path,
        with_covers: bool = True,
        parent: QObject | None = None,
        workers: int | None = None,
        index_path: Path | None = None,
    ):
        super().__init__(parent)
        self._root = root
        self._covers_root = covers_root
        self._with_covers = with_covers
        self._workers = workers or SCAN_WORKERS
        self._index_path = index_path
        self._cancelled = threading.Event()
        self._covers_folder: dict[Path, Path] = {}
        self._lyrics_indices: dict[Path, dict[str, Path]] = {}

    def cancel(self) -> None:
        self._cancelled.set()

    def run(self) -> None:
        try:
            paths = scan_paths(self._root)
        except OSError as exc:
            self.failed.emit(f"No se pudo leer la carpeta: {exc}")
            return

        index = self._open_index()
        cached: dict[Path, IndexedTrack] = {}
        if index is not None:
            try:
                cached = index.load(self._root)
            except Exception as exc:
                logger.warning("No se pudo leer el indice de la biblioteca: %s", exc)
                index.close()
                index = None

        current: dict[Path, tuple[int, int]] = {}
        for file_path in paths:
            try:
                stat = file_path.stat()
            except OSError:
                continue
            current[file_path] = (stat.st_mtime_ns, stat.st_size)

        removed = [path for path in cached if path not in current]
        pending = [
            path
            for path, (mtime_ns, size) in current.items()
            if path not in cached
            or cached[path].mtime_ns != mtime_ns
            or cached[path].size != size
        ]

        if removed:
            self.tracks_removed.emit(removed)

        if pending:
            if self._with_covers:
                self._covers_folder = folder_covers(self._root, pending)
            self._lyrics_indices = lyrics_indexes(self._root, pending)

        chunk: list[Track] = []
        dirty: list[IndexedTrack] = []
        broken: list[Path] = []
        changed = 0

        try:
            window = max(BATCH_SIZE, self._workers * 4)
            with ThreadPoolExecutor(max_workers=self._workers) as pool:
                for start in range(0, len(pending), window):
                    if self._cancelled.is_set():
                        break

                    block = pending[start : start + window]
                    for loaded in pool.map(self._load_one, block):
                        if self._cancelled.is_set():
                            break
                        if loaded is None:
                            continue

                        file_path, track_item, mtime_ns = loaded
                        if track_item is None:
                            broken.append(file_path)
                            continue

                        changed += 1
                        if index is not None:
                            dirty.append(IndexedTrack(track_item, mtime_ns, track_item.size))
                            if len(dirty) >= BATCH_SIZE:
                                index.upsert(dirty)
                                dirty = []

                        chunk.append(track_item)
                        if len(chunk) >= BATCH_SIZE:
                            self.tracks_changed.emit(chunk)
                            chunk = []
        finally:
            if index is not None:
                if dirty:
                    index.upsert(dirty)
                if broken:
                    index.remove(broken)
                if removed:
                    index.remove(removed)
                if not self._cancelled.is_set():
                    index.prune(self._root, set(current))
                index.close()

        if chunk:
            self.tracks_changed.emit(chunk)
        if broken:
            # Una pista que ya no se puede leer tambien sale de la lista.
            self.tracks_removed.emit(broken)

        self.finished.emit(changed, len(removed) + len(broken))

    def _open_index(self) -> LibraryIndex | None:
        if self._index_path is None:
            return None
        try:
            return LibraryIndex(self._index_path)
        except Exception as exc:
            logger.warning("No se pudo abrir el indice de la biblioteca: %s", exc)
            return None

    def _load_one(self, file_path: Path) -> tuple[Path, Track | None, int] | None:
        try:
            mtime_ns = file_path.stat().st_mtime_ns
        except OSError:
            return None

        track_item = _read_track(
            file_path,
            self._covers_folder,
            self._lyrics_indices.get(file_path.parent),
            self._covers_root,
            self._with_covers,
        )
        return file_path, track_item, mtime_ns


class LibraryDeltaScanner(QObject):
    """Escanea la biblioteca comparando contra el indice guardado."""

    tracks_changed = Signal(object)  # list[Track]
    tracks_removed = Signal(object)  # list[Path]
    finished = Signal(int, int)  # cambiadas, borradas
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._worker: _DeltaWorker | None = None

    @property
    def is_running(self) -> bool:
        return self._worker is not None and self._worker.isRunning()

    def scan(self, root: Path, with_covers: bool = True) -> None:
        if self.is_running:
            return

        covers = covers_dir() if with_covers else Path(root)
        self._worker = _DeltaWorker(
            root,
            covers,
            with_covers,
            index_path=library_index_file(),
        )
        self._worker.tracks_changed.connect(self.tracks_changed)
        self._worker.tracks_removed.connect(self.tracks_removed)
        self._worker.finished.connect(self._on_finished)
        self._worker.failed.connect(self.failed)
        self._worker.start()

    def cancel(self) -> None:
        if self._worker is not None:
            self._worker.cancel()

    def shutdown(self) -> None:
        self.cancel()
        if self._worker is not None:
            self._worker.wait(5000)

    def _on_finished(self, changed: int, removed: int) -> None:
        worker = self._worker
        self._worker = None
        if worker is not None:
            worker.deleteLater()
        self.finished.emit(changed, removed)


class _ReviewWorker(QThread):
    """Calcula en segundo plano los avisos de revisión de Inicio."""

    completed = Signal(object)

    def __init__(
        self, generation: int, tracks: list[Track], parent: QObject | None = None
    ):
        super().__init__(parent)
        self._generation = generation
        self._tracks = [replace(track) for track in tracks]
        self._cancelled = threading.Event()
        self.result: tuple[int, int, int] | None = None

    def cancel(self) -> None:
        self._cancelled.set()

    def run(self) -> None:
        without_tags = 0
        without_cover = 0
        covers_exist: dict[Path, bool] = {}

        for track in self._tracks:
            if self._cancelled.is_set():
                break

            if track.artist.strip() in ("", UNKNOWN) or not track.title.strip():
                without_tags += 1
            cover_path = track.cover_path
            if cover_path is None:
                without_cover += 1
            else:
                if cover_path not in covers_exist:
                    covers_exist[cover_path] = cover_path.is_file()
                if not covers_exist[cover_path]:
                    without_cover += 1

        if not self._cancelled.is_set():
            duplicadas = len(duplicate_track_paths(self._tracks))
            if not self._cancelled.is_set():
                self.result = (without_tags, without_cover, duplicadas)
        self.completed.emit(self)


class LibraryReviewScanner(QObject):
    """Calcula contadores de revisión sin bloquear el hilo de la interfaz."""

    finished = Signal(int, int, int, int)  # generation, sin_tags, sin_portada, duplicadas

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._workers: set[_ReviewWorker] = set()

    def scan(self, generation: int, tracks: list[Track]) -> None:
        for worker in tuple(self._workers):
            worker.cancel()
        worker = _ReviewWorker(generation, tracks, self)
        self._workers.add(worker)
        worker.completed.connect(self._on_worker_completed)
        worker.start()

    def shutdown(self) -> None:
        workers = tuple(self._workers)
        for worker in workers:
            worker.cancel()
        for worker in workers:
            worker.wait(5000)

    def _on_worker_completed(self, worker: object) -> None:
        if not isinstance(worker, _ReviewWorker):
            return
        worker.wait()
        self._workers.discard(worker)
        if worker.result is not None:
            self.finished.emit(worker._generation, *worker.result)
        worker.deleteLater()


class _RefreshWorker(QThread):
    """Relee del disco un conjunto de pistas y las emite por tandas.

    Lo usa el editor de metadatos al cerrar: sin esto, con miles de pistas el
    hilo de la GUI hace miles de lecturas de mutagen y la ventana se congela.
    """

    batch_ready = Signal(object)  # list[tuple[Path, Track]]
    refreshed = Signal(int)
    failed = Signal(str)

    def __init__(
        self,
        paths: list[Path],
        covers: Path,
        parent: QObject | None = None,
        workers: int | None = None,
        index_path: Path | None = None,
    ):
        super().__init__(parent)
        self._paths = paths
        self._covers = covers
        self._workers = workers or SCAN_WORKERS
        self._index_path = index_path
        self._cancelled = threading.Event()

    def cancel(self) -> None:
        self._cancelled.set()

    def run(self) -> None:
        leidas: list[tuple[Path, Track]] = []
        dirty: list[IndexedTrack] = []
        index = self._open_index()

        try:
            window = max(BATCH_SIZE, self._workers * 4)
            with ThreadPoolExecutor(max_workers=self._workers) as pool:
                for start in range(0, len(self._paths), window):
                    if self._cancelled.is_set():
                        break

                    block = self._paths[start : start + window]
                    for loaded in pool.map(self._refresh_one, block):
                        if self._cancelled.is_set():
                            break
                        if loaded is None:
                            continue

                        file_path, track_item, mtime_ns = loaded
                        if index is not None:
                            dirty.append(IndexedTrack(track_item, mtime_ns, track_item.size))
                            if len(dirty) >= BATCH_SIZE:
                                index.upsert(dirty)
                                dirty = []

                        leidas.append((file_path, track_item))
                        if len(leidas) >= BATCH_SIZE:
                            self.batch_ready.emit(leidas)
                            leidas = []
        finally:
            if index is not None:
                if dirty:
                    index.upsert(dirty)
                index.close()

        if leidas:
            self.batch_ready.emit(leidas)

        self.refreshed.emit(len(self._paths))

    def _open_index(self) -> LibraryIndex | None:
        if self._index_path is None:
            return None
        try:
            return LibraryIndex(self._index_path)
        except Exception as exc:
            logger.warning("No se pudo abrir el indice de la biblioteca: %s", exc)
            return None

    def _refresh_one(self, file_path: Path) -> tuple[Path, Track, int] | None:
        """Relee una pista del disco. Corre en un hilo."""
        track_item = load_track(file_path)
        if track_item is None:
            return None

        try:
            mtime_ns = file_path.stat().st_mtime_ns
        except OSError:
            return None

        try:
            track_item.cover_path = extract_cover(file_path, self._covers)
        except OSError:
            track_item.cover_path = None  # la pista sigue siendo válida sin portada
        return file_path, track_item, mtime_ns


class LibraryRefresher(QObject):
    """Relee pistas ya escaneadas, fuera del hilo de la UI."""

    tracks_refreshed = Signal(object)  # list[tuple[Path, Track]]
    finished = Signal(int)
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._worker: _RefreshWorker | None = None

    @property
    def is_running(self) -> bool:
        return self._worker is not None and self._worker.isRunning()

    def refresh(self, paths: list[Path], with_covers: bool = True) -> None:
        if self.is_running or not paths:
            return
        self._worker = _RefreshWorker(
            paths,
            covers_dir() if with_covers else Path(),
            index_path=library_index_file(),
        )
        self._worker.batch_ready.connect(self.tracks_refreshed)
        self._worker.failed.connect(self.failed)
        self._worker.refreshed.connect(self._on_refreshed)
        self._worker.start()

    def _on_refreshed(self, total: int) -> None:
        """Suelta el hilo terminado y recien despues avisa.

        Es el mismo patron que `LibraryScanner._on_finished`. Sin soltarlo, el
        QThread viejo se reemplaza por el siguiente mientras Qt todavia lo esta
        cerrando, y una llamada a `refresh()` en ese instante se descarta en
        silencio: la barra de la biblioteca se queda en "Actualizando...".
        """
        if self._worker is not None:
            self._worker.deleteLater()
            self._worker = None
        self.finished.emit(total)

    def cancel(self) -> None:
        if self._worker is not None:
            self._worker.cancel()

    def shutdown(self) -> None:
        self.cancel()
        if self._worker is not None:
            self._worker.wait(5000)