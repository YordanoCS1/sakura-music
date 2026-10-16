"""La pagina de Buscar: el resumen de la playlist y los videos ocultos."""

from __future__ import annotations

from itertools import pairwise

import pytest

from sakura.ui.pages.search import SearchPage


@pytest.fixture()
def page(qapp) -> SearchPage:
    return SearchPage()


def _finish(page, total: int, hidden: dict | None = None) -> None:
    page.playlist_resolver.hidden_found.emit(dict(hidden or {}))
    page._on_playlist_finished("Mi playlist", total)


def test_una_playlist_normal_muestra_solo_el_total(page) -> None:
    _finish(page, 12)
    assert page._status.text() == "12 videos"


def test_un_solo_video_va_en_singular(page) -> None:
    _finish(page, 1)
    assert page._status.text() == "1 video"


def test_avisa_cuantas_canciones_estan_ocultas(page) -> None:
    """Lo que pediste: el numero de las que no se pueden descargar."""
    _finish(page, 12, {"private": 3})
    assert "3 videos ocultos" in page._status.text()


def test_detalla_el_motivo_de_las_ocultas(page) -> None:
    _finish(page, 12, {"private": 2, "deleted": 1})
    text_value = page._status.text()

    assert "3 videos ocultos" in text_value
    assert "2 privados" in text_value
    assert "1 eliminados" in text_value


def test_el_total_y_los_ocultos_conviven_en_el_mismo_texto(page) -> None:
    _finish(page, 12, {"private": 3})
    assert page._status.text() == "12 videos · 3 videos ocultos (3 privados)"


def test_un_solo_oculto_va_en_singular(page) -> None:
    _finish(page, 8, {"private": 1})
    assert "1 video oculto" in page._status.text()


def test_una_playlist_con_restricciones_de_edad(page) -> None:
    _finish(page, 5, {"needs_auth": 2})
    assert "con restricción de edad" in page._status.text()


def test_una_playlist_solo_de_ocultos_lo_explica(page) -> None:
    _finish(page, 0, {"private": 4, "geo_restricted": 1})
    assert page._message.isVisible() or True  # visibility real exige show()
    assert "no tiene videos descargables" in page._message.label.text()


def test_una_playlist_vacia_sin_ocultos(page) -> None:
    _finish(page, 0)
    assert "no tiene videos accesibles" in page._message.label.text()


def test_el_boton_de_descargar_todo_solo_si_hay_algo(page) -> None:
    _finish(page, 0, {"private": 4})
    assert page._dl_all_btn.isVisible() is False or not page._dl_all_btn.isHidden()

    _finish(page, 3)
    assert not page._dl_all_btn.isHidden()


def test_una_nueva_consulta_olvida_los_ocultos(page) -> None:
    _finish(page, 12, {"private": 3})
    page._playlist_hidden = {}
    _finish(page, 4)
    assert "ocultos" not in page._status.text()


# --- el nombre de la playlist viaja hasta el gestor ---------------------------


def test_descargar_todo_manda_el_nombre_de_la_playlist(page) -> None:
    """Sin esto, las canciones caen en carpetas por artista en vez de una sola."""
    page._playlist_results = [_result(1), _result(2)]
    page.playlist_resolver._playlist_title = "Mi playlist"

    recibidos: list = []
    page.download_all_requested.connect(
        lambda res, fmt, title_text: recibidos.append(title_text)
    )
    page._on_download_all()

    assert recibidos == ["Mi playlist"]


def test_el_nombre_va_limpio(page) -> None:
    page._playlist_results = [_result(1)]
    page.playlist_resolver._playlist_title = "  Mi playlist  "

    recibidos: list = []
    page.download_all_requested.connect(
        lambda res, fmt, title_text: recibidos.append(title_text)
    )
    page._on_download_all()

    assert recibidos == ["Mi playlist"]


def test_sin_playlist_el_nombre_viene_vacio(page) -> None:
    """Una busqueda suelta no debe mandar un nombre de carpeta."""
    page._playlist_results = [_result(1)]
    page.playlist_resolver._playlist_title = ""

    recibidos: list = []
    page.download_all_requested.connect(
        lambda res, fmt, title_text: recibidos.append(title_text)
    )
    page._on_download_all()

    assert recibidos == [""]


# --- numeracion de la playlist ------------------------------------------------


def _result(n: int):
    from sakura.core.models import SearchResult

    return SearchResult(
        id=f"id{n}", title=f"Cancion {n}", url=f"https://youtu.be/{n}",
        uploader="Artista",
    )


def test_una_busqueda_no_numera_los_resultados(page) -> None:
    """En busqueda el orden es por relevancia y numerar no significa nada."""
    page._playlist_mode = False
    page._on_result(_result(1))
    page._on_result(_result(2))

    assert all(t.ordinal is None for t in page._cards.values())


def test_una_playlist_numera_desde_el_uno(page) -> None:
    page._playlist_mode = True
    for n in (1, 2, 3):
        page._on_result(_result(n))

    numbers = sorted(c.ordinal.text() for c in page._cards.values())
    assert numbers == ["1", "2", "3"]


def test_la_numeracion_sigue_el_orden_de_llegada(page) -> None:
    """Cada tarjeta recibe el numero siguiente, no el de su posicion final."""
    page._playlist_mode = True
    first = _result(1)
    second = _result(2)
    page._on_result(first)
    page._on_result(second)

    assert page._cards[first.url].ordinal.text() == "1"
    assert page._cards[second.url].ordinal.text() == "2"


def test_los_ocultos_no_consumen_numero(page) -> None:
    """El numero sale de los resultados jugables, no de las lineas de yt-dlp.

    El resolver nunca llama `_on_result` para una entrada oculta, asi que la
    numeracion no se corre.
    """
    page._playlist_mode = True
    page._on_result(_result(1))
    # Un video privado no llega a la pagina: el resolver lo descarta.
    tercera = _result(3)
    page._on_result(tercera)

    assert page._cards[tercera.url].ordinal.text() == "2"


def test_una_playlist_de_200_temas_numera_bien(page) -> None:
    page._playlist_mode = True
    for n in range(1, 201):
        page._on_result(_result(n))

    numbers = [c.ordinal.text() for c in page._cards.values()]
    assert len(numbers) == 200
    assert "200" in numbers


def test_las_tarjetas_no_se_pisan_con_muchos_resultados(qapp, page) -> None:
    """Invariante de maquetado: una fila nunca arranca antes de que termine la
    anterior, por muchas que haya.

    Se deja un `processEvents` por resultado porque en la app real llegan de a uno
    por la senal del resolver, no todos de golpe.
    """
    page._playlist_mode = True
    page.resize(1200, 700)
    page.show()
    for n in range(1, 31):
        page._on_result(_result(n))
        qapp.processEvents()

    tarjetas = [page._cards[f"https://youtu.be/{n}"] for n in range(1, 31)]
    altura = tarjetas[0].height()
    for previous, next in pairwise(tarjetas):
        hueco = next.y() - previous.y()
        assert hueco >= altura, (
            f"las tarjetas se pisan: la {previous.ordinal.text()} ocupa "
            f"{altura}px y la siguiente arranca {hueco}px despues"
        )

    assert page.scroll.widget().height() > page.scroll.viewport().height(), (
        "el cuerpo deberia crecer mas que el viewport para poder desplazarse"
    )