"""La pagina de Biblioteca: escaneo, tabla y detalle."""

from __future__ import annotations

import subprocess
from pathlib import Path

import mutagen
import pytest
from PySide6.QtCore import QEventLoop, Qt

from sakura.core.tools import ffmpeg_location
from sakura.ui.pages.library import LibraryPage

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"


def _wait_scan(page: LibraryPage, timeout_ms: int = 25_000) -> None:
    """Espera a que termine el escaneo del hilo."""
    loop = QEventLoop()
    page.scanner.finished.connect(loop.quit)
    from PySide6.QtCore import QTimer

    QTimer.singleShot(timeout_ms, loop.quit)
    loop.exec()


def _wait(page: LibraryPage, timeout_ms: int = 25_000) -> None:
    _wait_scan(page, timeout_ms)
    assert page._library_root is not None
    page._open_folder(page._library_root / "Daft Punk")
    page._open_folder(page._library_root / "Daft Punk" / "Discovery")


def _wait_refresco(page: LibraryPage, timeout_ms: int = 25_000) -> None:
    """Espera a que termine el releido de pistas, que tambien va en un hilo."""
    loop = QEventLoop()
    page.refresher.finished.connect(loop.quit)
    from PySide6.QtCore import QTimer

    QTimer.singleShot(timeout_ms, loop.quit)
    loop.exec()


@pytest.fixture(scope="module")
def library_real(tmp_path_factory) -> Path:
    root = tmp_path_factory.mktemp("mi-biblioteca")
    (root / "Daft Punk" / "Discovery").mkdir(parents=True)

    for number, title_text in ((1, "One More Time"), (2, "Aerodynamic")):
        destino = root / "Daft Punk" / "Discovery" / f"{number:02d} {title_text}.mp3"
        subprocess.run(
            [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
             "-i", "sine=frequency=440:duration=1", str(destino)],
            check=True, capture_output=True,
        )
        tag = mutagen.File(destino)
        tag["TIT2"] = mutagen.id3.TIT2(encoding=3, text=[title_text])
        tag["TPE1"] = mutagen.id3.TPE1(encoding=3, text=["Daft Punk"])
        tag["TALB"] = mutagen.id3.TALB(encoding=3, text=["Discovery"])
        tag["TDRC"] = mutagen.id3.TDRC(encoding=3, text=["2001"])
        tag["TRCK"] = mutagen.id3.TRCK(encoding=3, text=[f"{number}/2"])
        tag.save()

    return root


@pytest.fixture()
def page(qapp, monkeypatch, library_real) -> LibraryPage:
    monkeypatch.setattr(
        "sakura.ui.pages.library.load_settings",
        lambda: {"audio_format": "opus", "volume": 80, "library_folder": str(library_real)},
    )
    pagina = LibraryPage()
    pagina.show()
    return pagina


# --- escaneo -----------------------------------------------------------------


def test_escanea_la_carpeta_configurada(page) -> None:
    _wait(page)
    assert len(page.model) == 2
    assert page.message.isVisible() is False


def test_muestra_la_carpeta_en_el_subtitulo(page) -> None:
    assert page.subtitle.text()


def test_stats_consistentes(page) -> None:
    _wait_scan(page)
    text_value = page.stats.text()
    assert "2 pistas" in text_value
    assert "1 álbumes" in text_value
    assert "1 artistas" in text_value


def test_carpeta_vacia_muestra_mensaje(qapp, monkeypatch, tmp_path) -> None:
    empty = tmp_path / "vacia"
    empty.mkdir()
    monkeypatch.setattr(
        "sakura.ui.pages.library.load_settings",
        lambda: {"audio_format": "opus", "volume": 80, "library_folder": str(empty)},
    )
    pagina = LibraryPage()
    pagina.show()
    pagina.rescan(empty)

    loop = QEventLoop()
    pagina.scanner.finished.connect(loop.quit)
    loop.exec()

    assert len(pagina.model) == 0
    assert pagina.message.isVisible() is True
    assert "No hay" in pagina.message.label.text()


def test_carpeta_inexistente_no_revienta(qapp, monkeypatch, tmp_path) -> None:
    monkeypatch.setattr(
        "sakura.ui.pages.library.load_settings",
        lambda: {"audio_format": "opus", "volume": 80, "library_folder": str(tmp_path / "nope")},
    )
    pagina = LibraryPage()
    pagina.show()
    pagina.rescan(tmp_path / "nope")
    assert pagina.message.isVisible() is True


# --- tabla y filtro ----------------------------------------------------------


