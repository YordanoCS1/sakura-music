"""Logica de la cola de descargas, sin lanzar procesos reales."""

from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from PySide6.QtCore import QObject, Signal

from sakura.config import OUTPUT_TEMPLATE
from sakura.core.metadata import read_tags, update_text_tags
from sakura.core.models import JobStatus, SearchResult
from sakura.core.text import clear_title_y_artist
from sakura.core.tools import ToolMissing, ffmpeg_location, friendly_error
from sakura.ui.services import DownloadManager

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"

requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")


class FakeRunner(QObject):
    """Dobla de `ProcessRunner`: guarda el comando y permite guionizar la salida."""

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

    def emit_line(self, line: str) -> None:
        self.line.emit(line)

    def emit_failed(self, message: str) -> None:
        # Igual que el proceso real: `failed` solo se emite cuando el proceso ni
        # siquiera arranco, asi que el slot queda libre para el reintento.
        self.is_running = False
        self.failed.emit(message)

    def emit_completed(self, code: int = 0) -> None:
        self.is_running = False
        self.completed.emit(code)


@pytest.fixture()
def runner(monkeypatch) -> type[FakeRunner]:
    monkeypatch.setattr("sakura.ui.services.downloader.ProcessRunner", FakeRunner)
    return FakeRunner


@pytest.fixture()
def manager(qapp, runner, monkeypatch, tmp_path):
    monkeypatch.setattr(
        "sakura.ui.services.downloader.download_queue_file",
        lambda: tmp_path / "download_queue.json",
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_dir", lambda: tmp_path / "staging"
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.music_dir", lambda: tmp_path / "music"
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.library_dir", lambda: tmp_path / "music"
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_target_dir", lambda: tmp_path / "music"
    )
    (tmp_path / "staging").mkdir()

    (tmp_path / "music").mkdir()

    mgr = DownloadManager()
    mgr.tmp_path = tmp_path  # type: ignore[attr-defined]
    return mgr


_contador = iter(range(1, 10_000))


def result(title: str = "cancion") -> SearchResult:
    # Cada resultado necesita su propia URL: la cola deduplica por URL, asi que
    # con la misma URL todos los trabajos siguientes se saltarian como repetidos.
    return SearchResult(
        id=str(next(_contador)),
        title=title,
        url=f"https://youtu.be/x{next(_contador)}",
        uploader="Artista",
    )


def staging_dir(manager) -> object:
    return manager.tmp_path / "staging"  # type: ignore[attr-defined]


def runner_for(manager, job) -> FakeRunner:
    """El proceso que lleva un trabajo concreto.

    Busca el runner asignado, incluso si en el futuro se habilitan varios slots.
    """
    for slot in manager._slots:
        if slot.job is job:
            return slot.runner
    raise AssertionError("el trabajo no esta corriendo en ningun slot")


def comandos(manager) -> list[list[str]]:
    """Todos los comandos lanzados, en orden, sin importar el slot."""
    return [c for slot in manager._slots for c in slot.runner.commands]


def _agotar_reintentos(manager, job) -> None:
    """Falla un trabajo hasta que se acaben los intentos."""
    for _ in range(manager.MAX_ATTEMPTS):
        runner_for(manager, job).emit_completed(1)


@requires_ffmpeg
def mp3(destino: Path, **tags: str) -> Path:
    """Mp3 real con exactamente los tags pedidos."""
    import contextlib

    import mutagen

    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame",
         "-q:a", "9", str(destino)],
        check=True, capture_output=True,
    )
    # ffmpeg escribe sus propios tags, hay que partir de cero.
    audio = mutagen.File(destino)
    if audio is not None:
        with contextlib.suppress(Exception):
            audio.delete()
    if tags:
        update_text_tags(destino, **tags)
    return destino


# --- cola --------------------------------------------------------------------


def test_enqueue_dispara_el_trabajo(manager) -> None:
    job = manager.enqueue(result())
    assert manager.jobs == [job]
    assert job.status is JobStatus.DOWNLOADING
    assert comandos(manager), "no se lanzo ningun comando"


