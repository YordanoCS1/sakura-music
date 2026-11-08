# Desarrollo

Guía para quien se mete al código de Sakura Music: cómo instalar el entorno,
cómo correr tests y lint, qué scripts hay y cómo agregar piezas nuevas sin
romper las garantías existentes.

## Entorno

```bash
python -m pip install -e .[dev]
```

| Dependencia | Para qué |
|---|---|
| `PySide6>=6.8` | Interfaz Qt |
| `yt-dlp>=2024.12.13` | Búsqueda, resolución y descarga |
| `mutagen>=1.47` | Lectura y escritura de tags |
| `pytest>=8.0` | Tests |
| `ruff>=0.8.0` | Lint |

Requisitos de la máquina:

- **Python 3.12 o superior** (`pyproject.toml`: `requires-python = ">=3.12"`).
  La suite se prueba con Python 3.14 + PySide6 6.12.
- **ffmpeg y ffprobe** disponibles, para los tests de biblioteca y metadatos
  que generan audio real.
- Windows es la plataforma principal: la gestión de rutas (`config.py`) y el
  ocultamiento de consola (`spawn_kwargs`) tienen ramas específicas para
  `win32`.

## Mapa del código

```text
sakura/
  config.py             rutas, ajustes y detección de redirección de Windows
  app.py                bootstrap de QApplication, launcher, splash e icono
  __main__.py           python -m sakura
  core/                 lógica pura, sin Qt
    models.py           SearchResult, DownloadJob, JobStatus
    tools.py            comandos yt-dlp + parseo de su salida
    formats.py          presets de audio y video
    library.py          escaneo de carpeta y lectura de tags con mutagen
    library_index.py    índice SQLite de metadatos
    metadata.py         escritura de tags y portadas embebidas
    metadata_sources.py iTunes, Deezer y MusicBrainz
    album_match.py      emparejado pista de catálogo ↔ video de YouTube
    lyrics.py           letras desde .lrc, tag incrustado o LRCLIB
    text.py             normalización de títulos, artistas y nombres
    tag_history.py      manifiestos para deshacer un lote de tags
    download_history.py registro persistente de descargas
  ui/
    theme/              tokens de diseño + generador de QSS
    icons.py            iconos Lucide renderizados con QtSvg
    sakura.py           flor de la marca dibujada con QPainter
    covers.py           render único de portadas y placeholders
    launcher.py         pantalla de inicio con estado del entorno
    splash.py           animación de arranque
    main_window.py      armazón, páginas, atajos y ciclo de vida
    models/             modelos de pistas y de álbumes
    pages/              home, search, library, queue, settings
    widgets/            sidebar, topbar, editor, vistas, diálogos…
    services/           procesos, búsqueda, descargas, catálogo, escaneo, watcher
tests/                  50 archivos de tests + fixtures en tests/data/
scripts/                previews headless, pruebas reales y diagnóstico
resources/              icono de la aplicación
docs/                   esta documentación
```

La regla de capas es simple: `core` no importa nada de `ui` ni de Qt.
`ui/services` sí puede importar `core` porque agrega hilos y procesos.
`ui/pages` y `ui/widgets` consumen servicios y modelos, y no leen tags ni
lanzan `yt-dlp` directamente.

## Comandos del día a día

```bash
python -m pytest          # 1178 tests
python -m ruff check .    # lint
```

Los tests corren con `QT_QPA_PLATFORM=offscreen` (lo fija `tests/conftest.py`),
así que no abren ventanas. La suite completa tarda varios minutos porque los
tests de biblioteca y metadatos generan audio real con ffmpeg y escriben tags
con mutagen: corren contra los formatos de verdad, no contra mocks.

### Recortar la corrida

```bash
python -m pytest tests/test_downloader.py -q
python -m pytest -k "theme" -q
python -m pytest -x --tb=short tests/test_library_index.py
```

## Previews headless

Los previews no abren ventana: renderizan PNGs con el plugin offscreen. El
plugin offscreen no expone las fuentes instaladas, por eso cargan las de
`C:\Windows\Fonts` a mano (`scripts/preview_bootstrap.py`).

