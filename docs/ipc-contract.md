# Contrato IPC (frontend ↔ Rust)

Toda la comunicación entre React y el núcleo Rust pasa por `invoke()` y por eventos de Tauri. Este documento es la lista canonical de los **47 comandos** y los **7 eventos**. Si agregás uno, actualizá este archivo en el mismo commit.

Los tipos (`ScannedTrack`, `PersistedDownload`, etc.) están en [`src/types.ts`](../src/types.ts) y su contrato Rust en los módulos indicados. Los formatos persistidos están en [data-formats.md](data-formats.md).

## Convenciones

- Los errores se devuelven como `Result<_, String>`: el mensaje ya viene en español y está listo para mostrar al usuario. Los comandos que no pueden fallar devuelven `bool`.
- Los parámetros opcionales son `Option<T>` en Rust y `undefined`/`null` desde el frontend.
- Las búsquedas largas usan un `request_id` para correlacionar la respuesta con la petición: el comando devuelve aceptación o error y los resultados llegan después por evento.
- Las rutas de audio se entregan al frontend como rutas del sistema y se convierten con `convertFileSrc()` antes de usarlas en la UI.
- Todo parámetro se valida en `validacion.rs` (longitud de textos, rutas y lotes; caracteres de control y NUL). Las escrituras de etiquetas, además, exigen que el archivo canónico esté dentro de la raíz de la biblioteca activa y que la portada venga de la carpeta `covers`.

## Comandos

### Información y biblioteca

| Comando | Parámetros | Devuelve | Origen |
|---|---|---|---|
| `get_app_info` | `tracks_count?: number` | `AppInfo` (`engine`, `rust_version`, `memory_usage`, `tracks_loaded`) | `lib.rs` |
| `get_default_music_dir` | — | `string \| null` | `lib.rs` |
| `get_cached_library` | — | `ScannedTrack[]` | `lib.rs` |
| `scan_library` | `folder_path: string` | `ScannedTrack[]` | `lib.rs` |
| `clear_library_cache` | — | `boolean` | `lib.rs` |
| `delete_library_track` | `path: string` | `string` (token para deshacer) | `lib.rs` |
| `search_library_fts` | `query: string`, `limit?: number` | `ScannedTrack[]` | `lib.rs` |

`search_library_fts` usa el índice FTS5 de SQLite (título, artista y álbum, sin acentos) y es la búsqueda principal de la biblioteca; si falla, el frontend cae al filtro local.

`scan_library` registra el vigilante de la carpeta, autoriza el scope del protocolo `asset:` y reutiliza las filas de SQLite cuyo `mtime` y tamaño no cambiaron. `delete_library_track` valida que la ruta canónica quede dentro de la biblioteca activa antes de borrar.

### Metadatos y carátulas

| Comando | Parámetros | Devuelve | Origen |
|---|---|---|---|
| `save_temp_cover` | `bytes: number[]` | `string` (ruta temporal) | `lib.rs` |
| `update_track_metadata` | `path, title, artist, album`, `album_artist?`, `track_number?`, `year?`, `genre?`, `cover_path?`, `remove_cover?` | `ScannedTrack` | `lib.rs` |
| `update_batch_metadata` | `paths: string[]`, `artist?`, `album?`, `album_artist?`, `year?`, `genre?`, `cover_path?`, `remove_cover?` | `{ updated: ScannedTrack[], errors: string[] }` | `lib.rs` |

Lo que no se marca no se toca. La escritura es atómica (temporal + `rename` con reintentos) y el lote informa por separado los archivos que fallaron.

### Catálogo en línea

| Comando | Parámetros | Devuelve | Origen |
|---|---|---|---|
| `search_catalog_songs` | `source: string`, `query: string` | `CatalogCandidate[]` | `catalog.rs` |
| `search_catalog_albums` | `source: string`, `query: string` | `CatalogAlbum[]` | `catalog.rs` |
| `open_catalog_album` | `source: string`, `id: string`, `country: string` | `CatalogAlbumTrack[]` | `catalog.rs` |

