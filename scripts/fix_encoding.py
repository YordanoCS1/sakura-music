"""Repara el doble-codificado UTF-8 que dejó una escritura con otra codificación."""

from __future__ import annotations

import sys
from pathlib import Path

# Secuencias tipicas de texto UTF-8 leido como latin-1/cp1252 y reescrito.
MOJIBAKE = ("Â·", "Ã¡", "Ã©", "Ã­", "Ã³", "Ãº", "Ã±", "Ã", "Â", "â€")


def repair(text_value: str) -> str:
    """Deshace el doble encodeo solo si el resultado sigue siendo UTF-8 valido.

    El fallo tipico es `Set-Content` / `WriteAllText` leyendo UTF-8 como
    latin-1: `·` (0xC3 0xB7) se vuelve 'Ã·' y al reescribir queda 0xC3 0x83 0xC2 0xB7.
    """
    if not any(m in text_value for m in MOJIBAKE):
        return text_value

    for codificacion in ("latin-1", "cp1252"):
        try:
            return text_value.encode(codificacion).decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            continue
    return text_value


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else ".")
    corregidos = 0

    for file in sorted(root.rglob("*.py")):
        if ".venv" in file.parts or "node_modules" in file.parts:
            continue

        text_value = file.read_text(encoding="utf-8")
        arreglado = repair(text_value)

        if arreglado != text_value:
            file.write_text(arreglado, encoding="utf-8")
            print(f"reparado: {file}")
            corregidos += 1

    print(f"\n{corregidos} archivo(s)")


if __name__ == "__main__":
    main()