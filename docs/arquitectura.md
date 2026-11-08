# Arquitectura

Sakura Music es una aplicación de escritorio monousuario: una ventana Qt que
orquesta procesos externos (`yt-dlp`, `ffmpeg`), lee y escribe archivos de audio
y guarda su propio estado en JSON y SQLite. No hay servidor, no hay cuentas y no
hay base de datos remota. Esta página describe cómo está partido el código, qué
corre en cada hilo y dónde vive cada dato.

## Vista de contexto

```mermaid
flowchart LR
    U["Usuario"] --> APP["Sakura Music<br/>(Qt / PySide6)"]
    APP -->|"busca, enumera, descarga"| YT["YouTube<br/>vía yt-dlp"]
    APP -->|"convierte y mezcla"| FF["ffmpeg / ffprobe"]
    APP -->|"fichas y portadas"| CAT["iTunes · Deezer ·<br/>MusicBrainz"]
    APP -->|"letras"| LRC["LRCLIB"]
    APP -->|"lee y escribe"| FS["Sistema de archivos<br/>biblioteca + datos"]
    FS -->|"tags, portadas, letras"| AUDIO["Archivos de audio"]
```

La app es el único componente con estado propio. Todo lo demás es una fuente o un
destino: YouTube y los catálogos se consultan, `ffmpeg` transforma, y el sistema
de archivos guarda el resultado.

## Capas

```mermaid
flowchart TB
    subgraph UI["ui/ · presentación"]
        PAGES["pages/<br/>home · search · queue<br/>library · settings"]
        WIDGETS["widgets/ · dialogs/<br/>toolbar · views · editors"]
        MODELS["models/<br/>track_model · album_model"]
        THEME["theme/<br/>tokens · palettes · qss · ambient"]
    end

    subgraph SERVICES["ui/services/ · orquestación"]
        DL["downloader"]
        SCAN["library (scanner, delta, refresher)"]
        SEARCH["searcher · playlist"]
        META["metadata_search · album_resolver"]
        LYR["lyrics"]
        PROC["process · thumbnails · watcher"]
    end

    subgraph CORE["core/ · dominio puro"]
        LIB["library · library_index"]
        MD["metadata · metadata_sources"]
        MATCH["album_match · text"]
        HIST["tag_history · download_history"]
        TOOLS["tools · formats · models"]
    end

    subgraph EXT["Externos"]
        YTDLP["yt-dlp"]
        FFMPEG["ffmpeg"]
        NET["HTTP: iTunes, Deezer,<br/>MusicBrainz, LRCLIB"]
        DISK["Disco"]
    end

    PAGES --> WIDGETS
    PAGES --> MODELS
    PAGES --> SERVICES
    WIDGETS --> THEME
    SERVICES --> CORE
    SERVICES --> PROC
    PROC --> YTDLP
    PROC --> FFMPEG
    META --> NET
    LYR --> NET
    CORE --> DISK
```

**La regla de dependencia va en un solo sentido:** `ui/pages` y `ui/widgets`
pueden importar `ui/services` y `core`; `ui/services` puede importar `core`;
`core` no importa nada de `ui` ni de Qt. Esa pureza es la que permite probar
`album_match`, `metadata`, `library_index` y `tag_history` sin levantar una
`QApplication`.

| Capa | Responsabilidad | No debe |
|---|---|---|
| `core/` | Modelos, parsing, tags, matching, persistencia de datos | Tocar widgets, hilos de Qt ni lanzar procesos |
| `ui/services/` | Hilos, subprocesos, señales de progreso, coordinación | Pintar ni decidir layout |
| `ui/pages/` | Componer páginas, conectar señales, validar entrada | Leer tags o lanzar `yt-dlp` directamente |
| `ui/widgets/` | Piezas reutilizables y diálogos | Guardar estado de negocio |
| `ui/theme/` | Tokens, paletas, QSS y variante ambiente | Contener lógica de páginas |

## Modelo de hilos

El hilo de la UI nunca hace trabajo pesado. Cada operación que puede tardar vive
en un `QThread` propio o en un subproceso, y se comunica por señales.

