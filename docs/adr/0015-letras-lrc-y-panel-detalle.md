# 0015. Letras LRC y panel de detalle

- **Estado:** Aceptada (2026-11-19); la parte "sin online" fue ampliada por [ADR 0021](0021-busqueda-de-letras-online.md)

## Contexto

El reproductor inmersivo era una única pantalla con portada y controles. La
pestaña "Letras" mostraba un texto de relleno: no había parser ni búsqueda del
archivo.

## Decisión

`lyrics.rs` busca un `.lrc` (o `.LRC`) junto al audio y lo parsea sin
dependencias: cada línea `[mm:ss.xx]texto` genera una entrada con `time` en
segundos; se admiten varios timestamps por línea y se ignoran los metadatos
`[ar:...]`. El panel `NowPlayingPanel` trae cuatro pestañas — Detalles, Letras,
Álbum y Artista —, resalta la línea activa según `currentTime` y hace autoscroll.

La ruta se valida con el mismo scope canónico que protege la escritura de tags.

## Alternativas

- **Buscar letras online:** añadiría red, privacidad y una API externa para un
  archivo que el usuario ya puede tener al lado de la canción.
- **Mostrar el `.lrc` crudo:** no sincroniza y rompe la estética por tema.

## Consecuencias

- Sin `.lrc`, el panel explica qué nombre de archivo crear.
- Los temas propios estilizan el panel con variables `--np-*` y un glifo propio.

## Reflejo en el código

`src-tauri/src/lyrics.rs`, comando `read_lyrics`, `src/components/NowPlayingPanel.tsx`,
`src/types.ts` (`LyricLine`).
