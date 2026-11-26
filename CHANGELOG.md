# Changelog

Todos los cambios destacables de este proyecto se registran aquí. El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el versionado, [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2026-11-25

### Cambiado
- **CI sin compilación incremental**: `.github/workflows/ci.yml` fija `CARGO_INCREMENTAL: '0'` a nivel de `env`. En las runners descartables el incremental apenas acelera el build (el código cambia en cada push) y acumula sesiones que inflan el caché de `Swatinem/rust-cache@v2`. El desarrollo local no se toca: `npm run tauri dev` sigue con incremental activo. La razón quedó documentada en `docs/pipeline.md`.

### Agregado
- **Tipografía Fraunces Variable y tonos OKLCH**: los titulares de los cinco temas nuevos usan `fraunces-latin-variable.woff2` (OFL-1.1, servida desde `public/fonts/`, con ejes `wght`/`opsz`/`SOFT`/`WONK`) declarada en `src/styles/fuentes.css`. Se agregó `colorjs.io` como dependencia de desarrollo y el script `npm run paletas`, que deriva `--*-hover`, `--*-activo` y `--*-suave` para cada tema en `src/themes/styles/tonos-oklch.css`; esos tonos reemplazan los colores de estado activo escritos a mano. Documentado en `docs/diseno.md` (capas de tokens), `docs/manual/apariencia.md` y `public/fonts/README.md`, con capturas antes/después de Loto.
- **Script `npm run clean:cargo`** (`scripts/limpiar_cache_rust.mjs`): borra `src-tauri/target/debug/incremental` e informa los MB liberados; con `-- --all` ejecuta `cargo clean` completo. Se niega a operar si detecta `cargo`, `rustc` o los ejecutables de la app en marcha, para no borrar archivos bloqueados. Es tooling de desarrollo, no una función de la app; documentado en `docs/desarrollo.md`.
- **Guía para agregar un tema** (`docs/como-agregar-un-tema.md`): checklist de diez pasos con los archivos exactos (`themeCatalog`, `themeMeta`, `themeIcons`, `App.css`, módulos de `src/themes/styles/`, `ThemeHome`, `ThemeLibrary`, `ThemeNav`, `CoverFullscreen`), reglas de recursos locales y reduced-motion, tabla de formas ya ocupadas por las 18 bibliotecas existentes, verificación con tests y capturas, y errores frecuentes. Enlazada desde `docs/README.md` y `desarrollo.md`.
- **ADR 0022** (`docs/adr/0022-cinco-temas-con-biblioteca-propia.md`): registra la decisión de dar estructura propia a los cinco temas nuevos, la foto CC0 local y la verificación por capturas; se anotó en el índice que ADR 0018 quedó reservado y no se reutiliza.
- **Capturas reales de la v2** en `docs/img/v2-*.png` (Inicio, Biblioteca Sakura, Buscar, Cola, Listas y Ajustes), generadas con Playwright sobre Vite e IPC simulado. `docs/README.md` ya no muestra las capturas de PySide6 ni el aviso de "pendientes de reemplazo".
- **Contrato IPC al día**: `docs/ipc-contract.md` pasa de 51 a **59 comandos** e incorpora los diez que faltaban (historial de descargas, portabilidad, imágenes, apertura de archivos y PIN/respuesta remota). Un script compara el `generate_handler!` de Rust con la tabla: coincide exactamente. Cifras corregidas también en `README`, `arquitectura`, `desarrollo` y `pipeline`.
- **Manual de control remoto** (`docs/manual/control-remoto.md`): activación por QR y PIN de 6 dígitos, IP manual, firewall del puerto 17342, qué se puede hacer desde el celular, límites (sin streaming, sin selector de archivos, sin eventos push), tabla de fallos y reflejo en el código. Se movió desde `manual/instalacion.md`, que ahora sólo enlaza, y se agregó a los índices de documentación.
- **Pase de consistencia de documentación**: 14 → 19 temas y cifras 60/33/47 → 94/41/59 en los documentos vivos (`README`, `arquitectura`, `diseno`, `contraste`, `requisitos`, `casos-de-uso`, `nuevas-funciones`, `desarrollo`, `pipeline`, `temas/informe-temas` y el manual). `pipeline.md` ya no describe el job de instalador con firma ni artifacts; `instalacion.md` no promete un `.exe/.msi`. Los ADRs conservan sus cifras históricas y reciben una nota fechada de corrección, según su propia regla.
- **Guía de racional de decisiones** (`docs/racional-de-decisiones.md`): 22 apartados con el mismo formato (decisión, por qué, alternativas descartadas, consecuencia y reflejo en el código), mapa Mermaid, índice con anclas y resumen final. Cubre el stack Rust + React + Tauri, el enfoque local-first sin login ni streaming, SQLite con FTS5, `data-theme` fijo con `data-skin`, bibliotecas con estructura única, el puente HTTP con PIN, notificaciones nativas, foto CC0 local, sin instalador/updater, organización modular, tags del archivo como fuente de verdad, yt-dlp/ffmpeg como subprocesos, cola persistente, playlists, papelera, letras LRC + LRCLIB, validación IPC, paleta de comandos, presentación con exportación PNG y miniaturas; incluye además las decisiones retiradas y los principios rectores. Enlaza los ADRs existentes y se sumó al índice de documentación.
- **Sakura jardín hanami**: la biblioteca estrena un hero con la foto real del cerezo, medallón de flor de cinco pétalos con la pista activa, rama que atraviesa las flores y tarjetas con portada en pétalos, numeración “FLOR 01”, metadata completa y disposición en zigzag.
- **Cuatro bibliotecas con estructura única y sin parecidos entre sí**: Loto Imperial es un tríptico de rollos de seda con aletas laterales, varillas doradas y sellos; La Gran Ola es un rollo lateral de estampas apaisadas con ola SVG y sello rojo; Tocadiscos 3D es una estantería de fundas con discos que asoman, inclinación 3D y plato activo giratorio; Karesansui es un jardín de arena rastrillada con piedras de paso de formas orgánicas y una roca mayor. Cada una usa su propia estructura, no una grilla de tarjetas coloreadas.
- **Sakura con foto real**: el SVG del árbol se reemplazó por una fotografía de un cerezo en flor (CC0, guardada en `public/images/`, sin red), con pétalos animados y desvanecido; la biblioteca usa la misma foto desenfocada de fondo y tarjetas de jardín más ricas.
- **19 temas con identidad completa**: a los 14 originales se suman Árbol de Sakura, Loto Imperial, La Gran Ola, Tocadiscos 3D y Karesansui, con Home y biblioteca propias. Un módulo de realce añade atmósfera animada (pétalos, seda y oro, ola y halftone, plato giratorio, arena rastrillada), nav, reproductor, paneles, modales y presentación diferenciados para cada uno, respetando `prefers-reduced-motion`.
- **CSS modular**: `App.css` se dividió en `src/styles/` y `src/themes/styles/`, con carga diferida (`lazy`) de modales y paneles y hooks separados para ajustes de tema, biblioteca y atajos.
- **Miniaturas de carátulas (`covers/thumbs/`)**: al extraer carátulas embebidas o leer portadas locales en `scanner.rs`, se genera automáticamente una miniatura de hasta 256×256 px en `covers/thumbs/` para reducir el consumo de memoria en cuadrículas y mosaicos.
- **Tests unitarios en `sakura-cli`**: cobertura para los helpers de color, parseo de flags, validación de argumentos y generación de CSS en `comando_theme`.
- **Notificaciones nativas del sistema** al terminar una descarga: título, carátula y botón **Ver biblioteca** (Tauri notification plugin), con registro de acción y permiso al arrancar. El toast web sigue como respaldo.
- **Presentación con identidad única por tema**: los 14 temas tienen diseño propio y exclusivo —consola ámbar, tinta sobre arroz, caligrafía con sello rojo, biombo dorado, washi con listones, origami plegado, rejilla suiza, luna estrellada, libro mayor, velocidad shōnen, bruma cian glitch, laca y oro samurái, pastel kawaii y viñeta manga— con fondos, tipografías, formas de carátula, tarjeta y decoración diferenciadas.
- **Presentación autocontenida**: carrusel con las pistas del álbum, ficha de álbum (nº de pistas y duración total) con lista navegable, letras clicables con scroll suave, transición propia por tema al cambiar de pista, exportación de la tarjeta a PNG en Descargas (o en `exports/` de la carpeta de datos si no se puede) con un **diseño de póster** (carátula redondeada con sombra, luz del tema, título, artista, álbum, chips de metadatos y pie), aviso de la **ruta completa** y botón **Abrir imagen** (abre el PNG con la app por defecto); se puede elegir la carpeta de destino desde la barra de la presentación o desde Ajustes → Archivos, y se guarda en `localStorage`; la carátula se lee como data URL desde Rust para no contaminar el canvas y que `toDataURL` no falle; y atajos (`←/→` pistas, `F` favorito, `L` letras, `A` solo arte, `Esc` salir).
- **Kawaii neón**: paleta intensa de rosa fuerte `#ff2e88`, lila eléctrico `#8b5cf6` y cian sobre fondo oscuro, con brillos y halo; la presentación y la biblioteca (burbujas con portadas redondas y cabecera de cristal) comparten la misma identidad potente.
- **Doble clic en una pista** de la biblioteca abre directamente su presentación, aunque el reproductor esté desactivado; selecciona la pista sin iniciar audio.
- **Presentación de canción accesible con el reproductor desactivado**: botón *Presentar canción* junto al aviso flotante y atajo `Ctrl+Shift+P`. La pantalla muestra la carátula protagonista, una ficha editorial (álbum, año, género, formato, tamaño, duración, favorito) y letras LRC sincronizadas.
- **Reproductor desactivable**: nueva opción *Desactivado* en Ajustes → Reproductor oculta la barra y pausa la música; un botón flotante (o `Ctrl+P`) lo reactiva. El estado se guarda en `localStorage`.
- **Identidad visual reforzada**: fondo con gradiente teñido por la carátula y transición suave al cambiar de pista, animaciones de entrada por tema (respetando `prefers-reduced-motion`), insignia del tema con su glifo en la barra de título y microinteracciones sonoras al cambiar de pestaña, marcar favorito y terminar una descarga.
- **Modo presentación**: doble clic en la portada abre una pantalla completa solo con arte y letras sincronizadas (Escape para salir).
- **Atajos configurables** en Ajustes: reasigne las combinaciones para la paleta, navegación, reproducción y favorito; se guardan en `localStorage`.
- **Toasts con acción**: las descargas terminadas ofrecen *Ver biblioteca*, además del deshacer de borrados.
- **Biblioteca portátil**: exportar/importar un ZIP con la base SQLite (copia consistente), carátulas y preferencias; la importación valida `integrity_check` antes de reemplazar la base.
- **Menú contextual** en la biblioteca (clic derecho): reproducir, reproducir después, añadir a playlist, favorito, editar y eliminar, con estilo propio por tema. **Sonidos de UI** generados con WebAudio, una voz distinta por tema.
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
- **Doctor del sistema** en Ajustes → Sistema: salud de SQLite (integridad, pistas, FTS, tamaño y esquema), botones Verificar/Compactar/Crear respaldo/Vaciar papelera y visor de logs con copiar.
- **Control remoto local** en el puerto `17342` y **CLI `sakura-cli`** para escaneo, búsqueda y generación de temas.
- **Migraciones versionadas** con `PRAGMA user_version=2` (1 = FTS5 y disparadores, 2 = índices en artista/álbum/año/genero), respaldo automático `VACUUM INTO` con retención de 3 y PRAGMAs WAL + `synchronous=NORMAL` + `temp_store=MEMORY` + `foreign_keys=ON`.
- **Benchmark de escaneo** `node scripts/benchmark_scan.mjs [cantidad]`: 10.000 pistas tardaron ~12,6 s en release en esta máquina; el CLI `scan` imprime los milisegundos.
- **`npm run pipeline`** como comando único para todo lo que corre el CI: 84 unitarios Vitest, 33 E2E Playwright y 59 tests Rust (55 en `sakura_desktop_lib` y 4 en `sakura-cli`).

### Cambiado
- **CSS modularizado:** `src/App.css` (~8.500 líneas) se dividió en 12 archivos temáticos y de componentes bajo `src/styles/` y `src/themes/styles/`, manteniendo el orden exacto de cascada.
- **Desacoplamiento de `App.tsx`:** el estado de temas, biblioteca y atajos globales pasó a `useThemeSettings`, `useLibraryState` y `useAppShortcuts`, y las vistas secundarias/modales cargan con `React.lazy`.
- **Herencia directa de arquetipo en temas importados:** `baseDelTema` siempre resuelve a uno de los 14 arquetipos propios, eliminando las vistas de respaldo duplicadas (`LibraryTab`, `LibraryToolbar`, `HomeTab`, `SearchTab`, `QueueTab`, `ZenTopNav`).
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
