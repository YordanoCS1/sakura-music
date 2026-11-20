# Casos de uso

Un caso de uso describe **qué logra un actor usando Sakura Music**, no cómo está
implementado. Los flujos se escriben contra el código real de la v2: cuando una
regla vive en un módulo Rust o en `src/App.tsx`, se nombra el archivo.

## Actores

| Actor | Tipo | Qué quiere |
|---|---|---|
| **Usuario** | Persona | Buscar, descargar, ordenar y etiquetar su música local. |
| **Desarrollador** | Persona | Entender, probar y extender la app sin romper sus garantías. |
| **YouTube / yt-dlp** | Sistema externo | Resolver búsquedas, playlists y descargas. |
| **ffmpeg** | Sistema externo | Convertir a FLAC/MP3/M4A/Opus y embeber carátula. |
| **iTunes / Deezer / MusicBrainz** | Sistema externo | Proveer fichas y portadas HD (Cover Art Archive para MusicBrainz). |
| **Sistema de archivos** | Sistema externo | Guardar la biblioteca, descargas, caché y carátulas. |

## Resumen de casos de uso

| ID | Nombre | Actor principal | Resultado |
|---|---|---|---|
| CU-01 | Buscar y descargar una canción | Usuario | Archivo en la carpeta elegida, con progreso y ruta real |
| CU-02 | Resolver y descargar una playlist | Usuario | Todas las pistas elegidas bajadas una por una |
| CU-03 | Cancelar o reintentar descargas | Usuario | La fila refleja el nuevo estado sin perder el resto |
| CU-04 | Escanear la biblioteca | Usuario | Pistas listadas y caché regenerada |
| CU-05 | Explorar y reproducir | Usuario | Pista sonando sin bloqueo de archivos |
| CU-06 | Editar los metadatos de una pista | Usuario | Tags y portada escritos atómicamente |
| CU-07 | Etiquetar en lote | Usuario | Campos aplicados; errores parciales visibles |
| CU-08 | Buscar metadatos en el catálogo | Usuario | Campos y carátula HD aplicadas desde iTunes o Deezer |
| CU-09 | Cambiar la apariencia | Usuario | Efectos visuales aplicados y persistidos |
| CU-10 | Configurar la app | Usuario | Preferencias en `localStorage` |
| CU-11 | Diagnosticar un fallo | Usuario | Causa legible y acción siguiente (reintentar, instalar herramienta) |
| CU-12 | Extender la app | Desarrollador | Comando, tema, vista o formato nuevos sin romper tests |
| CU-13 | Crear y ordenar playlists | Usuario | Listas persistentes con pistas reordenables |
| CU-14 | Deshacer un borrado | Usuario | Archivo y fila restaurados desde la papelera |
| CU-15 | Ver letras sincronizadas | Usuario | Letra resaltada y con autoscroll mientras suena |
| CU-16 | Navegar con la paleta de comandos | Usuario | Acción ejecutada con ⌘K sin salir del teclado |
| CU-17 | Actualizar la app | Usuario | Nueva versión descargada, verificada e instalada |

---

## CU-01 · Buscar y descargar una canción

**Actor:** Usuario. **Sistemas:** YouTube/yt-dlp, ffmpeg, disco.

**Precondiciones:** `yt-dlp` detectado por `check_downloader_tools`; hay conexión.

**Flujo principal**

1. El usuario escribe en **Buscar** y pulsa Enter o el botón de búsqueda.
2. `App.tsx` llama `invoke('search_online', { query, requestId })`, que corre
   `yt-dlp --flat-playlist --print` con `ytsearch10:`. Cada resultado se envía
   al frontend conforme llega; al terminar se devuelven hasta 10 con título,
   canal, duración, miniatura y URL.
3. El usuario pulsa el botón de descarga de una tarjeta. Se usa el formato
   elegido (Opus, FLAC, M4A o MP3; por defecto FLAC en la v2).
4. `App.tsx` crea un `DownloadItem` en estado `en cola` con `job_id` único y
   llama `invoke('start_download', { jobId, url, format, outputDir })`.
