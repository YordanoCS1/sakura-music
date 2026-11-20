# Changelog

Todos los cambios destacables de este proyecto se registran acá. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado, [Semantic Versioning](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado
- Catálogo de metadatos con **MusicBrainz** y **Cover Art Archive**, además de iTunes y Deezer. Las consultas pasan por `src-tauri/src/catalog.rs` por CORS y por el User-Agent que exige MusicBrainz.
- Exploración de álbumes del catálogo: se abren sus pistas y se aplica la que corresponda a la canción en edición.
- Cuatro vistas nuevas de biblioteca: **CDs, 3D, Luz y Portadas** (llegamos a 9 vistas en total).
- Contrato IPC documentado en [docs/ipc-contract.md](docs/ipc-contract.md) y formatos de datos en [docs/data-formats.md](docs/data-formats.md).
- Documentación base: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, contrato IPC y formatos de datos.
- **CI** en GitHub Actions con matriz Windows/macOS/Linux: tipos, lint, formato, tests y build del frontend, más `fmt`, `clippy` y tests de Rust. Dependabot para npm, Cargo y Actions.
- Tooling de calidad: ESLint, Prettier, `rustfmt.toml`, scripts `check`/`typecheck`/`lint`/`format`/`test` y tests unitarios del frontend con Vitest (29 pruebas).
- `ErrorBoundary` que evita la pantalla en blanco y permite recargar; registro de avisos en `sakura.log`.
- Navegación por pestañas accesible (roles ARIA, flechas), menú de vistas con teclado, `aria-label` en controles de icono y trampa de foco en los modales.
- Fuentes servidas localmente (sin Google Fonts) y CSP ajustado en consecuencia; `getBoundingClientRect` del virtualizador se mide fuera del render.
- Instalación de yt-dlp y FFmpeg bajo demanda desde **Ajustes → Herramientas de descarga**, con URLs y hashes SHA256 fijados, progreso en vivo y sin reemplazar binarios existentes.
- **Mini reproductor**: tercer estilo que reduce la ventana, la fija siempre encima y muestra controles compactos; al salir se restaura el tamaño.
- **Sistema de diseño**: escala tipográfica con mínimo de 12 px (131 tamaños arbitrarios reemplazados), neutros semánticos `ink-*` (217 usos de `gray-*` centralizados), tres tokens de movimiento y componente `EmptyState` para biblioteca y cola.
- Tests E2E con Playwright sobre Vite con IPC simulado (26 pruebas) y guía de release con firma de bundles.
- **16 temas seleccionables:** 4 genéricos (**M3 Zen**/`space`, Yoru, Hanabi y Aizuri) con `LibraryTab` y sus 9 vistas, y 12 temas propios (**Sumi-e, Byōbu, Shoji, Origami, Swiss, Sumi Ink, Moonlit, Ledger, Shōnen, Fantasmas, Samurái y Kawaii**) con Home, biblioteca, cabecera, Buscar, Cola, ajustes, diálogos y transiciones propios. El selector `data-theme='space'` queda fijo y los propios usan `data-skin`.
- **Generador de temas** para crear variantes a partir de un arquetipo estructural, con CSS inyectado en runtime y persistencia en `localStorage`.
- **Panel “Ahora suena” ampliado** con pestañas Detalles, Letras, Álbum y Artista, color dominante de la carátula y transición continua del glifo del splash a la navegación con View Transitions.
- **Playlists persistentes** en las tablas `playlists` y `playlist_tracks` de SQLite: pestaña Listas con crear, renombrar, borrar, agregar pistas, quitarlas y reordenarlas, con estilo propio por tema.
- **Borrado con Deshacer:** el archivo se mueve a `<datos>/trash`, aparece un toast con **Deshacer** durante 9 segundos y Ajustes → Sistema muestra el contador y **Vaciar papelera**.
- **Letras `.lrc` sincronizadas** al lado del audio: resaltado de la línea activa, autoscroll y parser con varios timestamps por línea.
- **Paleta de comandos** `Ctrl+K` / `⌘K` para navegar, cambiar tema, reproducir y buscar pistas (↑↓, ↵, esc).
- **Doctor del sistema** en Ajustes → Sistema: salud de SQLite (integridad, pistas, FTS, tamaño y esquema), botones Verificar/Compactar/Crear respaldo/Vaciar papelera/Buscar actualizaciones y visor de logs con copiar.
- **Control remoto local** en el puerto `17342` y **CLI `sakura-cli`** para escaneo, búsqueda y generación de temas.
- **Actualizaciones automáticas firmadas** con minisign e instaladores NSIS/MSI; clave pública en `src-tauri/updater.key.pub`, privada ignorada por git y endpoint a configurar al publicar (`REPLACE_OWNER/REPLACE_REPO` en `tauri.conf.json`).
- **Migraciones versionadas** con `PRAGMA user_version=2` (1 = FTS5 y disparadores, 2 = índices en artista/álbum/año/genero), respaldo automático `VACUUM INTO` con retención de 3 y PRAGMAs WAL + `synchronous=NORMAL` + `temp_store=MEMORY` + `foreign_keys=ON`.
- **Benchmark de escaneo** `node scripts/benchmark_scan.mjs [cantidad]`: 10.000 pistas tardaron ~12,6 s en release en esta máquina; el CLI `scan` imprime los milisegundos.
- **`npm run pipeline`** como comando único para todo lo que corre el CI: 29 unitarios Vitest, 26 E2E Playwright y 42 tests Rust.

### Cambiado
- La identidad de los temas dejó de ser sólo de paleta: navegación, tarjetas, reproductor, tipografía y sombras cambian según el tema; ~200 superficies hardcodeadas se tokenizaron para que los 16 temas apliquen de verdad. Sumi-e incorpora textura washi, sellos hanko, ensō y trazos de pincel; los 12 temas propios suman estructura completa, con el selector base fijo en `data-theme='space'` y `data-skin` para cada uno.
- Todos los comentarios del código están en español rioplatense y explican decisiones no obvias.
- La documentación se actualizó para reflejar 43 comandos Tauri, 6 eventos, 42 tests Rust y 9 vistas.
- Código Rust y frontend formateados con `rustfmt` y Prettier; clippy pasa con `-D warnings`.
- La ventana se declara sin decoraciones también en `tauri.conf.json`, igual que en `lib.rs`.
- `DownloadManager` usa `parking_lot`: un panic en un hilo de descarga ya no envenena un mutex y, con `panic = "abort"`, no se lleva la app por delante.
- El scope del protocolo `asset:` se amplía sólo con rutas canónicas dentro de la biblioteca activa; antes se autorizaban sin validar.

### Eliminado
- El tema alternativo **WWM / "universos"** (bandera `isWWM`, ramas inalcanzables, CSS y partículas Jianghu).
- Código muerto: ~5.700 líneas de CSS heredado, el archivo huérfano `featuredArtists.ts`, los comandos `allow_music_dir` y `clear_download_queue`, la dependencia `base64` y el plugin `opener`.
- Paletas múltiples y las versiones antiguas de sidebar, toolbar, reproductor y home.
- Las galerías de diseño decorativas de Ajustes (`SakuraDesignGallery`, `LibraryDesignGallery` y `LibraryConceptsGallery`) y su CSS (~830 líneas).

### Corregido
- Comentarios en inglés, obsoletos o huérfanos dejados por la limpieza anterior.
- Dependencias de desarrollo obsoletas y el `@ts-expect-error` de `vite.config.ts` (ya está `@types/node`).
- El doc de `paths.rs` describía `app_local_data_dir` cuando el código usa `.tauri_data` dentro del directorio de trabajo.
- Referencias de documentación a archivos y comandos que ya no existen.

## [2.0.0]

Versión actual del proyecto, todavía sin publicar como versión oficial.

### Agregado
- Migración completa a **Tauri 2 + Rust** desde la v1 en Python/PySide6 (conservada en `legacy_python/`).
- Motor de escaneo paralelo con `rayon` + `walkdir` y tags leídos con `lofty`.
- Biblioteca en SQLite (`library.sqlite3`, modo WAL) con indexado por `mtime` + tamaño.
- Vigilante de carpeta con `notify` que emite `library-changed`.
- Reproducción desde Blob URL para no bloquear archivos en Windows.
- Editor de metadatos individual y en lote con escritura atómica y errores parciales visibles.
- Búsqueda y descarga con `yt-dlp`, cola persistente de hasta 100 trabajos, 2 descargas en paralelo y progreso por eventos.
- Interfaz M3 Zen en React 19 + TypeScript + Tailwind, con virtualización y `content-visibility`.

### Corregido
- Renombrar, retiquetar o cambiar la carátula de una pista mientras suena, sin `os error 5`.
- Limpieza de procesos `yt-dlp` / `ffmpeg` al cerrar la app.
- búsqueda de binarios sin rutas hardcodeadas.
