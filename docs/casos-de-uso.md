# Casos de uso

Un caso de uso describe **qué logra un actor usando Sakura Music**, no cómo está
implementado. Los flujos están escritos contra el comportamiento real del código:
cuando una regla vive en un servicio o en un test, se nombra el archivo para que
se pueda verificar.

## Actores

| Actor | Tipo | Qué quiere |
|---|---|---|
| **Usuario** | Persona | Buscar, descargar, ordenar y etiquetar su música local. |
| **Desarrollador** | Persona | Entender, probar y extender la app sin romper sus garantías. |
| **YouTube / yt-dlp** | Sistema externo | Resolver búsquedas, playlists y descargas. |
| **ffmpeg / ffprobe** | Sistema externo | Convertir, mezclar y verificar medios. |
| **iTunes / Deezer** | Sistema externo | Proveer fichas de pistas, álbumes y artistas. |
| **MusicBrainz / Cover Art Archive** | Sistema externo | Proveer metadatos y portadas alternativas. |
| **LRCLIB** | Sistema externo | Proveer letras sincronizadas o planas. |
| **Sistema de archivos** | Sistema externo | Guardar la biblioteca, las descargas y los datos de la app. |

## Resumen de casos de uso

| ID | Nombre | Actor principal | Precondición | Resultado |
|---|---|---|---|---|
| CU-01 | Buscar y descargar una canción | Usuario | ffmpeg disponible | Archivo en la biblioteca o carpeta de descargas, con tags saneados |
| CU-02 | Resolver y descargar una playlist | Usuario | URL de playlist válida | Todos los videos bajables en una carpeta con el nombre de la playlist |
| CU-03 | Descargar un álbum del catálogo | Usuario | Búsqueda de texto con resultados | Álbum cruzado con YouTube, revisado y encolado con tags de catálogo |
| CU-04 | Elegir un álbum de una discografía | Usuario | Artista encontrado en el catálogo | Álbum elegido y encolado por el mismo camino que CU-03 |
| CU-05 | Reanudar, reintentar y cerrar la cola | Usuario | Cola con trabajos | Trabajos reanudados o reintentados; resumen final |
| CU-06 | Escanear y mantener la biblioteca | Usuario | Carpeta de biblioteca existente | Biblioteca listada y actualizada sin reescanear todo |
| CU-07 | Explorar la biblioteca | Usuario | Biblioteca escaneada | Pistas filtradas, ordenadas y agrupadas según la vista |
| CU-08 | Editar los metadatos de una pista | Usuario | Pista seleccionada | Tags y portada escritos; ficha actualizada |
| CU-09 | Etiquetar en lote y deshacer | Usuario | Dos o más pistas seleccionadas | Campos aplicados a todas; manifiesto para revertir |
| CU-10 | Incrustar letras | Usuario | Pista con audio legible | Letra incrustada y archivo lateral conservado |
| CU-11 | Cambiar la apariencia | Usuario | App abierta | Tema, shell, densidad o iconos aplicados en caliente |
| CU-12 | Configurar la app | Usuario | App abierta | Ajustes persistidos en `config.json` |
| CU-13 | Consultar el historial de descargas | Usuario | Al menos una descarga terminada | Registro filtrable de resultados |
| CU-14 | Arrancar con launcher y splash | Usuario | App instalada | Launcher con estado del entorno o ventana principal |
| CU-15 | Diagnosticar un fallo de descarga | Usuario | Descarga con error | Causa legible y acción siguiente |
| CU-16 | Extender la app | Desarrollador | Entorno de desarrollo | Tema, vista, fuente o servicio nuevo sin romper tests |

---

## CU-01 · Buscar y descargar una canción

**Actor:** Usuario. **Sistemas:** YouTube/yt-dlp, ffmpeg, sistema de archivos.

**Precondiciones**

- La app arrancó y `ffmpeg` se encuentra en el `PATH` o en
  `%LOCALAPPDATA%\SakuraMusic\bin`.
- Hay conexión a YouTube.

**Flujo principal**

1. El usuario escribe un título o artista en el buscador global (`Ctrl+F` o la
   barra superior de Inicio/Buscar).
2. `SearchPage` espera **450 ms** desde la última tecla (`SEARCH_DEBOUNCE_MS`) y
   lanza `SearchService`.
3. `SearchService` ejecuta `yt-dlp ytsearch20:<consulta>` y emite un
   `SearchResult` por línea JSON.
4. La página muestra hasta **20 tarjetas** con portada, título, canal, duración y
   número de vistas. La búsqueda por texto **no numera** resultados: el orden es
   por relevancia.
5. El usuario pulsa el botón de descarga de una tarjeta. Se usa el formato
   seleccionado en la barra de Buscar o, si no eligió uno, el de Ajustes.
