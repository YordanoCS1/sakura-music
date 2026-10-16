"""Contraste de los temas: WCAG, no a ojo.

Un tema puede verse bien en el editor y ser ilegible en la app. Estos tests
miden la luminancia relativa y failan si un par no llega al minimo.
"""

from __future__ import annotations

import pytest

from sakura.ui import theme as th

# (foreground, background, minimo, que se lee)
REGLAS = (
    ("text", "bg", 4.5, "texto normal sobre el fondo"),
    ("text", "surface", 4.5, "texto sobre una superficie"),
    ("text", "surface_alt", 4.5, "texto sobre una tarjeta"),
    ("text_dim", "surface", 4.5, "texto atenuado sobre superficie"),
    ("text_muted", "bg", 3.0, "metadatos y placeholders"),
    ("text_muted", "surface_alt", 3.0, "metadatos sobre tarjeta"),
    ("selection_text", "selection", 4.5, "fila seleccionada"),
    ("accent_text", "accent", 3.0, "boton primario"),
    ("danger", "surface_alt", 3.0, "texto de error"),
    ("success", "surface_alt", 3.0, "texto de exito"),
    ("warning", "surface_alt", 3.0, "texto de aviso"),
    ("accent", "bg", 3.0, "acento como texto"),
)

ALL = [t.id for t in th.THEME_LIST]


def luminancia(hex_color: str) -> float:
    """Luminancia relativa segun WCAG 2.1."""

    def canal(value: int) -> float:
        v = value / 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

    r, g, b = (int(hex_color.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b)


def contrast(a: str, b: str) -> float:
    la, lb = luminancia(a), luminancia(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


@pytest.mark.parametrize("theme_id", ALL)
@pytest.mark.parametrize(("foreground", "background", "minimum", "descripcion"), REGLAS)
def test_contraste_del_tema(
    theme_id: str, foreground: str, background: str, minimum: float, descripcion: str
) -> None:
    theme_name = th.get_theme(theme_id)
    value = contrast(getattr(theme_name, foreground), getattr(theme_name, background))

    assert value >= minimum, (
        f"{theme_id}: {descripcion} tiene contraste {value:.2f} y necesita {minimum} "
        f"({foreground} sobre {background})"
    )


@pytest.mark.parametrize("theme_id", ALL)
def test_el_tema_tiene_todo_lo_que_se_usa(theme_id: str) -> None:
    """Cada Theme tiene que seguir teniendo todos los tokens que consume el QSS."""
    theme_name = th.get_theme(theme_id)
    for field_name, _background, _minimum, _desc in REGLAS:
        assert getattr(theme_name, field_name), f"{theme_id} no define {field_name}"


@pytest.mark.parametrize("theme_id", ALL)
def test_el_qss_se_genera_sin_faltantes(theme_id: str) -> None:
    """Un token sin usar en el QSS suele ser un typo que nadie ve."""
    theme_name = th.get_theme(theme_id)
    qss = th.build_qss(theme_name)

    for field_name in ("bg", "surface", "surface_alt", "surface_hover", "border", "text",
                  "text_dim", "text_muted", "accent", "selection"):
        message = f"{theme_id}: {field_name} no aparece en el QSS"
        assert getattr(theme_name, field_name) in qss, message


# --- los temas tienen que verse distintos, no solo cambiar de color ------------


@pytest.mark.parametrize("theme_id", ALL)
def test_la_densidad_es_un_factor_valido(theme_id: str) -> None:
    theme_name = th.get_theme(theme_id)
    assert 0.8 <= theme_name.density <= 1.25, (
        f"{theme_id}: densidad {theme_name.density} fuera de rango util"
    )


def test_la_densidad_cambia_el_qss() -> None:
    """Dos temas con la misma forma pero distinta densidad no pueden verse igual."""
    compacto = th.MODERN.with_accent("#00FF00").with_density(0.85)
    amplio = th.MODERN.with_accent("#00FF00").with_density(1.15)

    assert th.build_qss(compacto) != th.build_qss(amplio)
    assert "padding: 8px" in th.build_qss(compacto.with_density(1.0))
    assert "padding: 7px" in th.build_qss(compacto)


def test_la_forma_cambia_el_qss() -> None:
    angular = th.MODERN.with_radius(2)
    round = th.MODERN.with_radius(18)

    assert f"border-radius: {angular.radius}px" in th.build_qss(angular)
    assert f"border-radius: {round.radius}px" in th.build_qss(round)


def test_no_todos_los_temas_son_iguales() -> None:
    """Si los 8 temasaran lo mismo, el selector de Ajustes sería una farsa."""
    firmas = {
        (
            t.radius,
            round(t.density, 2),
            t.bg,
            t.accent,
        )
        for t in th.THEME_LIST
    }
    assert len(firmas) == len(th.THEME_LIST), "hay temas identicos"


@pytest.mark.parametrize("theme_id", ALL)
def test_el_tema_se_genera_completo(theme_id: str) -> None:
    """Cada tema tiene que producir un QSS usable, sin llaves sin cerrar."""
    qss = th.build_qss(th.get_theme(theme_id))
    assert qss.count("{") == qss.count("}"), "llaves desbalanceadas en el QSS"
    assert qss.count("(") == qss.count(")"), "parentesis desbalanceados en el QSS"