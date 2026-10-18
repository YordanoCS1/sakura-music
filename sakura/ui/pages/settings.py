"""Pagina de ajustes: formato de descarga, carpetas de biblioteca y descargas.

Las preferencias se agrupan en tarjetas tematicas (Apariencia, Descargas,
Biblioteca, Herramientas) para que una lista de nueve filas no se lea como una
sola columna plana. El color de los controles sale del QSS por objectName, no de
estilos en linea: asi el tema activo manda y no queda nada pegado al cambiar.
"""

from __future__ import annotations

import os

from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QFileDialog,
    QFrame,
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
from .. import icons
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
    """Una fila: icono, titulo, descripcion y control a la derecha."""

    def __init__(
        self,
        title: str,
        description: str,
        control: QWidget,
        icon_name: str | None = None,
        parent=None,
    ):
        super().__init__(parent)
        self._icon_name = icon_name

        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 12, 0, 12)
        layout.setSpacing(16)

        self.icon: QLabel | None = None
        if icon_name:
            self.icon = QLabel()
            self.icon.setObjectName("SettingsRowIcon")
            self.icon.setFixedSize(22, 22)
            layout.addWidget(self.icon, 0, Qt.AlignmentFlag.AlignVCenter)

        texts = QVBoxLayout()
        texts.setSpacing(3)

        self.label = QLabel(title)
        self.label.setObjectName("SettingTitle")
        self.hint = QLabel(description)
        self.hint.setObjectName("PageSubtitle")
        self.hint.setWordWrap(True)

        texts.addWidget(self.label)
        texts.addWidget(self.hint)
        layout.addLayout(texts, 1)
        layout.addWidget(control, 0, Qt.AlignmentFlag.AlignVCenter)
        self.refresh()

    def refresh(self) -> None:
        """Recolorea el icono tras un cambio de tema."""
        if self.icon is not None and self._icon_name:
            self.icon.setPixmap(icons.render(self._icon_name, th.active().text_muted, 18))


class SettingsCard(QFrame):
    """Tarjeta de ajustes: encabezado con icono y filas separadas por lineas."""

    def __init__(self, title: str, icon_name: str, parent=None):
        super().__init__(parent)
        self.setObjectName("SettingsCard")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        self._icon_name = icon_name

        layout = QVBoxLayout(self)
        layout.setContentsMargins(22, 16, 22, 6)
        layout.setSpacing(0)

        head = QHBoxLayout()
        head.setSpacing(10)
        self.icon = QLabel()
        self.icon.setFixedSize(20, 20)
        self.title = QLabel(title)
        self.title.setObjectName("SettingsSection")
        head.addWidget(self.icon, 0, Qt.AlignmentFlag.AlignVCenter)
        head.addWidget(self.title, 0, Qt.AlignmentFlag.AlignVCenter)
        head.addStretch(1)
        layout.addLayout(head)
        layout.addSpacing(10)

        self._rows = QVBoxLayout()
        self._rows.setContentsMargins(0, 0, 0, 0)
        self._rows.setSpacing(0)
        layout.addLayout(self._rows)
        self.refresh()

    def add_row(self, row: QWidget) -> None:
        """Agrega una fila, con un separador fino salvo en la primera."""
        if self._rows.count():
            divider = QFrame()
            divider.setObjectName("Divider")
            divider.setFixedHeight(1)
            self._rows.addWidget(divider)
        self._rows.addWidget(row)

    def refresh(self) -> None:
        self.icon.setPixmap(icons.render(self._icon_name, th.active().accent, 18))


