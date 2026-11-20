# 0017. Validación de parámetros IPC y scope de paths

- **Estado:** Aceptada (2026-11-19)

## Contexto

Tauri confía en el renderer. Un webview comprometido podía mandar strings de
millones de caracteres o rutas arbitrarias a los comandos que escriben tags o
portadas. El borrado ya validaba el scope, pero la edición no.

## Decisión

`validacion.rs` centraliza límites de longitud, caracteres de control, NUL,
tamaño de imagen y tamaño de lote en la frontera IPC. Los comandos de metadata
exigen, además: que la pista figure en `library_tracks`, que su ruta canónica
quede dentro de la raíz activa y que la portada venga de `covers/`. El log
redacta `token=`, `api_key=` y `password=`.

La CSP ya existente se mantuvo (sin `unsafe-inline` en scripts). Las
herramientas descargadas siguen con versión y SHA256 fijos.

## Alternativas

- **Validar sólo en el frontend:** desaparece con un renderer comprometido.
- **Permitir cualquier ruta indexada sin scope canónico:** un symlink dentro de
  la biblioteca podría apuntar afuera.

## Consecuencias

- Las pistas importadas por CLI sin `root_path` se siguen pudiendo editar: el
  chequeo de índice alcanza si no hay raíz activa.
- Los textos con saltos de línea se rechazan en metadata; los campos del
  formulario no los generan.
- **No se agrega login:** es una app local-first; un PIN local sería teatro de
  seguridad. Recién tendría sentido con sync, backend propio y Argon2id.

## Reflejo en el código

`src-tauri/src/validacion.rs`, `library_db.rs` (`validar_scope`,
`validar_archivo_de_biblioteca`, `validar_portada_temporal`), `logging.rs`,
`lib.rs`.
