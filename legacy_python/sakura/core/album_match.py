"""Emparejar las pistas de un album del catalogo con videos de YouTube.

El catalogo (iTunes o Deezer) sabe cual es la pista correcta: titulo, duracion,
numero y album. YouTube no lo sabe. Este modulo hace el cruce y, sobre todo,
se dice cuando no esta seguro.

Por que hace falta revisar antes de descargar: los tags que se escriben salen
del catalogo, asi que quedan correctos elija el video que elija. Un video
equivocado deja el archivo con metadata impecable y el audio de otra cancion,
y eso no se detecta nunca despues.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import StrEnum

from .metadata_sources import Candidate
from .models import SearchResult
from .text import clear_title_y_artist, similarity

# Margen de duracion para dar por buena una coincidencia. Un video de la pista
# difiere unos segundos (intro, silencio final); un radio de una hora no.
DURATION_TOLERANCE_S = 12

# A partir de esta diferencia la pista se considera dudosa aunque el titulo
# calce: suele ser una version extendida, una remix o un video de otro tema.
DURATION_DOUBTFUL_S = 25

# Duracion maxima que se considera una pista y no una compilacion o un stream.
MAX_DURATION_S = 15 * 60

# Palabras que delatan que el video no es la pista del album.
DESCARTES = (
    "mix",
    "mashup",
    "megamix",
    "compilation",
    "top 20",
    "top 50",
    "best of",
    "1 hour",
    "one hour",
    "hours",
    "radio",
    "live",
    "cover band",
    "tribute",
    "karaoke",
    "instrumental",
    "sped up",
    "slowed",
    "nightcore",
    "reaction",
    "review",
    "playlist",
)


class Verdict(StrEnum):
    """Que tan segura es la eleccion de video para una pista."""

    MATCHES = "coincide"
    DOUBTFUL = "dudoso"
    WITHOUT_MATCH = "sin match"


@dataclass(frozen=True, slots=True)
class Match:
    """La eleccion de video para una pista del album, con su justificacion."""

    candidate: Candidate
    video: SearchResult | None
    verdict: Verdict
    reason: str = ""
    alternativas: tuple[SearchResult, ...] = ()

    @property
    def is_bueno(self) -> bool:
        return self.verdict is not Verdict.WITHOUT_MATCH

    @property
    def title_track(self) -> str:
        return self.candidate.title

    @property
    def artist_track(self) -> str:
        return self.candidate.artist


@dataclass(frozen=True, slots=True)
class Score:
    """Como de bueno es un video para una pista, y por que se dice eso."""

    total: int
    reason: str
    # Si el video parece ser la misma cancion y no solo un video de la misma
    # duracion. Dos temas distintos pueden durar lo mismo.
    same_theme: bool


def seconds_value(candidate: Candidate) -> int:
    return max(0, candidate.duration_ms // 1000)


def _is_compilation(result: SearchResult) -> bool:
    """Si el video es una compilacion, un mix o un directo."""
    text_value = f"{result.title} {result.uploader}".lower()
    if any(palabra in text_value for palabra in DESCARTES):
        return True
    # Tres horas de audio en un solo archivo no es una pista de un album.
    return result.duration > MAX_DURATION_S * 4


def puntuar(candidate: Candidate, video: SearchResult) -> Score:
    """Puntaje de un video para una pista. El motivo es texto legible.

    La duracion pesa mas que el titulo: un video con el nombre exacto pero de
    tres horas no es la pista, y una pista con el titulo distinto y la duracion
    exacta casi siempre lo es. Pero la duracion sola nunca alcanza para dar por
    confirmada una eleccion, asi que `mismo_tema` va aparte.
    """
    if _is_compilation(video):
        return Score(-100, "es una compilación o un directo", False)

    expected_value = seconds_value(candidate)
    difference = abs(video.duration - expected_value)
    if expected_value and difference <= DURATION_TOLERANCE_S:
        points_duration = 100
    elif expected_value and difference <= DURATION_DOUBTFUL_S:
        points_duration = 55
    else:
        points_duration = 0

    title_video, _ = clear_title_y_artist(video.title, video.uploader)
    similar_title = similarity(candidate.title, title_video)
    points_title = int(similar_title * 60)

    points_artist = 0
    if candidate.artist and video.uploader:
        if similarity(candidate.artist, video.uploader) > 0.75:
            points_artist = 40
        elif video.uploader.endswith(" - Topic"):
            # Los canales "Topic" son el audio oficial de la discografica: es la
            # mejor fuente posible aunque el nombre no coincida con el artista.
            points_artist = 35

    total = points_duration + points_title + points_artist

    if not expected_value or not video.duration:
        reason = "sin duración para comparar"
    elif difference <= DURATION_TOLERANCE_S:
        reason = f"{video.duration_text} contra {candidate.duration_text}"
    else:
        reason = f"duración {video.duration_text} contra {candidate.duration_text}"

    if similar_title < 0.5:
        reason += f", título distinto (“{video.title}”)"

    # Confirma solo con el titulo del catalogo. El canal solo ordena: un canal
    # del artista con la duracion correcta puede ser otra cancion suya.
    return Score(total, reason, similar_title >= 0.55)


def match_track(candidate: Candidate, videos: list[SearchResult]) -> Match:
    """Elige el mejor video para una pista y explica por que."""
    if not videos:
        return Match(
            candidate=candidate,
            video=None,
            verdict=Verdict.WITHOUT_MATCH,
            reason="YouTube no devolvió resultados",
        )

    puntuados = sorted(
        ((puntuar(candidate, video), video) for video in videos),
        key=lambda par: par[0].total,
        reverse=True,
    )
    best, chosen = puntuados[0]
    alternativas = tuple(video for _, video in puntuados[1:4])

    expected_value = seconds_value(candidate)
    difference = abs(chosen.duration - expected_value)

    if best.total < 0:
        verdict = Verdict.WITHOUT_MATCH
        reason = f"ningún video sirve: el mejor era {best.reason}"
    elif (
        expected_value
        and difference <= DURATION_TOLERANCE_S
        and best.same_theme
        and best.total >= 130
    ):
        verdict = Verdict.MATCHES
    elif best.total >= 80:
        verdict = Verdict.DOUBTFUL
    else:
        verdict = Verdict.WITHOUT_MATCH
        reason = f"no hay coincidencia clara ({best.reason})"

    return Match(
        candidate=candidate,
        video=chosen if verdict is not Verdict.WITHOUT_MATCH else None,
        verdict=verdict,
        reason=best.reason if verdict is not Verdict.WITHOUT_MATCH else reason,
        alternativas=alternativas,
    )


def match_album(
    tracks_album: list[Candidate], videos_by_track: dict[str, list[SearchResult]]
) -> list[Match]:
    """Cruza todas las pistas del album.

    `videos_por_pista` viene indexado por la clave que devuelve `clave_de_pista`.
    """
    return [
        match_track(candidate, videos_by_track.get(key_track(candidate), []))
        for candidate in tracks_album
    ]


def key_track(candidate: Candidate) -> str:
    """Clave estable para guardar los resultados de una pista."""
    from .text import normalize

    return f"{normalize(candidate.artist)}|{normalize(candidate.title)}"


def summary_matches(matches: list[Match]) -> str:
    """'11 coinciden · 2 dudosos · 1 sin match' para la cabecera de la tabla."""
    match = sum(1 for m in matches if m.verdict is Verdict.MATCHES)
    doubtful = sum(1 for m in matches if m.verdict is Verdict.DOUBTFUL)
    without_match = sum(1 for m in matches if m.verdict is Verdict.WITHOUT_MATCH)

    chunks = [f"{match} coincide{'n' if match != 1 else ''}"]
    if doubtful:
        chunks.append(f"{doubtful} dudoso{'s' if doubtful != 1 else ''}")
    if without_match:
        chunks.append(f"{without_match} sin match")
    return " · ".join(chunks)