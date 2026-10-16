"""Normalizacion y limpieza de nombres, compartida entre biblioteca, descargas y catalogo."""

from __future__ import annotations

import re
import unicodedata
from difflib import SequenceMatcher

_ESPACIOS = re.compile(r"\s+")
_NO_ALFANUMERICO = re.compile(r"[^a-z0-9 ]+")
_PARENTESIS = re.compile(r"\s*\([^)]*\)")

# Palabras que aparecen en los titulos y no aportan para comparar.
NOISE = frozenset(
    {
        "the",
        "a",
        "an",
        "feat",
        "featuring",
        "ft",
        "with",
        "remix",
        "remastered",
        "version",
        "edit",
        "mix",
        "official",
        "video",
        "audio",
        "hd",
        "hq",
        "mv",
    }
)

_BRACKET_NOISE = re.compile(
    r"\s*[\(\[\{【「『][^\)\]\}】」』]*(?:"
    r"official|video|audio|lyrics|letra|4k|hd|hq|1080p|720p|60fps|"
    r"remaster|remastered|vivo|live|subtitulado|clip|\bmv\b|m/v|teaser"
    r")[^\)\]\}】」』]*[\)\]\}】」』]",
    re.IGNORECASE,
)

_UNBRACKETED_NOISE = re.compile(
    r"(?:[\s\-_|/:]+|\b)(?:"
    r"official\s+music\s+video|official\s+video|official\s+audio|official\s+mv|official\s+m/v|"
    r"music\s+video|audio\s+oficial|video\s+oficial|video\s+clip|lyric\s+video|video\s+lyric|"
    r"official\s+lyrics|lyrics\s+video|official|lyrics|letra|4k|hd|hq|1080p|720p|60fps|"
    r"remastered|remaster|en\s+vivo|live\s+performance|live|m/v|\bmv\b"
    r")[\s\-_|/:]*$",
    re.IGNORECASE,
)

_QUOTES = "'\"\u201c\u201d\u2018\u2019`\u300c\u300d\u300e\u300f"
_QUOTED_TITLE = re.compile(
    r"^(.*?)\s+['\"\u201c\u201d\u2018\u2019`\u300c\u300d\u300e\u300f]"
    r"([^'\"\u201c\u201d\u2018\u2019`\u300c\u300d\u300e\u300f]+)"
    r"['\"\u201c\u201d\u2018\u2019`\u300c\u300d\u300e\u300f]\s*$"
)



def normalize(text_value: str) -> str:
    """Minúsculas, sin acentos ni puntuación, sin palabras ruido."""
    if not text_value:
        return ""

    broken = unicodedata.normalize("NFKD", text_value)
    without_acentos = "".join(c for c in broken if not unicodedata.combining(c))
    only_letters = _NO_ALFANUMERICO.sub(" ", without_acentos.lower())
    palabras = [p for p in _ESPACIOS.split(only_letters) if p and p not in NOISE]
    return " ".join(palabras)


def similarity(a: str, b: str) -> float:
    """0 a 1 entre dos textos ya normalizados."""
    na, nb = normalize(a), normalize(b)
    if not na or not nb:
        return 0.0
    if na == nb:
        return 1.0
    return SequenceMatcher(None, na, nb).ratio()


def without_parentesis(text_value: str) -> str:
    """'One More Time (Official Audio)' -> 'One More Time'."""
    clean = _PARENTESIS.sub(" ", text_value).strip()
    return clean or text_value.strip()


def clear_title_y_artist(raw_title: str, uploader: str = "") -> tuple[str, str]:
    """Limpia el título eliminando sufijos de video de YouTube y separando 'Artista - Canción'.

    Devuelve (titulo_limpio, artista_limpio).
    """
    if not raw_title:
        return "", uploader or ""

    t = raw_title.strip()

    # 1. Limpiar ruido entre parentesis/corchetes repetidamente
    prev = None
    while prev != t:
        prev = t
        t = _BRACKET_NOISE.sub("", t).strip()

    # 2. Limpiar ruido suelto al final (sin parentesis, e.g. "Official Music Video", "M/V")
    prev = None
    while prev != t:
        prev = t
        t = _UNBRACKETED_NOISE.sub("", t).strip()

    # 3. Separar 'Artista - Titulo' si viene junto
    artist = uploader.strip()
    separated = False
    for sep in (" - ", " \u2013 ", " \u2014 ", " | "):
        if sep in t:
            chunks = t.split(sep, 1)
            possible_artist = chunks[0].strip()
            possible_title = chunks[1].strip()
            if possible_artist and possible_title:
                artist = possible_artist
                t = possible_title
                separated = True
                break

    # 4. Si no vino con guion, verificar si viene como: Artista "Titulo"
    if not separated:
        m = _QUOTED_TITLE.match(t)
        if m:
            possible_artist = m.group(1).strip()
            possible_title = m.group(2).strip()
            if possible_artist and possible_title:
                artist = possible_artist
                t = possible_title

    # 5. Quitar comillas que envuelven el titulo
    t = t.strip(_QUOTES).strip()

    # 6. Limpiar sufijos típicos de canales de YouTube
    if artist.endswith(" - Topic"):
        artist = artist[:-8].strip()
    if artist.upper().endswith("VEVO") and len(artist) > 4:
        artist = artist[:-4].strip()

    return t or raw_title.strip(), artist or uploader.strip() or "Desconocido"