5. El hilo Rust espera turno en `DownloadManager` (2 en paralelo), lanza
   `yt-dlp` con `--no-playlist`, `--windows-filenames`, `--socket-timeout 30`,
   `--retries 3`, `--continue`, `--print after_move:filepath` y el formato elegido.
6. yt-dlp emite líneas `sakuradl|pct|speed|eta|status`; cada una se reenvía
   como evento `download-progress` y la fila actualiza porcentaje, velocidad y
   ETA.
7. Al salir con código 0, el backend captura la ruta impresa
   (`after_move:filepath`) o busca el archivo por `[video_id]` en la carpeta
   destino, emite `completado` con `file_path`, y el frontend reescanea la
   carpeta para que la pista aparezca en Biblioteca.

**Flujos alternativos**

- **Sin `yt-dlp`:** la búsqueda y la descarga muestran el error legible; no se
  encola nada.
- **Fallo de red o de conversión:** la fila queda en `error: <última línea de
  stderr>` y ofrece **Reintentar**. yt-dlp ya reintentó 3 veces solo.
- **Video privado o restringido:** el error de yt-dlp llega a la fila tal cual.
  La v2 no tiene cookies de navegador (eso era la v1).

**Postcondiciones:** el archivo queda en la carpeta de descarga elegida
(carpetas de carpetas si venía de una playlist) con tags y carátula.

**Dónde está:** `src/hooks/useOnlineSearch.ts`, `src-tauri/src/downloader.rs`
(`search_youtube`, `resolve_playlist`, `execute_download`, `run_download`),
`src-tauri/src/lib.rs` (`search_online`, `start_download`).

---

## CU-02 · Resolver y descargar una playlist

**Actor:** Usuario. **Sistemas:** YouTube/yt-dlp, ffmpeg, disco.

**Flujo principal**

1. El usuario pega una URL de playlist (`playlist?list=...`, `/album/` o
   `list=`).
2. `App.tsx` detecta el patrón y llama `invoke('resolve_playlist', { url })`,
   que corre `yt-dlp --flat-playlist --print` con título de playlist. Devuelve
   título, canal, cantidad y pistas (título, canal, duración, miniatura, URL).
3. El panel muestra las pistas numeradas, con "Seleccionar todas" y desmarques
   individuales por casilla.
4. Al pulsar **Descargar N canciones**, cada pista seleccionada se encola como
   descarga individual (CU-01), cada una con `--no-playlist`. El usuario
   elige si respetar la subcarpeta de la playlist o bajar a la carpeta base.
5. Cada fila sigue su propio progreso; cancelar o reintentar una no afecta a
   las demás.

**Postcondiciones:** las pistas elegidas quedan en carpeta con el nombre de la
playlist (si se activó esa opción).

**Dónde está:** `src/App.tsx`, `src-tauri/src/downloader.rs`
(`resolve_playlist`), `src-tauri/src/lib.rs` (`resolve_playlist`).

---

## CU-03 · Cancelar o reintentar descargas

**Actor:** Usuario. **Sistema:** `DownloadManager`.

**Flujo de cancelación**

1. Cada fila activa ofrece un botón **X**. Al pulsarlo, `App.tsx` llama
   `invoke('cancel_download', { jobId })` y marca la fila como `cancelado`.
2. El backend marca el job como cancelado y mata el PID con el árbol completo
   (`taskkill /T /F` en Windows). Si el job aún esperaba turno, se marca y
   nunca arranca.
3. **Cancelar todo** cancela todas las filas no finales de una vez.
   **Limpiar terminadas** solo quita las filas ya finales.

**Flujo de reintento**

1. Cada fila en `error: ...` o `cancelado` ofrece **Reintentar** (`RotateCcw`).
2. Reintentar crea un job nuevo con los mismos datos (título, artista, URL,
   miniatura y formato actual) y lo encola de nuevo.

**Flujo de persistencia y reanudación**

1. Cada cambio de la cola (nueva fila, progreso, cancelación, reintento) se
   guarda en `download_queue.json` con escritura atómica (tope de 100 filas,
   las más recientes).
2. Al cerrar, el backend cancela y mata todo lo pendiente; la foto en disco
   conserva esos jobs como activos.
