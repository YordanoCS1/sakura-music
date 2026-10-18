"""Workers de busqueda de iconos: corren con datos falsos, sin red."""

from __future__ import annotations

from sakura.core.icon_api import Collection, IconHit, IconSet
from sakura.ui.services import icon_library


def _hit(name: str) -> IconHit:
    return IconHit(
        f"tabler:{name}", "tabler", name, Collection("tabler", "Tabler", "MIT", False)
    )


def test_el_worker_de_busqueda_emite_hits(monkeypatch) -> None:
    esperados = [_hit("home")]
    monkeypatch.setattr(icon_library, "search_icons", lambda query, limit: esperados)
    worker = icon_library._SearchWorker("home", 36)
    recibidos: list = []
    worker.results_ready.connect(recibidos.append)

    worker.run()

    assert recibidos == [esperados]


def test_sin_resultados_avisa(monkeypatch) -> None:
    monkeypatch.setattr(icon_library, "search_icons", lambda query, limit: [])
    worker = icon_library._SearchWorker("zzz", 36)
    avisos: list[str] = []
    worker.failed.connect(avisos.append)

    worker.run()

    assert avisos and "zzz" in avisos[0]


def test_el_worker_de_preview_agrupa_por_prefijo(monkeypatch) -> None:
    pedidos: list[tuple[str, list[str]]] = []

    def falso_bodies(prefix: str, names: list[str]) -> IconSet:
        pedidos.append((prefix, list(names)))
        return IconSet(prefix, 24, 24, {name: f"<{name}/>" for name in names})

    monkeypatch.setattr(icon_library, "icon_bodies", falso_bodies)
    worker = icon_library._PreviewWorker([_hit("home"), _hit("search")])
    recibidos: list[dict] = []
    worker.previews_ready.connect(recibidos.append)

    worker.run()

    assert pedidos == [("tabler", ["home", "search"])]
    assert recibidos[0]["tabler:home"] == ("<home/>", 24, 24)


def test_la_busqueda_pide_treinta_y_seis_por_defecto() -> None:
    assert icon_library.IconLibrary.search.__defaults__ == (36,)
