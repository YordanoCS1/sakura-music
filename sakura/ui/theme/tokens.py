"""Tokens de diseno: `Theme`, `FONT_STACK` y los helpers de color y medida."""

from __future__ import annotations

from dataclasses import dataclass, replace

# Pila de fuentes. El orden importa: primero las latinas, y despues las
# conasianas. Sin esto Qt se queda con Segoe UI y los titulos en coreano o
# japones salen como cajas, porque el QSS con `font-family` desactiva el
# fallback automatico. Una biblioteca de K-pop no puede depender de eso.
FONT_STACK = (
    '"Segoe UI", Inter, "Malgun Gothic", "Yu Gothic", Meiryo, "MS Gothic", '
    '"Microsoft YaHei", SimSun, "Noto Sans CJK KR", "Noto Sans CJK JP", '
    '"Noto Sans CJK SC", "Noto Sans", sans-serif'
)

# Titulos con serif: le da a Editorial/Wuxia un aire de impreso sin cambiar la
# tipografia del cuerpo, que en pantalla se lee peor en serif.
SERIF_STACK = 'Georgia, "Times New Roman", "Noto Serif", serif'


@dataclass(frozen=True)
class Theme:
    """Paleta y metricas de un tema.

    Los colores son los unicos literales permitidos en el proyecto. Cada widget
    los consume via `theme.color(...)` o via los objectName que usa el QSS.
    """

    id: str
    name: str

    # superficies
    bg: str
    surface: str
    surface_alt: str
    surface_hover: str
    border: str

    # texto
    text: str
    text_dim: str
    text_muted: str

    # marca
    accent: str
    accent_hover: str
    accent_text: str

    # seleccion. Va aparte del acento a proposito: una fila marcada con el
    # acento puro convertsia la pantalla en un bloque rosa y hacia competir con
    # los botones de accion, que es lo unico que deberia Highlightarse asi.
    selection: str
    selection_text: str

    # estados
    danger: str
    success: str
    warning: str

    # metricas
    radius: int = 10
    radius_sm: int = 6
    radius_pill: int = 999
    sidebar_w: int = 236
    player_h: int = 84
    titlebar_h: int = 44

    # Densidad: escala los paddings del QSS. Con 0.88 la app se ve compacta y
    # técnica; con 1.12, aireada. Es la dimension que hace que dos temas se
    # vean distintos aunque compartan paleta.
    density: float = 1.0

    # Forma: lo que cambia la interfaz mas alla del color. `border_w` engrosa o
    # borra los bordes, `flat` apaga los gradientes (superficies planas) y los
    # dos flags de titulo dan caracter al encabezado sin tocar los widgets.
    border_w: int = 1
    flat: bool = False
    headings_uppercase: bool = False
    heading_family: str = ""

    def color(self, name: str) -> str:
        """Acceso a un token por nombre (util para estilos dinamicos)."""
        return getattr(self, name)

    def with_accent(self, hex_color: str) -> Theme:
        """Variante del tema con otro color de acento (portada -> tema Aqua)."""
        return replace(self, accent=hex_color, accent_hover=hex_color)

    def with_density(self, factor: float) -> Theme:
        """Variante con otra densidad de espaciado."""
        return replace(self, density=factor)

    def with_radius(self, value: int) -> Theme:
        """Variante con otras esquinas."""
        return replace(
            self, radius=value, radius_sm=max(1, round(value * 0.6))
        )


# Escala tipografica. Los tamanos salen de aca y no escritos a mano en el QSS:
# ajustar la jerarquia de toda la app es cambiar un solo mapa.
FONT_SIZES: dict[str, int] = {
    "display": 26,
    "title": 22,
    "heading": 20,
    "subhead": 17,
    "lead": 16,
    "body": 15,
    "body_sm": 14,
    "label": 13,
    "caption": 12,
    "micro": 11,
    "nano": 10,
}


def fs(name: str) -> str:
    """Tamano de fuente por rol, ya en px para inyectar en el QSS."""
    return f"{FONT_SIZES[name]}px"


def tint(base: str, color: str, alpha: float) -> str:
    """Mezcla `color` sobre `base` con opacidad `alpha`.

    Sirve para los fondos suaves (seleccion, badges) derivados de un color de
    marca. Se calcula en vez de escribir el color a mano para no sumar
    literales fuera de la paleta.
    """
    def chunks(hex_color: str) -> list[int]:
        return [int(hex_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4)]

    return "#{:02X}{:02X}{:02X}".format(
        *(round(b + (c - b) * alpha) for b, c in zip(chunks(base), chunks(color), strict=True))
    )


def px(t: Theme, value: float) -> str:
    """Un padding en px escalado por la densidad del tema.

    Todas las medidas de respiro del QSS pasan por aca, asi un tema compacto no
    tiene que reescribir el stylesheet entero.
    """
    return f"{max(1, round(value * t.density))}px"


def edge(t: Theme, color: str | None = None, width: int | None = None) -> str:
    """Borde de `width` px (el del diseno por defecto).

    Con grosor 0 se devuelve un borde transparente en vez de `none`: mantiene el
    hueco del layout y asi pasar a un diseno plano no hace saltar la interfaz.
    """
    color = color or t.border
    ancho = t.border_w if width is None else width
    if ancho <= 0:
        return "1px solid transparent"
    return f"{ancho}px solid {color}"


def card_fill(t: Theme, top: str | None = None, bottom: str | None = None) -> str:
    """Relleno de tarjeta: gradiente suave o plano si el diseno es `flat`."""
    top = top or t.surface_alt
    bottom = bottom or t.surface
    if t.flat:
        return top
    return (
        f"qlineargradient(x1:0, y1:0, x2:1, y2:1, stop:0 {top}, stop:1 {bottom})"
    )


def bar_fill(t: Theme, top: str, bottom: str, vertical: bool = False) -> str:
    """Degradado de las barras (lateral y superior); plano si el diseno es `flat`."""
    if t.flat:
        return top
    direccion = "x2:0, y2:1" if vertical else "x2:1, y2:1"
    return (
        f"qlineargradient(x1:0, y1:0, {direccion}, stop:0 {top}, stop:1 {bottom})"
    )


def app_bg(t: Theme) -> str:
    """Fondo de la ventana: el degradado de la marca, o plano si es `flat`."""
    if t.flat:
        return t.bg
    return (
        "qlineargradient(x1:0, y1:0, x2:1, y2:1, "
        f"stop:0 {t.bg}, stop:0.7 {t.surface}, stop:1 {t.surface_alt})"
    )


def heading_rules(t: Theme) -> str:
    """Reglas extra para titulos en mayuscula o serif; vacio en los temas base.

    Se agregan al final del QSS para no tocar las reglas existentes: asi los
    temas sin estos flags generan exactamente el mismo stylesheet de siempre.
    """
    selectores = (
        "#PageHeader, #SettingsSection, #MetadataSectionTitle, #MetadataPageTitle, "
        "#CardTitle, #EmptyTitle, #HeroTitle"
    )
    bloques: list[str] = []
    if t.headings_uppercase:
        bloques.append(f"{selectores} {{\n    text-transform: uppercase;\n}}")
    if t.heading_family:
        bloques.append(
            "#PageHeader, #SettingsSection, #MetadataPageTitle, #MetadataTrackTitle,\n"
            "#MetadataSectionTitle, #HeroTitle, #DetailTitle {\n"
            f"    font-family: {t.heading_family};\n}}"
        )
    return "\n".join(bloques) + ("\n" if bloques else "")

