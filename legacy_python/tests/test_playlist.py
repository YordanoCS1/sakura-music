"""Tests para deteccion y resolucion de playlists de YouTube."""

from __future__ import annotations

import json

import pytest
from PySide6.QtCore import QObject, Signal

from sakura.core.tools import (
    build_playlist_info_command,
    hidden_reason,
    is_playlist_url,
    parse_search_line,
    summarize_hidden,
)
from sakura.ui.services import PlaylistResolver


class FakeRunner(QObject):
    """Dobla de `ProcessRunner` para guionizar la salida de yt-dlp."""

    line = Signal(str)
    failed = Signal(str)
    completed = Signal(int)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.commands: list[list[str]] = []
        self.killed = False

    def start(self, command: list[str]) -> None:
        self.commands.append(command)

    def kill(self) -> None:
        self.killed = True

    @property
    def is_running(self) -> bool:
        return False

    def emit_line(self, text_value: str) -> None:
        self.line.emit(text_value)

    def emit_completed(self, code: int = 0) -> None:
        self.completed.emit(code)


@pytest.fixture()
def resolver(monkeypatch) -> PlaylistResolver:
    monkeypatch.setattr(
        "sakura.ui.services.playlist.ProcessRunner", FakeRunner
    )
    return PlaylistResolver()


def entrada(**field_map) -> str:
    """Una linea de `--flat-playlist --dump-json`."""
    return json.dumps(field_map)


# --- resolver: videos ocultos -------------------------------------------------


def test_una_playlist_normal_no_avisa_de_ocultos(resolver) -> None:
    recibidos: list = []
    hidden: list = []
    resolver.result_found.connect(recibidos.append)
    resolver.hidden_found.connect(hidden.append)

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a"))
    resolver._on_line(entrada(id="b", title="Dos", url="https://youtu.be/b"))
    resolver._on_completed(0)

    assert len(recibidos) == 2
    assert not hidden, "no hay nada oculto que avisar"


def test_cuenta_los_privados_de_la_playlist(resolver) -> None:
    """Antes se descartaban en silencio: el usuario no se enteraba."""
    recibidos: list = []
    hidden: list = []
    resolver.result_found.connect(recibidos.append)
    resolver.hidden_found.connect(hidden.append)

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a"))
    resolver._on_line(entrada(id="p1", title="[Private video]"))
    resolver._on_line(entrada(id="p2", title="[Private video]", availability="private"))
    resolver._on_line(entrada(id="b", title="Dos", url="https://youtu.be/b"))
    resolver._on_completed(0)

    assert len(recibidos) == 2, "solo llegan los jugables"
    assert hidden == [{"private": 2}]
    assert resolver.hidden_count == 2


def test_separa_el_motivo_de_cada_oculto(resolver) -> None:
    hidden: list = []
    resolver.hidden_found.connect(hidden.append)

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="p", title="[Private video]"))
    resolver._on_line(entrada(id="d", title="[Deleted video]"))
    resolver._on_line(entrada(id="g", title="X", url="https://youtu.be/x",
                              availability="geo_restricted"))
    resolver._on_completed(0)

    assert hidden == [{"private": 1, "deleted": 1, "geo_restricted": 1}]


def test_el_total_no_cuenta_los_ocultos(resolver) -> None:
    """El total es lo bajable; los ocultos van aparte."""
    totales: list = []
    resolver.finished.connect(lambda _t, n: totales.append(n))

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a"))
    resolver._on_line(entrada(id="p", title="[Private video]"))
    resolver._on_completed(0)

    assert totales == [1]
    assert resolver.hidden_count == 1


def test_una_playlist_de_ocultos_no_falla(resolver) -> None:
    """Si no hay nada bajable, es exito igual, con el detalle de por que."""
    fallos: list = []
    finished: list = []
    hidden: list = []
    resolver.failed.connect(fallos.append)
    resolver.finished.connect(lambda t, n: finished.append(n))
    resolver.hidden_found.connect(hidden.append)

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="p", title="[Private video]"))
    resolver._on_completed(0)

    assert not fallos, "no es un error: es una playlist sin videos accesibles"
    assert finished == [0]
    assert hidden == [{"private": 1}]


