"""Tests para normalizacion y limpieza de titulos y artistas."""

from __future__ import annotations

from sakura.core.text import (
    clear_title_y_artist,
    normalize,
    similarity,
    without_parentesis,
)


def test_limpiar_titulo_kpop_con_official_music_video() -> None:
    raw = "(여자)아이들((G)I-DLE) - 'TOMBOY' Official Music Video"
    title_text, artist_name = clear_title_y_artist(raw, "(G)I-DLE")
    assert title_text == "TOMBOY"
    assert artist_name == "(여자)아이들((G)I-DLE)"


def test_limpiar_titulo_sin_guion_con_comillas_y_mv() -> None:
    raw = 'TWICE "Feel Special" M/V'
    title_text, artist_name = clear_title_y_artist(raw, "JYP Entertainment")
    assert title_text == "Feel Special"
    assert artist_name == "TWICE"


def test_limpiar_titulo_kpop_con_comillas_curvas() -> None:
    raw = "BLACKPINK - \u2018Pink Venom\u2019 M/V"
    title_text, artist_name = clear_title_y_artist(raw, "BLACKPINK")
    assert title_text == "Pink Venom"
    assert artist_name == "BLACKPINK"



def test_limpiar_titulo_newjeans_official_mv() -> None:
    raw = "NewJeans (뉴진스) 'Super Shy' Official MV"
    title_text, artist_name = clear_title_y_artist(raw, "HYBE LABELS")
    assert title_text == "Super Shy"
    assert artist_name == "NewJeans (뉴진스)"


def test_limpiar_titulo_y_artista_con_ruido_y_guion() -> None:
    title_text, artist_name = clear_title_y_artist(
        "Daft Punk - One More Time (Official Video 4K)", "DaftPunkVEVO"
    )
    assert title_text == "One More Time"
    assert artist_name == "Daft Punk"


def test_limpiar_titulo_y_artista_con_topic_channel() -> None:
    title_text, artist_name = clear_title_y_artist(
        "Queen - Bohemian Rhapsody [Official Music Video]", "Queen - Topic"
    )
    assert title_text == "Bohemian Rhapsody"
    assert artist_name == "Queen"


def test_limpiar_titulo_sin_guion_usa_uploader_limpio() -> None:
    title_text, artist_name = clear_title_y_artist(
        "Bad Guy (Lyrics)", "Billie Eilish"
    )
    assert title_text == "Bad Guy"
    assert artist_name == "Billie Eilish"


def test_limpiar_titulo_guion_largo() -> None:
    title_text, artist_name = clear_title_y_artist(
        "Coldplay \u2013 Viva La Vida (Audio Oficial)", "Coldplay"
    )
    assert title_text == "Viva La Vida"
    assert artist_name == "Coldplay"


def test_normalizar_ignora_mayusculas_y_ruido() -> None:
    assert normalize("One More Time (Official Video)") == normalize("one more time")


def test_similitud_calcula_ratio() -> None:
    assert similarity("One More Time", "one more time") == 1.0
    assert similarity("Daft Punk", "Kraftwerk") < 0.5


def test_sin_parentesis_remueve_bloques() -> None:
    assert without_parentesis("Cancion (feat. Alguien)") == "Cancion"
