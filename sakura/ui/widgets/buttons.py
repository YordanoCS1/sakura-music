"""Botones base de la interfaz."""

from __future__ import annotations

from typing import ClassVar

from PySide6.QtCore import QSize, Qt
from PySide6.QtGui import QColor
from PySide6.QtWidgets import QGraphicsDropShadowEffect, QPushButton

from .. import icons
from .. import theme as th


class IconButton(QPushButton):
    """Boton circular con icono. El color sale siempre del tema activo."""

    def __init__(
        self,
        name: str,
        tooltip: str = "",
        size: int = 34,
        color_token: str = "text",
        parent=None,
    ):
        super().__init__(parent)
        self.setObjectName("IconButton")
        self.setProperty("iconName", name)
        self.setProperty("colorToken", color_token)
        self.setIconSize(QSize(size - 14, size - 14))
        self.setFixedSize(size, size)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setFlat(True)

        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(14)
        shadow.setOffset(0, 2)
        shadow.setColor(QColor(0, 0, 0, 55))
        self.setGraphicsEffect(shadow)

        if tooltip:
            self.setToolTip(tooltip)
        self.refresh()

    def set_icon_name(self, name: str) -> None:
        """Cambia el icono pasando por la propiedad, para que `refresh` lo respete."""
        self.setProperty("iconName", name)
        self.refresh()

    def refresh(self) -> None:
        """Recolorea el icono desde el tema activo (usar tras cambiar de tema)."""
        t = th.active()
        self.setIcon(
            icons.icon(
                self.property("iconName"),
                t.color(self.property("colorToken")),
                self.iconSize().width(),
                dimmed=t.text_muted,
            )
        )


class TextButton(QPushButton):
    """Boton con texto. `variant` elige entre acento, fantasma o peligro.

    `icon` es opcional y es el nombre de un icono de `icons` (por ejemplo
    `"sakura"` o `"download"`). El color se resuelve desde el tema activo, asi
    que hay que llamar a `refresh()` si se cambia de tema con la ventana abierta.
    """

    VARIANTS: ClassVar[dict[str, str]] = {
        "accent": "AccentButton",
        "ghost": "GhostButton",
        "danger": "DangerButton",
    }

    # Que token del tema pinta el icono. En un boton de acento el relleno ya
    # es el acento, asi que el glifo va en `accent_text` para tener contraste.
    ICON_TOKENS: ClassVar[dict[str, str]] = {
        "accent": "accent_text",
        "ghost": "text",
        "danger": "accent_text",
    }

    def __init__(self, text: str, variant: str = "ghost", icon: str | None = None, parent=None):
        super().__init__(text, parent)
        if variant not in self.VARIANTS:
            raise ValueError(f"variante desconocida: {variant!r}")
        self._variant = variant
        self.setObjectName(self.VARIANTS[variant])
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setMinimumHeight(38)

        shadow = QGraphicsDropShadowEffect(self)
        shadow.setBlurRadius(18)
        shadow.setOffset(0, 4)
        shadow.setColor(QColor(0, 0, 0, 70))
        self.setGraphicsEffect(shadow)

        if icon:
            # QSS no tiene `gap` para botones, asi que el separador entre el
            # glifo y el texto va como parte del texto, igual que en el lateral.
            self.setText(f"  {text}")
            self.setIconSize(QSize(17, 17))
            self.setProperty("iconName", icon)
            self.refresh()

    def set_icon_name(self, name: str) -> None:
        """Cambia el icono pasando por la propiedad, para que `refresh` lo respete."""
        self.setProperty("iconName", name)
        self.refresh()

    def refresh(self) -> None:
        """Recolorea el icono desde el tema activo (usar tras cambiar de tema)."""
        name = self.property("iconName")
        if not name:
            return
        t = th.active()
        self.setIcon(
            icons.icon(
                name,
                t.color(self.ICON_TOKENS.get(self._variant, "text")),
                self.iconSize().width(),
                dimmed=t.text_muted,
            )
        )
