"""Crea el acceso directo de Sakura Music con el icono propio.

Windows no permite embeber un icono en un `.pyw`: el icono del explorador sale
de la asociacion de `pythonw.exe`. Un acceso directo `.lnk` si puede apuntar a
`pythonw.exe` y llevar `resources/SakuraMusic.ico`, asi que ese es el camino.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ICONO = ROOT / "resources" / "SakuraMusic.ico"
SCRIPT = ROOT / "SakuraMusic.pyw"


def _pythonw() -> Path:
    local = Path(sys.executable).with_name("pythonw.exe")
    if local.exists():
        return local
    encontrado = shutil.which("pythonw")
    if encontrado:
        return Path(encontrado)
    raise SystemExit("No se encontro pythonw.exe; instala Python para Windows")


def _crear(ruta: Path, pythonw: Path) -> None:
    ps = (
        "$ws = New-Object -ComObject WScript.Shell; "
        f"$lnk = $ws.CreateShortcut('{ruta}'); "
        f"$lnk.TargetPath = '{pythonw}'; "
        f"$lnk.Arguments = '\"{SCRIPT}\"' ; "
        f"$lnk.WorkingDirectory = '{ROOT}'; "
        f"$lnk.IconLocation = '{ICONO}'; "
        "$lnk.Description = 'Sakura Music'; "
        "$lnk.WindowStyle = 1; "
        "$lnk.Save()"
    )
    resultado = subprocess.run(
        [
            "powershell.exe",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            ps,
        ],
        capture_output=True,
        text=True,
    )
    if resultado.returncode != 0:
        mensaje = resultado.stderr.strip() or resultado.stdout.strip()
        raise SystemExit(mensaje or "no se pudo crear el acceso directo")


def main() -> int:
    if not ICONO.exists():
        raise SystemExit("Falta resources/SakuraMusic.ico; corre scripts/make_app_icon.py")
    if not SCRIPT.exists():
        raise SystemExit("Falta SakuraMusic.pyw")

    pythonw = _pythonw()
    escritorio = Path(os.environ.get("USERPROFILE", str(Path.home()))) / "Desktop"
    menu = (
        Path(os.environ.get("APPDATA", str(Path.home())))
        / "Microsoft"
        / "Windows"
        / "Start Menu"
        / "Programs"
    )
    rutas = (escritorio / "Sakura Music.lnk", menu / "Sakura Music.lnk")
    for ruta in rutas:
        ruta.parent.mkdir(parents=True, exist_ok=True)
        _crear(ruta, pythonw)
        print(f"acceso directo: {ruta}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
