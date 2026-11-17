# Desarrollo

Guía para quien se mete al código de Sakura Music 2.0: cómo instalar el entorno,
cómo correr tests y tipos, qué scripts hay y cómo agregar piezas nuevas sin
romper las garantías existentes.

## Entorno

```powershell
npm install
```

| Dependencia | Para qué |
|---|---|
| Node.js 20+ | Correr Vite y el CLI de Tauri (el proyecto usa Vite 8) |
| Rust estable + Cargo | Backend Tauri (`src-tauri/`) |
| `yt-dlp` / `ffmpeg` en `PATH` | Búsqueda, descarga y conversión reales |
| WebView2 (Windows) | Runtime de Tauri; viene preinstalado en Windows 10/11 |

La versión real de `rustc` se captura en `src-tauri/build.rs` y se muestra en
**Ajustes**. No hay que actualizarla a mano cuando cambia el toolchain.

## Mapa del código

```text
Sakura_Music/
├── src/                          # Frontend (React 19 + TypeScript)
│   ├── App.tsx                   # estado raíz: pestañas, player, editor, cola (~1080 líneas)
│   ├── main.tsx                  # entrada de React
│   ├── App.css                   # Tailwind + tokens --m3-* / --accent-* del tema M3 Zen
│   ├── types.ts                  # tipos compartidos (ScannedTrack, ViewMode, …)
│   ├── components/
│   │   ├── ZenTopNav.tsx         # navegación superior (pestañas + indicador)
│   │   ├── HomeTab.tsx
│   │   ├── LibraryTab.tsx        # vistas de biblioteca (Carpetas/Cuadrícula/Lista/Álbumes/Pared)
│   │   ├── LibraryShowcase.tsx   # vista Pared (mosaico de portadas)
│   │   ├── LibraryToolbar.tsx    # cabecera y switcher de vistas
│   │   ├── PlayerBar.tsx         # reproductor + Now Playing inmersivo
│   │   ├── MetadataModal.tsx     # editor de metadatos
│   │   ├── BatchModal.tsx        # edición en lote
│   │   ├── SearchTab.tsx         # buscar y descargar
│   │   ├── QueueTab.tsx          # cola de descargas
│   │   ├── SettingsTab.tsx
│   │   └── DeleteTracksDialog.tsx
│   ├── hooks/                    # usePlayer, useDownloadQueue, useOnlineSearch,
│   │    └── …                    # useFolderExplorer, useMetadataEditor, useBatchEditor
│   └── assets/
├── src-tauri/                    # Backend (Tauri 2 + Rust)
│   ├── src/
│   │   ├── main.rs               # callback mínimo para desktop
│   │   ├── lib.rs                # comandos Tauri (19), caché, scope asset, ciclo de vida
│   │   ├── scanner.rs            # walkdir + rayon + lofty, escritura atómica, tests
│   │   ├── downloader.rs         # DownloadManager, yt-dlp, cancelación, tests
│   │   ├── library_db.rs         # índice SQLite (rusqlite), tests
│   │   ├── library_watcher.rs    # vigilante de carpeta (notify), evento library-changed
│   │   ├── queue.rs              # cola de descargas persistente, tests
│   │   └── paths.rs              # carpeta de datos estable (OnceLock)
│   ├── Cargo.toml / Cargo.lock   # dependencias (Cargo.lock commiteado: es una app)
│   ├── build.rs                  # inyecta RUSTC_VERSION real
│   ├── tauri.conf.json           # ventana, CSP y asset scope
│   └── capabilities/default.json # permisos: core, dialog
├── docs/                         # esta documentación
├── legacy_python/                # v1.0 histórica (Python + PySide6), no se toca
├── iniciar_sakura.bat            # npm run tauri dev en Windows
└── package.json                  # scripts de frontend
```

La regla de capas: `paths.rs` es la única verdad sobre la carpeta de datos;
`scanner.rs` y `downloader.rs` no conocen React; `lib.rs` es el único que expone
comandos; `App.tsx` solo habla con `invoke` y eventos, nunca con `lofty` ni
`yt-dlp` directamente.

## Comandos del día a día

```powershell
npm run tauri dev       # desarrollo (o doble clic en iniciar_sakura.bat)
npm run build           # tsc + vite build → dist/
npm run tauri build     # instalador .exe / .msi
cargo test --manifest-path src-tauri/Cargo.toml   # 17 tests Rust
node node_modules/typescript/bin/tsc --noEmit      # tipos del frontend
```

### Recortar la corrida