def test_hay_varios_descargandose_a_la_vez(manager) -> None:
    """Sin cookies de navegador la app usa todos los slots disponibles."""
    first = manager.enqueue(result("uno"))
    second = manager.enqueue(result("dos"))
    tercero = manager.enqueue(result("tres"))

    assert first.status is JobStatus.DOWNLOADING
    assert second.status is JobStatus.DOWNLOADING, "el segundo slot tambien arranca"
    assert tercero.status is JobStatus.PENDING, "no hay un tercer proceso"
    assert manager.pending_count == 1
    assert len(manager.active) == manager.max_concurrent == 2


def test_las_cookies_de_navegador_dejan_un_solo_proceso(manager, monkeypatch) -> None:
    """Con cookies la base del perfil se abre desde un proceso por descarga.

    Dos a la vez se pelean el bloqueo de ese archivo, asi que el limite baja a 1.
    """
    monkeypatch.setattr(
        "sakura.ui.services.downloader.cookies_navegador", lambda: "chrome"
    )
    with_cookies = DownloadManager()
    first = with_cookies.enqueue(result("uno"))
    second = with_cookies.enqueue(result("dos"))

    assert with_cookies.max_concurrent == with_cookies.MAX_CONCURRENT_WITH_COOKIES == 1
    assert first.status is JobStatus.DOWNLOADING
    assert second.status is JobStatus.PENDING

    # El ajuste se lee al arrancar: cambiarlo despues dejaria procesos sin runner.
    monkeypatch.setattr(
        "sakura.ui.services.downloader.cookies_navegador", lambda: ""
    )
    assert with_cookies.max_concurrent == with_cookies.MAX_CONCURRENT_WITH_COOKIES


def test_al_terminar_uno_arranca_el_que_esperaba(manager) -> None:
    first = manager.enqueue(result("uno"))
    manager.enqueue(result("dos"))
    tercero = manager.enqueue(result("tres"))

    producido = staging_dir(manager) / "job-0000" / "Artista" / "uno.mp3"
    producido.parent.mkdir(parents=True, exist_ok=True)
    producido.write_bytes(b"x" * 64)
    runner_for(manager, first).emit_completed(0)

    assert first.status is JobStatus.DONE
    assert tercero.status is JobStatus.DOWNLOADING, "el slot liberado se rellena"
    assert len(manager.active) == manager.max_concurrent
    # Los dos arranques iniciales mas el que entro al liberarse uno.
    assert len(comandos(manager)) == manager.max_concurrent + 1


def test_los_reintentos_ocupan_el_mismo_slot(manager) -> None:
    """Un reintento tiene que volver al proceso que lo estaba llevando."""
    first = manager.enqueue(result("uno"))
    second = manager.enqueue(result("dos"))
    proceso_first = runner_for(manager, first)

    proceso_first.emit_completed(1)

    assert first.status is JobStatus.DOWNLOADING, "debe reintentarse solo"
    assert first.attempts == 2
    assert "Reintentando" in first.error
    assert runner_for(manager, first) is proceso_first
    assert second.status is JobStatus.DOWNLOADING, "el otro slot no se toca"


def test_el_error_de_un_slot_no_afecta_al_otro(manager) -> None:
    """Los errores vistos por un proceso no se filtran al trabajo del otro."""
    first = manager.enqueue(result("uno"))
    second = manager.enqueue(result("dos"))

    # yt-dlp imprime el error en cada intento fallido.
    for _ in range(manager.MAX_ATTEMPTS):
        runner_for(manager, first).emit_line("ERROR: Private video")
        runner_for(manager, first).emit_completed(1)

    assert first.status is JobStatus.FAILED
    assert first.error == "El video es privado"
    assert second.status is JobStatus.DOWNLOADING, "el otro proceso sigue"
    assert second.error == "", "no debe heredar el error ajeno"


def test_el_progreso_se_asocia_a_su_trabajo(manager) -> None:
    """Dos lineas de progreso simultaneas no se pisan entre si."""
    first = manager.enqueue(result("uno"))
    second = manager.enqueue(result("dos"))

    runner_for(manager, first).emit_line("sakuradl|downloading|1024|4096|NA|2048")
    runner_for(manager, second).emit_line("sakuradl|downloading|2048|4096|NA|2048")

    assert first.downloaded_bytes == 1024
    assert second.downloaded_bytes == 2048


