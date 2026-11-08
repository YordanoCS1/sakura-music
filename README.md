# 🌸 Sakura Music

Gestor y descargador de música. Reconstruido en **Python + PySide6**.

## Documentación

Si querés usar la app, entenderla o mantenerla, la documentación completa está en
[`docs/`](docs/README.md):

| Si querés… | Leé |
|---|---|
| Instalar y abrir la app | [`docs/manual/instalacion.md`](docs/manual/instalacion.md) |
| Buscar, descargar y entender la cola | [`docs/manual/buscar-y-descargar.md`](docs/manual/buscar-y-descargar.md) |
| Escanear y ordenar tu biblioteca | [`docs/manual/biblioteca.md`](docs/manual/biblioteca.md) |
| Editar tags, portadas y letras | [`docs/manual/metadatos-y-letras.md`](docs/manual/metadatos-y-letras.md) |
| Cambiar tema, navegación e iconos | [`docs/manual/apariencia.md`](docs/manual/apariencia.md) |
| Resolver un error concreto | [`docs/manual/problemas.md`](docs/manual/problemas.md) |
| Entender el sistema y sus flujos | [`docs/casos-de-uso.md`](docs/casos-de-uso.md) |
| Saber qué está garantizado y cómo se prueba | [`docs/requisitos.md`](docs/requisitos.md) |
| Ver capas, hilos y persistencia | [`docs/arquitectura.md`](docs/arquitectura.md) |
| Conocer el porqué de una decisión técnica | [`docs/adr/README.md`](docs/adr/README.md) |
| Contribuir o extender la app | [`docs/desarrollo.md`](docs/desarrollo.md) |

## Por qué PySide6

La versión anterior usaba Electron, con un proceso principal en TypeScript que
spawn-eaba `yt-dlp` y `ffmpeg` y parseaba su salida a mano. En Python esa misma
lógica se vuelve más simple, no más difícil:

| Necesidad | Electron (antes) | PySide6 (ahora) |
|---|---|---|
| Descargas | `spawn(yt-dlp)` + parseo de JSON | `yt_dlp` en subprocess + su JSON |
| Tags ID3 / portada | `ffmpeg` vía `execFile` | `mutagen` |
| Escaneo de biblioteca | `fs` + `music-metadata` | `pathlib` + `mutagen` |
| Build | TS + Vite + tsup + electron-builder | un solo `python -m sakura` |

Además el consumo baja bastante: Electron mantiene un Chromium completo en
memoria (~130–220 MB en reposo), PySide6 ronda los 55–90 MB.

`yt-dlp` corre como **subproceso**, no como librería, a propósito: la extracción
de metadatos es trabajo intensivo de CPU y bloquearía la interfaz bajo el GIL.

## Requisitos

- Python 3.12 o superior
- `ffmpeg` en el `PATH`, o dentro de `%LOCALAPPDATA%\SakuraMusic\bin`
- Las descargas requieren conexión a YouTube
- Para contenido con restricción de edad, se pueden usar las cookies de Chrome,
  Edge, Firefox, Brave o Vivaldi desde **Ajustes**.

## Puesta en marcha

```bash
python -m pip install -e .
python -m sakura
```

En Windows también se puede abrir con doble clic en **`SakuraMusic.pyw`**:
usa `pythonw.exe` para no abrir una consola y arranca con el launcher visual.
`python -m sakura --no-launcher` entra directo a la ventana principal.

El icono propio de Sakura está en `resources/SakuraMusic.ico`. Como Windows no
permite embeber un icono en un `.pyw`, corré `python scripts/create_launcher_shortcut.py`
para crear el acceso directo de **Escritorio** y del **Menú Inicio** con ese
icono. `python scripts/make_app_icon.py` regenera el `.ico` desde el logo.

Escribes en el buscador, pulsas el botón de descarga de un resultado y sigues el
avance en **Cola**. Al terminar, el mp3 queda en la biblioteca.

### Nota sobre Python de Microsoft Store

La build de Microsoft Store corre en un sandbox que redirige las escrituras de
`%LOCALAPPDATA%` hacia un VirtualStore. `ffmpeg` y `ffprobe` no están sandboxed,
así que no ven los archivos que escribe Python y la conversión falla con
`unable to obtain file audio codec with ffprobe`.

