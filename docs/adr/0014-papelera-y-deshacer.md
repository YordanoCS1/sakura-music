# 0014. Borrado con papelera y deshacer

- **Estado:** Aceptada (2026-11-19)
- **Reemplaza en la práctica a:** ADR 0007 para el caso de borrado de pistas
  (el manifiesto de tags sigue sin existir).

## Contexto

`delete_library_track` borraba el archivo con `remove_file`: un error de
selección era irreversible. Un "deshacer" puramente de frontend era imposible
porque el contenido ya no estaba.

## Decisión

El comando mueve el archivo a `<datos>/trash/<token>.<ext>` y registra en
`deleted_tracks` la ruta original, la ruta en la papelera y un snapshot JSON de
la pista. Devuelve el token al frontend, que muestra un toast con **Deshacer**
durante 9 segundos. `restore_deleted_track(token)` mueve el archivo de vuelta y
vuelve a insertar la fila en `library_tracks`. `empty_trash()` hace el borrado
definitivo, con botón explícito en Ajustes → Sistema.

Si la papelera está en otra unidad, `mover_archivo` hace copia + borrado del
original (`rename` no cruza dispositivos).

## Alternativas

- **Mover a la papelera del sistema operativo:** dependiente de plataforma y no
  permite restaurar la fila de SQLite.
- **Soft-delete sólo en SQLite:** dejaría el archivo en la biblioteca y el
  usuario vería la canción "borrada" al reescanear.

## Consecuencias

- El borrado ya no libera espacio hasta que se vacía la papelera.
- Hay que podar la papelera; se hace desde Sistema con un contador visible.
- El validador de scope canónico se reutiliza: el restore no puede escribir
  fuera de la raíz activa porque la pista debe volver a su ruta original.

## Reflejo en el código

`library_db.rs` (`delete_track`, `restore_deleted_track`, `empty_trash`),
`paths::trash_dir`, `src/components/UndoToast.tsx`, `src/App.tsx`.
