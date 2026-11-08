"""Configuracion compartida de los tests."""

from __future__ import annotations

import os
from pathlib import Path

import pytest

# Los tests corren sin pantalla: hay que fijarlo antes de importar QtWidgets.
os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")

from PySide6.QtCore import QCoreApplication, QEvent
from PySide6.QtWidgets import QApplication

from sakura import config


@pytest.fixture(scope="session")
def qapp() -> QApplication:
    app = QApplication.instance() or QApplication([])
    yield app


@pytest.fixture(autouse=True)
def borra_widgets_diferidos(qapp: QApplication) -> None:
    """`deleteLater()` sin bucle de eventos no borra nada y las ventanas se acumulan.

    Varios fixtures cierran una `MainWindow` y llaman `deleteLater()`, pero
    `processEvents()` no procesa los borrados diferidos. Sin este empujon, cada
    test dejaba viva la ventana anterior: el QSS global se reaplicaba a todas y
    el final de la suite se volvia cuadratico.
    """
    yield
    QCoreApplication.sendPostedEvents(None, QEvent.Type.DeferredDelete)
    qapp.processEvents()


def _destruye_ventanas(qapp: QApplication) -> None:
    """Cierra y destruye lo que el test dejo vivo, con Qt todavia en pie.

    Un lambda conectado a una senal mantiene una referencia fuerte a su widget.
    Si esa ventana sobrevive hasta el apagado del interprete, Shiboken libera el
    objeto cuando Qt ya no existe y el proceso aborta con un access violation
    (la suite "pasa" pero sale con 0xC0000409). Cerrarlas aca evita esa carrera.

    Las `MainWindow` se apagan primero: sus servicios tienen QThreads y borrar
    la ventana con un hilo corriendo tambien termina en aborto.
    """
    from sakura.ui.main_window import MainWindow

    for widget in qapp.topLevelWidgets():
        if isinstance(widget, MainWindow):
            widget.shutdown()
    for widget in qapp.topLevelWidgets():
        widget.close()
        widget.deleteLater()


@pytest.fixture(scope="session", autouse=True)
def limpia_qt_al_final(qapp: QApplication) -> None:
    """Suelta los objetos Qt que sobreviven a los tests, antes de apagar Qt.

    El cache de `QSvgRenderer` de `icons` es global. Si se destruye despues de
    `QApplication`, el proceso puede abortar al salir. Este barrido corre antes
    que el teardown de `qapp` (por eso depende de el) y deja la salida limpia.
    """
    yield
    from sakura.ui import icons

    icons._SVG_CACHE.clear()
    _destruye_ventanas(qapp)
    QCoreApplication.sendPostedEvents(None, QEvent.Type.DeferredDelete)
    qapp.processEvents()


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
    config.download_history_file().unlink(missing_ok=True)
    return app_dir


@pytest.fixture(autouse=True)
def iconos_sin_overrides() -> None:
    """Los overrides de iconos son estado global del modulo: no deben filtrarse.

    Un test que reemplace un icono por un PNG dejaria su override puesto para el
    siguiente, y cualquier test que compare pixmaps fallaria por un motivo ajeno.
    """
    from sakura.ui import icons

    icons.clear_overrides()
    yield
    icons.clear_overrides()


@pytest.fixture(autouse=True)
def tema_activo_aislado() -> None:
    """El tema activo y el QSS global no pueden filtrarse entre tests.

    Varios tests aplican disenos en vivo sobre la `QApplication`. Si uno deja
    activo un diseno con titulares en mayuscula o serif, tanto el QSS como las
    metricas de texto del siguiente test cambian y aparecen fallas ajenas. Se
    restaura el estado previo (que suele ser sin QSS) y no uno fijo.
    """
    from PySide6.QtWidgets import QApplication

    from sakura.ui import theme as th

    app = QApplication.instance()
    original = th.active()
    qss = app.styleSheet() if app is not None else ""
    yield
    th.set_active(original)
    if app is not None:
        app.setStyleSheet(qss)
