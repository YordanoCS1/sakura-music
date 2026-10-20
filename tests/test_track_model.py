"""Modelo de tabla, ordenamiento y filtro de la biblioteca."""

from __future__ import annotations

from pathlib import Path

import pytest
from PySide6.QtCore import QSize, QSortFilterProxyModel, Qt
from PySide6.QtGui import QColor, QIcon, QPixmap

from sakura.core.library import Track
from sakura.ui.models.track_model import (
    COLUMNS,
    SORT_ROLE,
    TrackFilterProxy,
    TrackTableModel,
)


def track_item(title_text: str, artist_name: str = "A", album: str = "B", **extra) -> Track:
    return Track(
        path=Path(f"{title_text}.mp3"),
        title=title_text,
        artist=artist_name,
        album=album,
        duration=extra.get("duration", 100.0),
        year=extra.get("year", ""),
        genre=extra.get("genre", ""),
        track_number=extra.get("track_number", ""),
        size=extra.get("size", 1000),
    )


@pytest.fixture()
def modelo(qapp) -> TrackTableModel:
    return TrackTableModel()


@pytest.fixture()
def proxy(qapp) -> TrackFilterProxy:
    p = TrackFilterProxy()
    p.setSourceModel(TrackTableModel())
    return p


# --- estructura --------------------------------------------------------------


def test_columnas_declaradas(modelo) -> None:
    assert modelo.columnCount() == len(COLUMNS)
    assert modelo.headerData(1, Qt.Orientation.Horizontal) == "Título"


def test_vacio(modelo) -> None:
    assert modelo.rowCount() == 0
    assert len(modelo) == 0
    assert modelo.track_at(0) is None


def test_set_tracks_y_row_count(modelo) -> None:
    modelo.set_tracks([track_item("a"), track_item("b"), track_item("c")])
    assert modelo.rowCount() == 3
    assert modelo.track_at(1).title == "b"


def test_append_suma_sin_resetear(modelo) -> None:
    modelo.append([track_item("a")])
    modelo.append([track_item("b"), track_item("c")])
    assert modelo.rowCount() == 3


def test_append_vacio_no_hace_nada(modelo) -> None:
    modelo.append([])
    assert modelo.rowCount() == 0


def test_row_of_busca_por_ruta(modelo) -> None:
    primera, segunda = track_item("a"), track_item("b")
    modelo.set_tracks([primera, segunda])
    assert modelo.row_of(segunda) == 1
    assert modelo.row_of(track_item("inexistente")) == -1


def test_replace_cambia_la_pista_en_su_lugar(modelo) -> None:
    """`tracks` devuelve una copia: reemplazar tiene que pasar por `replace`."""
    modelo.set_tracks([track_item("a"), track_item("b")])
    new = track_item("c")

    assert modelo.replace(1, new) is True
    assert modelo.track_at(1) is new
    assert modelo.track_at(0).title == "a"
    assert len(modelo) == 2


def test_replace_fuera_de_rango(modelo) -> None:
    modelo.set_tracks([track_item("a")])
    assert modelo.replace(9, track_item("b")) is False
    assert modelo.replace(-1, track_item("b")) is False
    assert modelo.track_at(0).title == "a"


def test_replace_ignora_el_orden_del_diccionario(modelo) -> None:
    """`tracks` es una copia, asi que mutarla no cambia el modelo."""
    modelo.set_tracks([track_item("a")])
    copia = modelo.tracks
    copia.append(track_item("b"))
    assert len(modelo) == 1


# --- datos por celda ---------------------------------------------------------


def test_data_de_cada_columna(modelo) -> None:
    modelo.set_tracks(
        [
            track_item(
                "One More Time",
                artist_name="Daft Punk",
                album="Discovery",
                duration=320.0,
                year="2001",
                genre="Electronic",
                track_number="2",
                size=5 * 1024 * 1024,
            )
        ]
    )
    expected_value = ["2", "One More Time", "Daft Punk", "Discovery", "2001", "5:20", "5.0 MB"]

    for col_index, value in enumerate(expected_value):
        idx = modelo.index(0, col_index)
        assert modelo.data(idx, Qt.ItemDataRole.DisplayRole) == value, col_index


