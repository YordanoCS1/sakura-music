"""Cliente de Iconify: parseo de la busqueda, cuerpos y errores de red."""

from __future__ import annotations

import urllib.error

import pytest

from sakura.core import icon_api

RESPUESTA = {
    "icons": ["tabler:home", "mdi:home"],
    "collections": {
        "tabler": {
            "name": "Tabler Icons",
            "license": {"title": "MIT"},
            "palette": False,
        },
        "mdi": {
            "name": "Material Design Icons",
            "license": {"title": "Apache 2.0"},
            "palette": False,
        },
    },
}


def test_search_icons_mapea_hits_y_colecciones(monkeypatch) -> None:
    monkeypatch.setattr(icon_api, "_get_json", lambda url: RESPUESTA)

    hits = icon_api.search_icons("home", 10)

    assert [hit.id for hit in hits] == ["tabler:home", "mdi:home"]
    assert hits[0].name == "home"
    assert hits[0].collection.name == "Tabler Icons"
    assert hits[0].collection.license == "MIT"
    assert hits[0].collection.tintable is True


def test_search_icons_marca_los_sets_a_color(monkeypatch) -> None:
    respuesta = {
        "icons": ["twemoji:heart"],
        "collections": {"twemoji": {"name": "Twemoji", "palette": True}},
    }
    monkeypatch.setattr(icon_api, "_get_json", lambda url: respuesta)

    hit = icon_api.search_icons("heart")[0]

    assert hit.collection.tintable is False


def test_icon_bodies_devuelve_el_sistema_de_coordenadas(monkeypatch) -> None:
    respuesta = {"width": 36, "height": 36, "icons": {"heart": {"body": "<path/>"}}}
    monkeypatch.setattr(icon_api, "_get_json", lambda url: respuesta)

    conj = icon_api.icon_bodies("twemoji", ["heart"])

    assert conj.width == 36 and conj.height == 36
    assert conj.bodies == {"heart": "<path/>"}


def test_icon_bodies_sin_nombres_no_consulta(monkeypatch) -> None:
    monkeypatch.setattr(icon_api, "_get_json", lambda url: pytest.fail("no debe pedir"))

    conj = icon_api.icon_bodies("tabler", [])

    assert conj.bodies == {}


def test_un_fallo_de_red_se_envuelve(monkeypatch) -> None:
    def rompe(*_args, **_kwargs):
        raise urllib.error.URLError("sin red")

    monkeypatch.setattr(icon_api.urllib.request, "urlopen", rompe)

    with pytest.raises(icon_api.IconApiError):
        icon_api.search_icons("home")
