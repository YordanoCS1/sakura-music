# Requisitos

Un requisito acá es una promesa verificable de la app, no un deseo. Cada uno
tiene un identificador estable, un criterio de aceptación que se puede comprobar
y, cuando existe, el test que lo cubre. Los identificadores no se renumeran: si
un requisito se retira, se marca como **Retirado** y se deja el historial.

Los requisitos funcionales (`RF`) describen **qué hace** la app. Los no
funcionales (`RNF`) describen **cómo** lo hace: rendimiento, robustez,
accesibilidad, mantenibilidad y operación.

## Cómo leer la trazabilidad

- **Criterio:** qué tiene que pasar para considerar el requisito cumplido.
- **Test:** archivo de `tests/` que lo ejercita. La suite completa se corre con
  `python -m pytest` y hoy son **1178 tests**.
- Si un requisito depende de red o de un binario externo, el test usa dobles o
  fixtures; las pruebas reales viven en `scripts/smoke_*.py` y no forman parte de
  la suite.

---

## Requisitos funcionales

### Búsqueda y descargas

#### RF-01 · Buscar en YouTube desde la app

**Criterio:** al escribir una consulta, la app ejecuta `yt-dlp ytsearch20:` y
muestra hasta 20 resultados con título, canal, duración y miniatura. La búsqueda
espera 450 ms desde la última tecla para no lanzar un proceso por pulsación.

**Test:** `test_search_page.py`, `test_tools.py`, `test_result_card.py`.

#### RF-02 · Elegir formato y calidad de descarga

**Criterio:** el usuario puede elegir entre audio `opus` (por defecto, remux sin
recodificar), `m4a` AAC 192K y `mp3` 320K; y entre video `mp4_best`, `1080p`,
`720p`, `480p` y `360p`. El formato activo se usa al encolar y se persiste en
`config.json`.

**Test:** `test_formats.py`, `test_settings.py`, `test_search_page.py`.

#### RF-03 · Encolar y ejecutar descargas concurrentes

**Criterio:** la cola ejecuta hasta 2 descargas simultáneas por defecto, con un
rango configurable de 1 a 4. Si se usan cookies de navegador, el límite baja a 1
para no disparar el bloqueo de YouTube. Cada trabajo corre en su propio
subproceso de `yt-dlp`.

**Test:** `test_downloader.py`, `test_process.py`, `test_settings.py`.

#### RF-04 · No volver a bajar lo que ya está

**Criterio:** antes de lanzar un trabajo, la app descarta:
- el mismo video ya pendiente o descargándose → **SKIPPED** “Ya está en la cola”;
- un archivo ya presente en la biblioteca o en descargas → **SKIPPED** “Ya está
  en tu biblioteca”.

Un lote compuesto solo por duplicados no abre la ventana de resumen.

**Test:** `test_downloader.py`, `test_completion.py`.

#### RF-05 · Reintentar con límite y limpiar el staging

**Criterio:** un trabajo que falla vuelve a **PENDING** y se reintenta hasta
`MAX_ATTEMPTS = 3`. Entre intentos se borra la carpeta `Descargas/job-XXXX`. Al
tercer fallo queda **FAILED** con un mensaje traducido por `friendly_error`.

**Test:** `test_downloader.py`, `test_tools.py`.

#### RF-06 · Resolver playlists sin descargarlas primero

**Criterio:** una URL de playlist se enumera con
`yt-dlp --flat-playlist --dump-json`, se muestran los videos numerados y las
entradas no descargables se cuentan por motivo en vez de mostrarse como tarjetas
rotas. **Descargar todo** deja los archivos en una carpeta con el nombre de la
playlist.

**Test:** `test_playlist.py`, `test_tools.py`, `test_search_page.py`.

#### RF-07 · Traer un álbum del catálogo y revisarlo antes de bajar

**Criterio:** la app busca el álbum en iTunes (con caída a Deezer), busca cada
pista en YouTube, puntúa la coincidencia por duración, título y canal, y abre una
tabla de revisión con veredicto y motivo. Solo se encola lo aprobado. Las pistas
sin match no se pueden marcar.

