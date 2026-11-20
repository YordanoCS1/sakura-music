# Changelog

Todos los cambios destacables de este proyecto se registran acá. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado, [Semantic Versioning](https://semver.org/lang/es/).

## [Sin publicar]

### Agregado
- **Descargas más resilient**: reintentos automáticos con backoff, fallback de formato, notificación y sonido al terminar, historial persistente, filtro de duración, reorden y filtro de la cola, y opción de arranque rápido sin reescaneo.
- **Mejoras de descarga**: archivo persistente de IDs para no repetir pistas, indexación automática al terminar, portada HD del catálogo, errores traducidos y concurrencia configurable (1–4) en Ajustes → Sistema.
- **Instalador personalizado** con marca Estudio: cabecera y barra lateral propias, selector de idioma, página de elección de carpeta, menú Inicio, acceso al escritorio y hooks que documentan la ruta de datos y limpian al desinstalar.
- **Portada giratoria**: la tapa del reproductor y del panel "Ahora suena" gira mientras suena y se frena al pausar, con forma y velocidad propias por tema (círculo en Moonlit, cuadrado en Swiss, viñeta en Manga).
- **Iconos animados por tema**: chispa en Shōnen, niebla en Fantasmas, pétalo en Sakura, tinta en Sumi-e, tramado en Manga; CSS puro y `prefers-reduced-motion`.
- **Pestaña de estadísticas**: duración, géneros, artistas top, décadas, formatos y cobertura de portadas con gráficos adaptados a cada tema.
- **Galería de temas**: vista museo con las 14 apariencias —14 con identidad propia, todas con badge **PROPIO**—, miniatura, preview en vivo y aplicación con un clic; se abre desde Ajustes → Apariencia.
- **Estados de carga temáticos**: indicadores con 14 variantes (pétalo, ensō, pincel, barras, chispa, tramado, etc.) en escaneo, búsqueda, letras y guardado de metadatos.
- **Auditoría de contraste**: corrección AA en Origami, Swiss y Kawaii, texto sobre acento por tema y test guardian en `src/lib/contraste.test.ts` (informe en `docs/contraste.md`).
- El tema **Manga** también cubre Buscar, Cola y el editor de metadatos con viñetas, cabeceras de capítulo y superficies blanco/negro con acento rojo; las portadas de la biblioteca se muestran a color con marco y sombra dura.
- **Tema Manga** (`manga`, "Viñetas, tinta y screentone"): el decimotercer tema propio con identidad estructural. Home con portada de revista (`第 01 話`, globo de diálogo, sello 開 y línea de tiempo), biblioteca en páginas de viñetas (panel halftone, globo con el título, tag **GO!**, portadas en blanco y negro), cabecera negra con el glifo 漫, navegación con kanji sobre cuadrado rojo, estilo propio en Ajustes, panel "Ahora suena", playlists, paleta ⌘K, modales de metadatos, splash y transición `t-manga`. Paleta papel `#fbfaf7`, tinta `#101010` y acento rojo `#d62828`; usa `data-theme="space"` fijo y `data-skin="manga"`. Quedó como arquetipo del generador de temas y sumó snapshots `manga-home-win32.png` y `manga-library-win32.png` (el loop visual pasó a 7 temas y hoy cubre 8 con Estudio). Total: **14 temas** (13 propios en ese momento; hoy los 14 son propios).
- **Búsqueda online de letras** en LRCLIB desde el panel “Ahora suena”, con resultados SINC/PLANA, botón *Aplicar* que escribe el `.lrc` al lado de la pista y *Quitar .lrc*. Tres comandos IPC nuevos y CSP actualizada.
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
- Tests E2E con Playwright sobre Vite con IPC simulado (29 pruebas) y guía de release con firma de bundles.
- **14 temas seleccionables, todos con identidad propia:** **Estudio** (`space`, "Consola de mezcla y medidores VU"), **Sumi-e, Byōbu, Shoji, Origami, Swiss, Sumi Ink, Moonlit, Ledger, Shōnen, Fantasmas, Samurái, Kawaii y Manga** tienen Home, biblioteca, cabecera, Buscar, Cola, ajustes, diálogos y transiciones propios, no sólo otra paleta. El selector `data-theme='space'` queda fijo y todos aplican además `data-skin` (también `space`). `LibraryTab` y `ZenTopNav` se conservan en el código sólo como fallback para temas importados.
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
- **`npm run pipeline`** como comando único para todo lo que corre el CI: 60 unitarios Vitest, 32 E2E Playwright y 47 tests Rust.

### Cambiado
- Los archivos descargados se nombran `Artista - Canción.opus`, sin el `[IDdeYouTube]`. Si ya existe, se agrega `(2)`, `(3)`… en vez de saltear la descarga; la misma URL repetida en la cola sí se rechaza con un aviso.
- La biblioteca de **Estudio** pasó de una fila de datos a una **mesa de mezcla**: canales verticales con EQ de 3 bandas, fader con escala dB, medidor VU, pan, transporte y bus master, con las acciones rápidas visibles en cada canal.
- El tema por defecto M3 Zen fue rediseñado como Estudio, con vistas propias de consola de mezcla; dejó de ser el tema genérico. Mantiene el id interno `space` y `data-theme="space"` fijo, y ahora también aplica `data-skin="space"`: los 14 temas oficiales son propios y la vista genérica queda sólo como fallback para temas importados.
- La identidad de los temas dejó de ser sólo de paleta: navegación, tarjetas, reproductor, tipografía y sombras cambian según el tema; ~200 superficies hardcodeadas se tokenizaron para que los 14 temas apliquen de verdad. Sumi-e incorpora textura washi, sellos hanko, ensō y trazos de pincel; los 14 temas oficiales suman estructura completa, con el selector base fijo en `data-theme='space'` y `data-skin` para cada uno.
- Todos los comentarios del código están en español rioplatense y explican decisiones no obvias.
- La documentación se actualizó para reflejar 51 comandos Tauri, 7 eventos, 47 tests Rust y 9 vistas.
- Código Rust y frontend formateados con `rustfmt` y Prettier; clippy pasa con `-D warnings`.
- La ventana se declara sin decoraciones también en `tauri.conf.json`, igual que en `lib.rs`.
- `DownloadManager` usa `parking_lot`: un panic en un hilo de descarga ya no envenena un mutex y, con `panic = "abort"`, no se lleva la app por delante.
- El scope del protocolo `asset:` se amplía sólo con rutas canónicas dentro de la biblioteca activa; antes se autorizaban sin validar.

### Eliminado
- **Eliminado:** los temas Yoru, Hanabi y Aizuri (eran variantes de paleta sin vistas estructurales propias); quedan 14 temas.
- El tema alternativo **WWM / "universos"** (bandera `isWWM`, ramas inalcanzables, CSS y partículas Jianghu).
- Código muerto: ~5.700 líneas de CSS heredado, el archivo huérfano `featuredArtists.ts`, los comandos `allow_music_dir` y `clear_download_queue`, la dependencia `base64` y el plugin `opener`.
- Paletas múltiples y las versiones antiguas de sidebar, toolbar, reproductor y home.
- Las galerías de diseño decorativas de Ajustes (`SakuraDesignGallery`, `LibraryDesignGallery` y `LibraryConceptsGallery`) y su CSS (~830 líneas).

### Corregido
- Las descargas ya no abren una ventana CMD: los procesos yt-dlp/	askkill/where.exe se lanzan con CREATE_NO_WINDOW en Windows.
- Comentarios en inglés, obsoletos o huérfanos dejados por la limpieza anterior.
- Dependencias de desarrollo obsoletas y el `@ts-expect-error` de `vite.config.ts` (ya está `@types/node`).
- El doc de `paths.rs` describía `app_local_data_dir` cuando el código usa `.tauri_data` dentro del directorio de trabajo.
- Referencias de documentación a archivos y comandos que ya no existen.

### Listo para empaquetar
- La carpeta de datos pasó del directorio de trabajo a `APPLOCALDATA` de Tauri, con migración automática del `.tauri_data` antiguo: la app instalada ya no intenta escribir en `Program Files`.
- Endpoint del actualizador apuntado a `sakura-music/sakura-music` y bundle NSIS/MSI configurados.

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
- Interfaz inicial (entonces M3 Zen, hoy **Estudio**) en React 19 + TypeScript + Tailwind, con virtualización y `content-visibility`.

### Corregido
- Renombrar, retiquetar o cambiar la carátula de una pista mientras suena, sin `os error 5`.
- Limpieza de procesos `yt-dlp` / `ffmpeg` al cerrar la app.
- búsqueda de binarios sin rutas hardcodeadas.
