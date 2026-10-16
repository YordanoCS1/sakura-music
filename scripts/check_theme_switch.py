"""Cambiar de tema en vivo y verificar que nada queda con el color anterior.

Un selector de tema que no repinta los widgets con estilos inline es decorativo:
el QSS se regenera pero las etiquetas siguen con el color del tema viejo.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console
from preview_bootstrap import boot


def main() -> int:
    utf8_console()

    from PySide6.QtCore import QEventLoop, QTimer
    from PySide6.QtWidgets import QLabel

    from sakura.ui import theme as th
    from sakura.ui.main_window import MainWindow

    app = boot()
    problemas: list[str] = []

    for theme_id in ("modern", "sakura_light", "oled", "cyberpunk"):
        theme_name = th.get_theme(theme_id)
        window = MainWindow()
        window.show()
        window.apply_theme(theme_name)
        app.processEvents()

        # Esperar a que la biblioteca termine de escanear, si escanea.
        loop = QEventLoop()
        window.page_map["library"].scanner.finished.connect(loop.quit)
        QTimer.singleShot(3000, loop.quit)
        loop.exec()

        for page in ("home", "search", "library", "queue", "settings"):
            window.show_page(page)
            app.processEvents()

        # Cada etiqueta con estilo inline tiene que llevar un color del tema.
        permitidos = {
            t.upper()
            for t in vars(theme_name).values()
            if isinstance(t, str) and t.startswith("#")
        }
        for tag in window.findChildren(QLabel):
            estilo = tag.styleSheet()
            if not estilo:
                continue
            for token in estilo.replace(",", " ").replace(";", " ").split():
                if not token.startswith("#"):
                    continue
                if token.upper() not in permitidos:
                    problemas.append(
                        f"{theme_id}: {type(tag).__name__}"
                        f"/{tag.objectName() or '?'} usa {token} "
                        f"(texto={tag.text()[:24]!a})"
                    )

        window.close()

    print(f"{len(problemas)} etiqueta(s) con color de otro tema")
    for p in problemas[:12]:
        print(f"  - {p}")
    return 1 if problemas else 0


if __name__ == "__main__":
    raise SystemExit(main())