**Test:** `test_album_match.py`, `test_album_review.py`,
`test_metadata_sources.py`, `test_artist_catalog.py`.

#### RF-08 · Elegir un álbum desde la discografía del artista

**Criterio:** al buscar un artista se listan sus álbumes del más nuevo al más
viejo, con año, género y cantidad de pistas. El filtro **Solo álbumes
completos** viene activado y usa el nombre y la cantidad de pistas para separar
discos de singles y remixes.

**Test:** `test_discography.py`, `test_artist_catalog.py`.

#### RF-09 · Persistir y reanudar la cola

**Criterio:** la cola se guarda en `download_queue.json` ante cada cambio de
estado. Al arrancar se restauran los trabajos y los que estaban en curso vuelven
como **PENDING** con `attempts = 0` y el motivo “Descarga interrumpida al cerrar
la aplicación”.

**Test:** `test_downloader.py`, `test_queue_page.py`.

#### RF-10 · Historial de descargas

**Criterio:** cada trabajo terminado deja una entrada con estado, fecha, motivo,
formato y ruta. El historial se puede filtrar por estado y buscar por texto, y
conserva las **1000 entradas más recientes**. Un reintento exitoso reemplaza la
entrada anterior del mismo `history_id`, no la duplica.

**Test:** `test_download_history.py`, `test_queue_page.py`.

### Biblioteca

#### RF-11 · Escanear la biblioteca sin congelar la interfaz

**Criterio:** el escaneo corre en un `QThread`, recorre el árbol con
`scan_paths`, resuelve portadas y letras una vez por carpeta y emite tandas de
hasta **150 pistas**. La UI muestra las tandas mientras llegan y al final el
resumen `N pistas · N álbumes · N artistas · N h`.

**Test:** `test_library_scanner.py`, `test_library.py`, `test_library_page.py`.

#### RF-12 · Cachear el escaneo en SQLite por `mtime_ns` + tamaño

**Criterio:** el índice guarda las pistas con `mtime_ns` y tamaño. Una fila se
considera válida solo si ambos coinciden. El índice usa WAL y una versión de
esquema; si está corrupto o desactualizado se descarta y se reescanea, nunca
rompe el arranque.

**Test:** `test_library_index.py`, `test_library_scanner.py`.

#### RF-13 · Refrescar solo lo que cambió

**Criterio:** al detectar cambios en disco, un escaneo delta compara el árbol
contra el índice y relee solo altas y modificaciones; las rutas borradas se
quitan del modelo sin reconstruirlo. Los eventos se agrupan con un debounce de
**900 ms** y, si llegan durante un escaneo, se reintentan al terminar.

**Test:** `test_library_delta.py`, `test_library_watcher.py`,
`test_library_scanner.py`.

#### RF-14 · Explorar con seis vistas y dos secciones

**Criterio:** la Biblioteca ofrece las vistas `table`, `grid`, `mosaic`,
`albums`, `discs` y `carousel`, y las secciones **Canciones** y **Carpetas**. La
sección cambia el contenido; la vista cambia la presentación. Las vistas
ocultas se pueden restaurar y siempre queda al menos una visible.

**Test:** `test_library_page.py`, `test_track_model.py`, `test_album_model.py`,
`test_designs.py`.

#### RF-15 · Filtrar, ordenar y ajustar la presentación

**Criterio:** la barra permite buscar por título, artista o álbum; ordenar por
cualquier columna de la tabla; filtrar con los chips **Todos / Sin tags / Sin
portada / Duplicados**; cambiar el zoom entre **70 % y 160 %** en pasos de 15 y
la densidad entre **Compacta (0.85)**, **Cómoda (1.0)** y **Espaciosa (1.15)**.
Los filtros y el modo de vista se persisten.

**Test:** `test_library_page.py`, `test_track_model.py`.

