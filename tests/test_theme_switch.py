"""Cambiar de tema en vivo tiene que repintar todo, no solo el QSS.

Un selector de tema es decorativo si las etiquetas con estilos inline quedan
con el color del tema anterior. Este test cambia de tema en runtime y revisa
que ningun color en linea pertenezca a otro tema.
"""

from __future__ import annotations

import pytest
from PySide6.QtWidgets import QLabel

from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow

PAGINAS = ("home", "search", "library", "queue", "settings")
TEMAS = ["modern", "sakura_light", "oled", "cyberpunk", "nord"]


@pytest.fixture()
def window(qapp):
    """MainWindow que se destruye de verdad.

    `QApplication.setStyleSheet` reestiliza todos los widgets vivos: si la
    ventana queda en memoria, cada `apply_theme` siguiente paga el costo de todas
    las anteriores. Con ocho temas por test, esosonaba 30s.
    """
    win = MainWindow()
    yield win
    win.close()
    for servicio in ("scanner", "refresher"):
        getattr(win.page_map["library"], servicio).shutdown()
    win.downloads.shutdown()
    win.deleteLater()
    qapp.processEvents()


def _colores_theme(theme_name: th.Theme) -> set[str]:
    return {
        value.upper()
        for value in vars(theme_name).values()
        if isinstance(value, str) and value.startswith("#")
    }


def _colores_in_line(window) -> list[tuple[str, str]]:
    """(clase/objectName, color) de cada etiqueta con estilo inline."""
    found = []
    for tag in window.findChildren(QLabel):
        estilo = tag.styleSheet()
        if not estilo:
            continue
        for token in estilo.replace(",", " ").replace(";", " ").split():
            if token.startswith("#") and len(token) == 7:
                found.append((type(tag).__name__, token.upper()))
    return found


@pytest.mark.parametrize("theme_id", TEMAS)
def test_cambiar_de_tema_no_deja_colores_viejos(window, theme_id: str) -> None:
    """El bug era el titulo de la barra lateral: se armaba una sola vez."""
    window.apply_theme(th.get_theme("modern"))
    window.apply_theme(th.get_theme(theme_id))

    # No se recorren las paginas a proposito: `show_page("library")` dispara el
    # escaneo de la carpeta real y cada test tardaba medio minuto.
    permitidos = _colores_theme(th.get_theme(theme_id))
    ajenos = [
        (clase, color)
        for clase, color in _colores_in_line(window)
        if color not in permitidos
    ]

    assert not ajenos, f"{theme_id}: quedaron colores del tema anterior: {ajenos[:5]}"


def test_la_barra_lateral_se_recolorea(window) -> None:
    """El caso concreto que estaba roto."""
    light = th.get_theme("sakura_light")
    window.apply_theme(light)
    assert light.text in window.sidebar._brand_title.styleSheet().upper()

    dark = th.get_theme("oled")
    window.apply_theme(dark)
    assert dark.text in window.sidebar._brand_title.styleSheet().upper()
    assert light.text not in window.sidebar._brand_title.styleSheet().upper()


@pytest.mark.parametrize("theme_id", TEMAS)
def test_cada_tema_se_puede_aplicar_y_volver(window, theme_id: str) -> None:
    """Cambiar de tema no puede romper la ventana ni dejarla sin pintar."""
    for paso in ("modern", theme_id, "modern"):
        window.apply_theme(th.get_theme(paso))

    assert th.active().id == "modern"
    assert window.windowTitle() == "Sakura Music"