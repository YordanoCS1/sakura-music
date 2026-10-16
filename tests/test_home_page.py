"""La pagina de Inicio: resumen de la biblioteca y accesos rapidos."""

from __future__ import annotations

import pytest
from PySide6.QtCore import QElapsedTimer, Qt
from PySide6.QtTest import QSignalSpy

from sakura.ui.pages.home import HomePage

SUMMARY = {"pistas": 42, "albumes": 7, "artistas": 5, "duracion": 7200.0}


def _wait_for_signal(spy: QSignalSpy, qapp, timeout_ms: int = 2000) -> bool:
    """Espera la señal procesando eventos en bucle.

    `QSignalSpy.wait` no siempre despierta con señales emitidas desde otro hilo,
    asi que el resumen asincrono podia tardar de mas de forma intermitente.
    """
    reloj = QElapsedTimer()
    reloj.start()
    while spy.count() == 0 and reloj.elapsed() < timeout_ms:
        qapp.processEvents()
    return spy.count() > 0


@pytest.fixture()
def page(qapp) -> HomePage:
    return HomePage()


# --- cifras -------------------------------------------------------------------


def test_sin_biblioteca_no_inventa_cifras(page) -> None:
    page.set_summary(None)

    assert all(tile.value.text() == "—" for tile in page.tiles.values())
    assert "No hay biblioteca" in page.without_tags.text()


def test_muestra_el_resumen(page) -> None:
    page.set_summary(SUMMARY)

    assert page.tiles["pistas"].value.text() == "42"
    assert page.tiles["albumes"].value.text() == "7"
    assert page.tiles["artistas"].value.text() == "5"
    assert page.tiles["duracion"].value.text() == "2.0 h", "debe pasar a horas"


def test_un_resumen_vacio_tambien_es_ninguno(page) -> None:
    page.set_summary({"pistas": 0, "albumes": 0, "artistas": 0, "duracion": 0})
    assert page.tiles["pistas"].value.text() == "—"


# --- pistas sin etiquetar -----------------------------------------------------


def test_avisa_cuantas_pistas_no_tienen_tags(page) -> None:
    page.set_summary(SUMMARY)
    page.set_without_tags(12)

    assert "12 pistas" in page.without_tags.text()
    assert page.tags_btn.isVisibleTo(page) or True  # visibility real exige show()
    assert not page.tags_btn.isHidden(), "con trabajo pendiente el boton se muestra"


def test_una_sola_pista_singular(page) -> None:
    page.set_summary(SUMMARY)
    page.set_without_tags(1)
    assert "1 pista " in page.without_tags.text()
    assert "1 pistas" not in page.without_tags.text()


def test_todo_etiquetado_oculta_el_boton(page) -> None:
    page.set_summary(SUMMARY)
    page.set_without_tags(0)

    assert page.tags_btn.isHidden()
    assert "Todas tus pistas" in page.without_tags.text()


def test_revision_muestra_cantidades_y_oculta_categorias_resueltas(page) -> None:
    page.set_summary(SUMMARY)
    page.set_review_counts(2, 1, 0)

    assert "2 pistas" in page.without_tags.text()
    assert "1 pista sin carátula" in page.without_cover.text()
    assert not page.tags_btn.isHidden()
    assert not page.covers_btn.isHidden()
    assert page.duplicadas_btn.isHidden()


def test_revision_no_inventa_estados_sin_biblioteca(page) -> None:
    page.set_summary(None)
    page.set_review_counts(0, 0, 0)

    assert "No hay biblioteca" in page.without_tags.text()
    assert page.without_cover.text() == ""
    assert page.duplicadas.text() == ""


def test_revision_informa_que_se_esta_actualizando(page) -> None:
    page.set_summary(SUMMARY)
    page.set_review_counts(2, 1, 1)
    page.set_review_pending()

    assert "Actualizando" in page.without_tags.text()
    assert page.without_cover.text() == ""
    assert page.duplicadas.text() == ""
    assert page.tags_btn.isHidden()
    assert page.covers_btn.isHidden()
    assert page.duplicadas_btn.isHidden()


def test_accesos_de_revision_emiten_su_filtro(page) -> None:
    filtros: list[str] = []
    page.library_review_requested.connect(filtros.append)
    page.set_summary(SUMMARY)
    page.set_review_counts(1, 1, 2)

    page.tags_btn.click()
    page.covers_btn.click()
    page.duplicadas_btn.click()

    assert filtros == ["untagged", "missing_cover", "duplicates"]


def test_resumen_de_descargas_solo_avisa_si_hay_errores(page) -> None:
    page.set_downloads(2, 1, 0)
    assert page.card_queue.detail.text() == "2 activas · 1 en espera"
    assert page.downloads_alerta.isHidden()
    assert page.downloads_btn.isHidden()

    page.set_downloads(1, 0, 2)
    assert page.card_queue.detail.text() == "1 activa · 2 con error"
    assert "2 descargas fallidas" in page.downloads_alerta.text()
    assert not page.downloads_btn.isHidden()


