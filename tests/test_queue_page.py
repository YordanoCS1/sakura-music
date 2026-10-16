"""La pagina de Cola: filas por trabajo y limpieza de lo terminado."""

from __future__ import annotations

import pytest

from sakura.core.formats import get_format
from sakura.core.models import DownloadJob, JobStatus, SearchResult
from sakura.ui.pages.queue import QueuePage


def job_item(title_text: str = "cancion", status: JobStatus = JobStatus.PENDING) -> DownloadJob:
    job = DownloadJob(
        result=SearchResult(id="1", title=title_text, url="https://youtu.be/x", uploader="Artista"),
        audio_format=get_format("opus"),
    )
    job.status = status
    return job


@pytest.fixture()
def page(qapp) -> QueuePage:
    return QueuePage()


# --- el boton de limpiar ------------------------------------------------------


def test_la_cola_vacia_no_tiene_nada_que_limpiar(page) -> None:
    assert page.clear_button.isEnabled() is False


def test_un_trabajo_en_curso_no_habilita_el_boton(page) -> None:
    page.add_job(job_item(status=JobStatus.DOWNLOADING))
    assert page.clear_button.isEnabled() is False


def test_un_trabajo_terminado_habilita_el_boton(page) -> None:
    page.add_job(job_item(status=JobStatus.DONE))
    assert page.clear_button.isEnabled() is True


def test_el_boton_cancelar_solo_sirve_si_hay_algo_en_marcha(page) -> None:
    assert page.cancel_button.isEnabled() is False

    pending = job_item(status=JobStatus.PENDING)
    active = job_item("activo", JobStatus.DOWNLOADING)
    page.add_job(pending)
    page.add_job(active)
    assert page.cancel_button.isEnabled() is True

    pending.status = JobStatus.CANCELLED
    active.status = JobStatus.DONE
    page.refresh_job(pending)
    page.refresh_job(active)
    assert page.cancel_button.isEnabled() is False


def test_el_boton_cancelar_pide_cancelar_todo(page) -> None:
    pedidos: list[str] = []
    page.cancel_requested.connect(lambda: pedidos.append("todo"))
    page.add_job(job_item(status=JobStatus.DOWNLOADING))

    page.cancel_button.click()

    assert pedidos == ["todo"]


def test_el_boton_reintentar_solo_se_habilita_con_errores(page) -> None:
    assert page.retry_button.isEnabled() is False

    failed_job = job_item("fallido", JobStatus.FAILED)
    page.add_job(failed_job)

    assert page.retry_button.isEnabled() is True

    failed_job.status = JobStatus.PENDING
    page.refresh_job(failed_job)
    assert page.retry_button.isEnabled() is False


def test_el_boton_reintentar_emite_la_senal(page) -> None:
    pedidos: list[str] = []
    page.retry_requested.connect(lambda: pedidos.append("reintentar"))
    page.add_job(job_item(status=JobStatus.CANCELLED))

    page.retry_button.click()

    assert pedidos == ["reintentar"]


def test_limpiar_saca_solo_los_terminados(page) -> None:
    active = job_item("activo", JobStatus.DOWNLOADING)
    listo = job_item("listo", JobStatus.DONE)
    fallado = job_item("fallado", JobStatus.FAILED)

    for job in (active, listo, fallado):
        page.add_job(job)

    page.clear_finished()

    assert list(page._rows) == [id(active)], "solo debe quedar el que sigue"


def test_limpiar_todo_deja_el_boton_deshabilitado(page) -> None:
    page.add_job(job_item(status=JobStatus.DONE))

    page.clear_finished()

    assert page._rows == {}
    assert page.clear_button.isEnabled() is False


def test_los_saltados_por_duplicado_tambien_se_limpian(page) -> None:
    page.add_job(job_item(status=JobStatus.SKIPPED))

    page.clear_finished()

    assert page._rows == {}


# --- filas --------------------------------------------------------------------


def test_cada_trabajo_tiene_su_fila(page) -> None:
    uno, dos = job_item("uno"), job_item("dos")

    page.add_job(uno)
    page.add_job(dos)

    assert page._rows[id(uno)] is not page._rows[id(dos)]


