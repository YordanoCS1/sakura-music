"""El dialogo de edicion de metadatos."""

from __future__ import annotations

import subprocess
from pathlib import Path

import mutagen
import pytest
from PySide6.QtCore import Qt
from PySide6.QtWidgets import QLabel, QWidget

from sakura.core.library import load_track
from sakura.core.metadata import TrackTags, read_cover, read_tags, write_cover, write_tags
from sakura.core.tools import ffmpeg_location
from sakura.ui.widgets.metadata_editor import MetadataEditor

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")


@pytest.fixture()
def track_item(tmp_path) -> Path:
    file_path = tmp_path / "01 - Around the World.mp3"
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(file_path)],
        check=True, capture_output=True,
    )
    return file_path


@pytest.fixture()
def other_track(tmp_path) -> Path:
    file_path = tmp_path / "02 - Love for Sale.mp3"
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame", str(file_path)],
        check=True, capture_output=True,
    )
    return file_path


@pytest.fixture()
def editor(qapp, track_item) -> MetadataEditor:
    return MetadataEditor(track_item)


# --- carga -------------------------------------------------------------------


@requires_ffmpeg
def test_abre_con_los_tags_existentes(qapp, track_item) -> None:
    write_tags(track_item, TrackTags(title="Around the World", artist="Daft Punk", year="1997"))

    dialog = MetadataEditor(track_item)
    assert dialog.field_map["title"].text() == "Around the World"
    assert dialog.field_map["artist"].text() == "Daft Punk"
    assert dialog.field_map["year"].text() == "1997"


def test_archivo_sin_tags_abre_vacio(qapp, track_item) -> None:
    dialog = MetadataEditor(track_item)
    assert dialog.field_map["title"].text() == ""
    assert dialog.field_map["title"].placeholderText() == track_item.stem


def test_muestra_la_ruta(editor, track_item) -> None:
    """La ruta completa se conserva; lo que se pinta puede ir recortado."""
    assert editor.path_label.full_text() == str(track_item)
    assert editor.path_label.toolTip() == str(track_item), "la ruta completa va en el tooltip"


def test_tags_actuales_toman_lo_escrito(editor) -> None:
    editor.field_map["title"].setText("  New  ")
    editor.field_map["artist"].setText("Daft Punk")

    tags = editor.tags_current()
    assert tags.title == "New", "los espacios sobrantes deben recortarse"
    assert tags.artist == "Daft Punk"


def test_los_campos_no_quedan_estrangulados(qapp, track_item) -> None:
    """Con etiqueta al lado y las columnas fijas, los campos quedaban de 51px."""
    dialog = MetadataEditor(track_item)
    dialog.show()
    qapp.processEvents()

    anchos = {field_name: editor.width() for field_name, editor in dialog.field_map.items()}
    assert min(anchos.values()) >= 140, f"algún campo quedó demasiado angosto: {anchos}"


def test_los_campos_tienen_etiqueta_visible(qapp, track_item) -> None:
    """La etiqueta va arriba del campo, no al lado, que es lo que le da ancho."""
    from PySide6.QtWidgets import QLabel

    dialog = MetadataEditor(track_item)
    tag_list = [
        w.text()
        for w in dialog.findChildren(QLabel)
        if w.objectName() == "FieldLabel"
    ]

    for expected_value in ("Título", "Artista", "Álbum", "Género", "Nº de pista"):
        assert expected_value in tag_list, f"falta la etiqueta {expected_value}"


def test_editor_presenta_portada_y_metadatos_en_paneles(editor) -> None:
    assert editor.findChild(QWidget, "MetadataArtworkPanel") is not None
    assert editor.findChild(QWidget, "MetadataFormPanel") is not None
    assert editor.cover.objectName() == "MetadataCover"
    assert all(
        field_name.objectName() == "MetadataField"
        for field_name in editor.field_map.values()
    )
    assert editor.editar_layout.direction().name == "TopToBottom"
    assert editor.track_title.parentWidget().objectName() == "MetadataArtworkPanel"
    assert editor.path_label.full_text() == str(editor.path)


def test_identidad_superior_sigue_los_campos_de_titulo_y_artista(editor) -> None:
    editor.field_map["title"].setText("BEAM BEAM")
    editor.field_map["artist"].setText("SOYEON")

    assert editor.track_title.full_text() == "BEAM BEAM"
    assert editor.track_artist.full_text() == "SOYEON"


def test_todos_los_campos_son_editables(editor) -> None:
    expected_values = {"title", "artist", "album", "albumartist", "year", "genre", "track_number"}
    assert set(editor.field_map) == expected_values


