"""El label que recorta texto, para que una ruta larga no estire la ventana."""

from __future__ import annotations

from PySide6.QtCore import Qt

from sakura.ui.widgets.elided import ElidedLabel

LONG = "C:\\Users\\nombre\\Music\\Mi musica\\Artista\\Album\\01 - Pista con nombre larguisimo.mp3"


def test_una_etiqueta_normal_pide_el_ancho_del_texto(qapp) -> None:
    """Este es el problema que motivationa el widget."""
    from PySide6.QtWidgets import QLabel

    normal = QLabel(LONG)
    assert normal.minimumSizeHint().width() > 400, "un QLabel normal si pide el ancho"


def test_el_texto_recortado_no_pide_ese_ancho(qapp) -> None:
    tag = ElidedLabel(LONG)
    assert tag.minimumSizeHint().width() == 0


def test_conserva_el_texto_completo(qapp) -> None:
    tag = ElidedLabel(LONG)
    assert tag.full_text() == LONG


def test_el_texto_completo_va_al_tooltip(qapp) -> None:
    tag = ElidedLabel(LONG)
    assert tag.toolTip() == LONG, "hay que poder leer la ruta completa"


def test_al_achicar_recorta_por_el_medio(qapp) -> None:
    """Por el medio, y no por el final: se ven carpeta y archivo."""
    tag = ElidedLabel(LONG)
    tag.resize(200, 24)

    painted = tag.text()  # lo que realmente se ve
    assert painted != LONG
    assert len(painted) < len(LONG)
    assert "…" in painted


def test_setText_actualiza_el_completo_y_el_tooltip(qapp) -> None:
    tag = ElidedLabel("a")
    tag.setText(LONG)

    assert tag.full_text() == LONG
    assert tag.toolTip() == LONG


def test_texto_corto_se_muestra_entero(qapp) -> None:
    tag = ElidedLabel("x.mp3")
    tag.resize(400, 24)
    assert tag.text() == "x.mp3"


def test_el_editor_abre_al_ancho_pedido(qapp, tmp_path) -> None:
    """El `resize()` del constructor tiene que respetarse.

    Antes el mínimo lo imponía la etiqueta con la ruta y la ventana abría en 1192
    en vez de los 860 pedidos, que no entra en una pantalla de laptop. El
    rediseño dejó el ancho en 860 porque el cromo del diálogo suma márgenes.
    """
    from sakura.ui.widgets.metadata_editor import MetadataEditor

    file_path = tmp_path / "01 - Una pista con nombre bastante largo.mp3"
    file_path.write_bytes(b"x" * 100)

    dialog = MetadataEditor(file_path)
    assert dialog.minimumSizeHint().width() <= 860, "el mínimo sigue siendo enorme"
    assert dialog.width() == 860, "no respetó el ancho pedido en el constructor"


def test_el_modo_se_puede_cambiar(qapp) -> None:
    tag = ElidedLabel(LONG, Qt.TextElideMode.ElideRight)
    tag.resize(120, 24)
    assert tag.text().endswith("…"), "con ElideRight el final es el que se corta"