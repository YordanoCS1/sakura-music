"""Edición de tags en lote: la regla del campo vacío y el resultado."""

from __future__ import annotations

import subprocess
from pathlib import Path

import mutagen
import pytest
from PySide6.QtWidgets import QDialog

from sakura.core.library import Track
from sakura.core.metadata import read_tags
from sakura.core.tools import ffmpeg_location
from sakura.ui.widgets.batch_editor import (
    FIELDS_BATCH,
    BatchResult,
    applying_tags_a_batch,
    changes_batch,
)

FFMPEG = Path(ffmpeg_location()) / "ffmpeg.exe"
requires_ffmpeg = pytest.mark.skipif(not FFMPEG.exists(), reason="ffmpeg no instalado")


def _mp3(destino: Path, **tags: str) -> Path:
    """Mp3 real con los tags pedidos."""
    import contextlib

    destino.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [str(FFMPEG), "-y", "-loglevel", "error", "-f", "lavfi",
         "-i", "sine=frequency=440:duration=1", "-c:a", "libmp3lame",
         "-q:a", "9", str(destino)],
        check=True, capture_output=True,
    )
    audio = mutagen.File(destino)
    if audio is not None:
        with contextlib.suppress(Exception):
            audio.delete()
    if tags:
        from sakura.core.metadata import TrackTags, update_text_tags

        update_text_tags(destino, **TrackTags(**tags).as_text_mapping())
    return destino


def _track(file_path: Path) -> Track:
    from sakura.core.library import load_track

    track_item = load_track(file_path)
    assert track_item is not None
    return track_item


# --- la regla: vacio no es borrar ---------------------------------------------


def test_un_campo_vacio_no_entra_en_los_cambios() -> None:
    """La regla que hace seguro este formulario: vacio significa no tocar.

    Si vacio fuera 'borrar', marcar solo el genero dejaria 200 pistas sin
    album, y eso no se puede deshacer.
    """
    changes = changes_batch({"genre": "Rock", "album": "  ", "year": ""})

    assert changes == {"genre": "Rock"}


def test_los_espacios_al_redondeado_no_cuentan_como_valor() -> None:
    assert changes_batch({"genre": "   "}) == {}


def test_los_campos_de_lote_no_incluyen_el_titulo() -> None:
    """El titulo identifica la pista: dos pistas distintas lo tienen distinto."""
    assert "title" not in FIELDS_BATCH


def test_aplicar_sin_campos_no_hace_nada(tmp_path) -> None:
    result = applying_tags_a_batch([], {"genre": "  "})

    assert result.applied == 0
    assert result.text_summary == "No se modificó ninguna pista"


# --- contra archivos reales ---------------------------------------------------


@requires_ffmpeg
def test_escribe_en_todas_las_pistas(tmp_path) -> None:
    track_items = [
        _track(_mp3(tmp_path / f"{n}.mp3", title=f"Pista {n}"))
        for n in (1, 2, 3)
    ]

    result = applying_tags_a_batch(track_items, {"genre": "Rock", "year": "2001"})

    assert result.applied == 3
    assert result.errors == []
    for track_item in track_items:
        tags = read_tags(track_item.path)
        assert tags.genre == "Rock"
        assert tags.year == "2001"


@requires_ffmpeg
def test_no_toca_los_campos_que_no_se_pidieron(tmp_path) -> None:
    """Solo cambia el género: el título y el álbum quedan como estaban."""
    track_item = _track(
        _mp3(tmp_path / "a.mp3", title="One More Time", album="Discovery", artist="Daft Punk")
    )

    applying_tags_a_batch([track_item], {"genre": "Rock"})

    tags = read_tags(track_item.path)
    assert tags.genre == "Rock"
    assert tags.title == "One More Time"
    assert tags.album == "Discovery"
    assert tags.artist == "Daft Punk"


@requires_ffmpeg
def test_una_pista_ya_igual_no_cuenta_como_aplicada(tmp_path) -> None:
    """Si ya tiene ese género, avisar '3 actualizadas' seria mentira."""
    track_items = [_track(_mp3(tmp_path / f"{n}.mp3", genre="Rock")) for n in (1, 2)]

    result = applying_tags_a_batch(track_items, {"genre": "Rock"})

    assert result.applied == 0
    assert result.omitidas == 2


@requires_ffmpeg
def test_una_parte_se_aplica_although_falle_una(tmp_path) -> None:
    """Un archivo ilegible no puede dejar sin hacer al resto."""
    buenas = [_track(_mp3(tmp_path / "buena.mp3"))]
    rota = tmp_path / "rota.mp3"
    rota.write_bytes(b"esto no es audio")

    rota = Track(path=rota, title="Rota", artist="X", album="Y", duration=0.0)

    result = applying_tags_a_batch([*buenas, rota], {"genre": "Rock"})

    assert result.applied == 1
    assert result.errors
    assert read_tags(buenas[0].path).genre == "Rock"


# --- la ventana ----------------------------------------------------------------


def test_la_ventana_pide_campos_y_aplica(qapp, tmp_path) -> None:
    from sakura.ui.widgets.batch_editor import BatchEditDialog

    track_item = _track(_mp3(tmp_path / "a.mp3"))
    dialog = BatchEditDialog([track_item])

    dialog.field_map["genre"].setText("Rock")
    dialog._apply()

    assert dialog._result.applied == 1
    assert read_tags(track_item.path).genre == "Rock"


def test_sin_campos_no_confirma(qapp, tmp_path, monkeypatch) -> None:
    """Aplicar sin escribir nada seria cerrar el dialogo sin hacer nada."""
    from PySide6.QtWidgets import QMessageBox

    from sakura.ui.widgets.batch_editor import BatchEditDialog

    track_item = _track(_mp3(tmp_path / "a.mp3"))
    dialog = BatchEditDialog([track_item])
    preguntas: list[str] = []
    monkeypatch.setattr(
        QMessageBox, "information", lambda *a, **k: preguntas.append(a[2])
    )

    dialog._apply()

    assert preguntas, "debe avisar que no hay nada que aplicar"
    assert dialog.result() != QDialog.DialogCode.Accepted


def test_la_ventana_no_ofrece_titulo(qapp, tmp_path) -> None:
    from sakura.ui.widgets.batch_editor import BatchEditDialog

    dialog = BatchEditDialog([_track(_mp3(tmp_path / "a.mp3"))])

    assert "title" not in dialog.field_map


def test_el_resultado_se_lee_en_frases(qapp) -> None:
    assert BatchResult(applied=1).text_summary == "1 pistas actualizadas"
    assert BatchResult(omitidas=3).text_summary == "No se modificó ninguna pista"
    assert "3 sin cambios" in BatchResult(applied=1, omitidas=3).text_summary
    assert "1 con problemas" in BatchResult(applied=1, errors=["x"]).text_summary