# ADR-0002 · Ejecutar yt-dlp y ffmpeg como subprocesos

- **Estado:** Vigente
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/ui/services/process.py`,
  `sakura/core/tools.py`, `sakura/ui/services/downloader.py`,
  `sakura/ui/services/searcher.py`, `sakura/ui/services/playlist.py`,
  `sakura/ui/services/album_resolver.py`

## Contexto

`yt-dlp` se puede usar como librería de Python, pero su trabajo (reseñar
metadatos de YouTube, resolver formatos, descargar) es intensivo en CPU y hace
mucho I/O. Bajo el GIL, correrlo en el proceso de la app bloquearía la interfaz
durante búsquedas y descargas largas.

Además, en Windows cada subproceso de consola produce un destello de ventana si
no se oculta, y PySide6 no expone una forma de configurarlo con `QProcess`.

## Decisión

Toda invocación a `yt-dlp` y `ffmpeg` se hace con **`subprocess.Popen`**:

- el proceso pesado corre fuera del proceso de Python y no compite por el GIL;
- su salida se parsea línea por línea (JSON con `--dump-json`, progreso estandar);
- se usa `CREATE_NO_WINDOW` / `STARTF_USESHOWWINDOW` para que no aparezca consola
  en Windows (`core/tools.py: spawn_kwargs()`).

Los comandos se construyen en `core/tools.py` (`build_search_command`,
`build_download_command`, `build_playlist_info_command`) para que sean
testeables sin lanzar procesos.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| `import yt_dlp` como librería | Bloquea la UI bajo el GIL durante extracciones largas |
| `QProcess` | PySide6 no permite `setCreateProcessArgumentsModifier`; no se puede ocultar la consola |
| Hilos de Python para yt-dlp | El GIL seguiría serializeando el trabajo de CPU |

## Consecuencias

**Positivas**

- La UI sigue respondiendo mientras se descarga o se busca.
- Varios procesos en paralelo no se bloquean entre sí.
- La construcción de comandos es pura y testeable (`test_tools.py`).
- Quitar el proceso es matar el proceso: la cancelación es limpia.

**Negativas / a tener en cuenta**

- Hay que parsear stdout: cualquier cambio en el formato de salida de yt-dlp
  puede romper el parseo. Los tests de parseo lo cubren.
- Hay que gestionar el cierre de procesos: ver
  [ADR-0008](0008-hilos-y-cierre-limpio.md).
- Si yt-dlp o ffmpeg no están instalados, la app no puede completar el trabajo
  (ver `ToolMissing` en `core/tools.py`).

## Verificación

`test_process.py` y `test_tools.py` cubren el lanzamiento, el parseo de progreso
y los argumentos de ocultamiento de consola.
