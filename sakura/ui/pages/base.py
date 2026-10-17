"""Base de todas las paginas de la aplicacion."""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt, Signal
from PySide6.QtWidgets import (
    QLabel,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)

from .. import icons
from .. import theme as th
from ..widgets.buttons import TextButton


class MessageBlock(QWidget):
    """Estado vacio reutilizable: icono, titulo, descripcion y accion opcional.

    `label` sigue siendo la descripcion, que es lo que ya consultan las paginas
    (y sus tests) a traves de `set_text`.
    """

    action_clicked = Signal()

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

        self.button = TextButton("", "accent")
        self.button.setVisible(False)
        self.button.clicked.connect(self.action_clicked)
        box.addWidget(self.button, 0, Qt.AlignmentFlag.AlignHCenter)

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

    # --- tema ----------------------------------------------------------------

    def refresh(self) -> None:
        """Repinta el icono con el acento del tema activo."""
        self._paint_icon()

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