3. Al reabrir, `get_download_queue` restaura las filas; las que estaban en curso
   vuelven como `interrumpida` y el frontend las relanza con el mismo `id`,
   formato y carpeta destino, respetando el límite de 2 en paralelo.
4. El aviso "Se restauraron N descargas…" aparece en la Cola.

**Postcondiciones:** al cerrar la app, el evento `Exit` cancela y mata todo lo
pendiente, así que no quedan `yt-dlp` huérfanos. Al volver, nada se perdió:
cada fila conserva su historial y las interrumpidas siguen solas.

**Dónde está:** `src/App.tsx` (`cancelDownload`, `cancelAllDownloads`,
`retryDownload`, `triggerDownload`, restauración al montar, guardado tras
cada cambio),
`src-tauri/src/downloader.rs` (`cancel`, `cancel_all`, `is_cancelled`),
`src-tauri/src/lib.rs` (`cancel_download`, `cancel_all_downloads`,
`get_download_queue`, `save_download_queue`, `run`),
`src-tauri/src/queue.rs` (`load_queue`, `save_queue`, `reconcile_status`).

---

## CU-04 · Escanear la biblioteca

**Actor:** Usuario. **Sistemas:** disco, `lofty`, `rayon`.

**Flujo principal: primer escaneo**

1. Al elegir carpeta (explorador Tauri) o "Escanear Música de Windows",
   `App.tsx` llama `invoke('scan_library', { folderPath })`.
2. `lib.rs` autoriza la carpeta en el scope `asset:` y enumera con `walkdir`
   los archivos MP3, FLAC, M4A, Opus, OGG, WAV y AAC.
3. Compara tamaño y fecha de modificación con `library.sqlite3`; las pistas
   nuevas o modificadas se leen en paralelo con `rayon` y `lofty`.
   De cada una toma título, artista, álbum, artista del álbum, número de pista,
   duración, formato, año, género y carátula.
4. La carátula embebida se guarda en `covers/` con hash FNV-1a y extensión real
   (JPG/PNG/WebP/GIF/BMP/TIFF). Si no hay carátula embebida, se busca
   `folder.jpg`/`cover.*` en la carpeta padre.
5. SQLite guarda los cambios y quita del índice los archivos ausentes. La lista
   completa se devuelve al frontend, que muestra el total y permite filtrar por
   carpeta con breadcrumbs.

**Flujo de arranque con caché**

1. Al arrancar, `App.tsx` llama `invoke('get_cached_library')`.
2. `lib.rs` lee SQLite, autoriza las carpetas de cada pista y la devuelve. La
   caché anterior `library_cache.json` se importa una vez si existe.

**Postcondiciones:** la caché queda regenerada. Borrarla no pierde música.

**Dónde está:** `src-tauri/src/scanner.rs` (`list_audio_files`,
`file_fingerprint`, `scan_audio_file`), `src-tauri/src/library_db.rs`,
`src-tauri/src/lib.rs` (`scan_library`, `get_cached_library`) y
`src-tauri/src/paths.rs` (`library_db_file`).

---

## CU-05 · Explorar y reproducir

**Actor:** Usuario.

**Flujo principal**

1. En **Biblioteca**, el usuario elige entre nueve vistas: Carpetas, Cuadrícula,
   Tabla, Álbumes, Pared, CDs, 3D (Tilt), Luz (Glow) y Portadas. Puede buscar por
   título/artista/álbum y filtrar por carpeta con breadcrumbs.
2. Al hacer clic en una pista, `App.tsx` la carga con `fetch(convertFileSrc(path))`
   como Blob URL en memoria. El handle del sistema se libera de inmediato.
3. El reproductor inferior ofrece play/pausa, seek, volumen, mute, shuffle y
   repetición `off`/`all`/`one`. Al terminar, con repetición apagada no vuelve
   al inicio: se detiene o avanza solo si hay siguiente.
4. Mientras suena, el usuario puede abrir el editor y guardar tags: Windows no
   bloquea el archivo.

**Dónde está:** `src/App.tsx` (`handlePlayTrack`, `handleNextTrack`,
`handleSongEnded`, `getCoverSrc`).