#### RF-16 · Navegar carpetas con migas de pan

**Criterio:** en **Carpetas** se muestran las subcarpetas como chips y una barra
de migas clicables. **Volver** sube un nivel. La navegación se oculta cuando no
hay una carpeta abierta fuera de la raíz.

**Test:** `test_library_page.py`, `test_library.py`.

#### RF-17 · Detectar duplicados por artista y título normalizados

**Criterio:** dos pistas se consideran duplicadas si comparten artista y título
tras normalizar (minúsculas, sin acentos ni puntuación). La pista “desconocida”
no participa del agrupamiento. El chip **Duplicados** muestra solo esas pistas.

**Test:** `test_library.py`, `test_track_model.py`, `test_text.py`.

### Metadatos y letras

#### RF-18 · Editar tags y portada de una pista

**Criterio:** el editor lee los tags al abrir y no escribe nada hasta confirmar.
Permite editar título, artista, álbum, artista del álbum, año, género y número
de pista, y elegir una portada local. **Guardar cambios** escribe tags y
portada; **Cancelar** no toca el archivo.

**Test:** `test_metadata.py`, `test_metadata_editor.py`, `test_track_info.py`.

#### RF-19 · Buscar metadatos en catálogos externos

**Criterio:** el editor puede buscar en iTunes, Deezer, MusicBrainz, en modo
automático (iTunes y, si no hay nada, Deezer) o comparar todos. Aplicar un
candidato llena los campos y prepara la portada; si la descarga de portada falla,
se conserva la actual.

**Test:** `test_metadata_search.py`, `test_metadata_sources.py`.

#### RF-20 · Aplicar un candidato a todo el álbum

**Criterio:** con un `album_id` de iTunes, **Aplicar a todo el álbum** pide el
álbum completo, empareja por título normalizado contra los archivos de la misma
carpeta y escribe tags y portada en los que coinciden. Informa cuántas quedaron
etiquetadas y cuáles fallaron.

**Test:** `test_metadata_editor.py`, `test_metadata_search.py`,
`test_metadata_sources.py`.

#### RF-21 · Etiquetar en lote con la regla “vacío no se toca”

**Criterio:** con dos o más pistas seleccionadas, **Editar en lote** aplica solo
los campos informados. Un campo vacío significa “no cambiar”, nunca “borrar”. Se
informan las pistas sin cambios y los errores por pista.

**Test:** `test_batch_editor.py`, `test_metadata.py`.

#### RF-22 · Deshacer el último lote con manifiestos

**Criterio:** cada lote guarda un manifiesto JSON con los campos que cambiaron y
su valor anterior. **Deshacer último lote** restaura solo si el archivo sigue con
los valores que dejó el lote; si fue reetiquetado por fuera, se saltea. Se
conservan los **20 manifiestos más nuevos** y un manifiesto corrupto se descarta
sin romper la app.

**Test:** `test_tag_history.py`, `test_batch_editor.py`.

#### RF-23 · Incrustar letras con respaldo lateral

**Criterio:** por pista o en lote, la app busca la letra en este orden: archivo
`.lrc`/`.txt` junto al audio, tag ya incrustado y **LRCLIB**. Al incrustar,
escribe el tag del formato y conserva el archivo lateral como respaldo editable.
El proceso corre en un hilo con progreso y resumen final.

**Test:** `test_library.py`, `test_metadata.py`, `test_library_page.py`.

### Apariencia y configuración

#### RF-24 · Temas aplicables en caliente

**Criterio:** hay **14 temas**. Cambiar de tema regenera el QSS, aplica el shell
declarado por el tema, cambia el icono de la ventana y refresca los estilos
inline, sin recrear widgets ni reiniciar la app. Un tema guardado inexistente cae
al tema por defecto.

**Test:** `test_theme.py`, `test_theme_switch.py`, `test_shells.py`,
`test_designs.py`.

#### RF-25 · Tema ambiente desde la portada

