"""Renderiza una playlist real de YouTube para ver la numeracion y el resumen.

Toca la red. Uso: python scripts/preview_playlist.py <url-de-playlist>
"""

from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtCore import QEventLoop, QTimer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from preview_bootstrap import boot

from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow


def main() -> None:
    app = boot()
    url = sys.argv[1] if len(sys.argv) > 1 else (
        "https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj"
    )

    theme_name = th.MODERN
    th.set_active(theme_name)
    app.setStyleSheet(th.build_qss(theme_name))

    window = MainWindow()
    window.resize(1240, 900)
    window.show()
    window.show_page("search")

    pagina = window.page_map["search"]
    pagina.set_query(url)

    def wait() -> None:
        loop = QEventLoop()
        pagina.playlist_resolver.finished.connect(loop.quit)
        QTimer.singleShot(120_000, loop.quit)
        loop.exec()
        app.processEvents()

        print("estado:", pagina._status.text())
        print("ocultos:", pagina._playlist_hidden)
        window.grab().save("preview_playlist.png")
        print("  preview_playlist.png")
        app.quit()

    QTimer.singleShot(1200, wait)
    app.exec()


if __name__ == "__main__":
    main()