def test_el_badge_de_saltado_dice_que_ya_estaba(page) -> None:
    job = job_item(status=JobStatus.SKIPPED)
    page.add_job(job)

    assert page._rows[id(job)].badge.text() == "Ya estaba"


# --- reintento por fila -------------------------------------------------------


@pytest.mark.parametrize(
    "state", [JobStatus.FAILED, JobStatus.CANCELLED]
)
def test_solo_lo_repetible_muestra_el_boton_de_reintento(page, state) -> None:
    job = job_item("caida", state)
    page.add_job(job)
    row_index = page._rows[id(job)]

    assert row_index.retry_button.isHidden() is False


@pytest.mark.parametrize(
    "state",
    [JobStatus.PENDING, JobStatus.DOWNLOADING, JobStatus.DONE, JobStatus.SKIPPED],
)
def test_lo_que_no_se_repite_oculta_el_boton(page, state) -> None:
    job = job_item("x", state)
    page.add_job(job)
    row_index = page._rows[id(job)]

    assert row_index.retry_button.isHidden() is True


def test_el_boton_de_la_fila_avisa_que_trabajo(page) -> None:
    """Cada fila pide su propio trabajo: si no, se reintentan todos."""
    fallado = job_item("caida", JobStatus.FAILED)
    cancelled = job_item("tirada", JobStatus.CANCELLED)
    page.add_job(fallado)
    page.add_job(cancelled)

    pedidos: list[DownloadJob] = []
    page.retry_one_requested.connect(pedidos.append)
    page._rows[id(cancelled)].retry_button.click()

    assert pedidos == [cancelled]


def test_el_boton_aparece_al_cambiar_el_estato(page) -> None:
    """El botón se calcula en `refresh`, no solo al crear la fila."""
    job = job_item("en curso", JobStatus.DOWNLOADING)
    page.add_job(job)
    row_index = page._rows[id(job)]
    assert row_index.retry_button.isHidden() is True

    job.status = JobStatus.FAILED
    page.refresh_job(job)

    assert row_index.retry_button.isHidden() is False


def test_refrescar_una_fila_ya_retirada_no_falla(page) -> None:
    """Si la fila se borro, el refresco no debe reventar."""
    job = job_item(status=JobStatus.DONE)
    page.add_job(job)
    page.clear_finished()

    page.refresh_job(job)


# --- numeracion ---------------------------------------------------------------


def _numbers(page) -> list[str]:
    return [row_index.ordinal.text() for row_index in page._rows.values()]


def test_las_descargas_se_enumeran(page) -> None:
    """Lo que pediste: tambien se numeran mientras descargan."""
    jobs = [job_item(f"cancion {n}") for n in range(1, 4)]
    for job in jobs:
        page.add_job(job)

    assert _numbers(page) == ["1", "2", "3"]


def test_la_numeracion_no_depende_del_estado(page) -> None:
    """Descargando, esperando o con error: siempre numeradas."""
    jobs = [
        job_item("descargando", JobStatus.DOWNLOADING),
        job_item("en espera", JobStatus.PENDING),
        job_item("convirtiendo", JobStatus.CONVERTING),
    ]
    for job in jobs:
        page.add_job(job)

    for job in jobs:
        page._rows[id(job)].refresh()

    assert _numbers(page) == ["1", "2", "3"]


def test_limpiar_lo_terminado_no_renumera(page) -> None:
    """Si encolaste 5 y termino el 2, tiene que quedar 3, 4 y 5.

    Renumerar a 1, 2, 3 perderia la idea de cuales de la tanda original quedan.
    """
    jobs = [job_item(f"cancion {n}") for n in range(1, 6)]
    for job in jobs:
        page.add_job(job)

    jobs[1].status = JobStatus.DONE
    page.clear_finished()

    assert _numbers(page) == ["1", "3", "4", "5"]


def test_la_numeracion_sigue_creciendo_tras_limpiar(page) -> None:
    jobs = [job_item("a"), job_item("b")]
    for job in jobs:
        page.add_job(job)
    for job in jobs:
        job.status = JobStatus.DONE
    page.clear_finished()
    assert page._rows == {}, "los terminados deberian haberse ido"

    page.add_job(job_item("c"))
    assert _numbers(page) == ["3"]


