"""Personalizacion de iconos, con vista previa en vivo.

En vez de escribir rutas en el codigo, acá se elige por cada icono un PNG/SVG
propio o uno bajado de la API de Iconify, y se guarda en `config.json`. Como
cada pestaña y cada boton pide su icono por nombre, un override alcanza a todos
los lugares donde se use, sin tocarlos uno por uno. El panel de la derecha
simula el chrome de la app para ver el resultado antes de cerrar el dialogo.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QButtonGroup,
    QCheckBox,
    QDialog,
    QFileDialog,
    QFrame,
    QGridLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ...config import icons_dir, save_settings
from ...core.icon_api import IconHit
from .. import icons
from .. import theme as th
from ..services.icon_library import IconLibrary
from .buttons import TextButton
from .elided import ElidedLabel

# Iconos que el usuario puede reemplazar: las pestañas de navegacion, el logo,
# los controles de la barra de titulo y las acciones que mas se ven. El primer
# elemento es el nombre en `icons`, el segundo la etiqueta y el tercero el grupo.
ICON_SLOTS: list[tuple[str, str, str]] = [
    ("home", "Inicio", "nav"),
    ("search", "Buscar", "nav"),
    ("library", "Biblioteca", "nav"),
    ("queue", "Cola", "nav"),
    ("settings", "Ajustes", "nav"),
    ("sakura", "Logo Sakura", "brand"),
    ("minus", "Minimizar", "window"),
    ("maximize", "Maximizar", "window"),
    ("restore", "Restaurar ventana", "window"),
    ("close", "Cerrar", "window"),
    ("download", "Descargar", "action"),
    ("cloud-download", "Descargar todo", "action"),
    ("edit", "Editar", "action"),
    ("trash", "Eliminar", "action"),
    ("undo", "Deshacer", "action"),
    ("refresh-cw", "Actualizar", "action"),
    ("folder-open", "Abrir carpeta", "action"),
    ("more-vertical", "Más opciones", "action"),
    ("check", "Confirmar", "action"),
    ("music", "Música", "action"),
    ("disc", "Álbum", "action"),
    ("user", "Artista", "action"),
]

_GROUPS: list[tuple[str, str]] = [
    ("nav", "Navegación"),
    ("brand", "Marca"),
    ("window", "Barra de título"),
    ("action", "Acciones"),
]

# Acciones de la barra de titulo que se muestran en el mock.
_WINDOW_ICONS: tuple[str, ...] = ("minus", "maximize", "restore", "close")

_WIDTH = 250


def _destino(name: str, suffix: str) -> Path:
    """Ruta de la copia estable de un icono, borrando la copia previa."""
    destino_dir = icons_dir()
    for viejo in destino_dir.glob(f"{name}.*"):
        viejo.unlink(missing_ok=True)
    return destino_dir / f"{name}{suffix}"


def store_icon(name: str, source: str) -> str:
    """Copia un archivo a la carpeta de datos y devuelve la ruta estable.

    Evita copiarse sobre si misma cuando el origen ya es la copia guardada.
    """
    origin = Path(source)
    destino = _destino(name, origin.suffix.lower() or ".png")
    if origin.resolve() != destino.resolve():
        shutil.copy2(origin, destino)
    return str(destino)


def store_icon_bytes(name: str, data: bytes, suffix: str = ".svg") -> str:
    """Guarda bytes (por ejemplo un SVG bajado de Iconify) con nombre estable."""
    destino = _destino(name, suffix)
    destino.write_bytes(data)
    return str(destino)


def _svg_document(body: str, width: int, height: int) -> bytes:
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="0 0 {width} {height}">{body}</svg>'
    ).encode()


def _label_of(name: str) -> str:
    for slot_name, label, _ in ICON_SLOTS:
        if slot_name == name:
            return label
    return name


class _MockPreview(QFrame):
    """Simulacro del chrome: la navegacion y un par de botones reales."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("IconPreview")
        self.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(18, 16, 18, 18)
        layout.setSpacing(14)

        caption = QLabel("Vista previa")
        caption.setObjectName("IconPreviewCaption")
        layout.addWidget(caption)

        brand = QHBoxLayout()
        brand.setSpacing(8)
        self._brand = QLabel()
        self._brand.setFixedSize(24, 24)
        self._brand.setAlignment(Qt.AlignmentFlag.AlignCenter)
        brand_name = QLabel("Sakura Music")
        brand_name.setObjectName("IconPreviewBrand")
        brand.addWidget(self._brand)
        brand.addWidget(brand_name)
        brand.addStretch(1)
        self._window: dict[str, QLabel] = {}
        for name in _WINDOW_ICONS:
            picto = QLabel()
            picto.setFixedSize(20, 20)
            picto.setAlignment(Qt.AlignmentFlag.AlignCenter)
            self._window[name] = picto
            brand.addWidget(picto)
        layout.addLayout(brand)

        divider = QFrame()
        divider.setObjectName("Divider")
        divider.setFixedHeight(1)
        layout.addWidget(divider)

        nav = QHBoxLayout()
        nav.setSpacing(16)
        self._nav: dict[str, QLabel] = {}
        for name, label, group in ICON_SLOTS:
            if group != "nav":
                continue
            column = QVBoxLayout()
            column.setSpacing(4)
            picto = QLabel()
            picto.setFixedSize(22, 22)
            picto.setAlignment(Qt.AlignmentFlag.AlignCenter)
            text = QLabel(label)
            text.setObjectName("IconPreviewLabel")
            text.setAlignment(Qt.AlignmentFlag.AlignCenter)
            column.addWidget(picto, 0, Qt.AlignmentFlag.AlignHCenter)
            column.addWidget(text, 0, Qt.AlignmentFlag.AlignHCenter)
            wrap = QWidget()
            wrap.setLayout(column)
            nav.addWidget(wrap)
            self._nav[name] = picto
        nav.addStretch(1)
        layout.addLayout(nav)

        divider2 = QFrame()
        divider2.setObjectName("Divider")
        divider2.setFixedHeight(1)
        layout.addWidget(divider2)

        row = QHBoxLayout()
        row.setSpacing(10)
        self._actions: list[TextButton] = []
        for text, variant, name in (
            ("Descargar", "accent", "download"),
            ("Editar", "ghost", "edit"),
            ("Eliminar", "ghost", "trash"),
        ):
            button = TextButton(text, variant, icon=name)
            self._actions.append(button)
            row.addWidget(button)
        row.addStretch(1)
        layout.addLayout(row)

    def refresh(self, selected: str = "") -> None:
        """Repinta el mock con los colores del tema y los overrides actuales."""
        t = th.active()
        self._brand.setPixmap(icons.render("sakura", t.accent, 24))
        for name, picto in self._window.items():
            color = t.accent if name == selected else t.text_dim
            picto.setPixmap(icons.render(name, color, 18))
        for name, picto in self._nav.items():
            color = t.accent if name == selected else t.text_dim
            picto.setPixmap(icons.render(name, color, 20))
        for button in self._actions:
            button.refresh()


