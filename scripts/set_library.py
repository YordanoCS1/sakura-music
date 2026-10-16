"""Configura la carpeta de la biblioteca desde la linea de comandos.

El path se pasa como escapes ASCII porque la consola de Windows no siempre
manda bien los acentos y termina escribiendo una ruta que no existe.

    python scripts/set_library.py "D:\\Music\\M\\u00fasica\\idle"
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console

from sakura.config import load_settings, save_settings


def main() -> int:
    utf8_console()

    if len(sys.argv) < 2:
        print("uso: python scripts/set_library.py <carpeta>")
        print(f"actual: {load_settings()['library_folder'] or '(la de por defecto)'}")
        return 1

    # Se resuelve el texto para que `\u00fa` y una letra acentuada cruda
    # signifiquen lo mismo.
    crudo = sys.argv[1].encode("utf-8", errors="surrogateescape").decode(r"unicode_escape")
    file_path = Path(crudo)

    if not file_path.is_dir():
        print(f"no existe: {file_path}")
        return 1

    track_items = sum(1 for _ in file_path.rglob("*") if _.is_file())
    save_settings({"library_folder": str(file_path)})

    print(f"carpeta de biblioteca: {file_path}")
    print(f"archivos: {track_items}")
    print(f"configurado en: {load_settings()['library_folder']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())