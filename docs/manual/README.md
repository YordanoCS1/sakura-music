# Manual del usuario

Guía de uso de Sakura Music 2.0 para quien tiene la app instalada o la está
probando por primera vez. Está ordenado como se recorre la app: instalar,
descargar, ordenar, etiquetar, personalizar y, si algo falla, arreglarlo.

## Índice

| Tema | Documento |
|---|---|
| Instalar Node, Rust, yt-dlp y ffmpeg, y abrir la app | [instalacion.md](instalacion.md) |
| Buscar, descargar, playlists y la cola | [buscar-y-descargar.md](buscar-y-descargar.md) |
| Escanear, mantener y explorar la biblioteca | [biblioteca.md](biblioteca.md) |
| Editar tags, portadas, lote y catálogo | [metadatos-y-letras.md](metadatos-y-letras.md) |
| Efectos y apariencia | [apariencia.md](apariencia.md) |
| Síntomas, causas y diagnóstico | [problemas.md](problemas.md) |

## Ruta sugerida

1. [instalacion.md](instalacion.md) — dejá la app abierta y con yt-dlp/ffmpeg detectados.
2. [buscar-y-descargar.md](buscar-y-descargar.md) — bajá tu primera canción y mirala en Cola.
3. [biblioteca.md](biblioteca.md) — elegí tu carpeta y una vista que te guste.
4. [metadatos-y-letras.md](metadatos-y-letras.md) — arreglá los tags que vinieron mal.
5. [apariencia.md](apariencia.md) — revisá los efectos de apariencia.
6. [problemas.md](problemas.md) — guardalo para cuando algo falle.

## Convenciones del manual

- Los nombres de botones y controles se escriben tal como aparecen en la
  interfaz (**Descargar N Canciones**, **Cancelar todo**, **Reintentar**,
  **Editar en lote (N)**, **Aplicar todo**).
- Las rutas se escriben tal como las ves en Windows
  (`%LOCALAPPDATA%\com.sakura.music\`).
- Los atajos se muestran en código (`` `Ctrl+V` ``).
- La última revisión fue la migración a Tauri/Rust: si un síntoma menciona
  Python, PySide6, `mutagen`, LRCLIB o manifiestos, es herencia de la v1
  en `legacy_python/`, no de esta app.
- Cuando un comportamiento lo garantiza un test, el detalle técnico está en
  [../requisitos.md](../requisitos.md) y el porqué en
  [../adr/README.md](../adr/README.md).