def test_cancelar_pendiente_lo_marca_sin_tocar_el_proceso(manager) -> None:
    active = [manager.enqueue(result(f"activo{n}")) for n in range(manager.max_concurrent)]
    pending = manager.enqueue(result("espera"))

    manager.cancel(pending)

    assert pending.status is JobStatus.CANCELLED
    assert all(job.status is JobStatus.DOWNLOADING for job in active)
    assert manager.pending_count == 0


def test_cancelar_un_activo_no_toca_el_otro(manager) -> None:
    first = manager.enqueue(result("uno"))
    second = manager.enqueue(result("dos"))
    tercero = manager.enqueue(result("tres"))
    proceso = runner_for(manager, first)

    manager.cancel(first)

    assert first.status is JobStatus.CANCELLED
    assert second.status is JobStatus.DOWNLOADING, "el otro slot sigue intacto"
    assert tercero.status is JobStatus.DOWNLOADING, "y toma su lugar"
    # El slot liberado se reutiliza, pero ahora lleva otro trabajo.
    assert runner_for(manager, tercero) is proceso


def test_la_cola_no_se_queda_parada_al_cancelar(manager, qapp, monkeypatch) -> None:
    """Matar un proceso es asincrono: el pendiente tiene que arrancar igual.

    Al cancelar, el hilo del slot sigue vivo un instante y `pump()` lo saltea.
    Cuando el proceso muerto por fin reporta su salida el slot ya esta vacio, y
    ese era el punto donde la cola se quedaba parada para siempre.
    """
    first = manager.enqueue(result("uno"))
    manager.enqueue(result("dos"))
    waiting = manager.enqueue(result("tres"))
    proceso = runner_for(manager, first)

    # `kill()` solo manda terminate(): el hilo del slot tarda un poco mas.
    monkeypatch.setattr(proceso, "kill", lambda: None)
    manager.cancel(first)

    qapp.processEvents()  # que no quede ningun reparto diferido pendiente
    assert waiting.status is JobStatus.PENDING, "todavia no hay slot libre"

    proceso.emit_completed(-1)  # el proceso cancelado por fin termina

    assert waiting.status is JobStatus.DOWNLOADING, "el slot liberado se rellena"


def test_shutdown_corta_todos_los_procesos(manager) -> None:
    jobs = [manager.enqueue(result(f"cancion{n}")) for n in range(manager.max_concurrent)]
    runners = [runner_for(manager, job) for job in jobs]

    manager.shutdown()

    assert all(runner.is_running is False for runner in runners)
    assert manager.active == []


def test_shutdown_guarda_descargas_activas_para_reanudarlas(manager) -> None:
    manager.enqueue(result("interrumpida"))
    manager.shutdown()

    restaurado = DownloadManager()

    assert len(restaurado.jobs) == 1
    assert restaurado.jobs[0].title == "interrumpida"
    assert restaurado.jobs[0].status is JobStatus.PENDING
    assert restaurado.jobs[0].attempts == 0


def test_un_error_persistido_se_puede_reintentar(manager) -> None:
    job = manager.enqueue(result("con error"))
    _agotar_reintentos(manager, job)
    manager.shutdown()

    restaurado = DownloadManager()
    failed_job = restaurado.jobs[0]
    assert failed_job.status is JobStatus.FAILED
    assert failed_job.error == "código 1"

    assert restaurado.retry_failed() == 1
    assert failed_job.status is JobStatus.DOWNLOADING
    assert failed_job.attempts == 1


def test_reintentar_uno_solo_no_toca_los_demas(manager) -> None:
    """La pastilla de cada fila solo repite ese trabajo."""
    first = manager.enqueue(result("primero"))
    second = manager.enqueue(result("segundo"))
    _agotar_reintentos(manager, first)

    assert first.status is JobStatus.FAILED
    assert manager.retry(first) is True

    assert first.status is JobStatus.DOWNLOADING
    assert first.attempts == 1, "el conteo de intentos vuelve a cero"
    assert second.status is JobStatus.DOWNLOADING, "el otro no se reinicia"
    assert manager.retry(second) is False, "uno en curso no se reintenta"


