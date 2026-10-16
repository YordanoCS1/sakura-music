"""Configuracion compartida de los tests."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

# Los tests corren sin pantalla: hay que fijarlo antes de importar QtWidgets.
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtWidgets import QApplication

from sakura import config


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    app = QApplication.instance() or QApplication([])
    yield app


@pytest.fixture(scope="session")
def app_dir(tmp_path_factory: pytest.TempPathFactory) -> Path:
    """Carpeta de datos de la app para toda la corrida, no la del usuario.

    Es de sesion y no de test para que la cache de portadas se reutilice dentro
    de la corrida: regenerar cada caratula en cada test casi duplica el tiempo
    de la suite.
    """
    return tmp_path_factory.mktemp("SakuraMusic")


@pytest.fixture(autouse=True)
def app_dir_aislada(app_dir: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Ni lee ni escribe los datos reales de la app instalada.

    No es teorico: con `nav_layout: "top"` guardado en el `config.json` del
    usuario, `test_main_window` fallaba en las tres paginas donde la barra
    superior tiene que esconderse, y cualquier test que guarde ajustes dejaba
    la instalacion de quien lo corre cambiada.

    `_base_dir` es la cache de `config.base_dir()`. Fijarla alcanza para que
    `data_dir()`, `music_dir()` y `config_file()` apunten todas ahi.
    """
    monkeypatch.setattr(config, "_base_dir", app_dir)
    # Cada test arranca con los valores por defecto: un ajuste guardado en un
    # test no puede cambiar el resultado del siguiente.
    config.config_file().unlink(missing_ok=True)
    # La cola de descargas tambien se persiste. `app_dir` es de sesion para no
    # regenerar portadas en cada test, pero entonces una descarga fallida de un
    # test se leia en el siguiente: Inicio contaba errores que otro test habia
    # dejado, y `test_main_window` fallaba solo en la suite completa.
    config.download_queue_file().unlink(missing_ok=True)
    return app_dir