6. `MainWindow._on_download_requested` verifica `ffmpeg`. Si falta, muestra
   “ffmpeg no está instalado” y no encola nada.
7. `DownloadManager.enqueue` crea un `DownloadJob`, lo agrega a la cola y emite
   `job_added`; la app salta a **Cola**.
8. Antes de lanzar el proceso, el gestor descarta duplicados:
   - si el mismo video ya está pendiente o descargándose, el trabajo queda
     **SKIPPED** con “Ya está en la cola de descarga”;
   - si ya existe el archivo en la biblioteca o en la carpeta de descargas, queda
     **SKIPPED** con “Ya está en tu biblioteca”.
9. Si no es duplicado, `pump()` ocupa un slot libre (hasta 2 por defecto, 1 si
   hay cookies de navegador) y `ProcessRunner` lanza `yt-dlp` en un `QThread`.
10. yt-dlp descarga a un staging temporal (`Descargas/job-XXXX`). La app parsea
    las líneas de progreso y actualiza porcentaje, bytes y velocidad.
11. Al terminar con código 0, `_collect_output` elige el archivo más grande,
    descarta `.part` y `.ytdl`, lo mueve al destino y sanea `title`/`artist` sin
    borrar álbum, año, género ni número de pista.
12. El trabajo pasa a **DONE**, se guarda en el historial y la fila de Cola queda
    con su badge y su ruta.

**Flujos alternativos**

- **Sin resultados:** se muestra “Sin resultados” y se sugiere otro nombre o una
  URL.
- **Error de red o de yt-dlp:** el trabajo vuelve a **PENDING** y se reintenta
  hasta `MAX_ATTEMPTS = 3`, con staging limpio en cada intento. Recién al tercer
  fallo queda **FAILED** con un mensaje traducido por `friendly_error`.
- **Cancelación:** si está pendiente, pasa a **CANCELLED**; si está en curso, se
  mata el proceso, se borra el staging y se libera el slot.
- **Formato de video:** se usa el selector de MP4 (`mp4_best`, `1080p`, `720p`,
  `480p`, `360p`) y el archivo se mezcla con ffmpeg.

**Postcondiciones**

- El archivo queda en la carpeta de descargas configurada (o en la biblioteca si
  vino de una playlist/álbum), con el formato elegido.
- La cola y el historial reflejan el resultado.
- Si el lote terminó y hubo actividad real, se muestra el resumen final.

**Dónde está**

`sakura/ui/pages/search.py`, `sakura/ui/services/searcher.py`,
`sakura/ui/services/downloader.py`, `sakura/ui/services/process.py`,
`sakura/core/tools.py`, `sakura/core/formats.py`.

**Tests:** `test_search_page.py`, `test_downloader.py`, `test_process.py`,
`test_tools.py`, `test_formats.py`, `test_completion.py`.

---

## CU-02 · Resolver y descargar una playlist

**Actor:** Usuario. **Sistemas:** YouTube/yt-dlp, ffmpeg, sistema de archivos.

**Precondiciones**

- La URL contiene `youtube.com/playlist`, `music.youtube.com/playlist` o
  `youtube.com` con `list=`.
- Hay conexión a YouTube.

**Flujo principal**

1. El usuario pega la URL en el buscador.
2. `SearchPage` detecta la playlist con `is_playlist_url` y entra en modo
   playlist.
3. `PlaylistResolver` ejecuta `yt-dlp --flat-playlist --dump-json`: enumera sin
   descargar.
4. Cada video válido se emite como `SearchResult` y se muestra **numerado** en el
   orden de la lista. El número de Buscar coincide con el de la Cola.
5. Las entradas no descargables (privadas, eliminadas, con restricción de edad,
   bloqueadas por región) **no se muestran como tarjetas**, pero se cuentan por
   motivo (`hidden_found`). El estado dice, por ejemplo:
   `18 videos · 3 videos ocultos (2 privados, 1 con restricción de edad)`.
6. Al terminar, se habilita **Descargar todo** con el formato activo.
7. `MainWindow._on_download_all` encola cada resultado con
   `playlist_title = nombre de la playlist`.
8. `DownloadManager` usa la plantilla `%(playlist_title)s/%(title)s.%(ext)s`, así
   que todo cae en **una sola carpeta** con el nombre de la playlist, dentro de la
   biblioteca.
9. Los duplicados, reintentos, cancelación y resumen funcionan igual que en
   CU-01.

**Flujos alternativos**

- **Playlist sin videos accesibles:** no es un error; se explica cuántos quedaron
  ocultos y por qué.