def test_no_se_reintenta_lo_que_no_se_puede(manager) -> None:
    job = manager.enqueue(result("terminada"))
    job.status = JobStatus.DONE

    assert manager.retry(job) is False
    assert job.status is JobStatus.DONE


def test_cancelar_todo_corta_activos_y_pendientes(manager) -> None:
    from sakura.core.models import DownloadJob

    finished = DownloadJob(result=result("terminado"))
    finished.status = JobStatus.DONE
    manager._jobs.append(finished)
    active = [manager.enqueue(result(f"activo{n}")) for n in range(manager.max_concurrent)]
    pending = manager.enqueue(result("espera"))
    procesos = [runner_for(manager, job) for job in active]

    assert manager.cancel_all() == len(active) + 1

    assert finished.status is JobStatus.DONE, "lo terminado no se toca"
    assert pending.status is JobStatus.CANCELLED
    assert all(job.status is JobStatus.CANCELLED for job in active)
    assert all(proceso.is_running is False for proceso in procesos)
    assert manager.active == []
    assert manager.pending_count == 0


def test_no_se_repiten_descargas_de_la_misma_url(manager) -> None:
    """Dos descargas del mismo video a la vez se pisarian en el destino."""
    first = result("cancion")
    second = result("otro titulo")
    second.url = first.url

    job1 = manager.enqueue(first)
    job2 = manager.enqueue(second)

    assert job1.status is JobStatus.DOWNLOADING
    assert job2.status is JobStatus.SKIPPED
    assert "cola" in job2.error.lower()


def test_clear_finished_saca_los_terminados(manager) -> None:
    first = manager.enqueue(result("uno"))
    manager.enqueue(result("dos"))

    first.status = JobStatus.DONE
    manager.clear_finished()
    assert [j.title for j in manager.jobs] == ["dos"]


# --- staging ------------------------------------------------------------------


def test_staging_se_limpia_al_reiniciar_la_app(manager, monkeypatch) -> None:
    """El contador de staging vuelve a cero en cada arranque de la app.

    Sin la limpieza, yt-dlp ve el `.webm` de la sesion anterior, responde
    `has already been downloaded` y falla al posteprocesar el parcial.
    """
    manager.enqueue(result())

    dirty = staging_dir(manager) / "job-0000" / "Artista" / "pista.webm"
    dirty.parent.mkdir(parents=True, exist_ok=True)
    dirty.write_bytes(b"parcial")

    # Sesion nueva: mismo staging, contador reiniciado.
    reiniciado = DownloadManager()
    reiniciado.enqueue(result())

    assert not dirty.exists(), "el staging previo debio borrarse"


def test_al_fallar_se_borra_el_parcial(manager) -> None:
    job = manager.enqueue(result())
    runner_for(manager, job).emit_line("sakuradl|downloading|50|100|NA|1000")

    # El parcial que dejo yt-dlp a mitad de camino.
    parcial = staging_dir(manager) / "job-0000" / "parcial.mp3.part"
    parcial.parent.mkdir(parents=True, exist_ok=True)
    parcial.write_bytes(b"basura")
    assert parcial.exists()

    _agotar_reintentos(manager, job)

    assert not parcial.exists(), "el parcial no puede quedar tirado"
    assert not (staging_dir(manager) / "job-0000").exists()


def test_al_terminar_mueve_el_mp3_a_la_biblioteca(manager) -> None:
    job = manager.enqueue(result("mi cancion"))

    producido = staging_dir(manager) / "job-0000" / "Artista" / "mi cancion.mp3"
    producido.parent.mkdir(parents=True, exist_ok=True)
    producido.write_bytes(b"x" * 2048)

    runner_for(manager, job).emit_completed(0)

    assert job.status is JobStatus.DONE
    assert job.filepath is not None
    assert job.filepath.exists()
    assert job.filepath.parent.name == "Artista"
    assert job.filepath.suffix == ".mp3"
    assert not (staging_dir(manager) / "job-0000").exists(), "el staging debe desaparecer"


