"""Personalizacion de iconos por PNG: dialogo, persistencia y ajustes."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtCore import QObject, Qt, Signal
from PySide6.QtGui import QColor, QPainter, QPixmap
from PySide6.QtWidgets import QMessageBox

from sakura.config import icons_dir, load_settings
from sakura.core.icon_api import Collection, IconHit
from sakura.ui import icons
from sakura.ui.pages.settings import SettingsPage
from sakura.ui.widgets.icon_customizer import ICON_SLOTS, IconCustomizerDialog


def _png(tmp_path, color: str = "white") -> str:
    path = tmp_path / f"marca-{color}.png"
    px = QPixmap(64, 64)
    px.fill(Qt.GlobalColor.transparent)
    painter = QPainter(px)
    painter.fillRect(4, 4, 56, 56, QColor(color))
    painter.end()
    px.save(str(path))
    return str(path)


def test_el_dialogo_lista_todas_las_ranuras(qapp) -> None:
    dialog = IconCustomizerDialog()

    assert set(dialog._buttons) == {name for name, _, _ in ICON_SLOTS}


def test_elegir_un_png_lo_aplica_y_persiste(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()
    avisos: list[bool] = []
    dialog.changed.connect(lambda: avisos.append(True))
    ruta = _png(tmp_path)

    assert dialog._apply_icon("home", ruta, False)

    assert icons.has_override("home")
    guardado = load_settings()["icon_overrides"]["home"]["path"]
    assert guardado == str(icons_dir() / "home.png")
    assert Path(guardado).exists()
    assert avisos == [True]


def test_el_png_se_copia_a_la_carpeta_de_datos(qapp, tmp_path) -> None:
    """Mover o borrar el original no debe romper el icono personalizado."""
    dialog = IconCustomizerDialog()
    ruta = _png(tmp_path)

    dialog._apply_icon("search", ruta, False)
    Path(ruta).unlink()

    guardado = load_settings()["icon_overrides"]["search"]["path"]
    assert Path(guardado).exists()
    icons.load_overrides(load_settings()["icon_overrides"])
    assert icons.has_override("search")


def test_el_tinte_se_guarda_por_icono(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()

    dialog._apply_icon("search", _png(tmp_path), True)

    assert load_settings()["icon_overrides"]["search"]["tint"] is True


def test_restaurar_un_icono_saca_su_override(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()
    dialog._apply_icon("queue", _png(tmp_path), False)

    dialog._on_restore("queue")

    assert not icons.has_override("queue")
    assert "queue" not in load_settings()["icon_overrides"]


def test_restaurar_todo_deja_la_config_limpia(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()
    dialog._apply_icon("home", _png(tmp_path), False)
    dialog._apply_icon("search", _png(tmp_path), False)

    dialog._on_restore_all()

    assert icons.override_specs() == {}
    assert load_settings()["icon_overrides"] == {}


def test_un_png_ilegible_avisa_y_no_guarda(qapp, tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(QMessageBox, "warning", lambda *a, **k: None)
    dialog = IconCustomizerDialog()

    assert dialog._apply_icon("home", str(tmp_path / "falta.png"), False) is False
    assert not icons.has_override("home")


# --- integracion con Ajustes -------------------------------------------------


def test_ajustes_tiene_la_fila_de_iconos(qapp) -> None:
    page = SettingsPage()

    assert "Personalizar" in page.icons_btn.text()


def test_ajustes_abre_el_estudio_y_reenvia_los_cambios(qapp, monkeypatch) -> None:
    creados: list[QObject] = []

    class Falso(QObject):
        changed = Signal()

        def __init__(self, parent=None):
            super().__init__(parent)
            creados.append(self)

        def exec(self) -> int:
            self.changed.emit()
            return 0

    monkeypatch.setattr(
        "sakura.ui.widgets.icon_customizer.IconCustomizerDialog", Falso
    )
    page = SettingsPage()
    avisos: list[bool] = []
    page.icons_changed.connect(lambda: avisos.append(True))

    page._on_customize_icons()

    assert len(creados) == 1
    assert avisos == [True]


# --- busqueda en linea -------------------------------------------------------

BODY = (
    '<path fill="none" stroke="currentColor" stroke-width="2" '
    'd="M4 4h16v16H4z"/>'
)


def _hit(name: str = "home", palette: bool = False) -> IconHit:
    coleccion = Collection("tabler", "Tabler Icons", "MIT", palette)
    return IconHit(f"tabler:{name}", "tabler", name, coleccion)


def test_la_busqueda_pide_resultados_y_arma_la_grilla(qapp) -> None:
    dialog = IconCustomizerDialog()
    consultas: list[str] = []
    dialog._library.search = lambda query, limit=36: consultas.append(query)
    dialog.search_input.setText("corazon")

    dialog._on_search()

    assert consultas == ["corazon"]
    assert "corazon" in dialog.online_status.text()


def test_los_resultados_crean_una_casilla_por_icono(qapp) -> None:
    dialog = IconCustomizerDialog()

    dialog._on_results([_hit("home"), _hit("search")])

    assert set(dialog._result_buttons) == {"tabler:home", "tabler:search"}
    assert dialog._grid.count() == 2


def test_elegir_en_linea_guarda_un_svg(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()
    dialog.tint_check.setChecked(True)
    dialog._bodies["tabler:home"] = (BODY, 24, 24)
    avisos: list[bool] = []
    dialog.changed.connect(lambda: avisos.append(True))

    dialog._apply_online(_hit("home"))

    assert icons.has_override("home")
    guardado = load_settings()["icon_overrides"]["home"]["path"]
    assert guardado.endswith("home.svg")
    assert Path(guardado).exists()
    assert load_settings()["icon_overrides"]["home"]["tint"] is True
    assert avisos == [True]


def test_un_set_a_color_no_se_tine(qapp) -> None:
    dialog = IconCustomizerDialog()
    dialog.tint_check.setChecked(True)
    dialog._bodies["tabler:home"] = (BODY, 24, 24)

    dialog._apply_online(_hit("home", palette=True))

    assert load_settings()["icon_overrides"]["home"]["tint"] is False


def test_un_error_de_red_se_muestra(qapp) -> None:
    dialog = IconCustomizerDialog()

    dialog._on_online_failed("sin conexión")

    assert dialog.online_status.text() == "sin conexión"
