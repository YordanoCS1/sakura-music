"""Busqueda de iconos en Iconify y previsualizacion, en hilos aparte.

Las peticiones de red son bloqueantes, asi que cada operacion corre en su propio
`QThread` y avisa por señales. El dialogo del estudio de iconos se conecta a
`IconLibrary` y nunca toca la red desde el hilo de la interfaz.
"""

from __future__ import annotations

from PySide6.QtCore import QObject, QThread, Signal

from ...core.icon_api import IconApiError, IconHit, icon_bodies, search_icons

# Mapa icon_id -> (body, width, height) para pintar la grilla de resultados.
Preview = tuple[str, int, int]


class _SearchWorker(QThread):
    results_ready = Signal(object)  # list[IconHit]
    failed = Signal(str)

    def __init__(self, query: str, limit: int, parent: QObject | None = None):
        super().__init__(parent)
        self._query = query
        self._limit = limit

    def run(self) -> None:
        try:
            hits = search_icons(self._query, self._limit)
        except IconApiError as exc:
            self.failed.emit(str(exc))
            return
        if not hits:
            self.failed.emit(f'Sin iconos para "{self._query}"')
            return
        self.results_ready.emit(hits)


class _PreviewWorker(QThread):
    previews_ready = Signal(object)  # dict[str, Preview]
    failed = Signal(str)

    def __init__(self, hits: list[IconHit], parent: QObject | None = None):
        super().__init__(parent)
        self._hits = list(hits)

    def run(self) -> None:
        por_prefijo: dict[str, list[str]] = {}
        for hit in self._hits:
            por_prefijo.setdefault(hit.prefix, []).append(hit.name)

        previews: dict[str, Preview] = {}
        try:
            for prefix, names in por_prefijo.items():
                conj = icon_bodies(prefix, names)
                for name, body in conj.bodies.items():
                    previews[f"{prefix}:{name}"] = (body, conj.width, conj.height)
        except IconApiError as exc:
            self.failed.emit(str(exc))
            return
        self.previews_ready.emit(previews)


# Hilos que sobrevivieron al cierre del dialogo. Un `QThread` no se puede
# destruir mientras corre (Qt aborta el proceso): se los suelta y se liberan
# solos al terminar.
_ZOMBIES: list[QThread] = []


def _leave_finish(worker: QThread | None) -> None:
    if worker is None or not worker.isRunning():
        return
    _ZOMBIES.append(worker)
    worker.finished.connect(lambda w=worker: _release(w))


def _release(worker: QThread) -> None:
    if worker in _ZOMBIES:
        _ZOMBIES.remove(worker)
    worker.deleteLater()


class IconLibrary(QObject):
    """Busca iconos y trae sus previsualizaciones desde la API de Iconify."""

    results_found = Signal(object)   # list[IconHit]
    previews_ready = Signal(object)  # dict[str, Preview]
    failed = Signal(str)

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._search_worker: _SearchWorker | None = None
        self._preview_worker: _PreviewWorker | None = None

    @property
    def is_running(self) -> bool:
        worker = self._search_worker
        return worker is not None and worker.isRunning()

    def shutdown(self, timeout_ms: int = 1500) -> None:
        """Espera un momento lo que este en vuelo y suelta el resto."""
        for worker in (self._search_worker, self._preview_worker):
            if worker is not None and worker.isRunning():
                worker.wait(timeout_ms)
            _leave_finish(worker)
        self._search_worker = None
        self._preview_worker = None

    def search(self, query: str, limit: int = 36) -> None:
        if self.is_running or not query.strip():
            return
        self._search_worker = _SearchWorker(query.strip(), limit, self)
        self._search_worker.results_ready.connect(self.results_found)
        self._search_worker.failed.connect(self.failed)
        self._search_worker.start()

    def previews(self, hits: list[IconHit]) -> None:
        if not hits:
            return
        self._preview_worker = _PreviewWorker(hits, self)
        self._preview_worker.previews_ready.connect(self.previews_ready)
        self._preview_worker.failed.connect(self.failed)
        self._preview_worker.start()
