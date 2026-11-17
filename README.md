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
- **Biblioteca en SQLite:** la caché vive en `library.db` (modo WAL) dentro de la carpeta de datos del usuario, vía `rusqlite`. Se actualiza por `mtime` + tamaño, así que re-escanea sin leer los tags de todo el disco.
- **Escritura atómica:** todos los tags, la base de datos y las portadas se escriben con temporal + `rename`, con reintentos. Un corte de luz no deja el archivo a medio escribir.
- **Carátulas:** se extraen a `covers/` con deduplicación por hash y extensión real según la firma del archivo (JPG/PNG/WebP/GIF/BMP/TIFF), no siempre `.jpg`.
- **Vigilante de la carpeta:** `notify` observa la carpeta escaneada y emite `library-changed` cuando cambian los archivos, para actualizar la vista sin re-escanear a mano.

### 🎵 Reproducción sin bloqueo de archivos
- El audio se sirve vía protocolo `asset:` y se carga en memoria como Blob URL.
- Al soltar el `fetch`, Windows libera el handle: podés renombrar, editar tags o cambiar la carátula **mientras suena**, sin `os error 5`.
- Play/pausa, seek, volumen, mute, shuffle, repetición (`off` / `all` / `one`) y avance automático que respeta "repetición apagada" al llegar al final de la lista.
- **Reproductor inmersivo (Now Playing):** clic en la portada del player y se abre una vista grande con la portada protagonista, el fondo teñido con el color dominante de la carátula y controles amplios.

### 🏷️ Editor de metadatos y edición en lote
- Edición individual y por lote (Batch Editor) con `lofty` en RAM y escritura atómica.
- El lote devuelve `{ updated, errors }`: si 2 de 10 archivos fallan, la app te dice **cuáles** en vez de fingir éxito.
- Campos: título, artista, artista del álbum, álbum, número de pista, año, género y carátula. Lo que no marcás no se toca.
- Carátulas: archivo local (JPG/PNG/WebP), pegar con `Ctrl+V` y eliminar. Las temporales `temp_*` se borran al abrir la app y antes de guardar una nueva.
- Catálogo: búsqueda real en **iTunes**, **Deezer** (`api.deezer.com/search`) y **MusicBrainz** (con portadas de **Cover Art Archive**), con carátula HD, "Aplicar todo", "Solo portada" y exploración de álbumes. Las peticiones pasan por comandos Tauri en `src-tauri/src/catalog.rs`.
- Control de cambios por campo con reversión individual y "restablecer valores originales".
- Diseño premium adaptado al tema claro (superficies blancas, texto legible, foco rosa).

### 📥 Búsqueda, playlists y descarga en segundo plano
- Búsqueda en YouTube con `ytsearch10` vía `yt-dlp`, playlists resueltas con `--flat-playlist` sin descargar, y `--no-playlist` al bajar pistas sueltas.
- Cola con **máximo 2 descargas en paralelo**, cancelación por ítem y "Cancelar todo", reintento de fallidas/canceladas, limpieza de terminadas y **persistencia entre sesiones** (`download_queue.json`): al reabrir, lo interrumpido se reanuda solo.
- Al salir se cancelan y matan los procesos `yt-dlp`/`ffmpeg` vivos.
- Formatos: Opus (`--audio-quality 0`), FLAC (sin pérdida), M4A/AAC 192 kbps y MP3 320 kbps, siempre con metadatos y carátula embebidos.
- Progreso en tiempo real por evento `download-progress` (porcentaje, velocidad, ETA). yt-dlp imprime `after_move:filepath` y si no, se busca el archivo por `[id]` en la carpeta destino.
- yt-dlp/ffmpeg se buscan en: carpeta de datos de la app (`bin/`), instalación histórica de la v1 (`%APPDATA%/LOCALAPPDATA`), enlaces de winget y `PATH`. Nunca hay rutas hardcodeadas de un usuario.
- Timeouts y reintentos de red: `--socket-timeout 30`, `--retries 3`, `--fragment-retries 3`, `--windows-filenames`.