**Criterio:** con **Tema desde la portada** activo, el acento de la Biblioteca
sale del color dominante de la carátula seleccionada, con debounce de **220 ms**.
Al salir de la Biblioteca vuelve el tema base.

**Test:** `test_theme_ambient.py`, `test_settings_ambient.py`.

#### RF-26 · Personalizar iconos

**Criterio:** el usuario puede reemplazar iconos por PNG propios, elegir si se
tiñen con el tema y ver una vista previa antes de aplicar. La copia estable vive
en `Iconos/`; si el PNG original se mueve o se borra, la app sigue usando esa
copia.

**Test:** `test_icon_customizer.py`, `test_icons.py`.

#### RF-27 · Persistir ajustes de forma atómica

**Criterio:** cada ajuste se guarda en `config.json` con escritura `.tmp` +
`replace`. Un JSON corrupto se ignora y se usan los valores por defecto; las
claves desconocidas se descartan al guardar.

**Test:** `test_config.py`, `test_settings.py`.

#### RF-28 · Actualizar herramientas desde Ajustes

**Criterio:** **Actualizar herramientas** corre `pip` para yt-dlp y `winget`
para FFmpeg, informa el resultado de cada paso y sigue con el siguiente aunque
uno falle. Si FFmpeg no está instalado, se informa el error sin bloquear yt-dlp.

**Test:** `test_settings.py`, `test_tools.py`.

### Arranque y diagnóstico

#### RF-29 · Arranque con launcher y splash opcionales

**Criterio:** el launcher muestra estado de biblioteca, cola y herramientas sin
escanear audio ni lanzar procesos. Se puede saltar con `--no-launcher`,
`SAKURA_NO_LAUNCHER=1` o `QT_QPA_PLATFORM=offscreen`. El splash se puede saltar
con `SAKURA_NO_SPLASH=1` y no corre en modo offscreen.

**Test:** `test_launcher.py`, `test_splash.py`, `test_main_window.py`.

#### RF-30 · Cierre limpio sin hilos ni procesos colgados

**Criterio:** al cerrar, `MainWindow.closeEvent` solo marca el cierre y detiene
el watcher; `app.main()` llama a `window.shutdown()` después de que `exec()`
vuelve. `DownloadManager.shutdown()` corta procesos, borra stagings, deja los
trabajos en **PENDING** y guarda la cola. Ningún `QThread` sigue vivo cuando Qt
se destruye.

**Test:** `test_downloader.py`, `test_main_window.py`, `test_process.py`.

---

## Requisitos no funcionales

#### RNF-01 · Interfaz responsiva

**Criterio:** ninguna operación de red, disco intensivo o subproceso corre en el
hilo de la UI. Escaneo, descargas, búsqueda, playlists, metadatos, letras y
resolución de álbumes viven en `QThread` o en subprocesos. La UI solo recibe
señales de progreso, resultado y error.

**Test:** `test_process.py`, `test_library_scanner.py`, `test_downloader.py`,
`test_metadata_search.py`.

#### RNF-02 · Arranque rápido con índice válido

**Criterio:** con el índice SQLite al día, el arranque no relee tags de todos los
archivos. Solo se leen las filas nuevas o vencidas (`mtime_ns` + tamaño). El
primer escaneo usa un `ThreadPoolExecutor` de 2 a 8 workers según CPU.

**Test:** `test_library_index.py`, `test_library_scanner.py`.

#### RNF-03 · Contraste accesible en todos los temas

**Criterio:** cada tema cumple WCAG en **12 pares** de color: texto normal ≥ 4.5,
texto atenuado ≥ 3.0, selección ≥ 4.5, botón primario ≥ 3.0 y estados ≥ 3.0. Son
**168 verificaciones** (12 × 14 temas). Un tema nuevo no entra si no pasa.

**Test:** `test_theme_contrast.py`.

#### RNF-04 · Ningún color hardcodeado fuera de los temas

