"""Los tokens de diseno son el contrato entre la UI y los temas."""

from __future__ import annotations

import re

import pytest

from sakura.ui import theme as th

HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")

COLOR_FIELDS = [
    "bg",
    "surface",
    "surface_alt",
    "surface_hover",
    "border",
    "text",
    "text_dim",
    "text_muted",
    "accent",
    "accent_hover",
    "accent_text",
    "selection",
    "selection_text",
    "danger",
    "success",
    "warning",
]


@pytest.mark.parametrize("field", COLOR_FIELDS)
def test_tiene_color_valido(field: str) -> None:
    assert HEX_RE.match(th.MODERN.color(field)), f"{field} no es un hex valido"


def test_build_qss_inyecta_los_tokens() -> None:
    qss = th.build_qss(th.MODERN)
    for field in COLOR_FIELDS:
        assert th.MODERN.color(field) in qss, f"{field} no aparece en el QSS"


# --- el acento significa una sola cosa -----------------------------------------


def test_la_seleccion_no_usa_el_accento_puro() -> None:
    """Con el acento entero, una fila marcada parecía un botón."""
    assert th.MODERN.selection != th.MODERN.accent
    assert th.MODERN.selection_text != th.MODERN.accent


def test_la_seleccion_es_un_tinte_del_accento() -> None:
    """Debe seguir derivando del acento para que se lea como "marcado"."""
    assert th.MODERN.selection == th.tint(
        th.MODERN.bg, th.MODERN.accent, 0.20
    )


def test_la_seleccion_se_lee_sobre_el_fondo() -> None:
    """Contraste suficiente entre el texto de la fila y su fondo."""

    def luminancia(hex_color: str) -> float:
        def canal(v: int) -> float:
            v /= 255
            return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

        r, g, b = (int(hex_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
        return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)

    l1 = luminancia(th.MODERN.selection_text)
    l2 = luminancia(th.MODERN.selection)
    assert max(l1, l2) / min(l1, l2) >= 4.5, "el texto de la fila no se lee"


def test_el_qss_no_usa_el_accento_para_seleccionar() -> None:
    qss = th.build_qss(th.MODERN)
    assert f"QTableView::item:selected {{\n    background: {th.MODERN.selection};" in qss
    assert f"QListWidget::item:selected {{\nbackground: {th.MODERN.selection};" in qss


def test_los_badges_no_son_bloques_solidos() -> None:
    """Un badge solido y saturado se lee como alerta, no como estado."""
    qss = th.build_qss(th.MODERN)
    for badge, color in (
        ("BadgeActive", th.MODERN.warning),
        ("BadgeDone", th.MODERN.success),
        ("BadgeFailed", th.MODERN.danger),
    ):
        block = re.search(rf"#{badge} \{{([^}}]*)\}}", qss)
        assert block is not None, f"falta {badge}"
        reglas = block.group(1)
        assert f"color: {color};" in reglas, f"{badge} deberia usar el color en el texto"
        assert f"background: {color};" not in reglas, f"{badge} no deberia ir solido"


def test_qss_incluye_fuentes_conasianas() -> None:
    """Sin Malgun Gothic / Yu Gothic / YaHei los titulos en coreano salen como cajas.

    Una biblioteca de K-pop no puede depender del fallback automatico, porque
    fijar `font-family` en el QSS lo desactiva.
    """
    qss = th.build_qss(th.MODERN)
    for familia in ("Malgun Gothic", "Yu Gothic", "Microsoft YaHei", "SimSun"):
        assert familia in qss, f"falta la fuente {familia}"


def test_la_pila_de_fuentes_empieza_por_latina() -> None:
    stack = th.FONT_STACK.lower()
    assert stack.index("segoe ui") < stack.index("malgun gothic")
    assert stack.rstrip().endswith("sans-serif")


def test_qss_cubre_los_widgets_de_la_app() -> None:
    qss = th.build_qss(th.MODERN)
    for selector in ("#Sidebar", "#TitleBar", "#NavButton", "#PageHeader"):
        assert selector in qss, f"falta el selector {selector}"


def test_el_qss_del_launcher_usa_tokens_de_tema() -> None:
    for theme in th.THEME_LIST:
        qss = th.build_qss(theme)
        for selector in (
            "#LauncherSurface",
            "#LauncherHeader",
            "#LauncherHero",
            "QPushButton#LauncherCard",
            "#LauncherCardIcon",
            "#LauncherStatusDot",
        ):
            assert selector in qss, f"falta {selector} en {theme.id}"
        assert theme.accent in qss


def test_editor_de_metadatos_usa_tokens_de_tema() -> None:
    for theme_name in th.THEME_LIST:
        qss = th.build_qss(theme_name)
        for selector in (
            "#MetadataPageTitle",
            "#MetadataArtworkPanel",
            "#MetadataFormPanel",
            "#MetadataSearchPanel",
            "#MetadataResultsPanel",
            "#MetadataSourceBadge",
            "QLineEdit#MetadataField:focus",
        ):
            assert selector in qss, f"falta {selector} en {theme_name.name}"
        assert theme_name.accent in qss
        assert theme_name.surface_alt in qss


def test_el_qss_no_tiene_reglas_de_reproductor() -> None:
    """Se elimino la barra de audio, asi que sus reglas serian muertas."""
    qss = th.build_qss(th.MODERN)
    for selector in (
        "#PlayerBar", "#PlayerTitle", "#PlayerArtist", "QSlider#Progress", "QSlider#Volume"
    ):
        assert selector not in qss, f"sobro la regla {selector}"


def test_set_active_devuelve_el_tema_anterior() -> None:
    original = th.active()
    try:
        previous = th.set_active(th.MODERN.with_accent("#00FF00"))
        assert previous is original
        assert th.active().accent == "#00FF00"
    finally:
        th.set_active(original)


def test_temas_registrados_son_resolubles() -> None:
    for theme_id in th.THEMES:
        assert th.get_theme(theme_id) is not None
    assert th.get_theme("no-existe") is th.MODERN


def test_todos_los_temas_tienen_colores_validos() -> None:
    for theme in th.THEME_LIST:
        for field in COLOR_FIELDS:
            value = theme.color(field)
            assert HEX_RE.match(value), f"{theme.id}.{field} ({value}) no es un hex valido"


def test_todos_los_temas_generan_qss_valido() -> None:
    for theme in th.THEME_LIST:
        qss = th.build_qss(theme)
        assert len(qss) > 500
        assert theme.accent in qss
        assert theme.bg in qss
        assert "#Root" in qss
        assert "#Sidebar" in qss
        assert "TrackGrid" in qss