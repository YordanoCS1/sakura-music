"""Doble clic de Windows: abre Sakura Music sin consola visible.

`.pyw` hace que Python use `pythonw.exe`, el ejecutable que no abre una ventana
de consola. La pantalla visual del launcher es parte de `sakura.app`.
"""

from __future__ import annotations

from sakura.app import main


if __name__ == "__main__":
    raise SystemExit(main())
