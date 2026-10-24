"""Incrustado de letras en un hilo, sin congelar la interfaz."""

from __future__ import annotations

import threading

from PySide6.QtCore import QObject, QThread, Signal

from ...core.library import Track
from ...core.lyrics import LyricsOutcome, LyricsReport, embed_track_lyrics


class _LyricsWorker(QThread):
    progress = Signal(int, int, str)
    completed = Signal(object)

    def __init__(self, tracks: list[Track], parent: QObject | None = None):
        super().__init__(parent)
        self._tracks = list(tracks)
        self._cancelled = threading.Event()

    def cancel(self) -> None:
        self._cancelled.set()

    def run(self) -> None:
        total = len(self._tracks)
        outcomes: list[LyricsOutcome] = []
        for index, track in enumerate(self._tracks):
            if self._cancelled.is_set():
                break

            self.progress.emit(index, total, track.title)
            try:
                outcome = embed_track_lyrics(track)
            except Exception as exc:
                outcome = LyricsOutcome(track=track, status="error", message=str(exc))
            outcomes.append(outcome)
            self.progress.emit(index + 1, total, track.title)

        self.completed.emit(LyricsReport(outcomes))


_ZOMBIES: list[QThread] = []


def _release(worker: QThread) -> None:
    if worker in _ZOMBIES:
        _ZOMBIES.remove(worker)
    worker.deleteLater()


def _leave_finish(worker: QThread | None) -> None:
    if worker is None:
        return
    if not worker.isRunning():
        worker.deleteLater()
        return

    _ZOMBIES.append(worker)
    worker.finished.connect(lambda w=worker: _release(w))


class LyricsEmbedder(QObject):
    """Procesa letras de una o varias pistas y avisa el resumen."""

    progress = Signal(int, int, str)
    finished = Signal(object)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._worker: _LyricsWorker | None = None

    @property
    def is_running(self) -> bool:
        return self._worker is not None and self._worker.isRunning()

    def start(self, tracks: list[Track]) -> None:
        if self.is_running or not tracks:
            return

        self._worker = _LyricsWorker(tracks)
        self._worker.progress.connect(self.progress)
        self._worker.completed.connect(self._on_completed)
        self._worker.start()

    def cancel(self) -> None:
        if self._worker is not None:
            self._worker.cancel()

    def shutdown(self, timeout_ms: int = 5000) -> None:
        worker = self._worker
        if worker is not None:
            worker.cancel()
            worker.wait(timeout_ms)
        _leave_finish(worker)
        self._worker = None

    def _on_completed(self, report: LyricsReport) -> None:
        worker = self._worker
        self._worker = None
        if worker is not None:
            worker.deleteLater()
        self.finished.emit(report)