class SettingsPage(Page):
    """Preferencias persistidas en `config.json`."""

    theme_changed = Signal(str)           # Theme.id
    nav_layout_changed = Signal(str)      # "top", "dock", "sidebar"
    format_changed = Signal(str)          # AudioFormat.id
    library_folder_changed = Signal(str)  # ruta de la biblioteca
    downloads_folder_changed = Signal(str) # ruta de descargas
    max_concurrent_changed = Signal(int)  # descargas simultaneas
    folder_cover_changed = Signal(bool)  # escribir folder.jpg
    icons_changed = Signal()  # cambio un icono personalizado (PNG)

    def __init__(self, parent=None):
        super().__init__("Ajustes", "Preferencias de la aplicación", parent)
        self.settings = load_settings()
        self._rows: list[SettingRow] = []
        self._cards: list[SettingsCard] = []

        # 1. Tema visual
        theme_box = QComboBox()
        theme_box.setObjectName("SettingsControl")
        for theme in th.THEME_LIST:
            theme_box.addItem(theme.name, theme.id)
        theme_box.setCurrentIndex(self._theme_index_of(self.settings.get("theme", "modern")))
        theme_box.setFixedWidth(CONTROL_W)
        theme_box.currentIndexChanged.connect(self._on_theme_changed)
        self.theme_box = theme_box

        # 2. Disposición de navegación
        nav_box = QComboBox()
        nav_box.setObjectName("SettingsControl")
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
        format_box.setObjectName("SettingsControl")
        for fmt in FORMATS:
            format_box.addItem(fmt.label, fmt.id)
        format_box.setCurrentIndex(self._format_index_of(self.settings["audio_format"]))
        format_box.setFixedWidth(CONTROL_W)
        format_box.currentIndexChanged.connect(self._on_format_changed)
        self.format_box = format_box

        # 4. Cookies de YouTube
        cookie_box = QComboBox()
        cookie_box.setObjectName("SettingsControl")
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
        concurrent_box.setObjectName("SettingsControl")
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
        library_btn = TextButton("Cambiar…", "ghost", icon="folder-open")
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
        downloads_btn = TextButton("Cambiar…", "ghost", icon="folder-open")
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

        # Filas agrupadas por tema
        row_theme = SettingRow(
            "Tema y diseño",
            "Elige un diseño completo: no solo cambia los colores, también la forma "
            "(esquinas, bordes), el espaciado y la tipografía de toda la app.",
            theme_box,
            "palette",
        )
        row_nav = SettingRow(
            "Disposición de navegación",
            "Elige entre barra superior para maximizar el ancho para tus canciones, "
            "o dock lateral.",
            nav_box,
            "grid",
        )
        self.icons_btn = TextButton("Personalizar…", "ghost", icon="sparkles")
        self.icons_btn.clicked.connect(self._on_customize_icons)
        row_icons = SettingRow(
            "Iconos de la interfaz",
            "Reemplazá las pestañas y botones con tus propios PNG. Podés teñirlos "
            "con el color del tema y ver el resultado antes de aplicarlo.",
            self.icons_btn,
            "palette",
        )
        row_formato = SettingRow(
            "Formato y calidad de descarga",
            "Elige si descargar solo audio (Opus original, m4a, mp3) o video MP4 "
            "en la resolución deseada (1080p+, 1080p, 720p, 480p, 360p).",
            format_box,
            "music",
        )
        row_concurrent = SettingRow(
            "Descargas simultáneas",
            "Cuántas descargas corren a la vez. Con cookies de navegador siempre "
            "es una: dos procesos pelearían la misma base de cookies.",
            concurrent_row,
            "list",
        )
        row_cookies = SettingRow(
            "Cookies de YouTube",
            "Usa la sesión de un navegador para videos con restricción de edad o acceso. "
            "Sakura no almacena tus cookies.",
            cookie_box,
            "user",
        )
        row_library = SettingRow(
            "Carpeta de biblioteca",
            "De dónde lee y escanea tu música local Sakura Music.",
            library_row,
            "folder-open",
        )
        row_downloads = SettingRow(
            "Carpeta de descargas",
            "Dónde se guardan las canciones y videos descargados.",
            downloads_row,
            "cloud-download",
        )

        # 8. Portada de carpeta
        cover_box = QCheckBox("Escribir folder.jpg en la carpeta del álbum")
        cover_box.setObjectName("SettingsCheck")
        cover_box.setChecked(bool(self.settings.get("write_folder_cover", True)))
        cover_box.setFixedWidth(CONTROL_W)
        cover_box.toggled.connect(self._on_folder_cover_toggled)
        self.cover_box = cover_box

        row_cover = SettingRow(
            "Portada de carpeta",
            "Deja un folder.jpg junto al álbum para que los reproductores externos "
            "muestren la carátula sin abrir cada archivo.",
            cover_box,
            "disc",
        )

        self.update_tools_btn = TextButton("Actualizar yt-dlp y FFmpeg", "ghost", icon="refresh-cw")
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
            "refresh-cw",
        )

        self._rows = [
            row_theme,
            row_nav,
            row_icons,
            row_formato,
            row_concurrent,
            row_cookies,
            row_library,
            row_downloads,
            row_tools,
            row_cover,
        ]

        # Tarjetas: agrupan las filas por tema para dar jerarquia a la pagina.
        self._add_card("Apariencia", "palette", [row_theme, row_nav, row_icons])
        self._add_card(
            "Descargas",
            "download",
            [row_formato, row_concurrent, row_cookies, row_cover],
        )
        self._add_card("Biblioteca", "folder", [row_library, row_downloads])
        self._add_card("Herramientas", "refresh-cw", [row_tools])

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

    def _add_card(self, title: str, icon_name: str, rows: list[SettingRow]) -> None:
        card = SettingsCard(title, icon_name)
        for row in rows:
            card.add_row(row)
        self._cards.append(card)
        self.content.addWidget(card)

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

    def _on_customize_icons(self) -> None:
        """Abre el estudio de iconos; reenvía cada cambio para repintar la app."""
        dialog = self._make_icons_dialog()
        dialog.exec()
        dialog.deleteLater()

    def _make_icons_dialog(self):
        from ..widgets.icon_customizer import IconCustomizerDialog

        dialog = IconCustomizerDialog(self)
        dialog.changed.connect(self.icons_changed.emit)
        return dialog

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
        """Recolorea las tarjetas y filas tras un cambio de tema."""
        self._update_aviso_concurrentes()
        for card in self._cards:
            card.refresh()
        for row in self._rows:
            row.refresh()
