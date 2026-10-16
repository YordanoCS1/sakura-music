"""Comprueba si el sistema tiene fuentes para coreano, japones y chino.

El plugin offscreen no expone las fuentes instaladas, asi que esto corre con
la plataforma real, igual que la app.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console
from PySide6.QtGui import QFontDatabase, QRawFont
from PySide6.QtWidgets import QApplication

# Caracteres de prueba: coreano, japones y chino.
MUESTRAS = {
    "coreano": "안녕하세요 너는 나의",
    "japones": "こんにちは usted",
    "chino": "你好世界",
    "cirílico": "Привет мир",
    "acento": "áéíóúñü",
}


def main() -> int:
    utf8_console()
    app = QApplication(sys.argv)

    familias = QFontDatabase.families()
    print(f"fuentes instaladas: {len(familias)}")

    expected_values = [
        "Malgun Gothic", "맑은 고딕", "Gulim", "Batang",
        "Yu Gothic", "Meiryo", "MS Gothic", "Noto Sans CJK", "Noto Sans KR",
        "SimSun", "Microsoft YaHei", "Segoe UI", "Arial",
    ]
    print("\nfuentes conasianas instaladas:")
    found = []
    for name_text in expected_values:
        if name_text in familias:
            found.append(name_text)
            print(f"   OK  {name_text}")
    if not found:
        print("   ninguna de las esperadas")

    # Prueba real: renderizar cada muestra y ver si sale glifo o caja.
    print("\ncaracteres que la fuente por defecto no puede dibujar:")
    source_name = app.font()
    print(f"   fuente de la app: {source_name.family()}")

    missing = []
    for name_text, text_value in MUESTRAS.items():
        raw = QRawFont.fromFont(source_name)
        ausentes = [c for c in text_value if not raw.supportsCharacter(ord(c))]
        if ausentes:
            missing.append(name_text)
            print(f"   {name_text}: {len(ausentes)}/{len(text_value)} sin glifo -> "
                  f"{''.join(ausentes[:6])}")
        else:
            print(f"   {name_text}: OK, todos los glifos presentes")

    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())