def test_tabla_usa_el_proxy(page) -> None:
    _wait(page)
    assert page.table.model() is page.proxy
    assert page.table.model().rowCount() == 2


def test_biblioteca_navega_por_carpetas_y_busca_en_toda_la_biblioteca(page) -> None:
    _wait_scan(page)
    assert page.folder_panel.isVisible()
    assert page.folder_list.count() == 1
    assert page.folder_list.item(0).text().startswith("Daft Punk")
    # En la raiz se ve toda la biblioteca: el filtro de carpeta es recursivo, asi
    # que el contador de la lista y las filas de la tabla siempre coinciden.
    assert page.proxy.rowCount() == 2

    assert page._library_root is not None
    artist_name = page._library_root / "Daft Punk"
    album = artist_name / "Discovery"
    page._open_folder(artist_name)
    assert page.folder_list.count() == 1
    assert page.folder_list.item(0).text().startswith("Discovery")
    assert page.proxy.rowCount() == 2, "el artista incluye lo de sus albums"

    page._open_folder(album)
    assert page.folder_list.count() == 0
    assert page.proxy.rowCount() == 2
    assert page.up_folder_button.isVisible()

    page._open_parent_folder()
    assert page._current_folder == artist_name
    page._open_parent_folder()
    assert page._current_folder == page._library_root
    assert page.folder_panel.isVisible()

    page.filter_box.setText("aerodynamic")
    assert page.proxy.rowCount() == 1
    assert page.folder_panel.isVisible() is False
    page.filter_box.clear()
    assert page.proxy.rowCount() == 2
    assert page.folder_panel.isVisible()


def test_el_contador_de_una_carpeta_no_promete_mas_de_lo_que_muestra(page) -> None:
    """Regresión: la lista contaba pistas en profundidad y el filtro no.

    Una carpeta podia decir '2 pistas' y al abrirla no aparecer ninguna.
    """
    _wait_scan(page)

    assert page._library_root is not None
    pagina = page
    for item in range(pagina.folder_list.count()):
        entrada = pagina.folder_list.item(item)
        folder_path = entrada.data(Qt.ItemDataRole.UserRole)
        tracks_anunciadas = int(entrada.text().split()[-2])
        pagina._open_folder(folder_path)

        assert pagina.proxy.rowCount() == tracks_anunciadas, (
            f"{entrada.text()!r} pero se ven {pagina.proxy.rowCount()} filas"
        )

        pagina._open_parent_folder()


def test_tabla_muestra_portada_junto_al_titulo(page, tmp_path) -> None:
    from PySide6.QtCore import QSize
    from PySide6.QtGui import QColor, QIcon, QPixmap

    _wait(page)
    cover = tmp_path / "cover.png"
    image = QPixmap(64, 64)
    image.fill(QColor("#FF5DA8"))
    assert image.save(str(cover))

    track = page.model.track_at(0)
    assert track is not None
    track.cover_path = cover
    page.model.replace(0, track)
    icon = page.proxy.data(page.proxy.index(0, 1), Qt.ItemDataRole.DecorationRole)

    assert isinstance(icon, QIcon)
    assert not icon.pixmap(QSize(40, 40)).isNull()
    assert page.table.iconSize() == QSize(40, 40)
    assert page.table.verticalHeader().defaultSectionSize() >= 48


def test_filtrar_reduce_filas(page) -> None:
    _wait(page)
    page.filter_box.setText("aerodynamic")
    assert page.proxy.rowCount() == 1
    assert page.proxy.track_at(0).title == "Aerodynamic"
    assert "1 de 2" in page.stats.text()

    page.filter_box.clear()
    assert page.proxy.rowCount() == 2


def test_orden_por_columna(page) -> None:
    """Ordenar por el proxy es lo que hace el click en el encabezado."""
    _wait(page)

    page.proxy.sort(1, Qt.SortOrder.AscendingOrder)
    assert page.proxy.track_at(0).title == "Aerodynamic"

    page.proxy.sort(1, Qt.SortOrder.DescendingOrder)
    assert page.proxy.track_at(0).title == "One More Time"


def test_columna_ano_no_se_trunca(page) -> None:
    from sakura.ui.models.track_model import COLUMNS

    width_year = COLUMNS[4][1]
    assert width_year >= 60, "el año necesita 4 digitos mas padding"


# --- detalle -----------------------------------------------------------------


def test_seleccion_muestra_el_detalle(page) -> None:
    _wait(page)
    page.table.selectRow(0)
    assert page.selected_track() is not None
    assert page.detail.title.text() != "—"


