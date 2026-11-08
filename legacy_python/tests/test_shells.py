"""Armazon por diseno: lateral, dock, pestanas, barra inferior, riel y doble panel."""

from __future__ import annotations

import pytest

from sakura.core.models import DownloadJob, JobStatus, SearchResult
from sakura.ui import theme as th
from sakura.ui.main_window import SHELLS, MainWindow

DISENOS_ELEGIDOS = {
    "modern",
    "sakura_light",
    "editorial",
    "wuxia",
    "fauna",
    "chile",
    "anime",
    "pokemon",
}


@pytest.fixture()
def window(qapp, monkeypatch, tmp_path):
    monkeypatch.setattr(
        "sakura.ui.services.downloader.download_queue_file",
        lambda: tmp_path / "download_queue.json",
    )
    original = th.active()
    th.set_active(original)
    win = MainWindow()
    yield win
    win.close()
    for servicio in ("scanner", "refresher"):
        getattr(win.page_map["library"], servicio).shutdown()
    win.downloads.shutdown()
    win.deleteLater()
    qapp.processEvents()


def test_todos_los_disenos_declaran_un_armazon_valido() -> None:
    for theme in th.THEME_LIST:
        assert theme.shell in SHELLS, f"{theme.id} pide un armazon raro: {theme.shell}"


def test_los_disenos_no_comparten_todos_la_estructura() -> None:
    estilos = {t.shell for t in th.THEME_LIST if t.id in DISENOS_ELEGIDOS}
    assert len(estilos) >= 5, "los disenos se organizan todos igual"


def test_el_qss_viste_el_armazon() -> None:
    qss = th.build_qss(th.MODERN)
    for selector in ("#TabBar", "#TabButton", "#BottomBar", "#Inspector", "#RailToggle"):
        assert selector in qss, f"falta el selector {selector}"


def test_editorial_usa_pestanas(window) -> None:
    window.apply_theme(th.get_theme("editorial"))

    assert not window.tabbar.isHidden()
    assert window.sidebar.isHidden()
    assert window.bottombar.isHidden()


def test_chile_usa_barra_inferior(window) -> None:
    window.apply_theme(th.get_theme("chile"))

    assert not window.bottombar.isHidden()
    assert window.sidebar.isHidden()
    assert window.tabbar.isHidden()


def test_anime_usa_doble_panel_con_inspector(window) -> None:
    window.apply_theme(th.get_theme("anime"))

    assert not window.inspector.isHidden()
    assert not window.sidebar.isHidden()
    assert window.tabbar.isHidden()


def test_wuxia_usa_riel_plegable(window) -> None:
    window.apply_theme(th.get_theme("wuxia"))

    assert window.sidebar._rail
    assert not window.sidebar.isHidden()
    plegado = window.sidebar.width()
    # El boton de la cabecera lo fija abierto y ensancha el riel.
    window.sidebar._on_rail_toggle()
    assert window.sidebar.width() > plegado


def test_el_inspector_sigue_las_descargas(window) -> None:
    window.apply_theme(th.get_theme("anime"))
    job = DownloadJob(result=SearchResult(id="1", title="t", url="https://youtu.be/x"))
    window.downloads._jobs.append(job)
    window._on_job_added(job)

    assert id(job) in window.inspector._rows

    job.status = JobStatus.DONE
    window._refresh_home_downloads()
    assert id(job) not in window.inspector._rows