def test_busqueda_muestra_catalogos_disponibles(editor) -> None:
    opciones = [
        editor.platform_box.itemText(index)
        for index in range(editor.platform_box.count())
    ]
    assert opciones == [
        "Automático · iTunes y Deezer",
        "Comparar todos · iTunes + Deezer + MusicBrainz",
        "Apple Music · iTunes",
        "Deezer",
        "MusicBrainz",
    ]


def test_editor_separa_edicion_de_busqueda(editor) -> None:
    assert editor.views.currentWidget() is editor.editar_view
    assert editor.save_btn.isHidden() is False

    editor._open_catalog()

    assert editor.views.currentWidget() is editor.catalog_view
    assert editor.back_btn.isHidden() is False
    assert editor.save_btn.isHidden() is True

    editor._back_editor()

    assert editor.views.currentWidget() is editor.editar_view
    assert editor.save_btn.isHidden() is False
    assert editor.back_btn.isHidden() is True


def test_resultado_indica_claramente_su_plataforma(editor) -> None:
    editor._on_results([_candidate()])

    item = editor.list.item(0)
    assert item.text() == "", "el texto se dibuja solo en la fila personalizada"
    assert editor.source_badge.text() == "APPLE MUSIC · ITUNES"
    row = editor.list.itemWidget(item)
    assert row is not None
    labels = row.findChildren(QLabel)
    assert any(label.text() == "APPLE MUSIC · ITUNES" for label in labels)
    assert any("Homework" in label.text() for label in labels)


def test_resultado_muestra_miniatura_de_portada(editor, monkeypatch) -> None:
    from PySide6.QtGui import QPixmap

    from tests.test_metadata import _png

    url = "https://example.test/cover.jpg"
    candidate = _candidate()
    candidate.cover_url = url
    monkeypatch.setattr(editor.thumbnails, "request", lambda *_: None)
    editor._on_results([candidate])
    pixmap = QPixmap()
    assert pixmap.loadFromData(_png())

    editor._on_thumbnail_loaded(url, pixmap)

    row = editor.list.itemWidget(editor.list.item(0))
    assert row is not None
    from PySide6.QtWidgets import QLabel

    miniatura = row.findChild(QLabel, "Card")
    assert miniatura is not None
    assert not miniatura.pixmap().isNull()


def test_cache_y_previsualizacion_conservan_resolucion_completa(editor, monkeypatch) -> None:
    from PySide6.QtGui import QColor, QPixmap

    from sakura.core.metadata_sources import Candidate

    url = "https://example.test/full-resolution-cover.jpg"
    candidate = Candidate(
        source="deezer",
        title="BEAM BEAM",
        artist="SOYEON",
        cover_url=url,
    )
    monkeypatch.setattr(editor.thumbnails, "request", lambda *_: None)
    editor._on_results([candidate])
    pixmap = QPixmap(640, 640)
    pixmap.fill(QColor("#FF5DA8"))

    editor._on_thumbnail_loaded(url, pixmap)
    editor._previsualizar(candidate)

    assert editor._artwork_pixmaps[url].size() == pixmap.size()
    assert editor._preview_artwork_bytes is not None
    full_resolution = QPixmap()
    assert full_resolution.loadFromData(editor._preview_artwork_bytes)
    assert full_resolution.size() == pixmap.size()


def test_muestra_todos_los_resultados_recibidos_y_habilita_scroll(editor) -> None:
    results = [_candidate(f"Canción {index}") for index in range(50)]

    editor._on_results(results)

    assert editor.list.count() == 50
    assert editor.results_title.text() == "50 resultados"
    assert editor.list.verticalScrollBarPolicy() == Qt.ScrollBarPolicy.ScrollBarAlwaysOn
    row = editor.list.itemWidget(editor.list.item(49))
    assert row is not None
    assert any(
        label.text() == "Canción 49"
        for label in row.findChildren(QLabel)
    )


# --- portada -----------------------------------------------------------------


def test_sin_portada_muestra_placeholder(editor) -> None:
    assert editor._cover_bytes is None
    assert not editor.cover.pixmap().isNull()


@requires_ffmpeg
def test_carga_portada_existente(qapp, track_item) -> None:
    from tests.test_metadata import _png

    write_cover(track_item, _png(), "image/png")
    dialog = MetadataEditor(track_item)
    assert dialog._cover_bytes is not None
    assert "Portada" in dialog.state.text()


def test_quitar_portada_en_el_dialogo(editor) -> None:
    editor._cover_bytes = b"algo"
    editor._remove_cover()
    assert editor._cover_removed is True
    assert editor._cover_bytes is None
    assert "Sin portada" in editor.state.text()


def test_cambiar_imagen_actualiza_el_estado(editor, tmp_path, monkeypatch) -> None:
    from tests.test_metadata import _png

    image = tmp_path / "nueva.png"
    image.write_bytes(_png())

    monkeypatch.setattr(
        "sakura.ui.widgets.metadata_editor.QFileDialog.getOpenFileName",
        staticmethod(lambda *a, **k: (str(image), "")),
    )
    editor._choose_image()

    assert editor._cover_removed is False
    assert editor._cover_bytes is not None
    assert editor._mime == "image/png"


