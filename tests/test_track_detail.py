"""Tests del panel lateral moderno de registro y detalle de pista."""

from __future__ import annotations

from pathlib import Path

from PySide6.QtWidgets import QApplication

from sakura.core.library import Track
from sakura.ui.widgets.track_detail import TrackDetail


def _make_track(tmp_path: Path, title: str = "Cancion Test", artist: str = "Artista Test") -> Track:
    file_path = tmp_path / f"{title}.mp3"
    file_path.write_text("dummy mp3 content", encoding="utf-8")
    return Track(
        path=file_path,
        title=title,
        artist=artist,
        album="Disco Test",
        duration=215.0,
        year="2024",
        genre="Synthwave",
        track_number="3/10",
        size=4096,
    )


def test_track_detail_empty_state(qapp) -> None:
    panel = TrackDetail()
    panel.show()
    panel.set_track(None)

    assert panel.title.text() == "—"
    assert not panel.empty_widget.isHidden()
    assert panel.cover.isHidden() is True
    assert panel.edit_btn.isHidden() is True
    assert panel.folder_btn.isHidden() is True


def test_track_detail_with_track(qapp, tmp_path: Path) -> None:
    panel = TrackDetail()
    panel.show()
    track = _make_track(tmp_path)
    panel.set_track(track)

    assert panel.empty_widget.isHidden() is True
    assert not panel.cover.isHidden()
    assert panel.title.text() == "Cancion Test"
    assert "Artista Test" in panel.meta.text()
    assert "Disco Test" in panel.meta.text()
    assert "MP3" in panel.meta.text()
    assert panel.status_pill.text() == "✓ En SQLite"
    assert not panel.edit_btn.isHidden()
    assert not panel.folder_btn.isHidden()
    assert not panel.info_btn.isHidden()
    assert panel._lbl_year_val.text() == "2024"
    assert panel._lbl_genre_val.text() == "Synthwave"
    assert panel._lbl_track_val.text() == "3/10"


def test_track_detail_signals(qapp, tmp_path: Path) -> None:
    panel = TrackDetail()
    panel.set_track(_make_track(tmp_path))

    edit_emitted = []
    folder_emitted = []
    info_emitted = []

    panel.edit_requested.connect(lambda: edit_emitted.append(True))
    panel.folder_requested.connect(lambda: folder_emitted.append(True))
    panel.info_requested.connect(lambda: info_emitted.append(True))

    panel.edit_btn.click()
    assert edit_emitted == [True]

    panel.folder_btn.click()
    assert folder_emitted == [True]

    panel.info_btn.click()
    assert info_emitted == [True]


def test_track_detail_flash_saved(qapp, tmp_path: Path) -> None:
    panel = TrackDetail()
    panel.set_track(_make_track(tmp_path))

    panel.flash_saved()
    assert panel.status_pill.text() == "✓ ¡Actualizado!"


def test_track_detail_copy_path(qapp, tmp_path: Path) -> None:
    panel = TrackDetail()
    track = _make_track(tmp_path)
    panel.set_track(track)

    panel.copy_path_btn.click()
    assert QApplication.clipboard().text() == str(track.path)


def test_toolbar_toggle_detail_button(qapp) -> None:
    from sakura.ui.pages.library import LibraryPage
    page = LibraryPage()
    assert not page.detail.isHidden()

    page.toolbar.detail_button.click()
    assert page.detail.isHidden() is True

    page.toolbar.detail_button.click()
    assert not page.detail.isHidden()


def test_refresh_track_updates_sqlite(qapp, tmp_path: Path, monkeypatch) -> None:
    from sakura.config import library_index_file
    from sakura.core.library_index import LibraryIndex
    from sakura.core.metadata import TrackTags
    from sakura.ui.pages.library import LibraryPage

    page = LibraryPage()
    track = _make_track(tmp_path, title="Original Title", artist="Original Artist")
    page.model.set_tracks([track])

    monkeypatch.setattr(
        "sakura.ui.pages.library.load_track",
        lambda p: Track(
            path=p,
            title="Original Title",
            artist="Original Artist",
            album="Disco Test",
            duration=215.0,
            year="2024",
            genre="Synthwave",
            track_number="3/10",
            size=4096,
        ),
    )

    new_tags = TrackTags(
        title="Updated Title",
        artist="Updated Artist",
        album="Updated Album",
        year="2025",
        genre="Synth",
        track_number="1",
    )
    page._refresh_track(track, new_tags)

    with LibraryIndex(library_index_file()) as index:
        loaded = index.load()
        assert track.path in loaded
        assert loaded[track.path].track.title == "Updated Title"
        assert loaded[track.path].track.artist == "Updated Artist"
