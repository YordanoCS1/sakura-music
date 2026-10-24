"""Búsqueda de letras y escritura del archivo lateral.

La letra puede venir de un `.lrc`/`.txt` junto al audio, de un tag ya
incrustado o de LRCLIB. El archivo lateral se conserva como respaldo editable.
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, replace
from pathlib import Path

from . import text
from .library import UNKNOWN, Track, find_lyrics, parse_lrc
from .metadata import MetadataError, read_embedded_lyrics, write_lyrics

LRCLIB_SEARCH = "https://lrclib.net/api/search"
USER_AGENT = "SakuraMusic/0.1 (https://github.com/sakura-music)"
TIMEOUT = 12


class LyricsSourceError(Exception):
    """La búsqueda de letras falló o devolvió datos inválidos."""


@dataclass(slots=True)
class LyricsCandidate:
    """Una letra encontrada en LRCLIB."""

    title: str
    artist: str
    album: str
    duration: float
    synced: str = ""
    plain: str = ""
    instrumental: bool = False

    @property
    def has_synced(self) -> bool:
        return bool(self.synced.strip())

    @property
    def text(self) -> str:
        return self.synced.strip() or self.plain.strip()


@dataclass(slots=True)
class LyricsOutcome:
    """Resultado de procesar una pista."""

    track: Track
    status: str
    source: str = ""
    sidecar: Path | None = None
    message: str = ""


@dataclass(slots=True)
class LyricsReport:
    """Resumen de un lote de letras."""

    outcomes: list[LyricsOutcome]

    @property
    def embedded(self) -> int:
        return sum(1 for item in self.outcomes if item.status == "embedded")

    @property
    def downloaded(self) -> int:
        return sum(1 for item in self.outcomes if item.status == "downloaded")

    @property
    def already(self) -> int:
        return sum(1 for item in self.outcomes if item.status == "already")

    @property
    def not_found(self) -> int:
        return sum(1 for item in self.outcomes if item.status == "not_found")

    @property
    def errors(self) -> int:
        return sum(1 for item in self.outcomes if item.status == "error")

    @property
    def summary(self) -> str:
        parts: list[str] = []
        total = self.embedded + self.downloaded
        if total:
            detail = f" ({self.downloaded} desde internet)" if self.downloaded else ""
            parts.append(f"{_plural(total, 'letra incrustada', 'letras incrustadas')}{detail}")
        if self.already:
            parts.append(
                f"{self.already} ya tenía{'n' if self.already != 1 else ''} letra"
            )
        if self.not_found:
            parts.append(
                f"{_plural(self.not_found, 'sin resultado', 'sin resultado')}"
            )
        if self.errors:
            parts.append(_plural(self.errors, "error", "errores"))
        return " · ".join(parts) or "No se procesaron pistas"


def _plural(count: int, singular: str, plural: str) -> str:
    return f"{count} {singular if count == 1 else plural}"


def _candidate_from_item(item: dict) -> LyricsCandidate | None:
    title = str(item.get("trackName") or "").strip()
    if not title:
        return None

    try:
        duration = float(item.get("duration") or 0.0)
    except (TypeError, ValueError):
        duration = 0.0

    return LyricsCandidate(
        title=title,
        artist=str(item.get("artistName") or "").strip(),
        album=str(item.get("albumName") or "").strip(),
        duration=max(0.0, duration),
        synced=str(item.get("syncedLyrics") or ""),
        plain=str(item.get("plainLyrics") or ""),
        instrumental=bool(item.get("instrumental")),
    )


def _request_json(url: str) -> object:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
            body = response.read()
    except urllib.error.HTTPError as exc:
        raise LyricsSourceError(f"El servidor respondió {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise LyricsSourceError(f"No se pudo conectar: {exc}") from exc

    try:
        return json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise LyricsSourceError("La respuesta no era JSON válido") from exc


def search_lrclib(
    title: str,
    artist: str = "",
    album: str = "",
    duration: float | None = None,
    limit: int = 8,
) -> list[LyricsCandidate]:
    """Busca letras en LRCLIB y las ordena por parecido con la pista."""
    track_name = title.strip()
    if not track_name:
        return []

    params = {"track_name": track_name}
    if artist.strip():
        params["artist_name"] = artist.strip()
    if album.strip():
        params["album_name"] = album.strip()

    data = _request_json(f"{LRCLIB_SEARCH}?{urllib.parse.urlencode(params)}")
    if isinstance(data, dict):
        data = [data]
    if not isinstance(data, list):
        raise LyricsSourceError("La respuesta no era una lista de letras")

    candidates = [
        candidate
        for item in data
        if isinstance(item, dict)
        for candidate in (_candidate_from_item(item),)
        if candidate is not None and candidate.text and not candidate.instrumental
    ]
    ranked = rank_lyrics(candidates, track_name, artist, duration)
    return ranked[: max(1, limit)]


def rank_lyrics(
    candidates: list[LyricsCandidate],
    title: str,
    artist: str = "",
    duration: float | None = None,
) -> list[LyricsCandidate]:
    """Ordena las coincidencias y descarta las que no se parecen al título."""
    scored: list[tuple[float, LyricsCandidate]] = []
    for candidate in candidates:
        title_score = text.similarity(candidate.title, title)
        if title_score < 0.65:
            continue

        score = title_score * 100.0
        if artist:
            score += text.similarity(candidate.artist, artist) * 25.0
        if candidate.has_synced:
            score += 12.0
        if duration and candidate.duration:
            difference = abs(duration - candidate.duration)
            if difference <= 2:
                score += 12.0
            elif difference <= 5:
                score += 6.0
            else:
                score -= min(20.0, difference)
        scored.append((score, candidate))

    scored.sort(key=lambda pair: pair[0], reverse=True)
    return [candidate for _score, candidate in scored]


def _read_lyrics_file(path: Path) -> str:
    try:
        raw = path.read_bytes()
    except OSError:
        return ""

    for encoding in ("utf-8-sig", "utf-16", "cp1252", "utf-8"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return raw.decode("utf-8", errors="replace")


def _save_sidecar(audio_path: Path, lyrics: str, synced: bool) -> Path:
    suffix = ".lrc" if synced else ".txt"
    target = audio_path.with_suffix(suffix)
    target.write_text(lyrics.strip() + "\n", encoding="utf-8")
    return target


def _artist_for_search(track: Track) -> str:
    return "" if track.artist.strip() in ("", UNKNOWN) else track.artist.strip()


def _album_for_search(track: Track) -> str:
    return "" if track.album.strip() in ("", UNKNOWN) else track.album.strip()


def embed_track_lyrics(track: Track, allow_online: bool = True) -> LyricsOutcome:
    """Incrusta la letra de una pista y conserva el archivo lateral."""
    sidecar = track.lyrics_path
    if sidecar is None:
        sidecar = find_lyrics(track.path)

    source = "sidecar"
    status = "embedded"
    lyrics = ""

    if sidecar is not None and sidecar.is_file():
        lyrics = _read_lyrics_file(sidecar).strip()
        if not lyrics:
            return LyricsOutcome(
                track=track,
                status="error",
                sidecar=sidecar,
                message="El archivo de letra está vacío",
            )
    else:
        embedded = read_embedded_lyrics(track.path).strip()
        if embedded:
            synced = bool(parse_lrc(embedded))
            try:
                sidecar = _save_sidecar(track.path, embedded, synced)
            except OSError as exc:
                return LyricsOutcome(
                    track=track,
                    status="error",
                    source="embedded",
                    message=f"No se pudo guardar la letra: {exc}",
                )
            return LyricsOutcome(
                track=replace(track, lyrics_path=sidecar),
                status="already",
                source="embedded",
                sidecar=sidecar,
                message="Ya tenía letra incrustada",
            )

        if not allow_online:
            return LyricsOutcome(
                track=track,
                status="not_found",
                message="No hay un archivo de letra junto al audio",
            )

        try:
            candidate = _search_for_track(track)
        except LyricsSourceError as exc:
            return LyricsOutcome(track=track, status="error", message=str(exc))

        if candidate is None:
            return LyricsOutcome(
                track=track,
                status="not_found",
                message="No se encontró una letra que coincida",
            )

        lyrics = candidate.text
        source = "lrclib"
        status = "downloaded"
        try:
            sidecar = _save_sidecar(track.path, lyrics, candidate.has_synced)
        except OSError as exc:
            return LyricsOutcome(
                track=track,
                status="error",
                source=source,
                message=f"No se pudo guardar la letra: {exc}",
            )

    try:
        write_lyrics(track.path, lyrics)
    except MetadataError as exc:
        return LyricsOutcome(
            track=track,
            status="error",
            source=source,
            sidecar=sidecar,
            message=str(exc),
        )

    return LyricsOutcome(
        track=replace(track, lyrics_path=sidecar),
        status=status,
        source=source,
        sidecar=sidecar,
    )


def _search_for_track(track: Track) -> LyricsCandidate | None:
    artist = _artist_for_search(track)
    album = _album_for_search(track)
    duration = track.duration or None

    try:
        # La consulta exacta por álbum y duración es la más fiable cuando los
        # tags ya están completos; evita confundir ediciones o remixes.
        if artist and album and duration:
            params = {
                "track_name": track.title,
                "artist_name": artist,
                "album_name": album,
                "duration": round(duration),
            }
            request = urllib.request.Request(
                f"{LRCLIB_SEARCH}?{urllib.parse.urlencode(params)}",
                headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            )
            with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
                data = json.loads(response.read().decode("utf-8"))
            if isinstance(data, dict):
                data = [data]
            candidates = [
                candidate
                for item in data
                if isinstance(item, dict)
                for candidate in (_candidate_from_item(item),)
                if candidate is not None and candidate.text and not candidate.instrumental
            ]
            ranked = rank_lyrics(candidates, track.title, artist, duration)
            if ranked:
                return ranked[0]
    except (LyricsSourceError, OSError, ValueError, KeyError):
        pass

    found = search_lrclib(
        track.title,
        artist,
        album,
        duration,
        limit=1,
    )
    return found[0] if found else None
