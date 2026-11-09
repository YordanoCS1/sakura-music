"""Lista las lineas de un archivo con caracteres no-ASCII sospechosos.

Escribe a un archivo porque la consola de Windows no siempre puede imprimirlos.
"""

from __future__ import annotations

import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    salida = root / "mojibake_report.txt"

    lines = []
    for relativo in sys.argv[1:]:
        file_path = root / relativo
        text_value = file_path.read_text(encoding="utf-8", errors="replace")
        lines.append(f"=== {relativo} ===")
        for number, line in enumerate(text_value.splitlines(), 1):
            if not any(ord(c) > 127 for c in line):
                continue
            marcas = [f"U+{ord(c):04X}" for c in line if ord(c) > 127]
            lines.append(f"{number:5}  {' '.join(marcas)}")
            lines.append(f"       {line.strip()[:78]!a}")
        lines.append("")

    salida.write_text("\n".join(lines), encoding="utf-8")
    print(f"informe en {salida.name} ({len(lines)} lineas)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())