### 🎨 Interfaz M3 Zen (Material 3 + calma japonesa)
- **Un único tema:** **M3 Zen** — superficies claras marfil (`#fbf7f4`), tarjetas blancas con sombras suaves, acento **rosa sakura** (`#b5126a`), sin glassmorphism ni blur, tipografía legible (base 14 px). Se guarda en `localStorage` con la clave `sakura_theme` y el valor `space` (el id del tema).
- **Navegación superior:** barra de pestañas con indicador deslizante animado y emblema de vinilo con el kanji 桜.
- 5 pestañas: Inicio, Biblioteca, Buscar, Cola y Ajustes.
- **9 vistas de biblioteca:** Carpetas (con breadcrumbs), Cuadrícula, Lista (tabla), Álbumes, **Pared** (mosaico de portadas con el título y artista de cada canción, filtrado por la carpeta seleccionada), **CDs**, **3D (Tilt)**, **Luz (Glow)** y **Portadas**.
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
│   • Tailwind 3 + variables --accent-* del tema M3 Zen        │
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
│   • library_cache.json / library.sqlite3  (índice)          │
│   • download_queue.json            (cola persistente)      │
│   • covers/                        (carátulas)              │
│   • bin/                           (yt-dlp / ffmpeg)         │
└─────────────────────────────────────────────────────────────┘
```

Detalle completo en [`docs/arquitectura.md`](docs/arquitectura.md).

---

## 🚀 Requisitos e instalación

### Requisitos previos
1. **Node.js 20+** ([nodejs.org](https://nodejs.org/)) — el proyecto usa Vite 8.
2. **Rust estable** ([rustup.rs](https://rustup.rs/)) — el build.rs reporta la versión real con `rustc --version`.
3. **yt-dlp y FFmpeg en el `PATH`** (o en `bin/` de la carpeta de datos). La app los detecta y lo informa en Cola/Ajustes; sin yt-dlp no podés buscar ni bajar.

### Instalación y desarrollo
```powershell
git clone https://github.com/tu-usuario/Sakura_Music.git
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
cargo test --manifest-path src-tauri/Cargo.toml   # 21 tests Rust
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
│   ├── App.css                   # Tailwind + variables --accent-* (tema M3 Zen)
│   ├── types.ts                  # tipos compartidos
│   ├── components/
│   │   ├── ZenTopNav.tsx         # navegación superior (pestañas)
│   │   ├── HomeTab.tsx           # inicio
│   │   ├── LibraryTab.tsx        # biblioteca (vistas)
│   │   ├── LibraryShowcase.tsx  # vista Pared (mosaico de portadas)
│   │   ├── LibraryToolbar.tsx    # cabecera y switcher de vistas
│   │   ├── PlayerBar.tsx         # reproductor + Now Playing inmersivo
│   │   ├── MetadataModal.tsx     # editor de metadatos
│   │   ├── BatchModal.tsx        # edición en lote
│   │   ├── SearchTab.tsx         # buscar y descargar
│   │   ├── QueueTab.tsx          # cola de descargas
│   │   ├── SettingsTab.tsx       # ajustes
│   │   └── DeleteTracksDialog.tsx
│   └── hooks/
│       ├── usePlayer.ts          # reproducción, shuffle, repeat
│       ├── useDownloadQueue.ts   # cola de descargas + persistencia
│       ├── useOnlineSearch.ts    # búsqueda YouTube
│       ├── useFolderExplorer.ts  # navegación por carpetas
│       ├── useMetadataEditor.ts  # edición individual
│       └── useBatchEditor.ts     # edición en lote
├── src-tauri/                    # Backend Rust
│   ├── src/
│   │   ├── lib.rs                # comandos Tauri (19), caché, scope asset, ciclo de vida
│   │   ├── catalog.rs            # 3 comandos de catálogo (iTunes/Deezer/MusicBrainz)
│   │   ├── main.rs               # entrada desktop
│   │   ├── scanner.rs            # escaneo Rayon, tags lofty, escritura atómica, tests
│   │   ├── downloader.rs         # DownloadManager, yt-dlp, cancelación, tests
│   │   ├── library_db.rs         # índice SQLite (rusqlite), tests
│   │   ├── library_watcher.rs     # vigilante de carpeta (notify)
│   │   ├── queue.rs              # cola de descargas persistente, tests
│   │   └── paths.rs              # resolución centralizada de la carpeta de datos
│   ├── Cargo.toml / Cargo.lock   # dependencias (commiteado: es una app)
│   ├── tauri.conf.json           # ventana, CSP y asset scope acotado
│   └── capabilities/default.json
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
- [Contrato IPC](docs/ipc-contract.md) — los 22 comandos Tauri y los 5 eventos.
- [Formatos de datos](docs/data-formats.md) — SQLite, cola persistente y preferencias.
- [Manual de usuario](docs/manual/README.md) — instalación, buscar/descargar, biblioteca, metadatos y resolución de problemas.
- [ADRs](docs/adr/README.md) — decisiones. Los 0001–0008 quedaron como histórico de la v1; 0009 y posteriores rigen la v2.
- [Cómo contribuir](CONTRIBUTING.md), [Seguridad](SECURITY.md), [Changelog](CHANGELOG.md), [pipeline de CI](docs/pipeline.md) y [guía de release](docs/release.md).

> Las capturas en `docs/img/` son de la UI de la v1 (PySide6). Están pendientes de reemplazo por capturas de la app Tauri/React.

---

## 📄 Licencia

Este proyecto está bajo licencia MIT, tal como se detalla en el archivo `LICENSE`.
