"""Estructura de la ventana y navegacion entre paginas."""

from __future__ import annotations

import pytest
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QMessageBox

from sakura.core.models import DownloadJob, JobStatus, SearchResult
from sakura.ui import theme as th
from sakura.ui.main_window import MainWindow

PAGES = ("home", "search", "library", "queue", "settings")


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
    # `show_page("library")` arranca el escaneo de la carpeta configurada, que en
    # una maquina real son cientos de pistas. Sin cortar el hilo, sigue trabajando
    # durante los tests siguientes y los vuelve lentos.
    for servicio in ("scanner", "refresher"):
        getattr(win.page_map["library"], servicio).shutdown()
    win.downloads.shutdown()
    # `QApplication.setStyleSheet` reestiliza TODOS los widgets vivos, asi que una
    # ventana que no se destruye hace que cada `apply_theme` posteriorpage mas.
    win.deleteLater()
    qapp.processEvents()


def test_ventana_usa_titlebar_personalizada_sin_marco_nativo(window) -> None:
    """La app debe usar solo su titlebar custom, no el marco de Windows."""
    assert bool(window.windowFlags() & Qt.WindowType.FramelessWindowHint)


@pytest.mark.parametrize("page", PAGES)
def test_todas_las_paginas_existen(window, page: str) -> None:
    assert page in window.page_map


@pytest.mark.parametrize("page", PAGES)
def test_navegar_muestra_la_pagina(window, page: str) -> None:
    window.show_page(page)
    assert window.pages.currentWidget() is window.page_map[page]


@pytest.mark.parametrize("page", PAGES)
def test_el_titulo_no_se_repite_arriba(window, page: str) -> None:
    """El header de la pagina ya pone el nombre; repetirlo se ve sin terminar."""
    window.show_page(page)
    assert window.page_map[page].header.text(), "la pagina debe mostrar su nombre"
    assert window.titlebar.title.text() == "", "la barra de titulo queda libre"


@pytest.mark.parametrize("page", ["home", "search"])
def test_el_buscador_global_aparece_donde_sirve(window, page: str) -> None:
    window.show_page(page)
    assert not window.topbar.isHidden(), "el buscador global deberia estar"


@pytest.mark.parametrize("page", ["library", "queue", "settings"])
def test_sin_buscador_global_donde_no_aplica(window, page: str) -> None:
    """Alli la franja era espacio muerto con un campo inútil encima."""
    window.show_page(page)
    assert window.topbar.isHidden(), "la barra superior sobra en esta pagina"


@pytest.mark.parametrize("page", ["library", "queue", "settings"])
def test_con_la_navegacion_arriba_la_barra_no_se_esconde(window, page: str) -> None:
    """En modo `top` la barra superior ES el menu.

    Esconderla dejaria la app sin navegacion, asi que ahi la regla del test de
    arriba no aplica: vale para la barra lateral.
    """
    window.set_nav_layout("top")
    window.show_page(page)

    assert not window.topbar.isHidden(), "la navegacion tiene que seguir ahi"
    assert window.sidebar.isHidden(), "y la barra lateral ya no se usa"


def test_un_layout_desconocido_cae_al_default(window) -> None:
    """Un solo valor por defecto: el que declara `config.DEFAULTS`."""
    from sakura.config import DEFAULTS

    window.set_nav_layout("inventado")

    assert window._nav_layout == DEFAULTS["nav_layout"]


def test_el_boton_de_descargar_lleva_a_buscar(window) -> None:
    """Estaba conectado a nada: el ícono no hacia nada."""
    window.show_page("library")
    window.topbar.download_clicked.emit()

    assert window.pages.currentWidget() is window.page_map["search"]


def test_pagina_inexistente_no_rompe(window) -> None:
    window.show_page("home")
    window.show_page("no-existe")
    assert window.pages.currentWidget() is window.page_map["home"]


def test_navegacion_por_seleccion_de_sidebar(window) -> None:
    window.sidebar.page_selected.emit("library")
    assert window.pages.currentWidget() is window.page_map["library"]


def test_escribir_en_el_buscador_abre_buscar(window) -> None:
    window.show_page("home")
    window.topbar.search.setText("daft punk")
    assert window.pages.currentWidget() is window.page_map["search"]


def test_cambio_de_tema_no_crea_la_ventana(window) -> None:
    before = window.sidebar.width()
    window.apply_theme(th.MODERN.with_accent("#00FF00"))
    assert th.active().accent == "#00FF00"
    assert window.sidebar.width() == before


def test_cerrar_no_bloquea_y_marca_el_cierre(window) -> None:
    """`closeEvent` no debe limpiar hilos: eso cuelga la salida de forma intermitente."""
    assert window.is_closing is False
    window.close()
    assert window.is_closing is True


def test_shutdown_espera_los_hilos(window) -> None:
    """Con varias descargas en paralelo hay que cortar todos los procesos."""
    assert window.shutdown() is None
    assert all(slot.runner.is_running is False for slot in window.downloads._slots)


class _ServicioFalso:
    """Reemplaza un servicio para ver si el cierre lo corta."""

    def __init__(self, registro: list[str], name_text: str):
        self._registro = registro
        self._name = name_text

    def shutdown(self) -> None:
        self._registro.append(self._name)


