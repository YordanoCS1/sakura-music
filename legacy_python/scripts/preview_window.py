"""Renderiza la ventana principal a PNG para revisar el diseño sin abrirla.

Uso: python scripts/preview_window.py [tema] [pagina ...]
Sin argumentos usa el tema guardado y las cinco paginas.
"""

from __future__ import annotations

import sys
from pathlib import Path

from PySide6.QtCore import QTimer

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from preview_bootstrap import boot

from sakura.config import load_settings
from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow

PAGES = ("home", "search", "library", "queue", "settings")


def main() -> None:
    app = boot()

    args = sys.argv[1:]
    theme_id = args[0] if args else str(load_settings().get("theme", "modern"))
    paginas = tuple(args[1:]) or PAGES

    theme = th.get_theme(theme_id)
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))
    print(f"tema: {theme.id} ({theme.name})")

    window = MainWindow()
    window.resize(1240, 800)
    window.show()

    def capture() -> None:
        by_default = str(load_settings().get("theme", "modern"))
        sufijo = "" if theme.id == by_default else f"_{theme.id}"
        for page in paginas:
            window.show_page(page)
            app.processEvents()
            window.grab().save(f"preview_{page}{sufijo}.png")
            print(f"  preview_{page}{sufijo}.png")
        app.quit()

    QTimer.singleShot(250, capture)
    app.exec()


if __name__ == "__main__":
    main()