def test_sin_seleccion_detalle_vacio(page) -> None:
    _wait(page)
    page.table.clearSelection()
    assert page.selected_track() is None
    assert page.detail.title.text() == "—"


def test_detalle_muestra_los_tags(page) -> None:
    _wait(page)
    page.table.selectRow(0)
    meta = page.detail.meta.text()
    assert "Daft Punk" in meta
    assert "Discovery" in meta
    assert "MP3" in meta


# --- tema --------------------------------------------------------------------


def test_refresh_requiere_tema_activo(page) -> None:
    page.refresh()  # no debe lanzar
    assert page.table is not None


# --- edicion de metadatos ---------------------------------------------------


def test_boton_editar_sigue_la_seleccion(page) -> None:
    _wait(page)
    assert page.edit_button.isEnabled() is False

    page.table.selectRow(0)
    assert page.edit_button.isEnabled() is True

    page.table.clearSelection()
    assert page.edit_button.isEnabled() is False


def test_editar_sin_seleccion_no_abre_nada(page, monkeypatch) -> None:
    _wait(page)
    open: list[object] = []
    monkeypatch.setattr(
        "sakura.ui.pages.library.open_editor",
        lambda *a, **k: open.append(a) or None,
    )
    page._on_edit()
    assert not open


def test_confirmar_la_edicion_actualiza_la_fila(page, library_real) -> None:
    from sakura.core.metadata import TrackTags

    _wait(page)
    page.table.selectRow(0)
    before = page.selected_track()

    page._refresh_track(before, TrackTags(title="Titulo Nuevo", artist="Artista Nuevo"))

    after = page.model.track_at(page.model.row_of(before))
    assert after.title == "Titulo Nuevo"
    assert after.artist == "Artista Nuevo"


def test_cancelar_no_toca_la_fila(page, monkeypatch) -> None:
    _wait(page)
    page.table.selectRow(0)
    before = page.selected_track()
    title_before = before.title

    monkeypatch.setattr(
        "sakura.ui.pages.library.open_editor", staticmethod(lambda *a, **k: None)
    )
    page._on_edit()

    assert page.model.track_at(page.model.row_of(before)).title == title_before


def test_al_editar_se_actualiza_el_detalle(page, library_real) -> None:
    from sakura.core.metadata import TrackTags

    _wait(page)
    page.table.selectRow(0)
    before = page.selected_track()

    page._refresh_track(before, TrackTags(title="Nuevo", artist="Nuevo Artista"))

    assert "Nuevo Artista" in page.detail.meta.text()


# --- ficha -------------------------------------------------------------------


def test_doble_clic_abre_la_ficha(page, monkeypatch) -> None:
    _wait(page)
    page.table.selectRow(0)

    called: list[object] = []

    class FakeTrackInfo:
        def __init__(self, track_item, parent=None):
            called.append(track_item)

        def exec(self) -> int:
            return 0

        def deleteLater(self) -> None:
            called.clear()

    monkeypatch.setattr("sakura.ui.pages.library.TrackInfoDialog", FakeTrackInfo)
    page._on_info()

    assert not called, "la ficha deberia haberse cerrado"
    # El refresh final se ejecuta igual aunque no se haya editado.
    assert page.selected_track() is not None


def test_ficha_recibe_las_pistas_hermanas(page, library_real) -> None:
    _wait(page)
    page.table.selectRow(0)
    track_item = page.selected_track()

    hermanas = page._tracks_album(track_item)
    assert isinstance(hermanas, list)
    assert all(t.folder == track_item.folder for t in hermanas)
    assert all(t.path != track_item.path for t in hermanas)


def test_refrescar_todos_relee_el_disco(page, library_real) -> None:
    from sakura.core.metadata import TrackTags, write_tags

    _wait(page)
    page.table.selectRow(0)
    target = page.selected_track()

    # Se cambia el archivo por fuera, como si fuera otra app.
    write_tags(target.path, TrackTags(title="Cambiado Por Fuera", artist="X"))

    page._refresh_all()
    _wait_refresco(page)

    row_index = page.model.row_of(target)
    assert page.model.track_at(row_index).title == "Cambiado Por Fuera"


