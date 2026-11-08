"""Resolucion de rutas y compatibilidad con ffmpeg externo."""

from __future__ import annotations

from pathlib import Path

import pytest

from sakura import config


@pytest.fixture()
def base_real(monkeypatch: pytest.MonkeyPatch) -> Path:
    """Vuelve a la resolucion real de `base_dir()`.

    El resto de la suite corre con los datos de la app en una carpeta temporal
    (`app_dir_aislada`, en `conftest.py`); estos dos tests son justamente los
    que miden como se resuelve la ruta del sistema, asi que la piden de nuevo.
    """
    monkeypatch.setattr(config, "_base_dir", None)
    return config.base_dir()


def test_base_dir_es_visible_para_procesos_externos(base_real: Path) -> None:
    """Si %LOCALAPPDATA% esta redirigido, la base debe caer fuera de el.

    Es lo que rompe ffmpeg/ffprobe con la build de Microsoft Store de Python.
    """
    assert base_real.is_dir()
    assert config._is_shared_with_external_tools(base_real)


def test_la_base_no_esta_bajo_localappdata_redirigido(base_real: Path) -> None:
    """La ruta logica debe coincidir con la fisica, sin VirtualStore en medio."""
    probe = base_real / ".sonda-test"
    probe.write_bytes(b"ok")
    try:
        physical = Path(config._physical_path(probe))
        logical = probe
    finally:
        probe.unlink(missing_ok=True)

    assert physical.name == logical.name
    assert str(physical).lower() == str(logical).lower()
    assert "virtualstore" not in str(physical).lower()


def test_las_carpetas_de_la_app_se_crean() -> None:
    folders = (
        config.music_dir(),
        config.downloads_dir(),
        config.covers_dir(),
        config.logs_dir(),
    )
    for folder in folders:
        assert folder.is_dir()


def test_musica_y_descargas_son_distintas() -> None:
    assert config.music_dir() != config.downloads_dir()
    assert config.music_dir().is_relative_to(config.base_dir())


def test_plantilla_de_salida_incluye_artista() -> None:
    assert "uploader" in config.OUTPUT_TEMPLATE
    assert "%(title)s" in config.OUTPUT_TEMPLATE