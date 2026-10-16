"""Ventana principal: sidebar + barra superior + paginas."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import Qt, QTimer
from PySide6.QtGui import QKeySequence, QShortcut
from PySide6.QtWidgets import QHBoxLayout, QMessageBox, QStackedWidget, QVBoxLayout, QWidget

from ..config import DEFAULTS, load_settings
from ..core.formats import AudioFormat, get_format
from ..core.library import summarize
from ..core.models import DownloadJob, DownloadSummary, JobStatus, summarize_downloads
from . import theme as th
from .pages import HomePage, LibraryPage, QueuePage, SearchPage, SettingsPage
from .services import DownloadManager, LibraryReviewScanner
from .widgets import Sidebar, TitleBar
from .widgets.completion_dialog import CompletionDialog
from .widgets.topbar import TopBar

# Paginas donde el buscador global aporta algo. En el resto la barra superior
# se oculta: cada pagina trae sus propios controles.
PAGINAS_WITH_SEARCHER = frozenset({"home", "search"})

# Un solo origen para el valor por defecto: `set_nav_layout` cae aca cuando el
# ajuste guardado no es un modo conocido.
DEFAULT_NAV_LAYOUT = str(DEFAULTS["nav_layout"])

# Cuanto dura un aviso en la barra de titulo.
WARN_MS = 4000


class MainWindow(QWidget):
    """Esqueleto de la aplicacion. Sin logica de negocio todavia."""

    def __init__(self):
        super().__init__()
        self.setObjectName("Root")
        self.setWindowTitle("Sakura Music")
        self.setWindowFlag(Qt.WindowType.FramelessWindowHint, True)
        self.resize(1240, 800)
        self.setMinimumSize(940, 620)

        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        self.titlebar = TitleBar(self)
        root.addWidget(self.titlebar)

        body = QHBoxLayout()
        body.setContentsMargins(0, 0, 0, 0)
        body.setSpacing(0)

        self.sidebar = Sidebar()
        self.sidebar.page_selected.connect(self.show_page)
        body.addWidget(self.sidebar)

        main = QVBoxLayout()
        main.setContentsMargins(0, 0, 0, 0)
        main.setSpacing(0)

        self.topbar = TopBar()
        main.addWidget(self.topbar)

        self.pages = QStackedWidget()
        self.pages.setObjectName("ScrollArea")
        self.page_map: dict[str, QWidget] = {}
        self.page_titles: dict[str, str] = {}

        for key, page in (
            ("home", HomePage()),
            ("search", SearchPage()),
            ("library", LibraryPage()),
            ("queue", QueuePage()),
            ("settings", SettingsPage()),
        ):
            self.page_map[key] = page
            self.page_titles[key] = page.header.text()
            self.pages.addWidget(page)

        main.addWidget(self.pages, 1)
        body.addLayout(main, 1)
        root.addLayout(body, 1)

        self.downloads = DownloadManager(self)
        self.downloads.job_added.connect(self._on_job_added)
        self.downloads.job_updated.connect(self._on_job_updated)
        self.downloads.job_finished.connect(self._on_job_finished)
        self.downloads.persistence_error.connect(self._warn)

        self._current_page = "home"
        self._cerrando = False
        self._home_review_generation = 0
        self._nav_layout = str(load_settings().get("nav_layout", DEFAULT_NAV_LAYOUT))
        self._batch_downloads: dict[int, DownloadJob] = {}
        self._home_review_scanner = LibraryReviewScanner(self)
        self._home_review_scanner.finished.connect(self._on_home_review_finished)

        self._warn_timer = QTimer(self)
        self._warn_timer.setSingleShot(True)
        self._warn_timer.timeout.connect(lambda: self.titlebar.set_title(""))

        self.page_map["search"].download_requested.connect(self._on_download_requested)
        self.page_map["search"].download_all_requested.connect(self._on_download_all)
        self.page_map["search"].album_download_requested.connect(self._on_album_download)
        self.page_map["settings"].theme_changed.connect(self._on_theme_changed)
        self.page_map["settings"].nav_layout_changed.connect(self.set_nav_layout)
        self.page_map["settings"].format_changed.connect(self._on_format_changed)
        self.page_map["settings"].max_concurrent_changed.connect(self._on_max_concurrent_changed)
        self.page_map["settings"].library_folder_changed.connect(self._on_library_folder_changed)
        self.page_map["settings"].downloads_folder_changed.connect(self._on_downloads_folder_changed)
        self.topbar.page_selected.connect(self.show_page)
        self.topbar.search_changed.connect(self._on_search_changed)
        self.topbar.download_clicked.connect(self._ir_a_search)
        # La vista de la cola se limpia sola; acá solo hay que vaciar el gestor.
        self.page_map["queue"].clear_requested.connect(self._on_clear_finished)
        self.page_map["queue"].cancel_requested.connect(self._on_cancel_all)
        self.page_map["queue"].retry_requested.connect(self._on_retry_failed)
        self.page_map["queue"].retry_one_requested.connect(self._on_retry_one)

        home = self.page_map["home"]
        home.card_search.clicked.connect(lambda: self.show_page("search"))
        home.card_library.clicked.connect(lambda: self.show_page("library"))
        home.card_queue.clicked.connect(lambda: self.show_page("queue"))
        home.library_requested.connect(lambda: self.show_page("library"))
        home.library_review_requested.connect(self._on_library_review_requested)
        home.queue_requested.connect(lambda: self.show_page("queue"))
        self.page_map["library"].scanner.finished.connect(self._on_library_scanned)
        self.page_map["library"].review_data_changed.connect(
            self._on_library_review_data_changed
        )

        for job in self.downloads.jobs:
            self.page_map["queue"].add_job(job)
            if job.status is JobStatus.PENDING:
                self._batch_downloads[id(job)] = job
        self._refresh_home_downloads()

        self._register_shortcuts()
        self.set_nav_layout(self._nav_layout)
        self.show_page("home")
        self.downloads.resume_pending()

    def _on_library_scanned(self, _total: int, summary: dict[str, int]) -> None:
        """El resumen de Inicio sale del escaneo, sin volver a leer los archivos."""
        self._update_home_library(summary)

    def _on_library_review_data_changed(self) -> None:
        track_items = self.page_map["library"].model.tracks
        self._update_home_library(summarize(track_items))

    def _update_home_library(self, summary: dict[str, int]) -> None:
        library = self.page_map["library"]
        start = self.page_map["home"]
        start.set_summary(summary)
        start.set_review_pending()
        self._home_review_generation += 1
        self._home_review_scanner.scan(
            self._home_review_generation, list(library.model.tracks)
        )

    def _on_home_review_finished(
        self, generation: int, without_tags: int, without_cover: int, duplicadas: int
    ) -> None:
        if generation != self._home_review_generation or self._cerrando:
            return
        self.page_map["home"].set_review_counts(without_tags, without_cover, duplicadas)

    def _on_library_review_requested(self, review_filter: str) -> None:
        library = self.page_map["library"]
        library.set_review_filter(review_filter)
        self.show_page("library")

    def _on_clear_finished(self) -> None:
        """Saca de la cola lo ya terminado: la vista ya se limpio sola."""
        self.downloads.clear_finished()
        self._refresh_home_downloads()

    def _on_cancel_all(self) -> None:
        """Cancela lo pendiente y en curso, con confirmacion previa."""
        pending = [
            job
            for job in self.downloads.jobs
            if job.status is JobStatus.PENDING or job.status.is_active
        ]
        if not pending:
            return

        total = len(pending)
        confirmacion = QMessageBox.question(
            self,
            "Cancelar descargas",
            f"Se van a cancelar {total} descarga{'s' if total != 1 else ''} "
            "en curso o en espera.\n\n¿Continuar?",
        )
        if confirmacion != QMessageBox.StandardButton.Yes:
            return

        cancelled = self.downloads.cancel_all()
        if cancelled:
            s = "s" if cancelled != 1 else ""
            self._warn(f"{cancelled} descarga{s} cancelada{s}")

    def _on_retry_one(self, job) -> None:
        """Reintenta una sola descarga fallida o cancelada."""
        if not self.downloads.retry(job):
            return

        self._batch_downloads[id(job)] = job
        self.page_map["queue"].refresh_job(job)
        self._refresh_home_downloads()
        self._warn(f"{job.title} · en reintento")

    def _on_retry_failed(self) -> None:
        """Reintenta fallidas/canceladas tras corregir el problema de origen."""
        pending = [
            job
            for job in self.downloads.jobs
            if job.status in (JobStatus.FAILED, JobStatus.CANCELLED)
        ]
        for job in pending:
            self._batch_downloads[id(job)] = job
        retried = self.downloads.retry_failed()
        if retried:
            self._warn(f"{retried} descarga{'s' if retried != 1 else ''} en reintento")

    def _on_format_changed(self, format_id: str) -> None:
        fmt = get_format(format_id)
        search_page = self.page_map.get("search")
        if search_page and hasattr(search_page, "set_active_format"):
            search_page.set_active_format(format_id)
        if fmt.is_video:
            detail = f"{fmt.height}p" if fmt.height else "máxima calidad"
        else:
            detail = "sin recodificar" if not fmt.transcodes else f"{fmt.quality}"
        self._warn(f"Descarga: {fmt.label} · {detail}")

    def _on_max_concurrent_changed(self, count: int) -> None:
        """Los slots ya existen: avisar evita creer que el cambio surtió efecto."""
        in_uso = self.downloads.max_concurrent
        if in_uso == count:
            self._warn(f"Descargas simultáneas: {count}")
            return
        self._warn(
            f"Descargas simultáneas: {count}. Se aplica al reiniciar la app."
        )

    def _on_library_folder_changed(self, folder: str) -> None:
        lib_page = self.page_map.get("library")
        if lib_page and hasattr(lib_page, "rescan"):
            lib_page.subtitle.setText(folder)
            lib_page.rescan(Path(folder))
        self._warn(f"Biblioteca: {folder}")

    def _on_downloads_folder_changed(self, folder: str) -> None:
        self._warn(f"Descargas: {folder}")

    def _on_theme_changed(self, theme_id: str) -> None:
        theme = th.get_theme(theme_id)
        self.apply_theme(theme)
        self._warn(f"Tema: {theme.name}")

    def apply_theme(self, theme: th.Theme) -> None:
        th.set_active(theme)
        from PySide6.QtWidgets import QApplication

        app = QApplication.instance()
        if app:
            app.setStyleSheet(th.build_qss(theme))
            from ..app import _app_icon

            app.setWindowIcon(_app_icon(theme.accent, theme.surface))
        self.refresh_theme()

    def refresh_theme(self) -> None:
        self.titlebar.refresh()
        self.sidebar.refresh()
        self.topbar.refresh()
# Los botones resuelven el color de su icono al construirse, asi que hay que
        # repintarlos. Se buscan por tipo en vez de listarlos pagina por pagina:
        # asi ningun boton nuevo queda del color del tema anterior. `findChildren`
        # no acepta una tupla de tipos, va una llamada por clase.
        from .widgets.buttons import IconButton, TextButton

        for clase in (IconButton, TextButton):
            for button in self.findChildren(clase):
                button.refresh()
        for page in self.page_map.values():
            if hasattr(page, "refresh"):
                page.refresh()

    def _ir_a_search(self) -> None:
        """El ícono de descargar lleva a Buscar, que es de donde se descarga."""
        self.show_page("search")

    def _on_search_changed(self, text: str) -> None:
        self.page_map["search"].set_query(text)
        if text.strip() and self.pages.currentWidget() is not self.page_map["search"]:
            self.show_page("search")

    def _on_download_requested(self, result, audio_format=None) -> None:
        if not self.downloads.ffmpeg_available():
            self._warn("ffmpeg no está instalado: se necesita para procesar medios")
            return
        fmt = audio_format or self.current_format()
        self.downloads.enqueue(result, audio_format=fmt)
        self.show_page("queue")

    def _on_download_all(self, results: list, audio_format=None, playlist_title: str = "") -> None:
        """Encola todos los videos de una playlist de una vez.

        Con nombre de playlist, todo cae en una sola carpeta con ese nombre; sin
        el, cada video va a una carpeta por su canal.
        """
        if not self.downloads.ffmpeg_available():
            self._warn("ffmpeg no está instalado: se necesita para procesar medios")
            return
        if not results:
            return
        fmt = audio_format or self.current_format()
        for result in results:
            self.downloads.enqueue(result, audio_format=fmt, playlist_title=playlist_title)
        total = len(results)
        s = "s" if total != 1 else ""
        destino = f" en “{playlist_title}”" if playlist_title else ""
        self._warn(f"{total} video{s} añadido{s} a la cola{destino}")
        self.show_page("queue")

    def _on_album_download(self, matches: list, audio_format=None, folder_path: str = "") -> None:
        """Encola las pistas de un album con los tags del catalogo puestos.

        Cada trabajo lleva su `Candidate` para que, al terminar, se escriban
        album, año, género y número de pista. Eso es justo lo que una busqueda
        suelta no puede dar.
        """
        if not self.downloads.ffmpeg_available():
            self._warn("ffmpeg no está instalado: se necesita para procesar medios")
            return
        if not matches:
            return

        fmt = audio_format or self.current_format()
        for match in matches:
            video = match.video
            if video is None:
                continue
            self.downloads.enqueue_album_track(
                video,
                match.candidate,
                audio_format=fmt,
                folder_path=folder_path,
            )

        total = sum(1 for m in matches if m.video is not None)
        s = "s" if total != 1 else ""
        self._warn(f"{total} pista{s} del álbum añadida{s} a la cola")
        self.show_page("queue")

    def current_format(self) -> AudioFormat:
        return get_format(load_settings()["audio_format"])


    def _warn(self, message: str) -> None:
        """Aviso efimero en la barra superior, sin sistema de notificaciones."""
        self.titlebar.set_title(message)
        # Un `QTimer` propio y no `singleShot`: encolar 30 videos dispara muchos
        # avisos seguidos y el temporizador del viejo borraba el nuevo.
        self._warn_timer.start(WARN_MS)

    def _on_job_added(self, job) -> None:
        self._batch_downloads.setdefault(id(job), job)
        self.page_map["queue"].add_job(job)
        self._refresh_home_downloads()

    def _on_job_updated(self, job) -> None:
        self.page_map["queue"].refresh_job(job)
        self._refresh_home_downloads()
        # Cancelar un pendiente no emite `job_finished`: esa es la unica forma
        # de enterarse de que el lote se quedo sin nada por hacer.
        if job.status is JobStatus.CANCELLED:
            self._review_batch_finished()

    def _on_job_finished(self, job) -> None:
        self._batch_downloads.setdefault(id(job), job)
        self.page_map["queue"].refresh_job(job)
        self._refresh_home_downloads()
        # También efímero: si no, la barra se queda con el último trabajo para
        # siempre y parece el estado de la app.
        self._warn(f"{job.title} · {'listo' if job.filepath else 'falló'}")
        self._review_batch_finished()

    def _review_batch_finished(self) -> None:
        """Muestra el resumen cuando ya no queda nada pendiente ni en curso."""
        if not self._batch_downloads:
            return
        if any(not job.status.is_finished for job in self.downloads.jobs):
            return

        summary = summarize_downloads(self._batch_downloads.values())
        self._batch_downloads.clear()
        # Un lote de solo duplicados no merece interrumpir con una ventana.
        if summary.hubo_actividad:
            self._show_summary_downloads(summary)

    def _show_summary_downloads(self, summary: DownloadSummary) -> None:
        dialog = CompletionDialog(summary, self)
        dialog.queue_requested.connect(lambda: self.show_page("queue"))
        dialog.exec()
        dialog.deleteLater()

    def _refresh_home_downloads(self) -> None:
        jobs = self.downloads.jobs
        active = sum(1 for job in jobs if job.status.is_active)
        in_wait = sum(1 for job in jobs if job.status is JobStatus.PENDING)
        failed = sum(1 for job in jobs if job.status is JobStatus.FAILED)
        self.page_map["home"].set_downloads(active, in_wait, failed)

    def set_nav_layout(self, mode: str) -> None:
        """Alterna entre barra superior (TopNav), dock lateral compacto o barra clásica."""
        self._nav_layout = mode if mode in ("top", "dock", "sidebar") else DEFAULT_NAV_LAYOUT
        is_top = self._nav_layout == "top"

        self.topbar.set_nav_layout(self._nav_layout)
        if is_top:
            self.sidebar.setVisible(False)
            self.topbar.setVisible(True)
        else:
            self.sidebar.setVisible(True)
            self.sidebar.set_slim(self._nav_layout == "dock")
            self.topbar.setVisible(self._current_page in PAGINAS_WITH_SEARCHER)

        self.sidebar.select(self._current_page)
        self.topbar.select(self._current_page)

    def show_page(self, key: str) -> None:
        page = self.page_map.get(key)
        if page is None:
            return
        self._current_page = key
        self.pages.setCurrentWidget(page)
        self.sidebar.select(key)
        self.topbar.select(key)

        if self._nav_layout == "top":
            self.sidebar.setVisible(False)
            self.topbar.setVisible(True)
        else:
            self.sidebar.setVisible(True)
            self.topbar.setVisible(key in PAGINAS_WITH_SEARCHER)

        self.titlebar.set_title("")
        if key == "search":
            self.topbar.focus_search()

    def _register_shortcuts(self) -> None:
        for keys, slot in (
            ("Ctrl+1", lambda: self.show_page("home")),
            ("Ctrl+2", lambda: self.show_page("search")),
            ("Ctrl+3", lambda: self.show_page("library")),
            ("Ctrl+4", lambda: self.show_page("queue")),
            ("Ctrl+F", self.topbar.focus_search),
        ):
            QShortcut(QKeySequence(keys), self, activated=slot)

    def closeEvent(self, event) -> None:
        """Acepta el cierre sin bloquear.

        La limpieza de hilos va en `sakura.app.main()`, despues de que `exec()`
        vuelve: hacerla acá deja un QThread vivo mientras Qt se destruye, y eso
        cuelga la salida de forma intermitente cuando el escaneo de la biblioteca
        todavia no termino.
        """
        self._cerrando = True
        super().closeEvent(event)

    @property
    def is_closing(self) -> bool:
        return self._cerrando

    def shutdown(self) -> None:
        """Espera a que terminen los hilos de segundo plano."""
        self.downloads.shutdown()
        self.page_map["search"].shutdown()
        self.page_map["library"].scanner.shutdown()
        self.page_map["library"].refresher.shutdown()
        self._home_review_scanner.shutdown()