- **Nombre de playlist ausente en el JSON:** se usa el canal del primer video como
  nombre de carpeta, en vez de una carpeta llamada `None`.
- **Fallo parcial de yt-dlp:** si ya se emitieron resultados, se consideran
  válidos y se muestra el total parcial.
- **El usuario cambia la consulta mientras resuelve:** se cancela el proceso de
  playlist y se limpian las tarjetas.

**Postcondiciones**

- Todos los videos elegidos quedan en `Biblioteca/<playlist>/`.
- El resumen de la playlist indica cuántos se bajaron y cuántos quedaron ocultos.

**Dónde está**

`sakura/ui/pages/search.py`, `sakura/ui/services/playlist.py`,
`sakura/core/tools.py`, `sakura/ui/services/downloader.py`.

**Tests:** `test_playlist.py`, `test_search_page.py`, `test_downloader.py`,
`test_tools.py`.

---

## CU-03 · Descargar un álbum del catálogo con revisión previa

**Actor:** Usuario. **Sistemas:** iTunes/Deezer, YouTube/yt-dlp, ffmpeg,
sistema de archivos.

**Precondiciones**

- Hay una búsqueda de texto con al menos un resultado (no aplica en modo
  playlist).
- El álbum existe en el catálogo.

**Flujo principal**

1. El usuario escribe el nombre del álbum y hace una búsqueda normal.
2. Con resultados, aparece **Traer álbum del catálogo**.
3. `tracks_album(query)` busca en iTunes (y cae a Deezer si iTunes no devuelve
   nada), agrupa por `album_id`, elige el grupo con más pistas y las ordena por
   número de pista.
4. `AlbumResolver.resolve_tracks` busca **cada pista** en YouTube con 5
   resultados por pista, en un hilo aparte. El estado muestra
   “Buscando 3 de 12…”.
5. `core/album_match.py` puntúa cada video:
   - duración contra la del catálogo (tolerancia 12 s, duda hasta 25 s);
   - similitud de título;
   - canal del artista o canal “- Topic”.
   Descarta compilaciones, mixes, directos, karaoke, covers, nightcore y videos
   de más de 15 minutos.
6. Se abre **Revisar álbum** con columnas: usar, número, pista del álbum, video
   elegido, duración y estado (`Coincide`, `Revisar`, `Sin match`) con el motivo.
   Las pistas sin match no se pueden marcar.
7. El usuario revisa, desmarca lo que no quiere y pulsa **Descargar lo elegido**.
8. `MainWindow._on_album_download` encola cada match con
   `enqueue_album_track(video, candidate, folder_path="Artista/Álbum")`.
9. Al terminar cada descarga, `_write_tags_album` escribe los tags del catálogo
   (álbum, año, género, número de pista), descarga la portada, la incrusta y deja
   `folder.jpg` en la carpeta del álbum si el ajuste está activo.
10. El archivo cae en `Biblioteca/Artista/Álbum/`.

**Flujos alternativos**

- **El catálogo no encuentra el álbum:** se muestra el error y no se encola nada.
- **Una pista no tiene match:** queda fuera de la selección; el resto sigue.
- **Una búsqueda de pista falla:** esa pista queda sin match, sin frenar el álbum.
- **Falla la portada o la escritura de tags:** el audio ya movido sigue siendo
  válido; el error de metadata no tumba la descarga.
- **El usuario cancela la revisión:** no se encola nada.

**Postcondiciones**

- Cada pista elegida queda con tags de catálogo y, si se pudo, portada embebida y
  `folder.jpg`.
- La cola muestra las pistas del álbum y el resumen final las cuenta.

**Dónde está**

`sakura/ui/pages/search.py`, `sakura/ui/services/album_resolver.py`,
`sakura/core/metadata_sources.py`, `sakura/core/album_match.py`,
`sakura/ui/widgets/album_review.py`, `sakura/ui/services/downloader.py`.

**Tests:** `test_album_match.py`, `test_album_review.py`, `test_artist_catalog.py`,
`test_metadata_sources.py`, `test_downloader.py`, `test_covers.py`.

---

## CU-04 · Elegir un álbum desde la discografía de un artista

**Actor:** Usuario. **Sistemas:** iTunes, YouTube/yt-dlp.

**Flujo principal**

1. El usuario busca un artista y pulsa **Ver álbumes del artista**.
2. `ArtistCatalog` busca artistas en iTunes y elige el primero; si hay varios,
   avisa cuántos parecidos encontró.
3. Pide los álbumes del artista y abre la discografía, del más nuevo al más
   viejo, con año, género y cantidad de pistas.
4. El filtro **Solo álbumes completos** viene activado: usa el nombre y la
   cantidad de pistas (4 o más es un disco; 3 es un maxi single). Al apagarlo se
   ve la discografía entera, incluidos singles, EPs y remixes.
