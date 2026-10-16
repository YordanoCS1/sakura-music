"""Paletas concretas de `Theme`, el registro de temas y el tema activo."""

from __future__ import annotations

from .tokens import Theme, tint

# 1. Sakura Dark (Tema por defecto): oscuro moderno, acento sakura.
MODERN = Theme(
    id="modern",
    name="Sakura Glow",
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
    name="Sakura Light",
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

    # Forma: mas blando, se ve_values Calculations.
    radius=12,
    radius_sm=7,
    density=1.0,
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

THEME_LIST: list[Theme] = [
    MODERN,
    SAKURA_LIGHT,
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

