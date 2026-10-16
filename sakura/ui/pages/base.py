"""Base de todas las paginas de la aplicacion."""

from __future__ import annotations

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QLabel,
    QScrollArea,
    QSizePolicy,
    QVBoxLayout,
    QWidget,
)


class MessageBlock(QWidget):
    """Mensaje centrado para estados vacios o de error."""

    def __init__(self, text: str = "", parent=None):
        super().__init__(parent)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)

        box = QVBoxLayout(self)
        box.setContentsMargins(0, 60, 0, 0)
        box.setAlignment(Qt.AlignmentFlag.AlignHCenter)

        self.label = QLabel(text)
        self.label.setObjectName("EmptyState")
        self.label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.label.setWordWrap(True)

        box.addWidget(self.label)

    def set_text(self, text: str) -> None:
        self.label.setText(text)


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

    def empty_state(self, message: str) -> MessageBlock:
        """Vista placeholder para paginas sin contenido todavia."""
        return MessageBlock(message)