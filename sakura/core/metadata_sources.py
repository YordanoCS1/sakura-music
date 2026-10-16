"""Busqueda de metadatos en catálogos publicos.

Dos fuentes, ambas sin clave ni autenticacion:

- **iTunes Search API** (Apple). La mejor: trae genero, año, numero de pista y
  portada de alta, y `collectionId` permite traer el album entero en una sola
  consulta, que es lo que permite rellenar la biblioteca de un album de una vez.
- **Deezer** complementa iTunes cuando la búsqueda automática está activa.

Se eligio NO usar MusicBrainz: exige un User-Agent propio, tiene limite de una
peticion por segundo y la portada viene de otro servicio (Cover Art Archive), lo
que suma latencia a cambio de poco.

Las funciones usan `urllib` y son bloqueantes a proposito: quien las llama lo
hace desde un hilo (ver `ui/services/metadata_search.py`).
"""

from __future__ import annotations

import json
import re
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from difflib import get_close_matches
from itertools import pairwise

from . import text

USER_AGENT = "SakuraMusic/0.1"
TIMEOUT = 12

ITUNES_SEARCH = "https://itunes.apple.com/search"
ITUNES_LOOKUP = "https://itunes.apple.com/lookup"
DEEZER_SEARCH = "https://api.deezer.com/search"
DEEZER_ALBUM = "https://api.deezer.com/album"

# iTunes guarda la portada con el tamaño en la URL: 100x100 -> 600x600.
ITUNES_COVER_SIZES = ("100x100", "300x300", "600x600")

MAX_ARTWORK_BYTES = 8 * 1024 * 1024


class SourceError(Exception):
    """La API fallo o no se pudo interpretar."""


@dataclass(slots=True)
class Candidate:
    """Un resultado de busqueda, ya normalizado entre las distintas fuentes."""

    source: str
    title: str = ""
    artist: str = ""
    album: str = ""
    albumartist: str = ""
    year: str = ""
    genre: str = ""
    track_number: str = ""
    track_total: int = 0
    duration_ms: int = 0
    cover_url: str = ""
    album_id: str = ""

    @property
    def duration_text(self) -> str:
        if not self.duration_ms:
            return ""
        seconds_value = self.duration_ms // 1000
        return f"{seconds_value // 60}:{seconds_value % 60:02d}"

    @property
    def subtitle(self) -> str:
        """Linea secundaria para la lista de resultados."""
        chunks = [p for p in (self.artist, self.year, self.genre) if p]
        if self.duration_text:
            chunks.append(self.duration_text)
        return " · ".join(chunks)

    def to_tags(self) -> dict[str, str]:
        """Campos que se pueden escribir en el archivo."""
        return {
            "title": self.title,
            "artist": self.artist,
            "album": self.album,
            "albumartist": self.albumartist or self.artist,
            "year": self.year,
            "genre": self.genre,
            "track_number": self.track_number,
        }


@dataclass(slots=True)
class AlbumEntry:
    """Un album de un artista, para elegir cual traer.

    No es una pista: no tiene titulo propio ni numero. Solo lo necesario para
    mostrar la fila y pedir el album entero despues.
    """

    album_id: str
    title: str
    artist: str = ""
    year: str = ""
    genre: str = ""
    track_total: int = 0
    cover_url: str = ""

    @property
    def year_label(self) -> str:
        return self.year or "—"

    @property
    def tracks_label(self) -> str:
        if not self.track_total:
            return "—"
        return f"{self.track_total} pista{'s' if self.track_total != 1 else ''}"

    @property
    def subtitle(self) -> str:
        chunks = [p for p in (self.year, self.genre) if p]
        if self.track_total:
            chunks.append(self.tracks_label)
        return " · ".join(chunks)


@dataclass(slots=True)
class ArtistEntry:
    """Un artista encontrado en el catalogo."""

    artist_id: str
    name: str
    genre: str = ""


# --- URLs --------------------------------------------------------------------
# Viven aca para que el script que graba los fixtures use exactamente las mismas
# que usa la app: si divergen, los fixtures mienten.


def itunes_search_url(query: str, limit: int = 20) -> str:
    params = urllib.parse.urlencode(
        {"term": query, "entity": "song", "limit": min(200, max(1, limit)), "media": "music"}
    )
    return f"{ITUNES_SEARCH}?{params}"


