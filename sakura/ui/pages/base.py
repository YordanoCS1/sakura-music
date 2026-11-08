"""Base de todas las paginas de la aplicacion."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QHBoxLayout,
    QLabel,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from .. import icons, sakura
from .. import theme as th
from ..widgets.buttons import TextButton


class MessageBlock(QWidget):
    """Estado vacio reutilizable: icono, titulo, descripcion y accion opcional.

    `label` sigue siendo la descripcion, que es lo que ya consultan las paginas
    (y sus tests) a traves de `set_text`.
    """

    action_clicked = Signal()
    secondary_clicked = Signal()

    def __init__(self, text: str = "", parent=None):
        super().__init__(parent)
        self.setObjectName("MessageBlock")
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

        box = QVBoxLayout(self)
        box.setContentsMargins(0, 56, 0, 0)
        box.setSpacing(12)
        box.setAlignment(Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignTop)

        self.icon_wrap = QLabel()
        self.icon_wrap.setObjectName("EmptyIcon")
        self.icon_wrap.setFixedSize(64, 64)
        self.icon_wrap.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.icon_wrap.setVisible(False)
        box.addWidget(self.icon_wrap, 0, Qt.AlignmentFlag.AlignHCenter)

        self.title_label = QLabel()
        self.title_label.setObjectName("EmptyTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.title_label.setWordWrap(True)
        self.title_label.setVisible(False)
        box.addWidget(self.title_label)

        self.label = QLabel(text)
        self.label.setObjectName("EmptyState")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setWordWrap(True)
        self.label.setMaximumWidth(440)
        box.addWidget(self.label, 0, Qt.AlignmentFlag.AlignHCenter)

        actions = QHBoxLayout()
        actions.setSpacing(10)
        actions.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.button = TextButton("", "accent")
        self.button.setVisible(False)
        self.button.clicked.connect(self.action_clicked)
        actions.addWidget(self.button)

        self.secondary_button = TextButton("", "ghost")
        self.secondary_button.setVisible(False)
        self.secondary_button.clicked.connect(self.secondary_clicked)
        actions.addWidget(self.secondary_button)

        box.addLayout(actions)

        self._icon_name = ""

    # --- contenido -----------------------------------------------------------

    def set_text(self, text: str) -> None:
        self.label.setText(text)

    def set_title(self, title: str) -> None:
        self.title_label.setText(title)
        self.title_label.setVisible(bool(title))

    def set_icon(self, name: str) -> None:
        self._icon_name = name
        self.icon_wrap.setVisible(bool(name))
        self._paint_icon()

    def set_action(self, text: str, icon: str = "") -> None:
        if not text:
            self.button.setVisible(False)
            return
        if icon:
            self.button.set_icon_name(icon)
            self.button.setIconSize(QSize(17, 17))
            self.button.setText(f"  {text}")
        else:
            self.button.setText(text)
        self.button.setVisible(True)

    def set_secondary_action(self, text: str, icon: str = "") -> None:
        if not text:
            self.secondary_button.setVisible(False)
            return
        if icon:
            self.secondary_button.set_icon_name(icon)
            self.secondary_button.setIconSize(QSize(17, 17))
            self.secondary_button.setText(f"  {text}")
        else:
            self.secondary_button.setText(text)
        self.secondary_button.setVisible(True)

    # --- tema ----------------------------------------------------------------

    def refresh(self) -> None:
        """Repinta el icono con el acento del tema activo."""
        self._paint_icon()
        self.button.refresh()
        self.secondary_button.refresh()

    def _paint_icon(self) -> None:
        if not self._icon_name:
            return
        self.icon_wrap.setPixmap(icons.render(self._icon_name, th.active().accent, 26))


class Page(QWidget):
    """Cabecera (titulo + subtitulo) mas un area de scroll para el contenido."""

    def __init__(self, title: str, subtitle: str = "", parent=None):
        super().__init__(parent)
        self.setObjectName("Page")

        root = QVBoxLayout(self)
        root.setContentsMargins(28, 4, 28, 24)
        root.setSpacing(18)

        header = QVBoxLayout()
        header.setSpacing(3)

        self.header = QLabel(title)
        self.header.setObjectName("PageHeader")

        self.subtitle = QLabel(subtitle)
        self.subtitle.setObjectName("PageSubtitle")
        self.subtitle.setVisible(bool(subtitle))

        header.addWidget(self.header)
        header.addWidget(self.subtitle)
        root.addLayout(header)

        self.scroll = QScrollArea()
        self.scroll.setObjectName("ScrollArea")
        self.scroll.setWidgetResizable(True)
        self.scroll.setFrameShape(QScrollArea.Shape.NoFrame)
        self.scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarPolicy.ScrollBarAlwaysOff)

        self.body = QWidget()
        self.body.setObjectName("PageBody")

        self.body_layout = QVBoxLayout(self.body)
        self.body_layout.setContentsMargins(0, 0, 8, 0)
        self.body_layout.setSpacing(12)

        self.scroll.setWidget(self.body)
        root.addWidget(self.scroll, 1)

        self.content = self.body_layout

    def set_header(self, title: str, subtitle: str = "") -> None:
        self.header.setText(title)
        self.subtitle.setText(subtitle)
        self.subtitle.setVisible(bool(subtitle))

    def empty_state(
        self, message: str, title: str = "", icon: str = "", action: str = ""
    ) -> MessageBlock:
        """Vista placeholder para paginas sin contenido todavia."""
        block = MessageBlock(message)
        block.set_title(title)
        block.set_icon(icon)
        block.set_action(action, icon="search" if action else "")
        return block

    def empty_state_illustrated(
        self,
        message: str,
        title: str = "",
        action: str = "",
        illustration_size: int = 160,
    ) -> IllustratedEmptyState:
        """Estado vacio con ilustracion grande de sakura y petalos cayendo.

        Reemplaza al icono pequeno de `empty_state` por una ilustracion
        visualmente mas potente, ideal para pantallas de bienvenida o
        bibliotecas vacias.
        """
        block = IllustratedEmptyState(message, title, self)
        block.set_action(action, icon="folder" if action else "")
        block.set_illustration_size(illustration_size)
        return block


class IllustratedEmptyState(QWidget):
    """Estado vacio con ilustracion grande de sakura.

    Dibuja la flor de la marca a gran escala con petalos caidos alrededor,
    titulo, descripcion y botones de accion. Se recolorea automaticamente
    al cambiar de tema.
    """

    action_clicked = Signal()
    secondary_clicked = Signal()

    def __init__(self, text: str = "", title: str = "", parent=None):
        super().__init__(parent)
        self.setObjectName("IllustratedEmptyState")
        self.setSizePolicy(
            QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding
        )

        box = QVBoxLayout(self)
        box.setContentsMargins(0, 40, 0, 0)
        box.setSpacing(16)
        box.setAlignment(
            Qt.AlignmentFlag.AlignHCenter | Qt.AlignmentFlag.AlignTop
        )

        # Ilustracion grande de sakura
        self.illustration = QLabel()
        self.illustration.setObjectName("EmptyIllustration")
        self.illustration.setFixedSize(180, 180)
        self.illustration.setAlignment(Qt.AlignmentFlag.AlignCenter)
        box.addWidget(self.illustration, 0, Qt.AlignmentFlag.AlignHCenter)

        # Subtexto decorativo (petalos cayendo)
        self.petal_note = QLabel()
        self.petal_note.setObjectName("EmptyPetalNote")
        self.petal_note.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.petal_note.setWordWrap(True)
        self.petal_note.setVisible(False)
        box.addWidget(self.petal_note)

        # Titulo
        self.title_label = QLabel(title)
        self.title_label.setObjectName("EmptyTitle")
        self.title_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.title_label.setWordWrap(True)
        self.title_label.setVisible(bool(title))
        box.addWidget(self.title_label)

        # Descripcion
        self.label = QLabel(text)
        self.label.setObjectName("EmptyState")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setWordWrap(True)
        self.label.setMaximumWidth(480)
        box.addWidget(self.label, 0, Qt.AlignmentFlag.AlignHCenter)

        # Acciones
        actions = QHBoxLayout()
        actions.setSpacing(10)
        actions.setAlignment(Qt.AlignmentFlag.AlignCenter)

        self.button = TextButton("", "accent")
        self.button.setVisible(False)
        self.button.clicked.connect(self.action_clicked)
        actions.addWidget(self.button)

        self.secondary_button = TextButton("", "ghost")
        self.secondary_button.setVisible(False)
        self.secondary_button.clicked.connect(self.secondary_clicked)
        actions.addWidget(self.secondary_button)

        box.addLayout(actions)

        self._illustration_size = 160
        self._paint_illustration()

    # --- API -----------------------------------------------------------------

    def set_text(self, text: str) -> None:
        self.label.setText(text)

    def set_title(self, title: str) -> None:
        self.title_label.setText(title)
        self.title_label.setVisible(bool(title))

    def set_petal_note(self, text: str) -> None:
        """Frase decorativa pequena debajo de la ilustracion."""
        self.petal_note.setText(text)
        self.petal_note.setVisible(bool(text))

    def set_icon(self, name: str) -> None:
        """Compatibilidad con `MessageBlock`: ignora el icono pequeño y usa la
        ilustracion grande ya pintada."""
        self.set_petal_note("")

    def set_action(self, text: str, icon: str = "") -> None:
        if not text:
            self.button.setVisible(False)
            return
        if icon:
            self.button.set_icon_name(icon)
            self.button.setIconSize(QSize(17, 17))
            self.button.setText(f"  {text}")
        else:
            self.button.setText(text)
        self.button.setVisible(True)

    def set_secondary_action(self, text: str, icon: str = "") -> None:
        if not text:
            self.secondary_button.setVisible(False)
            return
        if icon:
            self.secondary_button.set_icon_name(icon)
            self.secondary_button.setIconSize(QSize(17, 17))
            self.secondary_button.setText(f"  {text}")
        else:
            self.secondary_button.setText(text)
        self.secondary_button.setVisible(True)

    def set_illustration_size(self, size: int) -> None:
        self._illustration_size = max(80, min(320, size))
        self.illustration.setFixedSize(self._illustration_size, self._illustration_size)
        self._paint_illustration()

    # --- tema ----------------------------------------------------------------

    def refresh(self) -> None:
        """Repinta la ilustracion y los botones con el tema activo."""
        self._paint_illustration()
        self.button.refresh()
        self.secondary_button.refresh()

    def _paint_illustration(self) -> None:
        t = th.active()
        pixmap = sakura.render_logo(
            t.accent,
            self._illustration_size,
            halo=th.tint(t.surface, t.accent, 0.35),
            center_border=t.bg,
        )
        self.illustration.setPixmap(pixmap)