---

## CU-06 · Editar los metadatos de una pista

**Actor:** Usuario. **Sistema:** disco (`lofty`).

**Flujo principal**

1. El usuario abre el editor desde la tarjeta, la fila o el reproductor.
2. El editor lee los tags actuales y **no escribe nada hasta confirmar**.
3. Edita título, artista, artista del álbum, álbum, número de pista, año,
   género y carátula (archivo local, `Ctrl+V` o eliminar). Cada campo editado
   ofrece reversión individual.
4. Al **Guardar**, `App.tsx` llama `invoke('update_track_metadata', ...)`.
   `lib.rs` delega a `scanner::update_track_tags`, que ensambla los tags en RAM
   y escribe atómicamente (temporal + rename, 4 reintentos, quita solo-lectura
   si hace falta).
5. La pista reescaneada actualiza fila, caché y filtros sin reescanear todo.

**Postcondiciones:** cancelar no toca el disco; guardar es todo o nada por pista.

**Dónde está:** `src-tauri/src/scanner.rs` (`update_track_tags`),
`src-tauri/src/lib.rs` (`update_track_metadata`), `src/App.tsx` (modal del
editor).

---

## CU-07 · Etiquetar en lote

**Actor:** Usuario. **Sistema:** disco (`lofty`).

**Precondiciones:** dos o más pistas seleccionadas (casillas en Cuadrícula o
Tabla).

**Flujo principal**

1. La barra de selección muestra **Editar en lote (N)**.
2. El modal permite marcar por campo: artista, álbum, artista del álbum, año,
   género y carátula compartida. Un campo desmarcado **no se toca**.
3. Al aplicar, `App.tsx` llama `invoke('update_batch_metadata', ...)`, que
   devuelve `{ updated, errors }`.
4. La UI actualiza solo las pistas que salieron en `updated` y, si hay errores,
   muestra "Se actualizaron N y M fallaron: …" (las 3 primeras razones). No
   muestra éxito total por un éxito parcial.

**Postcondiciones:** las rutas fallidas quedan intactas y visibles en el mensaje.

**Dónde está:** `src-tauri/src/scanner.rs` (`update_batch_tags`,
`BatchUpdateResult`), `src-tauri/src/lib.rs` (`update_batch_metadata`),
`src/App.tsx` (`handleBatchSave`).

---

## CU-08 · Buscar metadatos en el catálogo

**Actor:** Usuario. **Sistemas:** iTunes, Deezer, MusicBrainz, Cover Art Archive.

**Flujo principal**

1. En el editor (o en el lote), el usuario escribe artista + título y elige
   fuente: **Apple Music (iTunes)**, **Deezer** o **MusicBrainz**. Antes,
   "Deezer" pedía iTunes; hoy cada uno consulta su API. También puede explorar
   un álbum y aplicar sus pistas.
2. El editor invoca `search_catalog_songs` / `search_catalog_albums` (y
   `open_catalog_album` para abrir un álbum). Esos comandos viven en
   `src-tauri/src/catalog.rs` y hacen el `fetch` desde Rust con `reqwest` y un
   User-Agent propio: Deezer no envía cabeceras CORS y MusicBrainz exige
   identificación, así que el frontend no puede llamarlos directo. Muestran
   resultados con carátula, artista, álbum, año y género.
3. **Aplicar todo** rellena campos y prepara la carátula HD (600x600 en iTunes;
   `cover_xl`/`cover_big`/`cover_medium` en Deezer). **Solo portada** deja los
   textos intactos.
4. La carátula elegida se guarda vía `save_temp_cover` (extensión detectada por
   firma, escritura atómica) y se incrusta al guardar.

**Dónde está:** `src/hooks/useMetadataEditor.ts` (`searchCatalog`,
`applyCandidate`, búsqueda y apertura de álbumes), `src-tauri/src/catalog.rs`
(`search_catalog_songs`, `search_catalog_albums`, `open_catalog_album`),
`src-tauri/src/lib.rs` (`save_temp_cover`).

---

## CU-09 · Ajustar la apariencia

