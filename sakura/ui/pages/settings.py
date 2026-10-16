"""Pagina de ajustes: formato de descarga, carpetas de biblioteca y descargas."""

from __future__ import annotations

import os

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFileDialog,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from ...config import downloads_target_dir, library_dir, load_settings, save_settings
from ...core.formats import FORMATS
from ...core.tools import (
    YOUTUBE_COOKIE_BROWSERS,
    ToolMissing,
    build_ffmpeg_update_command,
    build_ytdlp_update_command,
    cookies_navegador,
)
from .. import theme as th
from ..services.downloader import DownloadManager
from ..services.process import ProcessRunner
from ..widgets.buttons import TextButton
from ..widgets.elided import ElidedLabel
from .base import Page

# Ancho de la columna de controles. Todas las filas usan el mismo para que los
# botones formen una columna: antes el combo medía 260 y los "Cambiar..." 105.
CONTROL_W = 340

# El rango vive en `DownloadManager`: la página no decide el tope, solo lo
# ofrece, para que el valor permitido y el que se usa nunca se separen.
MIN_CONCURRENT = DownloadManager.MIN_CONCURRENT
MAX_CONCURRENT = DownloadManager.MAX_CONCURRENT_ALLOWED
DEFAULT_CONCURRENT = DownloadManager.MAX_CONCURRENT


class SettingRow(QWidget):
    """Una fila: titulo, descripcion y control a la derecha."""

    def __init__(self, title: str, description: str, control: QWidget, parent=None):
        super().__init__(parent)
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 10, 0, 10)
        layout.setSpacing(20)

        texts = QVBoxLayout()
        texts.setSpacing(3)

        self.label = QLabel(title)
        self.label.setStyleSheet(
            f"color: {th.active().text}; font-size: 13px; font-weight: 700;"
        )
        self.hint = QLabel(description)
        self.hint.setObjectName("PageSubtitle")
        self.hint.setWordWrap(True)

        texts.addWidget(self.label)
        texts.addWidget(self.hint)
        layout.addLayout(texts, 1)
        layout.addWidget(control, 0)

    def refresh(self) -> None:
        self.label.setStyleSheet(
            f"color: {th.active().text}; font-size: 13px; font-weight: 700;"
        )