def itunes_artist_search_url(query: str, limit: int = 10) -> str:
    params = urllib.parse.urlencode(
        {
            "term": query,
            "entity": "musicArtist",
            "limit": min(200, max(1, limit)),
            "media": "music",
        }
    )
    return f"{ITUNES_SEARCH}?{params}"


def itunes_artist_tracks_url(artist_id: str | int) -> str:
    params = urllib.parse.urlencode(
        {"id": str(artist_id), "entity": "song", "limit": 200}
    )
    return f"{ITUNES_LOOKUP}?{params}"


def itunes_album_url(collection_id: str | int) -> str:
    params = urllib.parse.urlencode({"id": str(collection_id), "entity": "song"})
    return f"{ITUNES_LOOKUP}?{params}"


def itunes_artist_albums_url(artist_id: str | int, limit: int = 100) -> str:
    """Los albums de un artista.

    El `lookup` de iTunes devuelve las collections cuando se pide `entity=album`.
    Es la unica via publica para listar una discografia sin conocer de antemano
    los `collectionId` de cada disco.
    """
    params = urllib.parse.urlencode(
        {"id": str(artist_id), "entity": "album", "limit": max(1, min(200, limit))}
    )
    return f"{ITUNES_LOOKUP}?{params}"


def deezer_search_url(query: str, limit: int = 20) -> str:
    params = urllib.parse.urlencode({"q": query, "limit": max(1, limit)})
    return f"{DEEZER_SEARCH}?{params}"


# Cuantos resultados pide iTunes por consulta. Es mayor que el limite pedido
# porque despues se filtran duplicados y versiones, y el ranking ordena: pedir
# exactamente `limit` y descartar al final deja menos resultados de los utiles.
ITUNES_FETCH = 50

# Cuantos artistas se consultan como plan B. Tres es suficiente para los casos
# reales (alias, collaboration, nombre coreano) y acota el gasto de peticiones.
ITUNES_MAX_ARTIST_LOOKUPS = 3


def _search_variants(query: str) -> list[str]:
    """Expande títulos con alias romanizados, sin repetir la misma consulta."""
    original = query.strip()
    variants = [original] if original else []
    aliases = re.findall(r"[\(\[]([^\)\]]+)[\)\]]", original)
    outside = re.sub(r"[\(\[][^)\]]*[\)\]]", " ", original)
    outside = re.sub(r"[^\x00-\x7f]+", " ", outside)
    outside = " ".join(outside.split())
    latin_parts = [
        part.strip()
        for part in (*aliases, outside)
        if re.search(r"[A-Za-z]", part)
    ]
    expanded = " ".join(latin_parts).strip()
    if expanded and expanded.casefold() not in {value.casefold() for value in variants}:
        variants.append(expanded)
    return variants


def _artist_from_query(query: str) -> str:
    """Toma el texto exterior a un alias entre paréntesis como artista."""
    if not re.search(r"[\(\[][^)\]]+[\)\]]", query):
        return ""
    outside = re.sub(r"[\(\[][^)\]]*[\)\]]", " ", query)
    outside = re.sub(r"[^\x00-\x7f]+", " ", outside)
    return " ".join(outside.split())


def _candidate_rank(candidate: Candidate, query: str) -> tuple[int, int, int]:
    """Prioriza coincidencias del título/artista y penaliza versiones karaoke."""
    tokens = set()
    for variant in _search_variants(query):
        tokens.update(normalize(variant).split())
    title_tokens = set(normalize(candidate.title).split())
    artist_tokens = set(normalize(candidate.artist).split())
    title_matches = len(tokens & title_tokens)
    artist_matches = len(tokens & artist_tokens)
    version_text = normalize(f"{candidate.title} {candidate.album}")
    instrumental = any(
        word in version_text
        for word in ("karaoke", "instrumental", "backing track", "tribute", "cover version")
    )
    return (title_matches * 2 + artist_matches * 3 - (8 if instrumental else 0),
            title_matches, artist_matches)


def rank_candidates(candidates: list[Candidate], query: str) -> list[Candidate]:
    """Ordena coincidencias, dejando versiones karaoke/instrumentales al final."""
    return sorted(
        candidates,
        key=lambda candidate: _candidate_rank(candidate, query),
        reverse=True,
    )