def test_una_resolucion_parcial_avisa_de_los_ocultos(resolver) -> None:
    """Con error de yt-dlp pero con resultados, el resumen igual se arma."""
    hidden: list = []
    finished: list = []
    resolver.hidden_found.connect(hidden.append)
    resolver.finished.connect(lambda t, n: finished.append(n))

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a"))
    resolver._on_line(entrada(id="p", title="[Private video]"))
    resolver._on_completed(1)

    assert finished == [1]
    assert hidden == [{"private": 1}]


def test_un_error_sin_resultados_no_avisa_de_ocultos(resolver) -> None:
    fallos: list = []
    hidden: list = []
    resolver.failed.connect(fallos.append)
    resolver.hidden_found.connect(hidden.append)

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_completed(1)

    assert fallos
    assert not hidden


def test_resolver_de_nuevo_olvida_los_ocultos_anteriores(resolver) -> None:
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="p", title="[Private video]"))
    assert resolver.hidden_count == 1

    resolver.resolve("https://youtube.com/playlist?list=PL2")
    assert resolver.hidden_count == 0


def test_una_linea_basura_no_cuenta_como_oculta(resolver) -> None:
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line("esto no es json")
    resolver._on_line("[1, 2, 3]")
    resolver._on_completed(0)

    assert resolver.hidden_count == 0


def test_una_playlist_larga_con_muchos_ocultos(resolver) -> None:
    recibidos: list = []
    resolver.result_found.connect(recibidos.append)

    resolver.resolve("https://youtube.com/playlist?list=PL1")
    for i in range(50):
        resolver._on_line(entrada(id=f"v{i}", title=f"Cancion {i}",
                                  url=f"https://youtu.be/v{i}"))
    for _ in range(7):
        resolver._on_line(entrada(id="p", title="[Private video]"))
    resolver._on_completed(0)

    assert len(recibidos) == 50
    assert resolver.hidden_count == 7


# --- el nombre de la playlist da nombre a la carpeta ---------------------------


def test_captura_el_nombre_que_trae_yt_dlp(resolver) -> None:
    """`playlist_title` es el campo que da nombre a la carpeta de descarga."""
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(
        id="a", title="Uno", url="https://youtu.be/a",
        playlist_title="Pop Music Playlist (Updated 2026)",
    ))

    assert resolver.title == "Pop Music Playlist (Updated 2026)"


def test_el_nombre_no_se_toma_del_canal_del_video(resolver) -> None:
    """Con `playlist_title` presente, el uploader no debe pisarlo."""
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(
        id="a", title="Uno", url="https://youtu.be/a",
        uploader="Daft Punk", playlist_title="Mi playlist",
    ))

    assert resolver.title == "Mi playlist"


def test_si_no_hay_nombre_usa_el_canal(resolver) -> None:
    """Mejor un nombre aproximado que una carpeta llamada 'None'."""
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a",
                             uploader="Daft Punk"))

    assert resolver.title == "Daft Punk"


def test_resolver_de_nuevo_olvida_el_nombre_anterior(resolver) -> None:
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a",
                             playlist_title="Primera"))
    assert resolver.title == "Primera"

    resolver.resolve("https://youtube.com/playlist?list=PL2")
    assert resolver.title == ""


def test_el_nombre_queda_limpio_sin_espacios(resolver) -> None:
    resolver.resolve("https://youtube.com/playlist?list=PL1")
    resolver._on_line(entrada(id="a", title="Uno", url="https://youtu.be/a",
                             playlist_title="  Mi playlist  "))

    assert resolver.title == "Mi playlist"


# --- deteccion y parseo -------------------------------------------------------