def test_sin_archivo_producido_marca_fallo(manager) -> None:
    job = manager.enqueue(result())
    runner_for(manager, job).emit_completed(0)

    assert job.status is JobStatus.FAILED
    assert job.filepath is None


def test_ignora_archivos_parciales_al_elegir(manager) -> None:
    job = manager.enqueue(result("cancion"))

    base = staging_dir(manager) / "job-0000" / "Artista"
    base.mkdir(parents=True, exist_ok=True)
    (base / "cancion.mp3.part").write_bytes(b"x" * 5000)
    (base / "cancion.mp3").write_bytes(b"y" * 200)

    runner_for(manager, job).emit_completed(0)

    assert job.filepath is not None
    assert job.filepath.name == "cancion.mp3"


# --- saneado de tags ----------------------------------------------------------


@requires_ffmpeg
def test_sanea_el_titulo_sucio_de_youtube(manager) -> None:
    """yt-dlp deja 'Cancion (Official Video)'; el título se limpia al descargar."""
    job = manager.enqueue(result("Mi Cancion (Official Video) [4K]"))
    mp3(
        staging_dir(manager) / "job-0000" / "Artista" / "cancion.mp3",
        title="cancion",
    )

    runner_for(manager, job).emit_completed(0)

    expected_value, _ = clear_title_y_artist("Mi Cancion (Official Video) [4K]", "Artista")
    tags = read_tags(job.filepath)
    assert tags.title == expected_value
    assert "Official" not in tags.title


@requires_ffmpeg
def test_no_borra_los_tags_que_yt_dlp_ya_escribio(manager) -> None:
    """Regresión: `write_tags` vaciaba album/año/género/número al sanelar.

    Hay que usar `update_text_tags`, que solo toca title y artist.
    """
    job = manager.enqueue(result("Mi Cancion"))
    mp3(
        staging_dir(manager) / "job-0000" / "Artista" / "cancion.mp3",
        title="cancion",
        artist="Artista",
        album="Un Album",
        year="2024",
        genre="Pop",
        track_number="3",
    )

    runner_for(manager, job).emit_completed(0)

    tags = read_tags(job.filepath)
    assert tags.title == "Mi Cancion"
    assert tags.album == "Un Album", "el album no debe perderse"
    assert tags.year == "2024", "el año no debe perderse"
    assert tags.genre == "Pop", "el género no debe perderse"
    assert tags.track_number == "3", "el número de pista no debe perderse"


@requires_ffmpeg
def test_no_toca_un_titulo_que_ya_es_bueno(manager) -> None:
    """Si el título no parece un nombre de archivo, se respeta lo que hay."""
    job = manager.enqueue(result("Mi Cancion"))
    mp3(
        staging_dir(manager) / "job-0000" / "Artista" / "cancion.mp3",
        title="Mariposas",
        artist="Verdes",
    )

    runner_for(manager, job).emit_completed(0)

    tags = read_tags(job.filepath)
    assert tags.title == "Mariposas"
    assert tags.artist == "Verdes"


def test_archivo_ilegible_no_tumba_la_descarga(manager) -> None:
    """Sin capa de tags no se pierde la descarga: el archivo va igual a destino."""
    job = manager.enqueue(result("Mi Cancion"))

    basura = staging_dir(manager) / "job-0000" / "Artista" / "cancion.mp3"
    basura.parent.mkdir(parents=True, exist_ok=True)
    basura.write_bytes(b"no es audio")

    runner_for(manager, job).emit_completed(0)

    assert job.status is JobStatus.DONE
    assert job.filepath is not None
    assert job.filepath.exists()


# --- reintentos ---------------------------------------------------------------


def test_un_fallo_no_es_el_ultimo_intento(manager) -> None:
    job = manager.enqueue(result())

    runner_for(manager, job).emit_completed(1)

    assert job.status is JobStatus.DOWNLOADING, "debe reintentarse solo"
    assert job.attempts == 2
    assert "Reintentando" in job.error