def test_columna_titulo_muestra_icono_de_portada(modelo, tmp_path) -> None:
    cover = tmp_path / "cover.png"
    image = QPixmap(64, 64)
    image.fill(QColor("#FF5DA8"))
    assert image.save(str(cover))
    track = track_item("BEAM BEAM", cover_path=cover)
    modelo.set_tracks([track])

    icono = modelo.data(modelo.index(0, 1), Qt.ItemDataRole.DecorationRole)

    assert isinstance(icono, QIcon)
    assert not icono.pixmap(QSize(40, 40)).isNull()


def test_columna_numero_usa_la_fila_si_no_hay_track_number(modelo) -> None:
    modelo.set_tracks([track_item("a"), track_item("b")])
    assert modelo.data(modelo.index(1, 0), Qt.ItemDataRole.DisplayRole) == "2"


def test_data_fuera_de_rango(modelo) -> None:
    modelo.set_tracks([track_item("a")])
    assert modelo.data(modelo.index(9, 0), Qt.ItemDataRole.DisplayRole) is None
    assert modelo.data(modelo.index(0, 99), Qt.ItemDataRole.DisplayRole) is None


def test_user_role_devuelve_la_pista(modelo) -> None:
    original = track_item("a")
    modelo.set_tracks([original])
    assert modelo.data(modelo.index(0, 1), Qt.ItemDataRole.UserRole) is original


def test_columnas_sin_alineacion_devuelven_none(modelo) -> None:
    modelo.set_tracks([track_item("a")])
    assert modelo.headerData(0, Qt.Orientation.Vertical) is None


# --- ordenamiento ------------------------------------------------------------


def test_orden_por_titulo(modelo) -> None:
    modelo.set_tracks([track_item("zeta"), track_item("alfa"), track_item("medio")])
    modelo.sort(1, Qt.SortOrder.AscendingOrder)
    assert [t.title for t in modelo.tracks] == ["alfa", "medio", "zeta"]


def test_orden_descendente(modelo) -> None:
    modelo.set_tracks([track_item("zeta"), track_item("alfa")])
    modelo.sort(1, Qt.SortOrder.DescendingOrder)
    assert [t.title for t in modelo.tracks] == ["zeta", "alfa"]


def test_orden_numerico_no_alfabetico(modelo) -> None:
    """Ordenar por duracion como texto daria '10' antes que '9'."""
    modelo.set_tracks(
        [
            track_item("larga", duration=600.0),
            track_item("corta", duration=90.0),
            track_item("media", duration=300.0),
        ]
    )
    modelo.sort(5, Qt.SortOrder.AscendingOrder)
    assert [t.duration for t in modelo.tracks] == [90.0, 300.0, 600.0]


def test_orden_por_anio_numerico(modelo) -> None:
    modelo.set_tracks(
        [track_item("c", year="1999"), track_item("a", year="2020"), track_item("b", year="2005")]
    )
    modelo.sort(4, Qt.SortOrder.AscendingOrder)
    assert [t.year for t in modelo.tracks] == ["1999", "2005", "2020"]


def test_orden_sin_valores_va_al_final(modelo) -> None:
    modelo.set_tracks([track_item("sin anio"), track_item("con", year="2001")])
    modelo.sort(4, Qt.SortOrder.AscendingOrder)
    assert modelo.tracks[0].year == "2001"


def test_sort_role_para_proxy(proxy) -> None:
    assert isinstance(proxy, QSortFilterProxyModel)
    assert proxy.sortRole() == SORT_ROLE


# --- filtro ------------------------------------------------------------------


def test_filtro_por_titulo(proxy) -> None:
    proxy.sourceModel().set_tracks([track_item("Get Lucky"), track_item("Aerodynamic")])
    proxy.set_query("lucky")
    assert proxy.rowCount() == 1
    assert proxy.track_at(0).title == "Get Lucky"


def test_filtro_por_artista(proxy) -> None:
    proxy.sourceModel().set_tracks(
        [track_item("a", artist_name="Daft Punk"), track_item("b", artist_name="Gorillaz")]
    )
    proxy.set_query("gorillaz")
    assert proxy.rowCount() == 1
    assert proxy.track_at(0).artist == "Gorillaz"


