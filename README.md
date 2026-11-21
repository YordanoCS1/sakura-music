# 🌸 Sakura Music 2.0

Gestor, reproductor, descargador y etiquetador de música para escritorio, construido con **Tauri 2.0 (Rust)** y **React 19 (TypeScript + Tailwind CSS)**.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-1.99-orange?logo=rust)
![React](https://img.shields.io/badge/React-19.1-cyan?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)

> [!NOTE]
> La versión 1.0 en Python + PySide6 se conserva íntegra en `legacy_python/` como referencia histórica (ver [ADR 0009](docs/adr/0009-migracion-tauri-2-rust.md)). Esta carpeta es la única fuente activa: si un dato no está en el `README` ni en `docs/`, no existe en la app.

---

## ✨ Características principales

### ⚡ Motor de escaneo en Rust
- **Paralelismo masivo:** `rayon` + `walkdir` escanean carpetas completas en todos los núcleos.
- **Formatos:** MP3, FLAC, M4A, Opus, OGG, WAV y AAC (leídos con `lofty`).
- **Biblioteca en SQLite:** la caché vive en `library.sqlite3` (con `rusqlite` *bundled*, modo WAL, `synchronous=NORMAL`, `temp_store=MEMORY` y `foreign_keys=ON`) dentro de la carpeta de datos del usuario, con índice **FTS5** para la búsqueda. Se actualiza por `mtime` + tamaño, así que re-escanea sin leer los tags de todo el disco.
- **Escritura atómica:** todos los tags, la base de datos y las portadas se escriben con temporal + `rename`, con reintentos. Un corte de luz no deja el archivo a medio escribir.
- **Carátulas:** se extraen a `covers/` con deduplicación por hash y extensión real según la firma del archivo (JPG/PNG/WebP/GIF/BMP/TIFF), no siempre `.jpg`.
- **Vigilante de la carpeta:** `notify` observa la carpeta escaneada y emite `library-changed` cuando cambian los archivos, para actualizar la vista sin re-escanear a mano.

### 🎵 Reproducción sin bloqueo de archivos
- El audio se sirve vía protocolo `asset:` y se carga en memoria como Blob URL.
- Al soltar el `fetch`, Windows libera el handle: puede renombrar, editar tags o cambiar la carátula **mientras suena**, sin `os error 5`.
- Play/pausa, seek, volumen, mute, shuffle, repetición (`off` / `all` / `one`) y avance automático que respeta "repetición apagada" al llegar al final de la lista.
- **Panel “Ahora suena” ampliado:** tocando la portada del reproductor se abre una vista grande con la portada protagonista, el color dominante de la carátula teñendo el fondo y controles amplios, organizada en cuatro pestañas: **Detalles**, **Letras**, **Álbum** y **Artista**. El glifo del splash hace la transición continua hacia la navegación con View Transitions.

### 🗂️ Playlists y deshacer
- **Playlists persistentes** en SQLite: pestaña Listas con alta, renombre, borrado, carga de pistas y reorden manual, con estilo propio por tema.
- **Borrado con Deshacer**: los archivos van a `trash/` y se restauran desde el toast durante 9 s; Ajustes → Sistema muestra el contador y permite **Vaciar papelera**.
- **Letras `.lrc` sincronizadas** en el panel “Ahora suena”, con resaltado y autoscroll y **búsqueda online en LRCLIB** con botón *Aplicar* (ADR 0021).
- **Paleta de comandos** con `Ctrl+K` / `⌘K` para navegar, cambiar tema, controlar la reproducción y buscar pistas.

### 🛠️ Mantenimiento, doctor y herramientas
- **Migraciones versionadas** con `PRAGMA user_version=2` (1 = FTS5 y disparadores, 2 = índices en artista, álbum, año y género), respaldo automático previo con `VACUUM INTO` y retención de 3 copias.
- **Doctor del sistema** en Ajustes → Sistema: integridad, pistas indexadas, entradas FTS, tamaño y esquema de SQLite, con botones **Verificar**, **Compactar**, **Crear respaldo**, **Vaciar papelera**, más un visor de logs con **Copiar**.
- **Control remoto local** en el puerto `17342` (Ajustes → Control remoto) y **CLI `sakura-cli`** para tareas por línea de comandos.
- **Generador de temas** para crear variantes propias a partir de un arquetipo existente.

### 🏷️ Editor de metadatos y edición en lote
- Edición individual y por lote (Batch Editor) con `lofty` en RAM y escritura atómica.
- El lote devuelve `{ updated, errors }`: si 2 de 10 archivos fallan, la app te dice **cuáles** en vez de fingir éxito.
- Campos: título, artista, artista del álbum, álbum, número de pista, año, género y carátula. Lo que no marcás no se toca.
- Carátulas: archivo local (JPG/PNG/WebP), pegar con `Ctrl+V` y eliminar. Las temporales `temp_*` se borran al abrir la app y antes de guardar una nueva.
- Catálogo: búsqueda real en **iTunes**, **Deezer** (`api.deezer.com/search`) y **MusicBrainz** (con portadas de **Cover Art Archive**), con carátula HD, "Aplicar todo", "Solo portada" y exploración de álbumes. Las peticiones pasan por comandos Tauri en `src-tauri/src/catalog.rs`.
- Control de cambios por campo con reversión individual y "restablecer valores originales".
- Diseño premium adaptado al tema claro (superficies blancas, texto legible, foco rosa).

### 📥 Búsqueda, playlists y descarga en segundo plano
- Búsqueda en YouTube con `ytsearch10` vía `yt-dlp`, playlists resueltas con `--flat-playlist` sin descargar, y `--no-playlist` al descargar pistas sueltas.
- Cola con **máximo 2 descargas en paralelo**, cancelación por ítem y "Cancelar todo", reintento de fallidas/canceladas, limpieza de terminadas y **persistencia entre sesiones** (`download_queue.json`): al reabrir, lo interrumpido se reanuda solo.
- Al salir se cancelan y matan los procesos `yt-dlp`/`ffmpeg` vivos.
- Formatos: Opus (`--audio-quality 0`), FLAC (sin pérdida), M4A/AAC 192 kbps y MP3 320 kbps, siempre con metadatos y carátula embebidos.
- Progreso en tiempo real por evento `download-progress` (porcentaje, velocidad, ETA). yt-dlp imprime `after_move:filepath` y si no, se busca el archivo por `[id]` en la carpeta destino.
- yt-dlp/ffmpeg se buscan en: carpeta de datos de la app (`bin/`), instalación histórica de la v1 (`%APPDATA%/LOCALAPPDATA`), enlaces de winget y `PATH`. Nunca hay rutas hardcodeadas de un usuario.
- Timeouts y reintentos de red: `--socket-timeout 30`, `--retries 3`, `--fragment-retries 3`, `--windows-filenames`.

### 🎨 14 temas (consola de mezcla, tinta y calma japonesa)
- **14 temas seleccionables en Ajustes → Diseño Visual, todos con identidad propia:** **Estudio** (`space`, "Consola de mezcla y medidores VU") trae Home tipo consola con `EST·01`, medidor VU y rack de canales con faders; la biblioteca muestra canales con fader y VU, la navegación es negra con el glifo ◎ y acento ámbar `#f0a23c`, y tiene estilo propio en Buscar, Cola, Ajustes, panel "Ahora suena", playlists, paleta ⌘K, estadísticas, modales de metadatos, splash y transición `t-estudio`. Su paleta es grafito `#15181a`, panel `#1d2226`, ámbar `#f0a23c`, verde LED `#7ee081` y texto `#f2ede6`, con tipografía monospace. Los otros trece —**Sumi-e**, **Byōbu**, **Shoji**, **Origami**, **Swiss**, **Sumi Ink**, **Moonlit**, **Ledger**, **Shōnen**, **Fantasmas**, **Samurái**, **Kawaii** y **Manga**— también tienen vistas estructurales completas: Inicio, biblioteca, cabecera, Buscar, Cola, ajustes, diálogos y transiciones propios, no sólo otra paleta. **Manga** ("Viñetas, tinta y screentone") trae portada de revista con `第 01 話`, globos de diálogo, sello 開 y línea de tiempo; en biblioteca muestra páginas de viñetas con tramado halftone, tag **GO!** y carátulas en blanco y negro. Su paleta es papel `#fbfaf7`, tinta `#101010` y rojo `#d62828`. El cambio es instantáneo y se guarda en `sakura_theme`.
- **Selector:** el tema base queda fijo en `data-theme='space'` y todos los temas oficiales aplican `data-skin` (incluido `data-skin="space"` en Estudio), con transición continua del glifo del splash a la navegación mediante View Transitions. La vista genérica `LibraryTab`/`ZenTopNav` sigue en el código sólo como fallback para temas importados; ningún tema oficial la usa.
- **Navegación superior:** barra de pestañas con indicador deslizante animado y emblema propio por tema (en Estudio, glifo ◎ sobre navegación negra con acento ámbar).
- **7 pestañas:** Inicio, Biblioteca, Buscar, Cola, **Listas** (playlists), **Datos** (estadísticas) y Ajustes.
- **9 vistas de biblioteca** (vista genérica, hoy sólo fallback para temas importados): Carpetas (con breadcrumbs), Cuadrícula, Lista (tabla), Álbumes, **Pared** (mosaico de portadas con el título y artista de cada canción, filtrado por la carpeta seleccionada), **CDs**, **3D (Tilt)**, **Luz (Glow)** y **Portadas**.
- Opacidad y blur del vidrio, resplandor ambiental, partículas, estilo de reproductor (flotante/fijo/mini) y favoritos persistentes.
- Datos técnicos reales: versión de `rustc` (inyectada en `build.rs`) y memoria del proceso en Windows (via `windows-sys`), nunca literales de ejemplo.

---

## 🏗️ Arquitectura del sistema

```text
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React 19 + TypeScript)               │
│   • src/App.tsx (estado, player, editor, cola)               │
│   • src/components/ (HomeTab, LibraryTab, LibraryShowcase,   │
│     SearchTab, QueueTab, PlayerBar, MetadataModal, ZenTopNav,│
│     SettingsTab, …)                                         │
│   • src/hooks/ (usePlayer, useDownloadQueue, useOnlineSearch, │
│     useFolderExplorer, useMetadataEditor, useBatchEditor)    │
│   • Tailwind 3 + variables --accent-* (tema base Estudio)    │
│   • Audio vía asset: + Blob URL (sin bloqueo en Windows)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC invoke + eventos (download-progress, library-changed)
┌──────────────────────────────▼──────────────────────────────┐
│                  Backend (Tauri 2.0 / Rust)                 │
│   • src-tauri/src/scanner.rs        rayon + lofty + escritura│
│                                     atómica + batch          │
│   • src-tauri/src/downloader.rs     DownloadManager (2 en     │
│                                     paralelo), PIDs          │
│   • src-tauri/src/library_db.rs     SQLite (rusqlite)         │
│   • src-tauri/src/library_watcher.rs notify: library-changed  │
│   • src-tauri/src/queue.rs          cola de descargas persistente │
│   • src-tauri/src/paths.rs          carpeta de datos estable  │
│   • src-tauri/src/catalog.rs        iTunes/Deezer/MusicBrainz │
│   • src-tauri/src/lib.rs            comandos Tauri + ciclo de │
│                                     vida + asset scope        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Almacenamiento local                     │
│ app_local_data_dir() (AppData/Local/com.sakura.music)       │
│   • library.sqlite3                (índice SQLite + FTS5)    │
│   • library_cache.json             (caché v1 importada)      │
│   • download_queue.json            (cola persistente)      │
│   • covers/                        (carátulas)              │
│   • trash/                         (borrados con Deshacer)   │
│   • bin/                           (yt-dlp / ffmpeg)         │
└─────────────────────────────────────────────────────────────┘
```

Detalle completo en [`docs/arquitectura.md`](docs/arquitectura.md).

---

## 🚀 Requisitos e instalación

### Requisitos previos
1. **Node.js 20+** ([nodejs.org](https://nodejs.org/)) — el proyecto usa Vite 8.
2. **Rust estable** ([rustup.rs](https://rustup.rs/)) — el build.rs reporta la versión real con `rustc --version`.
3. **yt-dlp y FFmpeg en el `PATH`** (o en `bin/` de la carpeta de datos). La app los detecta y lo informa en Cola/Ajustes; sin yt-dlp no puede buscar ni descargar.

### Instalación y desarrollo
```powershell
git clone https://github.com/su-usuario/Sakura_Music.git
cd Sakura_Music
npm install
```

```powershell
npm run tauri dev     # desarrollo (doble clic en iniciar_sakura.bat en Windows)
npm run build         # tsc + vite build
npm run tauri build   # instalador .exe / .msi
```

Checks de código:

```powershell
npm run pipeline                                  # tipos, lint, formato, 60 unitarios, 33 E2E, build, fmt/clippy y 47 tests Rust
cargo test --manifest-path src-tauri/Cargo.toml   # 47 tests Rust
node node_modules/typescript/bin/tsc --noEmit     # tipos del frontend
```

Guía completa en [`docs/desarrollo.md`](docs/desarrollo.md) y [`docs/manual/instalacion.md`](docs/manual/instalacion.md).

---

## 📁 Estructura del proyecto

```text
Sakura_Music/
├── src/                          # Frontend (React + TypeScript)
│   ├── App.tsx                   # UI y estado: pestañas, player, editor, cola
│   ├── main.tsx                  # entrada de React
│   ├── App.css                   # Tailwind + variables --accent-* (tema Estudio y los 13 restantes)
│   ├── types.ts                  # tipos compartidos
│   ├── components/
│   │   ├── ZenTopNav.tsx         # navegación superior (7 pestañas; fallback para temas importados)
│   │   ├── HomeTab.tsx           # inicio
│   │   ├── LibraryTab.tsx        # biblioteca (9 vistas; fallback para temas importados)
│   │   ├── LibraryShowcase.tsx  # vista Pared (mosaico de portadas)
│   │   ├── NovelLibraryViews.tsx # vistas CDs/3D/Luz/Portadas
│   │   ├── LibraryToolbar.tsx    # cabecera y switcher de vistas
│   │   ├── PlayerBar.tsx         # reproductor + panel “Ahora suena”
│   │   ├── NowPlayingPanel.tsx   # pestañas Detalles/Letras/Álbum/Artista
│   │   ├── MetadataModal.tsx     # editor de metadatos
│   │   ├── BatchModal.tsx        # edición en lote
│   │   ├── SearchTab.tsx         # buscar y descargar
│   │   ├── QueueTab.tsx          # cola de descargas
│   │   ├── PlaylistsPanel.tsx    # pestaña Listas (SQLite)
│   │   ├── UndoToast.tsx         # borrado con Deshacer
│   │   ├── CommandPalette.tsx    # paleta Ctrl+K / ⌘K
│   │   ├── SystemPanel.tsx       # doctor: SQLite, papelera y logs
│   │   ├── ThemeNav.tsx / ThemeHome.tsx / ThemeLibrary.tsx / ThemeSearch.tsx / ThemeQueue.tsx  # vistas propias
│   │   ├── ThemeGeneratorModal.tsx # generador de temas
│   │   ├── SettingsTab.tsx       # ajustes
│   │   └── DeleteTracksDialog.tsx
│   ├── themes/
│   │   ├── customThemes.ts       # temas propios persistidos en localStorage
│   │   └── themeIcons.ts         # glifos por tema
│   └── hooks/
│       ├── usePlayer.ts          # reproducción, shuffle, repeat
│       ├── useDownloadQueue.ts   # cola de descargas + persistencia
│       ├── useOnlineSearch.ts    # búsqueda YouTube
│       ├── useFolderExplorer.ts  # navegación por carpetas
│       ├── useMetadataEditor.ts  # edición individual
│       ├── useBatchEditor.ts     # edición en lote
│       ├── useRemoteControl.ts   # servidor local en el puerto 17342
│       └── useThemeTransition.ts # View Transitions del splash a la nav
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── lib.rs                # comandos Tauri (43 en total), caché, scope asset, ciclo de vida
│   │   ├── catalog.rs            # comandos de catálogo (iTunes/Deezer/MusicBrainz)
│   │   ├── validacion.rs         # validación de parámetros IPC (longitudes, NUL, control)
│   │   ├── remote.rs             # control remoto local (puerto 17342)
│   │   ├── main.rs               # entrada desktop
│   │   ├── scanner.rs            # escaneo Rayon, tags lofty, escritura atómica, tests
│   │   ├── downloader.rs         # DownloadManager, yt-dlp, cancelación, tests
│   │   ├── library_db.rs         # índice SQLite (rusqlite + FTS5), migraciones, tests
│   │   ├── library_watcher.rs     # vigilante de carpeta (notify)
│   │   ├── queue.rs              # cola de descargas persistente, tests
│   │   └── paths.rs              # resolución centralizada de la carpeta de datos
│   ├── Cargo.toml / Cargo.lock   # dependencias (commiteado: es una app)
│   ├── tauri.conf.json           # ventana, CSP y asset scope acotado
│   └── capabilities/default.json
├── scripts/                      # benchmark_scan.mjs y utilidades
├── .github/workflows/            # CI (matriz Windows/macOS/Linux)
├── docs/                         # documentación del proyecto (ver abajo)
├── legacy_python/                # v1.0 histórica (Python + PySide6)
├── iniciar_sakura.bat            # lanzador de desarrollo para Windows
└── package.json                  # scripts y dependencias de Node.js
```

---

## 📚 Documentación

Todo el detalle vivido en `docs/`, en Markdown plano con Mermaid, sin MkDocs:

- **[Índice de docs](docs/README.md)** — mapa y convenciones.
- [Arquitectura](docs/arquitectura.md) — capas, hilos, persistencia y secuencias.
- [Requisitos](docs/requisitos.md) — promesas verificables con su criterio.
- [Casos de uso](docs/casos-de-uso.md) — actores y flujos contra el código real.
- [Desarrollo](docs/desarrollo.md) — setup, tests y recetas.
- [Contrato IPC](docs/ipc-contract.md) — los 51 comandos Tauri y los 7 eventos.
- [Formatos de datos](docs/data-formats.md) — SQLite, cola persistente y preferencias.
- [Manual de usuario](docs/manual/README.md) — instalación, buscar/descargar, biblioteca, playlists, deshacer, letras, metadatos y resolución de problemas.
- [Funciones nuevas](docs/nuevas-funciones.md) — playlists, deshacer, letras LRC, paleta ⌘K y benchmarks.
- [Herramientas](docs/herramientas/README.md) — CLI `sakura-cli`, generador de temas y control remoto.
- [Pipeline de CI](docs/pipeline.md) — etapas, métricas de tests y el comando `npm run pipeline`.
- [ADRs](docs/adr/README.md) — decisiones. Los 0001–0008 quedaron como histórico de la v1; 0009 y posteriores rigen la v2.
- [Cómo contribuir](CONTRIBUTING.md), [Seguridad](SECURITY.md), [Changelog](CHANGELOG.md), [sistema de diseño](docs/diseno.md) y [guía de release](docs/release.md).

> Las capturas en `docs/img/` son de la UI de la v1 (PySide6). Están pendientes de reemplazo por capturas de la app Tauri/React.

---

## 📄 Licencia

Este proyecto está bajo licencia MIT, tal como se detalla en el archivo `LICENSE`.