```mermaid
flowchart LR
    subgraph MAIN["Hilo principal (Qt)"]
        MW["MainWindow"]
        PG["Páginas y widgets"]
        DM["DownloadManager<br/>(coordina, no descarga)"]
    end

    subgraph THREADS["QThread / subprocesos"]
        SS["SearchService"]
        PR["PlaylistResolver"]
        LS["LibraryScanner<br/>DeltaScanner · Refresher"]
        AR["AlbumResolver"]
        MS["MetadataSearch"]
        LE["LyricsEmbedder"]
        TL["ThumbnailLoader"]
        YT["yt-dlp (proceso)"]
        FF["ffmpeg (proceso)"]
    end

    PG -->|"señal de intención"| DM
    PG -->|"consulta"| SS
    PG -->|"URL"| PR
    PG -->|"carpeta"| LS
    PG -->|"álbum"| AR
    PG -->|"texto"| MS
    PG -->|"pistas"| LE
    PG -->|"URL de imagen"| TL

    DM -->|"ProcessRunner"| YT
    DM -->|"ProcessRunner"| FF
    AR --> YT
    SS --> YT
    PR --> YT

    SS -.->|"result_found / finished"| PG
    LS -.->|"batch / progress / finished"| PG
    DM -.->|"job_added / job_updated"| PG
    AR -.->|"progress / matches"| PG
    MS -.->|"results_ready / failed"| PG
    LE -.->|"progress / completed"| PG
```

### Reglas del modelo

1. **Un servicio, un hilo.** `SearchService`, `PlaylistResolver`,
   `LibraryScanner`, `AlbumResolver`, `MetadataSearch`, `LyricsEmbedder` y
   `ThumbnailLoader` encapsulan su `QThread` y exponen señales. La página no
   hereda de `QThread`.
2. **Los subprocesos no compiten por el GIL.** `yt-dlp` y `ffmpeg` corren con
   `subprocess.Popen`, no con `QProcess`, para poder usar `CREATE_NO_WINDOW` en
   Windows y para que su trabajo de CPU no bloquee la interfaz.
3. **El estado del proceso vive en el slot.** `DownloadManager` tiene
   `MAX_CONCURRENT` slots; cada uno sabe qué `DownloadJob` y qué staging le
   corresponden. Con dos descargas en paralelo, una línea de progreso no puede
   atribuirse al trabajo equivocado.
4. **Todo servicio tiene `shutdown()`.** Cancela su hilo y espera. La limpieza se
   hace en `app.main()` después de `exec()`, no en `closeEvent`.
5. **La UI solo reacciona a señales.** No hay `sleep`, ni `wait()`, ni lectura de
   disco dentro de un `clicked`.

### Por qué el cierre es especial

`MainWindow.closeEvent` marca `_cerrando` y detiene el watcher, pero **no espera
hilos**. Si lo hiciera, un `QThread` seguiría vivo mientras Qt destruye objetos y
la salida se colgaría de forma intermitente. La secuencia correcta es:

```text
closeEvent → acepta el cierre
exec() vuelve
app.main() → window.shutdown()
              ├─ watcher.stop()
              ├─ downloads.shutdown()   (mata procesos, borra staging, guarda cola)
              ├─ search.shutdown()
              ├─ queue.shutdown()
              ├─ library.shutdown()
              └─ home_review_scanner.shutdown()
del window
```

## Persistencia

No hay una base de datos central. Cada tipo de dato tiene el formato que mejor le
sirve y todos viven bajo la carpeta de datos de la app.

```mermaid
flowchart TB
    BASE["base_dir()<br/>%LOCALAPPDATA%\\SakuraMusic"]
    BASE --> CFG["config.json<br/>ajustes del usuario"]
    BASE --> QUEUE["download_queue.json<br/>trabajos reanudables"]
    BASE --> HIST["download_history.json<br/>últimos 1000 resultados"]
    BASE --> IDX["library_index.sqlite3<br/>índice por mtime_ns + tamaño"]
    BASE --> TAGS["Historial/<br/>manifiestos de tags (20)"]
    BASE --> ICONS["Iconos/<br/>copias estables de PNG"]
    BASE --> CACHE["Cache/Portadas/<br/>miniaturas y carátulas"]
    BASE --> MUSIC["Musica/<br/>biblioteca por defecto"]
    BASE --> DL["Descargas/<br/>staging job-XXXX"]
    MUSIC --> TRACKS["audio + .lrc/.txt + folder.jpg"]
```

