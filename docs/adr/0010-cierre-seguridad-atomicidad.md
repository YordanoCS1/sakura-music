# ADR 0010: Cierre de deuda de la migración — seguridad, atomicidad y cancelación

## Estado
Aceptado

## Contexto
Tras la migración (ADR 0009), la v2 funcionaba pero heredó deuda de la
reescritura: carpeta de datos resuelta con `current_dir()` (en producción puede
ser `System32`), CSP `null` con asset scope `**`, carpeta de descargas por defecto
reconstruida con `USERPROFILE`, literales inventados (`"rustc 1.99.1"`, `"~22 MB"`),
ruta de usuario hardcodeada en el buscador de binarios, tags/caché escritos con
`std::fs::write` directo (una interrupción deja el archivo a medio escribir), lote
que devolvía `Ok(updated)` aunque todos hubieran fallado, carátulas siempre
`.jpg`, cola sin cancelación (solo "limpiar historial"), y temas que solo tocaban
glow/badge mientras la interfaz quedaba en rosa hardcodeado. La opción "Deezer"
consultaba iTunes.

## Decisión

1. **Carpeta de datos estable.** `src-tauri/src/paths.rs` centraliza la
   resolución con `OnceLock`, fijada en `setup()` con
   `app.path().app_local_data_dir()`. Fallback a `./.tauri_data` solo para
   tests/llamadas tempranas. Toda la app usa `paths::cache_file/covers_dir/bin_dir`.
2. **Escritura atómica en todas partes.** `scanner::write_atomic` escribe un
   temporal en la misma carpeta, `sync_all()` y `rename`, con
   `write_atomic_with_retries(..., 4)`. Tags, caché, carátulas y portadas
   temporales pasan por ahí. En Windows el handle se cierra antes del rename.
   Test: `escritura_atomica_reemplaza_y_no_deja_temporales`.
3. **Lote que no finge éxito.** `update_batch_tags` devuelve
   `BatchUpdateResult { updated, errors }`; el frontend muestra
   "Se actualizaron N y M fallaron: …" y no abre el modal de éxito si hay
   errores.
4. **Carátulas con extensión real.** `detect_image_ext` mira la firma
   (PNG/JPEG/WebP/GIF) y `cover_extension` prefiere el MIME oficial
   (PNG/WebP/GIF/BMP/TIFF). El hash se renombró `md5_hash` → `fnv1a_128`
   (nunca fue MD5). La caché `.tauri_data/librería` deja de vivir en el repo.
5. **Cancelación real y acotada.** `DownloadManager` (2 en paralelo, `Mutex` +
   `Condvar`) registra PIDs, cancela en cola o en curso (`cancel`,
   `cancel_all`) y mata el árbol (`taskkill /T /F`). Los comandos
   `cancel_download` / `cancel_all_downloads` existen en Rust y la cola ofrece
   X por fila, "Cancelar todo", Reintentar y "Limpiar terminadas". Al salir
   (`RunEvent::Exit`) se cancela todo. yt-dlp se invoca con `--no-playlist`,
   `--windows-filenames`, `--socket-timeout 30`, `--retries 3`,
   `--fragment-retries 3`, `--print after_move:filepath` y parsing en funciones
   puras testeadas. Sin rutas hardcodeadas: carpeta de datos `bin/`, legado v1,
   winget y `PATH`.
6. **Temas que sí cambian (superado).** Los 4 temas definen `--accent-200…950`
   en `src/App.css` y Tailwind mapea `accent-*` a esas variables. Cambiar de tema
   recolorea toda la UI y se persiste en `localStorage` (`sakura_theme`).
   Nota: hubo una etapa de tema único `space` (M3 Zen) basada en tokens `--m3-*`.
   El selector de paletas se reincorporó con seis temas en [ADR 0012](0012-temas-multiples.md) y hoy ofrece 17 ([ADR 0019](0019-temas-propios-estructurales.md)).
7. **Deezer real.** La opción "Deezer" consulta `api.deezer.com/search`
   (`data[].artist.name`, `album.cover_xl`) en vez de iTunes.
8. **CSP y scope acotados.** `tauri.conf.json` pasa de `csp: null` y scope `**`
   a CSP estricta (`default-src 'self'`, `connect-src` solo IPC/dev/iTunes/
   Deezer, `frame-ancestors 'none'`) y scope
   `["$AUDIO/**", "$APPLOCALDATA/**", "$TEMP/**"]`. Las carpetas elegidas por el
   usuario se autorizan en runtime (`allow_directory` en `scan_library` y
   `get_cached_library`).
9. **Datos reales y repo limpio.** `get_app_info` devuelve la versión real de
   `rustc` (vía `build.rs`) y memoria real del proceso (`windows-sys`);
   `get_default_music_dir` y el destino de descargas usan
   `app.path().audio_dir()`. `Cargo.lock` se commitea (es una app) y sale del
   `.gitignore`. Los restos de la v1 (`SakuraMusic.pyw`, `bench_tema.py`,
   `pyproject.toml`, `requirements.txt`, `scripts/`) se mueven a
   `legacy_python/`; `sakura_music.egg-info/`, `.pytest_cache/`, `.ruff_cache/`,
   `__pycache__` y `src-tauri/crash.txt` se eliminan. Las portadas temporales
   `temp_*` se limpian al arrancar.

## Consecuencias

### Positivas
- Ninguna escritura deja un archivo a medio escribir; ningún lote miente éxito.
- La cola se puede cancelar y reintentar de verdad; no quedan procesos huérfanos.
- La superficie de ataque del WebView se recorta (CSP + scope mínimo + runtime).
- Los 4 temas recolorean la UI completa (superado: hoy hay 17 temas, 13 con identidad estructural, ver [ADR 0019](0019-temas-propios-estructurales.md)); Deezer consulta Deezer.
- Datos técnicos siempre reales y repo sin restos de v1 en la raíz.

### Negativas / deuda que queda
- `src/App.tsx` sigue siendo un monolito (~1058 líneas): funciona, pero un
  componente grande nuevo debería ir en un archivo propio.
- La cola no se persistía entre sesiones (la v1 sí guardaba
  `download_queue.json`). **Resuelto en el ADR 0011.**
- No hay letras (LRCLIB), ni deshacer con manifiestos, ni watch incremental:
  quedaron en `legacy_python/` si se quiere recuperar alguna.
- Sin tests de frontend (Vitest) todavía: la cobertura es Rust + `tsc` + build.

## Reflejo en el código
`src-tauri/src/paths.rs`, `src-tauri/src/scanner.rs`
(`write_atomic`, `detect_image_ext`, `BatchUpdateResult`),
`src-tauri/src/downloader.rs` (`DownloadManager`, parsing puro),
`src-tauri/src/lib.rs` (comandos de cancelación, `cleanup_temp_covers`,
`allow_track_paths`), `src-tauri/tauri.conf.json`,
`src/App.tsx`, `src/App.css`, `tailwind.config.js`.
