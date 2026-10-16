"""Prueba que APIs de metadata funcionan sin clave y sin autenticacion."""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request

TIMEOUT = 12


def request(url: str, headers: dict[str, str] | None = None) -> dict | list:
    peticion = urllib.request.Request(url, headers=headers or {"User-Agent": "SakuraMusic/0.1"})
    with urllib.request.urlopen(peticion, timeout=TIMEOUT) as response:
        return json.loads(response.read().decode("utf-8"))


def test_itunes(query: str) -> None:
    url = (
        "https://itunes.apple.com/search?"
        + urllib.parse.urlencode(
            {"term": query, "entity": "song", "limit": 3, "media": "music"}
        )
    )
    data = request(url)
    results = data.get("results", [])
    print(f"iTunes: {data.get('resultCount')} resultados para {query!r}")
    if not results:
        return
    first = results[0]
    print(f"  título   : {first.get('trackName')}")
    print(f"  artista  : {first.get('artistName')}")
    print(f"  álbum    : {first.get('collectionName')}")
    print(f"  año      : {str(first.get('releaseDate'))[:4]}")
    print(f"  género   : {first.get('primaryGenreName')}")
    print(f"  duración : {first.get('trackTimeMillis')} ms")
    print(f"  n° pista : {first.get('trackNumber')} de {first.get('trackCount')}")
    print(f"  portada  : {first.get('artworkUrl100')}")
    big = (first.get("artworkUrl100") or "").replace("100x100", "600x600")
    print(f"  hd       : {big}")
    try:
        with urllib.request.urlopen(big, timeout=TIMEOUT) as r:
            print(f"  portada hd baja: {len(r.read())} bytes")
    except Exception as exc:
        print(f"  portada hd fallo: {exc}")
    print(f"  collectionId: {first.get('collectionId')}")


def test_lookup_album(album_id: int) -> None:
    url = f"https://itunes.apple.com/lookup?id={album_id}&entity=song"
    data = request(url)
    track_items = [d for d in data.get("results", []) if d.get("wrapperType") == "track"]
    print(f"lookup album {album_id}: {len(track_items)} pistas del álbum")
    if track_items:
        print(f"  primera: {track_items[0].get('trackNumber')} {track_items[0].get('trackName')}")


def test_deezer(query: str) -> None:
    url = "https://api.deezer.com/search?" + urllib.parse.urlencode({"q": query, "limit": 3})
    data = request(url)
    results = data.get("data", [])
    print(f"\nDeezer: {data.get('total')} resultados para {query!r}")
    if not results:
        print(f"  error: {data.get('error')}")
        return
    first = results[0]
    album = first.get("album", {})
    print(f"  título   : {first.get('title')}")
    print(f"  artista  : {first.get('artist', {}).get('name')}")
    print(f"  álbum    : {album.get('title')}")
    print(f"  nº pista : {first.get('track_position')}")
    print(f"  portada  : {album.get('cover_xl')}")
    print(f"  duración : {first.get('duration')} s")


def test_musicbrainz(query: str) -> None:
    url = (
        "https://musicbrainz.org/ws/2/recording?"
        + urllib.parse.urlencode({"query": query, "fmt": "json", "limit": 2})
    )
    try:
        data = request(url, {"User-Agent": "SakuraMusic/0.1 (https://example.org)"})
        registros = data.get("recordings", [])
        print(f"\nMusicBrainz: {len(registros)} resultados para {query!r}")
        if registros:
            print(f"  título: {registros[0].get('title')}")
            print(f"  fecha : {registros[0].get('first-release-date', '')[:4]}")
    except Exception as exc:
        print(f"\nMusicBrainz fallo: {exc}")


if __name__ == "__main__":
    query = " ".join(sys.argv[1:]) or "daft punk one more time"
    print(f"consulta: {query!r}\n")

    for name_text, funcion in (
        ("iTunes", test_itunes),
        ("Deezer", test_deezer),
        ("MusicBrainz", test_musicbrainz),
    ):
        try:
            funcion(query)
        except Exception as exc:
            print(f"\n{name_text} fallo: {type(exc).__name__}: {exc}")
        print()