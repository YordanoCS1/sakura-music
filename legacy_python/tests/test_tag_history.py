"""Historial de tags: diff, manifiestos y deshacer un lote."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import mutagen
import pytest

from sakura.core.library import Track
from sakura.core.metadata import read_tags, update_text_tags
from sakura.core.tag_history import (
    MAX_MANIFESTS,
    Change,
    RevertResult,
    TagBatch,
    diff_fields,
    latest_manifest,
    load_manifest,
    make_change,
    now_iso,
    revert_batch,
    save_manifest,
)
from sakura.core.tools import ffmpeg_location
from sakura.ui.widgets.batch_editor import applying_tags_a_batch

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
        update_text_tags(destino, **tags)
    return destino


def _track(file_path: Path) -> Track:
    from sakura.core.library import load_track

    track_item = load_track(file_path)
    assert track_item is not None
    return track_item


def _change(path: str = "a.mp3", before: str = "Pop", after: str = "Rock") -> Change:
    return Change(path=path, before={"genre": before}, after={"genre": after})


# --- diff ---------------------------------------------------------------------


def test_diff_solo_reporta_lo_que_cambia() -> None:
    before = {"title": "A", "genre": "Pop", "year": ""}
    after = {"title": "A", "genre": "Rock", "year": "2001"}

    before_map, after_map = diff_fields(before, after)

    assert before_map == {"genre": "Pop", "year": ""}
    assert after_map == {"genre": "Rock", "year": "2001"}
    assert "title" not in before_map


def test_make_change_sin_diferencias_es_none() -> None:
    assert make_change(Path("a.mp3"), {"genre": "Pop"}, {"genre": "Pop"}) is None


def test_make_change_guarda_las_dos_caras() -> None:
    change = make_change(Path("a.mp3"), {"genre": "Pop"}, {"genre": "Rock"})

    assert change is not None
    assert change.before == {"genre": "Pop"}
    assert change.after == {"genre": "Rock"}


# --- texto de resumen ---------------------------------------------------------


def test_texto_del_lote() -> None:
    assert TagBatch("l", "x", [_change()]).text_summary == "1 pista"
    assert TagBatch("l", "x", []).text_summary == "0 pistas"


def test_texto_del_resultado_de_deshacer() -> None:
    assert RevertResult().text_summary == "No se pudo deshacer nada"
    assert RevertResult(restored=1).text_summary == "1 pista restaurada"
    assert RevertResult(restored=2).text_summary == "2 pistas restauradas"
    assert "cambiadas por fuera" in RevertResult(restored=1, skipped=1).text_summary
    assert "con problemas" in RevertResult(restored=1, errors=["x"]).text_summary


# --- manifiestos --------------------------------------------------------------


def test_no_guarda_un_lote_vacio(tmp_path) -> None:
    hist = tmp_path / "h"

    assert save_manifest(TagBatch("l", now_iso(), []), hist) is None
    assert not hist.exists()


def test_el_manifiesto_va_y_vuelve(tmp_path) -> None:
    hist = tmp_path / "h"
    batch = TagBatch("lote", now_iso(), [_change()])

    path = save_manifest(batch, hist)

    assert path is not None and path.exists()
    recovered = load_manifest(path)
    assert recovered.label == "lote"
    assert recovered.changes == [_change()]


def test_no_queda_ningun_temporal(tmp_path) -> None:
    hist = tmp_path / "h"

    save_manifest(TagBatch("l", now_iso(), [_change()]), hist)

    assert list(hist.glob("*.tmp")) == []


def test_la_poda_deja_solo_los_ultimos(tmp_path) -> None:
    hist = tmp_path / "h"
    for _ in range(MAX_MANIFESTS + 5):
        save_manifest(TagBatch("l", now_iso(), [_change()]), hist)

    assert len(list(hist.glob("*.json"))) == MAX_MANIFESTS


def test_latest_sin_carpeta_es_none(tmp_path) -> None:
    assert latest_manifest(tmp_path / "no-existe") is None


def test_latest_descarta_los_corruptos(tmp_path) -> None:
    hist = tmp_path / "h"
    hist.mkdir()
    bueno = hist / "20200101-000000-bueno.json"
    bueno.write_text(
        json.dumps({"label": "l", "created_at": "x", "changes": [{"path": "a.mp3",
                    "before": {"genre": "Pop"}, "after": {"genre": "Rock"}}]}),
        encoding="utf-8",
    )
    corrupto = hist / "20200102-000000-roto.json"
    corrupto.write_text("{ no es json", encoding="utf-8")

    found = latest_manifest(hist)

    assert found is not None
    batch, _ = found
    assert batch.label == "l"
    assert not corrupto.exists(), "el corrupto se descarta en vez de romper el deshacer"


def test_latest_salta_los_lotes_sin_cambios(tmp_path) -> None:
    hist = tmp_path / "h"
    hist.mkdir()
    (hist / "20200101-000000-a.json").write_text(
        json.dumps({"label": "vacio", "created_at": "x", "changes": []}), encoding="utf-8"
    )
    (hist / "20200102-000000-b.json").write_text(
        json.dumps({"label": "lleno", "created_at": "x", "changes": [{"path": "a.mp3",
                    "before": {"genre": "Pop"}, "after": {"genre": "Rock"}}]}),
        encoding="utf-8",
    )

    found = latest_manifest(hist)

    assert found is not None
    assert found[0].label == "lleno"


# --- deshacer contra archivos reales ------------------------------------------


@requires_ffmpeg
def test_deshacer_restaura_los_tags_previos(tmp_path) -> None:
    track_item = _track(_mp3(tmp_path / "a.mp3", genre="Pop", year="1999"))
    result = applying_tags_a_batch(
        [track_item], {"genre": "Rock"}, history_dir=tmp_path / "h"
    )
    assert read_tags(track_item.path).genre == "Rock"

    revert = revert_batch(result.batch)

    assert revert.restored == 1
    assert revert.errors == []
    tags = read_tags(track_item.path)
    assert tags.genre == "Pop"
    assert tags.year == "1999"


@requires_ffmpeg
def test_no_pisa_lo_que_cambio_por_fuera(tmp_path) -> None:
    """Si alguien reetiqueto despues del lote, no se revierte a ciegas."""
    track_item = _track(_mp3(tmp_path / "a.mp3", genre="Pop"))
    result = applying_tags_a_batch(
        [track_item], {"genre": "Rock"}, history_dir=tmp_path / "h"
    )
    update_text_tags(track_item.path, genre="Metal")

    revert = revert_batch(result.batch)

    assert revert.restored == 0
    assert revert.skipped == 1
    assert read_tags(track_item.path).genre == "Metal"


def test_deshacer_avisa_si_el_archivo_ya_no_esta(tmp_path) -> None:
    batch = TagBatch("l", now_iso(), [_change(path=str(tmp_path / "fantasma.mp3"))])

    revert = revert_batch(batch)

    assert revert.restored == 0
    assert revert.errors


# --- el lote deja rastro solo si se pide --------------------------------------


@requires_ffmpeg
def test_sin_carpeta_de_historial_no_guarda_nada(tmp_path) -> None:
    hist = tmp_path / "h"
    track_item = _track(_mp3(tmp_path / "a.mp3"))

    result = applying_tags_a_batch([track_item], {"genre": "Rock"})

    assert result.manifest is None
    assert not hist.exists()


@requires_ffmpeg
def test_el_lote_queda_auditado_en_un_manifiesto(tmp_path) -> None:
    hist = tmp_path / "h"
    track_items = [_track(_mp3(tmp_path / f"{n}.mp3", genre="Pop")) for n in (1, 2)]

    result = applying_tags_a_batch(track_items, {"genre": "Rock"}, history_dir=hist)

    assert result.manifest is not None and result.manifest.exists()
    batch = load_manifest(result.manifest)
    assert batch.count == 2
    assert all(change.before == {"genre": "Pop"} for change in batch.changes)
    assert all(change.after == {"genre": "Rock"} for change in batch.changes)


# --- el editor de una pista tambien deja historial ----------------------------


@requires_ffmpeg
def test_editar_una_pista_deja_el_cambio_en_el_historial(qapp, tmp_path) -> None:
    from sakura.config import tag_history_dir
    from sakura.ui.widgets.metadata_editor import MetadataEditor

    file_path = _mp3(tmp_path / "a.mp3", genre="Pop", title="Tema")
    hist = tag_history_dir()
    for viejo in hist.glob("*.json"):
        viejo.unlink()

    editor = MetadataEditor(file_path)
    editor.field_map["genre"].setText("Rock")
    editor._save()

    manifests = list(hist.glob("*.json"))
    assert len(manifests) == 1
    batch = load_manifest(manifests[0])
    assert batch.count == 1
    assert batch.changes[0].before == {"genre": "Pop"}
    assert batch.changes[0].after == {"genre": "Rock"}
