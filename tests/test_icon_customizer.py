"""Personalizacion de iconos por PNG: dialogo, persistencia y ajustes."""

from __future__ import annotations

from PySide6.QtCore import QObject, Qt, Signal
from PySide6.QtGui import QColor, QPainter, QPixmap
from PySide6.QtWidgets import QMessageBox

from sakura.config import load_settings
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

    assert dialog._apply_png("home", ruta, False)

    assert icons.has_override("home")
    assert load_settings()["icon_overrides"]["home"]["path"] == ruta
    assert avisos == [True]


def test_el_tinte_se_guarda_por_icono(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()

    dialog._apply_png("search", _png(tmp_path), True)

    assert load_settings()["icon_overrides"]["search"]["tint"] is True


def test_restaurar_un_icono_saca_su_override(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()
    dialog._apply_png("queue", _png(tmp_path), False)

    dialog._on_restore("queue")

    assert not icons.has_override("queue")
    assert "queue" not in load_settings()["icon_overrides"]


def test_restaurar_todo_deja_la_config_limpia(qapp, tmp_path) -> None:
    dialog = IconCustomizerDialog()
    dialog._apply_png("home", _png(tmp_path), False)
    dialog._apply_png("search", _png(tmp_path), False)

    dialog._on_restore_all()

    assert icons.override_specs() == {}
    assert load_settings()["icon_overrides"] == {}


def test_un_png_ilegible_avisa_y_no_guarda(qapp, tmp_path, monkeypatch) -> None:
    monkeypatch.setattr(QMessageBox, "warning", lambda *a, **k: None)
    dialog = IconCustomizerDialog()

    assert dialog._apply_png("home", str(tmp_path / "falta.png"), False) is False
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