Fuentes: `itunes`, `deezer` y `musicbrainz`. Estas consultas viven en Rust porque Deezer no manda cabeceras CORS y MusicBrainz exige un User-Agent identificado (`APP_UA` en `catalog.rs`). Las carátulas HD de MusicBrainz se resuelven con Cover Art Archive.

### Búsqueda y descargas

| Comando | Parámetros | Devuelve | Origen |
|---|---|---|---|
| `check_downloader_tools` | — | `DownloaderStatus` | `lib.rs` |
| `search_online` | `request_id: string`, `query: string` | `OnlineSearchResult[]` (o error) | `lib.rs` |
| `resolve_playlist` | `request_id: string`, `url: string` | `PlaylistInfo` | `lib.rs` |
| `start_download` | `job_id`, `url`, `format`, `output_dir?` | `boolean` | `lib.rs` |
| `cancel_download` | `job_id: string` | `boolean` | `lib.rs` |
| `cancel_all_downloads` | — | `boolean` | `lib.rs` |
| `set_download_concurrency` | `max: number` | `number` (1–4) | `lib.rs` |
| `get_download_queue` | — | `PersistedDownload[]` | `lib.rs` |
| `save_download_queue` | `items: PersistedDownload[]` | `boolean` | `lib.rs` |
| `tools_status` | — | `ToolStatus[]` | `lib.rs` |
| `install_downloader_tools` | `tool: 'ytdlp' \| 'ffmpeg'` | `ToolStatus` | `lib.rs` |

`search_online` y `resolve_playlist` emiten resultados parciales por evento mientras `yt-dlp` va imprimiendo líneas; el array que devuelve el comando es el resultado final. La cola se persiste mandando el array completo a `save_download_queue` en cada cambio (no existe un comando para "vaciar" el archivo).

### Mantenimiento y diagnóstico

| Comando | Parámetros | Devuelve | Origen |
|---|---|---|---|
| `doctor_database` | — | `{ mensaje, info: DatabaseInfo }` | `lib.rs` |
| `vacuum_database` | — | `string` (tamaños antes/después) | `lib.rs` |
| `backup_database` | — | `string` (ruta del respaldo) | `lib.rs` |
| `get_system_logs` | `limit?: number` | `string` | `lib.rs` |

### Playlists y papelera

| Comando | Parámetros | Devuelve | Origen |
|---|---|---|---|
| `list_playlists` | — | `Playlist[]` | `lib.rs` |
| `create_playlist` | `name: string` | `Playlist` | `lib.rs` |
| `rename_playlist` | `id`, `name` | — | `lib.rs` |
| `delete_playlist` | `id` | — | `lib.rs` |
| `get_playlist` | `id` | `PlaylistDetail` | `lib.rs` |
| `playlist_add_tracks` | `id`, `paths: string[]` | `number` (agregadas) | `lib.rs` |
| `playlist_remove_track` | `id`, `path` | — | `lib.rs` |
| `playlist_reorder` | `id`, `paths: string[]` | — | `lib.rs` |
| `restore_deleted_track` | `token: string` | `string` (ruta restaurada) | `lib.rs` |
| `empty_trash` | — | `number` | `lib.rs` |
| `trash_count` | — | `number` | `lib.rs` |
| `read_lyrics` | `path: string` | `LyricLine[]` | `lib.rs` |
| `search_lyrics` | `query`, `artist?`, `album?`, `duration?` | `LyricsSearchResult[]` | `lib.rs` |
| `save_track_lyrics` | `path`, `lrc` | `string` (ruta del `.lrc`) | `lib.rs` |
| `delete_track_lyrics` | `path` | — | `lib.rs` |

Las playlists guardan rutas en `playlist_tracks` con `foreign_keys = ON`: si se borra la lista, SQLite limpia sus filas. `delete_library_track` mueve el archivo a `<datos>/trash` y devuelve un token; `restore_deleted_track` lo devuelve y reinserta la pista. `read_lyrics` busca un `.lrc` junto al audio y devuelve líneas con `time` en segundos. Con el mismo patrón del catálogo de metadatos, `search_lyrics` consulta **LRCLIB** desde Rust (User-Agent identificado, sin clave) y devuelve resultados con letra sincronizada o plana; `save_track_lyrics` escribe el `.lrc` al lado de la pista con escritura atómica y `delete_track_lyrics` lo quita. El host `https://lrclib.net` se agregó a `connect-src` en la CSP.

