# Requisitos

Un requisito acá es una promesa verificable de la app, no un deseo. Cada uno
tiene un identificador estable y un criterio de aceptación comprobable. Cuando
existe un test que lo cubre, se nombra el archivo.

Los identificadores de la v1 que ya no aplican quedaron listados al final de
este documento (con fecha y motivo). **No se renumeran.**

## Cómo leer la trazabilidad

- **Criterio:** qué tiene que pasar para considerar el requisito cumplido.
- **Test:** `cargo test` (Rust) o `tsc --noEmit` (tipos). Hoy la suite es **9
  tests Rust**; el frontend no tiene tests automatizados (deuda conocida).
- Si un requisito depende de red o de un binario externo, no se testea en la
  suite: se verifica a mano con `yt-dlp`/`ffmpeg` reales.

---

## Requisitos funcionales

### Búsqueda y descargas

#### RF-01 · Buscar en YouTube desde la app

**Criterio:** al buscar, la app ejecuta `yt-dlp --flat-playlist --print` con
`ytsearch10:` y muestra hasta 10 resultados con título, canal, duración,
miniatura y URL. Si `yt-dlp` no existe, el error se muestra en la UI, no crashea.

**Test:** `downloader::tests::parsea_linea_de_busqueda`,
`downloader::tests::ignora_lineas_incompletas_o_na`.

#### RF-02 · Elegir formato de descarga

**Criterio:** la UI ofrece Opus, FLAC, M4A/AAC y MP3. El backend mapea:
Opus/FLAC → `--audio-quality 0`; M4A → `m4a` 192 kbps; resto → MP3 320 kbps.
Siempre con `--embed-thumbnail --add-metadata`.

**Test:** `downloader::tests::parsea_progreso` (progreso por formato no aplica;
el mapeo se verifica con descargas reales, fuera de la suite).

#### RF-03 · Cola con máximo 2 descargas y cancelación real

**Criterio:** `DownloadManager::new(2)` permite 2 descargas simultáneas; la
tercera espera turno. `cancel_download(job_id)` mata el proceso (árbol completo
en Windows) y deja la fila en `cancelado`. `cancel_all_downloads` hace lo mismo
para toda la cola. Al cerrar la app, el evento `Exit` cancela todo.

**Test:** `downloader::tests::extrae_id_de_urls_conocidas` (el mecanismo de
turnos/cancelación no tiene test de concurrencia: deuda conocida).

#### RF-04 · Resolver playlists sin descargarlas primero

**Criterio:** una URL de playlist se enumera con `yt-dlp --flat-playlist` y se
muestran título, canal, cantidad y pistas. "Descargar N canciones" encola cada
pista; cada descarga suelta usa `--no-playlist` para no bajar la lista entera
por accidente.

**Test:** `downloader::tests::parsea_linea_de_busqueda` (incluye `--print`
con `%(playlist_title)s`).

#### RF-05 · Reportar la ruta real del archivo descargado

**Criterio:** yt-dlp imprime `after_move:filepath`; el backend captura esa línea
y emite `file_path`. Si no aparece, busca en la carpeta destino el archivo más
reciente que contenga `[video_id]`. Al completar a `100 %`, la fila muestra la
ruta y la biblioteca se reescanea.

**Test:** `downloader::tests::extrae_id_de_urls_conocidas`.

#### RF-06 · Reintentar desde la UI

**Criterio:** cada fila en error o cancelada ofrece botón de reintento (ícono
`RotateCcw`). Reintentar crea un job nuevo con los mismos datos. "Limpiar
terminadas" solo saca filas finales; "Cancelar todo" solo toca las activas.

**Test:** verificación manual (no hay tests de frontend).

#### RF-07 · Detectar herramientas externas

**Criterio:** `check_downloader_tools` busca `yt-dlp` y `ffmpeg` en la carpeta
de datos `bin/`, rutas históricas de la v1, enlaces de winget y `PATH`, y
devuelve disponibilidad + rutas. Sin `yt-dlp`, buscar y descargar fallan con
mensaje legible.

**Test:** `downloader::tests::*` cubren parsing; la detección de binarios se
verifica manualmente.

### Biblioteca

#### RF-08 · Escanear carpetas en paralelo

**Criterio:** `scan_library` recorre con `walkdir` (sigue symlinks) y procesa
pistas nuevas o modificadas con `rayon`, comparando tamaño y fecha de
modificación con SQLite. Un vigilante recursivo agrupa cambios del sistema de
archivos y actualiza la biblioteca; solo entran MP3, FLAC, M4A, Opus, OGG, WAV y
AAC. Carpeta inexistente → error explícito sin modificar el índice.

**Test:** `library_db::tests::scan_sync_actualiza_y_quita_pistas_ausentes`,
`library_db::tests::scan_de_otra_carpeta_reemplaza_la_biblioteca_activa`.

#### RF-09 · Cachear y restaurar la biblioteca

