"""Benchmark temporal: costo de aplicar un tema segun cuantas ventanas vivas hay."""

from __future__ import annotations

import os
import time

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication

from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow


def main() -> None:
    _ = QApplication([])
    windows: list[MainWindow] = []
    for _ in range(16):
        windows.append(MainWindow())
        before = time.perf_counter()
        windows[0].apply_theme(th.MODERN)
        print(f"ventanas vivas={len(windows):>3}  apply_theme={time.perf_counter() - before:6.3f}s")


if __name__ == "__main__":
    main()