**Criterio:** los colores son los únicos literales permitidos y viven en
`sakura/ui/theme/palettes.py`. Los widgets consumen `theme.color(...)` o los
`objectName` del QSS. Cambiar de tema no deja restos del anterior.

**Test:** `test_theme.py`, `test_theme_switch.py`.

#### RNF-05 · Persistencia tolerante a fallos

**Criterio:** configuración, cola, historial, manifiestos e índice se leen con
manejo de errores. Un archivo corrupto se ignora o se reemplaza, nunca impide
arrancar. Las escrituras de configuración son atómicas.

**Test:** `test_config.py`, `test_downloader.py`, `test_download_history.py`,
`test_tag_history.py`, `test_library_index.py`.

#### RNF-06 · Portabilidad de rutas y datos

**Criterio:** los datos viven en `%LOCALAPPDATA%\SakuraMusic` en Windows. Si esa
carpeta está redirigida por la build de Microsoft Store, la app detecta la
redirección y cae a `%USERPROFILE%\SakuraMusic`; si tampoco sirve, usa la carpeta
temporal. Así `ffmpeg` y `ffprobe` ven los mismos archivos que Python.

**Test:** `test_config.py`.

#### RNF-07 · Dependencias externas declaradas y detectables

**Criterio:** `ffmpeg` se busca en el `PATH` y en
`%LOCALAPPDATA%\SakuraMusic\bin`; `yt-dlp` se usa como módulo o ejecutable
disponible. Si falta una herramienta, la app muestra un error legible y no
encola trabajo que no pueda completar.

**Test:** `test_tools.py`, `test_settings.py`.

#### RNF-08 · Compatibilidad de Python y Qt

**Criterio:** el proyecto declara `requires-python >= 3.12` y se prueba con
Python 3.14 + PySide6 6.12. No se usan APIs exclusivas de una versión menor sin
fallback.

**Test:** la suite completa en el entorno soportado.

#### RNF-09 · Código legible y lint limpio

**Criterio:** `python -m ruff check .` pasa sin errores. El estilo sigue las
reglas de `pyproject.toml`; los módulos nuevos respetan la separación
`core` (puro) / `ui/services` (hilos y procesos) / `ui/pages` y widgets.

**Test:** `ruff` en CI local; no hay test unitario de lint.

#### RNF-10 · Documentación sincronizada con el comportamiento

**Criterio:** un cambio de comportamiento actualiza el requisito y su criterio en
el mismo commit. Una decisión estructural nueva suma un ADR en vez de reescribir
los anteriores. El README sigue siendo la explicación de diseño y `docs/` la
referencia de producto y mantenimiento.

**Test:** revisión manual; no aplica test automatizado.

---

## Matriz de trazabilidad resumida

| Módulo | Requisitos | Tests principales |
|---|---|---|
| Búsqueda y descargas | RF-01 … RF-10 | `test_search_page`, `test_downloader`, `test_playlist`, `test_process`, `test_tools`, `test_formats`, `test_completion`, `test_download_history`, `test_queue_page` |
| Biblioteca | RF-11 … RF-17 | `test_library_scanner`, `test_library_delta`, `test_library_index`, `test_library_watcher`, `test_library_page`, `test_library`, `test_track_model`, `test_album_model` |
| Metadatos y letras | RF-18 … RF-23 | `test_metadata`, `test_metadata_editor`, `test_metadata_search`, `test_metadata_sources`, `test_batch_editor`, `test_tag_history`, `test_track_info` |
| Apariencia y ajustes | RF-24 … RF-28 | `test_theme`, `test_theme_contrast`, `test_theme_switch`, `test_theme_ambient`, `test_settings`, `test_settings_ambient`, `test_shells`, `test_icon_customizer`, `test_designs`, `test_config` |
| Arranque y cierre | RF-29 … RF-30 | `test_launcher`, `test_splash`, `test_main_window`, `test_downloader` |
| Transversales | RNF-01 … RNF-10 | la suite completa |

## Requisitos retirados

Ninguno. Cuando se retire uno, se deja acá con la fecha y el motivo.
