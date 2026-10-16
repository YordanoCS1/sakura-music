"""Busqueda y normalizacion de metadatos en catalogos publicos.

Los tests corren contra fixtures grabados con `scripts/grab_fixtures.py`, no
contra la red: si fallan, es por el codigo y no porque Apple este caido.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from sakura.core import metadata_sources as ms
from sakura.core.metadata_sources import Candidate, SourceError

DATA = Path(__file__).parent / "data"


def fixture(name_text: str) -> dict:
    return json.loads((DATA / f"{name_text}.json").read_text(encoding="utf-8"))


@pytest.fixture()
def monkeypatch_request(monkeypatch):
    """Sustituye la red por los fixtures."""

    def apply(name_text: str, destino):
        data = fixture(name_text)
        monkeypatch.setattr(ms, "_request", lambda *a, **k: destino(data))

    return apply


# --- normalizacion de respuestas ---------------------------------------------


def test_itunes_normaliza(monkeypatch, monkeypatch_request) -> None:
    monkeypatch_request("itunes_search", lambda d: d)
    results = ms.search_itunes("daft punk one more time")

    assert results
    first = results[0]
    assert first.source == "itunes"
    assert first.title == "One More Time"
    assert first.artist == "Daft Punk"
    assert first.album == "Discovery"
    assert first.year.isdigit()
    assert first.genre
    assert first.track_number == "1"
    assert first.album_id
    assert first.duration_ms > 0


def test_itunes_pide_portada_grande(monkeypatch, monkeypatch_request) -> None:
    monkeypatch_request("itunes_search", lambda d: d)
    cover = ms.search_itunes("daft punk")[0].cover_url

    assert "600x600" in cover, "iTunes devuelve la portada en 100x100"
    assert "100x100" not in cover


def test_itunes_album_trae_todas_las_pistas(monkeypatch, monkeypatch_request) -> None:
    monkeypatch_request("itunes_album", lambda d: d)
    track_items = ms.itunes_album("697194953")

    assert len(track_items) == 14
    assert all(p.source == "itunes" for p in track_items)
    numbers = sorted(int(p.track_number) for p in track_items if p.track_number)
    assert numbers[0] == 1
    assert max(numbers) >= 14


def test_album_vacio_ignora_el_wrapper(monkeypatch, monkeypatch_request) -> None:
    monkeypatch_request("itunes_album", lambda d: d)
    track_items = ms.itunes_album("697194953")
    assert all(p.album == "Discovery" for p in track_items)


def test_deezer_normaliza(monkeypatch, monkeypatch_request) -> None:
    monkeypatch_request("deezer_search", lambda d: d)
    results = ms.search_deezer("daft punk one more time")

    assert results
    first = results[0]
    assert first.source == "deezer"
    assert first.title
    assert first.artist
    assert first.cover_url.endswith((".jpg", ".jpeg", ".png"))


def test_itunes_sin_resultados(monkeypatch, monkeypatch_request) -> None:
    monkeypatch_request("itunes_search_sin_resultado", lambda d: d)
    assert ms.search_itunes("xyzqwerty nonexistent") == []


def test_itunes_no_pide_de_mas(monkeypatch) -> None:
    """El limite se aplica antes de pedir, no despues de descartar.

    Pedir 200 resultados y quedarse con 20 era tirar ancho de banda y tiempo
    de la API para nada.
    """
    from urllib.parse import parse_qs, urlparse

    pedidos: list[int] = []

    def response(url: str) -> dict:
        params = parse_qs(urlparse(url).query)
        pedidos.append(int(params.get("limit", ["0"])[0]))
        return {"results": []}

    monkeypatch.setattr(ms, "_request", response)
    ms.search_itunes("daft punk", limit=5)

    assert pedidos, "deberia haber consultado"
    assert all(count <= ms.ITUNES_FETCH for count in pedidos)
    assert ms.ITUNES_FETCH < 200


def test_las_peticiones_se_cuentan_todas_al_reportar_el_error(monkeypatch) -> None:
    """El conteo de fallos tiene que incluir la consulta de artista.

    Antes se inicializaba con el numero de consultas y se iba sumando en el bucle
    de artistas, asi que una excepcion podia quedar sin reportar: `failures_count`
    se comparaba contra un total que ya incluia lo que se iba a sumar despues.
    """
    llamado: list[str] = []

    def falla(url: str) -> dict:
        llamado.append(url)
        raise ms.SourceError("sin conexion")

    monkeypatch.setattr(ms, "_request", falla)

    with pytest.raises(ms.SourceError, match="sin conexion"):
        ms.search_itunes("삠삠 (BEAM BEAM) SOYEON")

    assert len(llamado) >= 2, "deberia haber consultado texto y artista"
    assert any("/search" in url for url in llamado)
    assert any("musicArtist" in url for url in llamado)


def test_un_artista_caido_no_tapa_los_resultados_de_texto(monkeypatch) -> None:
    """Si la consulta de artista falla pero el texto responde, hay resultados."""
    from urllib.parse import urlparse

    def response(url: str) -> dict:
        if "musicArtist" in url or "/lookup" in url:
            raise ms.SourceError("sin conexion")
        assert "/search" in urlparse(url).path
        return {
            "results": [
                {
                    "trackName": "BEAM BEAM",
                    "artistName": "SOYEON",
                    "collectionName": "Windy",
                    "wrapperType": "track",
                    "collectionId": 1,
                }
            ]
        }

    monkeypatch.setattr(ms, "_request", response)
    results = ms.search_itunes("BEAM BEAM", artist_query="SOYEON")

    assert [c.artist for c in results] == ["SOYEON"]


def test_las_consultas_de_artista_estan_acotadas(monkeypatch) -> None:
    """Tres artistas como plan B alcanzan; consultar mas es gastar de mas."""
    from urllib.parse import parse_qs, urlparse

    looks: list[str] = []

    def response(url: str) -> dict:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if params.get("entity") == ["musicArtist"]:
            return {
                "results": [
                    {"artistId": n, "artistName": f"Artista {n}"} for n in range(10)
                ]
            }
        if parsed.path == "/lookup":
            looks.append(str(params.get("id", [""])[0]))
            return {"results": []}
        return {"results": []}

    monkeypatch.setattr(ms, "_request", response)
    ms.search_itunes("cancion", artist_query="alguien")

    assert len(looks) == ms.ITUNES_MAX_ARTIST_LOOKUPS == 3


def test_consulta_expande_alias_romanizado_entre_parentesis(monkeypatch) -> None:
    from urllib.parse import parse_qs, urlparse

    consultas: list[tuple[str, str, str]] = []

    def response(url: str) -> dict:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        consultas.append(
            (
                parsed.path,
                params.get("entity", [""])[0],
                params.get("term", [""])[0],
            )
        )
        return {"results": []}

    monkeypatch.setattr(ms, "_request", response)
    ms.search_itunes("삠삠 (BEAM BEAM) SOYEON")

    assert ("/search", "song", "BEAM BEAM SOYEON") in consultas
    assert ("/search", "song", "삠삠 (BEAM BEAM) SOYEON") in consultas
    assert ("/search", "musicArtist", "SOYEON") in consultas


def test_itunes_lookup_por_artista_encuentra_pista_omitida_en_busqueda(monkeypatch) -> None:
    from urllib.parse import parse_qs, urlparse

    karaoke = {
        "trackName": "Beam Beam (Originally Performed by Jeon So-yeon) [Instrumental Version]",
        "artistName": "Backing Business",
        "collectionName": "Pristine Karaoke, Vol. 43",
        "wrapperType": "track",
    }
    oficial = {
        "trackName": "BEAM BEAM",
        "artistName": "SOYEON",
        "collectionName": "Windy",
        "wrapperType": "track",
        "collectionId": 123,
    }

    def response(url: str) -> dict:
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        if parsed.path == "/search" and params.get("entity") == ["musicArtist"]:
            return {"results": [{"artistId": 1037194059, "artistName": "JEON SOYEON"}]}
        if parsed.path == "/lookup":
            assert params.get("id") == ["1037194059"]
            return {"results": [oficial]}
        if params.get("entity") == ["song"]:
            return {"results": [karaoke]}
        raise AssertionError(f"URL iTunes inesperada: {url}")

    monkeypatch.setattr(ms, "_request", response)
    results = ms.search_itunes("BEAM BEAM", limit=10, artist_query="SOYEON")

    assert results[0].title == "BEAM BEAM"
    assert results[0].artist == "SOYEON"
    assert results[0].album == "Windy"


def test_busqueda_itunes_baja_karaoke_detras_de_coincidencia_real() -> None:
    candidates = [
        Candidate(
            "itunes",
            title="Beam Beam (Originally Performed by Jeon So-yeon) [Instrumental Version]",
            artist="Backing Business",
            album="Pristine Karaoke, Vol. 43",
        ),
        Candidate(
            "deezer",
            title="BEAM BEAM",
            artist="JEON SOYEON",
            album="Windy",
        ),
    ]

    ordenados = ms.rank_candidates(candidates, "삠삠 (BEAM BEAM) SOYEON")

    assert ordenados[0].artist == "JEON SOYEON"


def test_consulta_vacia_no_hace_red(monkeypatch) -> None:
    llamado = []
    monkeypatch.setattr(ms, "_request", lambda *a, **k: llamado.append(a))

    assert ms.search_itunes("   ") == []
    assert ms.itunes_album("") == []
    assert ms.search_deezer("") == []
    assert not llamado


def test_search_cae_a_deezer(monkeypatch) -> None:
    """Si iTunes no devuelve nada, se prueba Deezer."""
    monkeypatch.setattr(ms, "search_itunes", lambda q, limit=20: [])
    monkeypatch.setattr(ms, "search_deezer", lambda q, limit=20: [Candidate("deezer", title="x")])
    assert len(ms.search("nada")) == 1


def test_search_no_revienta_si_deezer_falla(monkeypatch) -> None:
    def falla(*a, **k):
        raise SourceError("sin conexion")

    monkeypatch.setattr(ms, "search_itunes", lambda q, limit=20: [])
    monkeypatch.setattr(ms, "search_deezer", falla)
    assert ms.search("nada") == []


def test_search_prefiere_itunes(monkeypatch) -> None:
    monkeypatch.setattr(ms, "search_itunes", lambda q, limit=20: [Candidate("itunes", title="x")])
    monkeypatch.setattr(
        ms, "search_deezer", lambda *a, **k: pytest.fail("no deberia llamar a Deezer")
    )
    assert len(ms.search("algo")) == 1


def test_error_de_deezer_se_traduce(monkeypatch) -> None:
    monkeypatch.setattr(ms, "_request", lambda *a, **k: {"error": {"message": "cuota"}})
    with pytest.raises(SourceError, match="cuota"):
        ms.search_deezer("x")


def test_entrada_sin_track_name_se_ignora(monkeypatch) -> None:
    response = {"results": [{"id": 1}, {"trackName": "   "}]}
    monkeypatch.setattr(ms, "_request", lambda *a, **k: response)
    assert ms.search_itunes("x") == []


# --- Candidate ---------------------------------------------------------------


def test_candidate_a_tags() -> None:
    candidate = Candidate(
        source="itunes",
        title="One More Time",
        artist="Daft Punk",
        album="Discovery",
        year="2000",
        genre="Dance",
        track_number="1",
    )
    tags = candidate.to_tags()
    assert tags["title"] == "One More Time"
    assert tags["albumartist"] == "Daft Punk", "sin albumartist usa el artista"
    assert set(tags) == {"title", "artist", "album", "albumartist", "year", "genre", "track_number"}


def test_candidate_subtitle() -> None:
    empty = Candidate(source="itunes")
    assert empty.subtitle == ""

    with_data = Candidate(source="itunes", artist="A", year="2001", duration_ms=185_000)
    assert "A" in with_data.subtitle
    assert "3:05" in with_data.subtitle


def test_candidate_duracion_sin_datos() -> None:
    assert Candidate(source="x").duration_text == ""


# --- normalizacion de titulos ------------------------------------------------


@pytest.mark.parametrize(
    ("entrada", "expected_value"),
    [
        ("One More Time", "one more time"),
        ("ONE MORE TIME", "one more time"),
        ("Glory Box (feat. Shara Nelson)", "glory box shara nelson"),
        ("Café del Mar", "cafe del mar"),
        ("Ánhelo  —  Remastered", "anhelo"),
        ("  espacios   raros  ", "espacios raros"),
        ("!!!", ""),
        ("", ""),
    ],
)
def test_normalizar(entrada: str, expected_value: str) -> None:
    assert ms.normalize(entrada) == expected_value


def test_similitud() -> None:
    assert ms.similarity("One More Time", "One More Time") == 1.0
    assert ms.similarity("One More Time", "one more time!") == 1.0
    assert ms.similarity("One More Time", "Aerodynamic") < 0.5
    assert ms.similarity("", "algo") == 0.0


# --- emparejado --------------------------------------------------------------


def test_emparejar_exacto() -> None:
    candidates = [
        Candidate(source="itunes", title="One More Time"),
        Candidate(source="itunes", title="Aerodynamic"),
    ]
    pares = ms.match_by_title(candidates, ["Aerodynamic"])
    assert pares["Aerodynamic"].title == "Aerodynamic"


def test_emparejar_ignora_ruido_del_titulo() -> None:
    candidates = [Candidate(source="itunes", title="One More Time (Official Video)")]
    pares = ms.match_by_title(candidates, ["One More Time"])
    assert pares


def test_emparejar_por_similitud() -> None:
    candidates = [Candidate(source="itunes", title="Veridis Quo - Remastered 2011")]
    pares = ms.match_by_title(candidates, ["Veridis Quo"])
    assert pares["Veridis Quo"].title.startswith("Veridis Quo")


def test_emparejar_ignora_lo_que_no_cala() -> None:
    candidates = [Candidate(source="itunes", title="One More Time")]
    assert ms.match_by_title(candidates, ["Totalmente Otra Cosa"]) == {}


def test_emparejar_no_reusa_candidatos() -> None:
    candidates = [Candidate(source="itunes", title="Aerodynamic")]
    pares = ms.match_by_title(candidates, ["Aerodynamic", "Aerodynamic"])
    assert len(pares) == 1, "un candidato no puede usarse dos veces"


def test_emparejar_album_entero() -> None:
    """El caso de uso real: 14 pistas del archivo contra el album de iTunes."""
    track_items = [Candidate(source="itunes", title=f"Pista {i}") for i in range(1, 15)]
    titles_file = [f"{i:02d} Pista {i}.mp3" for i in range(1, 15)]

    pares = ms.match_by_title(track_items, [t.removesuffix(".mp3") for t in titles_file])
    assert len(pares) == 14


def test_emparejar_vacio() -> None:
    assert ms.match_by_title([], ["x"]) == {}
    assert ms.match_by_title([Candidate(source="x")], []) == {}


def test_emparejar_un_candidato_gana_el_primero() -> None:
    """iTunes devuelve ediciones mezcladas: gana la primera que coincida."""
    candidates = [
        Candidate(source="itunes", title="One More Time", year="2000"),
        Candidate(source="itunes", title="One More Time", year="2021"),
    ]
    pares = ms.match_by_title(candidates, ["One More Time"])
    assert pares["One More Time"].year == "2000"


# --- descarga de portada -----------------------------------------------------


def test_descargar_portada_rechaza_urls_no_seguros() -> None:
    assert ms.download_cover("file:///C:/secreto.jpg") is None
    assert ms.download_cover("http://example.com/cover.jpg") is None
    assert ms.download_cover("") is None
    assert ms.download_cover(None) is None


def test_descargar_portada_usa_https(monkeypatch) -> None:
    class Response:
        def __init__(self) -> None:
            self.headers = {"Content-Type": "image/jpeg"}

        def __enter__(self):
            return self

        def __exit__(self, *_args):
            return None

        def read(self, _limit: int) -> bytes:
            return b"imagen"

    def open_url(request, timeout):
        assert request.full_url == "https://example.com/cover.jpg"
        assert timeout == ms.TIMEOUT
        return Response()

    monkeypatch.setattr(ms.urllib.request, "urlopen", open_url)

    assert ms.download_cover("https://example.com/cover.jpg") == (
        b"imagen",
        "image/jpeg",
    )


def test_mime_por_extension() -> None:
    assert ms._mime_by_extension("http://x/a.jpg") == "image/jpeg"
    assert ms._mime_by_extension("http://x/a.PNG?v=2") == "image/png"
    assert ms._mime_by_extension("http://x/a") == "image/jpeg"