**Actor:** Usuario.

**Flujo principal**

1. La app ofrece **14 temas, todos propios**: **Estudio** (`space`, "Consola de
   mezcla y medidores VU") y Sumi-e, Byōbu, Shōji, Origami, Swiss, Sumi Ink,
   Moonlit, Ledger, Shōnen, Fantasmas, Samurái, Kawaii y **Manga**. En Ajustes
   se elige uno. Estudio fija `data-theme="space"` y aplica además
   `data-skin="space"`: muestra Home tipo consola (`EST·01`, medidor VU, rack de
   canales con faders), biblioteca en canales con fader y VU, navegación negra
   con glifo ◎ y acento ámbar `#f0a23c`, y estilo propio en Buscar, Cola,
   Ajustes, panel "Ahora suena", playlists, paleta ⌘K, estadísticas, modales de
   metadatos, splash y transición `t-estudio`. Su paleta es grafito `#15181a`,
   panel `#1d2226`, verde LED `#7ee081` y texto `#f2ede6`, con tipografía
   monospace. Los otros temas usan `data-skin={tema}` con `ThemeLibrary`/
   `ThemeHome`/`ThemeNav` propios. Manga ("Viñetas, tinta y screentone") muestra
   una portada de revista en Inicio y páginas de viñetas en biblioteca, con papel
   `#fbfaf7`, tinta `#101010` y acento rojo `#d62828`. El valor se persiste en
   `sakura_theme`; `ThemeMode` reúne los 14 identificadores. `LibraryTab` y
   `ZenTopNav` siguen en el código sólo como fallback para temas importados.
2. Los valores de superficie (`--m3-surface`, `--m3-primary`, etc.) y los
   `--accent-*` de `App.css` definen la paleta; Tailwind mapea `accent-*` a esas
   variables, así que toda la UI usa la misma identidad. Cada tema propio
   redefine además cabecera, Buscar, Cola, ajustes, diálogos, transiciones,
   iconos y splash.
3. En **Ajustes** se elige el tema y se ajustan los efectos: opacidad/blur del
   vidrio, resplandor ambiental, partículas y estilo del reproductor (flotante/fijo/mini).
   Se persisten en `localStorage` (`sakura_*`). El glifo del splash hace handoff
   continuo al logo de la navegación con `view-transition-name: sakura-glifo`.

**Dónde está:** `src/types.ts` (`ThemeMode`), `src/App.tsx`
(`data-theme`), `src/App.css` (bloques `[data-skin='id']`, `IDENTIDAD POR TEMA`),
`src/components/ThemeLibrary.tsx`, `ThemeHome.tsx`, `ThemeNav.tsx`,
`tailwind.config.js` (paleta `accent-*`).

---

## CU-10 · Configurar la app

**Actor:** Usuario.

**Flujo principal**

1. Las preferencias viven en `localStorage` con claves `sakura_*`: tema
   (`sakura_theme` = `space`), vista, estilo de reproductor, opacidad/blur, glow,
   partículas, carpeta actual y favoritos.
2. La carpeta de música por defecto se pide al backend
   (`get_default_music_dir` → `app.path().audio_dir()`), nunca asumiendo
   `USERPROFILE`.
3. La información técnica de Ajustes es real: `get_app_info` devuelve motor
   Tauri, versión de `rustc` (vía `build.rs`) y memoria del proceso (Windows,
   con `windows-sys`). Los fallbacks de la UI son `—`.

**Dónde está:** `src/App.tsx`, `src-tauri/src/lib.rs` (`get_app_info`,
`get_default_music_dir`).

---

## CU-11 · Diagnosticar un fallo

**Actor:** Usuario. **Sistemas:** yt-dlp, ffmpeg, YouTube.

**Flujo principal**

1. La fila de Cola muestra el estado (`error: <stderr>`, `cancelado`,
   `completado`) con porcentaje, velocidad y ETA mientras corre.
2. El usuario lee la causa y decide: reintentar esa fila, cancelar todo, o
   instalar/actualizar la herramienta faltante.
3. Las herramientas se detectan en varios lugares; si faltan, la UI los
   informa por nombre y ruta en Cola y Ajustes.

**Dónde está:** `src-tauri/src/downloader.rs` (`get_status`,
`find_ytdlp_binary`, `find_ffmpeg_binary`), `src/App.tsx` (pestañas Cola y
Ajustes).

---

## CU-12 · Extender la app

**Actor:** Desarrollador.

**Flujo principal**

1. Instalá con `npm install` y verificá con `cargo test` + `tsc --noEmit`.
2. Para un **comando** nuevo, agregalo en `src-tauri/src/lib.rs`, registralo en
   `invoke_handler!` y consumilo con `invoke` desde `App.tsx`. Mapeá errores
   como `String`.
3. Para un **tema importado** (único caso genérico), agregá su bloque
   `[data-skin='...']` y sus tokens `--m3-*` en `App.css` y el valor en
   `ThemeMode` (`src/types.ts`); reutiliza `LibraryTab`. Para un **tema propio**,
   además creá sus `ThemeLibrary`/`ThemeHome`/`ThemeNav` con diálogos,
   transiciones, iconos y splash propios (los 14 oficiales lo son, incluido
   Estudio); `manga` es arquetipo disponible en
   `ThemeGeneratorModal`/`customThemes.ts`.
4. Para una **vista** nueva, agregá `ViewMode` y una rama en `LibraryTab.tsx` sin
   antiparse con las otras vistas.
5. Para un **formato** nuevo, sumá la rama en `run_download` (`downloader.rs`).
6. Para una **fuente de catálogo**, sumá la rama en los comandos de
   `src-tauri/src/catalog.rs` y habilitá el host en el `connect-src` del CSP de
   `tauri.conf.json`.
7. Actualizá el requisito afectado y, si hay decisión estructural, sumá un ADR.

**Dónde está:** `docs/desarrollo.md`.

**Tests:** `npm test` (58 Vitest), `npm run test:e2e` (32 Playwright),
`cargo test` (46 Rust) y `npm run pipeline` (pasa en verde).

---

## CU-13 · Crear y ordenar playlists

**Actor:** Usuario.

**Precondiciones:** hay pistas en la biblioteca.

**Flujo principal**

1. El usuario abre la pestaña **Listas** (o pulsa ⌘K y elige *Listas*).
2. Pulsa **Nueva lista**, escribe el nombre y confirma: el comando
   `create_playlist` crea la fila en `playlists`.
3. Arrastra o agrega pistas desde la biblioteca con `playlist_add_tracks`;
   `get_playlist` muestra el detalle ordenado.
4. Reordena con las flechas (`playlist_reorder`), quita una pista
   (`playlist_remove_track`), renombra (`rename_playlist`) o borra la lista
   (`delete_playlist`). Con `foreign_keys=ON` y `ON DELETE CASCADE`, borrar la
   lista limpia `playlist_tracks`.

**Flujos alternativos**

- **Sin pistas:** el panel muestra un `EmptyState` con la acción de escanear.
- **Tema propio:** el panel adopta los estilos del tema; Swiss, Shōnen, Kawaii,
  Fantasmas, Luna y Samurái tienen variantes explícitas.

**Postcondiciones:** la lista persiste en SQLite y se reabre igual al reiniciar.

**Dónde está:** `src/components/PlaylistsPanel.tsx`, `src/App.tsx`,
`src-tauri/src/playlists.rs`, `src-tauri/src/lib.rs` (comandos de playlist).

---

## CU-14 · Deshacer un borrado

**Actor:** Usuario. **Sistema:** sistema de archivos, SQLite.

**Flujo principal**

1. El usuario borra una pista desde la biblioteca. `delete_library_track` no
   la elimina: la mueve a `<datos>/trash` y guarda la fila en `deleted_tracks`
   con un token.
2. Aparece `UndoToast` con un botón **Deshacer** y una cuenta regresiva de
   9 segundos.
3. Si toca **Deshacer**, `restore_deleted_track` devuelve el archivo a su ruta
   original y reinserta la fila en la biblioteca.
4. Si expira, el archivo queda en la papelera. `trash_count` muestra el
   contador en Ajustes → Sistema y `empty_trash` borra definitivamente.

**Flujos alternativos**

- **Ya restaurado:** el token deja de ser válido y el toast se cierra.
- **Varios borrados:** cada uno tiene su propio token y su propio toast.

**Postcondiciones:** no se pierde música por un borrado accidental dentro de
los 9 segundos; el borrado definitivo es explícito.

**Dónde está:** `src/components/UndoToast.tsx`, `src-tauri/src/lib.rs`
(`delete_library_track`, `restore_deleted_track`, `empty_trash`, `trash_count`),
`src-tauri/src/library_db.rs`.

---

## CU-15 · Ver letras sincronizadas

**Actor:** Usuario. **Sistema:** archivos `.lrc` locales.

**Precondiciones:** existe un `.lrc` (o `.LRC`) junto al audio.

**Flujo principal**

1. El usuario abre el panel **Ahora suena** y elige la pestaña **Letras**
   (`NowPlayingPanel.tsx`).
2. `read_lyrics` busca el archivo y `lyrics.rs` lo parsea: acepta varios
   timestamps por línea y metadatos `[ar:...]`, y devuelve líneas con tiempo en
   segundos.
3. Mientras suena, la línea activa se resalta y el panel hace autoscroll
   siguiendo `currentTime`.
4. El usuario puede pasar a **Detalles**, **Álbum** o **Artista** sin perder la
   posición de reproducción.

**Flujos alternativos**

- **Sin `.lrc`:** la pestaña muestra un estado vacío con una acción concreta;
  no se consulta ningún servicio externo.

**Postcondiciones:** la letra acompaña a la pista sin bloquear el archivo.

**Dónde está:** `src/components/NowPlayingPanel.tsx`, `src-tauri/src/lyrics.rs`,
`src-tauri/src/lib.rs` (`read_lyrics`).

---

## CU-16 · Navegar con la paleta de comandos

**Actor:** Usuario.

**Flujo principal**

1. El usuario pulsa `Ctrl+K` / `⌘K`: se abre `CommandPalette` sobre el tema
   activo.
2. Escribe para filtrar; con ↑↓ recorre las acciones (navegar a las 6
   pestañas, cambiar tema, reproducir/pausar, buscar pistas).
3. Pulsa ↵ para ejecutar o Esc para cerrar. Acciones como *Listas* y
   *Biblioteca* cambian `activeTab` de `AppTab`.

**Flujos alternativos**

- **Sin resultados:** la paleta muestra un mensaje y mantiene el foco en el
  campo de búsqueda.

**Postcondiciones:** la acción se ejecuta sin sacar las manos del teclado.

**Dónde está:** `src/components/CommandPalette.tsx`, `src/App.tsx`
(`activeTab`), `src/types.ts` (`AppTab`).

---

## CU-17 · Actualizar la app

**Actor:** Usuario. **Sistemas:** GitHub Releases, plugins `updater`/`process`.

**Precondiciones:** hay una versión publicada con el endpoint y la clave
pública configurados (`REPLACE_OWNER/REPLACE_REPO` ya reemplazado).

**Flujo principal**

1. En Ajustes → Sistema, `SystemPanel` muestra **Buscar actualizaciones**.
2. El plugin `updater` consulta `latest.json` y compara con la versión actual.
3. Si hay una nueva, el usuario pulsa **Instalar \<versión\>**. El bundle se
   descarga, se verifica con la clave pública y se instala con el plugin
   `process`.
4. Se muestra el estado de la actualización; los logs quedan visibles en el
   mismo panel (redactados).

**Flujos alternativos**

- **Firma inválida:** la instalación se rechaza y se informa el error.
- **Sin red:** se muestra el error y se puede reintentar más tarde.

**Postcondiciones:** la app queda en la nueva versión; el binario anterior se
reemplaza sin perder la carpeta de datos (biblioteca, playlists y papelera).

**Dónde está:** `src/components/SystemPanel.tsx`, `src-tauri/tauri.conf.json`
(updater, clave pública, `nsis`/`msi`), `.github/workflows/release.yml` y
[release.md](release.md) con los secrets de firma.