Por eso `config.py` compara la ruta física de la carpeta (vía
`GetFinalPathNameByHandleW`) con la lógica, y si no coinciden cae al perfil del
usuario: `%USERPROFILE%\SakuraMusic`. Puedes ver qué ruta está usando con:

```bash
python -c "from sakura import config; print(config.base_dir())"
```

## Arquitectura

```
sakura/
  config.py             rutas, ajustes y detección de redirección de Windows
  app.py                bootstrap de QApplication, launcher, splash e icono
  core/                 lógica pura, sin Qt
    models.py           SearchResult, DownloadJob, JobStatus
    tools.py            comandos yt-dlp + parseo de su salida
    formats.py          presets de audio (opus / m4a / mp3)
    library.py          escaneo de carpeta y lectura de tags con mutagen
    library_index.py    índice SQLite de metadatos (escaneo incremental)
    metadata.py         escritura de tags y portadas embebidas
    metadata_sources.py iTunes, Deezer y MusicBrainz
    album_match.py      emparejado pista de catálogo ↔ video de YouTube
    lyrics.py           letras desde .lrc, tag incrustado o LRCLIB
    text.py             normalización de títulos, artistas y nombres
    tag_history.py      manifiestos para deshacer un lote de tags
    download_history.py registro persistente de descargas
  ui/
    theme/              TOKENS de diseño + generador de QSS
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
tests/                  50 archivos + fixtures de catálogo en tests/data/
scripts/                previews headless y pruebas reales de punta a punta
resources/              icono de la aplicación
```

### Formatos de audio

El selector está en **Ajustes**. La calidad nunca supera la del origen: YouTube
sirve ~131 kbps Opus, así que recodificar es perder.

| Formato | Codec | Tamaño (10 min) | Notas |
|---|---|---|---|
| **Opus** (default) | opus | 9.8 MB | Remux del original, cero pérdida |
| m4a | aac 192K | 15.2 MB | Mejor calidad por bitrate que mp3 |
| mp3 | mp3 320K | 24.8 MB | Máxima compatibilidad, el peor en tamaño |

Ojo con `--audio-quality 0` en AAC: produce ~410 kbps, tres veces el origen sin
ninguna diferencia audible. Por eso los presets usan bitrate explícito y Opus no
recibe `--audio-quality` (se ignora).

### Buscar metadatos en un catálogo

En el editor puedes elegir **Apple Music / iTunes**, **Deezer**, **MusicBrainz**,
la búsqueda **automática** (consulta iTunes y Deezer y combina sus resultados) o
**comparar todos** (agrega MusicBrainz a la comparación). Las búsquedas con un
título romanizado entre paréntesis prueban también ese alias sin el texto
original, y las coincidencias exactas se ordenan antes que versiones karaoke o
instrumentales. Cada resultado muestra su portada; al aplicar la coincidencia,
la portada se descarga y queda incrustada al guardar. Puedes aplicar una
coincidencia a una pista o, con el `collectionId` de iTunes, a todo el álbum.

MusicBrainz queda fuera del modo automático a propósito: exige un User-Agent
propio, limita a una petición por segundo y la portada viene de otro servicio
(Cover Art Archive), así que se consulta con su propio ritmo y solo cuando se
pide explícitamente.

Lo mejor es el botón **Aplicar a todo el álbum**: con el `collectionId` de iTunes
se trae el álbum entero en una consulta y se empareja por título normalizado, así
que los archivos que dejó la descarga (`01 - One More Time.mp3`) reciben su
título, año, género y **número de pista** correctos de una sola vez.

Solo quedó afuera **Spotify**: requiere credenciales y restringe parte de la API.

El emparejado normaliza antes de comparar: minúsculas, sin acentos ni
puntuación, y descarta palabras ruido (`feat`, `remix`, `official video`…).

### La cola no vuelve a bajar lo que ya tenés

Antes, descargar dos veces la misma canción regeneraba el archivo y **pisaba** el
que ya estaba en la biblioteca. Ahora `DownloadManager` compara contra las carpetas
de biblioteca y de descargas antes de lanzar `yt-dlp`, y si encuentra el archivo
marca el trabajo como **Ya estaba** sin gastar ancho de banda:

