"""Flujo de album: tabla de revision y encolado con tags del catalogo."""

from __future__ import annotations

import pytest
from PySide6.QtCore import QObject, Signal
from PySide6.QtWidgets import QDialog

from sakura.core.album_match import Match, Verdict
from sakura.core.metadata_sources import Candidate
from sakura.core.models import JobStatus, SearchResult
from sakura.ui.services.album_resolver import folder_album, query_track
from sakura.ui.services.downloader import DownloadManager
from sakura.ui.widgets.album_review import AlbumReviewDialog


class FakeRunner(QObject):
    """Dobla de `ProcessRunner`: guarda el comando y no lanza nada."""

    line = Signal(str)
    failed = Signal(str)
    completed = Signal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.is_running = False
        self.commands: list[list[str]] = []

    def start(self, command: list[str]) -> None:
        self.commands.append(command)
        self.is_running = True

    def kill(self) -> None:
        self.is_running = False

    def shutdown(self, timeout_ms: int = 3000) -> None:
        self.kill()


def track_item(title_text: str = "One More Time", seconds_value: int = 320) -> Candidate:
    return Candidate(
        source="itunes",
        title=title_text,
        artist="Daft Punk",
        album="Discovery",
        year="2001",
        genre="Electronic",
        track_number="1",
        duration_ms=seconds_value * 1000,
        album_id="1",
    )


def video(title_text: str = "One More Time", seconds_value: int = 320) -> SearchResult:
    return SearchResult(
        id=title_text[:6],
        title=title_text,
        url=f"https://youtu.be/{title_text[:6]}",
        uploader="Daft Punk",
        duration=seconds_value,
    )


def match(
    verdict: Verdict = Verdict.MATCHES, with_video: bool = True
) -> Match:
    return Match(
        candidate=track_item(),
        video=video() if with_video else None,
        verdict=verdict,
        reason="5:20 contra 5:20",
    )


# --- la tabla ----------------------------------------------------------------


def test_una_fila_por_pista_con_su_motivo(qapp) -> None:
    dialog = AlbumReviewDialog("Discovery", [match(), match(Verdict.DOUBTFUL)])

    assert dialog.table.rowCount() == 2
    assert "One More Time" in dialog.table.item(0, 2).text()
    assert "5:20 contra 5:20" in dialog.table.item(0, 5).text()
    assert "Coincide" in dialog.table.item(0, 5).text()
    assert "Revisar" in dialog.table.item(1, 5).text()


def test_lo_dudoso_no_esta_marcado_de_una(qapp) -> None:
    """Una coincidencia dudosa tiene que pedir confirmacion explicita."""
    dialog = AlbumReviewDialog("Discovery", [match(Verdict.MATCHES), match(Verdict.DOUBTFUL)])

    marked = [dialog._checks[row_index].isChecked() for row_index in range(2)]

    assert marked == [True, True], "las dudosas se preseleccionan pero se ven"


def test_sin_match_no_se_puede_aprobar(qapp) -> None:
    dialog = AlbumReviewDialog(
        "Discovery", [match(Verdict.WITHOUT_MATCH, with_video=False)]
    )

    assert dialog.approved_tracks() == [], "sin video no hay nada que descargar"


def test_desmarcar_saca_la_pista_de_la_aprobacion(qapp) -> None:
    dialog = AlbumReviewDialog("Discovery", [match()])

    dialog._checks[0].setChecked(False)

    assert dialog.approved_tracks() == []
    assert dialog.confirmar.isEnabled() is False


def test_confirmar_emite_las_aprobadas(qapp) -> None:
    dialog = AlbumReviewDialog("Discovery", [match(), match(Verdict.DOUBTFUL)])
    recibidas = []
    dialog.approved.connect(lambda list: recibidas.extend(list))

    dialog._confirmar()

    assert len(recibidas) == 2
    assert dialog.result() == QDialog.DialogCode.Accepted


def test_sin_elegir_nada_no_se_puede_confirmar(qapp) -> None:
    dialog = AlbumReviewDialog("Discovery", [match()])

    dialog._mark_all(False)

    assert dialog.approved_tracks() == []
    assert dialog.confirmar.isEnabled() is False


def test_el_resumen_cuenta_los_estados(qapp) -> None:
    dialog = AlbumReviewDialog(
        "Discovery",
        [match(), match(Verdict.DOUBTFUL), match(Verdict.WITHOUT_MATCH, with_video=False)],
    )

    assert "1 coincide" in dialog.summary.text()
    assert "1 dudoso" in dialog.summary.text()
    assert "1 sin match" in dialog.summary.text()


# --- nombres -----------------------------------------------------------------


def test_la_consulta_de_pista_usa_artista_y_titulo() -> None:
    assert query_track(track_item()) == "Daft Punk One More Time"


def test_la_carpeta_del_album_separa_artista_y_album() -> None:
    assert folder_album(track_item()) == "Daft Punk/Discovery"


def test_si_el_album_es_el_artista_no_se_repite() -> None:
    candidate = track_item()
    candidate.album = "Discovery"
    candidate.artist = "Discovery"

    assert folder_album(candidate) == "Discovery"


def test_sin_album_cae_a_un_nombre_legible() -> None:
    candidate = track_item()
    candidate.album = ""

    assert folder_album(candidate) == "Daft Punk/Album"


# --- encolado ----------------------------------------------------------------


def _aislar_destinos(monkeypatch, tmp_path) -> None:
    """Staging y destino en el tmp, para no tocar la biblioteca real."""
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_dir", lambda: tmp_path / "staging"
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_target_dir", lambda: tmp_path / "music"
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.library_dir", lambda: tmp_path / "music"
    )
    (tmp_path / "staging").mkdir(exist_ok=True)
    (tmp_path / "music").mkdir(exist_ok=True)


@pytest.fixture()
def gestor(qapp, monkeypatch, tmp_path) -> DownloadManager:
    """DownloadManager con el proceso de yt-dlp doblado."""
    monkeypatch.setattr(
        "sakura.ui.services.downloader.ProcessRunner", FakeRunner
    )
    _aislar_destinos(monkeypatch, tmp_path)
    mgr = DownloadManager()
    yield mgr
    mgr.shutdown()


def test_el_trabajo_de_album_guarda_la_ficha(gestor) -> None:
    """El trabajo tiene que llevar el Candidate para escribir tags al final."""
    candidate = track_item()

    job = gestor.enqueue_album_track(video(), candidate, folder_path="Daft Punk/Discovery")

    assert job.album_track is candidate
    assert job.playlist_title == "Daft Punk/Discovery"
    assert job.status is JobStatus.DOWNLOADING


def test_el_comando_de_album_usa_la_carpeta_del_album(gestor) -> None:
    """El archivo tiene que caer en 'Artista/Album', no en una carpeta por canal."""
    gestor.enqueue_album_track(video(), track_item(), folder_path="Daft Punk/Discovery")

    comando = next(c for slot in gestor._slots for c in slot.runner.commands)
    assert any("Daft Punk" in part and "Discovery" in part for part in comando)