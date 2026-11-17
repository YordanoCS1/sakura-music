# Formatos de datos y preferencias

Todo lo que la app guarda vive en una única carpeta de datos. En desarrollo es `.tauri_data/` dentro del directorio del proyecto (`src-tauri/src/lib.rs` la fija al arrancar); los módulos acceden siempre a través de `src-tauri/src/paths.rs`.

```text
<datos de la app>/
├── library.sqlite3         # índice de la biblioteca (SQLite, modo WAL)
├── library_cache.json      # archivo histórico de la v1, se importa una sola vez
├── download_queue.json     # foto de la cola de descargas
├── covers/                 # carátulas extraídas, con deduplicación por hash
└── bin/                    # yt-dlp / ffmpeg si se descargan a la carpeta de datos
```

## `library.sqlite3`

Se crea con `PRAGMA journal_mode = WAL`, para que la UI pueda leer mientras el escáner escribe. El `busy_timeout` es de 5 segundos. El esquema está en `create_schema()` (`library_db.rs`).

### `library_tracks`

Una fila por pista indexada. `path` es la clave primaria.

| Columna | Tipo | Observación |
|---|---|---|
| `id` | TEXT | Identificador estable de la pista |
| `path` | TEXT (PK) | Ruta absoluta del archivo |
| `title`, `artist`, `album` | TEXT | Tags obligatorios |
| `album_artist` | TEXT nullable | Artista del álbum |
| `track_number` | INTEGER nullable | Número de pista |
| `duration` | INTEGER | Segundos |
| `duration_str` | TEXT | Duración formateada (`m:ss`) |
| `format` | TEXT | MP3, FLAC, M4A, Opus, OGG, WAV, AAC |
| `bitrate_kbps` | INTEGER nullable | Bitrate en kb/s |
| `cover_url` | TEXT nullable | Ruta relativa dentro de `covers/` |
| `year`, `genre` | INTEGER / TEXT nullable | Tags opcionales |
| `file_size` | INTEGER | Tamaño en bytes |
| `modified_ns` | INTEGER | `mtime` en nanosegundos; con el tamaño decide si hay que re-leer tags |

La actualización usa `INSERT ... ON CONFLICT(path) DO UPDATE`. El escáner compara `file_size` y `modified_ns` con la fila en caché: si coinciden, reutiliza la entrada sin abrir el archivo.

### `library_state`

Tabla clave/valor para el estado de la biblioteca.

| Clave | Valor |
|---|---|
| `root_path` | Carpeta raíz que se está escaneando y vigilando |

### `app_meta`

Tabla clave/valor para migraciones y marcas de la app.

| Clave | Valor |
|---|---|
| `legacy_json_imported` | `'1'` cuando ya se importó el `library_cache.json` de la v1 |

Si se borra `library.sqlite3`, la app vuelve a importar el JSON histórico (si existe) y reescanea. No es necesario tocar ningún otro archivo.

## `download_queue.json`

Array JSON con una foto de la cola. Se escribe de forma atómica (temporal + `rename`) en cada cambio y se recorta a las **100** entradas más recientes (`MAX_PERSISTED_JOBS` en `queue.rs`). Si el archivo no existe o está corrupto, la app arranca con la cola vacía.

```json
[
  {
    "id": "uuid-de-la-fila",
    "title": "Nombre de la canción",
    "artist": "Artista",
    "url": "https://...",
    "format": "opus",
    "output_dir": "C:\\Música",
    "status": "terminada",
    "created_at": 1760000000,
    "file_path": "C:\\Música\\Artista - Canción.opus"
  }
]
```

| Campo | Tipo | Observación |
|---|---|---|
| `id` | string | Se mantiene al reintentar, para no duplicar filas |
| `title`, `artist` | string | Se muestran en la cola |
| `url` | string | Enlace de origen |
| `format` | string | `opus`, `flac`, `m4a` o `mp3` |
| `output_dir` | string nullable | Carpeta de destino elegida |
| `status` | string | Ver estados abajo |
| `created_at` | i64 | Marca de tiempo Unix |
| `file_path` | string nullable | Ruta final una vez terminada |

### Estados

- `en cola`, `descargando`, `convirtiendo audio`, `Conectando...` → se consideran **activos**.
- Al arrancar, los estados activos se reconcilian como `interrumpida`: `yt-dlp` no retoma el mismo punto, así que el frontend relanza la fila con el mismo `id`, destino y formato. El comando incluye `--continue`, que permite reutilizar el archivo parcial cuando el servidor lo soporta.
- `terminada`, `fallida`, `cancelada` se conservan tal cual hasta que el usuario limpie la cola.

## `covers/`

Carátulas extraídas de los tags o de archivos sueltos. El nombre se deriva de un hash del contenido y la extensión se decide por la firma real de los bytes (JPG, PNG, WebP, GIF, BMP o TIFF), no por lo que diga el tag. Las temporales `temp_*` se borran al abrir la app y antes de guardar una nueva.

## `bin/`

Ubicación preferida para `yt-dlp.exe` y `ffmpeg.exe`. Si no están ahí, se buscan en la instalación histórica de la v1, en los enlaces de winget y en el `PATH`. La app nunca guarda rutas hardcodeadas de un usuario.

## Preferencias en `localStorage`

| Clave | Valor |
|---|---|
| `sakura_theme` | Siempre `'space'` (se persiste para conservar el contrato) |
| `sakura_view_mode` | `folders`, `grid`, `table`, `albums`, `mosaic`, `cds`, `tilt`, `glow` o `portadas` |
| `sakura_player_style` | `floating` o `fixed` |
| `sakura_glass_opacity` | Opacidad del vidrio (0–100) |
| `sakura_glass_blur` | Desenfoque del vidrio en px |
| `sakura_ambient_glow` | Activa/desactiva el resplandor de la carátula |
| `sakura_ambient_particles` | Activa/desactiva las partículas de sakura |
| `sakura_favorites` | Array JSON de IDs de pistas favoritas |
| `sakura_current_folder` | Última carpeta de biblioteca usada |
| `sakura_download_folder` | Última carpeta de descarga elegida |

Los efectos (`glass_*`, partículas, resplandor) se escriben al cambiarlos. La carpeta de biblioteca se guarda además en `library_state.root_path` para que el backend sepa qué vigilar apenas arranca.
