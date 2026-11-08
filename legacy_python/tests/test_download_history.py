"""Tests del historial persistente de descargas y su dialogo."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from PySide6.QtWidgets import QMessageBox

from sakura import config
from sakura.core.download_history import DownloadHistory
from sakura.core.formats import get_format
from sakura.core.models import DownloadJob, JobStatus, SearchResult
from sakura.ui.pages.queue import QueuePage
from sakura.ui.widgets.download_history import DownloadHistoryDialog, HistoryRow, _format_time


def _make_job(
    title: str = "Cancion Test",
    artist: str = "Artista Test",
    status: JobStatus = JobStatus.DONE,
    error: str = "",
    filepath: str = "",
) -> DownloadJob:
    job = DownloadJob(
        result=SearchResult(
            id="vid123",
            title=title,
            url="https://youtube.com/watch?v=123",
            uploader=artist,
        ),
        audio_format=get_format("mp3"),
    )
    job.status = status
    job.error = error
    job.filepath = Path(filepath) if filepath else None
    return job


@pytest.fixture(autouse=True)
def clean_history() -> None:
    DownloadHistory.clear()
    yield
    DownloadHistory.clear()


# --- Core DownloadHistory ---------------------------------------------------


def test_record_and_load_done_job() -> None:
    job = _make_job(title="Track 1", artist="Artist 1", status=JobStatus.DONE)
    DownloadHistory.record(job)

    entries = DownloadHistory.load()
    assert len(entries) == 1
    assert entries[0]["id"] == job.history_id
    assert entries[0]["title"] == "Track 1"
    assert entries[0]["artist"] == "Artist 1"
    assert entries[0]["status"] == "done"
    assert entries[0]["status_label"] == "Descargada"


def test_record_failed_job_with_error() -> None:
    job = _make_job(title="Broken Track", status=JobStatus.FAILED, error="Connection timeout")
    DownloadHistory.record(job)

    entries = DownloadHistory.load()
    assert len(entries) == 1
    assert entries[0]["status"] == "failed"
    assert entries[0]["error"] == "Connection timeout"
    assert entries[0]["status_label"] == "Con error"


def test_record_deduplication_on_retry() -> None:
    job = _make_job(title="Retry Track", status=JobStatus.FAILED, error="403 Forbidden")
    DownloadHistory.record(job)
    assert len(DownloadHistory.load()) == 1
    assert DownloadHistory.load()[0]["status"] == "failed"

    # Reintento exitoso del mismo trabajo (mismo history_id)
    job.status = JobStatus.DONE
    job.error = ""
    DownloadHistory.record(job)

    entries = DownloadHistory.load()
    assert len(entries) == 1
    assert entries[0]["status"] == "done"
    assert entries[0]["error"] == ""


def test_history_max_entries(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("sakura.core.download_history.MAX_ENTRIES", 5)

    for i in range(10):
        job = _make_job(title=f"Track {i}")
        DownloadHistory.record(job)

    entries = DownloadHistory.load()
    assert len(entries) == 5
    assert entries[0]["title"] == "Track 9"
    assert entries[-1]["title"] == "Track 5"


def test_load_resilient_to_corrupted_file() -> None:
    path = config.download_history_file()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("{ not a valid json [", encoding="utf-8")

    assert DownloadHistory.load() == []

    path.write_text(json.dumps({"not": "a list"}), encoding="utf-8")
    assert DownloadHistory.load() == []


def test_clear_removes_file() -> None:
    job = _make_job()
    DownloadHistory.record(job)
    assert config.download_history_file().exists()

    DownloadHistory.clear()
    assert not config.download_history_file().exists()
    assert DownloadHistory.load() == []


# --- Dialog & UI ------------------------------------------------------------


def test_dialog_empty_state(qapp) -> None:
    dialog = DownloadHistoryDialog()
    assert "0 de 0" in dialog.count.text()
    assert dialog.clear_btn.isEnabled() is False


def test_dialog_renders_rows_and_counts(qapp) -> None:
    job1 = _make_job("Cancion 1", "Artista 1", JobStatus.DONE)
    job2 = _make_job("Cancion 2", "Artista 2", JobStatus.FAILED, error="Error de red")
    DownloadHistory.record(job1)
    DownloadHistory.record(job2)

    dialog = DownloadHistoryDialog()
    assert "2 de 2" in dialog.count.text()
    assert dialog.clear_btn.isEnabled() is True

    rows = dialog.findChildren(HistoryRow)
    assert len(rows) == 2


def test_dialog_filtering_by_status(qapp) -> None:
    job1 = _make_job("Cancion 1", "Artista 1", JobStatus.DONE)
    job2 = _make_job("Cancion 2", "Artista 2", JobStatus.FAILED, error="Error de red")
    DownloadHistory.record(job1)
    DownloadHistory.record(job2)

    dialog = DownloadHistoryDialog()

    # Filtrar solo con error
    idx = dialog.filter_box.findData("failed")
    assert idx >= 0
    dialog.filter_box.setCurrentIndex(idx)

    assert "1 de 2" in dialog.count.text()
    rows = dialog.findChildren(HistoryRow)
    assert len(rows) == 1
    assert rows[0].title.text() == "Cancion 2"

    # Filtrar solo descargadas
    idx = dialog.filter_box.findData("done")
    dialog.filter_box.setCurrentIndex(idx)
    assert "1 de 2" in dialog.count.text()
    rows = dialog.findChildren(HistoryRow)
    assert len(rows) == 1
    assert rows[0].title.text() == "Cancion 1"


def test_dialog_search_filter(qapp) -> None:
    job1 = _make_job("Bohemian Rhapsody", "Queen", JobStatus.DONE)
    job2 = _make_job("Imagine", "John Lennon", JobStatus.DONE)
    DownloadHistory.record(job1)
    DownloadHistory.record(job2)

    dialog = DownloadHistoryDialog()
    dialog.search.setText("queen")

    assert "1 de 2" in dialog.count.text()
    rows = dialog.findChildren(HistoryRow)
    assert len(rows) == 1
    assert rows[0].title.text() == "Bohemian Rhapsody"

    dialog.search.setText("lennon")
    assert "1 de 2" in dialog.count.text()
    rows = dialog.findChildren(HistoryRow)
    assert len(rows) == 1
    assert rows[0].title.text() == "Imagine"

    dialog.search.setText("inexistente")
    assert "0 de 2" in dialog.count.text()
    assert len(dialog.findChildren(HistoryRow)) == 0


def test_dialog_clear_confirmation_accepted(qapp, monkeypatch: pytest.MonkeyPatch) -> None:
    DownloadHistory.record(_make_job("Track", status=JobStatus.DONE))
    dialog = DownloadHistoryDialog()
    assert dialog.clear_btn.isEnabled() is True

    cleared_emitted = []
    dialog.cleared.connect(lambda: cleared_emitted.append(True))

    monkeypatch.setattr(
        QMessageBox, "question", lambda *a, **k: QMessageBox.StandardButton.Yes
    )
    dialog.clear_btn.click()

    assert cleared_emitted == [True]
    assert DownloadHistory.load() == []
    assert "0 de 0" in dialog.count.text()
    assert dialog.clear_btn.isEnabled() is False


def test_dialog_clear_confirmation_rejected(qapp, monkeypatch: pytest.MonkeyPatch) -> None:
    DownloadHistory.record(_make_job("Track", status=JobStatus.DONE))
    dialog = DownloadHistoryDialog()

    cleared_emitted = []
    dialog.cleared.connect(lambda: cleared_emitted.append(True))

    monkeypatch.setattr(
        QMessageBox, "question", lambda *a, **k: QMessageBox.StandardButton.No
    )
    dialog.clear_btn.click()

    assert cleared_emitted == []
    assert len(DownloadHistory.load()) == 1
    assert dialog.clear_btn.isEnabled() is True


def test_history_row_folder_button(qapp, tmp_path: Path) -> None:
    test_file = tmp_path / "song.mp3"
    test_file.write_text("dummy", encoding="utf-8")

    entry_with_file = {
        "title": "Song",
        "artist": "Artist",
        "status": "done",
        "filepath": str(test_file),
    }
    row_with_file = HistoryRow(entry_with_file)
    assert row_with_file.folder_btn is not None

    entry_no_file = {
        "title": "Song 2",
        "artist": "Artist 2",
        "status": "done",
        "filepath": str(tmp_path / "nonexistent.mp3"),
    }
    row_no_file = HistoryRow(entry_no_file)
    assert row_no_file.folder_btn is None


def test_format_time_formats_nicely() -> None:
    from datetime import datetime

    now_iso = datetime.now().astimezone().isoformat()
    formatted = _format_time(now_iso)
    assert formatted.startswith("Hoy,")

    assert _format_time("") == ""
    assert _format_time("invalid-date") == "invalid-date"


def test_queue_page_emits_history_requested_when_empty(qapp) -> None:
    page = QueuePage()
    assert page._controls.isHidden() is True

    emitted = []
    page.history_requested.connect(lambda: emitted.append(True))

    assert not page._message.secondary_button.isHidden()
    page._message.secondary_button.click()

    assert emitted == [True]


def test_queue_page_emits_history_requested_from_controls(qapp) -> None:
    page = QueuePage()
    page.add_job(_make_job("Cancion", status=JobStatus.DOWNLOADING))
    assert not page._controls.isHidden()

    emitted = []
    page.history_requested.connect(lambda: emitted.append(True))

    page.history_button.click()
    assert emitted == [True]
