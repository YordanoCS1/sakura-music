"""Interruptor del tema ambiente en Ajustes."""

from __future__ import annotations

from sakura.config import load_settings
from sakura.ui.pages.settings import SettingsPage


def test_el_interruptor_guarda_el_ajuste_y_avisa(qapp) -> None:
    page = SettingsPage()
    avisos: list[bool] = []
    page.ambient_changed.connect(avisos.append)

    page.ambient_box.setChecked(False)

    assert load_settings()["ambient_theme"] is False
    assert avisos == [False]


def test_el_interruptor_arranca_encendido_por_defecto(qapp) -> None:
    page = SettingsPage()

    assert page.ambient_box.isChecked()
