"""Enumera todas las ventanas de nivel superior de la app y prueba a cerrarlas.

Sirve para ver si hay mas de una ventana con el titulo "Sakura Music" (y que el
WM_CLOSE se este mandando a la equivocada) o si la ventana simply ignora el
mensaje.
"""

from __future__ import annotations

import ctypes
import os
import subprocess
import sys
import time
from ctypes import wintypes
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from _console import utf8_console

TITLE = "Sakura Music"
WM_CLOSE = 0x0010
user32 = ctypes.windll.user32


def windows(pid: int) -> list[tuple[int, str, str]]:
    buffer = ctypes.create_unicode_buffer(256)
    clase = ctypes.create_unicode_buffer(256)
    found: list[tuple[int, str, str]] = []

    def callback(hwnd, _lparam):
        wpid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(wpid))
        if wpid.value != pid:
            return True
        user32.GetWindowTextW(hwnd, buffer, 256)
        user32.GetClassNameW(hwnd, clase, 256)
        mark = "" if user32.IsWindowVisible(hwnd) else " [oculta]"
        found.append((hwnd, buffer.value, clase.value + mark))
        return True

    enumproc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)(callback)
    user32.EnumWindows(enumproc, 0)
    return found


def main() -> int:
    utf8_console()
    os.environ.pop("QT_QPA_PLATFORM", None)

    root = Path(__file__).resolve().parent.parent
    proc = subprocess.Popen(
        [sys.executable, "-m", "sakura"],
        cwd=root, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )

    limite = time.time() + 25
    while time.time() < limite and not windows(proc.pid):
        if proc.poll() is not None:
            print("la app murio al arrancar")
            return 1
        time.sleep(0.2)
    time.sleep(1.5)

    print(f"proceso {proc.pid}, ventanas de nivel superior:")
    for hwnd, title_text, clase in windows(proc.pid):
        print(f"  hwnd={hwnd} clase={clase!r} titulo={title_text!r}")

    print("\nenviando WM_CLOSE a cada una...")
    for hwnd, _title, _ in windows(proc.pid):
        user32.PostMessageW(hwnd, WM_CLOSE, 0, 0)

    try:
        _, err = proc.communicate(timeout=15)
        print(f"salio con codigo {proc.returncode}")
        if err.strip():
            print("stderr:", err.strip()[:400])
        return 0
    except subprocess.TimeoutExpired:
        print("SIGUE VIVO: ninguna ventana respondio al WM_CLOSE")
        for hwnd, title_text, _clase in windows(proc.pid):
            print(f"  sigue abierta hwnd={hwnd} titulo={title_text!r}")
        proc.kill()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())