def test_cancelar_el_dialogo_de_imagen_no_toca_nada(editor, monkeypatch) -> None:
    monkeypatch.setattr(
        "sakura.ui.widgets.metadata_editor.QFileDialog.getOpenFileName",
        staticmethod(lambda *a, **k: ("", "")),
    )
    before = editor._cover_bytes
    editor._choose_image()
    assert editor._cover_bytes == before


def test_imagen_con_formato_invalido_muestra_error(editor, tmp_path, monkeypatch) -> None:
    errors: list[str] = []
    monkeypatch.setattr(
        "sakura.ui.widgets.metadata_editor.QMessageBox.critical",
        staticmethod(lambda *a, **k: errors.append(a[2])),
    )

    mala = tmp_path / "portada.tiff"
    mala.write_bytes(b"II*")
    monkeypatch.setattr(
        "sakura.ui.widgets.metadata_editor.QFileDialog.getOpenFileName",
        staticmethod(lambda *a, **k: (str(mala), "")),
    )
    editor._choose_image()

    assert errors, "debio avisar que el formato no sirve"
    assert "no soportado" in errors[0]


def _candidate(title_text: str = "Around the World", number: str = "1"):
    from sakura.core.metadata_sources import Candidate

    return Candidate(
        source="itunes",
        title=title_text,
        artist="Daft Punk",
        album="Homework",
        year="1997",
        genre="House",
        track_number=number,
        album_id="123",
        cover_url="",
    )


# --- aplicar a todo el album (por la ruta de senales) ------------------------


@requires_ffmpeg
def test_album_found_escribe_los_tags(qapp, track_item, other_track, monkeypatch) -> None:
    """La señal que emite el buscador tiene que ejecutar la escritura.

    Estuvo conectada a `applied`, que nunca se emitía, así que el botón
    "Aplicar a todo el álbum" no etiquetaba nada y quedaba deshabilitado.
    """
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.download_cover", lambda *a, **k: None
    )

    dialog = MetadataEditor(track_item)
    dialog._candidate = _candidate()
    dialog._album_pending = [load_track(other_track)]

    dialog.searcher.album_found.emit([_candidate(), _candidate("Love for Sale", "2")])

    assert read_tags(track_item).title == "Around the World"
    assert read_tags(track_item).album == "Homework"
    assert read_tags(other_track).title == "Love for Sale"
    assert dialog.album_btn.isEnabled(), "el boton debe volver a habilitarse"


@requires_ffmpeg
def test_album_vacio_no_revienta_ni_deja_el_boton_malo(
    qapp, track_item, other_track, monkeypatch
) -> None:
    """Sin pistas del catálogo, `pistas_album[0]` reventaba con IndexError."""
    monkeypatch.setattr(
        "sakura.ui.services.metadata_search.download_cover", lambda *a, **k: None
    )

    dialog = MetadataEditor(track_item)
    dialog._candidate = _candidate()
    dialog._album_pending = [load_track(other_track)]

    dialog.searcher.album_found.emit([])

    assert "Ninguna" in dialog.state.text()
    assert dialog.album_btn.isEnabled()


# --- guardar -----------------------------------------------------------------


@requires_ffmpeg
def test_guardar_escribe_los_tags(qapp, track_item) -> None:
    dialog = MetadataEditor(track_item)
    dialog.field_map["title"].setText("Around the World")
    dialog.field_map["artist"].setText("Daft Punk")
    dialog.field_map["album"].setText("Homework")
    dialog.field_map["year"].setText("1997")
    dialog._save()

    tags = read_tags(track_item)
    assert tags.title == "Around the World"
    assert tags.artist == "Daft Punk"
    assert tags.album == "Homework"
    assert tags.year == "1997"


@requires_ffmpeg
def test_guardar_persiste_la_portada(qapp, track_item) -> None:
    from tests.test_metadata import _png

    image = _png()
    dialog = MetadataEditor(track_item)
    dialog._cover_bytes = image
    dialog._mime = "image/png"
    dialog._save()

    assert read_cover(track_item) == image


@requires_ffmpeg
def test_aplicar_resultado_incrusta_su_portada(qapp, track_item, monkeypatch) -> None:
    from PySide6.QtGui import QPixmap

    from sakura.core.metadata_sources import Candidate
    from tests.test_metadata import _png

    url = "https://example.test/cover.jpg"
    candidate = Candidate(
        source="deezer",
        title="BEAM BEAM",
        artist="JEON SOYEON",
        cover_url=url,
    )
    dialog = MetadataEditor(track_item)
    monkeypatch.setattr(dialog.thumbnails, "request", lambda *_: None)
    dialog._on_results([candidate])
    pixmap = QPixmap()
    assert pixmap.loadFromData(_png())
    dialog._on_thumbnail_loaded(url, pixmap)
    dialog._use_candidate()
    cover_applied = dialog._cover_bytes

    dialog._save()

    assert cover_applied
    assert read_cover(track_item) == cover_applied