**Criterio:** `scan_library` persiste las pistas en `library.sqlite3`;
`get_cached_library` la devuelve al arrancar y autoriza en el scope `asset:`
todas las carpetas de las pistas. La caché anterior `library_cache.json` se
importa una vez y se conserva.

**Test:** `library_db::tests::scan_sync_actualiza_y_quita_pistas_ausentes`.

#### RF-10 · Extraer carátulas con extensión real

**Criterio:** la portada embebida se guarda en `covers/` con hash FNV-1a de 128
bits y extensión según MIME oficial (`png`/`webp`/`gif`/`bmp`/`tiff`) o, si no,
según firma real (`detect_image_ext`). Nunca se fuerza `.jpg` a un PNG.

**Test:** `scanner::tests::detecta_extension_por_firma`.

#### RF-11 · Explorar con cuatro vistas y filtro por carpeta

**Criterio:** Biblioteca ofrece Carpetas (con breadcrumbs), Cuadrícula, Tabla y
Álbumes. El buscador filtra por título/artista/álbum; navegar carpetas con
breadcrumbs filtra el resto de vistas. La vista y el tema se persisten en
`localStorage`.

**Test:** verificación manual (no hay tests de frontend).

#### RF-12 · Reproducir sin bloquear el archivo

**Criterio:** el audio se carga vía `asset:` + Blob URL y el handle se libera
de inmediato. Editar tags, renombrar o cambiar carátula suena sin error de
acceso denegado. `repeatMode='off'` no vuelve al inicio al terminar la última
pista.

**Test:** verificación manual.

### Metadatos

#### RF-13 · Editar una pista con escritura atómica

**Criterio:** `update_track_metadata` lee tags con `lofty` en RAM y escribe con
`write_atomic` (temporal + rename, 4 reintentos, quita el flag de solo-lectura).
La caché se sincroniza en el mismo acto. Cancelar no toca el disco.

**Test:** `scanner::tests::escritura_atomica_reemplaza_y_no_deja_temporales`.

#### RF-14 · Editar en lote sin fingir éxito

**Criterio:** `update_batch_metadata` devuelve `{ updated, errors }`. La UI
muestra "Se actualizaron N y M fallaron: …" y **no** abre el modal de éxito si
hay errores. Los campos no marcados no se tocan. El título no entra al lote.

**Test:** tipos (`tsc`) + verificación manual del contrato.

#### RF-15 · Buscar metadatos en iTunes y Deezer

**Criterio:** el editor consulta la API real de iTunes (`itunes.apple.com`) o
de Deezer (`api.deezer.com/search`) según el selector, y aplica carátula HD
(600x600 en iTunes, `cover_xl/big/medium` en Deezer). La opción "Deezer" ya
**no** consulta iTunes.

**Test:** verificación manual (CSP habilita ambos hosts).

#### RF-16 · Portadas temporales sin acumulación

**Criterio:** `save_temp_cover` detecta la extensión real por firma y escribe
atómicamente. `cleanup_temp_covers` borra `temp_*` al arrancar y antes de cada
guardado. La carpeta `covers/` no crece sin control entre sesiones.

**Test:** `scanner::tests::detecta_extension_por_firma` +
`scanner::tests::escritura_atomica_reemplaza_y_no_deja_temporales`.

### Apariencia

#### RF-17 · Temas que recolorean toda la UI

**Criterio:** los 10 temas (Sakura, Cyan, Ámbar, Jade, Glass, Vinilo, Cyberpunk,
Jazz Club, Editorial Hi-Fi y Shanshui)
cambian las variables `--accent-200…950` y la apariencia correspondiente.
Cambiar de tema recolorea acentos, fondos, superficies y reproductor al instante y se
persiste en `localStorage` (`sakura_theme`).

**Test:** `tsc --noEmit` + `npm run build` (verifica que Tailwind genera las
clases `accent-*`).

#### RF-18 · Universos visuales Sakura Zen y Wuxia Jianghu

**Criterio:** el selector de mundo cambia fondos, glows, títulos, partículas y
nombres ("Sakura Music" vs "Wuxia Jianghu") sin perder el tema de color activo.
Se persiste en `localStorage` (`sakura_theme_world`).

**Test:** verificación manual.

#### RF-19 · Persistir la cola y reanudar al abrir

**Criterio:** cada cambio de la cola se guarda en
`download_queue.json` (carpeta de datos, escritura atómica, tope de 100 filas).
Al arrancar, `get_download_queue` la restaura; las que estaban en curso
(`en cola`/`descargando`/`convirtiendo audio`) vuelven como `interrumpida` y
el frontend las relanza con el mismo id, formato y carpeta destino. Archivo
ausente o corrupto → cola vacía, sin romper el arranque.