```powershell
cargo test --manifest-path src-tauri/Cargo.toml downloader
cargo test --manifest-path src-tauri/Cargo.toml scanner
cargo test --manifest-path src-tauri/Cargo.toml escritura_atomica
```

Los tests Rust prueban parsing de `yt-dlp` (`parse_result_line`,
`parse_progress_line`, `extract_video_id`), detección de extensión de imagen
por firma, hash FNV-1a, formateo de duración y escritura atómica sin dejar
temporales. El test de escritura usa `target/test-tmp/` porque el rename
falla con `%TEMP%` desincronizado del cwd en este Windows.

## Casos de uso de desarrollo

Todo lo demás se verifica a mano: búsqueda real en YouTube, descarga en los 4
formatos, playlist completa, edición individual y en lote (incluido el mensaje
de fallos parciales), iTunes/Deezer, temas y universos, y cancelación/reintento
de filas.

## Recetas para extender

### Agregar un comando Tauri

1. Implementalo en `src-tauri/src/lib.rs` con `#[tauri::command]`. Devolvé
   `Result<T, String>` si puede fallar: el frontend recibe el string como error.
2. Registralo en `invoke_handler!` dentro de `run()`.
3. Llamalo desde `App.tsx` con `invoke<T>('nombre_comando', { args })` en
   notación camelCase (Tauri mapea `job_id` → `jobId`).
4. Si el comando crea archivos que el frontend muestra, autorizá su carpeta con
   `app.asset_protocol_scope().allow_directory(...)`.

### Agregar un tema

1. En `src/App.css`, agregá `[data-theme='nuevo']` con los 8 valores
   `--accent-200…950` en formato `R G B`.
2. En `src/types.ts`, sumá `'nuevo'` a `ThemeMode`; en `src/App.tsx`, agrega su
   entrada a `themeGlows` (glow/acento/badge/borde) y valida su persistencia.
3. En `src/components/AppSidebar.tsx`, añadí una opción accesible al selector.
4. Si el tema cambia fondos o superficies, define sus estilos en `App.css`.
   Corré `npm run build` para validar tipos y clases Tailwind.

Los cambios limitados a la paleta usan `accent-*`; los temas visuales completos
requieren estilos de superficie además de los tokens de color.

### Agregar una vista de biblioteca

1. Sumá el valor a `ViewMode` en `src/types.ts`.
2. Agregá su rama de render (`viewMode === 'nueva'`) en
   `src/components/LibraryTab.tsx` (o directamente en `LibraryShowcase.tsx` si
   es una vista de mosaico) respetando el filtro por carpeta activa, y su botón
   en el switcher de `src/components/LibraryToolbar.tsx`.
3. Si necesita selección múltiple, reusá `selectedTrackIds` y las casillas ya
   existentes.

### Agregar un formato de descarga

1. En `src-tauri/src/downloader.rs::run_download`, sumá la rama por
   `format_opt.to_lowercase()` con su `--audio-format` y calidad.
2. En `src/App.tsx`, agregá el botón del selector de calidad.
3. Probá una descarga real en el formato nuevo.

### Agregar una fuente de catálogo

1. En `src/App.tsx::searchCatalog`, sumá la rama con su `source` en el tipo
   `CatalogCandidate` y su `fetch` a la API.
2. Habilitá el host en el CSP (`connect-src`) de `src-tauri/tauri.conf.json`.
3. Normalizá el carátula a una URL `https:` (la UI la muestra tal cual) y los
   campos a strings vacíos si la API no los trae.

## Convenciones

| Convención | Regla |
|---|---|
| Idioma del código | Español rioplatense para comentarios y textos de UI; identificadores en inglés cuando el dominio lo exige |
| Capas | `paths`/`scanner`/`downloader` no conocen React; `App.tsx` no conoce Rust |
| Rutas | `paths.rs` es el único lugar que conoce la carpeta de datos; nunca hay rutas hardcodeadas de usuario |
| Escrituras | Siempre `write_atomic` para tags, caché y portadas |
| Colores | Solo `accent-*` (variables `--accent-*`) fuera de `App.css`; el resto es rosa de apoyo (status) |
| Tests | Un `#[test]` por comportamiento puro en su módulo; el frontend se verifica con `tsc` + build |

## Documentación

- El **porqué** de cada decisión está en [adr/](adr/README.md).
- Lo que la app **promete** está en [requisitos.md](requisitos.md).
- Los flujos están en [casos-de-uso.md](casos-de-uso.md).
- El manual de usuario está en [manual/](manual/README.md).

Cuando cambie un comportamiento, actualizá el requisito y su criterio en el
mismo commit. Cuando agregues una decisión estructural, sumá un ADR nuevo en
vez de reescribir los viejos.
