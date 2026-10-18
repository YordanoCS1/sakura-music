"""Disenos tematicos: presets que cambian forma y tipografia, no solo color."""

from __future__ import annotations

from dataclasses import replace

import pytest

from sakura.ui import theme as th
from sakura.ui.theme.tokens import card_fill, edge

# Los disenos elegidos, ademas de los temas de color que ya venian.
DISENOS = ["editorial", "wuxia", "fauna", "chile", "anime", "pokemon"]


def test_los_disenos_estan_registrados() -> None:
    registrados = {t.id for t in th.THEME_LIST}
    for design_id in DISENOS:
        assert design_id in registrados, f"falta el diseno {design_id}"
        assert th.get_theme(design_id).id == design_id


@pytest.mark.parametrize("design_id", DISENOS)
def test_el_diseno_genera_qss_valido(design_id: str) -> None:
    t = th.get_theme(design_id)
    qss = th.build_qss(t)
    assert t.accent in qss
    assert t.bg in qss
    assert qss.count("{") == qss.count("}")


def test_el_diseno_plano_apaga_los_degradados() -> None:
    """`flat` cambia la textura: superficies lisas en vez de degradados."""
    plano = th.get_theme("editorial")
    con_degradado = th.get_theme("modern")

    assert plano.flat
    assert card_fill(plano) == plano.surface_alt
    assert "qlineargradient" in card_fill(con_degradado)


def test_el_diseno_serif_cambia_los_titulares() -> None:
    editorial = th.get_theme("editorial")
    qss = th.build_qss(editorial)

    assert editorial.heading_family
    assert editorial.heading_family in qss
    assert "Georgia" in qss


def test_los_titulares_en_mayuscula_agregan_text_transform() -> None:
    qss = th.build_qss(th.get_theme("pokemon"))

    assert "text-transform: uppercase" in qss


def test_el_grosor_de_borde_es_un_token() -> None:
    """El borde sale del tema: 2px para uno marcado, invisible para el plano."""
    grueso = replace(th.MODERN, border_w=2)
    invisible = replace(th.MODERN, border_w=0)

    assert "2px solid" in th.build_qss(grueso)
    assert edge(invisible) == "1px solid transparent"


def test_los_temas_base_no_cambian_de_forma() -> None:
    """Los temas que ya existian deben seguir con la forma de siempre."""
    for theme in th.THEME_LIST[:2]:  # modern y sakura_light salvo el aire nuevo
        assert theme.flat is False
        assert theme.headings_uppercase is False
        assert theme.heading_family == ""


def test_los_disenos_tienen_formas_distintas() -> None:
    formas = {
        (t.flat, t.radius, bool(t.heading_family), t.headings_uppercase)
        for t in th.THEME_LIST
        if t.id in DISENOS
    }
    assert len(formas) >= 5, "los disenos comparten forma y solo cambian de color"


def test_cambiar_entre_disenos_en_vivo(qapp) -> None:
    """Aplicar cada diseno no puede dejar colores del anterior en la ventana."""
    from PySide6.QtWidgets import QLabel

    from sakura.ui.main_window import MainWindow

    window = MainWindow()
    try:
        for design_id in DISENOS:
            window.apply_theme(th.get_theme(design_id))
            assert th.active().id == design_id

            permitidos = {
                value.upper()
                for value in vars(th.active()).values()
                if isinstance(value, str) and value.startswith("#")
            }
            ajenos = []
            for tag in window.findChildren(QLabel):
                estilo = tag.styleSheet()
                for token in estilo.replace(",", " ").replace(";", " ").split():
                    if (
                        token.startswith("#")
                        and len(token) == 7
                        and token.upper() not in permitidos
                    ):
                        ajenos.append(token)
            assert not ajenos, f"{design_id}: quedaron colores viejos: {ajenos[:5]}"
    finally:
        window.close()
        for servicio in ("scanner", "refresher"):
            getattr(window.page_map["library"], servicio).shutdown()
        window.downloads.shutdown()
        window.deleteLater()
        qapp.processEvents()
