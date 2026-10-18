"""Personalizacion de iconos con PNG, con vista previa en vivo.

En vez de escribir rutas en el codigo, acá se elige un PNG por icono y se
guarda en `config.json`. Como cada pestaña y cada boton pide su icono por
nombre, un override alcanza a todos los lugares donde se use, sin tocarlos uno
por uno. El panel de la derecha simula el chrome de la app para ver el resultado
antes de cerrar el dialogo.
"""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QButtonGroup,
    QCheckBox,
    QDialog,
    QFileDialog,
    QFrame,
    QHBoxLayout,
    QLabel,
    QMessageBox,
    QPushButton,
    QScrollArea,
    QVBoxLayout,
    QWidget,
)

from ...config import save_settings
from .. import icons
from .. import theme as th
from .buttons import TextButton
from .elided import ElidedLabel

# Iconos que el usuario puede reemplazar: las pestañas de navegacion y las
# acciones que mas se ven. El primer elemento es el nombre en `icons._PATHS`, el
# segundo la etiqueta y el tercero el grupo donde se muestra.
ICON_SLOTS: list[tuple[str, str, str]] = [
    ("home", "Inicio", "nav"),
    ("search", "Buscar", "nav"),
    ("library", "Biblioteca", "nav"),
    ("queue", "Cola", "nav"),
    ("settings", "Ajustes", "nav"),
    ("download", "Descargar", "action"),
    ("cloud-download", "Descargar todo", "action"),
    ("edit", "Editar", "action"),
    ("trash", "Eliminar", "action"),
    ("undo", "Deshacer", "action"),
    ("refresh-cw", "Actualizar", "action"),
    ("folder-open", "Abrir carpeta", "action"),
    ("more-vertical", "Más opciones", "action"),
    ("check", "Confirmar", "action"),
    ("close", "Cerrar", "action"),
    ("music", "Música", "action"),
    ("disc", "Álbum", "action"),
    ("user", "Artista", "action"),
]

_GROUPS: list[tuple[str, str]] = [
    ("nav", "Navegación"),
    ("action", "Acciones"),
]

_WIDTH = 250


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

        divider = QFrame()
        divider.setObjectName("Divider")
        divider.setFixedHeight(1)
        layout.addWidget(divider)

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
        self._current = ICON_SLOTS[0][0]
        self._build()
        self._select(self._current)

    # --- construccion --------------------------------------------------------

    def _build(self) -> None:
        root = QVBoxLayout(self)
        root.setContentsMargins(26, 22, 26, 20)
        root.setSpacing(6)

        title = QLabel("Personalizar iconos")
        title.setObjectName("SettingsSection")
        hint = QLabel(
            "Elegí un PNG para reemplazar cualquier ícono de pestañas y botones. "
            "Se aplica al instante; el ícono original queda como respaldo."
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
        layout.addStretch(1)
        return panel

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

    def _apply_png(self, name: str, path: str, tint: bool) -> bool:
        """Aplica el PNG, guarda y avisa. Devuelve False si no se pudo leer."""
        if not icons.set_override(name, path, tint):
            QMessageBox.warning(
                self, "Imagen no válida", "No se pudo leer la imagen elegida."
            )
            return False
        self._save()
        self.refresh()
        self.changed.emit()
        return True

    def _on_pick(self) -> None:
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Elegir PNG",
            "",
            "Imágenes (*.png *.webp *.jpg *.jpeg *.svg)",
        )
        if path:
            self._apply_png(self._current, path, self.tint_check.isChecked())

    def _on_tint_toggled(self, checked: bool) -> None:
        spec = icons.override_specs().get(self._current)
        if spec is None:
            return
        self._apply_png(self._current, spec["path"], checked)

    def _on_restore(self, name: str) -> None:
        icons.clear_override(name)
        self._save()
        self.refresh()
        self.changed.emit()

    def _on_restore_all(self) -> None:
        icons.clear_overrides()
        self._save()
        self.refresh()
        self.changed.emit()
