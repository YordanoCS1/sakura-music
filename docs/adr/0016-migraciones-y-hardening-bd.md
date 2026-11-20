# 0016. Migraciones versionadas, backups y PRAGMAs de SQLite

- **Estado:** Aceptada (2026-11-19)

## Contexto

El esquema usaba un hack (`SELECT 1 FROM sqlite_master ... name='library_fts'`)
para decidir si reconstruía el índice. No había versión ni copia de seguridad:
un cambio de esquema podía dejar la biblioteca ilegible sin vuelta atrás.

## Decisión

`PRAGMA user_version` versa el esquema (actual **2**): 1 = FTS5 y disparadores,
2 = índices en `artist`, `album`, `year` y `genre`. `initialize()` hace un
backup con `VACUUM INTO` antes de subir de versión y conserva los tres más
recientes. Se fijan `synchronous = NORMAL`, `temp_store = MEMORY` y
`foreign_keys = ON`. doctor, vacuum y backup se exponen en Ajustes → Sistema.

## Alternativas

- **Copiar el archivo con `fs::copy`:** con WAL activo puede perder los últimos
  commits; `VACUUM INTO` produce un snapshot consistente.
- **Una tabla de migraciones propia:** innecesaria; SQLite ya tiene
  `user_version`.

## Consecuencias

- Los respaldos ocupan espacio (se podan a tres).
- El test de integración usa `paths::set_test_data_dir` para aislar la base en
  disco; por eso ese override es `#[cfg(test)]`.

## Reflejo en el código

`library_db.rs` (`initialize`, `crear_backup`, `podar_backups`, `database_info`),
`paths.rs`, `src/components/SystemPanel.tsx`.
