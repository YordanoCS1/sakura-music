# Manual del usuario

Guía de uso de Sakura Music 2.0 para quien tiene la app instalada o la está
probando por primera vez. Está ordenado como se recorre la app: instalar,
descargar, ordenar, etiquetar, personalizar y, si algo falla, arreglarlo.

## Índice

| Tema | Documento |
|---|---|
| Instalar Node, Rust, yt-dlp y ffmpeg, y abrir la app | [instalacion.md](instalacion.md) |
| Buscar, descargar y la cola | [buscar-y-descargar.md](buscar-y-descargar.md) |
| Escanear, mantener y explorar la biblioteca; Listas y Deshacer | [biblioteca.md](biblioteca.md) |
| Editar tags, portadas, lote, catálogo y letras `.lrc` | [metadatos-y-letras.md](metadatos-y-letras.md) |
| Los 19 temas, efectos y paleta ⌘K | [apariencia.md](apariencia.md) |
| Control remoto desde el celular | [control-remoto.md](control-remoto.md) |
| Actualizaciones, primer arranque y datos | [instalacion.md](instalacion.md) |
| Síntomas, causas y diagnóstico (incluido actualizador y papelera) | [problemas.md](problemas.md) |

## Ruta sugerida

1. [instalacion.md](instalacion.md) — dejá la app abierta y con yt-dlp/ffmpeg detectados.
2. [buscar-y-descargar.md](buscar-y-descargar.md) — descargue su primera canción y revísela en Cola.
3. [biblioteca.md](biblioteca.md) — seleccione su carpeta y una vista que te guste.
4. [metadatos-y-letras.md](metadatos-y-letras.md) — arreglá los tags y sumá letras `.lrc`.
5. [apariencia.md](apariencia.md) — seleccione entre los 19 temas (incluidos Estudio, Manga y los cinco nuevos) y pruebe la paleta ⌘K.
6. [control-remoto.md](control-remoto.md) — active el QR y maneje la PC desde el celular.
7. [problemas.md](problemas.md) — guardalo para cuando algo falle.

## Novedades que conviene conocer

- **Listas (playlists):** la pestaña Listas guarda sus listas en SQLite; puede
  crearlas, renombrarlas, borrarlas, agregar pistas, quitarlas y reordenarlas
  ([biblioteca.md](biblioteca.md#listas-playlists)).
- **Deshacer:** al borrar pistas, el archivo va a `<datos>/trash` y el toast
  ofrece **Deshacer** durante 9 segundos; el contador y **Vaciar papelera**
  están en Ajustes → Sistema ([biblioteca.md](biblioteca.md#borrado-con-deshacer)).
- **Letras LRC:** archivos `.lrc` al lado del audio, con resaltado y autoscroll
  en la pestaña Letras del panel Ahora suena
  ([metadatos-y-letras.md](metadatos-y-letras.md#letras-sincronizadas-lrc)).
- **Paleta ⌘K:** `Ctrl+K` / `⌘K` para navegar, cambiar tema, reproducir y
  buscar; ↑↓, ↵ y esc ([apariencia.md](apariencia.md)).
- **Control remoto:** el celular abre la misma interfaz con un PIN de 6
  dígitos y ejecuta las acciones en la PC, sin streaming
  ([control-remoto.md](control-remoto.md)).

El detalle técnico de cada una está en [../nuevas-funciones.md](../nuevas-funciones.md).

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
