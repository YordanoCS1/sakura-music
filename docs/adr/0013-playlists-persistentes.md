# 0013. Playlists persistentes en SQLite

- **Estado:** Aceptada (2026-11-19)
- **Decisión anterior:** no existían; la app sólo tenía favoritos en `localStorage`.

## Contexto

Los favoritos son un único conjunto global y no alcanzan para agrupar música por
contexto (viaje, estudio, entrenamiento). La biblioteca ya vive en SQLite, así
que agregar dos tablas relacionadas no introduce un nuevo sistema de
persistencia.

## Decisión

Dos tablas: `playlists(id, name, created_at)` y
`playlist_tracks(playlist_id, path, position)` con `PRAGMA foreign_keys = ON` y
`ON DELETE CASCADE`. Se guarda la **ruta**, no una copia de los tags: la lista
muestra siempre los metadatos vigentes de `library_tracks`. Si una pista deja
de estar en la biblioteca, deja de aparecer en la lista.

La UI es una sexta pestaña (`playlists`) con un panel por tema. El reorden se
manda como un array ordenado de rutas (`playlist_reorder`).

## Alternativas

- **Guardar el `ScannedTrack` completo en JSON:** se desactualiza al editar tags
  y duplica datos.
- **Guardar playlists en `localStorage`:** no escala, no se puede consultar con
  SQL y quedaría fuera del doctor/backup de la base.

## Consecuencias

- El backup de `library.sqlite3` incluye las playlists sin trabajo extra.
- Hay ocho comandos IPC nuevos y su contrato se verifica en
  `src/lib/ipc-contract.test.ts`.
- La pestaña nueva cambia los iconos de los 16 temas y los snapshots visuales.

## Reflejo en el código

`src-tauri/src/playlists.rs`, `library_db.rs` (esquema), `lib.rs` (comandos),
`src/components/PlaylistsPanel.tsx`, `src/themes/themeIcons.ts`.