# --- consultas ---------------------------------------------------------------


def _request(url: str, timeout: int = TIMEOUT) -> dict:
    peticion = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(peticion, timeout=timeout) as response:
            body = response.read()
    except urllib.error.HTTPError as exc:
        raise SourceError(f"El servidor respondió {exc.code}") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        raise SourceError(f"No se pudo conectar: {exc}") from exc

    try:
        return json.loads(body.decode("utf-8"))
    except (ValueError, UnicodeDecodeError) as exc:
        raise SourceError("La respuesta no era JSON válido") from exc


def search_itunes(
    query: str, limit: int = 20, *, artist_query: str = ""
) -> list[Candidate]:
    """Busca canciones en el catalogo de iTunes."""
    variants = _search_variants(query)
    if not variants:
        return []

    artist_name = artist_query.strip() or _artist_from_query(query)
    if artist_name:
        artist_tokens = set(normalize(artist_name).split())
        query_tokens = set(normalize(query).split())
        if artist_tokens.issubset(query_tokens):
            searches = variants
        else:
            searches = [f"{text_value} {artist_name}".strip() for text_value in variants]
    else:
        searches = variants
    searches = list(dict.fromkeys(searches))

    results: dict[tuple[str, str, str], Candidate] = {}
    errors: list[SourceError] = []
    # Se cuentan solo las peticiones que se llegan a lanzar. Antes se inicialaba
    # con el numero de consultas y se iba sumando en el bucle de artistas, asi que
    # una busqueda de artista fallida hacia que `failures_count == requests_count`
    # mas de una vez y una excepcion podia quedar sin.reportar.
    requests_count = 0
    failures_count = 0
    for text_value in searches:
        requests_count += 1
        try:
            data = _request(itunes_search_url(text_value, ITUNES_FETCH))
        except SourceError as exc:
            errors.append(exc)
            failures_count += 1
            continue
        for item in data.get("results", []):
            candidate = _candidate_itunes(item)
            if candidate is not None:
                key = (
                    normalize(candidate.title),
                    normalize(candidate.artist),
                    normalize(candidate.album),
                )
                results.setdefault(key, candidate)

    if artist_name:
        requests_count += 1
        try:
            data_artist = _request(itunes_artist_search_url(artist_name, 10))
        except SourceError as exc:
            errors.append(exc)
            failures_count += 1
        else:
            artists = [
                item
                for item in data_artist.get("results", [])
                if item.get("artistId") is not None
            ]
            # iTunes ranks artist matches usefully; a few lookups find catalog
            # tracks that its free-text song endpoint omits.
            for item in artists[:ITUNES_MAX_ARTIST_LOOKUPS]:
                requests_count += 1
                try:
                    track_items = _request(itunes_artist_tracks_url(item["artistId"]))
                except SourceError as exc:
                    errors.append(exc)
                    failures_count += 1
                    continue
                for track_item in track_items.get("results", []):
                    if track_item.get("wrapperType") != "track":
                        continue
                    candidate = _candidate_itunes(track_item)
                    if candidate is not None:
                        key = (
                            normalize(candidate.title),
                            normalize(candidate.artist),
                            normalize(candidate.album),
                        )
                        results.setdefault(key, candidate)

    if errors and failures_count == requests_count:
        raise errors[0]
    sort_by = f"{query} {artist_name}".strip()
    return rank_candidates(list(results.values()), sort_by)[: max(1, limit)]


def itunes_album(collection_id: str | int) -> list[Candidate]:
    """Trae todas las pistas de un album por su `collectionId`."""
    id_text = str(collection_id).strip()
    if not id_text:
        return []

    data = _request(itunes_album_url(id_text))

    track_items = []
    for item in data.get("results", []):
        if item.get("wrapperType") != "track":
            continue
        candidate = _candidate_itunes(item)
        if candidate is not None:
            track_items.append(candidate)
    return track_items


