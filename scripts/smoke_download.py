"""Prueba de humo: descarga real de un video corto de prueba.

No forma parte de la suite por defecto (toca la red). Ejecutala con:

    python scripts/smoke_download.py
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from PySide6.QtCore import QCoreApplication, QTimer

from sakura.ui.services import DownloadManager

VIDEO = "https://www.youtube.com/watch?v=aqz-KE-bpKQ"  # Big Buck Bunny, 10s


def main() -> int:
    app = QCoreApplication(sys.argv)

    manager = DownloadManager()
    manager.job_added.connect(lambda job: print(f"\n[cola] {job.title}"))
    manager.job_updated.connect(
        lambda job: print(
            f"  {job.status.value:<13} {job.progress_percent:>4}%  {job.speed}"
        )
        if job.status.is_active
        else None
    )

    def on_finished(job) -> None:
        print(f"\n[final] status={job.status.value}")
        if job.filepath is not None:
            size_kb = job.filepath.stat().st_size / 1024
            print(f"[final] archivo: {job.filepath}")
            print(f"[final] tamaño: {size_kb:.1f} KB")
            ok = job.filepath.exists() and size_kb > 0
            print("[resultado] OK" if ok else "[resultado] FALLO: archivo vacio o ausente")
            app.exit(0 if ok else 1)
        else:
            print(f"[final] error: {job.error}")
            app.exit(1)

    manager.job_finished.connect(on_finished)

    def enqueue() -> None:
        class Fake:
            id = "smoke"
            title = "Big Buck Bunny (prueba)"
            url = VIDEO
            uploader = "Blender"
            duration = 10
            thumbnail = ""
            view_count = 0
            channel_verified = True
            duration_text = "0:10"

        print(f"[busqueda] encolando {VIDEO}")
        manager.enqueue(Fake())

    QTimer.singleShot(0, enqueue)
    QTimer.singleShot(180_000, lambda: (print("[resultado] TIMEOUT"), app.exit(1)))
    app.exec()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())