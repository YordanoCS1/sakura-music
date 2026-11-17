# ADR-0008 · Nada pesado en el hilo de la UI y cierre limpio de hilos

- **Estado:** Vigente en concepto; en v2 es Rust (`rayon`/hilos) + `cancel_all()` al salir
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/ui/services/process.py`,
  `sakura/ui/services/downloader.py`, `sakura/ui/services/library.py`,
  `sakura/ui/services/metadata_search.py`, `sakura/ui/services/lyrics.py`,
  `sakura/ui/main_window.py` (`closeEvent`, `shutdown`), `sakura/app.py`

## Contexto

Dos caminos abrían archivos con mutagen desde el hilo de la GUI: releer todas
las pistas al cerrar la ficha y sanear tags al terminar cada descarga. Con miles
de pistas, la ventana se congelaba. Además, un cierre ingenuo (esperar hilos
dentro de `closeEvent`) dejaba un `QThread` vivo mientras Qt destruía objetos,
y la salida se colgaba de forma intermitente.

## Decisión

**Todo trabajo que pueda tardar vive fuera del hilo de la UI**, en un
`QThread` propio o en un subproceso (ver
[ADR-0002](0002-yt-dlp-subproceso.md)), y se comunica por señales:

| Servicio | Hilo | Señales |
|---|---|---|
| Escaneo / delta / refresco | `QThread` + `ThreadPoolExecutor` (2–8 workers) | `batch_ready`, `tracks_changed`, `finished` |
| Descargas | `ProcessRunner` por slot (hasta 2 por defecto) | `progress`, `completed`, `job_updated` |
| Búsqueda / playlist | `QThread` con subproceso | `result_found`, `finished`, `failed` |
| Catálogo y álbumes | `QThread` | `results_ready`, `progress`, `matches_ready` |
| Letras | `QThread` | `progress`, `finished` |
| Miniaturas | `QThread` | `loaded` |

Las tandas del escaneo son de **150 pistas** (`BATCH_SIZE`), así la UI se
actualiza progresivamente.

**El cierre tiene una secuencia fija:**

1. `MainWindow.closeEvent` solo marca `_cerrando` y detiene el watcher. **No
   espera hilos.**
2. `exec()` vuelve.
3. `app.main()` llama a `window.shutdown()`, que detiene el watcher, apaga
   descargas (mata procesos, borra stagings, guarda la cola en **PENDING**),
   búsqueda, cola, biblioteca y el scanner de revisión.
4. Recién ahí se destruye la ventana.

Ningún `QThread` sigue vivo cuando Qt se destruye.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Esperar hilos en `closeEvent` | Deja un hilo vivo mientras Qt se destruye; cuelgues intermitentes |
| No esperar nada | Procesos de yt-dlp huérfanos y stagings sin borrar |
| `QTimer` para simular progreso | La UI seguiría bloqueada durante el trabajo real |
| Un solo hilo global de trabajo | Serializa escaneo, búsqueda y descargas sin motivo |

## Consecuencias

**Positivas**

- La ventana no se congela con miles de pistas.
- El cierre es limpio: sin procesos huérfanos ni hilos colgados.
- La cola guardada permite reanudar tras un cierre abrupto.

**Negativas / a tener en cuenta**

- Cada servicio nuevo debe implementar `cancel()`/`shutdown()` y sus señales;
  olvidar el `shutdown()` reintroduce el cuelgue.
- La sincronización entre escaneo y watcher necesita el flag
  `_changes_pending` para no perder avisos.
- Los tests deben destruir ventanas con Qt todavía en pie
  (`tests/conftest.py`); hacerlo en el apagado del intérprete aborta con
  `0xC0000409`.

## Verificación

`test_process.py`, `test_library_scanner.py`, `test_library_delta.py`,
`test_downloader.py`, `test_main_window.py` y `scripts/check_clean_exit.py`.