| Dato | Archivo | Formato | Retención |
|---|---|---|---|
| Ajustes | `config.json` | JSON atómico (`.tmp` + `replace`) | Permanente |
| Cola | `download_queue.json` | JSON | Hasta que se limpia |
| Historial | `download_history.json` | JSON | 1000 entradas |
| Índice | `library_index.sqlite3` | SQLite WAL, `SCHEMA_VERSION = 1` | Descartable |
| Manifiestos | `Historial/*.json` | JSON por lote | 20 más nuevos |
| Portadas | `Cache/Portadas/` | PNG/JPG | Descartable |

**Los tags del archivo son la fuente de verdad.** El índice SQLite es una caché
para no releer miles de archivos en cada arranque; si se borra o se corrompe, la
biblioteca se reconstruye desde el disco. La cola y el historial son estado de la
app, no del audio: se pueden borrar sin perder música.

### Resolución de la carpeta de datos

`base_dir()` prueba `%LOCALAPPDATA%\SakuraMusic`; si detecta que la build de
Microsoft Store redirige las escrituras a `VirtualStore`, cae a
`%USERPROFILE%\SakuraMusic` y, si tampoco es visible para procesos externos, a la
carpeta temporal. La comprobación escribe una sonda y compara la ruta física con
la lógica, porque `ffmpeg` no está sandboxeado y necesita ver los mismos bytes.

## Secuencia: descarga de una canción

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant SP as SearchPage
    participant SS as SearchService
    participant YT as yt-dlp
    participant MW as MainWindow
    participant DM as DownloadManager
    participant PR as ProcessRunner
    participant FS as Disco

    U->>SP: escribe consulta
    SP->>SP: espera 450 ms (debounce)
    SP->>SS: search(query)
    SS->>YT: ytsearch20:query
    YT-->>SS: JSON por línea
    SS-->>SP: result_found(SearchResult)
    SP-->>U: tarjeta con portada y duración
    U->>SP: clic en descargar
    SP->>MW: download_requested(result, format)
    MW->>MW: require_ffmpeg()
    MW->>DM: enqueue(job)
    DM->>DM: ¿duplicado en cola o disco?
    alt ya existe
        DM-->>MW: job SKIPPED
    else nuevo
        DM->>PR: start(yt-dlp, staging)
        PR->>YT: subprocess.Popen
        loop progreso
            YT-->>PR: línea de progreso
            PR-->>DM: progress
            DM-->>SP: job_updated
        end
        YT-->>PR: exit 0
        PR-->>DM: completed(0)
        DM->>FS: mover staging → destino
        DM->>FS: escribir tags saneados
        DM-->>MW: job_finished(DONE)
        MW-->>U: fila con badge y ruta
    end
```

## Secuencia: escaneo incremental

```mermaid
sequenceDiagram
    autonumber
    participant W as LibraryWatcher
    participant LP as LibraryPage
    participant DS as LibraryDeltaScanner
    participant IDX as LibraryIndex
    participant FS as Disco
    participant UI as Modelo y vista

    Note over W: QFileSystemWatcher no es recursivo
    W->>W: registra cada subcarpeta
    FS-->>W: directoryChanged
    W->>W: debounce 900 ms
    W-->>LP: changed()
    LP->>LP: ¿escaneo en curso?
    alt ocupado
        LP->>LP: _changes_pending = True
    else libre
        LP->>DS: start()
        DS->>IDX: cargar filas cacheadas
        DS->>FS: recorrer árbol (scan_paths)
        loop por archivo
            DS->>DS: comparar mtime_ns + tamaño
            alt sin cambios
                DS->>DS: usar fila del índice
            else nuevo o modificado
                DS->>FS: leer tags, portada, letra
                DS->>IDX: guardar fila
            end
        end
        DS->>IDX: podar rutas inexistentes
        DS-->>LP: tracks_changed / tracks_removed
        LP->>UI: reemplazar o quitar filas
    end
    Note over LP: al terminar, si _changes_pending,<br/>se relanza el delta
