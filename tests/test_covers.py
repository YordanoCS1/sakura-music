"""El render de portadas: siempre redondeado y con marco.

Estaba copiado en tres widgets y solo el placeholder daba esquinas: la imagen
real salia como un rectangulo duro contra el fondo. Estos tests miran los pixeles
porque a simple vista no se nota.
"""

from __future__ import annotations

from pathlib import Path

import pytest

from sakura.ui import theme as th
from sakura.ui.covers import CoverCache, folder_cover, render_cover

SIZE = 120


@pytest.fixture()
def cover(tmp_path):
    from tests.test_metadata import _png

    file_path = tmp_path / "cover.png"
    file_path.write_bytes(_png((0x3A, 0x1F, 0x4A), SIZE))
    return file_path


def _image(destino, size: int = SIZE):
    return render_cover(destino, size).toImage()


def test_la_portada_real_queda_redondeada(qapp, cover) -> None:
    """La esquina tiene que ser transparente; si no, es un rectangulo duro."""
    image = _image(cover)

    assert image.pixelColor(0, 0).alpha() == 0, "la esquina no se recortó"
    assert image.pixelColor(SIZE - 1, 0).alpha() == 0
    assert image.pixelColor(0, SIZE - 1).alpha() == 0
    assert image.pixelColor(SIZE - 1, SIZE - 1).alpha() == 0


def test_la_portada_real_lleva_marco(qapp, cover) -> None:
    """Sin marco, una portada clara parece un hueco en la ventana."""
    image = _image(cover)

    border = image.pixelColor(1, SIZE // 2)
    interior = image.pixelColor(SIZE // 2, SIZE // 2)
    assert (border.red(), border.green(), border.blue()) != (
        interior.red(),
        interior.green(),
        interior.blue(),
    ), "no se distingue el borde del interior"


def test_el_centro_queda_opaco(qapp, cover) -> None:
    assert _image(cover).pixelColor(SIZE // 2, SIZE // 2).alpha() == 255


def test_el_placeholder_tambien_redondeado(qapp) -> None:
    image = _image(None)
    assert image.pixelColor(0, 0).alpha() == 0
    assert image.pixelColor(SIZE // 2, SIZE // 2).alpha() == 255


def test_acepta_bytes_como_una_ruta(qapp, cover) -> None:
    """El editorTodavia no escribio la imagen: la tiene en memoria."""
    from_bytes = _image(cover.read_bytes())
    from_path = _image(cover)

    assert from_bytes.pixelColor(1, SIZE // 2).rgb() == from_path.pixelColor(
        1, SIZE // 2
    ).rgb()


def test_una_ruta_inexistente_cae_al_placeholder(qapp, tmp_path) -> None:
    image = _image(tmp_path / "no-existe.png")
    assert image.pixelColor(SIZE // 2, SIZE // 2).alpha() == 255


def test_bytes_invalidos_caen_al_placeholder(qapp) -> None:
    image = _image(b"esto no es una imagen")
    assert image.pixelColor(SIZE // 2, SIZE // 2).alpha() == 255


@pytest.mark.parametrize("size", [80, 120, 204])
def test_respeta_el_tamano_pedido(qapp, cover, size: int) -> None:
    assert _image(cover, size).width() == size
    assert _image(cover, size).height() == size


def test_el_marco_usa_el_color_del_tema(qapp, cover) -> None:
    """El marco sale del tema, no de un color escrito en el widget."""
    from PySide6.QtGui import QColor

    border = QColor(th.MODERN.border)
    pixel = _image(cover).pixelColor(1, SIZE // 2)

    assert abs(pixel.red() - border.red()) < 40, "el marco no parece el del tema"
    assert abs(pixel.green() - border.green()) < 40
    assert abs(pixel.blue() - border.blue()) < 40


# --- cache de portadas por carpeta --------------------------------------------


def test_la_cache_no_crece_sin_fin() -> None:
    cache = CoverCache(maxsize=3)
    for n in range(5):
        cache[Path(f"/{n}")] = None

    assert len(cache) == 3
    assert Path("/0") not in cache
    assert Path("/4") in cache


def test_la_cache_tira_lo_usado_hace_mas_tiempo() -> None:
    cache = CoverCache(maxsize=2)
    cache[Path("/a")] = None
    cache[Path("/b")] = None
    _ = cache[Path("/a")]  # consultarlo lo vuelve el mas reciente
    cache[Path("/c")] = None

    assert Path("/a") in cache
    assert Path("/b") not in cache
    assert Path("/c") in cache


def test_folder_cover_resuelve_el_listado_una_sola_vez(monkeypatch) -> None:
    from sakura.ui import covers

    llamadas: list[Path] = []

    def fake(folder: Path):
        llamadas.append(folder)
        return None

    monkeypatch.setattr(covers, "find_folder_cover", fake)
    cache = CoverCache()

    folder_cover(Path("/x"), cache)
    folder_cover(Path("/x"), cache)

    assert llamadas == [Path("/x")]