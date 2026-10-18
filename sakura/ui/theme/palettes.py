"""Paletas concretas de `Theme`, el registro de temas y el tema activo."""

from __future__ import annotations

from .tokens import SERIF_STACK, Theme, tint

# 1. Sakura Dark (Tema por defecto): oscuro moderno, acento sakura.
MODERN = Theme(
    id="modern",
    name="Sakura Premium",
    bg="#090812",
    surface="#121625",
    surface_alt="#1A1F2F",
    surface_hover="#242C40",
    border="#343C58",
    text="#F5F1FF",
    text_dim="#AFB7D2",
    text_muted="#7E87A8",
    accent="#FF5DA8",
    accent_hover="#FF84BD",
    accent_text="#14060E",
    selection=tint("#090812", "#FF5DA8", 0.20),
    selection_text="#F5F1FF",
    danger="#FF6B7E",
    success="#4ADEA1",
    warning="#FFB454",

    # Forma: más premium y envolvente.
    radius=14,
    radius_sm=8,
    density=1.02,
)

# 2. Sakura Light: fondo claro y limpio, tonos pastel y florales.
SAKURA_LIGHT = Theme(
    id="sakura_light",
    name="Sakura Light Airy",
    bg="#FFF7FA",
    surface="#FFFFFF",
    surface_alt="#FCEEF3",
    surface_hover="#F8DFE9",
    border="#ECD0DD",
    text="#261820",
    text_dim="#6B5360",
    text_muted="#9A818E",
    accent="#E6397B",
    accent_hover="#D12366",
    accent_text="#FFFFFF",
    selection=tint("#FFF7FA", "#E6397B", 0.15),
    selection_text="#261820",
    danger="#DC2626",
    success="#16A048",
    warning="#D07206",

    # Forma: claro, redondeado y con mas aire (Light Airy).
    radius=14,
    radius_sm=8,
    density=1.06,
)

# 3. Cyberpunk: atmósfera synthwave nocturna con acento neón cian.
CYBERPUNK = Theme(
    id="cyberpunk",
    name="Cyberpunk Neon",
    bg="#0D0B18",
    surface="#151226",
    surface_alt="#1E1936",
    surface_hover="#2A224B",
    border="#3A2F66",
    text="#F7F4FF",
    text_dim="#A89BD4",
    text_muted="#6D6196",
    accent="#00F0FF",
    accent_hover="#33F3FF",
    accent_text="#080710",
    selection=tint("#0D0B18", "#00F0FF", 0.20),
    selection_text="#F7F4FF",
    danger="#FF3366",
    success="#00FF9D",
    warning="#FFE600",

    # Forma: angular y denso, acentos neón.
    radius=3,
    radius_sm=2,
    density=0.88,
)

# 4. Nord: paleta ártica polar, elegante y reposada.
NORD = Theme(
    id="nord",
    name="Nord Frost",
    bg="#242933",
    surface="#2E3440",
    surface_alt="#3B4252",
    surface_hover="#434C5E",
    border="#4C566A",
    text="#ECEFF4",
    text_dim="#D8DEE9",
    text_muted="#94A2B8",
    accent="#88C0D0",
    accent_hover="#81A1C1",
    accent_text="#242933",
    selection=tint("#242933", "#88C0D0", 0.20),
    selection_text="#ECEFF4",
    danger="#C7757D",
    success="#A3BE8C",
    warning="#EBCB8B",

    # Forma: sobrio y espacioso.
    radius=8,
    radius_sm=5,
    density=1.0,
)

# 5. OLED: negro absoluto (#000000) de ultra alto contraste.
OLED = Theme(
    id="oled",
    name="OLED Midnight",
    bg="#000000",
    surface="#0D0D0D",
    surface_alt="#171717",
    surface_hover="#242424",
    border="#333333",
    text="#FFFFFF",
    text_dim="#AAAAAA",
    text_muted="#666666",
    accent="#FF3366",
    accent_hover="#FF5580",
    accent_text="#FFFFFF",
    selection=tint("#000000", "#FF3366", 0.22),
    selection_text="#FFFFFF",
    danger="#FF4444",
    success="#00E676",
    warning="#FFAB00",

    # Forma: contraste alto, compacto.
    radius=6,
    radius_sm=4,
    density=0.92,
)