def test_reintenta_hasta_el_tope_y_luego_falla(manager) -> None:
    job = manager.enqueue(result())

    _agotar_reintentos(manager, job)

    assert job.status is JobStatus.FAILED
    assert job.attempts == manager.MAX_ATTEMPTS


def test_el_error_final_usa_el_mensaje_del_ultimo_intento(manager) -> None:
    job = manager.enqueue(result())

    runner_for(manager, job).emit_completed(1)  # primer intento, sin mensaje
    runner_for(manager, job).emit_line("ERROR: Sign in to confirm your age")
    runner_for(manager, job).emit_completed(1)
    runner_for(manager, job).emit_line("ERROR: Sign in to confirm your age")
    runner_for(manager, job).emit_completed(1)

    assert job.status is JobStatus.FAILED
    assert job.error == friendly_error("ERROR: Sign in to confirm your age")


def test_el_reintento_arranca_desde_cero(manager) -> None:
    """El progreso del intento anterior no puede quedar en el trabajo."""
    job = manager.enqueue(result())
    runner_for(manager, job).emit_line("sakuradl|downloading|1024|4096|NA|2048")
    assert job.downloaded_bytes == 1024

    runner_for(manager, job).emit_completed(1)

    assert job.downloaded_bytes == 0
    assert job.total_bytes == 0
    assert job.speed == ""


def test_el_reintento_usa_un_staging_limpio(manager) -> None:
    """yt-dlp se queja de `has already been downloaded` con un staging sucio."""
    job = manager.enqueue(result())

    for _ in range(manager.MAX_ATTEMPTS - 1):
        runner_for(manager, job).emit_completed(1)

    # Solo debe quedar el staging del intento en curso.
    folders = sorted(p.name for p in staging_dir(manager).iterdir())
    assert folders == [f"job-{manager.MAX_ATTEMPTS - 1:04d}"]


def test_un_exito_no_gasta_reintentos(manager) -> None:
    job = manager.enqueue(result("cancion"))
    producido = staging_dir(manager) / "job-0000" / "Artista" / "cancion.mp3"
    producido.parent.mkdir(parents=True, exist_ok=True)
    producido.write_bytes(b"x" * 64)

    runner_for(manager, job).emit_completed(0)

    assert job.status is JobStatus.DONE
    assert job.attempts == 1
    assert "Reintentando" not in job.error


# --- carpeta de playlist -------------------------------------------------------


def test_una_busqueda_suelta_va_a_carpeta_por_artista(manager) -> None:
    manager.enqueue(result("cancion"))

    plantilla = manager._plantilla(manager.current)
    assert plantilla is None, "sin playlist se usa la plantilla por defecto"


def test_una_playlist_va_toda_a_una_carpeta_con_su_nombre(manager) -> None:
    job = manager.enqueue(result("cancion"), playlist_title="Lo mejor de 2024")

    plantilla = manager._plantilla(job)
    assert plantilla == "Lo mejor de 2024/%(title)s.%(ext)s"
    assert "Lo mejor de 2024" in plantilla
    assert "uploader" not in plantilla, "no debe seguir usando el canal"


def test_una_playlist_sin_nombre_cae_al_comportamiento_anterior(manager) -> None:
    job = manager.enqueue(result("cancion"), playlist_title="   ")
    assert manager._plantilla(job) is None


def test_el_comando_de_playlist_lleva_la_plantilla(manager) -> None:
    manager.enqueue(result("cancion"), playlist_title="Mi playlist")

    comando = comandos(manager)[0]
    assert "Mi playlist/%(title)s.%(ext)s" in comando


def test_el_comando_normal_lleva_la_plantilla_por_artista(manager) -> None:
    manager.enqueue(result("cancion"))

    comando = comandos(manager)[0]
    assert OUTPUT_TEMPLATE in comando
    assert "Mi playlist/%(title)s.%(ext)s" not in comando


def test_cada_job_de_una_playlist_conserva_el_nombre(manager) -> None:
    """Todos los de la tanda tienen que caer en la misma carpeta."""
    for n in range(1, 4):
        job = manager.enqueue(result(f"cancion {n}"), playlist_title="Mi playlist")
        assert job.playlist_title == "Mi playlist"