@requires_ffmpeg
def test_quitar_portada_se_persiste(qapp, track_item) -> None:
    from tests.test_metadata import _png

    write_cover(track_item, _png(), "image/png")

    dialog = MetadataEditor(track_item)
    dialog._remove_cover()
    dialog._save()

    assert read_cover(track_item) is None


@requires_ffmpeg
def test_no_tocar_nada_no_modifica_el_archivo(qapp, track_item) -> None:
    original = track_item.read_bytes()

    dialog = MetadataEditor(track_item)
    dialog.field_map["title"].setText("No deberia guardarse")
    dialog.reject()

    assert track_item.read_bytes() == original


@requires_ffmpeg
def test_guardar_sobre_archivo_ilegible_muestra_error(qapp, tmp_path, monkeypatch) -> None:
    import contextlib

    fake = tmp_path / "roto.mp3"
    fake.write_bytes(b"no es audio")

    with contextlib.suppress(Exception):
        dialog = MetadataEditor(fake)

    errors: list[str] = []
    monkeypatch.setattr(
        "sakura.ui.widgets.metadata_editor.QMessageBox.critical",
        staticmethod(lambda *a, **k: errors.append(a[2])),
    )
    dialog._save()
    assert errors


@requires_ffmpeg
def test_tags_sobrevivien_al_cambio_de_portada(qapp, track_item) -> None:
    from tests.test_metadata import _png

    write_tags(track_item, TrackTags(title="Se queda", artist="Daft Punk"))
    dialog = MetadataEditor(track_item)
    dialog._cover_bytes = _png()
    dialog._mime = "image/png"
    dialog._save()

    assert read_tags(track_item).title == "Se queda"
    assert mutagen.File(track_item) is not None


# --- cierre ------------------------------------------------------------------


def test_cerrar_el_editor_corta_la_busqueda(editor, monkeypatch) -> None:
    """Cerrar con una busqueda en vuelo no puede dejar el hilo trabajando.

    `MetadataSearch` baja portadas y escribe tags: si sobrevive al dialogo, lo
    hace sobre widgets ya destruidos.
    """
    cortados: list[str] = []
    monkeypatch.setattr(editor.searcher, "shutdown", lambda: cortados.append("shutdown"))

    editor.reject()

    assert cortados == ["shutdown"]


# --- comparacion de candidatos -----------------------------------------------


def test_comparar_marca_solo_los_campos_que_cambian(editor) -> None:
    editor.field_map["title"].setText("Around the World")
    editor.field_map["artist"].setText("Otro artista")

    editor._on_results([_candidate()])

    assert editor.compare.has_candidate()
    selected = editor.compare.selected_fields()
    assert "title" not in selected, "el título ya coincidía, no hay nada que pisar"
    assert selected["artist"] == "Daft Punk"
    assert selected["album"] == "Homework"


def test_usar_candidato_aplica_solo_lo_marcado(editor) -> None:
    editor.field_map["artist"].setText("Otro artista")
    editor._on_results([_candidate()])
    editor.compare._boxes["album"].setChecked(False)

    editor._use_candidate()

    assert editor.field_map["artist"].text() == "Daft Punk"
    assert editor.field_map["album"].text() == "", "ese campo estaba desmarcado"
    assert editor.field_map["title"].text() == "Around the World"


def test_nueva_busqueda_limpia_la_comparacion(editor) -> None:
    editor._on_results([_candidate()])
    assert editor.compare.has_candidate()

    editor._on_results([])

    assert editor.compare.has_candidate() is False


def test_comparar_deshabilita_campos_sin_valor(editor) -> None:
    from sakura.core.metadata_sources import Candidate

    editor._on_results([Candidate("deezer", title="Tema", artist="Alguien")])

    assert editor.compare._boxes["title"].isEnabled()
    assert editor.compare._boxes["album"].isEnabled() is False


def test_marcar_todo_marca_solo_los_campos_con_valor(editor) -> None:
    from sakura.core.metadata_sources import Candidate

    editor._on_results([Candidate("deezer", title="Tema", artist="Alguien")])
    editor.compare._boxes["title"].setChecked(False)
    assert editor.compare.toggle.text() == "Marcar todo"

    editor.compare.toggle.click()

    assert editor.compare.toggle.text() == "Desmarcar todo"
    selected = editor.compare.selected_fields()
    assert "title" in selected
    assert "album" not in selected, "el candidato no trae ese campo"
