# 0021. Búsqueda de letras online con LRCLIB

- **Estado:** Aceptada (2026-11-20)
- **Amplía a:** ADR 0015 (letras `.lrc` locales)

## Contexto

El ADR 0015 excluyó la búsqueda online para no depender de red ni de una API de
terceros. En la práctica el editor de metadatos ya depende de iTunes, Deezer y
MusicBrainz con el mismo patrón (Rust con User-Agent, resultados tipados y
botón *Aplicar*). Pedirle al usuario que consiga un `.lrc` a mano era la única
parte del flujo que no seguía ese patrón.

## Decisión

Agregar `search_lyrics` con **LRCLIB** (servicio gratuito, sin clave): con título,
artista y duración se usa `/api/get`, más preciso; si no hay duración se usa
`/api/search`. Rust consulta el servicio con el User-Agent de `catalog.rs` y
devuelve `LyricsSearchResult` con `synced_lyrics` y `plain_lyrics`.

El botón *Aplicar* llama a `save_track_lyrics`, que escribe el `.lrc` al lado de
la pista con `scanner::write_atomic`. Las letras planas se convierten a LRC
(`[00:00.00]…`) en el frontend para que el parser existente las muestre. No se
agrega una tabla de caché: el `.lrc` local ya es la persistencia. Se agregó
`https://lrclib.net` a `connect-src` en la CSP.

## Alternativas

- **Letras embebidas en tags:**muchos archivos no las traen y no se pueden buscar
  por título.
- **LRCLIB desde el renderer:** CORS y User-Agent; rompería el patrón del
  catálogo.
- **Base de datos de letras propia:** duplicaría el `.lrc` y complicaría el
  backup.

## Consecuencias

- La pestaña Letras del panel “Ahora suena” tiene buscador, resultados con
  badge SINC/PLANA y botón *Quitar .lrc*.
- Sin conexión, la búsqueda falla con un mensaje claro; las letras locales
  siguen funcionando igual.
- Hay tres comandos IPC nuevos (46 en total) y su contrato se verifica
  automáticamente.

## Reflejo en el código

`src-tauri/src/lyrics.rs`, `lib.rs`, `tauri.conf.json`,
`src/components/NowPlayingPanel.tsx`, `src/types.ts`.