```bash
python scripts/preview_icons.py      # hoja de contactos de los iconos
python scripts/preview_window.py     # render de la ventana
python scripts/preview_downloads.py  # búsqueda + cola con datos de ejemplo
python scripts/preview_library.py    # biblioteca real generada con ffmpeg
python scripts/preview_editor.py     # editor de metadatos
python scripts/preview_ficha.py      # ficha de la pista (con y sin portada)
python scripts/preview_playlist.py   # playlist resuelta en la página Buscar
python scripts/preview_real.py <ruta>  # render de una biblioteca real
```

## Pruebas reales de punta a punta

Los `smoke_*` tocan red o disco y **no** forman parte de la suite. Se corren a
mano, cuando se toca el pipeline de descarga o metadatos.

```bash
python scripts/smoke_download.py     # descarga REAL de punta a punta
python scripts/smoke_formats.py      # descarga real en opus, m4a y mp3
python scripts/smoke_metadata.py     # escribe tags y portadas en los 4 formatos
python scripts/smoke_lookup.py       # busca en iTunes y etiqueta un álbum real
```

## Diagnóstico y auditorías

```bash
python scripts/audit_contrast.py      # contraste WCAG de los 14 temas
python scripts/fix_contrast.py        # recalcula luminosidad en HLS hasta pasar
python scripts/check_theme_switch.py  # ningún color viejo al cambiar de tema
python scripts/check_clean_exit.py    # la app cierra sin hilos colgados
python scripts/check_cjk_fonts.py     # coreano/japonés dibujable en el sistema
python scripts/check_cover_shape.py   # esquinas redondeadas en portadas
python scripts/scan_real.py <ruta>    # qué encuentra y qué falta en una biblioteca
python scripts/inspect_library.py <ruta>  # diagnóstico de una biblioteca
python scripts/set_library.py <ruta>  # fija la carpeta de biblioteca
python scripts/probe_metadata_apis.py  # qué catálogo responde y cuál no
python scripts/grab_fixtures.py       # regenera los fixtures de la API
python scripts/probe_min_width.py     # mínimo de ancho de diálogos
python scripts/compare_codecs.py      # comparación de codecs / tamaños
python scripts/fix_encoding.py .      # repara doble-codificación UTF-8
python scripts/fix_mojibake.py .      # repara mojibake
python scripts/show_bytes.py          # vuelca bytes para depurar encoding
python scripts/debug_close.py         # depura el cierre de la app
python scripts/debug_windows.py       # lista ventanas Qt vivas
```

Los tests de catálogo usan **fixtures grabados** (`tests/data/`: iTunes,
Deezer, MusicBrainz). Si fallan, es por el código, no porque Apple esté caído.
¿Se rompió el fixture porque cambió la API? `probe_metadata_apis.py` dice qué
catálogo responde y `grab_fixtures.py` regenera.

## Cómo corren los tests de Qt

`tests/conftest.py` concentra las decisiones delicadas:

| Qué | Cómo |
|---|---|
| Sin pantalla | `QT_QPA_PLATFORM=offscreen` antes de importar QtWidgets |
| Una sola `QApplication` | Fixture de sesión `qapp` |
| Borrar widgets diferidos | Fixture autouse que envía `DeferredDelete` y procesa eventos tras cada test |
| No abortar al salir | Fixture de sesión que apaga `MainWindow` y cierra ventanas **con Qt todavía en pie** |

El último punto es histórico: si una ventana con `QThread` sobrevive hasta el
apagado del intérprete, Shiboken libera el objeto cuando Qt ya no existe y el
proceso aborta con `0xC0000409`. La suite “pasaba” pero salía mal. No lo
desarmes.

## Recetas para extender

### Agregar un tema

1. Creá un `Theme` en `sakura/ui/theme/palettes.py` con los cinco grupos de
   tokens (paleta, forma, densidad, jerarquía, shell).
2. Agregalo a `THEME_LIST`.
3. Corré `python -m pytest tests/test_theme_contrast.py -q`: debe pasar los
   12 pares WCAG.