```python
find_existing_download([library_dir(), downloads_target_dir()], uploader, title, (".opus",))
```

El título se compara con el nombre **ya saneado** como lo escribe yt-dlp en
Windows (`sanitize_filename` saca `<>:"/\|?*`), porque si no, `AC/DC` nunca
encontraría `ACDC`.

### Reintentos

Un fallo de red no deja el trabajo en error a la primera: `DownloadManager`
reintenta hasta `MAX_ATTEMPTS` veces, reiniciando el progreso y usando un staging
limpio en cada intento (un `.part` sucio hace que yt-dlp responda `has already
been downloaded`). Los reintentos los lleva la app, no yt-dlp, para que el
usuario los vea en la cola; a yt-dlp solo se le acotan los suyos.

La cola incompleta también se guarda en los datos de la aplicación. Si cerrás
Sakura mientras hay descargas activas o en espera, vuelven a la cola al abrirla.
Los trabajos que agotaron los intentos o se cancelaron quedan guardados como
fallidos/cancelados: después de resolver, por ejemplo, un problema de cookies de
YouTube, podés pulsar **Reintentar errores** en la pantalla Cola. **Limpiar
terminados** también elimina esos trabajos guardados.

Las descargas encoladas desde una playlist se guardan dentro de una carpeta con
el nombre de esa playlist. En **Ajustes** también se puede elegir el navegador
cuyas cookies usará yt-dlp para resolver playlists y acceder a videos protegidos;
yt-dlp las lee durante cada operación y Sakura no las almacena.
El botón **Actualizar yt-dlp y FFmpeg** actualiza yt-dlp con pip y FFmpeg con
winget en Windows. FFmpeg debe estar instalado desde winget para que winget
pueda actualizarlo. Tras actualizarlo, reinicia la aplicación para que
reconozca la nueva versión.

### Nada pesado en el hilo de la interfaz

Dos caminos abrían archivos con `mutagen` desde el hilo de la GUI:

- `LibraryPage._refrescar_todos()`, que al cerrar la ficha releía **todas** las
  pistas (dos lecturas por pista).
- `DownloadManager._sanear_tags()`, al terminar cada descarga.

Los dos van ahora en hilos propios (`_ScanWorker` ya existía para el escaneo;
`_RefreshWorker` es el nuevo) con tandas de 150, así que con miles de pistas la
ventana no se congela.

### Un color, un significado

El acento (`#FF5DA8`) marcaba cuatro cosas a la vez —selección de fila, botón
primario, nombre del artista y página activa— dejaba de ser "acento" y pasaba a
ser decoración. Ahora:

| Uso | Token |
|---|---|
| Botón primario, página activa | `accent` |
| Fila o resultado seleccionado | `selection` (tinte del acento al 20%) |
| Pista sin tags | `danger` / `warning` / `success` |

`selection` es un tinte derivado con `theme.tint()`, no un color escrito a mano:
con el acento entero una fila marcada parecía un botón y competía con el contenido.

Los badges de la Cola dejaron de ser bloques sólidos: un rectángulo saturado se
lee como alerta, no como estado. Ahora son chips con fondo tenue y el texto del
color.

### La portada siempre se ve igual

`ui/covers.py` tiene el render único: la imagen real **y** el placeholder salen
redondeados y con marco. Antes el placeholder daba esquinas y la imagen real era
un rectángulo duro contra el fondo; y estaba copiado en tres widgets.

Las esquinas redondeadas se recortan con `setClipPath`, no con
`CompositionMode_DestinationIn`, que sobre un `QPixmap` no deja la esquina
transparente. Hay tests que lo comprueban mirando el canal alfa del píxel.

### Cosas que la interfaz no debe hacer

- **Un `QWidget` propio no recibe el fondo del QSS** sin
  `setAttribute(Qt.WidgetAttribute.WA_StyledBackground, True)`. Sin eso las
  tarjetas de Inicio salían invisibles contra el fondo.
- **Un `QLabel` con texto largo estira la ventana**: su `minimumSizeHint` es el
  ancho de la cadena. `widgets/elided.py` lo resuelve; sin él, una ruta larga
  hacía que el editor de metadatos pidiera 1192px en vez de los 860 que pide.
