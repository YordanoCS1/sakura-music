"""Cierra la app como lo haria un usuario y mide si responde.

Tres detalles que hay que respetar, porque los tresUEDEN hacer fallar la prueba
sin que la app tenga nada malo:

1. Se manda `WM_SYSCOMMAND`/`SC_CLOSE`, que es lo que envian el boton X y Alt+F4.
   `WM_CLOSE` directo no es lo que hace un usuario.
2. Se manda con `SendMessageTimeoutW` (sincronico) y no con `PostMessageW`. Con
   `PostMessage` el mensaje queda en la cola y puede perderse si la ventana aun
   no arranco su event loop; con `SendMessage` esta llamada no vuelve hasta que
   la app lo atendio, asi que no hay carrera.
3. La ventana se busca por PID. Si se busca solo por titulo, el script puede
   mandarle el cierre a una app vieja que quedo de una corrida anterior.
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

WINDOW_TITLE = "Sakura Music"

WM_SYSCOMMAND = 0x0112
SC_CLOSE = 0xF060
WM_CLOSE = 0x0010
SMTO_ABORTIFHUNG = 0x0002

TIMEOUT_ARRANQUE = 25.0
TIMEOUT_CIERRE = 20.0
TIMEOUT_MESSAGE_MS = 8000

# La ventana se hace visible en `window.show()`, que corre justo antes de
# `app.exec()`. Un cierre que llega en esa ventana no lo atiende Qt todavia y la
# app se queda viva. Se espera a que el arranque se acomode antes de cerrar.
WAIT_STABILIZE = 1.5

user32 = ctypes.windll.user32


def _configurar_user32() -> None:
    """Sin esto, un LRESULT de 64 bits vuelve truncado a 32."""
    user32.SendMessageTimeoutW.restype = wintypes.LPARAM
    user32.SendMessageTimeoutW.argtypes = (
        wintypes.HWND, wintypes.UINT, wintypes.WPARAM, wintypes.LPARAM,
        wintypes.UINT, wintypes.UINT, ctypes.POINTER(ctypes.c_size_t),
    )


def windows(pid: int) -> list[tuple[int, str, str, bool]]:
    """(hwnd, titulo, clase, visible) de las ventanas de nivel superior de `pid`."""
    title_text = ctypes.create_unicode_buffer(256)
    clase = ctypes.create_unicode_buffer(256)
    found: list[tuple[int, str, str, bool]] = []

    def callback(hwnd, _lparam):
        wpid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(wpid))
        if wpid.value != pid:
            return True
        user32.GetWindowTextW(hwnd, title_text, 256)
        user32.GetClassNameW(hwnd, clase, 256)
        found.append((hwnd, title_text.value, clase.value, bool(user32.IsWindowVisible(hwnd))))
        return True

    enumproc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)(callback)
    user32.EnumWindows(enumproc, 0)
    return found


def huerfanos() -> list[int]:
    """PIDs con una ventana visible de la app, de cualquier proceso."""
    buffer = ctypes.create_unicode_buffer(256)
    pids: list[int] = []

    def callback(hwnd, _lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        if user32.GetWindowTextW(hwnd, buffer, 256) and buffer.value == WINDOW_TITLE:
            pid = wintypes.DWORD()
            user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
            pids.append(pid.value)
        return True

    enumproc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)(callback)
    user32.EnumWindows(enumproc, 0)
    return pids


def wait_window(pid: int, process, timeout_s: float) -> int:
    """Espera la ventana *de ese proceso*, no cualquier otra con el mismo titulo."""
    limite = time.time() + timeout_s
    while time.time() < limite:
        if process is not None and process.poll() is not None:
            return 0
        for hwnd, title_text, _clase, visible in windows(pid):
            if visible and title_text == WINDOW_TITLE:
                return hwnd
        time.sleep(0.1)
    return 0


def request_cierre(hwnd: int, pid: int) -> tuple[bool, int, bool]:
    """Cierra la ventana y espera a que la app lo atienda.

    Qt recrea la ventana nativa despues de `show()`, asi que el hwnd puede
    quedar obsoleto: `SendMessageTimeoutW` a un handle muerto devuelve 0 sin
    avisar y la app sigue viva sin haber recibido nada. Se revalida el handle y,
    si cambio, se reintenta contra el nuevo.

    Devuelve (atendido, hwnd_usado, cambio_el_handle).
    """
    for intento in range(3):
        if not user32.IsWindow(hwnd):
            hwnd = wait_window(pid, None, 2.0)  # type: ignore[arg-type]
            if not hwnd:
                continue

        result = ctypes.c_size_t(0)
        if user32.SendMessageTimeoutW(
            hwnd, WM_CLOSE, 0, 0,
            SMTO_ABORTIFHUNG, TIMEOUT_MESSAGE_MS, ctypes.byref(result),
        ):
            return True, hwnd, intento > 0

        # No atendio: puede ser el handle viejo. Se busca el actual.
        current = wait_window(pid, None, 2.0)  # type: ignore[arg-type]
        if current and current != hwnd:
            hwnd = current

    return False, hwnd, True


def main() -> int:
    utf8_console()
    os.environ.pop("QT_QPA_PLATFORM", None)
    _configurar_user32()

    previous = huerfanos()
    if previous:
        print(f"ATENCION: {len(previous)} app(s) vieja(s) abierta(s): {previous}")
        for pid in previous:
            subprocess.run(["taskkill", "/PID", str(pid), "/F"], capture_output=True)
        time.sleep(1)

    root = Path(__file__).resolve().parent.parent
    start = time.perf_counter()
    process = subprocess.Popen(
        [sys.executable, "-m", "sakura"],
        cwd=root,
        env=os.environ.copy(),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    hwnd = wait_window(process.pid, process, TIMEOUT_ARRANQUE)
    if not hwnd:
        print("no aparecio la ventana")
        process.kill()
        return 1

    print(f"ventana del proceso {process.pid} en {time.perf_counter() - start:.1f}s")
    time.sleep(WAIT_STABILIZE)

    atendido, hwnd_used, cambio = request_cierre(hwnd, process.pid)
    if not atendido:
        print("la app no atendio el WM_CLOSE")
    elif cambio:
        print(f"WM_CLOSE atendido (el handle habia cambiado a {hwnd_used})")
    else:
        print("WM_CLOSE atendido")

    try:
        _, err = process.communicate(timeout=TIMEOUT_CIERRE)
    except subprocess.TimeoutExpired:
        print(f"NO CERRO en {TIMEOUT_CIERRE}s")
        for h, title_text, clase, visible in windows(process.pid):
            print(f"  sigue viva: hwnd={h} clase={clase} visible={visible} titulo={title_text!r}")
        traza = root / "close_hang.txt"
        if traza.exists() and traza.stat().st_size:
            print("--- pila del proceso colgado (SAKURA_TRACE=1) ---")
            print(traza.read_text(encoding="utf-8")[:2000])
        process.kill()
        return 1

    total = time.perf_counter() - start
    print(f"exit={process.returncode} a los {total:.1f}s")

    if err.strip():
        print("--- stderr ---")
        print(err.strip()[:800])
        return 1

    if huerfanos():
        print("ATENCION: quedo una ventana huerfana")
        return 1

    print("OK: cerro limpio, sin stderr y sin huerfanos")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())