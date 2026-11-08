"""Ejecucion de procesos externos en segundo plano.

Se usa `subprocess.Popen` en vez de `QProcess` por dos motivos:

- `CREATE_NO_WINDOW` evita el destello de consola en Windows; PySide6 no expone
  `setCreateProcessArgumentsModifier`, asi que con QProcess no habria forma.
- yt-dlp corre en su propio proceso, de modo que su trabajo pesado de CPU no
  compite por el GIL con la interfaz.
"""

from __future__ import annotations

import subprocess
import threading

from PySide6.QtCore import QObject, QThread, Signal

from ...core.tools import spawn_kwargs


class _Worker(QThread):
    """Lee stdout linea por linea y reporta el codigo de salida."""

    line = Signal(str)
    completed = Signal(int)
    failed = Signal(str)

    def __init__(self, command: list[str], parent: QObject | None = None):
        super().__init__(parent)
        self._command = command
        self._process: subprocess.Popen | None = None
        self._lock = threading.Lock()

    def cancel(self) -> None:
        with self._lock:
            process = self._process
        if process is not None and process.poll() is None:
            process.terminate()

    def run(self) -> None:
        try:
            process = subprocess.Popen(
                self._command,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
                **spawn_kwargs(),
            )
        except OSError as exc:
            self.failed.emit(f"No se pudo iniciar: {exc}")
            return

        with self._lock:
            self._process = process

        assert process.stdout is not None
        for raw in process.stdout:
            stripped = raw.strip()
            if stripped:
                self.line.emit(stripped)

        process.wait()
        with self._lock:
            self._process = None
        self.completed.emit(process.returncode)


class ProcessRunner(QObject):
    """Ejecuta un comando y reparte su salida en lineas."""

    line = Signal(str)
    failed = Signal(str)
    completed = Signal(int)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._workers: list[_Worker] = []

    @property
    def is_running(self) -> bool:
        return any(worker.isRunning() for worker in self._workers)

    @property
    def current(self) -> _Worker | None:
        """Worker activo, si lo hay."""
        return next((w for w in self._workers if w.isRunning()), None)

    def start(self, command: list[str]) -> None:
        if self.is_running:
            return

        worker = _Worker(command)
        self._workers.append(worker)
        worker.line.connect(self.line)
        worker.failed.connect(self.failed)
        worker.completed.connect(self._on_completed)
        # Cada worker se libera a si mismo: usar `self._worker` aqui borraria al
        # worker equivocado si ya arranco el siguiente.
        worker.finished.connect(lambda: self._release(worker))
        worker.start()

    def kill(self) -> None:
        for worker in list(self._workers):
            worker.cancel()

    def shutdown(self, timeout_ms: int = 3000) -> None:
        """Cancela todo y espera a los hilos. Llamar antes de destruirse.

        Sin esto Qt avisa `QThread: Destroyed while thread is still running`
        cuando el objeto se recolecta con un proceso en curso.
        """
        self.kill()
        for worker in list(self._workers):
            worker.wait(timeout_ms)

    def _release(self, worker: _Worker) -> None:
        """Retira un worker ya terminado. Se ejecuta desde el hilo del worker."""
        if worker in self._workers:
            self._workers.remove(worker)
        worker.deleteLater()

    def _on_completed(self, exit_code: int) -> None:
        self.completed.emit(exit_code)