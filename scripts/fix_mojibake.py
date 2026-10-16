"""Repara mojibake de una doble codificacion UTF-8, solo donde hace falta.

Un `Get-Content`/`WriteAllText` de PowerShell lee UTF-8 como cp1252 y lo vuelve a
escribir como UTF-8: cada caracter acentuado se parte en dos ("a" con tilde pasa a
"A" mas un signo).

No se puede dar vuelta el archivo entero con `encode('cp1252').decode('utf-8')`
porque queda mezclado: los caracteres que nunca se rompieron hacen fallar el
roundtrip. Se recorre looking for el patron y se arregla de a dos bytes.
"""

from __future__ import annotations

import sys
from pathlib import Path

# El byte UTF-8 inicial que, leido como cp1252, se vuelve U+00C2 o U+00C3.
INICIALES = ("\u00c3", "\u00c2")


def _arreglar(text_value: str) -> tuple[str, int]:
    """Devuelve el texto reparado y cuantos caracteres toco."""
    salida: list[str] = []
    i = 0
    changes = 0

    while i < len(text_value):
        if text_value[i] in INICIALES and i + 1 < len(text_value):
            par = text_value[i : i + 2]
            try:
                original = par.encode("cp1252").decode("utf-8")
            except (UnicodeEncodeError, UnicodeDecodeError):
                original = par
            if len(original) == 1:
                salida.append(original)
                i += 2
                changes += 1
                continue

        salida.append(text_value[i])
        i += 1

    return "".join(salida), changes


def main() -> int:
    root = Path(__file__).resolve().parent.parent
    informe = root / "mojibake_report.txt"
    lines: list[str] = []

    for relativo in sys.argv[1:]:
        file_path = root / relativo
        text_value = file_path.read_text(encoding="utf-8")

        reparado, changes = _arreglar(text_value)
        # Una segunda pasada por si quedaban pares anidados.
        reparado, extra = _arreglar(reparado)
        changes += extra

        if reparado != text_value:
            file_path.write_text(reparado, encoding="utf-8")

        remaining = [
            n for n, line in enumerate(reparado.splitlines(), 1) if MARKER_ACTIVE(line)
        ]
        lines.append(f"{relativo}: {changes} caracter(es) reparado(s), quedan {len(remaining)}")
        for number in remaining:
            line = reparado.splitlines()[number - 1]
            lines.append(f"    {number}: {line.strip()[:70]!a}")

    informe.write_text("\n".join(lines), encoding="utf-8")
    print(f"informe en {informe.name}")
    return 0


def MARKER_ACTIVE(line: str) -> bool:
    return any(c in line for c in INICIALES)


if __name__ == "__main__":
    raise SystemExit(main())