"""La ventana de discografía: filtro de álbumes y elección."""

from __future__ import annotations

from PySide6.QtWidgets import QDialog

from sakura.core.metadata_sources import AlbumEntry, ArtistEntry
from sakura.ui.widgets.discography import DiscographyDialog


def _album(title_text: str, track_items: int = 14, year: str = "2001") -> AlbumEntry:
    return AlbumEntry(
        album_id=title_text,
        title=title_text,
        artist="Daft Punk",
        year=year,
        track_total=track_items,
    )


def _dialoga(qapp, albums) -> DiscographyDialog:
    return DiscographyDialog(ArtistEntry("1", "Daft Punk", "Dance"), albums)


def test_una_fila_por_album(qapp) -> None:
    dialog = _dialoga(qapp, [_album("Discovery"), _album("Homework")])

    assert dialog.list.count() == 2


def test_arranca_mostrando_solo_albumes_completos(qapp) -> None:
    """Un catálogo lleno de singles no puede tapar los discos de verdad."""
    dialog = _dialoga(
        qapp,
        [_album("Discovery"), _album("Aerodynamic - Single", track_items=2)],
    )

    assert dialog.filtro.isChecked() is True
    assert dialog.list.count() == 1


def test_desmarcar_el_filtro_muestra_todo(qapp) -> None:
    dialog = _dialoga(
        qapp,
        [_album("Discovery"), _album("Aerodynamic - Single", track_items=2)],
    )

    dialog.filtro.setChecked(False)

    assert dialog.list.count() == 2


def test_el_resumen_avisa_cuantos_hay_de_cada_tipo(qapp) -> None:
    dialog = _dialoga(
        qapp,
        [_album("Discovery"), _album("Aerodynamic - Single", track_items=2)],
    )

    assert "1 de 2" in dialog.summary.text()


def test_eleccionar_un_album_lo_devuelve(qapp) -> None:
    dialog = _dialoga(qapp, [_album("Discovery"), _album("Homework")])
    chosen: list[AlbumEntry] = []
    dialog.album_chosen.connect(chosen.append)

    dialog.list.setCurrentRow(0)
    dialog._choose_selected()

    assert dialog.chosen_album().title == "Discovery"
    assert chosen == [dialog.chosen_album()]
    assert dialog.result() == QDialog.DialogCode.Accepted


def test_sin_elegir_no_se_puede_traer(qapp) -> None:
    dialog = _dialoga(qapp, [_album("Discovery")])

    assert dialog.fetch.isEnabled() is False

    dialog.list.setCurrentRow(0)

    assert dialog.fetch.isEnabled() is True


def test_cancelar_no_devuelve_album(qapp) -> None:
    dialog = _dialoga(qapp, [_album("Discovery")])
    dialog.list.setCurrentRow(0)

    dialog.reject()

    assert dialog.chosen_album() is None
    assert dialog.result() != QDialog.DialogCode.Accepted


def test_un_artista_sin_albumes_no_rompe(qapp) -> None:
    dialog = _dialoga(qapp, [])

    assert dialog.list.count() == 1
    assert dialog.fetch.isEnabled() is False


def test_las_filas_muestran_el_album(qapp) -> None:
    dialog = _dialoga(qapp, [_album("Discovery", year="2001")])
    row_index = dialog.list.itemWidget(dialog.list.item(0))

    assert "Discovery" in row_index.title_text.text()
    assert "2001" in row_index.subtitle.text()
    assert "14 pistas" in row_index.subtitle.text()


def test_cambiar_de_tema_recolorea_las_filas(qapp) -> None:
    from sakura.ui import theme as th

    dialog = _dialoga(qapp, [_album("Discovery")])
    row_index = dialog.list.itemWidget(dialog.list.item(0))

    dialog.refresh()

    assert th.active().text.upper() in row_index.title_text.styleSheet().upper()


def test_el_doble_clic_trae_el_album(qapp) -> None:
    """Doble clic es la forma natural de elegir en una lista de discos."""
    dialog = _dialoga(qapp, [_album("Discovery")])
    dialog.list.setCurrentRow(0)

    dialog.list.itemDoubleClicked.emit(dialog.list.item(0))

    assert dialog.chosen_album().title == "Discovery"