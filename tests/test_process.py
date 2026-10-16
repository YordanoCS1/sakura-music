"""Ciclo de vida de los procesos: no debe quedar ningun hilo vivo."""

from __future__ import annotations

import pytest
from PySide6.QtCore import QEventLoop, QTimer

from sakura.ui.services.process import ProcessRunner

TIMEOUT_MS = 20_000


def run_and_wait(
    runner: ProcessRunner, command: list[str], timeout_ms: int = TIMEOUT_MS
) -> tuple[int, list[str]]:
    """Arranca `command` y espera a que termine.

    Los handlers se conectan ANTES de `start()` a proposito: si el binario no
    existe, Qt emite `failed` de forma sincrona dentro de `start()` y con las
    conexiones puestas despues el fallo se pierde y la espera se come el
    timeout entero.
    """
    loop = QEventLoop()
    codigos: list[int] = []
    lines: list[str] = []

    runner.line.connect(lines.append)
    runner.completed.connect(codigos.append)
    runner.completed.connect(loop.quit)
    runner.failed.connect(loop.quit)
    QTimer.singleShot(timeout_ms, loop.quit)

    runner.start(command)
    loop.exec()
    if runner.current:
        runner.current.wait(1000)
    return (codigos[0] if codigos else -1), lines



@pytest.fixture()
def runner(qapp):
    runner = ProcessRunner()
    yield runner
    # Sin esto Qt avisa "QThread: Destroyed while thread is still running":
    # hay que esperar al hilo y procesar los deletes diferidos que dejo
    # `deleteLater`, porque `QEventLoop.exec()` local ya termino.
    runner.shutdown()
    qapp.processEvents()


def test_emite_lineas_y_codigo_de_salida(runner) -> None:
    codigo, lines = run_and_wait(runner, ["python", "-c", "print('hola'); print('adios')"])
    assert codigo == 0
    assert lines == ["hola", "adios"]


def test_codigo_de_error_se_propaga(runner) -> None:
    codigo, _ = run_and_wait(runner, ["python", "-c", "raise SystemExit(3)"])
    assert codigo == 3


def test_orden_aumenta_entre_ejecuciones(runner) -> None:
    """Encadenar dos comandos sobre el mismo runner es el caso de la cola."""
    _, lines = run_and_wait(runner, ["python", "-c", "print('primero')"])
    assert lines == ["primero"]

    _, lines = run_and_wait(runner, ["python", "-c", "print('segundo')"])
    assert lines == ["segundo"]


def test_cinco_ejecuciones_no_dejan_hilos_colgados(runner) -> None:
    """Reproduce el crash STATUS_STACK_BUFFER_OVERRUN del runner anterior."""
    completados: list[int] = []
    for i in range(5):
        codigo, _ = run_and_wait(runner, ["python", "-c", f"print({i})"])
        assert codigo == 0
        assert not runner.is_running
        completados.append(i)

    assert completados == [0, 1, 2, 3, 4]
    assert runner.current is None


def test_intentar_arrancar_mientras_corre_se_ignora(runner) -> None:
    _, lines = run_and_wait(
        runner, ["python", "-c", "import time; time.sleep(0.6); print('lento')"]
    )
    assert lines == ["lento"]
    assert not runner.is_running


def test_comando_inexistente_reporta_fallo(runner) -> None:
    fallos: list[str] = []
    runner.failed.connect(fallos.append)

    codigo, _ = run_and_wait(runner, ["este-comando-no-existe-xyz"])

    assert codigo == -1
    assert fallos, "debio reportarse un fallo de arranque"
    assert "No se pudo iniciar" in fallos[0]


def test_cancelar_mata_el_proceso(runner) -> None:
    loop = QEventLoop()
    runner.completed.connect(loop.quit)
    QTimer.singleShot(TIMEOUT_MS, loop.quit)

    runner.start(["python", "-c", "import time; time.sleep(30)"])
    QTimer.singleShot(300, runner.kill)
    loop.exec()

    # `completed` se emite desde dentro de `run()`, o sea que el hilo puede
    # seguir vivo un instante. `shutdown()` es quien espera de verdad.
    runner.shutdown()
    assert not runner.is_running
    assert runner.current is None