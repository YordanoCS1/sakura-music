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
- Tooling de calidad: ESLint, Prettier, `rustfmt.toml`, scripts `check`/`typecheck`/`lint`/`format`/`test` y tests unitarios del frontend con Vitest (7 pruebas).
- `ErrorBoundary` que evita la pantalla en blanco y permite recargar; registro de avisos en `sakura.log`.
- Navegación por pestañas accesible (roles ARIA, flechas), menú de vistas con teclado, `aria-label` en controles de icono y trampa de foco en los modales.
- Fuentes servidas localmente (sin Google Fonts) y CSP ajustado en consecuencia; `getBoundingClientRect` del virtualizador se mide fuera del render.
- Instalación de yt-dlp y FFmpeg bajo demanda desde **Ajustes → Herramientas de descarga**, con URLs y hashes SHA256 fijados, progreso en vivo y sin reemplazar binarios existentes.
- **Mini reproductor**: tercer estilo que reduce la ventana, la fija siempre encima y muestra controles compactos; al salir se restaura el tamaño.
- **Sistema de diseño**: escala tipográfica con mínimo de 12 px (131 tamaños arbitrarios reemplazados), neutros semánticos `ink-*` (217 usos de `gray-*` centralizados), tres tokens de movimiento y componente `EmptyState` para biblioteca y cola.
- Tests E2E con Playwright sobre Vite con IPC simulado y guía de release con firma de bundles.

### Cambiado
- Cinco temas seleccionables: M3 Zen (`space`), Sumi-e, Yoru, Hanabi y Aizuri, con identidad propia: navegación, tarjetas, reproductor, tipografía y sombras cambian según el tema, no sólo la paleta. Sumi-e incorpora textura washi, sellos hanko, ensō y trazos de pincel; ~200 superficies hardcodeadas se tokenizaron para que los temas apliquen de verdad.
- Todos los comentarios del código están en español rioplatense y explican decisiones no obvias.
- La documentación se actualizó para reflejar 22 comandos Tauri, 21 tests Rust y 9 vistas.
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
