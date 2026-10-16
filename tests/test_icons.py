"""Los iconos deben renderizar pixeles reales, no lienzos vacios."""

from __future__ import annotations

import re

import pytest

from sakura.ui import icons

# Lladas que toman el nombre del icono como primer argumento literal.
ICON_CALL_RE = re.compile(
    r'(?:IconButton|icons\.icon|icons\.render)\(\s*"([a-z][a-z-]*)"'
)


def _painted(pixmap) -> int:
    image = pixmap.toImage()
    return sum(
        1
        for y in range(0, image.height(), 2)
        for x in range(0, image.width(), 2)
        if image.pixelColor(x, y).alpha() > 0
    )


@pytest.mark.parametrize("name", sorted(icons._PATHS))
def test_icono_dibuja_algo(qapp, name: str) -> None:
    assert _painted(icons.render(name, "#FFFFFF", 48)) > 8, f"{name} salio vacio"


def test_todo_icono_usado_por_la_ui_existe() -> None:
    """Verifica que cada icono este definido, escaneando el codigo de la UI.

    Un chequeo solo del menu lateral se habria dejado pasar `restore`, que solo
    se usa al maximizar la ventana.
    """
    from pathlib import Path

    import sakura.ui
    from sakura.ui.widgets.sidebar import NAV_ITEMS

    root = Path(sakura.ui.__file__).parent
    usados: set[str] = set()
    for file in root.rglob("*.py"):
        usados.update(ICON_CALL_RE.findall(file.read_text(encoding="utf-8")))

    # La barra lateral y el boton de mute resuelve el nombre en tiempo de
    # ejecucion (`setProperty("iconName", ...)`), asi que se agregan a mano.
    usados.update(key for key, _ in NAV_ITEMS)
    usados.update({"settings", "mute"})

    assert usados, "el escaner no encontro ninguna llamada; el regex esta roto"

    inexistentes = usados - set(icons._PATHS) - icons._SAKURA
    assert not inexistentes, f"iconos referenciados pero no definidos: {inexistentes}"


@pytest.mark.parametrize("name", sorted(icons._SAKURA))
def test_el_icono_sakura_dibuja_algo(qapp, name: str) -> None:
    """La flor tiene que pintar pixeles a todos los tamanos que se usan."""
    for size in (13, 16, 18, 24, 48, 128):
        pixmap = icons.render(name, "#FF5DA8", size)
        assert pixmap.width() == size * 2, f"{name} no respeta el tamano logico"
        assert _painted(pixmap) > 8, f"{name} salio vacio a {size}px"


def test_el_logo_sakura_se_ve_a_tamano_grande(qapp) -> None:
    """El logo completo tiene halo y petalos caidos: no puede ser la flor simple."""
    from sakura.ui import sakura as flor

    simple = _painted(flor.render("#FF5DA8", 96))
    logo = _painted(flor.render_logo("#FF5DA8", 96, halo="#121625"))
    assert logo > simple * 1.1, "el logo deberia tener mas pixeles que la flor sola"


def test_todo_icono_definido_se_puede_dibujar(qapp) -> None:
    """Ningun path SVG puede quedar mal formado."""
    for name in icons._PATHS:
        render = icons._renderer(name, "#FFFFFF", 2.0)
        assert render.isValid(), f"{name} genero un SVG invalido"


def test_icono_desconocido_falla(qapp) -> None:
    with pytest.raises(KeyError):
        icons.icon("no-existe", "#FFFFFF")