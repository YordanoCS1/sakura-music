"""La tarjeta de resultado y su numeracion dentro de una playlist."""

from __future__ import annotations

import pytest

from sakura.core.models import SearchResult
from sakura.ui.widgets.result_card import ORDINAL_W, ResultCard


@pytest.fixture()
def result() -> SearchResult:
    return SearchResult(
        id="abc", title="One More Time", url="https://youtu.be/abc", uploader="Daft Punk"
    )


def test_sin_indice_no_hay_numero(qapp, result) -> None:
    """En una busqueda el orden es por relevancia: numerar no dira nada."""
    card = ResultCard(result)
    assert card.ordinal is None


def test_con_indice_muestra_el_numero(qapp, result) -> None:
    card = ResultCard(result, 1)
    assert card.ordinal is not None
    assert card.ordinal.text() == "1"


def test_el_numero_no_ensucia_el_titulo(qapp, result) -> None:
    """El titulo es el que se usa como nombre de archivo al descargar."""
    card = ResultCard(result, 7)
    assert card.title.text() == "One More Time"
    assert card.result.title == "One More Time"
    assert "7" not in card.result.title


def test_el_numero_no_ensucia_el_meta(qapp, result) -> None:
    card = ResultCard(result, 42)
    assert card.meta.text() == "Daft Punk · 0:00"


@pytest.mark.parametrize(
    ("number", "width"),
    [(1, ORDINAL_W[1]), (9, ORDINAL_W[1]), (10, ORDINAL_W[2]), (100, ORDINAL_W[3]),
     (1000, ORDINAL_W[4])],
)
def test_el_ancho_crece_con_los_digitos(qapp, result, number, width) -> None:
    """Con playlists de 200 temas, "1000" no debe empujar la portada."""
    card = ResultCard(result, number)
    assert card.ordinal.width() == width


def test_playlist_larga_no_ensancha_la_fila(qapp, result) -> None:
    """Todas las filas miden lo mismo, asi las columnas alinean."""
    tarjetas = [ResultCard(result, n) for n in (1, 2, 100)]
    assert len({t.height() for t in tarjetas}) == 1


def test_la_fila_sigue_teniendo_el_boton_de_descarga(qapp, result) -> None:
    card = ResultCard(result, 3)
    assert card.button is not None
    assert card.options_button is not None


def test_la_tarjeta_usa_las_clases_del_tema(qapp, result) -> None:
    """El titulo y el canal los pinta el QSS, no un estilo en linea."""
    card = ResultCard(result)

    assert card.objectName() == "ResultCard"
    assert card.title.objectName() == "ResultCardTitle"
    assert card.meta.objectName() == "ResultCardMeta"
    assert card.title.styleSheet() == ""
    assert card.meta.styleSheet() == ""


def test_el_numero_se_recuadra_al_cambiar_de_tema(qapp, result) -> None:
    """Sin esto el ordinal queda con el color del tema anterior."""
    from sakura.ui import theme as th

    card = ResultCard(result, 5)
    card.refresh(theme=th.get_theme("oled"))

    color_oled = th.get_theme("oled").text_muted.upper()
    assert color_oled in card.ordinal.styleSheet().upper()