5. Al elegir un álbum, se piden sus pistas por `album_id` y se sigue el mismo
   cruce y revisión que CU-03.

**Postcondiciones**

- El álbum elegido se encola con tags de catálogo, igual que CU-03.

**Dónde está**

`sakura/ui/services/album_resolver.py`, `sakura/ui/widgets/discography.py`,
`sakura/core/metadata_sources.py`.

**Tests:** `test_discography.py`, `test_artist_catalog.py`,
`test_metadata_sources.py`.

---

## CU-05 · Reanudar, reintentar y cerrar la cola

**Actor:** Usuario. **Sistemas:** yt-dlp, ffmpeg, sistema de archivos.

**Precondiciones**

- Hay trabajos pendientes, en curso, fallidos o cancelados.

**Flujo principal de reanudación**

1. La cola se persiste en `download_queue.json` cada vez que cambia un estado.
2. Al arrancar, `DownloadManager._load_jobs` restaura los trabajos guardados.
3. `MainWindow` agrega cada trabajo a la página Cola y llama a
   `resume_pending()`.
4. Los trabajos que estaban en curso al cerrar vuelven como **PENDING**, con
   `attempts = 0` y el error “Descarga interrumpida al cerrar la aplicación”.
5. `pump()` los vuelve a lanzar en los slots libres.

**Flujo principal de reintento**

1. El usuario puede reintentar **una fila** con su botón, o **todos** los errores
   con **Reintentar errores**.
2. `retry` solo acepta trabajos **FAILED** o **CANCELLED**; un trabajo listo o en
   curso no se reencola.
3. Se resetean intentos, bytes, velocidad y error; el trabajo vuelve a **PENDING**
   y se reparte a un slot.

**Flujo principal de cancelación y limpieza**

1. **Cancelar descargas** pide confirmación y cancela todo lo pendiente o en
   curso. Lo terminado no se toca.
2. **Limpiar terminados** saca de la vista y del gestor los trabajos con estado
   final; la numeración de la cola **no se renumera**.
3. Cuando no queda nada pendiente ni en curso, se muestra el resumen del lote:
   descargadas, con error, ya estaban y canceladas. Un lote formado solo por
   duplicados no abre la ventana.

**Flujo alternativo de cierre**

1. Al cerrar, `MainWindow.closeEvent` solo marca `_cerrando` y detiene el
   watcher.
2. `app.main()` llama a `window.shutdown()` **después** de que `exec()` vuelve.
3. `DownloadManager.shutdown()` corta procesos, borra stagings, deja los trabajos
   en **PENDING** y guarda la cola.
4. Los demás servicios (búsqueda, playlist, miniaturas, escaneo, letras,
   revisión) cancelan y esperan a sus hilos. Ningún `QThread` queda vivo cuando
   Qt se destruye.

**Postcondiciones**

- No se pierden trabajos reanudables.
- No quedan procesos de yt-dlp ni hilos colgados.
- El historial conserva el resultado final de cada trabajo.

**Dónde está**

`sakura/ui/services/downloader.py`, `sakura/ui/pages/queue.py`,
`sakura/ui/main_window.py`, `sakura/app.py`,
`sakura/core/download_history.py`.

**Tests:** `test_downloader.py`, `test_queue_page.py`, `test_completion.py`,
`test_download_history.py`, `test_main_window.py`.

---

## CU-06 · Escanear y mantener la biblioteca

**Actor:** Usuario. **Sistemas:** sistema de archivos, mutagen, SQLite.

**Precondiciones**

- La carpeta de biblioteca existe y tiene audio legible.

**Flujo principal: primer escaneo**

1. Al entrar a Biblioteca, `LibraryPage.rescan` valida la carpeta y limpia el
   modelo.
2. `LibraryScanner` lanza `_ScanWorker` en un `QThread`.
3. El worker recorre el árbol con `scan_paths`, abre el índice SQLite y carga las
   filas cacheadas.
4. Resuelve portadas y letras **una vez por carpeta**, no una vez por pista.
5. Lee los archivos con un `ThreadPoolExecutor` (2–8 workers según CPU) en
   ventanas acotadas; emite tandas de hasta 150 pistas.
6. Por cada pista: lee tags con mutagen, extrae la portada embebida a la caché,
   busca `folder.jpg`/`cover.*` y busca `.lrc`/`.txt` junto al audio.
7. Guarda en SQLite solo las filas nuevas o vencidas y poda las que ya no existen.
8. La UI muestra las tandas mientras llegan y, al terminar, el resumen:
   `N pistas · N álbumes · N artistas · N h`.