def test_el_numero_no_ensucia_el_titulo(page) -> None:
    """El titulo se usa como nombre de archivo al descargar."""
    job = job_item("One More Time")
    page.add_job(job)

    assert job.title in page._rows[id(job)].title.text()
    assert "1." not in job.title


def test_el_numero_se_recuadra_al_cambiar_de_tema(page) -> None:
    from sakura.ui import theme as th

    page.add_job(job_item("x"))
    row_index = next(iter(page._rows.values()))
    row_index.refresh(theme=th.get_theme("oled"))

    assert th.get_theme("oled").text_muted.upper() in row_index.ordinal.styleSheet().upper()


def test_una_fila_sin_indice_no_muestra_numero(qapp) -> None:
    from sakura.ui.pages.queue import JobRow

    row_index = JobRow(job_item("x"))
    assert row_index.ordinal is None


def test_cambiar_de_tema_recolorea_las_filas(page) -> None:
    """Cada fila pinta su titulo en linea, asi que hay que repintarlas."""
    from sakura.ui import theme as th

    job = job_item("Una cancion", JobStatus.DOWNLOADING)
    page.add_job(job)
    row_index = page._rows[id(job)]

    th.set_active(th.get_theme("sunset"))
    page.refresh()
    sunset = th.get_theme("sunset").text.upper()
    assert sunset in row_index.title.styleSheet().upper()

    th.set_active(th.MODERN)
    page.refresh()
    assert th.MODERN.text.upper() in row_index.title.styleSheet().upper()
    assert sunset not in row_index.title.styleSheet().upper()


# --- resumen de descargas terminadas ------------------------------------------


def _enqueue(page, states: list[JobStatus]) -> list:
    jobs = []
    for n, state in enumerate(states, start=1):
        job = job_item(f"cancion {n}", state)
        page.add_job(job)
        jobs.append(job)
    return jobs


def test_cuenta_cuantas_terminaron(page) -> None:
    """Lo que pediste: saber cuantas canciones se descargaron."""
    jobs = _enqueue(
        page,
        [JobStatus.DONE, JobStatus.DONE, JobStatus.DOWNLOADING, JobStatus.PENDING],
    )

    assert page.stats.text() == "2 listas de 4"

    jobs[2].status = JobStatus.DONE
    page.refresh_job(jobs[2])
    assert page.stats.text() == "3 listas de 4"


def test_una_sola_lista_va_en_singular(page) -> None:
    _enqueue(page, [JobStatus.DONE, JobStatus.DOWNLOADING])
    assert page.stats.text() == "1 lista de 2"


def test_avisa_los_errores(page) -> None:
    _enqueue(page, [JobStatus.DONE, JobStatus.FAILED, JobStatus.FAILED])
    assert page.stats.text() == "1 lista de 3 · 2 con error"


def test_avisa_los_que_ya_estaban(page) -> None:
    """Los saltados por duplicado no cuentan como descargas hechas."""
    _enqueue(page, [JobStatus.DONE, JobStatus.SKIPPED])
    assert page.stats.text() == "1 lista de 2 · 1 ya estaba"


def test_nada_terminado_aun_muestra_el_total(page) -> None:
    _enqueue(page, [JobStatus.DOWNLOADING, JobStatus.PENDING])
    assert page.stats.text() == "0 listas de 2"


def test_la_cola_vacia_no_muestra_resumen(page) -> None:
    assert page.stats.text() == ""


def test_el_resumen_desaparece_al_limpiar(page) -> None:
    jobs = _enqueue(page, [JobStatus.DONE, JobStatus.DOWNLOADING])
    jobs[1].status = JobStatus.DONE
    page.refresh_job(jobs[1])
    assert page.stats.text() == "2 listas de 2"

    page.clear_finished()
    assert page.stats.text() == "", "al limpiar la cola no queda nada que contar"


def test_el_resumen_no_cuenta_lo_que_limpiaron(page) -> None:
    _enqueue(page, [JobStatus.DONE, JobStatus.DOWNLOADING])
    page.clear_finished()  # se va el que estaba listo

    assert page.stats.text() == "0 listas de 1"