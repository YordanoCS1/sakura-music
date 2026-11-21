"""Estados vacios reutilizables: icono, titulo, descripcion y accion."""

from __future__ import annotations

from sakura.ui.pages.base import MessageBlock, Page
from sakura.ui.pages.queue import QueuePage
from sakura.ui.pages.search import SearchPage


def test_por_defecto_solo_esta_la_descripcion(qapp) -> None:
    block = MessageBlock("Nada por aquí.")

    assert block.label.text() == "Nada por aquí."
    assert block.title_label.isHidden() is True
    assert block.icon_wrap.isHidden() is True
    assert block.button.isHidden() is True


def test_el_titulo_y_el_texto_se_cambian(qapp) -> None:
    block = MessageBlock()
    block.set_title("Tu biblioteca está vacía")
    block.set_text("Descargá algo desde Buscar.")

    assert block.title_label.text() == "Tu biblioteca está vacía"
    assert block.title_label.isHidden() is False
    assert block.label.text() == "Descargá algo desde Buscar."


def test_un_titulo_vacio_esconde_la_linea(qapp) -> None:
    block = MessageBlock()
    block.set_title("Algo")
    block.set_title("")

    assert block.title_label.isHidden() is True


def test_el_icono_se_pinta_y_se_puede_recolorear(qapp) -> None:
    block = MessageBlock()
    block.set_icon("music")

    assert block.icon_wrap.isHidden() is False
    assert not block.icon_wrap.pixmap().isNull()

    block.refresh()
    assert not block.icon_wrap.pixmap().isNull()


def test_un_icono_vacio_esconde_el_marco(qapp) -> None:
    block = MessageBlock()
    block.set_icon("music")
    block.set_icon("")

    assert block.icon_wrap.isHidden() is True


def test_la_accion_avisa_al_hacer_clic(qapp) -> None:
    block = MessageBlock()
    recibidos: list[int] = []
    block.action_clicked.connect(lambda: recibidos.append(1))

    block.set_action("Buscar música", icon="search")
    assert block.button.isHidden() is False

    block.button.click()
    assert recibidos == [1]


def test_una_accion_vacia_esconde_el_boton(qapp) -> None:
    block = MessageBlock()
    block.set_action("Buscar música")
    block.set_action("")

    assert block.button.isHidden() is True


def test_empty_state_arma_el_bloque_completo(qapp) -> None:
    block = Page("Título", "Subtítulo").empty_state(
        "Texto", title="Sin nada", icon="search", action="Ir"
    )

    assert block.label.text() == "Texto"
    assert block.title_label.text() == "Sin nada"
    assert block.icon_wrap.isHidden() is False
    assert block.button.isHidden() is False


def test_la_cola_vacia_ofrece_buscar(qapp) -> None:
    page = QueuePage()
    recibidos: list[int] = []
    page.search_requested.connect(lambda: recibidos.append(1))

    assert page._message.title_label.text()
    assert page._message.icon_wrap.isHidden() is False

    page._message.button.click()
    assert recibidos == [1]


def test_buscar_arranca_con_una_pista(qapp) -> None:
    page = SearchPage()

    assert page._message.title_label.text() == "Busca música o videos"
    assert page._message.icon_wrap.isHidden() is False