# 6. Catppuccin: tonos pastel oscuros tipo Mocha.
CATPPUCCIN = Theme(
    id="catppuccin",
    name="Catppuccin Mocha",
    bg="#181825",
    surface="#1E1E2E",
    surface_alt="#313244",
    surface_hover="#45475A",
    border="#585B70",
    text="#CDD6F4",
    text_dim="#BAC2DE",
    text_muted="#7F849C",
    accent="#CBA6F7",
    accent_hover="#DDB6F2",
    accent_text="#11111B",
    selection=tint("#181825", "#CBA6F7", 0.22),
    selection_text="#CDD6F4",
    danger="#F38BA8",
    success="#A6E3A1",
    warning="#F9E2AF",

    # Forma: muy redondeado y aireado.
    radius=16,
    radius_sm=9,
    density=1.06,
)

# 7. Emerald: verde bosque profundo con toques esmeralda.
EMERALD = Theme(
    id="emerald",
    name="Emerald Forest",
    bg="#09120F",
    surface="#101F1A",
    surface_alt="#172B24",
    surface_hover="#213D33",
    border="#2C4F42",
    text="#EEF7F2",
    text_dim="#A2C4B5",
    text_muted="#668F7D",
    accent="#10B981",
    accent_hover="#34D399",
    accent_text="#041810",
    selection=tint("#09120F", "#10B981", 0.22),
    selection_text="#EEF7F2",
    danger="#F87171",
    success="#34D399",
    warning="#FBBF24",

    # Forma: sobrio.
    radius=10,
    radius_sm=6,
    density=1.0,
)

# 8. Sunset: cálido carbón oscuro y ámbar dorado.
SUNSET = Theme(
    id="sunset",
    name="Sunset Amber",
    bg="#120F0D",
    surface="#1C1714",
    surface_alt="#28201B",
    surface_hover="#382D26",
    border="#4D3D33",
    text="#F8F2ED",
    text_dim="#D1BCAD",
    text_muted="#8F7B6D",
    accent="#FF8A00",
    accent_hover="#FFA333",
    accent_text="#140B02",
    selection=tint("#120F0D", "#FF8A00", 0.22),
    selection_text="#F8F2ED",
    danger="#EF4444",
    success="#10B981",
    warning="#F59E0B",

    # Forma: redondeado, calido.
    radius=14,
    radius_sm=8,
    density=1.0,
)

# --- diseños temáticos: cambian forma y estructura, no solo el color ---------
# Un "diseño" es un preset completo: paleta mas tokens de forma (bordes, planos,
# tipografia). Como el QSS se arma de los tokens, agregar uno nuevo es agregar
# datos; ningun widget se toca.

# 9. Editorial Warm: papel cálido, titulares serif, plano y con mucho aire.
EDITORIAL = Theme(
    id="editorial",
    name="Editorial Warm",
    bg="#FAF4EC",
    surface="#FFFDF9",
    surface_alt="#F1E7DA",
    surface_hover="#E7D9C6",
    border="#D8C6AD",
    text="#2A2118",
    text_dim="#6A5B49",
    text_muted="#8C7C66",
    accent="#B4551F",
    accent_hover="#CE6A2E",
    accent_text="#FFFDF9",
    selection=tint("#FAF4EC", "#B4551F", 0.20),
    selection_text="#2A2118",
    danger="#B03A2E",
    success="#4C7A34",
    warning="#8A6508",

    # Forma: plano (sin degradados), borde fino, titular serif y aireado.
    radius=6,
    radius_sm=4,
    density=1.12,
    flat=True,
    heading_family=SERIF_STACK,
)

# 10. Wuxia Ink: papel de arroz, tinta y sello bermellón; esquinas de pincel.
WUXIA = Theme(
    id="wuxia",
    name="Wuxia Ink 武侠",
    bg="#F3EAD4",
    surface="#FBF6E7",
    surface_alt="#E9DCBE",
    surface_hover="#DECCA8",
    border="#C4B187",
    text="#211D15",
    text_dim="#5B5240",
    text_muted="#857A5F",
    accent="#A3241C",
    accent_hover="#C13026",
    accent_text="#FBF6E7",
    selection=tint("#F3EAD4", "#A3241C", 0.20),
    selection_text="#211D15",
    danger="#8C1D18",
    success="#3F6B4A",
    warning="#8A6508",

    # Forma: esquinas casi rectas (trazo de pincel) y titulares serif.
    radius=2,
    radius_sm=1,
    density=1.0,
    heading_family=SERIF_STACK,
)