def test_archivos_de_playlist_se_mueven_a_su_carpeta(manager) -> None:
    job = manager.enqueue(result("una cancion"), playlist_title="Mi playlist")
    producido = staging_dir(manager) / "job-0000" / "Mi playlist" / "una cancion.opus"
    producido.parent.mkdir(parents=True, exist_ok=True)
    producido.write_bytes(b"audio")

    runner_for(manager, job).emit_completed(0)

    assert job.filepath is not None
    assert job.filepath == manager.tmp_path / "music" / "Mi playlist" / "una cancion.opus"  # type: ignore[attr-defined]


def test_la_carpeta_de_una_playlist_queda_fuera_de_la_carpeta_de_descargas(
    manager, monkeypatch, tmp_path
) -> None:
    """La lista va a la raíz de la biblioteca, no dentro de la carpeta de descargas."""
    biblioteca = tmp_path / "biblioteca"
    descargas = biblioteca / "idle"
    biblioteca.mkdir()
    descargas.mkdir()
    monkeypatch.setattr(
        "sakura.ui.services.downloader.library_dir", lambda: biblioteca
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_target_dir", lambda: descargas
    )

    job = manager.enqueue(result("una cancion"), playlist_title="Twice Topic")
    producido = staging_dir(manager) / "job-0000" / "Twice Topic" / "una cancion.opus"
    producido.parent.mkdir(parents=True, exist_ok=True)
    producido.write_bytes(b"audio")

    runner_for(manager, job).emit_completed(0)

    assert job.filepath == biblioteca / "Twice Topic" / "una cancion.opus"
    assert not (descargas / "Twice Topic").exists()


def test_una_busqueda_suelta_sigue_en_la_carpeta_de_descargas(
    manager, monkeypatch, tmp_path
) -> None:
    """Sin lista, el archivo conserva la carpeta de descargas configurada."""
    biblioteca = tmp_path / "biblioteca"
    descargas = tmp_path / "descargas"
    biblioteca.mkdir()
    descargas.mkdir()
    monkeypatch.setattr(
        "sakura.ui.services.downloader.library_dir", lambda: biblioteca
    )
    monkeypatch.setattr(
        "sakura.ui.services.downloader.downloads_target_dir", lambda: descargas
    )

    job = manager.enqueue(result("una cancion"))
    producido = staging_dir(manager) / "job-0000" / "Artista" / "una cancion.opus"
    producido.parent.mkdir(parents=True, exist_ok=True)
    producido.write_bytes(b"audio")

    runner_for(manager, job).emit_completed(0)

    assert job.filepath == descargas / "Artista" / "una cancion.opus"
    assert not (biblioteca / "Artista").exists()


# --- duplicados --------------------------------------------------------------


def _put_existing(manager, name_text: str, subcarpeta: str = "Artista") -> Path:
    """Crea un archivo que parece una descarga ya hecha."""
    destino = manager.tmp_path / "music" / subcarpeta / name_text  # type: ignore[attr-defined]
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(b"x" * 128)
    return destino


def test_no_vuelve_a_bajar_lo_que_ya_existe(manager) -> None:
    _put_existing(manager, "cancion.opus")

    job = manager.enqueue(result("cancion"))

    assert job.status is JobStatus.SKIPPED
    assert comandos(manager) == [], "no debe lanzar yt-dlp"
    assert "ya está" in job.error.lower()


def test_el_duplicado_apunta_al_archivo_existente(manager) -> None:
    existing = _put_existing(manager, "cancion.opus")

    job = manager.enqueue(result("cancion"))

    assert job.filepath == existing
    assert existing.exists(), "no debe borrar ni pisar el archivo"


def test_el_titulo_se_compara_sin_mayusculas(manager) -> None:
    _put_existing(manager, "One More Time.opus")

    job = manager.enqueue(result("one more time"))

    assert job.status is JobStatus.SKIPPED