def test_filtro_por_album_y_genero(proxy) -> None:
    tracks = [track_item("x", album="Discovery"), track_item("y", genre="Trip Hop")]
    proxy.sourceModel().set_tracks(tracks)

    proxy.set_query("discovery")
    assert proxy.rowCount() == 1

    proxy.set_query("trip")
    assert proxy.rowCount() == 1
    assert proxy.track_at(0).title == "y"


def test_filtro_sin_coincidencias(proxy) -> None:
    proxy.sourceModel().set_tracks([track_item("a")])
    proxy.set_query("zzz")
    assert proxy.rowCount() == 0


def test_filtro_vacio_muestra_todo(proxy) -> None:
    proxy.sourceModel().set_tracks([track_item("a"), track_item("b")])
    proxy.set_query("   ")
    assert proxy.rowCount() == 2


def test_filtro_revision_sin_metadatos(proxy) -> None:
    proxy.sourceModel().set_tracks(
        [
            track_item("completa"),
            track_item("", artist_name="A"),
            track_item("sin artista", artist_name="Desconocido"),
        ]
    )

    proxy.set_review_filter("untagged")

    assert proxy.rowCount() == 2


def test_filtro_revision_sin_caratula(proxy, tmp_path) -> None:
    with_cover = track_item("con portada")
    cover = tmp_path / "cover.jpg"
    cover.touch()
    with_cover.cover_path = cover
    proxy.sourceModel().set_tracks([with_cover, track_item("sin portada")])

    proxy.set_review_filter("missing_cover")

    assert proxy.rowCount() == 1
    assert proxy.track_at(0).title == "sin portada"


def test_filtro_revision_duplicados_se_actualiza_con_el_modelo(proxy) -> None:
    una = track_item("Get Lucky", artist_name="Daft Punk")
    other = track_item("GET LUCKY", artist_name="Daft Punk")
    other.path = Path("otra-copia.mp3")
    proxy.sourceModel().set_tracks([una, other, track_item("Aerodynamic")])

    proxy.set_review_filter("duplicates")
    assert proxy.rowCount() == 2

    proxy.sourceModel().replace(1, track_item("Otra canción"))
    assert proxy.rowCount() == 0


def test_duplicados_no_se_calculan_en_cada_alta(proxy, monkeypatch) -> None:
    """El escaneo agrega por tandas: recalcular duplicados en cada una lo traba."""
    calculos: list[int] = []
    monkeypatch.setattr(
        "sakura.ui.models.track_model.duplicate_track_paths",
        lambda tracks: calculos.append(len(tracks)) or set(),
    )

    proxy.sourceModel().set_tracks([track_item("a")])
    proxy.sourceModel().append([track_item("b")])
    assert calculos == [], "sin el filtro de duplicados no hay nada que calcular"

    proxy.set_review_filter("duplicates")
    assert calculos, "al abrir el filtro hay que calcularlos una vez"

    calculos.clear()
    proxy.sourceModel().replace(0, track_item("c"))
    assert calculos, "con el filtro activo los cambios tienen que actualizarlo"


def test_filtro_revision_desconocido_es_error(proxy) -> None:
    with pytest.raises(ValueError, match="filtro de revisión desconocido"):
        proxy.set_review_filter("no-existe")


def test_filtro_ignora_mayusculas(proxy) -> None:
    proxy.sourceModel().set_tracks([track_item("GET LUCKY")])
    proxy.set_query("get lucky")
    assert proxy.rowCount() == 1


def test_filtro_sigue_al_orden(proxy) -> None:
    proxy.sourceModel().set_tracks([track_item("b"), track_item("a")])
    proxy.sort(1, Qt.SortOrder.AscendingOrder)
    proxy.set_query("")
    assert [proxy.track_at(i).title for i in range(2)] == ["a", "b"]


def test_track_at_fuera_de_rango(proxy) -> None:
    proxy.sourceModel().set_tracks([track_item("a")])
    assert proxy.track_at(-1) is None
    assert proxy.track_at(99) is None