# 11. Fauna: bosque profundo y ámbar, plano y natural.
FAUNA = Theme(
    id="fauna",
    name="Fauna Silvestre",
    bg="#0E1510",
    surface="#16211A",
    surface_alt="#1F2E23",
    surface_hover="#2A3D2F",
    border="#3A5240",
    text="#EAF3EA",
    text_dim="#A9C1AC",
    text_muted="#7C9782",
    accent="#D2A24B",
    accent_hover="#E3B662",
    accent_text="#1A1409",
    selection=tint("#0E1510", "#D2A24B", 0.20),
    selection_text="#EAF3EA",
    danger="#E0776A",
    success="#6FBF73",
    warning="#E0B44A",

    # Forma: plano, sobrio, con curvas suaves.
    radius=8,
    radius_sm=5,
    density=1.0,
    flat=True,
)

# 12. Fauna de Chile: arena de Atacama y azul de los Andes.
CHILE = Theme(
    id="chile",
    name="Fauna de Chile",
    bg="#F2ECE0",
    surface="#FFFDF7",
    surface_alt="#E6DDCA",
    surface_hover="#D9CDB4",
    border="#C6B99C",
    text="#241F17",
    text_dim="#5F5744",
    text_muted="#786E54",
    accent="#1E6FA8",
    accent_hover="#2C86C4",
    accent_text="#FFFFFF",
    selection=tint("#F2ECE0", "#1E6FA8", 0.20),
    selection_text="#241F17",
    danger="#B23A2E",
    success="#2F7D57",
    warning="#8A6508",

    # Forma: claro y terroso, curvas medias.
    radius=10,
    radius_sm=6,
    density=1.02,
)

# 13. Anime Pop: noche violeta con acento magenta neón, muy redondeado.
ANIME = Theme(
    id="anime",
    name="Anime Pop",
    bg="#160B24",
    surface="#20103A",
    surface_alt="#2C1750",
    surface_hover="#3B2066",
    border="#4C2C80",
    text="#F4EAFF",
    text_dim="#C2A8EC",
    text_muted="#8E78B8",
    accent="#FF5CC8",
    accent_hover="#FF83D6",
    accent_text="#2A0A22",
    selection=tint("#160B24", "#FF5CC8", 0.20),
    selection_text="#F4EAFF",
    danger="#FF5A76",
    success="#55E0A6",
    warning="#FFC24B",

    # Forma: muy redondeado y con aires de burbuja.
    radius=18,
    radius_sm=10,
    density=1.04,
)

# 14. Pocket Monsters: rojo Poké y amarillo eléctrico sobre claro, titulares en
# mayúscula para el aire de videojuego.
POKEMON = Theme(
    id="pokemon",
    name="Pocket Monsters",
    bg="#F4F4F0",
    surface="#FFFFFF",
    surface_alt="#E9E9E3",
    surface_hover="#DCDCD2",
    border="#C4C4B8",
    text="#1E1E1E",
    text_dim="#545454",
    text_muted="#7C7C7C",
    accent="#E01212",
    accent_hover="#F53B3B",
    accent_text="#FFFFFF",
    selection=tint("#F4F4F0", "#E01212", 0.20),
    selection_text="#1E1E1E",
    danger="#C81E1E",
    success="#217A36",
    warning="#A97C00",

    # Forma: curvas juguetonas, contornos marcados y titulares en mayuscula.
    radius=14,
    radius_sm=8,
    density=1.0,
    border_w=2,
    headings_uppercase=True,
)

THEME_LIST: list[Theme] = [
    MODERN,
    SAKURA_LIGHT,
    EDITORIAL,
    WUXIA,
    FAUNA,
    CHILE,
    ANIME,
    POKEMON,
    CYBERPUNK,
    NORD,
    OLED,
    CATPPUCCIN,
    EMERALD,
    SUNSET,
]

THEMES: dict[str, Theme] = {t.id: t for t in THEME_LIST}


def get_theme(theme_id: str) -> Theme:
    return THEMES.get(theme_id, MODERN)


# Tema activo de la sesion. Es una app de un solo proceso con una ventana, asi
# que un unico global es mas simple que propagar el tema por cada constructor.
_active: Theme = MODERN


def active() -> Theme:
    """Tema que la aplicacion tiene aplicado ahora."""
    return _active


def set_active(theme: Theme) -> Theme:
    """Cambia el tema activo y devuelve el anterior."""
    global _active
    previous, _active = _active, theme
    return previous