**Flujo principal: mantenimiento incremental**

1. Al terminar el primer escaneo, `LibraryWatcher` empieza a vigilar la carpeta y
   todas sus subcarpetas.
2. `QFileSystemWatcher` no es recursivo: el watcher registra cada subcarpeta y
   agrega las nuevas cuando aparecen.
3. Los eventos se agrupan con un debounce de **900 ms** para que copiar un álbum
   no dispare decenas de avisos.
4. `refresh_changes()` lanza `LibraryDeltaScanner`, que compara el disco contra el
   índice por `mtime_ns` + tamaño.
5. Solo relee altas y cambios; emite las pistas modificadas y las rutas borradas.
6. La UI reemplaza o quita filas sin reconstruir el modelo.
7. Si un cambio llega mientras hay un escaneo o refresco en curso, se marca
   `_changes_pending` y se reintenta al terminar.

**Flujos alternativos**

- **Carpeta inexistente:** se muestra “No se encontró la carpeta” y no se escanea.
- **Biblioteca vacía:** estado vacío ilustrado con acción para ir a Buscar.
- **Archivo ilegible:** se descarta del índice y se quita de la lista.
- **Índice corrupto:** se ignora y se escanea igual; el cache es descartable.
- **Error de escaneo:** se muestra el mensaje y se reintentan los cambios
  pendientes.

**Postcondiciones**

- La biblioteca refleja el disco.
- El índice queda consistente y el próximo arranque es rápido.
- Las descargas nuevas aparecen sin reescanear todo.

**Dónde está**

`sakura/ui/pages/library.py`, `sakura/ui/services/library.py`,
`sakura/core/library.py`, `sakura/core/library_index.py`,
`sakura/ui/services/watcher.py`.

**Tests:** `test_library.py`, `test_library_scanner.py`,
`test_library_delta.py`, `test_library_index.py`, `test_library_watcher.py`,
`test_library_page.py`, `test_folder_art.py`.

---

## CU-07 · Explorar la biblioteca

**Actor:** Usuario.

**Flujo principal**

1. El usuario elige una sección: **Canciones** o **Carpetas**.
2. Elige una vista: **Tabla**, **Cuadrícula**, **Mosaico**, **Estantería de
   álbumes**, **Discos de vinilo** o **Carrusel**.
3. La barra permite buscar por título, artista o álbum; ordenar por columna en la
   tabla; cambiar el zoom (70–160 %, pasos de 15) y la densidad (Compacta 0.85,
   Cómoda 1.0, Espaciosa 1.15).
4. Los chips **Todos / Sin tags / Sin portada / Duplicados** filtran sin salir de
   la página.
5. En **Carpetas** se navega el árbol con chips de subcarpetas y migas de pan
   clicables; **Volver** sube un nivel.
6. Al seleccionar una pista, el panel derecho muestra portada, título, artista,
   año, género, número de pista, letra, formato, duración, tamaño y ruta.
7. Si el ajuste de tema ambiente está activo, el acento cambia al color dominante
   de la portada seleccionada, con debounce de 220 ms.

**Flujos alternativos**

- **Vista oculta:** clic derecho en un botón de vista permite ocultarlo o mostrar
  todas. Siempre queda al menos una visible.
- **Sin resultados:** estado vacío con explicación.
- **Portada ausente:** se usa la de carpeta o un placeholder dibujado.

**Dónde está**

`sakura/ui/pages/library.py`, `sakura/ui/widgets/library_toolbar.py`,
`sakura/ui/widgets/library_views.py`, `sakura/ui/widgets/library_folders.py`,
`sakura/ui/models/track_model.py`, `sakura/ui/models/album_model.py`.

**Tests:** `test_library_page.py`, `test_track_model.py`, `test_album_model.py`,
`test_elided.py`, `test_covers.py`.

---

## CU-08 · Editar los metadatos de una pista

**Actor:** Usuario. **Sistemas:** iTunes/Deezer/MusicBrainz, sistema de archivos.

**Flujo principal**

1. Doble clic en una fila abre la **ficha** de la pista.
2. **Editar metadatos** abre el editor, que lee los tags al abrir y **no escribe
   nada hasta confirmar**.
3. El usuario puede escribir a mano título, artista, álbum, artista del álbum,
   año, género y número de pista, y elegir una portada local.
4. O puede pulsar **Buscar en catálogo**, elegir iTunes, Deezer, MusicBrainz,
   automático (iTunes + Deezer) o comparar todos, y seleccionar un candidato.
5. Al aplicar un candidato se llenan los campos y se prepara la portada. La
   portada se descarga antes de guardar; si falla, se conserva la actual.