El bloque de mantenimiento alimenta Ajustes → Sistema. `doctor_database` corre `PRAGMA integrity_check`, reconstruye el índice FTS5 y devuelve métricas (pistas, entradas del índice, tamaño, versión de esquema, último respaldo). `backup_database` usa `VACUUM INTO` para una copia consistente con WAL activo y conserva los tres respaldos más recientes. Los respaldos automáticos se crean antes de subir `PRAGMA user_version`.

Si faltan las herramientas, `tools_status` informa qué está disponible y
`install_downloader_tools` las descarga a `bin/` con verificación SHA256. Nunca
sobrescribe un binario que ya esté en el PATH.

## Eventos

| Evento | Payload | Cuándo se emite |
|---|---|---|
| `library-changed` | `string` (ruta raíz vigilada) | El vigilante `notify` detecta cambios en la carpeta de la biblioteca. Se agrupan con un timeout de 700 ms. |
| `online-search-result` | `{ request_id, result: OnlineSearchResult }` | Cada línea de resultado de `yt-dlp` durante una búsqueda. |
| `playlist-item` | `{ request_id, title, uploader, item: OnlineSearchResult }` | Cada pista resuelta al abrir una playlist con `--flat-playlist`. |
| `download-progress` | `{ id, progress, speed, eta, status, file_path? }` | Progreso de una descarga en curso (porcentaje, velocidad, ETA y ruta final). |
| `tools-download-progress` | `{ tool, descargado, total, estado }` | Bytes descargados al instalar yt-dlp o FFmpeg; `estado` es `descargando` o `listo`. |
| `library-track-added` | `ScannedTrack` | Una descarga terminó y se indexó sola en la biblioteca. |
| `remote-command` | `{ action, ... }` | Orden del servidor HTTP local: `play_pause`, `pause`, `next`, `previous`, `play_track`, `set_volume`, `seek`. |

El frontend filtra `library-changed` comparando la ruta con la carpeta activa, para no recargar si cambia otra biblioteca. Los eventos de búsqueda se descartan si su `request_id` no corresponde a la petición vigente.

Además de estos eventos, los plugins `updater` y `process` tienen sus propios canales (`plugin:updater|*`, `plugin:process|*`) y se consumen con las APIs `@tauri-apps/plugin-updater` y `@tauri-apps/plugin-process`, no con `invoke()` directo. Por eso no cuentan en la tabla de 47 comandos. La búsqueda de actualizaciones y el reinicio viven en `SystemPanel.tsx`.

## Registro de comandos

Los 47 comandos están registrados en el `invoke_handler` de `lib.rs` (44 definidos ahí y 3 en `catalog.rs`). Si agregás uno nuevo:

1. Definilo con `#[tauri::command]` y devolvé `Result<_, String>` cuando pueda fallar.
2. Registralo en `generate_handler!`.
3. Agregalo a esta tabla y su tipo a `src/types.ts`.
4. Si abre una nueva API externa, sumá el host a `connect-src` en `tauri.conf.json`.
5. Agregá la respuesta mock en `e2e/app.spec.ts` si el frontend la usa al arrancar. El test `src/lib/ipc-contract.test.ts` falla si un comando registrado no se invoca desde el frontend o viceversa.


## Control remoto local

El módulo `remote.rs` levanta un servidor HTTP en el puerto **17342** al iniciar la app. El frontend usa cuatro comandos para administrarlo:

| Comando | Parámetros | Devuelve |
|---|---|---|
| `remote_set_enabled` | `activo: boolean` | `boolean` |
| `remote_is_enabled` | — | `boolean` |
| `remote_local_ip` | — | `string` |
| `remote_update_state` | `title`, `artist`, `playing`, `position`, `duration` | — |

El servidor sirve una página de control en `/`, expone `/api/status` y `/api/search?q=`, y envía las acciones al frontend con el evento `remote-command`. Sólo responde cuando el flag está activo (Ajustes → Control remoto).