- **Poder redimensionar un diálogo**: el `resize()` del constructor es una
  sugerencia. Si el mínimo del layout es mayor, gana el mínimo.

### Los temas no son solo color

Un tema son **cinco** dimensiones, no una paleta. Es lo que hace que Cyberpunk y
Catppuccin se vean como apps distintas y no como el mismo esqueleto pintado de
otro color:

| Dimensión | Dónde se usa |
|---|---|
| Paleta | `bg`, `surface`, `text`, `accent`… |
| **Forma** | `radius`, `radius_sm` — de 2px (Wuxia) a 18px (Pocket Monsters) |
| **Densidad** | `density`: escala los paddings del QSS vía `px(t, n)` (0.88–1.12) |
| Jerarquía | `selection`, `tint()`, `surface_alt` para elevar |
| **Estructura** | `shell`: sidebar, dock, rail, top, tabs o bottom |

Agregar un tema es escribir un `Theme` más: el QSS se genera entero desde los
tokens y ningún widget se toca. Hoy hay **14**: Sakura Premium, Sakura Light
Airy, Cyberpunk Neon, Nord Frost, OLED Midnight, Catppuccin Mocha, Emerald
Forest, Sunset Amber, Editorial Warm, Wuxia Ink, Fauna Silvestre, Fauna de
Chile, Anime Pop y Pocket Monsters.

### Vistas de la Biblioteca

La Biblioteca cuenta con **6 vistas nativas** y dos secciones de contenido:

* **Tabla clásica:** vista compacta con columnas detalladas y ordenables.
* **Cuadrícula:** tarjetas con portada, título y artista.
* **Mosaico:** la carátula manda y el texto queda debajo.
* **Estantería de álbumes:** agrupa las pistas por álbum, como una pila de fundas.
* **Discos de vinilo:** recrea tus álbumes en discos con surcos e ilustración central.
* **Carrusel 3D:** navegación horizontal con efecto de perspectiva.

Las secciones **Canciones** y **Carpetas** cambian el contenido, no la vista: la
segunda navega el árbol de la biblioteca con migas de pan clicables.

Cada botón de vista en la barra superior se puede ocultar o mostrar haciendo **clic derecho** sobre él («Ocultar de la barra» / «Mostrar todas las vistas»), permitiéndote dejar una interfaz limpia y adaptada únicamente a los modos que uses. El zoom y la densidad se ajustan desde la misma barra; los chips **Todos / Sin tags / Sin portada / Duplicados** filtran sin salir de la página. Cuando no hay resultados, un estado vacío ilustrado explica qué hacer en vez de dejar la pantalla en blanco.

### Un tema tiene que LEERSE, no solo verse bonito

`scripts/audit_contrast.py` mide el contraste WCAG de los **14 temas** sobre los
pares que la app usa de verdad: texto sobre cada superficie, texto de la fila
seleccionada, botón primario, y los colores de estado sobre las tarjetas.

Encontró tres fallos que a simple vista no se ven — el verde de éxito y el
ámbar de Sakura Light, y el rojo de Nord, todos por debajo de 3:1 sobre su
propia tarjeta. `scripts/fix_contrast.py` los recalcula moviendo la luminosidad
en HLS hasta que pasan, sin tocar el tono.

`tests/test_theme_contrast.py` corre esa medición como test: **168 checks**
(12 pares × 14 temas).

### Cambiar de tema tiene que repintar todo

El QSS se regenera, pero los widgets con estilos inline no lo hacen solas. El
bug era la barra lateral: el título y el subtítulo se armaban una vez en el
constructor y quedaban con el color del tema anterior para siempre.

`scripts/check_theme_switch.py` cambia de tema en runtime, recorre las cinco
páginas y verifica que ningún color en línea pertenezca a otro tema.
`tests/test_theme_switch.py` lo fija como test.

### Una playlist se guarda junta, no dispersa por artistas

Por defecto las descargas se organizan en una carpeta por canal
(`Artista/título.ext`). Para una playlist eso era un problema: 30 temas de 12
artistas quedaban repartidos en 12 carpetas y no se encontraban.