def test_is_playlist_url_detecta_urls_validas():
    validas = [
        "https://www.youtube.com/playlist?list=PLrAlXFjFhFvWJ0r9o4p4qD",
        "https://youtube.com/playlist?list=PL12345",
        "http://www.youtube.com/playlist?list=PLabc",
        "https://music.youtube.com/playlist?list=PLxyz",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLrAlXFjFhFvWJ",
    ]
    for url in validas:
        assert is_playlist_url(url), f"Deberia reconocer {url} como playlist"


def test_is_playlist_url_descarta_videos_y_texto():
    invalidas = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtu.be/dQw4w9WgXcQ",
        "daft punk discovery",
        "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
        "",
        "playlist de rock nacional",
    ]
    for text_value in invalidas:
        assert not is_playlist_url(text_value), f"NO deberia reconocer {text_value} como playlist"


def test_build_playlist_info_command_incluye_flat_playlist():
    url = "https://www.youtube.com/playlist?list=PL123"
    cmd = build_playlist_info_command(url)
    assert "--flat-playlist" in cmd
    assert "--dump-json" in cmd
    assert url in cmd


def test_parse_search_line_lee_salida_de_playlist():
    # Salida típica de yt-dlp con --flat-playlist --dump-json
    line = (
        '{"id": "abc123xyz", "title": "Cancion de Playlist", "url": "https://www.youtube.com/watch?v=abc123xyz",'
        ' "uploader": "Artista Ejemplo", "duration": 180, "thumbnails": [{"url": "https://i.ytimg.com/vi/abc123xyz/hqdefault.jpg"}]}'
    )
    result = parse_search_line(line)
    assert result is not None
    assert result.id == "abc123xyz"
    assert result.title == "Cancion de Playlist"
    assert result.uploader == "Artista Ejemplo"
    assert result.duration == 180


# --- videos ocultos -----------------------------------------------------------

JUGABLE = {
    "id": "abc",
    "title": "One More Time",
    "url": "https://www.youtube.com/watch?v=abc",
    "availability": "public",
}


def test_un_video_normal_no_esta_oculto() -> None:
    assert hidden_reason(JUGABLE) is None


def test_un_video_publico_sin_availability_no_esta_oculto() -> None:
    """yt-dlp no siempre manda `availability`; si falta, es jugable."""
    assert hidden_reason({"title": "X", "url": "https://youtu.be/x"}) is None


def test_detecta_video_privado_por_availability() -> None:
    assert hidden_reason({**JUGABLE, "availability": "private"}) == "private"


def test_detecta_el_marcador_de_titulo() -> None:
    assert hidden_reason({"title": "[Private video]", "id": "x"}) == "private"
    assert hidden_reason({"title": "[Deleted video]", "id": "x"}) == "deleted"
    assert hidden_reason({"title": "[Unavailable video]", "id": "x"}) == "deleted"


def test_el_marcador_de_titulo_ignora_mayusculas() -> None:
    assert hidden_reason({"title": "[PRIVATE VIDEO]", "id": "x"}) == "private"


def test_una_entrada_sin_url_no_esta_oculta_pero_tampoco_se_puede_bajar() -> None:
    """yt-dlp lista entradas sin url jugable: hay que contarlas igual."""
    assert hidden_reason({"title": "Algo raro", "id": "x"}) == "sin_url"


def test_sin_url_tampoco_sirve_webpage_url() -> None:
    assert hidden_reason({"title": "X", "webpage_url": "https://youtu.be/x"}) is None


def test_restricciones_de_edad_y_suscripcion() -> None:
    for reason in ("needs_auth", "subscriber_only", "premium_only", "geo_restricted"):
        assert hidden_reason({**JUGABLE, "availability": reason}) == reason


def test_el_resumen_se_lee_en_castellano() -> None:
    summary = summarize_hidden({"private": 2, "deleted": 1})
    assert summary == "2 privados, 1 eliminados"


def test_el_resumen_respeta_el_orden_de_insercion() -> None:
    assert summarize_hidden({"geo_restricted": 3}) == "3 bloqueados en tu región"


def test_el_resumen_de_un_motivo_desconocido_no_rompe() -> None:
    assert "raro" in summarize_hidden({"raro": 1})
