"""Tema ambiente: color dominante de la portada y legibilidad del acento."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtGui import QColor, QImage
from PySide6.QtTest import QTest

from sakura.config import save_settings
from sakura.core.library import Track
from sakura.ui import theme as th
from sakura.ui.pages.library import AMBIENT_DEBOUNCE_MS, LibraryPage
from sakura.ui.theme.tokens import relative_luminance


def _png(path: Path, color: str, size: int = 32) -> Path:
    image = QImage(size, size, QImage.Format.Format_RGB32)
    image.fill(QColor(color))
    assert image.save(str(path))
    return path


def _contrast(first: str, second: str) -> float:
    a = relative_luminance(first)
    b = relative_luminance(second)
    high, low = max(a, b), min(a, b)
    return (high + 0.05) / (low + 0.05)


def test_el_color_dominante_sale_de_la_portada(qapp, tmp_path) -> None:
    cover = _png(tmp_path / "roja.png", "#CC2244")

    color = th.dominant_color(cover)

    assert color is not None
    hue, saturation, _value, _alpha = color.getHsv()
    assert hue < 20 or hue > 340
    assert saturation >= 120


def test_el_color_dominante_acepta_bytes(qapp, tmp_path) -> None:
    cover = _png(tmp_path / "azul.png", "#1E3A8A")

    assert th.dominant_color(cover.read_bytes()) is not None


def test_una_portada_gris_no_da_acento(qapp, tmp_path) -> None:
    cover = _png(tmp_path / "gris.png", "#808080")

    assert th.dominant_color(cover) is None


def test_una_portada_que_no_existe_no_revienta(qapp, tmp_path) -> None:
    assert th.dominant_color(tmp_path / "no-existe.png") is None


def test_with_ambient_elige_texto_legible(qapp) -> None:
    base = th.MODERN

    claro = base.with_ambient("#F5D90A")
    oscuro = base.with_ambient("#1E3A8A")

    assert claro.accent == "#F5D90A"
    assert claro.accent_text == "#0B0B0B"
    assert oscuro.accent_text == "#FFFFFF"
    for variante in (claro, oscuro):
        assert _contrast(variante.accent, variante.accent_text) >= 3.0
        assert variante.selection != base.selection
        assert variante.selection_text == base.text


def test_with_ambient_no_muta_el_tema_base(qapp) -> None:
    base = th.MODERN

    base.with_ambient("#F5D90A")

    assert base.accent == "#FF5DA8"
    assert base.accent_text == "#14060E"


def test_la_seleccion_pide_el_color_y_al_limpiar_avisa(qapp, tmp_path) -> None:
    cover = _png(tmp_path / "cover.png", "#CC2244")
    page = LibraryPage()
    pedidos: list[str] = []
    limpiados: list[int] = []
    page.ambient_requested.connect(pedidos.append)
    page.ambient_cleared.connect(lambda: limpiados.append(1))
    track = Track(
        path=tmp_path / "pista.mp3",
        title="Pista",
        artist="Artista",
        album="Álbum",
        duration=1.0,
        cover_path=cover,
    )

    page._request_ambient(track)
    QTest.qWait(AMBIENT_DEBOUNCE_MS + 80)
    page._request_ambient(None)

    assert len(pedidos) == 1
    assert pedidos[0].startswith("#")
    assert limpiados == [1]


def test_el_color_se_recuerda_por_portada(qapp, tmp_path, monkeypatch) -> None:
    cover = _png(tmp_path / "cover.png", "#CC2244")
    page = LibraryPage()
    llamadas: list[Path | bytes | None] = []
    real = th.dominant_color
    monkeypatch.setattr(
        th, "dominant_color", lambda source: llamadas.append(source) or real(source)
    )
    track = Track(
        path=tmp_path / "pista.mp3",
        title="Pista",
        artist="Artista",
        album="Álbum",
        duration=1.0,
        cover_path=cover,
    )

    page._request_ambient(track)
    QTest.qWait(AMBIENT_DEBOUNCE_MS + 80)
    page._ambient_color = ""
    page._ambient_source = None
    page._request_ambient(track)
    QTest.qWait(AMBIENT_DEBOUNCE_MS + 80)

    assert len(llamadas) == 1, "la segunda seleccion debe salir de la cache"


def test_con_el_ajuste_apagado_no_se_lee_la_portada(qapp, tmp_path, monkeypatch) -> None:
    save_settings({"ambient_theme": False})
    cover = _png(tmp_path / "cover.png", "#CC2244")
    page = LibraryPage()
    pedidos: list[str] = []
    page.ambient_requested.connect(pedidos.append)
    track = Track(
        path=tmp_path / "pista.mp3",
        title="Pista",
        artist="Artista",
        album="Álbum",
        duration=1.0,
        cover_path=cover,
    )

    page._request_ambient(track)
    QTest.qWait(AMBIENT_DEBOUNCE_MS + 80)

    assert pedidos == []


def test_la_ventana_aplica_el_acento_solo_en_biblioteca(qapp) -> None:
    from sakura.ui.main_window import MainWindow

    save_settings({"ambient_theme": True})
    win = MainWindow()
    try:
        original = th.active().accent

        win._current_page = "home"
        win._on_ambient_requested("#FF0000")
        assert th.active().accent == original, "fuera de Biblioteca no se aplica"

        win._current_page = "library"
        win._on_ambient_requested("#3366CC")
        assert th.active().accent.lower() == "#3366cc"

        win._on_ambient_cleared()
        assert th.active().accent == original
    finally:
        win.close()
        win.shutdown()

