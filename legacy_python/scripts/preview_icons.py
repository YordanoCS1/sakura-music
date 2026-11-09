"""Renderiza todos los iconos en una hoja de contactos para inspeccion visual."""

import sys

from PySide6.QtGui import QColor, QPainter, QPixmap
from PySide6.QtWidgets import QApplication

sys.path.insert(0, ".")
from sakura.ui import icons

COLOR = "#FF4D8D"


def main() -> None:
    QApplication([])
    names = list(icons._PATHS)
    cols, cell, glyph = 8, 96, 48
    rows = (len(names) + cols - 1) // cols

    sheet = QPixmap(cols * cell, rows * cell)
    sheet.fill(QColor("#0B0B0F"))

    painter = QPainter(sheet)
    empty: list[str] = []
    for index, name in enumerate(names):
        px = icons._render(name, COLOR, glyph)
        image = px.toImage()
        painted = sum(
            1
            for y in range(0, image.height(), 2)
            for x in range(0, image.width(), 2)
            if image.pixelColor(x, y).alpha() > 0
        )
        if painted < 4:
            empty.append(name)
        x = (index % cols) * cell + (cell - glyph) // 2
        y = (index // cols) * cell + (cell - glyph) // 2
        painter.drawPixmap(x, y, px)
    painter.end()

    sheet.save("preview_icons.png")
    print(f"iconos: {len(names)}")
    print(f"vacios: {empty or 'ninguno'}")


if __name__ == "__main__":
    main()