6. **Guardar cambios** escribe los tags y la portada. Cancelar no toca el archivo.
7. La biblioteca relee la pista y actualiza fila, ficha, filtros y contadores.

**Flujo alternativo: aplicar a todo el álbum**

1. Con un candidato que tenga `album_id`, aparece **Aplicar a todo el álbum**.
2. Se pide el álbum completo al catálogo y se empareja por título normalizado
   contra los archivos de la misma carpeta.
3. Se aplican los tags y la portada a las pistas que coinciden; se informa
   cuántas quedaron etiquetadas y cuáles fallaron.

**Postcondiciones**

- El archivo tiene los tags y la portada elegidos.
- El índice SQLite y el modelo reflejan el cambio.

**Dónde está**

`sakura/ui/widgets/metadata_editor.py`,
`sakura/ui/services/metadata_search.py`, `sakura/core/metadata.py`,
`sakura/core/metadata_sources.py`.

**Tests:** `test_metadata.py`, `test_metadata_editor.py`,
`test_metadata_search.py`, `test_metadata_sources.py`, `test_track_info.py`.

---

## CU-09 · Etiquetar en lote y deshacer el lote

**Actor:** Usuario. **Sistemas:** sistema de archivos.

**Precondiciones**

- Hay dos o más pistas seleccionadas en la biblioteca.

**Flujo principal**

1. Al marcar más de una pista, la barra de selección muestra **Editar en lote**.
2. El diálogo permite completar artista, álbum, artista del álbum, año, género y
   número de pista. **Un campo vacío no se toca**: vacío significa “no cambiar”,
   no “borrar”.
3. **Aplicar a las pistas** recorre la selección, lee los tags actuales y escribe
   solo los campos informados.
4. Las pistas que ya tenían ese valor se cuentan como “sin cambios”; los errores
   se informan por pista.
5. Por cada campo que cambió se guarda un **manifiesto JSON** en
   `Historial/AAAAmmdd-HHMMSS-xxxxxx.json`, con el valor anterior y el nuevo.
   Se conservan los **20 manifiestos más nuevos**.
6. La biblioteca relee las pistas y actualiza la vista.

**Flujo principal de deshacer**

1. **Deshacer último lote** se habilita solo si hay un manifiesto legible.
2. Se pide confirmación con el resumen del lote.
3. `revert_batch` restaura los valores anteriores **solo si el archivo sigue con
   los valores que dejó el lote**. Si alguien lo reetiquetó por fuera, se saltea
   para no pisar ese cambio.
4. Si no hubo errores, el manifiesto se borra. La vista se refresca y se informa
   cuántas se restauraron y cuántas se saltearon.

**Flujos alternativos**

- **Manifiesto corrupto:** se descarta y se busca el anterior.
- **Archivo borrado:** se informa como error y se sigue con el resto.
- **Todos los campos vacíos:** no se escribe nada y no se crea manifiesto.

**Postcondiciones**

- Los tags quedaron aplicados o revertidos.
- El manifiesto permite auditar qué cambió cada lote.

**Dónde está**

`sakura/ui/widgets/batch_editor.py`, `sakura/core/tag_history.py`,
`sakura/ui/pages/library.py`, `sakura/core/metadata.py`.

**Tests:** `test_batch_editor.py`, `test_tag_history.py`, `test_metadata.py`,
`test_library_page.py`.

---

## CU-10 · Incrustar letras

**Actor:** Usuario. **Sistemas:** LRCLIB, sistema de archivos.

**Flujo principal**

1. El usuario pulsa **Buscar e incrustar letra** en la ficha o **Incrustar
   letras** en la barra de selección (una o varias pistas).
2. `LyricsEmbedder` corre en un `QThread` y emite progreso por pista.
3. Por cada pista, el orden de búsqueda es:
   1. un `.lrc` o `.txt` junto al audio (emparejado por nombre normalizado);
   2. una letra ya incrustada en el tag;
   3. **LRCLIB**, si no hay nada local.
4. Si encuentra letra, escribe el tag del formato y guarda/actualiza el archivo
   lateral como respaldo editable.
5. Al terminar, la biblioteca actualiza las filas y muestra un resumen:
   incrustadas, descargadas, ya tenían, no encontradas y con error.
6. Si todas fallaron, se muestran hasta cuatro mensajes de error.

**Flujos alternativos**

- **Letra local vacía:** se informa error y no se pisa nada.
- **Sin conexión:** LRCLIB falla; la pista queda “no encontrada” o “con error”,
  sin afectar a las demás.
- **Formato sin soporte de letra:** se informa el error de metadata.

**Postcondiciones**

- La letra queda en el tag y, si se pudo, en un `.lrc`/`.txt` lateral.

**Dónde está**

