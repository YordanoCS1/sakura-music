"""Resumen final de descargas: conteo del lote y ventana de cierre."""

from __future__ import annotations

from PySide6.QtWidgets import QDialog

from sakura.core.models import (
    DownloadJob,
    DownloadSummary,
    JobStatus,
    SearchResult,
    summarize_downloads,
    text_summary_downloads,
)
from sakura.ui.main_window import MainWindow
from sakura.ui.widgets.completion_dialog import CompletionDialog


def job_item(state: JobStatus, title_text: str = "cancion") -> DownloadJob:
    job = DownloadJob(
        result=SearchResult(id=title_text, title=title_text, url=f"https://youtu.be/{title_text}"),
    )
    job.status = state
    return job


def summary() -> DownloadSummary:
    return DownloadSummary(downloaded=5, failed=1, omitidas=2, cancelled=1)


def test_resume_todos_los_estados_terminal() -> None:
    jobs = [
        job_item(JobStatus.DONE, "una"),
        job_item(JobStatus.FAILED, "dos"),
        job_item(JobStatus.SKIPPED, "tres"),
        job_item(JobStatus.CANCELLED, "cuatro"),
        job_item(JobStatus.PENDING, "cinco"),
    ]

    result = summarize_downloads(jobs)

    assert result == DownloadSummary(
        downloaded=1, failed=1, omitidas=1, cancelled=1
    )
    assert result.hubo_actividad is True


def test_solo_duplicados_no_es_un_lote_para_mostrar() -> None:
    result = summarize_downloads([job_item(JobStatus.SKIPPED)])

    assert result.hubo_actividad is False
    assert text_summary_downloads(result) == "0 descargadas · 1 ya estaba"


def test_el_texto_concuerda_en_singular_y_plural() -> None:
    assert (
        text_summary_downloads(summary())
        == "5 descargadas · 1 con error · 2 ya estaban · 1 cancelada"
    )
    assert (
        text_summary_downloads(DownloadSummary(downloaded=1))
        == "1 descargada"
    )


def test_la_ventana_muestra_el_conteo_y_lleva_a_la_cola(qapp) -> None:
    dialog = CompletionDialog(summary())
    views: list[str] = []
    dialog.queue_requested.connect(lambda: views.append("queue"))

    assert dialog.windowTitle() == "Descargas terminadas"
    assert dialog.count.text() == "5"
    assert dialog.detail.text() == text_summary_downloads(summary())
    assert dialog.state.objectName() == "BadgeFailed"

    dialog.view_queue.click()

    assert views == ["queue"]
    assert dialog.result() == QDialog.DialogCode.Accepted


def test_la_ventana_de_exito_no_marca_errores(qapp) -> None:
    dialog = CompletionDialog(DownloadSummary(downloaded=2))

    assert dialog.windowTitle() == "Descargas completadas"
    assert dialog.state.objectName() == "BadgeDone"
    assert dialog.state.text() == "Todo listo"


def test_el_sello_pinta_petalos_visibles(qapp) -> None:
    dialog = CompletionDialog(DownloadSummary(downloaded=1))
    image = dialog.seal.grab().toImage()
    pintados = sum(
        1
        for y in range(0, image.height(), 2)
        for x in range(0, image.width(), 2)
        if image.pixelColor(x, y).alpha() > 0
    )

    assert pintados > 100, "el sello de cerezo salio vacio"


def test_el_lote_muestra_el_resumen_solo_al_vaciarse(qapp, monkeypatch) -> None:
    window = MainWindow()
    mostrados: list[DownloadSummary] = []
    monkeypatch.setattr(
        window, "_show_summary_downloads", mostrados.append
    )
    uno = job_item(JobStatus.PENDING, "una")
    dos = job_item(JobStatus.PENDING, "dos")
    window.downloads._jobs.extend([uno, dos])
    window._on_job_added(uno)
    window._on_job_added(dos)

    uno.status = JobStatus.DONE
    window._on_job_finished(uno)
    assert mostrados == [], "el otro trabajo todavia no termino"

    dos.status = JobStatus.FAILED
    window._on_job_finished(dos)

    assert mostrados == [DownloadSummary(downloaded=1, failed=1)]
    assert window._batch_downloads == {}
    window.close()
    window.downloads.shutdown()


def test_un_lote_de_solo_duplicados_no_abre_la_ventana(qapp, monkeypatch) -> None:
    window = MainWindow()
    mostrados: list[DownloadSummary] = []
    monkeypatch.setattr(
        window, "_show_summary_downloads", mostrados.append
    )
    job = job_item(JobStatus.SKIPPED)
    window.downloads._jobs.append(job)
    window._on_job_added(job)

    window._on_job_finished(job)

    assert mostrados == []
    window.close()
    window.downloads.shutdown()


def test_cancelar_el_ultimo_pendiente_tambien_cierra_el_lote(
    qapp, monkeypatch
) -> None:
    window = MainWindow()
    mostrados: list[DownloadSummary] = []
    monkeypatch.setattr(
        window, "_show_summary_downloads", mostrados.append
    )
    job = job_item(JobStatus.PENDING)
    window.downloads._jobs.append(job)
    window._on_job_added(job)

    job.status = JobStatus.CANCELLED
    window._on_job_updated(job)

    assert mostrados == [DownloadSummary(cancelled=1)]
    window.close()
    window.downloads.shutdown()
