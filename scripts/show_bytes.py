"""Muestra los bytes reales de las lineas sospechosas de doble codificacion."""

from __future__ import annotations

import sys
from pathlib import Path

TARGET = "pistas"


def main() -> None:
    file = Path(sys.argv[1])
    for number, line in enumerate(file.read_text(encoding="utf-8").splitlines(), 1):
        if TARGET in line or "setPlaceholderText" in line or "Título se estira" in line:
            print(f"{number}: {line!r}")
            print(f"    bytes: {line.encode('utf-8')!r}")
            print()


if __name__ == "__main__":
    main()