`sakura/ui/services/lyrics.py`, `sakura/core/lyrics.py`,
`sakura/core/library.py`, `sakura/core/metadata.py`.

**Tests:** `test_library.py`, `test_metadata.py`, `test_library_page.py`.

---

## CU-11 · Cambiar la apariencia

**Actor:** Usuario.

**Flujo principal**

1. En **Ajustes → Apariencia**, el usuario elige uno de los **14 temas**.
2. `SettingsPage` guarda `theme` en `config.json` y emite `theme_changed`.
3. `MainWindow.apply_theme` genera el QSS completo con `build_qss(theme)`, lo
   aplica a `QApplication`, cambia el icono de la ventana, ajusta el shell y
   repinta todos los widgets.
4. El shell del tema decide la navegación: `sidebar`, `dock`, `rail`, `top`,
   `tabs`, `bottom` o `split`.
5. El usuario puede activar **Tema desde la portada**: mientras está en
   Biblioteca, el acento sale del color dominante de la carátula seleccionada y
   al salir vuelve el tema base.
6. En **Iconos de la interfaz** puede reemplazar iconos por PNG propios, teñirlos
   con el tema y ver la vista previa antes de aplicar.
7. La densidad de la Biblioteca se cambia con el selector Compacta/Cómoda/
   Espaciosa; el zoom con los botones ±15 %.

**Flujos alternativos**

- **Tema guardado inexistente:** se cae al tema por defecto (`modern`).
- **PNG movido o borrado:** la app usa la copia estable en `Iconos/`.
- **Cambio de tema con la app abierta:** no se recrean widgets; se regenera el
  QSS y se refrescan los estilos inline.

**Postcondiciones**

- La preferencia queda persistida y se aplica en el próximo arranque.
- Ningún widget conserva colores del tema anterior.

**Dónde está**

`sakura/ui/pages/settings.py`, `sakura/ui/main_window.py`,
`sakura/ui/theme/`, `sakura/ui/widgets/icon_customizer.py`.

**Tests:** `test_theme.py`, `test_theme_contrast.py`, `test_theme_switch.py`,
`test_theme_ambient.py`, `test_settings.py`, `test_settings_ambient.py`,
`test_shells.py`, `test_icon_customizer.py`, `test_designs.py`.

---

## CU-12 · Configurar la app

**Actor:** Usuario.

**Flujo principal**

1. **Ajustes** agrupa las preferencias en Apariencia, Descargas, Biblioteca y
   Herramientas.
2. Cada cambio se guarda de forma atómica en `config.json` (`.tmp` + `replace`).
3. Los ajustes disponibles son:
   - tema, tema ambiente e iconos;
   - formato y calidad de descarga;
   - descargas simultáneas (1–4; con cookies siempre 1);
   - navegador para cookies de YouTube (Chrome, Edge, Firefox, Brave, Vivaldi);
   - carpeta de biblioteca y carpeta de descargas;
   - escribir `folder.jpg` en la carpeta del álbum;
   - actualizar yt-dlp con pip y FFmpeg con winget.
4. Cambiar la carpeta de biblioteca dispara un reescaneo; cambiar la de descargas
   solo cambia el destino de las próximas descargas.
5. El cambio de descargas simultáneas se aplica **al reiniciar**, porque los slots
   y procesos ya están creados.

**Flujos alternativos**

- **JSON corrupto:** se ignora y se usan los valores por defecto; la app arranca.
- **Clave desconocida:** se descarta al guardar; solo se persisten claves
  conocidas.
- **FFmpeg no instalado:** la actualización de FFmpeg informa el error y sigue
  con yt-dlp.

**Postcondiciones**

- Los ajustes quedan en `%LOCALAPPDATA%\SakuraMusic\config.json` (o la carpeta de
  datos efectiva).

**Dónde está**

`sakura/ui/pages/settings.py`, `sakura/config.py`,
`sakura/ui/services/downloader.py`, `sakura/core/tools.py`.

**Tests:** `test_config.py`, `test_settings.py`, `test_settings_ambient.py`,
`test_tools.py`, `test_downloader.py`.

---

## CU-13 · Consultar el historial de descargas

**Actor:** Usuario.

**Flujo principal**

1. Desde Cola, **Historial** abre el diálogo de descargas terminadas.
2. El historial guarda el resultado final de cada trabajo: descargada, con error,
   ya estaba o cancelada, con fecha, motivo, formato y ruta.
3. Se puede filtrar por estado y buscar por texto.
4. Se conservan las **1000 entradas más recientes**. Un reintento exitoso
   reemplaza la entrada anterior del mismo trabajo (`history_id`), no la duplica.
5. **Borrar historial** pide confirmación y elimina `download_history.json`.