def test_el_cierre_corta_busqueda_playlist_y_miniaturas(window) -> None:
    """Un yt-dlp de busqueda o de playlist no puede sobrevivir a la ventana."""
    cortados: list[str] = []
    search = window.page_map["search"]

    for servicio in ("search_service", "playlist_resolver", "thumbnails"):
        setattr(search, servicio, _ServicioFalso(cortados, servicio))

    window.shutdown()

    assert cortados == ["search_service", "playlist_resolver", "thumbnails"]


def test_el_boton_de_limpiar_llega_al_gestor(window) -> None:
    """El botón tiene que vaciar la vista y el DownloadManager, no solo la vista."""
    job = DownloadJob(result=SearchResult(id="1", title="c", url="https://youtu.be/x"))
    job.status = JobStatus.DONE

    window.downloads.jobs.append(job)
    window._on_job_added(job)

    window.page_map["queue"].clear_button.click()

    assert window.downloads.jobs == []
    assert window.page_map["queue"]._rows == {}


def test_el_boton_reintentar_envia_los_errores_al_gestor(window) -> None:
    job = DownloadJob(result=SearchResult(id="1", title="c", url="https://youtu.be/x"))
    job.status = JobStatus.FAILED
    window.downloads._jobs.append(job)
    window._on_job_added(job)
    window.downloads._closing = True

    window.page_map["queue"].retry_button.click()

    assert job.status is JobStatus.PENDING
    assert window.downloads.pending_count == 1
    assert not window.page_map["queue"].retry_button.isEnabled()


def test_el_boton_de_cancelar_pide_confirmacion_y_cancela(window, monkeypatch) -> None:
    """Cancelar todo es destructivo: primero pregunta, despues mata la cola."""
    from sakura.core.models import DownloadSummary

    mostrados: list[DownloadSummary] = []
    preguntas: list[str] = []
    monkeypatch.setattr(
        window, "_show_summary_downloads", mostrados.append
    )

    def confirmar(*args, **kwargs):
        preguntas.append(args[1])
        return QMessageBox.StandardButton.Yes

    monkeypatch.setattr(
        "sakura.ui.main_window.QMessageBox.question", confirmar
    )
    jobs = [
        DownloadJob(result=SearchResult(id=str(n), title=f"c{n}", url=f"https://youtu.be/x{n}"))
        for n in range(2)
    ]
    window.downloads._jobs.extend(jobs)
    for job in jobs:
        window._on_job_added(job)

    window.page_map["queue"].cancel_button.click()

    assert preguntas == ["Cancelar descargas"]
    assert all(job.status is JobStatus.CANCELLED for job in jobs)
    assert mostrados == [DownloadSummary(cancelled=2)]
    assert window.titlebar.title.text() == "2 descargas canceladas"


def test_la_pastilla_de_reintentar_solo_repite_esa_fila(window) -> None:
    """El botón de la fila no debe arrastrar a los otros errores."""
    failed_job = DownloadJob(
        result=SearchResult(id="1", title="Caida", url="https://youtu.be/a")
    )
    failed_job.status = JobStatus.FAILED
    other = DownloadJob(
        result=SearchResult(id="2", title="Otra", url="https://youtu.be/b")
    )
    other.status = JobStatus.FAILED
    window.downloads._jobs.extend([failed_job, other])
    window._on_job_added(failed_job)
    window._on_job_added(other)

    window.page_map["queue"]._rows[id(failed_job)].retry_button.click()

    assert failed_job.status is JobStatus.DOWNLOADING
    assert other.status is JobStatus.FAILED, "el otro error sigue esperando"


def test_si_no_confirma_no_se_cancela_nada(window, monkeypatch) -> None:
    mostrados: list = []
    monkeypatch.setattr(window, "_show_summary_downloads", mostrados.append)
    monkeypatch.setattr(
        "sakura.ui.main_window.QMessageBox.question",
        lambda *args, **kwargs: QMessageBox.StandardButton.No,
    )
    job = DownloadJob(result=SearchResult(id="1", title="c", url="https://youtu.be/x"))
    window.downloads._jobs.append(job)
    window._on_job_added(job)

    window.page_map["queue"].cancel_button.click()

    assert job.status is JobStatus.PENDING
    assert mostrados == []


def test_maximizar_y_restaurar_cambia_el_icono(window) -> None:
    """El boton alterna entre 'maximize' y 'restore' segun el estado real."""
    window.showNormal()

    expected_value = "maximize"
    for _ in range(4):
        window.titlebar._toggle_maximize()
        expected_value = "restore" if expected_value == "maximize" else "maximize"
        assert window.titlebar._max.property("iconName") == expected_value
        assert window.isMaximized() is (expected_value == "restore")

    window.showNormal()


def test_no_queda_una_barra_de_reproductor(window) -> None:
    """La app es de descarga y edicion: sin reproductor que no haga nada."""
    from PySide6.QtWidgets import QSlider

    assert not hasattr(window, "player")
    assert window.findChildren(QSlider) == [], "no debe quedar ningun control de audio"


def test_cambio_de_tema_actualiza_estilos(window) -> None:
    """Cambiar el tema aplica el nuevo tema a toda la ventana."""
    from sakura.ui import theme as th

    for theme in th.THEME_LIST:
        window.apply_theme(theme)
        assert th.active() is theme