**Test:** `queue::tests::reconcilia_estados_activos_a_interrumpida`,
`queue::tests::conserva_estados_finales`,
`queue::tests::roundtrip_json_con_campos_necesarios`,
`queue::tests::json_corrupto_no_rompe_y_devuelve_vacio`.

---

## Requisitos no funcionales

#### RNF-01 · Interfaz responsiva

**Criterio:** escaneo, tags y descargas corren en Rust (hilos/`rayon`/procesos),
nunca en la WebView. La UI solo reacciona a `invoke` y al evento
`download-progress`.

**Test:** `cargo check` sin warnings; revisión de código.

#### RNF-02 · Escritura atómica y reintentos

**Criterio:** tags, caché y portadas pasan por `write_atomic` con 4 reintentos
y pausa lineal. Sin temporales huérfanos tras un éxito.

**Test:** `scanner::tests::escritura_atomica_reemplaza_y_no_deja_temporales`.

#### RNF-03 · Seguridad: CSP y asset scope acotado

**Criterio:** `tauri.conf.json` define CSP estricta (no `null`) y scope
`["$AUDIO/**", "$APPLOCALDATA/**", "$TEMP/**"]`. Las carpetas elegidas por el
usuario se autorizan en runtime (`allow_directory`). `connect-src` limita la
red a iTunes/Deezer + IPC.

**Test:** revisión de `tauri.conf.json`; `npm run build` + `cargo test`
pasan con la CSP activa.

#### RNF-04 · Carpeta de datos estable

**Criterio:** la carpeta de datos es `app.path().app_local_data_dir()` fijada
una vez en `paths::init`. El fallback a `.tauri_data` solo aplica en tests.
Nunca se usa el directorio de trabajo como carpeta de datos en producción.

**Test:** revisión de `src-tauri/src/paths.rs` y `lib.rs::run`.

#### RNF-05 · Sin rutas de usuario hardcodeadas

**Criterio:** ninguna búsqueda de binarios apunta a un path absoluto personal.
El downloader y el scanner no contienen literales tipo `C:\Users\<usuario>`.

**Test:** `grep` de `Users\` en `src-tauri/src/` queda vacío.

#### RNF-06 · Versiones reales, nunca literales

**Criterio:** `get_app_info` devuelve la versión real de `rustc` (inyectada por
`build.rs` con `rustc --version`) y memoria real del proceso (Windows, con
`windows-sys`). Los fallbacks de la UI son `—`, no ejemplos.

**Test:** `node node_modules/typescript/bin/tsc --noEmit` (campos `AppInfo`
tipados).

#### RNF-07 · Dependencias fijadas y auditables

**Criterio:** `src-tauri/Cargo.lock` está commiteado (es una app, no una
librería) y `package.json` declara React 19.1, TypeScript ~6.0, Vite 8 y
Tailwind 3.4. La configuración documentada coincide con el código.

**Test:** `npm run build` + `cargo test`.

#### RNF-08 · Documentación sincronizada

**Criterio:** un cambio de comportamiento actualiza su requisito y su criterio
en el mismo commit. Una decisión estructural suma un ADR nuevo. El `README`
enlaza a `docs/`.

**Test:** revisión manual.

---

## Matriz de trazabilidad resumida

| Módulo | Requisitos | Tests |
|---|---|---|
| Búsqueda y descargas | RF-01 … RF-07 | `cargo test` (5 tests de `downloader`), manual |
| Biblioteca y reproducción | RF-08 … RF-12 | `cargo test` (4 tests de `scanner`), manual |
| Metadatos y catálogo | RF-13 … RF-16 | `cargo test` + `tsc`, manual |
| Apariencia | RF-17 … RF-18 | `tsc` + `npm run build`, manual |
| Transversales | RNF-01 … RNF-08 | suite completa |

## Requisitos retirados (v1)

| ID v1 | Qué era | Cuándo / por qué |
|---|---|---|
| RF-04 (v1) | Saltar duplicados en la cola | Retirado en la v2: hoy cada descarga es un job independiente reintentable |
| RF-09, RF-10 (v1) | Cola persistente e historial de 1000 entradas | Reemplazados por RF-19 (persistencia acotada a 100) y sin historial separado |
| RF-12, RF-13 (v1) | Índice SQLite `mtime_ns` + watcher incremental | Retirado: ahora hay caché JSON descartable + escaneo completo |
| RF-20, RF-22, RF-23 (v1) | Aplicar álbum, deshacer con manifiestos, letras LRCLIB | Retirados: no hay editor de álbum, ni manifiestos, ni letras |
| RF-25, RF-26 (v1) | Tema ambiente desde la portada e iconos personalizados | Retirados: no existen en la v2 |
| RF-28 (v1) | Actualizar herramientas con `pip`/`winget` | Retirado: la v2 solo **detecta** yt-dlp/ffmpeg |
| RF-29, RF-30 (v1) | Launcher/splash y cierre con QThreads | Reemplazados por el ciclo de vida de Tauri (RNF-01, RF-03) |
