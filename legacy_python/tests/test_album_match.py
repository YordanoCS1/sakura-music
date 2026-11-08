"""Cruce de las pistas de un album del catalogo con videos de YouTube."""

from __future__ import annotations

import pytest

from sakura.core.album_match import (
    DURATION_TOLERANCE_S,
    Match,
    Verdict,
    key_track,
    match_album,
    match_track,
    puntuar,
    summary_matches,
)
from sakura.core.metadata_sources import Candidate
from sakura.core.models import SearchResult


def track_item(
    title_text: str = "One More Time",
    seconds_value: int = 320,
    artist_name: str = "Daft Punk",
) -> Candidate:
    return Candidate(
        source="itunes",
        title=title_text,
        artist=artist_name,
        album="Discovery",
        duration_ms=seconds_value * 1000,
        album_id="1",
    )


def video(
    title_text: str = "Daft Punk - One More Time",
    seconds_value: int = 320,
    canal: str = "Daft Punk",
) -> SearchResult:
    return SearchResult(
        id=title_text[:6],
        title=title_text,
        url=f"https://youtu.be/{title_text[:6]}",
        uploader=canal,
        duration=seconds_value,
    )


# --- puntuacion ---------------------------------------------------------------


def test_la_duracion_exacta_manda() -> None:
    candidate = track_item(seconds_value=320)

    exacto = puntuar(candidate, video(seconds_value=320)).total
    long = puntuar(candidate, video(seconds_value=3600)).total

    assert exacto > long


def test_un_video_de_tres_horas_no_puntua_bien() -> None:
    candidate = track_item(seconds_value=200)

    puntuacion = puntuar(candidate, video(seconds_value=10800))

    assert puntuacion.total < 0
    assert "compilación" in puntuacion.reason or "directo" in puntuacion.reason


def test_se_descartan_compilaciones_y_directos() -> None:
    candidate = track_item()
    assert puntuar(candidate, video(title_text="Top 20 Hits", seconds_value=320)).total < 0
    assert puntuar(candidate, video(title_text="One More Time (Live)", seconds_value=320)).total < 0
    assert puntuar(candidate, video(title_text="LoFi Radio 1 Hour", seconds_value=3600)).total < 0


def test_el_canal_topic_cuenta_como_buena_fuente() -> None:
    """Los canales 'Topic' son el audio oficial aunque el nombre no calce."""
    candidate = track_item()
    total = puntuar(candidate, video(canal="Daft Punk - Topic")).total

    assert total >= 130, "un canal Topic con la duracion exacta es la fuente ideal"


def test_el_motivo_dice_las_dos_duraciones() -> None:
    candidate = track_item(seconds_value=320)

    reason = puntuar(candidate, video(seconds_value=350)).reason

    assert "5:50" in reason
    assert "5:20" in reason


def test_sin_duracion_no_se_puntua_como_fallo() -> None:
    """YouTube a veces no trae duracion: no es motivo para descartar."""
    candidate = track_item(seconds_value=320)

    puntuacion = puntuar(candidate, video(seconds_value=0))

    assert "sin duración" in puntuacion.reason
    assert puntuacion.total > 0


# --- eleccion -----------------------------------------------------------------


def test_elige_el_video_que_calza() -> None:
    candidate = track_item()

    match = match_track(
        candidate,
        [
            video(title_text="One More Time (Live at Coachella)", seconds_value=400),
            video(title_text="Daft Punk - One More Time", seconds_value=321),
        ],
    )

    assert match.verdict is Verdict.MATCHES
    assert match.video is not None
    assert "Coachella" not in match.video.title
    assert match.reason.startswith("5:21 contra 5:20")


def test_una_version_extendida_queda_dudosa() -> None:
    candidate = track_item(seconds_value=320)

    match = match_track(candidate, [video(seconds_value=400)])

    assert match.verdict is Verdict.DOUBTFUL
    assert match.video is not None, "se puede aceptar, pero hay que verlo"


def test_sin_videos_no_hay_match() -> None:
    match = match_track(track_item(), [])

    assert match.verdict is Verdict.WITHOUT_MATCH
    assert match.video is None
    assert match.reason


def test_solo_compilaciones_da_sin_match() -> None:
    match = match_track(track_item(seconds_value=200), [video(seconds_value=7200)])

    assert match.verdict is Verdict.WITHOUT_MATCH
    assert match.video is None


def test_el_titulo_muy_distinto_no_alcanza_para_confirmar() -> None:
    """Con la duracion correcta pero otro titulo, mejor dudoso que coincidencia."""
    candidate = track_item(title_text="Veridis Quo", seconds_value=278)

    match = match_track(candidate, [video(title_text="Cancion Sin Relacion", seconds_value=278)])

    assert match.verdict is not Verdict.MATCHES


def test_guarda_algunas_alternativas_por_si_el_primero_no_sirve() -> None:
    candidate = track_item()

    match = match_track(
        candidate,
        [video(title_text=f"Opcion {n}", seconds_value=320 + n) for n in range(6)],
    )

    assert 0 < len(match.alternativas) <= 3


# --- album completo -----------------------------------------------------------


def test_empareja_todas_las_pistas_independiente() -> None:
    track_items = [
        track_item(title_text="One More Time", seconds_value=320),
        track_item(title_text="Aerodynamic", seconds_value=212),
        track_item(title_text="Veridis Quo", seconds_value=278),
    ]
    videos = {
        key_track(track_items[0]): [video(title_text="One More Time", seconds_value=320)],
        key_track(track_items[1]): [video(title_text="Aerodynamic", seconds_value=212)],
        # La tercera no trae resultados.
    }

    matches = match_album(track_items, videos)

    assert [m.verdict for m in matches] == [
        Verdict.MATCHES,
        Verdict.MATCHES,
        Verdict.WITHOUT_MATCH,
    ]


def test_el_resumen_cuenta_cada_veredicto() -> None:
    matches = [
        Match(track_item(), video(), Verdict.MATCHES),
        Match(track_item(), video(), Verdict.MATCHES),
        Match(track_item(), video(), Verdict.DOUBTFUL),
        Match(track_item(), None, Verdict.WITHOUT_MATCH),
    ]

    assert summary_matches(matches) == "2 coinciden · 1 dudoso · 1 sin match"


def test_el_resumen_de_un_album_limpio_no_dice_nada_de_mas() -> None:
    clean = [Match(track_item(), video(), Verdict.MATCHES) for _ in range(3)]

    assert summary_matches(clean) == "3 coinciden"


def test_la_clave_de_pista_ignora_mayusculas_y_ruido() -> None:
    a = key_track(track_item(title_text="One More Time (Official Audio)"))
    b = key_track(track_item(title_text="one more time"))

    assert a == b


@pytest.mark.parametrize("seconds_value", [0, 60, 320, 1800])
def test_la_tolerancia_no_se_rompe_en_los_extremos(seconds_value: int) -> None:
    candidate = track_item(seconds_value=320)

    cerca = match_track(candidate, [video(seconds_value=seconds_value + DURATION_TOLERANCE_S)])

    assert cerca.verdict is not Verdict.WITHOUT_MATCH