def test_refrescar_todos_no_toca_el_hilo_de_la_interfaz(page, library_real) -> None:
    """El releido va en un hilo: `load_track` no puede correr en el hilo de la UI."""
    _wait(page)
    page.table.selectRow(0)
    target = page.selected_track()

    from_worker: list[str] = []
    page.refresher.tracks_refreshed.connect(
        lambda batch_items: from_worker.extend(str(r) for r, _ in batch_items)
    )

    page._refresh_all()
    assert page.refresher.is_running, "deberia haber un hilo releyendo"
    _wait_refresco(page)

    assert from_worker, "el hilo tiene que devolver las pistas releidas"
    assert str(target.path) in from_worker


def test_el_refresco_suelta_su_hilo_al_terminar(page, library_real) -> None:
    """El hilo terminado se libera, igual que en el escaneo.

    Si el refresher se queda con el QThread viejo, el releido siguiente lo
    reemplaza mientras Qt todavia lo esta cerrando. Es el patron que el scanner
    ya usaba y que acá faltaba.
    """
    _wait(page)
    page._refresh_all()
    _wait_refresco(page)

    assert page.refresher.is_running is False
    assert page.refresher._worker is None, "el hilo terminado tiene que liberarse"

    page._refresh_all()  # el siguiente releido tiene que entrar igual
    assert page.refresher.is_running
    _wait_refresco(page)


def test_ficha_sin_seleccion_no_abre(page) -> None:
    _wait(page)
    page.table.clearSelection()
    page._on_info()  # no debe lanzar
    assert page.selected_track() is None


def test_alternar_modo_de_vista(page) -> None:
    from PySide6.QtWidgets import QStyleOptionViewItem

    _wait(page)
    option = QStyleOptionViewItem()
    # Por defecto tabla
    assert page.view_mode in ("table", "grid", "discs", "carousel")
    page.set_view_mode("grid", save=False)
    assert page.view_mode == "grid"
    assert page.view_stack.currentIndex() == 1

    page.set_view_mode("discs", save=False)
    assert page.view_mode == "discs"
    assert page.view_stack.currentWidget() is page.discs_view
    assert page.discs_delegate.sizeHint(option, page.proxy.index(0, 0)).width() == 204

    page.set_view_mode("carousel", save=False)
    assert page.view_mode == "carousel"
    assert page.view_stack.currentWidget() is page.carousel_view
    assert page.carousel_delegate.sizeHint(option, page.proxy.index(0, 0)).width() == 344

    page.set_view_mode("table", save=False)
    assert page.view_mode == "table"
    assert page.view_stack.currentIndex() == 0


def test_seleccion_en_cuadricula(page) -> None:
    _wait(page)
    page.set_view_mode("grid", save=False)
    idx = page.proxy.index(0, 0)
    page.grid_view.setCurrentIndex(idx)
    selected = page.selected_track()
    assert selected is not None
    assert selected == page.proxy.track_at(0)
    assert page.edit_button.isEnabled() is True



@pytest.mark.parametrize("mode", ("discs", "carousel"))
def test_seleccion_en_vista_artistica(page, mode: str) -> None:
    _wait(page)
    page.set_view_mode(mode, save=False)
    view = page.card_views[mode]
    idx = page.proxy.index(0, 0)
    view.setCurrentIndex(idx)

    assert page.selected_track() == page.proxy.track_at(0)
    assert page.edit_button.isEnabled() is True


def test_vinilo_gira_solo_mientras_su_vista_esta_activa(page) -> None:
    from PySide6.QtTest import QTest

    _wait(page)
    page.set_view_mode("discs", save=False)
    posicion_initial = page.discs_delegate.rotation
    QTest.qWait(page._disc_timer.interval() * 3)

    assert page._disc_timer.isActive()
    assert page.discs_delegate.rotation != posicion_initial

    page.set_view_mode("grid", save=False)
    assert not page._disc_timer.isActive()
    posicion_detencion = page.discs_delegate.rotation
    QTest.qWait(page._disc_timer.interval() * 2)
    assert page.discs_delegate.rotation == posicion_detencion


def test_vinilo_reutiliza_la_imagen_compuesta_entre_fotogramas(page, tmp_path) -> None:
    from PySide6.QtGui import QColor, QPixmap

    from sakura.ui import theme as th

    _wait(page)
    track = page.model.track_at(0)
    assert track is not None
    cover = QPixmap(48, 48)
    cover.fill(QColor("#fa1496"))
    cover_path = tmp_path / "record-cover.png"
    assert cover.save(str(cover_path))
    track.cover_path = cover_path

    delegate = page.discs_delegate
    first_frame = delegate._vinyl_pixmap(track, 130, th.active())
    delegate.set_rotation(45)
    next_frame = delegate._vinyl_pixmap(track, 130, th.active())

    assert first_frame.cacheKey() == next_frame.cacheKey()
    assert len(delegate._vinyl_cache) == 1


