"""Etiqueta que recorta texto largo en vez de estirar la ventana.

Un `QLabel` con una ruta dentro de un layout horizontal toma el ancho completo
del texto como minimo. Con una ruta larga, eso obliga a la ventana entera a
abrirse mas alla de lo que el codigo pide.
"""

from __future__ import annotations

from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QFontMetrics, QResizeEvent
from PySide6.QtWidgets import QLabel


class ElidedLabel(QLabel):
    """Muestra el texto recortado y guarda el completo en el tooltip.

    Por defecto recorta por el medio, que es lo que conviene para rutas: se ven
    tanto la carpeta como el nombre del archivo.
    """

    def __init__(self, text: str = "", mode=Qt.TextElideMode.ElideMiddle, parent=None):
        super().__init__(parent)
        self._full_text = ""
        self._mode = mode
        self.setMinimumWidth(0)
        self.setText(text)

    def setText(self, text: str) -> None:
        self._full_text = text
        self.setToolTip(text)
        self._apply_elide()

    def full_text(self) -> str:
        """El texto completo, sin recortar."""
        return self._full_text

    def minimumSizeHint(self) -> QSize:
        """No pedir el ancho del texto.

        Un QLabel normal devuelve en su minimo el ancho completo de la cadena,
        y eso estira la ventana aunque el texto se recorte al pintar.
        """
        hint = super().minimumSizeHint()
        return QSize(0, hint.height())

    def resizeEvent(self, event: QResizeEvent) -> None:
        super().resizeEvent(event)
        self._apply_elide()

    def showEvent(self, event) -> None:
        # Recién al mostrarse se sabe el ancho real del que se dispone.
        super().showEvent(event)
        self._apply_elide()

    def _apply_elide(self) -> None:
        metrics = QFontMetrics(self.font())
        cropped = metrics.elidedText(self._full_text, self._mode, max(0, self.width()))
        # `super().setText` evita el recursion con el `setText` de esta clase.
        super().setText(cropped)