4. Corré `python scripts/audit_contrast.py` si algún par está al límite.
5. Corré `python -m pytest tests/test_theme_switch.py -q` para verificar que
   ningún widget conserva colores del tema anterior.

No toques ningún widget: el QSS se genera entero desde los tokens
([ADR-0006](adr/0006-temas-por-tokens.md)).

### Agregar una vista de la Biblioteca

1. Escribí el delegate en `sakura/ui/widgets/track_delegates.py`.
2. Agregá el widget en `sakura/ui/widgets/library_views.py`.
3. Agregá el botón en `VIEW_SPECS` (`library_toolbar.py`) y el modo en
   `VIEW_ORDER`.

**El orden del stack y el de los botones deben coincidir.** Si no, la vista
activa no es la que el botón sugiere.

### Agregar una fuente de catálogo

1. Implementá el buscador en `sakura/core/metadata_sources.py`, devolviendo
   `Candidate` normalizados.
2. Sumalo a `sakura/ui/services/metadata_search.py`.
3. Grabá fixtures en `tests/data/` y agregá tests que los usen.
4. Si exige User-Agent propio o límite de ritmo (como MusicBrainz), que quede
   **fuera del modo automático** y se consulte solo explícitamente.

Spotify quedó afuera a propósito: requiere credenciales y restringe parte de
la API.

### Agregar un servicio con hilo

1. Seguí el patrón de `ui/services/`: `QObject` con señales de progreso, fin y
   error, y un worker `QThread` encapsulado. La página no hereda de `QThread`.
2. Implementá `shutdown()` que cancele y espere. (**Obligatorio**:
   ver [ADR-0008](adr/0008-hilos-y-cierre-limpio.md).)
3. Conectalo desde la página y conectá su `shutdown()` en
   `MainWindow.shutdown()`.

### Agregar un ajuste

1. Declaralo en `DEFAULTS` (`sakura/config.py`) con su valor por defecto.
2. Agregá la fila en `sakura/ui/pages/settings.py` y la señal que corresponda.
3. Conectalo en `MainWindow` si afecta más de una página.

La persistencia ya es atómica (`.tmp` + `replace`) y descarta claves
desconocidas al guardar.

### Agregar un formato de descarga

1. Declaralo en `sakura/core/formats.py` (`MediaFormat`): id, etiqueta,
   extensión, calidad y si transcodifica.
2. Verificá que `build_download_command` (`core/tools.py`) lo lleve bien.
3. Corré `python scripts/smoke_formats.py`.

## Convenciones

| Convención | Regla |
|---|---|
| Estilo | `python -m ruff check .` limpio; `line-length = 100`, `target-version = py312` |
| Reglas de lint | `E, F, I, UP, B, SIM, RUF` (`pyproject.toml`) |
| Idioma del código | Español para docstrings y textos largos de UI; identificadores en inglés cuando el dominio lo exige |
| Capas | `core` puro; hilos y procesos solo en `ui/services`; layout solo en `ui/pages`/`ui/widgets` |
| Colores | Ningún literal fuera de `ui/theme/palettes.py` |
| Rutas | `config.py` es el único lugar que conoce la carpeta de datos |
| Tests | Un archivo `test_<módulo>.py` por módulo; fixtures de red en `tests/data/` |

Excepciones documentadas en `pyproject.toml`: `scripts/*` y
`tests/conftest.py` ignoran `E402` (ajustan `sys.path` antes de importar), y
`sakura/ui/icons.py` ignora `E501` (el path data de Lucide es verbatim).

## Documentación

- El **porqué** de cada decisión está en [adr/](adr/README.md).
- Lo que la app **promete** está en [requisitos.md](requisitos.md).
- Los flujos están en [casos-de-uso.md](casos-de-uso.md).
- El manual de usuario está en [manual/](manual/README.md).

Cuando cambie un comportamiento, actualizá el requisito y su criterio en el
mismo commit. Cuando agregues una decisión estructural, sumá un ADR nuevo en
vez de reescribir los viejos.
