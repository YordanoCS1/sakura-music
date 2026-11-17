# ADR-0004 · Índice SQLite descartable validado por `mtime_ns` + tamaño

- **Estado:** Reemplazado: en v2 hay `library.sqlite3` (SQLite, `mtime` + tamaño) + watcher `notify`
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/core/library_index.py`,
  `sakura/ui/services/library.py` (`LibraryScanner`, `LibraryDeltaScanner`,
  `LibraryRefresher`)

## Contexto

Leer los tags de miles de archivos con mutagen tarda segundos y, hecho en el
hilo de la UI, congela la ventana. Pero reescanear todo en cada arranque es
desperdicio: la mayoría de los archivos no cambió desde la última vez.

Tampoco se puede confiar ciegamente en una caché: un archivo editado por fuera
de la app (otro reproductor, un editor de tags, una copia sobre la original)
debe reflejarse sin que el usuario fuerce un reescaneo.

## Decisión

Se guarda un **índice SQLite descartable** (`library_index.sqlite3`, WAL,
`SCHEMA_VERSION = 1`) con los metadatos ya leídos por pista. Una fila se da por
válida solo si coinciden **ambos**:

- `mtime_ns` — instante de última modificación con resolución de nanosegundos;
- tamaño en bytes.

El escaneo inicial lee solo las filas nuevas o vencidas, con un
`ThreadPoolExecutor` de 2 a 8 workers según CPU, en tandas de 150 pistas. El
escaneo delta (`LibraryDeltaScanner`) compara el disco contra el índice y relee
únicamente altas y cambios; las rutas borradas se podan.

Los eventos de `QFileSystemWatcher` se agrupan con un debounce de 900 ms y, si
llegan durante un escaneo, se reintentan al terminar (`_changes_pending`).

Si el índice está corrupto o el esquema cambió, se ignora y se reescanea: nunca
rompe el arranque.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Reescanear siempre | Arranques de minutos con bibliotecas grandes |
| Validar por hash del contenido | Obliga a leer el archivo entero: es el costo que se quiere evitar |
| Validar solo por `mtime` | Un archivo copiado puede conservar mtime; el tamaño agrega evidencia |
| Guardar el estado en los propios archivos | Visible para el usuario y frágil ante herramientas externas |

## Consecuencias

**Positivas**

- Arranques rápidos cuando la biblioteca no cambió.
- Detección de cambios hechos por fuera de la app, sin escaneo total.
- El índice es descartable: borrarlo solo cuesta tiempo, no datos.

**Negativas / a tener en cuenta**

- Un archivo modificado **dentro** del mismo nanosegundo y con el mismo tamaño
  podría pasar desapercibido (teóricamente posible, prácticamente raro).
- El esquema necesita versionado: si cambia, el índice viejo se descarta.
- Mantener el índice consistente bajo concurrencia exige que el escaneo y el
  delta no escriban a la vez sin coordinación.

## Verificación

`test_library_index.py`, `test_library_scanner.py` y `test_library_delta.py`
cubren vigencia, poda y refresco incremental.
