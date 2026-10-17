"""La animacion de arranque con la flor de cerezo."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtWidgets import QWidget

from sakura.app import _splash_enabled
from sakura.ui import theme as th
from sakura.ui.splash import DURATION_MS, FADE_MS, HEIGHT, WIDTH, SakuraSplash


class _Clock:
    """Reloj de mentira: los tests controlan cuanto paso sin esperar de verdad."""

    def __init__(self) -> None:
        self.value = 0

    def start(self) -> None:
        pass

    def elapsed(self) -> int:
        return self.value


def _splash() -> SakuraSplash:
    splash = SakuraSplash(th.active())
    splash._started = True
    splash._clock = _Clock()
    return splash


def test_la_pantalla_tiene_tamano_fijo_y_fondo_transparente(qapp) -> None:
    splash = _splash()
    assert splash.size() == QSize(WIDTH, HEIGHT)
    assert splash.testAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)


def test_se_desvanece_y_se_cierra_al_terminar(qapp) -> None:
    splash = _splash()
    splash._timer.start()

    splash._clock.value = DURATION_MS + FADE_MS // 2
    splash._tick()
    assert splash.windowOpacity() < 1.0, "a mitad del desvanecido ya bajo la opacidad"
    assert splash._timer.isActive(), "todavia no termino"

    splash._clock.value = DURATION_MS + FADE_MS + 10
    splash._tick()
    assert splash._timer.isActive() is False, "al terminar suelta el timer"


def test_release_guarda_la_ventana_para_darle_el_foco(qapp) -> None:
    splash = _splash()
    window = QWidget()
    splash.release(window)
    assert splash._window is window


def test_sin_pantalla_real_no_hay_animacion(monkeypatch) -> None:
    monkeypatch.delenv("SAKURA_NO_SPLASH", raising=False)
    monkeypatch.setenv("QT_QPA_PLATFORM", "offscreen")
    assert _splash_enabled() is False


def test_se_puede_desactivar_con_la_variable_de_entorno(monkeypatch) -> None:
    monkeypatch.delenv("QT_QPA_PLATFORM", raising=False)
    monkeypatch.setenv("SAKURA_NO_SPLASH", "1")
    assert _splash_enabled() is False


def test_activa_con_pantalla_real(monkeypatch) -> None:
    monkeypatch.delenv("SAKURA_NO_SPLASH", raising=False)
    monkeypatch.setenv("QT_QPA_PLATFORM", "windows")
    assert _splash_enabled() is True
