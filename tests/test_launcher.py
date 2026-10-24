"""Launcher visual: estructura, accesos y cambio de tema en vivo."""

from __future__ import annotations

import pytest
from PySide6.QtCore import QSize, Qt
from PySide6.QtTest import QTest

from sakura.app import _launcher_enabled
from sakura.config import library_dir, load_settings
from sakura.ui import theme as th
from sakura.ui.launcher import HEIGHT, WIDTH, LauncherWindow, collect_status


@pytest.fixture()
def launcher(qapp) -> LauncherWindow:
    window = LauncherWindow()
    yield window
    window.close()


def test_el_launcher_abre_en_una_tarjeta_sin_marco_nativo(launcher) -> None:
    assert launcher.testAttribute(Qt.WidgetAttribute.WA_TranslucentBackground)
    assert launcher.size() == QSize(WIDTH, HEIGHT)
    assert launcher.header.brand.text() == "Sakura Music"
    assert launcher.surface.objectName() == "LauncherSurface"
    assert launcher.windowIcon().isNull() is False


def test_el_boton_principal_abre_en_home(launcher, qapp) -> None:
    seen: list[str] = []
    launcher.open_requested.connect(seen.append)

    launcher.open_btn.click()
    QTest.qWait(200)

    assert seen == ["home"]
    assert launcher.open_btn.isEnabled() is False


def test_las_tarjetas_abren_su_seccion(launcher, qapp) -> None:
    seen: list[str] = []
    launcher.open_requested.connect(seen.append)

    launcher.library_card.click()
    QTest.qWait(200)
    assert seen == ["library"]

    launcher._opening = False
    launcher.queue_card.click()
    QTest.qWait(200)
    assert seen == ["library", "queue"]


def test_cambiar_el_tema_actualiza_y_guarda_la_eleccion(launcher, qapp) -> None:
    original = th.active()

    launcher.theme_card.click()

    assert th.active().id != original.id
    assert launcher.theme_card.value.text() == th.active().name
    assert load_settings()["theme"] == th.active().id


def test_el_estado_inicial_muestra_biblioteca_sin_analizar(launcher) -> None:
    status = collect_status()

    assert status.library_path == library_dir()
    assert launcher.library_card.value.text() == "Sin analizar"
    assert launcher.library_card.hint.full_text().startswith("Abrí Sakura")


def test_el_launcher_se_apaga_en_offscreen_o_por_entorno(monkeypatch) -> None:
    monkeypatch.delenv("SAKURA_NO_LAUNCHER", raising=False)
    monkeypatch.delenv("QT_QPA_PLATFORM", raising=False)
    assert _launcher_enabled() is True

    monkeypatch.setenv("SAKURA_NO_LAUNCHER", "1")
    assert _launcher_enabled() is False

    monkeypatch.delenv("SAKURA_NO_LAUNCHER", raising=False)
    monkeypatch.setenv("QT_QPA_PLATFORM", "offscreen")
    assert _launcher_enabled() is False