def search_artists(query: str, limit: int = 10) -> list[ArtistEntry]:
    """Busca artistas por nombre."""
    text_value = query.strip()
    if not text_value:
        return []

    data = _request(itunes_artist_search_url(text_value, limit))

    artists: list[ArtistEntry] = []
    seen: set[str] = set()
    for item in data.get("results", []):
        artist_id = item.get("artistId")
        name_text = (item.get("artistName") or "").strip()
        if artist_id is None or not name_text:
            continue
        key_name = normalize(name_text)
        if key_name in seen:
            continue
        seen.add(key_name)
        artists.append(
            ArtistEntry(
                artist_id=str(artist_id),
                name=name_text,
                genre=(item.get("primaryGenreName") or "").strip(),
            )
        )
    return artists[: max(1, limit)]


def artist_albums(artist_id: str | int, limit: int = 100) -> list[AlbumEntry]:
    """Los albums de un artista, del mas nuevo al mas viejo.

    Trae tambien los singles y los EPs: Ask, un catálogo de 41 entradas para
    Daft Punk son 9 álbumes y el resto son remixes de una pista. No se filtran
    acá porque cual es un álbum y cual un single lo decide el oido, no el
    nombre; quien quiera solo los discos completos usa `solo_albums`.
    """
    id_text = str(artist_id).strip()
    if not id_text:
        return []

    data = _request(itunes_artist_albums_url(id_text, limit))

    albums: dict[str, AlbumEntry] = {}
    for item in data.get("results", []):
        if item.get("wrapperType") != "collection":
            continue
        album_id = str(item.get("collectionId") or "")
        name_text = (item.get("collectionName") or "").strip()
        if not album_id or not name_text:
            continue

        key_name = normalize(name_text)
        existing = albums.get(key_name)
        date = (item.get("releaseDate") or "")[:4]
        # La misma edicion puede venir dos veces. Se queda la que tiene ano, que
        # es la que ordena bien.
        if existing is not None and existing.year:
            continue
        albums[key_name] = AlbumEntry(
            album_id=album_id,
            title=name_text,
            artist=(item.get("artistName") or "").strip(),
            year=date,
            genre=(item.get("primaryGenreName") or "").strip(),
            track_total=int(item.get("trackCount") or 0),
            cover_url=_cover_itunes(item.get("artworkUrl100")),
        )

    return sorted(albums.values(), key=lambda a: (a.year or "0", a.title), reverse=True)


# Palabras con las que iTunes nombra un single o un EP. Un album de verdade
# nunca las lleva en el titulo.
_MARK_SINGLE = (" - single", " - ep")
_MARK_REMIX = ("remix", "remixes", "edit)", "(edit", "radio edit", "remaster")


def only_albums(albums: list[AlbumEntry]) -> list[AlbumEntry]:
    """Filtra losQue son un disco y no un single, un EP o un remix suelto."""
    return [album for album in albums if _looks_like_album(album)]


def _looks_like_album(album: AlbumEntry) -> bool:
    title_text = album.title.lower()
    if any(mark in title_text for mark in _MARK_SINGLE):
        return False
    if any(mark in title_text for mark in _MARK_REMIX):
        return False
    return album.track_total > 3


def search_deezer(query: str, limit: int = 20) -> list[Candidate]:
    """Busca canciones en el catálogo de Deezer."""
    variants = _search_variants(query)
    if not variants:
        return []

    results: dict[tuple[str, str, str], Candidate] = {}
    errors: list[SourceError] = []
    for text_value in variants:
        try:
            data = _request(deezer_search_url(text_value, limit))
        except SourceError as exc:
            errors.append(exc)
            continue

        if "error" in data:
            errors.append(SourceError(str(data["error"].get("message", "error desconocido"))))
            continue
        for item in data.get("data", []):
            candidate = _candidate_deezer(item)
            if candidate is not None:
                key = (
                    normalize(candidate.title),
                    normalize(candidate.artist),
                    normalize(candidate.album),
                )
                results.setdefault(key, candidate)
    if errors and len(errors) == len(variants):
        raise errors[0]
    return rank_candidates(list(results.values()), query)


def search(query: str, limit: int = 20) -> list[Candidate]:
    """Busca en iTunes y, si no encuentra nada, cae a Deezer."""
    results = search_itunes(query, limit)
    if results:
        return results

    try:
        return search_deezer(query, limit)
    except SourceError:
        return []


# --- normalizacion -----------------------------------------------------------


