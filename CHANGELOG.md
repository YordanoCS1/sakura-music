# Changelog

Todos los cambios destacables de este proyecto se registran acá. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado, [Semantic Versioning](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado
- Catálogo de metadatos con **MusicBrainz** y **Cover Art Archive**, además de iTunes y Deezer. Las consultas pasan por `src-tauri/src/catalog.rs` por CORS y por el User-Agent que exige MusicBrainz.
- Exploración de álbumes del catálogo: se abren sus pistas y se aplica la que corresponda a la canción en edición.
- Cuatro vistas nuevas de biblioteca: **CDs, 3D, Luz y Portadas** (llegamos a 9 vistas en total).
- Contrato IPC documentado en [docs/ipc-contract.md](docs/ipc-contract.md) y formatos de datos en [docs/data-formats.md](docs/data-formats.md).
- Documentación base: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md` y este changelog.

### Cambiado
- El único tema visual tiene id `space`; los tokens `--m3-*` se aplican bajo `[data-theme='space']`.
- Todos los comentarios del código están en español rioplatense y explican decisiones no obvias.
- La documentación se actualizó para reflejar 20 comandos Tauri, 17 tests Rust y 9 vistas.

### Eliminado
- El tema alternativo **WWM / "universos"** (bandera `isWWM`, ramas inalcanzables, CSS y partículas Jianghu).
- Código muerto: ~5.700 líneas de CSS heredado, el archivo huérfano `featuredArtists.ts`, los comandos `allow_music_dir` y `clear_download_queue`, la dependencia `base64` y el plugin `opener`.
- Paletas múltiples y las versiones antiguas de sidebar, toolbar, reproductor y home.

### Corregido
- Comentarios en inglés, obsoletos o huérfanos dejados por la limpieza anterior.
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
