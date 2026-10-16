"""Formatos de audio, video y persistencia de ajustes."""

from __future__ import annotations

import json

import pytest

from sakura import config
from sakura.core.formats import (
    AUDIO_FORMATS,
    DEFAULT_FORMAT_ID,
    FORMATS,
    VIDEO_FORMATS,
    AudioFormat,
    MediaFormat,
    get_default,
    get_format,
)


def test_formatos_incluyen_audio_y_video() -> None:
    audio_ids = [f.id for f in AUDIO_FORMATS]
    video_ids = [f.id for f in VIDEO_FORMATS]
    assert audio_ids == ["opus", "m4a", "mp3"]
    assert "mp4_1080p" in video_ids
    assert "mp4_720p" in video_ids
    assert len(FORMATS) == len(AUDIO_FORMATS) + len(VIDEO_FORMATS)


def test_opus_no_recodifica() -> None:
    opus = get_format("opus")
    assert opus.quality is None
    assert opus.transcodes is False
    assert opus.is_video is False


def test_m4a_y_mp3_si_recodifican() -> None:
    assert get_format("m4a").quality == "192K"
    assert get_format("mp3").quality == "320K"
    assert all(f.transcodes for f in AUDIO_FORMATS if f.id != "opus")


def test_formatos_de_video_tienen_is_video() -> None:
    for vf in VIDEO_FORMATS:
        assert vf.is_video is True
        assert vf.extension == "mp4"


def test_calidades_de_video() -> None:
    assert get_format("mp4_1080p").height == 1080
    assert get_format("mp4_720p").height == 720
    assert get_format("mp4_480p").height == 480
    assert get_format("mp4_360p").height == 360
    assert get_format("mp4_best").height is None


def test_bitrate_de_m4a_no_es_vbr() -> None:
    """`quality 0` en AAC da ~410 kbps: 3x el origen para nada."""
    assert get_format("m4a").quality is not None
    assert get_format("m4a").quality.endswith("K")


def test_default_es_opus() -> None:
    assert get_default().id == DEFAULT_FORMAT_ID == "opus"


@pytest.mark.parametrize("pedido", ["no-existe", "", None])
def test_formato_desconocido_cae_al_default(pedido) -> None:
    assert get_format(pedido) is get_default()


# --- persistencia ------------------------------------------------------------


@pytest.fixture()
def isolated_config(monkeypatch, tmp_path):
    """Redirige `config.json` a un temporal para no tocar el del usuario."""
    monkeypatch.setattr(config, "config_file", lambda: tmp_path / "config.json")
    return tmp_path / "config.json"


def test_defaults_sin_archivo(isolated_config) -> None:
    assert config.load_settings()["audio_format"] == "opus"
    assert config.load_settings()["volume"] == 80


def test_guardar_y_recargar(isolated_config) -> None:
    config.save_settings({"audio_format": "mp3"})
    assert config.load_settings()["audio_format"] == "mp3"


def test_guardar_y_recargar_video_format(isolated_config) -> None:
    config.save_settings({"audio_format": "mp4_1080p"})
    assert config.load_settings()["audio_format"] == "mp4_1080p"


def test_guardar_y_recargar_carpetas(isolated_config, tmp_path) -> None:
    lib_path = str(tmp_path / "MiMusica")
    dl_path = str(tmp_path / "MisDescargas")
    config.save_settings({"library_folder": lib_path, "downloads_folder": dl_path})
    settings = config.load_settings()
    assert settings["library_folder"] == lib_path
    assert settings["downloads_folder"] == dl_path
    assert config.library_dir() == tmp_path / "MiMusica"
    assert config.downloads_target_dir() == tmp_path / "MisDescargas"


def test_guardar_solo_conserva_claves_conocidas(isolated_config) -> None:
    config.save_settings({"audio_format": "m4a", "inventado": "x"})
    data = json.loads(isolated_config.read_text(encoding="utf-8"))
    assert "inventado" not in data
    assert data["audio_format"] == "m4a"



def test_json_corrupto_no_rompe_la_app(isolated_config) -> None:
    isolated_config.write_text("{esto no es json", encoding="utf-8")
    assert config.load_settings()["audio_format"] == "opus"


def test_escritura_atomica_no_deja_temporales(isolated_config) -> None:
    config.save_settings({"audio_format": "mp3"})
    assert not isolated_config.with_suffix(".tmp").exists()


def test_audio_format_es_desde_settings(isolated_config) -> None:
    config.save_settings({"audio_format": "m4a"})
    assert get_format(config.load_settings()["audio_format"]).id == "m4a"


def test_format_es_inmutable() -> None:
    fmt = FORMATS[0]
    with pytest.raises(AttributeError):
        fmt.quality = "192K"  # type: ignore[misc]


def test_etiquetas_describen_el_formato() -> None:
    assert all(fmt.label for fmt in FORMATS)
    assert isinstance(AudioFormat("x", "y", "z", None).transcodes, bool)
    assert isinstance(MediaFormat("x", "y", "z", None, is_video=True).is_video, bool)