def _candidate_itunes(item: dict) -> Candidate | None:
    title_text = (item.get("trackName") or "").strip()
    if not title_text:
        return None

    date = (item.get("releaseDate") or "")[:4]
    number = item.get("trackNumber")
    total = item.get("trackCount") or 0

    return Candidate(
        source="itunes",
        title=title_text,
        artist=(item.get("artistName") or "").strip(),
        album=(item.get("collectionName") or "").strip(),
        albumartist=(item.get("artistName") or "").strip(),
        year=date if date.isdigit() else "",
        genre=(item.get("primaryGenreName") or "").strip(),
        track_number=str(number) if number else "",
        track_total=int(total or 0),
        duration_ms=int(item.get("trackTimeMillis") or 0),
        cover_url=_cover_itunes(item.get("artworkUrl100")),
        album_id=str(item.get("collectionId") or ""),
    )


def _candidate_deezer(item: dict) -> Candidate | None:
    title_text = (item.get("title") or "").strip()
    if not title_text:
        return None

    album = item.get("album") or {}
    artist_name = (item.get("artist") or {}).get("name", "")

    return Candidate(
        source="deezer",
        title=title_text,
        artist=artist_name.strip(),
        album=(album.get("title") or "").strip(),
        albumartist=artist_name.strip(),
        year="",
        genre="",
        track_number=str(item.get("track_position") or ""),
        track_total=int(album.get("track_total") or 0),
        duration_ms=int(item.get("duration") or 0) * 1000,
        cover_url=album.get("cover_xl") or album.get("cover_medium") or "",
        album_id=str(album.get("id") or ""),
    )


def _cover_itunes(url: str | None) -> str:
    """Pide la version grande de la portada de iTunes.

    iTunes mete el tamaño en el path (`/100x100bb.jpg`), asi que basta con
    encadenar las sustituciones de menor a mayor.
    """
    if not url:
        return ""
    for small, big in pairwise(ITUNES_COVER_SIZES):
        url = url.replace(f"/{small}", f"/{big}")
    return url


def download_cover(url: str, timeout: int = TIMEOUT) -> tuple[bytes, str] | None:
    """Descarga una portada. Devuelve (bytes, mime) o None si no se puede."""
    if not url or not url.lower().startswith("https://"):
        return None

    peticion = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(peticion, timeout=timeout) as response:
            data = response.read(MAX_ARTWORK_BYTES + 1)
            type = response.headers.get("Content-Type", "")
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, OSError):
        return None

    if not data or len(data) > MAX_ARTWORK_BYTES:
        return None

    mime = type.split(";")[0].strip() or _mime_by_extension(url)
    if mime not in ("image/jpeg", "image/png", "image/webp", "image/bmp"):
        return None
    return data, mime


_MIMES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}


def _mime_by_extension(url: str) -> str:
    clean = url.split("?")[0].lower()
    for extension, mime in _MIMES.items():
        if clean.endswith(extension):
            return mime
    return "image/jpeg"


# --- Matching por titulo -----------------------------------------------------
# La normalizacion vive en `sakura.core.text` porque la biblioteca la necesita
# para emparejar tambien sus propias letras y portadas.


def normalize(text_value: str) -> str:
    """Minúsculas, sin acentos ni puntuación, para comparar titulos."""
    return text.normalize(text_value)


def similarity(a: str, b: str) -> float:
    """0 a 1. Compara titulos normalizados."""
    return text.similarity(a, b)


def match_by_title(
    candidates: list[Candidate],
    titles: list[str],
    minimum: float = 0.72,
) -> dict[str, Candidate]:
    """Empareja un candidato por cada titulo.

    Devuelve `titulo original -> candidato`. Primero busca coincidencia exacta
    sobre el titulo normalizado y, para lo que sobra, usa similitud difusa.
    """
    if not candidates or not titles:
        return {}

    by_normalizado: dict[str, Candidate] = {}
    for candidate in candidates:
        key_name = normalize(candidate.title)
        # El primero gana: iTunes devuelve ediciones y remixes mezclados.
        by_normalizado.setdefault(key_name, candidate)

    free = dict(by_normalizado)
    pares: dict[str, Candidate] = {}

    for title_text in titles:
        key_name = normalize(title_text)
        candidate = free.pop(key_name, None)
        if candidate is None and key_name:
            targets = get_close_matches(key_name, list(free), n=1, cutoff=minimum)
            if targets:
                candidate = free.pop(targets[0])
        if candidate is not None:
            pares[title_text] = candidate

    return pares