Cuando la descarga viene de una playlist, la plantilla cambia a
`%(playlist_title)s/%(title)s.%(ext)s` y **todo cae en una sola carpeta** con el
nombre de la playlist. Una búsqueda suelta sigue yendo por canal.

El nombre sale del campo `playlist_title` que yt-dlp ya trae en cada entrada
(verificado contra una playlist real: *"Pop Music Playlist - Timeless Pop Songs
(Updated Weekly 2026)"*). Si no viniera, se usa el canal del primer video, que es
mejor que una carpeta literalmente llamada "None".

### La cola dice cuántas descargas se completaron

La barra superior de **Cola** muestra el conteo en vivo:

```
2 listas de 7 · 1 con error
```

Se actualiza en cada `job_updated` y `job_finished`, no solo al abrir la página.
Los que se saltaron por duplicado van aparte ("1 ya estaba") porque no son una
descarga hecha. Al limpiar la cola el resumen desaparece: no cuenta lo que ya
sacaste de la vista.

El botón **Cancelar descargas** corta lo pendiente y en curso tras pedir
confirmación. Solo se habilita cuando hay algo por cancelar; lo ya terminado no
se toca.

Además, cada fila con error o cancelada trae su propio botón de reintentar: se
repite solo ese video, sin arrastrar al resto de la cola. El botón global
"Reintentar errores" sigue ahí para cuando conviene rehacer todo de una vez.

Las descargas simultáneas se ajustan en **Ajustes**. El valor se recorta al
rango 1–4 y, si se usan cookies de navegador, el gestor lo baja a 1 igual: dos
procesos pelearían la misma base de cookies del perfil. El cambio se aplica al
reiniciar, porque los procesos ya están creados y cambiarlos en caliente dejaría
descargas sin forma de ser cortadas.

### Al vaciarse la cola aparece el resumen final

Cuando ya no queda nada pendiente ni en curso, se abre una ventana con el
resultado del lote: número grande de descargadas, estado general y detalle de
errores, duplicados y canceladas. Incluye un sello de flor de cerezo dibujado
con el acento del tema activo. Un lote formado solo por duplicados no abre la
ventana; "Ver cola" lleva directo a revisar los errores.

### Todo se numera: resultados, cola y descargas

Las canciones de una playlist salen numeradas y **los números se corresponden con
la cola**: lo que ves Buscar como 7 es el 7 de la Cola.

| Pantalla | Cómo se numera |
|---|---|
| Buscar (playlist) | 1, 2, 3… en el orden de la lista |
| Buscar (búsqueda) | sin número: el orden es por relevancia |
| Cola | 1, 2, 3… y **no se renumera** al limpiar |

La columna del número es un `QLabel` propio, no parte del título: el título es lo
que se usa como nombre de archivo al descargar, y `"1. One More Time.mp3"` habría
sido un cambio no pedido. El ancho crece con los dígitos para que una cola de 1000
no desalinee las portadas.

### Un álbum entra con los tags correctos

Escribir el nombre del álbum en el buscador habilita **Traer álbum del
catálogo**: se pide la ficha a iTunes, se cruza cada pista contra YouTube y se
muestra una tabla con el video elegido y **por qué**.

La tabla existe por una razón puntual. Los tags salen del catálogo, así que
quedan correctos elija el video que elija: si el cruce se equivoca, el archivo
sale con metadata impecable y el audio de otra canción, y eso no se detecta
nunca. Por eso se ve cada elección antes de encolar, con el veredicto y el
motivo legibles ("5:21 contra 5:20", "es una compilación").

`core/album_match.py` puntúa con la duración más que con el título —un video con
el nombre exacto pero de tres horas no es la pista— pero **confirma solo con el
título**. La duración sola no alcanza: dos temas distintos pueden durar lo
mismo, y el canal del artista solo sirve para ordenar, nunca para dar el visto
bueno. Descarta compilaciones, mixes y directos por palabras clave y duración.

Lo que gana la biblioteca es lo que YouTube no sabe: álbum, año, género y
número de pista correctos, más la portada del catálogo. Todo cae en una carpeta
`Artista/Álbum`, y junto a los archivos queda un `folder.jpg` para que los
reproductores externos muestren la carátula sin abrir cada pista.

### Buscar un artista y elegir de su discografía

Por nombre de álbum hay que saber el título. Con **Ver álbumes del artista** se
busca el artista en el catálogo y se listan sus discos, del más nuevo al más
viejo, con año, género y cantidad de pistas. Elegís uno y sigue el mismo camino
que por nombre.

El listado trae singles, EPs y remixes: para Daft Punk, 41 entradas que son 13
discos y el resto remixes de una pista. Por eso el filtro **Solo álbumes
completos** viene activado y usa el nombre y la cantidad de pistas: cuatro o más
es un disco, tres es un maxi single. Con el filtro apagado se ve la discografía
entera, que a veces es justo lo que se busca.

### Editar los tags de varias pistas a la vez

Marcar más de una fila en la biblioteca cambia el botón **Editar metadatos** por
**Editar en lote**. Se escribe un campo y se aplica a todas las marcadas.

La regla que define esa pantalla: **un campo vacío no se toca**. Si se dejó
"Álbum" en blanco es porque no se quiere cambiar, no porque se quiera borrar.
Vacío como "borrar" convertiría un clic mal dado en 200 pistas sin álbum, que no
se puede deshacer. Para limpiar un campo hay que vaciarlo en el editor de una
pista.

El resumen dice cuántas quedaron igual: si ya tenían ese género, no cuentan como
actualizadas. Mentir con "3 actualizadas" sobre 3 que no cambiaron es peor que no
decir nada.

### Las playlists avisan cuántas canciones no se pueden descargar

YouTube lista en una playlist los videos privados, eliminados, con restricción de
edad o bloqueados por región. Antes la app los **desechaba en silencio**
(`if not result.url: return`) y el usuario veía "18 videos" sin enterarse de que
faltaban 3.

Ahora `core/tools.py` clasifica cada entrada y el resumen lo dice:

```
18 videos · 3 videos ocultos (2 privados, 1 con restricción de edad)
```

Los motivos salen de `availability` (el campo que yt-dlp usa para marcar el
acceso) y de los títulos `[Private video]` / `[Deleted video]`. El total sigue
siendo solo lo bajable, para que "Descargar todo" no prometa de más.

Si la playlist **no** tiene nada bajable, no es un error: se explica por qué.

Verificado contra una playlist real de 200 entradas: 0 falsos positivos.

### La biblioteca entiende bibliotecas reales

Escaneando una biblioteca en uso (201 pistas `.m4a` de K-pop en una sola carpeta)
aparecieron cosas que un test sintético no muestra:

- **`folder.jpg` al lado de las pistas.** Es una convención extendida: si la pista
  no trae portada embebida, se usa la imagen de la carpeta. Sin esto, las 201
  pistas se veían sin carátula. Las imágenes se buscan `folder.*`, `cover.*`,
  `front.*`, `album.*`, `albumart.*`, `artwork.*` y `thumb.*`, pero `foto.jpg`
  **no** cuenta (es una foto del grupo, no la carátula).
- **Letras `.lrc` (y `.txt`).** Se emparejan por nombre normalizado, así que
  `I Want That.m4a` encuentra `I Want That (Official Audio).lrc`. Se lee en UTF-8,
  UTF-16 o cp1252, con o sin BOM.
- **Títulos en coreano y japonés.** `Segoe UI` no tiene esos glifos (9 de 11
  coreanos, todos los chinos), y **fijar `font-family` en el QSS desactiva el
  fallback automático de Qt**. Por eso `FONT_STACK` incluye Malgun Gothic, Yu
  Gothic, MS Gothic, Microsoft YaHei y SimSun después de las latinas.
- **Nombres con coreano en Windows.** Cualquier script que los imprenta revienta
  con `UnicodeEncodeError` en una consola cp1252; `scripts/_console.py` fuerza
  UTF-8.

Comprobalo sobre tu música:

```bash
python scripts/set_library.py "D:\\Music\\M\\u00fasica\\idle"   # el path en escapes ASCII
python scripts/scan_real.py "D:\\Music\\M\\u00fasica\\idle"      # qué encuentra y qué falta
python scripts/preview_real.py "D:\\Music\\M\\u00fasica\\idle"   # render de la biblioteca real
```

### La biblioteca usa modelo, no widgets

`QAbstractTableModel` + `QTableView` en vez de un label por fila: con miles de
pistas un `QScrollArea` lleno de widgets se arrastra, mientras la vista solo
pinta lo visible. Las claves de orden son strings de ancho fijo porque Qt no
compara bien una tupla de Python (su `lessThan` daba `False` en ambos sentidos).

### La biblioteca no se reescribe entera

El primer escaneo lee cada archivo con `mutagen`; los siguientes no. El índice
`core/library_index.py` es un SQLite descartable que guarda los metadatos ya
leídos y decide la vigencia de una fila por `mtime_ns` + tamaño, sin abrir el
audio. `LibraryDeltaScanner` compara el disco contra ese índice y solo relee
altas y cambios.

La carpeta se vigila con `QFileSystemWatcher` (`ui/services/watcher.py`). Como
no es recursivo, se registra cada subcarpeta y se agregan las nuevas; los
eventos se agrupan con un temporizador porque copiar un álbum dispara decenas
de avisos seguidos. Una descarga que termina o un archivo que aparece en el
Explorador se reflejan sin volver a escanear todo.

### Letras, historial y cambios deshacibles

- **Letras.** Se buscan primero en un `.lrc`/`.txt` junto al audio, después en
  un tag ya incrustado y, si no hay nada, en **LRCLIB**. Al incrustar se escribe
  el tag del formato y se conserva el archivo lateral como respaldo editable.
  Se puede hacer por pista desde la ficha o en lote desde la barra de selección.
- **Historial de descargas.** La cola solo guarda lo reanudable; el historial
  (`core/download_history.py`) conserva el resultado final de cada trabajo
  (descargado, con error, ya estaba o cancelado), con fecha y motivo, en un
  diálogo filtrable.
- **Deshacer un lote de tags.** `core/tag_history.py` no copia el audio entero:
  guarda un manifiesto JSON con los campos que cambiaron y su valor anterior.
  Con eso el botón **Deshacer último lote** revierte la edición sin duplicar
  gigabytes.

### Editor de metadatos

**Doble clic en una fila** abre la *ficha*: portada grande, título, artista y la
tabla completa de datos (álbum, año, género, pista `3/14`, duración, tamaño,
formato, carpeta) y la ruta del archivo. Desde ahí, el botón **Editar
metadatos** abre el formulario.

El botón homónimo de la barra de herramientas va directo al editor, sin pasar
por la ficha.

El editor escribe tags de texto (título, artista, álbum, artista de álbum, año,
género, nº de pista) y embebe la portada. Cancelar no toca el archivo: la
escritura recién ocurre al confirmar.

`mutagen` expone una capa distinta por formato y confundirlas es la trampa
clásica:

| Formato | Tags | Portada |
|---|---|---|
| mp3 | `easy=True` | frame `APIC` → `tags.getall("APIC")` |
| m4a | `easy=True` | `tags["covr"]`, hay que declarar JPEG o PNG |
| flac | `easy=True` | `audio.pictures`, **no** `tags.pictures` |
| opus | `easy=True` | bloque `metadata_block_picture` en base64 |

Dos cosas que quedaron fuera a propósito:

- **El campo `comment`.** `EasyID3` no lo acepta como clave escribible
  (`'comment' is not a valid key`); habría que hacerlo frame por frame con una
  API distinta en cada formato.
- **Portadas en WAV.** No entra en la lista de formatos con portada.

### La regla de los tokens

**Ningún widget escribe un color literal.** Todo sale de `sakura/ui/theme/`:

```python
@dataclass(frozen=True)
class Theme:
    bg: str
    surface: str
    accent: str
    ...
```

`build_qss(theme)` genera el stylesheet completo, y `Theme.with_accent()` produce
variantes (por ejemplo, tomar el color de la portada). Cambiar de tema es
`window.apply_theme(t)`, sin recrear widgets.

Esto es lo que hace que agregar los temas sea barato: se agrega un `Theme` más al
registro y listo, ningún widget se toca.

### Por qué los iconos se renderizan y no se empaquetan

`icons.py` arma el SVG de Lucide en memoria y lo pinta con `QSvgRenderer`. No hay
archivos `.svg` que acompañar al ejecutable ni `QtWebEngine` que asome.

### La flor de la marca

`sakura/ui/sakura.py` dibuja la sakura con `QPainter` sobre un lienzo normalizado y la
escala al tamaño pedido. Va aparte de `icons.py` porque una flor de cinco pétalos
con muesca queda mejor como curvas Bézier que comprimida en un viewBox de 24×24.

| Función | Para qué |
| --- | --- |
| `render(color, size)` | La flor sola: la marca del lateral y del topbar, los botones. |
| `render_logo(color, size)` | La flor con halo y pétalos caídos: el icono de la ventana y el hero de inicio. Solo se lee a partir de unos 64 px. |
| `icon(color, size)` | `QIcon` con estados Normal y Disabled, para que el QSS pueda atenuarla. |
| `paint(pintor, centro, radio, ...)` | La geometría cruda, para widgets que ya tienen su propio `paintEvent`. |

Los colores salen siempre del tema activo, nunca están escritos a mano. Para
pedirla por nombre desde cualquier botón: `TextButton("Descargar música", "accent", icon="sakura")`.

## Desarrollo

Para instalar el entorno, correr tests y lint, usar los scripts de diagnóstico
y extender la app, ver [`docs/desarrollo.md`](docs/desarrollo.md). Lo habitual:

```bash
python -m pytest          # 1178 tests
python -m ruff check .    # lint

# Previews headless: no abren ventana, escriben PNG
python scripts/preview_icons.py      # hoja de contactos de los iconos
python scripts/preview_window.py     # render de la ventana
python scripts/preview_downloads.py  # búsqueda + cola con datos de ejemplo
python scripts/preview_library.py    # biblioteca real generada con ffmpeg
python scripts/preview_editor.py     # editor de metadatos
python scripts/preview_ficha.py      # ficha de la pista (con y sin portada)
python scripts/preview_playlist.py   # playlist resuelta en la página Buscar
python scripts/preview_real.py <ruta>  # render de una biblioteca real

# Pruebas reales de punta a punta (tocan la red o el disco)
python scripts/smoke_download.py     # descarga REAL de punta a punta
python scripts/smoke_formats.py      # descarga real en opus, m4a y mp3
python scripts/smoke_metadata.py     # escribe tags y portadas en los 4 formatos
python scripts/smoke_lookup.py       # busca en iTunes y etiqueta un álbum real

# Diagnóstico y auditorías
python scripts/audit_contrast.py      # contraste WCAG de los 14 temas
python scripts/check_theme_switch.py  # ningún color viejo al cambiar de tema
python scripts/check_clean_exit.py    # la app cierra sin hilos colgados
python scripts/check_cjk_fonts.py     # coreano/japonés dibujable en el sistema
python scripts/scan_real.py <ruta>    # qué encuentra y qué falta en una biblioteca
python scripts/inspect_library.py <ruta>  # diagnóstico de una biblioteca
python scripts/set_library.py <ruta>  # fija la carpeta de biblioteca
python scripts/probe_metadata_apis.py  # qué catálogo responde y cuál no
python scripts/grab_fixtures.py       # regenera los fixtures de la API
python scripts/fix_encoding.py .      # repara doble-codificación UTF-8
```

Los tests de biblioteca y metadatos generan audio real con ffmpeg y le escriben
tags con mutagen, así que corren contra los formatos de verdad y no contra mocks.
Los de búsqueda de catálogo usan **fixtures grabados** (`tests/data/`): si
fallan, es por el código y no porque Apple esté caído. Los que sí tocan la red
son los `smoke_*`, que se corren a mano.

Los previews corren con `QT_QPA_PLATFORM=offscreen`, por eso cargan las fuentes
de `C:\Windows\Fonts` a mano (`scripts/preview_bootstrap.py`): el plugin offscreen
no expone las instaladas.

## Atajos

| Atajo | Acción |
|---|---|
| `Ctrl+1` … `Ctrl+4` | Inicio / Buscar / Biblioteca / Cola |
| `Ctrl+F` | foco en el buscador |