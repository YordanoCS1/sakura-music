"""Ajustes de cookies, descargas simultaneas y actualización de herramientas."""

from __future__ import annotations

from PySide6.QtCore import QObject, Signal

from sakura.config import load_settings, save_settings
from sakura.ui.pages.settings import SettingsPage
from sakura.ui.services.downloader import DownloadManager


class FakeRunner(QObject):
    line = Signal(str)
    completed = Signal(int)
    failed = Signal(str)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.commands: list[list[str]] = []
        self.is_running = False

    def start(self, command: list[str]) -> None:
        self.commands.append(command)
        self.is_running = True


def test_elegir_navegador_persiste_el_ajuste_de_cookies(qapp) -> None:
    page = SettingsPage()

    page.cookie_box.setCurrentIndex(page.cookie_box.findData("edge"))

    assert load_settings()["youtube_cookies_browser"] == "edge"


def test_actualizar_herramientas_ejecuta_ambos_comandos_en_orden(
    qapp, monkeypatch
) -> None:
    monkeypatch.setattr(
        "sakura.ui.pages.settings.ProcessRunner",
        FakeRunner,
    )
    monkeypatch.setattr(
        "sakura.ui.pages.settings.build_ytdlp_update_command",
        lambda: ["python", "-m", "pip", "install", "--upgrade", "yt-dlp"],
    )
    monkeypatch.setattr(
        "sakura.ui.pages.settings.build_ffmpeg_update_command",
        lambda: ["winget", "upgrade", "--id", "Gyan.FFmpeg.Shared"],
    )
    page = SettingsPage()

    page._on_update_tools()

    assert page._update_runner.commands == [
        ["python", "-m", "pip", "install", "--upgrade", "yt-dlp"]
    ]
    assert not page.update_tools_btn.isEnabled()

    page._update_runner.is_running = False
    page._update_runner.completed.emit(0)
    qapp.processEvents()
    assert page._update_runner.commands[-1] == [
        "winget",
        "upgrade",
        "--id",
        "Gyan.FFmpeg.Shared",
    ]

    page._update_runner.is_running = False
    page._update_runner.completed.emit(0)
    qapp.processEvents()
    assert page.update_tools_btn.isEnabled()
    assert "yt-dlp: actualizado" in page.tool_update_status.text()
    assert "FFmpeg: actualizado" in page.tool_update_status.text()


# --- descargas simultáneas ---------------------------------------------------


def test_el_combo_ofrece_el_rango_permitido(qapp) -> None:
    from sakura.ui.pages.settings import DEFAULT_CONCURRENT, MAX_CONCURRENT, MIN_CONCURRENT

    pagina = SettingsPage()

    assert pagina.concurrent_box.count() == MAX_CONCURRENT - MIN_CONCURRENT + 1
    assert pagina.concurrent_box.currentData() == DEFAULT_CONCURRENT


def test_el_rango_lo_manda_el_gestor_no_la_pagina(qapp) -> None:
    """La página no inventa el tope: lo lee del `DownloadManager`."""
    from sakura.ui.pages.settings import MAX_CONCURRENT

    assert MAX_CONCURRENT == DownloadManager.MAX_CONCURRENT_ALLOWED


def test_cambiar_las_simultaneas_se_guarda_y_avisa(qapp) -> None:
    pagina = SettingsPage()
    avisos: list[int] = []
    pagina.max_concurrent_changed.connect(avisos.append)

    pagina.concurrent_box.setCurrentIndex(3)

    assert avisos == [4]
    assert load_settings()["max_concurrent_downloads"] == 4


def test_con_cookies_el_aviso_dice_que_sera_una(qapp) -> None:
    """Elegir 4 con cookies no engaña: el gestor va a usar una."""
    save_settings({"youtube_cookies_browser": "chrome"})
    pagina = SettingsPage()

    pagina._update_aviso_concurrentes()

    assert "1" in pagina.concurrent_hint.text()


def _gestor_with_ajuste(monkeypatch, tmp_path, value) -> DownloadManager:
    save_settings({"max_concurrent_downloads": value})
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_dir", lambda: tmp_path / "staging"
    )
    (tmp_path / "staging").mkdir(exist_ok=True)
    return DownloadManager()


def test_el_gestor_acepta_el_ajuste_de_simultaneas(monkeypatch, tmp_path) -> None:
    gestor = _gestor_with_ajuste(monkeypatch, tmp_path, 3)

    assert gestor.max_concurrent == 3
    gestor.shutdown()


def test_un_ajuste_fuera_de_rango_se_acota(monkeypatch, tmp_path) -> None:
    """99 simultáneas abriría 99 procesos: el valor se recorta, no se obedece."""
    gestor = _gestor_with_ajuste(monkeypatch, tmp_path, 99)

    assert gestor.max_concurrent == DownloadManager.MAX_CONCURRENT_ALLOWED
    gestor.shutdown()


def test_un_ajuste_invalido_cae_al_default(monkeypatch, tmp_path) -> None:
    gestor = _gestor_with_ajuste(monkeypatch, tmp_path, "muchas")

    assert gestor.max_concurrent == DownloadManager.MAX_CONCURRENT
    gestor.shutdown()