@pytest.mark.parametrize(
    ("mode", "size", "cover_point"),
    (
        ("discs", (204, 270), (122, 82)),
        ("carousel", (344, 190), (90, 95)),
    ),
)
def test_nuevos_disenos_muestran_la_portada(page, tmp_path, mode, size, cover_point) -> None:
    from PySide6.QtCore import QRect
    from PySide6.QtGui import QColor, QPainter, QPixmap
    from PySide6.QtWidgets import QStyleOptionViewItem

    _wait(page)
    page.set_view_mode(mode, save=False)
    color = QColor("#fa1496")
    cover = QPixmap(48, 48)
    cover.fill(color)
    cover_path = tmp_path / f"{mode}-cover.png"
    assert cover.save(str(cover_path))

    tracks = page.model.tracks
    for track in tracks:
        track.cover_path = cover_path
    page.model.set_tracks(tracks)

    delegate = page.card_delegates[mode]
    option = QStyleOptionViewItem()
    option.rect = QRect(0, 0, *size)
    output = QPixmap(*size)
    output.fill(QColor("#ffffff"))
    painter = QPainter(output)
    delegate.paint(painter, option, page.proxy.index(0, 0))
    painter.end()

    pixel = output.toImage().pixelColor(*cover_point)
    assert pixel.red() > 220
    assert pixel.blue() > 120
    if mode == "discs":
        assert output.toImage().pixelColor(45, 35) != color


# --- deshacer el ultimo lote --------------------------------------------------


def _lote_guardo(tmp_path):
    from sakura.core.tag_history import Change, TagBatch, now_iso

    batch = TagBatch("l", now_iso(), [Change("a.mp3", {"genre": "Pop"}, {"genre": "Rock"})])
    manifest = tmp_path / "hist" / "20200101-000000-abc.json"
    manifest.parent.mkdir(parents=True)
    manifest.write_text("{}", encoding="utf-8")
    return batch, manifest


def test_el_boton_deshacer_arranca_apagado_sin_lotes(page, monkeypatch) -> None:
    import sakura.ui.pages.library as lib

    monkeypatch.setattr(lib, "latest_manifest", lambda directory: None)

    page._update_undo_state()

    assert not page.undo_button.isEnabled()


def test_sin_lote_para_deshacer_avisa(page, monkeypatch) -> None:
    import sakura.ui.pages.library as lib

    monkeypatch.setattr(lib, "latest_manifest", lambda directory: None)

    page._on_undo()

    assert "No hay ningún lote" in page.message.label.text()


def test_deshacer_restaura_y_consume_el_manifiesto(page, monkeypatch, tmp_path) -> None:
    from PySide6.QtWidgets import QMessageBox

    import sakura.ui.pages.library as lib
    from sakura.core.tag_history import RevertResult

    batch, manifest = _lote_guardo(tmp_path)
    llamadas = {"n": 0}

    def fake_latest(directory):
        llamadas["n"] += 1
        return (batch, manifest) if llamadas["n"] == 1 else None

    monkeypatch.setattr(lib, "latest_manifest", fake_latest)
    monkeypatch.setattr(lib, "revert_batch", lambda b: RevertResult(restored=2))
    monkeypatch.setattr(
        QMessageBox, "question", lambda *a, **k: QMessageBox.StandardButton.Yes
    )
    refrescos: list[str] = []
    monkeypatch.setattr(page, "_refresh_all", lambda: refrescos.append("si"))

    page._on_undo()

    assert refrescos == ["si"]
    assert not manifest.exists(), "el manifiesto se consume al deshacer"
    assert "2 pistas restauradas" in page.message.label.text()
    assert not page.undo_button.isEnabled()


def test_deshacer_cancelado_no_toca_el_manifiesto(page, monkeypatch, tmp_path) -> None:
    from PySide6.QtWidgets import QMessageBox

    import sakura.ui.pages.library as lib

    batch, manifest = _lote_guardo(tmp_path)
    monkeypatch.setattr(lib, "latest_manifest", lambda directory: (batch, manifest))
    revertidos: list[object] = []
    monkeypatch.setattr(lib, "revert_batch", lambda b: revertidos.append(b))
    monkeypatch.setattr(
        QMessageBox, "question", lambda *a, **k: QMessageBox.StandardButton.No
    )

    page._on_undo()

    assert not revertidos, "cancelar no puede revertir nada"
    assert manifest.exists()