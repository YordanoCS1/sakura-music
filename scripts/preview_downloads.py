"""Renderiza la ventana con resultados de busqueda y una cola con progreso.

Usa la red para la busqueda real y un trabajo simulado para la cola.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from preview_bootstrap import boot
from PySide6.QtCore import QTimer

from sakura.core.models import JobStatus, SearchResult
from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow

RESULTS = [
    SearchResult(
        "1",
        "Daft Punk - Get Lucky (Official Audio) ft. Pharrell Williams",
        "u1",
        "Daft Punk",
        249,
    ),
    SearchResult("2", "Get Lucky · Random Access Memories (Remastered)", "u2", "Daft Punk", 448),
    SearchResult("3", "Daft Punk - Instant Crush (Official Video)", "u3", "Daft Punk", 337),
    SearchResult("4", "Instant Crush", "u4", "Daft Punk", 303),
    SearchResult("5", "Daft Punk - Harder Better Faster Stronger", "u5", "Daft Punk", 224),
]

STATES = [
    (JobStatus.DONE, 100, "", "C:/Users/Musica/Daft Punk/"),
    (JobStatus.DOWNLOADING, 43, "3.2MiB/s", ""),
    (JobStatus.CONVERTING, 100, "1.1MiB/s", ""),
    (JobStatus.DOWNLOADING, 8, "820KiB/s", ""),
    (JobStatus.PENDING, -1, "", ""),
    (JobStatus.FAILED, -1, "", "El video es privado"),
]


def main() -> None:
    app = boot()
    theme = th.MODERN
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))

    window = MainWindow()
    window.resize(1240, 800)
    window.show()

    search = window.page_map["search"]
    queue = window.page_map["queue"]

    for result in RESULTS:
        search._on_result(result)
    search._set_status(f"{len(RESULTS)} resultados")
    window.topbar.search.setText("daft punk get lucky")

    for index, (status, percent, speed, error) in enumerate(STATES):
        job = search_result_job(index, status, percent, speed, error)
        queue.add_job(job)

    window.page_map["settings"].refresh()

    def capture() -> None:
        for page in ("search", "queue", "settings"):
            window.show_page(page)
            app.processEvents()
            window.grab().save(f"preview_{page}.png")
            print(f"  preview_{page}.png")
        app.quit()

    QTimer.singleShot(400, capture)
    app.exec()


def search_result_job(index, status, percent, speed, error):
    """Construye un DownloadJob en el estado indicado."""
    from sakura.core.models import DownloadJob

    result = RESULTS[index % len(RESULTS)]
    job = DownloadJob(result=result)
    job.status = status
    job.downloaded_bytes = percent
    job.total_bytes = 100 if percent >= 0 else 0
    job.speed = speed
    job.error = error
    return job


if __name__ == "__main__":
    main()