class SettingsPage(Page):
    """Preferencias persistidas en `config.json`."""

    theme_changed = Signal(str)           # Theme.id
    nav_layout_changed = Signal(str)      # "top", "dock", "sidebar"
    format_changed = Signal(str)          # AudioFormat.id
    library_folder_changed = Signal(str)  # ruta de la biblioteca
    downloads_folder_changed = Signal(str) # ruta de descargas
    max_concurrent_changed = Signal(int)  # descargas simultaneas
    folder_cover_changed = Signal(bool)  # escribir folder.jpg

    def __init__(self, parent=None):
        super().__init__("Ajustes", "Preferencias de la aplicación", parent)
        self.settings = load_settings()
        self._rows: list[SettingRow] = []

        # 1. Tema visual
        theme_box = QComboBox()
        for theme in th.THEME_LIST:
            theme_box.addItem(theme.name, theme.id)
        theme_box.setCurrentIndex(self._theme_index_of(self.settings.get("theme", "modern")))
        theme_box.setFixedWidth(CONTROL_W)
        theme_box.currentIndexChanged.connect(self._on_theme_changed)
        self.theme_box = theme_box

        # 2. Disposición de navegación
        nav_box = QComboBox()
        nav_options = [
            ("Barra Superior en Cápsula (Pantalla completa)", "top"),
            ("Dock Lateral Compacto (Iconos verticales)", "dock"),
            ("Barra Lateral Clásica (Menú extendido)", "sidebar"),
        ]
        for label, val in nav_options:
            nav_box.addItem(label, val)
        current_nav = self.settings.get("nav_layout", "top")
        nav_ids = [val for _, val in nav_options]
        nav_box.setCurrentIndex(nav_ids.index(current_nav) if current_nav in nav_ids else 0)
        nav_box.setFixedWidth(CONTROL_W)
        nav_box.currentIndexChanged.connect(self._on_nav_changed)
        self.nav_box = nav_box

        # 3. Formato de descarga
        format_box = QComboBox()
        for fmt in FORMATS:
            format_box.addItem(fmt.label, fmt.id)
        format_box.setCurrentIndex(self._format_index_of(self.settings["audio_format"]))
        format_box.setFixedWidth(CONTROL_W)
        format_box.currentIndexChanged.connect(self._on_format_changed)
        self.format_box = format_box

        # 4. Cookies de YouTube
        cookie_box = QComboBox()
        cookie_box.addItem("No usar cookies", "")
        for browser, label in (
            ("chrome", "Google Chrome"),
            ("edge", "Microsoft Edge"),
            ("firefox", "Mozilla Firefox"),
            ("brave", "Brave"),
            ("vivaldi", "Vivaldi"),
        ):
            if browser in YOUTUBE_COOKIE_BROWSERS:
                cookie_box.addItem(label, browser)
        current_browser = self.settings.get("youtube_cookies_browser", "")
        cookie_index = cookie_box.findData(current_browser)
        cookie_box.setCurrentIndex(max(0, cookie_index))
        cookie_box.setFixedWidth(CONTROL_W)
        cookie_box.currentIndexChanged.connect(self._on_cookie_browser_changed)
        self.cookie_box = cookie_box

        # 5. Descargas simultáneas
        concurrent_box = QComboBox()
        for count in range(MIN_CONCURRENT, MAX_CONCURRENT + 1):
            concurrent_box.addItem(
                "Una a la vez" if count == 1 else f"{count} a la vez", count
            )
        saved = load_settings().get("max_concurrent_downloads", DEFAULT_CONCURRENT)
        try:
            saved = int(saved)
        except (TypeError, ValueError):
            saved = DEFAULT_CONCURRENT
        saved = max(MIN_CONCURRENT, min(MAX_CONCURRENT, saved))
        concurrent_box.setCurrentIndex(saved - MIN_CONCURRENT)
        concurrent_box.setFixedWidth(CONTROL_W)
        concurrent_box.currentIndexChanged.connect(self._on_max_concurrent_changed)
        self.concurrent_box = concurrent_box

        self.concurrent_hint = QLabel("")
        self.concurrent_hint.setObjectName("PageSubtitle")
        self.concurrent_hint.setWordWrap(True)

        concurrent_row = QWidget()
        concurrent_layout = QVBoxLayout(concurrent_row)
        concurrent_layout.setContentsMargins(0, 0, 0, 0)
        concurrent_layout.setSpacing(4)
        concurrent_layout.addWidget(concurrent_box)
        concurrent_layout.addWidget(self.concurrent_hint)
        concurrent_row.setFixedWidth(CONTROL_W)

        # 6. Carpeta de biblioteca
        library_btn = TextButton("Cambiar…", "ghost")
        library_btn.clicked.connect(self._on_pick_library_folder)
        saved_library = self.settings.get("library_folder") or str(library_dir())
        self.library_folder_label = ElidedLabel(saved_library)
        self.library_folder_label.setObjectName("PageSubtitle")
        self.library_folder_label.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
        )

        library_row = QWidget()
        library_layout = QHBoxLayout(library_row)
        library_layout.setContentsMargins(0, 0, 0, 0)
        library_layout.setSpacing(10)
        library_layout.addWidget(self.library_folder_label, 1)
        library_layout.addWidget(library_btn)
        library_row.setFixedWidth(CONTROL_W)

        # 7. Carpeta de descargas
        downloads_btn = TextButton("Cambiar…", "ghost")
        downloads_btn.clicked.connect(self._on_pick_downloads_folder)
        saved_downloads = self.settings.get("downloads_folder") or str(downloads_target_dir())
        self.downloads_folder_label = ElidedLabel(saved_downloads)
        self.downloads_folder_label.setObjectName("PageSubtitle")
        self.downloads_folder_label.setTextInteractionFlags(
            Qt.TextInteractionFlag.TextSelectableByMouse
        )

        downloads_row = QWidget()
        downloads_layout = QHBoxLayout(downloads_row)
        downloads_layout.setContentsMargins(0, 0, 0, 0)
        downloads_layout.setSpacing(10)
        downloads_layout.addWidget(self.downloads_folder_label, 1)
        downloads_layout.addWidget(downloads_btn)
        downloads_row.setFixedWidth(CONTROL_W)

        # Añadir filas al contenido
        row_theme = SettingRow(
            "Tema visual y estilo",
            "Personaliza los colores, contrastes y atmósfera general de Sakura Music.",
            theme_box,
        )
        row_nav = SettingRow(
            "Disposición de navegación",
            "Elige entre barra superior para maximizar el ancho para tus canciones, "
            "o dock lateral.",
            nav_box,
        )
        row_formato = SettingRow(
            "Formato y calidad de descarga",
            "Elige si descargar solo audio (Opus original, m4a, mp3) o video MP4 "
            "en la resolución deseada (1080p+, 1080p, 720p, 480p, 360p).",
            format_box,
        )
        row_concurrent = SettingRow(
            "Descargas simultáneas",
            "Cuántas descargas corren a la vez. Con cookies de navegador siempre "
            "es una: dos procesos pelearían la misma base de cookies.",
            concurrent_row,
        )
        row_cookies = SettingRow(
            "Cookies de YouTube",
            "Usa la sesión de un navegador para videos con restricción de edad o acceso. "
            "Sakura no almacena tus cookies.",
            cookie_box,
        )
        row_library = SettingRow(
            "Carpeta de biblioteca",
            "De dónde lee y escanea tu música local Sakura Music.",
            library_row,
        )
        row_downloads = SettingRow(
            "Carpeta de descargas",
            "Dónde se guardan las canciones y videos descargados.",
            downloads_row,
        )

        # 8. Portada de carpeta
        cover_box = QCheckBox("Escribir folder.jpg en la carpeta del álbum")
        cover_box.setChecked(bool(self.settings.get("write_folder_cover", True)))
        cover_box.setFixedWidth(CONTROL_W)
        cover_box.toggled.connect(self._on_folder_cover_toggled)
        self.cover_box = cover_box

        row_cover = SettingRow(
            "Portada de carpeta",
            "Deja un folder.jpg junto al álbum para que los reproductores externos "
            "muestren la carátula sin abrir cada archivo.",
            cover_box,
        )

        self.update_tools_btn = TextButton("Actualizar yt-dlp y FFmpeg", "ghost")
        self.update_tools_btn.clicked.connect(self._on_update_tools)
        self.tool_update_status = QLabel("")
        self.tool_update_status.setObjectName("PageSubtitle")
        self.tool_update_status.setWordWrap(True)
        update_control = QWidget()
        update_layout = QVBoxLayout(update_control)
        update_layout.setContentsMargins(0, 0, 0, 0)
        update_layout.setSpacing(6)
        update_layout.addWidget(self.update_tools_btn)
        update_layout.addWidget(self.tool_update_status)
        update_control.setFixedWidth(CONTROL_W)
        row_tools = SettingRow(
            "Herramientas de descarga",
            "Actualiza yt-dlp con pip y FFmpeg con winget en Windows.",
            update_control,
        )

        self._rows = [
            row_theme,
            row_nav,
            row_formato,
            row_concurrent,
            row_cookies,
            row_library,
            row_downloads,
            row_tools,
            row_cover,
        ]
        for row in self._rows:
            self.content.addWidget(row)

        self._update_runner = ProcessRunner(self)
        self._update_runner.line.connect(self._on_update_output)
        self._update_runner.completed.connect(self._on_update_completed)
        self._update_runner.failed.connect(self._on_update_failed)
        self._update_steps: list[tuple[str, list[str] | None, str]] = []
        self._update_results: list[str] = []
        self._update_step = 0
        self._last_update_line = ""

        self.content.addStretch(1)
        self.refresh()

    # --- tema ----------------------------------------------------------------

    def _theme_index_of(self, theme_id: str) -> int:
        ids = [t.id for t in th.THEME_LIST]
        return ids.index(theme_id) if theme_id in ids else 0

    def _on_theme_changed(self, index: int) -> None:
        theme_id = self.theme_box.itemData(index)
        self.settings["theme"] = theme_id
        save_settings({"theme": theme_id})
        self.theme_changed.emit(theme_id)

    def _on_nav_changed(self, index: int) -> None:
        nav_mode = self.nav_box.itemData(index)
        self.settings["nav_layout"] = nav_mode
        save_settings({"nav_layout": nav_mode})
        self.nav_layout_changed.emit(nav_mode)

    # --- formato -------------------------------------------------------------

    def _format_index_of(self, format_id: str) -> int:
        ids = [fmt.id for fmt in FORMATS]
        return ids.index(format_id) if format_id in ids else 0

    def _on_format_changed(self, index: int) -> None:
        format_id = self.format_box.itemData(index)
        self.settings["audio_format"] = format_id
        save_settings({"audio_format": format_id})
        self.format_changed.emit(format_id)

    def _on_cookie_browser_changed(self, index: int) -> None:
        browser = self.cookie_box.itemData(index)
        self.settings["youtube_cookies_browser"] = browser
        save_settings({"youtube_cookies_browser": browser})
        self._update_aviso_concurrentes()

    def _on_folder_cover_toggled(self, marked: bool) -> None:
        self.settings["write_folder_cover"] = marked
        save_settings({"write_folder_cover": marked})
        self.folder_cover_changed.emit(marked)

    def _on_max_concurrent_changed(self, index: int) -> None:
        count = self.concurrent_box.itemData(index)
        if count is None:
            return
        self.settings["max_concurrent_downloads"] = count
        save_settings({"max_concurrent_downloads": count})
        self._update_aviso_concurrentes()
        self.max_concurrent_changed.emit(int(count))

    def _update_aviso_concurrentes(self) -> None:
        """Explica por que el valor elegido puede no ser el que se usa."""
        if cookies_navegador():
            self.concurrent_hint.setText(
                f"Con cookies de {self.cookie_box.currentText()} se usa siempre 1."
            )
            return
        if self.concurrent_box.currentData() == MAX_CONCURRENT:
            self.concurrent_hint.setText(
                "Más de 2 rara vez ayuda: yt-dlp ya baja los fragmentos en paralelo."
            )
            return
        self.concurrent_hint.setText("Se aplica al reiniciar Sakura Music.")

    def _on_update_tools(self) -> None:
        if self._update_runner.is_running:
            return

        self._update_results = []
        self._update_step = 0
        self._update_steps = [
            ("yt-dlp", build_ytdlp_update_command(), ""),
        ]
        try:
            ffmpeg_command = build_ffmpeg_update_command()
            ffmpeg_error = ""
        except ToolMissing as exc:
            ffmpeg_command = None
            ffmpeg_error = str(exc)
        self._update_steps.append(("FFmpeg", ffmpeg_command, ffmpeg_error))
        self.update_tools_btn.setEnabled(False)
        self._run_next_update_step()

    def _run_next_update_step(self) -> None:
        if self._update_step >= len(self._update_steps):
            self.update_tools_btn.setEnabled(True)
            self.tool_update_status.setText(" · ".join(self._update_results))
            return

        name, command, error = self._update_steps[self._update_step]
        self.tool_update_status.setText(f"Actualizando {name}…")
        self._last_update_line = ""
        if command is None:
            self._update_results.append(f"{name}: {error}")
            self._update_step += 1
            self._run_next_update_step()
            return
        self._update_runner.start(command)

    def _on_update_output(self, line: str) -> None:
        self._last_update_line = line
        self.tool_update_status.setText(line)

    def _on_update_completed(self, exit_code: int) -> None:
        name = self._update_steps[self._update_step][0]
        if exit_code == 0:
            result = f"{name}: actualizado"
            if name == "FFmpeg" and os.name == "nt":
                result += " (reinicia Sakura Music para usar la versión nueva)"
        else:
            result = f"{name}: error (código {exit_code})"
            if self._last_update_line:
                result += f" — {self._last_update_line}"
        self._update_results.append(result)
        self._update_step += 1
        QTimer.singleShot(0, self._run_next_update_step)

    def _on_update_failed(self, message: str) -> None:
        name = self._update_steps[self._update_step][0]
        self._update_results.append(f"{name}: {message}")
        self._update_step += 1
        QTimer.singleShot(0, self._run_next_update_step)

    # --- carpetas ------------------------------------------------------------

    def _on_pick_library_folder(self) -> None:
        current = self.settings.get("library_folder") or str(library_dir())
        chosen = QFileDialog.getExistingDirectory(self, "Carpeta de biblioteca", current)
        if not chosen:
            return
        self.library_folder_label.setText(chosen)
        self.settings["library_folder"] = chosen
        save_settings({"library_folder": chosen})
        self.library_folder_changed.emit(chosen)

    def _on_pick_downloads_folder(self) -> None:
        current = self.settings.get("downloads_folder") or str(downloads_target_dir())
        chosen = QFileDialog.getExistingDirectory(self, "Carpeta de descargas", current)
        if not chosen:
            return
        self.downloads_folder_label.setText(chosen)
        self.settings["downloads_folder"] = chosen
        save_settings({"downloads_folder": chosen})
        self.downloads_folder_changed.emit(chosen)

    def set_library_folder(self, path_str: str) -> None:
        """Actualiza el label cuando cambia la carpeta desde la biblioteca."""
        self.settings["library_folder"] = path_str
        self.library_folder_label.setText(path_str)

    def refresh(self) -> None:
        """Recolorea las filas tras un cambio de tema."""
        t = th.active()
        combo_style = (
            f"QComboBox {{ background: {t.surface_alt}; color: {t.text};"
            f" border: 1px solid {t.border}; border-radius: {t.radius}px;"
            " padding: 8px 12px; font-size: 13px; }"
            f"QComboBox:hover {{ background: {t.surface_hover}; border: 1px solid {t.accent}; }}"
            f"QComboBox QAbstractItemView {{ background: {t.surface_alt};"
            f" color: {t.text}; selection-background-color: {t.accent};"
            f" selection-color: {t.accent_text};"
            f" border: 1px solid {t.border}; padding: 4px; }}"
        )
        self.theme_box.setStyleSheet(combo_style)
        self.nav_box.setStyleSheet(combo_style)
        self.format_box.setStyleSheet(combo_style)
        self.concurrent_box.setStyleSheet(combo_style)
        self.cookie_box.setStyleSheet(combo_style)
        self._update_aviso_concurrentes()
        for row in self._rows:
            row.refresh()