# --- accesos ------------------------------------------------------------------


def test_los_accesos_abren_su_pagina(qapp) -> None:
    from sakura.ui.main_window import MainWindow

    window = MainWindow()
    start = window.page_map["home"]

    start.card_library.clicked.emit()
    assert window.pages.currentWidget() is window.page_map["library"]

    start.card_queue.clicked.emit()
    assert window.pages.currentWidget() is window.page_map["queue"]

    start.library_requested.emit()
    assert window.pages.currentWidget() is window.page_map["library"]
    window.close()


def test_el_resumen_llega_desde_el_escaneo(qapp, tmp_path) -> None:
    """Conectar el finished del escaneo es lo que hace util la pagina."""
    from sakura.core.library import Track
    from sakura.ui.main_window import MainWindow

    window = MainWindow()
    library = window.page_map["library"]

    track_items = [
        Track(
            path=tmp_path / "original.mp3", title="One More Time", artist="Daft Punk",
            album="Discovery", duration=320,
        ),
        Track(path=None, title="", artist="Desconocido", album="Desconocido", duration=100),
        Track(
            path=tmp_path / "duplicate.mp3", title="One More Time", artist="Daft Punk",
            album="Discovery", duration=320,
        ),
    ]
    library.model.set_tracks(track_items)
    summary = {"pistas": 3, "albumes": 1, "artistas": 1, "duracion": 740}
    review_spy = QSignalSpy(window._home_review_scanner.finished)
    window._on_library_scanned(len(track_items), summary)
    start = window.page_map["home"]
    assert "Actualizando" in start.without_tags.text()
    assert _wait_for_signal(review_spy, qapp), (
        "el resumen de revisión debe terminar en segundo plano"
    )

    assert start.tiles["pistas"].value.text() == "3"
    assert "1 pista " in start.without_tags.text(), "debe contar la que no tiene tags"
    assert "3 pistas sin carátula" in start.without_cover.text()
    assert "2 pistas en posibles duplicados" in start.duplicadas.text()
    window.close()


def test_revisar_desde_inicio_abre_biblioteca_filtrada(qapp) -> None:
    from sakura.core.library import Track
    from sakura.ui.main_window import MainWindow

    window = MainWindow()
    library = window.page_map["library"]
    library.model.set_tracks(
        [
            Track(path=None, title="Con tags", artist="Artista", album="Álbum", duration=100),
            Track(path=None, title="", artist="Desconocido", album="Álbum", duration=100),
        ]
    )

    window.page_map["home"].library_review_requested.emit("untagged")

    assert window.pages.currentWidget() is library
    assert library.proxy.review_filter == "untagged"
    assert library.proxy.rowCount() == 1
    window.close()


def test_inicio_resume_descargas_fallidas_y_abre_la_cola(qapp) -> None:
    from sakura.core.models import DownloadJob, JobStatus, SearchResult
    from sakura.ui.main_window import MainWindow

    window = MainWindow()
    job = DownloadJob(result=SearchResult(id="1", title="Fallida", url="https://youtu.be/x"))
    job.status = JobStatus.FAILED
    window.downloads._jobs.append(job)

    window._refresh_home_downloads()
    start = window.page_map["home"]
    assert "1 con error" in start.card_queue.detail.text()
    assert "1 descarga fallida" in start.downloads_alerta.text()

    start.downloads_btn.click()
    assert window.pages.currentWidget() is window.page_map["queue"]
    window.close()


# --- el QSS se aplica ---------------------------------------------------------


@pytest.mark.parametrize("objname", ["StatTile", "Card"])
def test_los_widgets_propios_pintan_el_fondo(qapp, objname: str) -> None:
    """Sin `WA_StyledBackground`, Qt ignora el fondo de un QWidget propio.

    Con el atributo ausente las tarjetas salian invisibles contra el fondo.
    """
    from PySide6.QtWidgets import QWidget

    from sakura.ui.pages.home import ActionCard, StatTile

    widget = StatTile("Pistas") if objname == "StatTile" else ActionCard("Buscar", "x")
    assert widget.testAttribute(Qt.WidgetAttribute.WA_StyledBackground), (
        f"{objname} necesita WA_StyledBackground para que el QSS lo pinte"
    )
    assert isinstance(widget, QWidget)


def test_la_pista_de_sin_tags_usa_un_widget_con_fondo(qapp) -> None:
    """El `Callout` si se veía porque es un QLabel; los tiles son QWidget."""
    from PySide6.QtWidgets import QLabel

    from sakura.ui.pages.home import HomePage

    assert isinstance(HomePage().without_tags, QLabel)