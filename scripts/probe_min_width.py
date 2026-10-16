"""Dice qué widget impone el ancho mínimo de un diálogo.

Útil cuando un `resize()` del constructor no se respeta: siempre hay un hijo con
un `minimumSizeHint` más ancho que la ventana que se pidió.
"""

from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console
from PySide6.QtWidgets import QApplication, QWidget


def main() -> int:
    utf8_console()

    from sakura.ui import theme as th
    from sakura.ui.widgets.metadata_editor import MetadataEditor

    app = QApplication([])
    th.set_active(th.MODERN)
    app.setStyleSheet(th.build_qss(th.MODERN))

    root = Path(tempfile.mkdtemp())
    (root / "x.mp3").write_bytes(b"x" * 100)

    dialog = MetadataEditor(root / "x.mp3")
    dialog.show()
    app.processEvents()

    minimum = dialog.minimumSizeHint()
    print(f"dialogo: minimo={minimum.width()}x{minimum.height()}  real={dialog.width()}")

    print("\nwidgets con el minimumSizeHint mas ancho:")
    hijos = sorted(
        dialog.findChildren(QWidget),
        key=lambda w: w.minimumSizeHint().width(),
        reverse=True,
    )
    for hijo in hijos[:12]:
        text_value = ""
        if hasattr(hijo, "text"):
            try:
                text_value = str(hijo.text())[:30]  # type: ignore[attr-defined]
            except TypeError:
                text_value = ""
        print(
            f"  {hijo.minimumSizeHint().width():5d}  {type(hijo).__name__:20} "
            f"objName={hijo.objectName()!r:16} {text_value!r}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())