```

## Secuencia: cambio de tema

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant SET as SettingsPage
    participant MW as MainWindow
    participant TH as theme
    participant QSS as build_qss
    participant APP as QApplication
    participant W as Widgets

    U->>SET: elige un tema
    SET->>SET: save_settings({"theme": id})
    SET-->>MW: theme_changed(id)
    MW->>TH: get_theme(id)
    MW->>MW: apply_theme(theme)
    MW->>MW: _apply_theme_variant()
    alt tema ambiente activo y hay portada
        MW->>TH: theme.with_ambient(color)
    end
    MW->>TH: set_active(theme)
    MW->>QSS: build_qss(theme)
    QSS-->>MW: hoja de estilos completa
    MW->>APP: setStyleSheet(qss)
    MW->>APP: setWindowIcon(icono del tema)
    MW->>MW: set_shell_layout(theme.shell)
    MW->>W: refresh() en barras, botones y páginas
    W-->>U: misma ventana, colores y forma nuevos
```

## Flujo de datos de una descarga de álbum

El camino del álbum agrega dos pasos entre la búsqueda y la descarga: el catálogo
y la revisión.

```text
texto → iTunes/Deezer → AlbumEntry (título, año, género, pistas)
      → por pista: yt-dlp ytsearch5 → candidatos
      → album_match: duración + título + canal → Verdict
      → Revisar álbum (tabla editable)
      → DownloadManager.enqueue_album_track(video, candidate, carpeta)
      → al terminar: tags del catálogo + portada + folder.jpg
```

La revisión existe porque los tags salen del catálogo y quedan correctos elija el
video que elija. Si el cruce se equivoca, el archivo sale con metadata impecable y
el audio de otra canción, y eso no se detecta nunca. Por eso se ve cada elección
y su motivo antes de encolar.

## Manejo de errores

| Situación | Qué hace la app |
|---|---|
| `yt-dlp` falla | Vuelve a **PENDING** y reintenta hasta 3 veces; al final **FAILED** con mensaje traducido |
| `ffmpeg` ausente | No encola y avisa que hace falta para procesar medios |
| Catálogo sin respuesta | Cae de iTunes a Deezer; si ambos fallan, informa y no encola |
| Una pista del álbum sin match | Esa pista queda fuera; el resto sigue |
| Archivo ilegible | Se descarta del índice y se quita de la lista |
| Índice corrupto | Se ignora y se reescanea |
| JSON de config corrupto | Se usan los valores por defecto |
| Cola corrupta | Se avisa y se arranca con la cola vacía |
| Manifiesto corrupto | Se descarta y se busca el anterior |
| Portada no descargable | Se conserva la portada actual |

## Puntos de extensión

| Querés agregar… | Tocá | Cuidá |
|---|---|---|
| Un tema | `ui/theme/palettes.py` + `THEME_LIST` | Pasar `test_theme_contrast` |
| Una vista | `widgets/track_delegates.py`, `library_views.py`, `VIEW_SPECS`, `VIEW_ORDER` | El orden del stack y el de los botones deben coincidir |
| Una fuente de catálogo | `core/metadata_sources.py`, `services/metadata_search.py` | Timeouts, User-Agent y fixtures en `tests/data/` |
| Un servicio con hilo | Patrón `QObject` + `QThread` | Señales de progreso/fin/error y `shutdown()` |
| Un ajuste | `config.DEFAULTS`, `pages/settings.py` | Persistencia atómica y valor por defecto |
| Un formato | `core/formats.py` | Extensión, calidad y si transcodifica |

Los detalles de cada receta están en [desarrollo.md](desarrollo.md).
