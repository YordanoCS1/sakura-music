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
│   ├── App.tsx                   # estado raíz: 6 pestañas (AppTab), player, editor, cola
│   ├── main.tsx                  # entrada de React
│   ├── App.css                   # Tailwind + tokens --m3-* / --accent-* / --theme-* de los 17 temas
│   ├── types.ts                  # tipos compartidos (ScannedTrack, ViewMode, AppTab, ThemeMode, …)
│   ├── components/
│   │   ├── ZenTopNav.tsx         # navegación superior (pestañas + indicador)
│   │   ├── ThemeNav.tsx          # navegación de los 13 temas propios
│   │   ├── ThemeHome.tsx         # inicio de los temas propios
│   │   ├── ThemeLibrary.tsx      # biblioteca propia (no usa las 9 vistas genéricas)
│   │   ├── ThemeQueue.tsx        # cola propia
│   │   ├── ThemeSearch.tsx       # búsqueda propia
│   │   ├── HomeTab.tsx
│   │   ├── LibraryTab.tsx        # 9 vistas: Carpetas/Cuadrícula/Lista/Álbumes/Pared/CDs/3D/Luz/Portadas
│   │   ├── VirtualizedGrid.tsx   # grid virtualizado + content-visibility (>60 pistas)
│   │   ├── LibraryShowcase.tsx   # vista Pared (mosaico de portadas)
│   │   ├── LibraryToolbar.tsx    # cabecera y switcher de vistas
│   │   ├── PlayerBar.tsx         # reproductor + Now Playing inmersivo
│   │   ├── NowPlayingPanel.tsx   # pestañas Detalles/Letras/Álbum/Artista
│   │   ├── PlaylistsPanel.tsx    # pestaña Listas
│   │   ├── CommandPalette.tsx    # ⌘K / Ctrl+K
│   │   ├── UndoToast.tsx         # deshacer borrados (9 s)
│   │   ├── SystemPanel.tsx       # salud BD, papelera, updater y logs
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
│   │   ├── lib.rs                # 40 comandos Tauri, scope asset, ciclo de vida
│   │   ├── catalog.rs            # 3 comandos de catálogo (iTunes/Deezer/MusicBrainz)
│   │   ├── scanner.rs            # walkdir + rayon + lofty, escritura atómica, tests
│   │   ├── downloader.rs         # DownloadManager, yt-dlp, cancelación, tests
│   │   ├── library_db.rs         # SQLite bundled + FTS5, user_version=2, backups, doctor, tests
│   │   ├── library_watcher.rs    # vigilante de carpeta (notify), evento library-changed
│   │   ├── playlists.rs          # tablas playlists/playlist_tracks con ON DELETE CASCADE
│   │   ├── lyrics.rs             # parser .lrc (varios timestamps por línea)
│   │   ├── validacion.rs         # validación en la frontera IPC
│   │   ├── queue.rs              # cola de descargas persistente, tests
│   │   ├── paths.rs              # carpeta de datos estable (OnceLock)
│   │   ├── logging.rs            # logs del sistema con redacción de secretos
│   │   ├── remote.rs             # control HTTP local (puerto 17342)
│   │   └── tools.rs              # detección e instalación con SHA256 fijo
│   ├── Cargo.toml / Cargo.lock   # dependencias (Cargo.lock commiteado: es una app; [profile.dev] debug=0)
│   ├── build.rs                  # inyecta RUSTC_VERSION real
│   ├── tauri.conf.json           # ventana, CSP, updater, NSIS/MSI y asset scope
│   ├── updater.key.pub           # clave pública del updater (la privada no se commitea)
│   └── capabilities/default.json # permisos: core, dialog, updater, process
├── scripts/
│   └── benchmark_scan.mjs        # benchmark de escaneo (10k pistas ≈ 12,6 s en release)
├── e2e/                          # suites Playwright (29 tests)
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
npm run check           # tipos + lint + formato + tests + build del frontend
npm run typecheck       # solo tsc --noEmit
npm run lint            # ESLint sobre src/
npm run format          # Prettier sobre TS/TSX/JS/JSON/YAML
npm run test            # Vitest (29 tests unitarios del frontend)
npm run test:e2e        # Playwright (29 tests E2E)
npm run pipeline        # check + E2E + fmt + clippy + cargo test → pasa en verde
cargo test --manifest-path src-tauri/Cargo.toml   # 43 tests Rust
cargo fmt --check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml -- -D warnings
```

> **`[profile.dev] debug = 0`** en `Cargo.toml`: MSVC (linker D8050) no maneja
> bien los target paths largos con información de debug completa. Si necesitás
> debug symbols, hacelo con un profile explícito, pero no cambies el default.

### Integración continua

`.github/workflows/ci.yml` ejecuta en Windows, macOS y Linux (matriz de 3 SO) las
mismas comprobaciones: `npm ci`, `npm run pipeline` (tipos, lint, formato, 29
unitarios, 29 E2E, build del frontend, `cargo fmt --check`, `cargo clippy -D
warnings` y los 43 tests Rust). La auditoría de npm (`npm run audit`) corre como
paso informativo: hoy hay un aviso *high* de `picomatch` que afecta solo a
dependencias de desarrollo y todavía no tiene corrección; no bloquea el pipeline.

El job `build` genera los instaladores **NSIS/MSI** cuando se dispara a mano o
se pushea un tag `v*`: usa los secrets `TAURI_SIGNING_PRIVATE_KEY` y
`TAURI_SIGNING_PRIVATE_KEY_PASSWORD` para firmar con el updater y sube el bundle
como artefacto. `.github/workflows/release.yml` publica en GitHub Releases con
el mismo par de claves; antes de publicar hay que reemplazar
`REPLACE_OWNER/REPLACE_REPO` en `tauri.conf.json`. Dependabot revisa npm, Cargo
y GitHub Actions semanalmente.

### Recortar la corrida

```powershell
cargo test --manifest-path src-tauri/Cargo.toml downloader
cargo test --manifest-path src-tauri/Cargo.toml scanner
cargo test --manifest-path src-tauri/Cargo.toml escritura_atomica
```

Los tests Rust prueban parsing de `yt-dlp` (`parsea_linea_de_busqueda`,
`parsea_progreso`, `extrae_id_de_urls_conocidas`,
`progreso_finished_pasa_a_convirtiendo`,
`rechaza_duplicados_activos_y_permite_reintentar_al_terminar`), detección de
extensión de imagen por firma, hash FNV-1a, formateo de duración y escritura
atómica sin dejar temporales. El test de escritura usa `target/test-tmp/`
porque el rename falla con `%TEMP%` desincronizado del cwd en este Windows.
Además hay tests de integración de la migración `user_version` con backup
automático sobre una base en disco, del parser `.lrc`, de las consultas de
playlists y del toast de deshacer.

### Benchmark de escaneo

`scripts/benchmark_scan.mjs [cantidad]` genera MP3 mínimos y mide el escaneo
real del CLI compilado en release (el comando `scan` ya imprime los
milisegundos). En esta máquina, **10.000 pistas tardaron ~12,6 s** en el primer
escaneo. Para correrlo:

```powershell
npm run build
cargo build --release --manifest-path src-tauri/Cargo.toml
node scripts/benchmark_scan.mjs 10000
```

Es una medición manual: no entra en `npm run pipeline` porque depende de
tiempos de disco y del binario release.

## Casos de uso de desarrollo

Los tests del frontend (`src/**/*.test.ts` y `.test.tsx`, 29 en total) cubren
la conversión entre el ítem de UI y el formato persistido de la cola, el toast
de deshacer y el fallback del `ErrorBoundary`; los 29 tests E2E de `e2e/`
verifican arranque, splash, las 6 pestañas, paleta ⌘K y teclado. Todo lo demás
se verifica a mano: búsqueda real en YouTube, descarga en los 4 formatos,
playlist completa, edición individual y en lote (incluido el mensaje de fallos
parciales), iTunes/Deezer/MusicBrainz, letras `.lrc`, playlists, los 17 temas y
sus efectos, cancelación/reintento de filas y búsqueda de actualizaciones.

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

**Genérico:** sumá el id a `ThemeMode` en `src/types.ts` y un bloque
`.app-shell[data-skin='id']` en `src/App.css` con `--m3-*`, `--space-*`,
`--accent-*` y `--theme-*`. Mantiene `data-theme="space"` fijo y reutiliza
`LibraryTab` de 9 vistas.

**Propio:** además de lo anterior, creá sus `ThemeLibrary`/`ThemeHome`/`ThemeNav`
según corresponda, con cabecera, Buscar, Cola, ajustes, diálogos y transiciones
propios, más iconos y splash propios. Revisá `ViewMode` y el switcher si
agregás vistas. Verificá el handoff del glifo con
`view-transition-name: sakura-glifo`.

Corré `npm run build` para validar tipos y clases Tailwind. Los cambios
limitados a la paleta usan `accent-*`; los 13 temas propios requieren estilos de
superficie además de los tokens de color. Ver [ADR 0012](adr/0012-temas-multiples.md).

### Agregar una playlist o una operación de papelera

1. Implementá la lógica en `src-tauri/src/playlists.rs` (o `library_db.rs` para
   `deleted_tracks`), con `foreign_keys=ON` y `ON DELETE CASCADE`.
2. Exponé el comando en `lib.rs`, registralo en `invoke_handler!` y validá los
   argumentos en `validacion.rs` en la frontera IPC.
3. Agregalo a `docs/ipc-contract.md` (46 comandos / 6 eventos) y al tipo en
   `src/types.ts`; consumilo desde `PlaylistsPanel` o `UndoToast`.
4. Si el comando crea archivos visibles, autorizá la carpeta con
   `app.asset_protocol_scope().allow_directory(...)`.

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

1. En `src-tauri/src/catalog.rs`, sumá la rama con su `source` en los comandos
   `search_catalog_songs`, `search_catalog_albums` y `open_catalog_album`, y el
   `fetch` con `reqwest` (con User-Agent propio) a la API.
2. Habilitá el host en el CSP (`connect-src`) de `src-tauri/tauri.conf.json`.
3. Normalizá la carátula a una URL `https:` (la UI la muestra tal cual) y los
   campos a strings vacíos si la API no los trae.

## Convenciones

| Convención | Regla |
|---|---|
| Idioma del código | Español rioplatense para comentarios y textos de UI; identificadores en inglés cuando el dominio lo exige |
| Capas | `paths`/`scanner`/`downloader` no conocen React; `App.tsx` no conoce Rust |
| Rutas | `paths.rs` es el único lugar que conoce la carpeta de datos; nunca hay rutas hardcodeadas de usuario |
| Escrituras | Siempre `write_atomic` para tags, caché y portadas |
| Colores | Solo `accent-*` (variables `--accent-*`) fuera de `App.css`; el resto es rosa de apoyo (status) |
| Tests | Un `#[test]` por comportamiento puro en su módulo (43 Rust); el frontend con 29 unitarios Vitest + 29 E2E Playwright, más `tsc` + build |

## Documentación

- El **porqué** de cada decisión está en [adr/](adr/README.md).
- Lo que la app **promete** está en [requisitos.md](requisitos.md).
- Los flujos están en [casos-de-uso.md](casos-de-uso.md).
- El manual de usuario está en [manual/](manual/README.md).

Cuando cambie un comportamiento, actualizá el requisito y su criterio en el
mismo commit. Cuando agregues una decisión estructural, sumá un ADR nuevo en
vez de reescribir los viejos.
