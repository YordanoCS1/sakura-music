"""Renderiza la biblioteca y una ficha usando la musica real del usuario.

    python scripts/preview_real.py "D:\\Music\\M\\u00fasica\\idle"
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console
from preview_bootstrap import boot
from PySide6.QtCore import QTimer

from sakura.config import load_settings, save_settings
from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow
from sakura.ui.widgets.track_info import TrackInfoDialog


def _resolver(argumentos: list[str]) -> Path:
    if argumentos:
        crudo = argumentos[0].encode("utf-8", "surrogateescape").decode(r"unicode_escape")
        return Path(crudo)
    configurado = load_settings().get("library_folder")
    return Path(configurado) if configurado else Path(".")


def main() -> int:
    utf8_console()
    root = _resolver(sys.argv[1:])

    if not root.is_dir():
        print(f"no existe: {root}")
        print("pasala como escapes ASCII: D:\\Music\\M\\u00fasica\\idle")
        return 1

    save_settings({"library_folder": str(root)})
    print(f"biblioteca: {root}")

    app = boot()
    theme = th.MODERN
    th.set_active(theme)
    app.setStyleSheet(th.build_qss(theme))

    window = MainWindow()
    window.resize(1320, 820)
    window.show()

    library = window.page_map["library"]
    window.show_page("library")

    intentos = {"n": 0}

    def wait() -> None:
        intentos["n"] += 1
        if not len(library.model) and intentos["n"] < 80:
            QTimer.singleShot(150, wait)
            return
        capturar()

    def capturar() -> None:
        total = len(library.model)
        print(f"  pistas: {total}")
        print(f"  stats: {library.stats.text()}")

        with_cover = sum(1 for t in library.model.tracks if t.cover_path is not None)
        with_letter = sum(1 for t in library.model.tracks if t.has_lyrics)
        print(f"  con portada: {with_cover}/{total}")
        print(f"  con letra:   {with_letter}/{total}")

        window.grab().save("preview_biblioteca_real_sin_seleccion.png")
        print("  preview_biblioteca_real_sin_seleccion.png")

        window.grab().save("preview_biblioteca_real.png")
        print("  preview_biblioteca_real.png")

        # Ficha de la primera pista con letra, que es la mas interesante.
        candidatas = [t for t in library.model.tracks if t.has_lyrics]
        chosen = candidatas[0] if candidatas else library.model.track_at(0)
        if chosen is not None:
            # Seleccionar la fila para que el panel lateral muestre la portada.
            row_index = library.proxy.rowCount() - 1
            for idx in range(library.proxy.rowCount()):
                if library.proxy.track_at(idx) is chosen:
                    row_index = idx
                    break
            library.table.selectRow(row_index)
            app.processEvents()

            info = TrackInfoDialog(chosen, None)
            info.show()
            app.processEvents()
            window.grab().save("preview_biblioteca_real.png")
            print("  preview_biblioteca_real.png (con fila seleccionada)")

            info.grab().save("preview_ficha_real.png")
            print(f"  preview_ficha_real.png ({chosen.title})")
            print(f"    estado: {info.state.text()}")
            info.close()

        app.quit()

    QTimer.singleShot(200, wait)
    app.exec()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())