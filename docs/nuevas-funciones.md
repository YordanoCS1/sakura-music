# Funciones nuevas (2026)

## Playlists persistentes

Pestaña **Listas** en la navegación (también accesible desde ⌘K). Las listas viven en las tablas `playlists` y `playlist_tracks` de SQLite, con `ON DELETE CASCADE`. Se pueden crear, renombrar, borrar, cargar pistas desde la biblioteca, quitarlas y reordenar con las flechas. Cada tema tiene su propio estilo de panel; los arquetipos Swiss, Shōnen, Kawaii, Fantasmas, Luna y Samurái tienen variantes explícitas, el resto hereda las variables del tema.

## Deshacer borrados

`delete_library_track` ya no borra el archivo: lo mueve a `<datos>/trash` y guarda los datos de la pista en `deleted_tracks`. El frontend muestra un toast con **Deshacer** durante 9 segundos; al tocarlo se restauran el archivo y la fila de SQLite. Ajustes → Sistema tiene el contador de la papelera y **Vaciar papelera** para el borrado definitivo.

## Letras sincronizadas

La pestaña **Letras** del panel “Ahora suena” busca un `.lrc` al lado del audio (también reconoce `.LRC`). El parser acepta varios timestamps por línea y metadatos `[ar:...]`. La línea activa se resalta y hace autoscroll con `currentTime`.

## Paleta de comandos

`Ctrl+K` / `⌘K` abre una paleta para navegar, cambiar tema, controlar la reproducción y buscar pistas. ↑↓ navega, ↵ ejecuta, esc cierra. Está estilizada con el tema activo.

## Actualizaciones e instaladores

- `tauri.conf.json` define `bundle.targets = ["nsis", "msi"]` y el plugin `updater` con endpoint de GitHub Releases.
- La clave pública está en `src-tauri/updater.key.pub` y en la configuración. La privada (`src-tauri/updater.key`, ignorada por git) se generó con `npm run tauri signer generate -- --password sakura-updater-2026 -w src-tauri/updater.key`. **Guardala bien: sin ella no se pueden firmar las actualizaciones.**
- Ajustes → Sistema tiene **Buscar actualizaciones** y, si hay una nueva, **Instalar \<versión\>**. Antes de publicar, reemplazá `REPLACE_OWNER/REPLACE_REPO` por tu repo en `tauri.conf.json`.
- `.github/workflows/release.yml` compila los instaladores al pushear un tag `v*` y necesita los secrets `TAURI_SIGNING_PRIVATE_KEY` y `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.

## CI y benchmarking

- `.github/workflows/ci.yml` corre `npm run pipeline` en cada push y PR (Windows + Node 20 + Rust stable + Chromium).
- `scripts/benchmark_scan.mjs [cantidad]` genera MP3 mínimos y mide el escaneo real del CLI en release. En esta máquina, **10.000 pistas tardaron ~12,6 s** en el primer escaneo (el CLI ya imprime los milisegundos).

## Pruebas

Se agregaron tests de integración para la migración `user_version` con backup automático sobre una base en disco, del parser LRC, de las consultas de playlists y del toast de deshacer. Los snapshots visuales se actualizaron por la sexta pestaña de navegación.
