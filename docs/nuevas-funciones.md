# Funciones nuevas (2026)

Resumen de los cambios recientes. El detalle técnico y el porqué están en los
ADR [0013](adr/0013-playlists-persistentes.md) a
[0020](adr/0020-paleta-de-comandos.md); los formatos persistidos están en
[data-formats.md](data-formats.md) y el contrato IPC en
[ipc-contract.md](ipc-contract.md).

## Playlists persistentes

Pestaña **Listas** en la navegación (también accesible desde ⌘K). Las listas viven en las tablas `playlists` y `playlist_tracks` de SQLite, con `ON DELETE CASCADE`. Se pueden crear, renombrar, borrar, cargar pistas desde la biblioteca, quitarlas y reordenar con las flechas. Cada tema tiene su propio estilo de panel; los arquetipos Swiss, Shōnen, Kawaii, Fantasmas, Luna y Samurái tienen variantes explícitas, el resto hereda las variables del tema.

## Deshacer borrados

`delete_library_track` ya no borra el archivo: lo mueve a `<datos>/trash` y guarda los datos de la pista en `deleted_tracks`. El frontend muestra un toast con **Deshacer** durante 9 segundos; al tocarlo se restauran el archivo y la fila de SQLite. Ajustes → Sistema tiene el contador de la papelera y **Vaciar papelera** para el borrado definitivo.

## Letras sincronizadas

La pestaña **Letras** del panel “Ahora suena” busca un `.lrc` al lado del audio (también reconoce `.LRC`). El parser acepta varios timestamps por línea y metadatos `[ar:...]`. La línea activa se resalta y hace autoscroll con `currentTime`.

## Tema Manga

`manga` ("Viñetas, tinta y screentone") es el decimotercer tema propio y el
decimoséptimo en total. Tiene identidad estructural completa: el Inicio es una
portada de revista (`第 01 話`, globo de diálogo, sello 開 y línea de tiempo) y
la biblioteca son páginas de viñetas con panel halftone, globo con el título,
tag **GO!** y carátulas en blanco y negro. La cabecera es negra con el glifo 漫,
la navegación lleva kanji sobre cuadrado rojo y el tema tiene estilo propio en
Ajustes, panel "Ahora suena", playlists, paleta ⌘K, modales de metadatos, splash
y transición de página `t-manga`. Paleta: papel `#fbfaf7`, tinta `#101010` y
acento rojo `#d62828`, con tramado screentone. Fija `data-theme="space"` y usa
`data-skin="manga"`, y está disponible como arquetipo en
`ThemeGeneratorModal`/`customThemes.ts`. Sumó los snapshots
`manga-home-win32.png` y `manga-library-win32.png`; el loop de
`visuals.spec.ts` cubre 7 temas.

## Paleta de comandos

`Ctrl+K` / `⌘K` abre una paleta para navegar, cambiar tema, controlar la reproducción y buscar pistas. ↑↓ navega, ↵ ejecuta, esc cierra. Está estilizada con el tema activo, incluido Manga.

## Actualizaciones e instaladores

- `tauri.conf.json` define `bundle.targets = ["nsis", "msi"]` y el plugin `updater` con endpoint de GitHub Releases.
- La clave pública está en `src-tauri/updater.key.pub` y en la configuración. La privada (`src-tauri/updater.key`, ignorada por git) se generó con `npm run tauri signer generate -- --password sakura-updater-2026 -w src-tauri/updater.key`. **Guardala bien: sin ella no se pueden firmar las actualizaciones.**
- Ajustes → Sistema tiene **Buscar actualizaciones** y, si hay una nueva, **Instalar \<versión\>**. Antes de publicar, reemplazá `REPLACE_OWNER/REPLACE_REPO` por tu repo en `tauri.conf.json`.
- `.github/workflows/release.yml` compila los instaladores al pushear un tag `v*` y necesita los secrets `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## CI y benchmarking

- `.github/workflows/ci.yml` corre `npm run pipeline` en cada push y PR (Windows + Node 20 + Rust stable + Chromium).
- `scripts/benchmark_scan.mjs [cantidad]` genera MP3 mínimos y mide el escaneo real del CLI en release. En esta máquina, **10.000 pistas tardaron ~12,6 s** en el primer escaneo (el CLI ya imprime los milisegundos).

## Pruebas

Se agregaron tests de integración para la migración `user_version` con backup automático sobre una base en disco, del parser LRC, de las consultas de playlists y del toast de deshacer. Los snapshots visuales se actualizaron por la sexta pestaña de navegación y por el tema Manga.


## Buscador de letras online

La pestaña Letras del panel “Ahora suena” busca en **LRCLIB** con el mismo
patrón del editor de metadatos: Rust consulta el servicio (sin clave, User-Agent
identificado), el frontend muestra resultados con badge SINC/PLANA y *Aplicar*
guarda el `.lrc` al lado de la pista con escritura atómica. No se agregó caché:
el `.lrc` local ya es la persistencia. Ver [ADR 0021](adr/0021-busqueda-de-letras-online.md).
