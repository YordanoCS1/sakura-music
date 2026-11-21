"""Descarga y cache de portadas de resultados."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PySide6.QtCore import QObject, QUrl, Signal
from PySide6.QtGui import QPixmap
from PySide6.QtNetwork import QNetworkAccessManager, QNetworkReply, QNetworkRequest

from ...config import covers_dir


class ThumbnailLoader(QObject):
    """Pide portadas por URL y las guarda en disco como cache."""

    loaded = Signal(str, object)  # url, QPixmap
    failed = Signal(str, str)  # url, reason

    def __init__(self, parent: QObject | None = None):
        super().__init__(parent)
        self._manager = QNetworkAccessManager(self)
        self._pending: dict[str, list[Path]] = {}

    def request(self, url: str, target: Path) -> None:
        """Descarga `url` y, al terminar, escribe el pixmap en `target`."""
        if not url or target.exists() or url in self._pending:
            return

        self._pending.setdefault(url, []).append(target)
        request = QNetworkRequest(QUrl(url))
        request.setTransferTimeout(8000)
        reply = self._manager.get(request)
        reply.finished.connect(lambda u=url, r=reply: self._on_finished(u, r))

    def _on_finished(self, url: str, reply: QNetworkReply) -> None:
        targets = self._pending.pop(url, [])
        if reply.error() != QNetworkReply.NetworkError.NoError:
            self.failed.emit(url, reply.errorString())
            reply.deleteLater()
            return

        pixmap = QPixmap()
        if not pixmap.loadFromData(reply.readAll()) or pixmap.isNull():
            self.failed.emit(url, "La respuesta no contiene una imagen válida")
            reply.deleteLater()
            return

        for target in targets:
            try:
                target.parent.mkdir(parents=True, exist_ok=True)
            except OSError as exc:
                self.failed.emit(url, f"No se pudo crear la caché: {exc}")
                reply.deleteLater()
                return
            if not pixmap.save(str(target), "PNG"):
                self.failed.emit(url, f"No se pudo guardar la miniatura en {target}")
                reply.deleteLater()
                return
        self.loaded.emit(url, pixmap)

        reply.deleteLater()


    def shutdown(self) -> None:
        """Aborta las descargas en curso (usar al cerrar la app).

        Sin esto una miniatura a medio descargar sigue viva despues de que la
        ventana se cerro y su `finished` llega a widgets ya destruidos.
        """
        self._pending.clear()
        for reply in self._manager.findChildren(QNetworkReply):
            reply.abort()


def cache_path(url: str) -> Path:
    """Ruta del archivo de cache para una URL de portada."""
    digest = hashlib.sha1(url.encode("utf-8")).hexdigest()[:20]
    return covers_dir() / f"{digest}.png"