**Postcondiciones**

- El usuario puede revisar qué pasó con una descarga aunque ya no esté en la cola.

**Dónde está**

`sakura/ui/widgets/download_history.py`, `sakura/core/download_history.py`,
`sakura/ui/pages/queue.py`.

**Tests:** `test_download_history.py`, `test_queue_page.py`.

---

## CU-14 · Arrancar con launcher y splash

**Actor:** Usuario.

**Flujo principal**

1. `python -m sakura` o `SakuraMusic.pyw` inicia `sakura.app.main`.
2. Se crea `QApplication`, se aplica el tema guardado, el QSS y el icono.
3. Si el launcher está habilitado, se muestra una pantalla con:
   - estado de la biblioteca (pistas y álbumes);
   - estado de la cola (pendientes o “se reanuda al abrir”);
   - herramientas (FFmpeg detectado y versión de yt-dlp).
4. **Abrir Sakura** crea la `MainWindow` y, si corresponde, la muestra en la
   página elegida.
5. Si el launcher está apagado, se muestra el splash de la flor mientras se arma
   la ventana.

**Flujos alternativos**

- `--no-launcher`: entra directo a la ventana principal.
- `SAKURA_NO_LAUNCHER=1`: ídem, por variable de entorno.
- `SAKURA_NO_SPLASH=1`: salta el splash.
- `QT_QPA_PLATFORM=offscreen`: no muestra launcher ni splash (tests/previews).
- `SAKURA_TRACE=1`: vuelca la pila a los 6 s si la app parece colgada.

**Postcondiciones**

- La ventana principal queda abierta y la cola se reanuda.

**Dónde está**

`sakura/app.py`, `sakura/ui/launcher.py`, `sakura/ui/splash.py`.

**Tests:** `test_launcher.py`, `test_splash.py`, `test_main_window.py`.

---

## CU-15 · Diagnosticar un fallo de descarga

**Actor:** Usuario. **Sistemas:** yt-dlp, ffmpeg, YouTube.

**Flujo principal**

1. La fila de Cola muestra el estado **Con error** y el motivo.
2. `friendly_error` traduce los errores habituales de yt-dlp: video privado, no
   disponible, restricción de edad, etc.
3. El usuario revisa la causa y decide:
   - instalar/actualizar FFmpeg;
   - elegir cookies de navegador para videos restringidos;
   - reintentar solo esa fila o todos los errores;
   - cancelar y limpiar.
4. Si el problema era temporal, el reintento vuelve a encolar el trabajo.

**Flujos alternativos**

- **FFmpeg ausente:** la app ni siquiera encola; avisa que hace falta para
  procesar medios.
- **yt-dlp ausente:** `ToolMissing` se muestra como error de herramienta.
- **Ruta de datos redirigida por Microsoft Store:** la app cae a
  `%USERPROFILE%\SakuraMusic` para que ffmpeg vea los archivos.
- **Cola guardada corrupta:** se avisa “No se pudo leer la cola guardada” y la app
  arranca vacía.

**Postcondiciones**

- El usuario entiende la causa y tiene una acción concreta.

**Dónde está**

`sakura/core/tools.py`, `sakura/ui/services/downloader.py`,
`sakura/ui/pages/queue.py`, `sakura/config.py`.

**Tests:** `test_tools.py`, `test_downloader.py`, `test_config.py`,
`test_process.py`.

---

## CU-16 · Extender la app

**Actor:** Desarrollador.

**Flujo principal**

1. Instala el entorno con `pip install -e .[dev]` y corre `python -m pytest`.
2. Para un **tema** nuevo, agrega un `Theme` en
   `sakura/ui/theme/palettes.py`, súmalo a `THEME_LIST` y verificá contraste con
   `test_theme_contrast.py`.
3. Para una **vista** nueva, agrega el delegate en
   `sakura/ui/widgets/track_delegates.py`, el widget en `library_views.py`, el
   botón en `VIEW_SPECS` y el orden en `VIEW_ORDER`.
4. Para una **fuente de catálogo** nueva, implementa el buscador en
   `core/metadata_sources.py`, sumalo a `MetadataSearch` y agregá fixtures en
   `tests/data/`.
5. Para un **servicio con hilo**, seguí el patrón `QObject` + `QThread`, señales
   de progreso/fin/error y un `shutdown()` que cancele y espere.
6. Actualizá el test correspondiente y la documentación afectada.

**Postcondiciones**

- La app sigue pasando lint y tests, y la documentación no queda mintiendo.

**Dónde está**

`docs/desarrollo.md`, `pyproject.toml`, `tests/`, `scripts/`.

**Tests:** la suite completa (`python -m pytest`).