class IconCustomizerDialog(QDialog):
    """Elige un PNG por icono y previsualiza el cambio mientras se edita."""

    changed = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setObjectName("IconStudio")
        self.setWindowTitle("Personalizar iconos")
        self.setModal(True)
        self.resize(900, 640)

        self._buttons: dict[str, QPushButton] = {}
        self._result_buttons: dict[str, QPushButton] = {}
        self._hits: dict[str, IconHit] = {}
        self._bodies: dict[str, tuple[str, int, int]] = {}
        self._current = ICON_SLOTS[0][0]
        self._build()

        self._library = IconLibrary(self)
        self._library.results_found.connect(self._on_results)
        self._library.previews_ready.connect(self._on_previews)
        self._library.failed.connect(self._on_online_failed)

        self._select(self._current)

    def done(self, result: int) -> None:
        """Corta la red antes de cerrar: un `QThread` vivo no se puede destruir."""
        self._library.shutdown()
        super().done(result)

    # --- construccion --------------------------------------------------------

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(26, 22, 26, 20)
        root.setSpacing(6)

        title = QLabel("Personalizar iconos")
        title.setObjectName("SettingsSection")
        hint = QLabel(
            "Elegí un PNG/SVG propio o buscá entre más de 200.000 iconos gratis "
            "(Iconify). Se aplica al instante; el ícono original queda como respaldo."
        )
        hint.setObjectName("PageSubtitle")
        hint.setWordWrap(True)
        root.addWidget(title)
        root.addWidget(hint)
        root.addSpacing(12)

        body = QHBoxLayout()
        body.setSpacing(18)
        body.addWidget(self._build_slots())
        body.addWidget(self._build_panel(), 1)
        root.addLayout(body, 1)
        root.addWidget(self._build_footer())

    def _build_slots(self) -> QScrollArea:
        area = QScrollArea()
        area.setObjectName("IconSlotList")
        area.setWidgetResizable(True)
        area.setFixedWidth(_WIDTH)
        area.setFrameShape(QFrame.Shape.NoFrame)
        area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        container = QWidget()
        layout = QVBoxLayout(container)
        layout.setContentsMargins(0, 0, 6, 0)
        layout.setSpacing(4)

        group = QButtonGroup(self)
        group.setExclusive(True)
        for group_key, group_label in _GROUPS:
            header = QLabel(group_label)
            header.setObjectName("IconSlotGroup")
            layout.addSpacing(6)
            layout.addWidget(header)
            for name, label, slot_group in ICON_SLOTS:
                if slot_group != group_key:
                    continue
                button = QPushButton(f"  {label}")
                button.setObjectName("IconSlot")
                button.setCheckable(True)
                button.setCursor(Qt.CursorShape.PointingHandCursor)
                button.setIconSize(QSize(18, 18))
                button.setProperty("iconName", name)
                button.clicked.connect(lambda _=False, n=name: self._select(n))
                group.addButton(button)
                self._buttons[name] = button
                layout.addWidget(button)
        layout.addStretch(1)

        area.setWidget(container)
        return area

    def _build_panel(self) -> QWidget:
        panel = QWidget()
        layout = QVBoxLayout(panel)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(14)

        self.preview = _MockPreview()
        layout.addWidget(self.preview)

        controls = QFrame()
        controls.setObjectName("IconControls")
        controls.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        controls_layout = QHBoxLayout(controls)
        controls_layout.setContentsMargins(18, 16, 18, 16)
        controls_layout.setSpacing(16)

        self.big = QLabel()
        self.big.setObjectName("IconPickPreview")
        self.big.setFixedSize(56, 56)
        self.big.setAlignment(Qt.AlignmentFlag.AlignCenter)
        controls_layout.addWidget(self.big, 0, Qt.AlignmentFlag.AlignTop)

        texts = QVBoxLayout()
        texts.setSpacing(4)
        self.slot_label = QLabel("")
        self.slot_label.setObjectName("SettingTitle")
        self.path_label = ElidedLabel("")
        self.path_label.setObjectName("PageSubtitle")
        self.tint_check = QCheckBox("Teñir con el color del tema")
        self.tint_check.setObjectName("SettingsCheck")
        self.tint_check.toggled.connect(self._on_tint_toggled)
        texts.addWidget(self.slot_label)
        texts.addWidget(self.path_label)
        texts.addWidget(self.tint_check)
        controls_layout.addLayout(texts, 1)

        actions = QVBoxLayout()
        actions.setSpacing(8)
        self.pick_btn = TextButton("Elegir PNG…", "accent", icon="download")
        self.pick_btn.clicked.connect(self._on_pick)
        self.restore_btn = TextButton("Restaurar", "ghost", icon="undo")
        self.restore_btn.clicked.connect(lambda: self._on_restore(self._current))
        actions.addWidget(self.pick_btn)
        actions.addWidget(self.restore_btn)
        controls_layout.addLayout(actions, 0)

        layout.addWidget(controls)
        layout.addWidget(self._build_browser(), 1)
        return panel

    def _build_browser(self) -> QFrame:
        box = QFrame()
        box.setObjectName("IconBrowser")
        box.setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)
        layout = QVBoxLayout(box)
        layout.setContentsMargins(18, 14, 18, 14)
        layout.setSpacing(10)

        head = QHBoxLayout()
        head.setSpacing(8)
        caption = QLabel("Buscar en línea")
        caption.setObjectName("IconPreviewCaption")
        self.search_input = QLineEdit()
        self.search_input.setObjectName("IconSearch")
        self.search_input.setPlaceholderText("ej. heart, play, cloud, disk…")
        self.search_input.returnPressed.connect(self._on_search)
        self.search_btn = TextButton("Buscar", "ghost", icon="search")
        self.search_btn.clicked.connect(self._on_search)
        head.addWidget(caption)
        head.addWidget(self.search_input, 1)
        head.addWidget(self.search_btn)
        layout.addLayout(head)

        self.online_status = QLabel(
            "Los resultados se aplican al ícono seleccionado. Prueba: heart, play, cloud."
        )
        self.online_status.setObjectName("PageSubtitle")
        self.online_status.setWordWrap(True)
        layout.addWidget(self.online_status)

        area = QScrollArea()
        area.setObjectName("IconResults")
        area.setWidgetResizable(True)
        area.setFrameShape(QFrame.Shape.NoFrame)
        area.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)
        area.setMinimumHeight(150)

        self._grid_host = QWidget()
        self._grid = QGridLayout(self._grid_host)
        self._grid.setContentsMargins(0, 0, 0, 0)
        self._grid.setSpacing(6)
        area.setWidget(self._grid_host)
        layout.addWidget(area, 1)
        return box

    def _build_footer(self) -> QWidget:
        footer = QWidget()
        layout = QHBoxLayout(footer)
        layout.setContentsMargins(0, 12, 0, 0)
        self.restore_all_btn = TextButton("Restaurar todos", "ghost", icon="undo")
        self.restore_all_btn.clicked.connect(self._on_restore_all)
        self.done_btn = TextButton("Listo", "accent")
        self.done_btn.clicked.connect(self.accept)
        layout.addWidget(self.restore_all_btn)
        layout.addStretch(1)
        layout.addWidget(self.done_btn)
        return footer

    # --- estado --------------------------------------------------------------

    def _select(self, name: str) -> None:
        self._current = name
        button = self._buttons.get(name)
        if button is not None:
            button.setChecked(True)
        self.refresh()

    def refresh(self) -> None:
        t = th.active()
        for name, button in self._buttons.items():
            button.setIcon(icons.icon(name, t.text_dim, 16, dimmed=t.text_muted))
        self.preview.refresh(self._current)
        self._refresh_controls()

    def _refresh_controls(self) -> None:
        t = th.active()
        name = self._current
        self.slot_label.setText(_label_of(name))
        self.big.setPixmap(icons.render(name, t.accent, 48))

        spec = icons.override_specs().get(name)
        self.tint_check.blockSignals(True)
        self.tint_check.setChecked(bool(spec and spec["tint"]))
        self.tint_check.blockSignals(False)
        self.restore_btn.setEnabled(spec is not None)
        self.path_label.setText(spec["path"] if spec else "Ícono original de Sakura Music")

    def _save(self) -> None:
        save_settings({"icon_overrides": icons.override_specs()})

    # --- acciones ------------------------------------------------------------

    def _commit(self) -> None:
        self._save()
        self.refresh()
        self.changed.emit()

    def _apply_icon(self, name: str, source: str, tint: bool) -> bool:
        """Aplica un archivo, guarda una copia estable y avisa. False si es ilegible."""
        if not icons.set_override(name, source, tint):
            QMessageBox.warning(
                self, "Imagen no válida", "No se pudo leer la imagen elegida."
            )
            return False
        try:
            estable = store_icon(name, source)
        except OSError:
            estable = source
        if estable != source:
            icons.set_override(name, estable, tint)
        self._commit()
        return True

    def _apply_bytes(self, name: str, data: bytes, tint: bool) -> bool:
        """Aplica un SVG ya en memoria (por ejemplo uno bajado de Iconify)."""
        try:
            ruta = store_icon_bytes(name, data)
        except OSError:
            QMessageBox.warning(self, "No se pudo guardar", "No se pudo guardar el icono.")
            return False
        if not icons.set_override(name, ruta, tint):
            return False
        self._commit()
        return True

    def _on_pick(self) -> None:
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Elegir imagen",
            "",
            "Imágenes (*.png *.webp *.jpg *.jpeg *.svg)",
        )
        if path:
            self._apply_icon(self._current, path, self.tint_check.isChecked())

    def _on_tint_toggled(self, checked: bool) -> None:
        spec = icons.override_specs().get(self._current)
        if spec is None:
            return
        self._apply_icon(self._current, spec["path"], checked)

    def _on_restore(self, name: str) -> None:
        icons.clear_override(name)
        self._commit()

    def _on_restore_all(self) -> None:
        icons.clear_overrides()
        self._commit()

    # --- busqueda en linea ---------------------------------------------------

    def _on_search(self) -> None:
        query = self.search_input.text().strip()
        if not query:
            return
        self.online_status.setText(f"Buscando «{query}»…")
        self._limpiar_resultados()
        self._library.search(query)

    def _limpiar_resultados(self) -> None:
        self._result_buttons.clear()
        self._hits.clear()
        self._bodies.clear()
        while self._grid.count():
            item = self._grid.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def _on_results(self, hits: list[IconHit]) -> None:
        self._limpiar_resultados()
        self.online_status.setText(
            f"{len(hits)} resultados. Elegí uno para aplicarlo a «{_label_of(self._current)}»."
        )
        columnas = 8
        for index, hit in enumerate(hits):
            tile = QPushButton()
            tile.setObjectName("IconResult")
            tile.setCursor(Qt.CursorShape.PointingHandCursor)
            tile.setFixedSize(44, 44)
            tile.setIconSize(QSize(26, 26))
            titulo = f"{hit.id}\n{hit.collection.name}"
            if hit.collection.license:
                titulo += f" · {hit.collection.license}"
            if not hit.collection.tintable:
                titulo += "\n(set a color: no se tiñe)"
            tile.setToolTip(titulo)
            tile.clicked.connect(lambda _=False, h=hit: self._apply_online(h))
            self._result_buttons[hit.id] = tile
            self._hits[hit.id] = hit
            self._grid.addWidget(tile, index // columnas, index % columnas)
        self._grid_host.adjustSize()
        self._library.previews(hits)

    def _on_previews(self, previews: dict[str, tuple[str, int, int]]) -> None:
        self._bodies.update(previews)
        t = th.active()
        for icon_id, (body, width, height) in previews.items():
            tile = self._result_buttons.get(icon_id)
            hit = self._hits.get(icon_id)
            if tile is None or hit is None:
                continue
            color = t.text if hit.collection.tintable else None
            pixmap = icons.svg_body_pixmap(body, 26, color=color, width=width, height=height)
            if pixmap is not None:
                tile.setIcon(pixmap)
                tile.setIconSize(QSize(26, 26))

    def _apply_online(self, hit: IconHit) -> None:
        data = self._bodies.get(hit.id)
        if not data:
            return
        body, width, height = data
        # Un set a color no se tine: se perderia su paleta.
        tint = self.tint_check.isChecked() and hit.collection.tintable
        if self._apply_bytes(self._current, _svg_document(body, width, height), tint):
            self.online_status.setText(
                f"Aplicado {hit.id} · {hit.collection.name} a «{_label_of(self._current)}»."
            )

    def _on_online_failed(self, message: str) -> None:
        self.online_status.setText(message)