def test_otro_formato_no_cuenta_como_duplicado(manager) -> None:
    """Un mp3 no impide descargar la misma pista en opus."""
    _put_existing(manager, "cancion.mp3")

    job = manager.enqueue(result("cancion"))

    assert job.status is JobStatus.DOWNLOADING
    assert comandos(manager), "debe descargar"


def test_otro_titulo_no_cuenta_como_duplicado(manager) -> None:
    _put_existing(manager, "cancion.opus")

    job = manager.enqueue(result("otra cancion"))

    assert job.status is JobStatus.DOWNLOADING


def test_el_duplicado_no_tapa_el_siguiente_de_la_cola(manager) -> None:
    """Un trabajo saltado tiene que dejar avanzar la cola."""
    _put_existing(manager, "cancion.opus")

    saltado = manager.enqueue(result("cancion"))
    next = manager.enqueue(result("otra"))

    assert saltado.status is JobStatus.SKIPPED
    assert next.status is JobStatus.DOWNLOADING, "la cola debe seguir"


def test_los_caracteres_ilegales_no_impiden_detectar(manager) -> None:
    """yt-dlp saca la barra del nombre; hay que comparar contra el nombre real."""
    # En disco queda "ACDC", sin la barra. Los puntos si se conservan.
    _put_existing(manager, "ACDC - T.N.T.opus")

    job = manager.enqueue(result("AC/DC - T.N.T"))

    assert job.status is JobStatus.SKIPPED


def test_clear_finished_saca_los_saltados(manager) -> None:
    _put_existing(manager, "cancion.opus")
    manager.enqueue(result("cancion"))

    manager.clear_finished()

    assert manager.jobs == []


# --- progreso y errores -------------------------------------------------------


def test_progreso_actualiza_el_trabajo(manager) -> None:
    job = manager.enqueue(result())

    seen: list[int] = []
    manager.job_updated.connect(lambda j: seen.append(j.downloaded_bytes))
    runner_for(manager, job).emit_line("sakuradl|downloading|1024|4096|NA|2048")

    assert job.downloaded_bytes == 1024
    assert job.total_bytes == 4096
    assert job.progress_percent == 25
    assert seen == [1024]


def test_extractaudio_pasa_a_convirtiendo(manager) -> None:
    job = manager.enqueue(result())
    runner_for(manager, job).emit_line("[ExtractAudio] Destination: x.mp3")
    assert job.status is JobStatus.CONVERTING


def test_destination_no_confunde_descarga_con_conversion(manager) -> None:
    """yt-dlp imprime '[download] Destination:' al empezar, no al convertir."""
    job = manager.enqueue(result())
    runner_for(manager, job).emit_line("[download] Destination: x.webm")
    assert job.status is JobStatus.DOWNLOADING


def test_ultimo_error_de_yt_dlp_se_guarda(manager) -> None:
    job = manager.enqueue(result())

    runner_for(manager, job).emit_line("ERROR: Private video")
    for _ in range(manager.MAX_ATTEMPTS - 1):
        runner_for(manager, job).emit_completed(1)
        runner_for(manager, job).emit_line("ERROR: Private video")
    runner_for(manager, job).emit_completed(1)

    assert job.status is JobStatus.FAILED
    assert job.error == "El video es privado"


def test_fallo_de_proceso_marca_el_trabajo(manager) -> None:
    job = manager.enqueue(result())

    for _ in range(manager.MAX_ATTEMPTS):
        runner_for(manager, job).emit_failed("No se pudo iniciar: boom")

    assert job.status is JobStatus.FAILED
    assert "boom" in job.error
    assert manager.current is None


def test_sin_ffmpeg_el_trabajo_falla(manager, monkeypatch) -> None:
    def without_ffmpeg() -> str:
        raise ToolMissing("ffmpeg no está instalado")

    # El comando se arma en `core.tools`, asi que ahi hay que parchear.
    monkeypatch.setattr("sakura.core.tools.require_ffmpeg", without_ffmpeg)
    assert manager.ffmpeg_available() is False

    job = manager.enqueue(result())
    assert job.status is JobStatus.FAILED
    assert "ffmpeg" in job.error
    assert manager.current is None


def test_con_ffmpeg_disponible(manager) -> None:
    assert manager.ffmpeg_available() is True