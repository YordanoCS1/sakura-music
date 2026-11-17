# Decisiones de arquitectura (ADR)

Un **ADR** (*Architecture Decision Record*) documenta una decisión importante, el
contexto que la originó, las alternativas consideradas y las consecuencias de
elegirla. Sirve para que quien lea el código dentro de seis meses entienda
**por qué** es así y no de otra forma.

Los ADRs 0001–0008 describen la **versión 1.0 en Python/PySide6** y quedaron como
histórico al migrar: no se reescriben, se les marca el estado (reemplazado,
retirado o vigente en concepto) en el índice y en el propio ADR. Los 0009 en
adelante rigen la v2.

## Reglas

- Un ADR se escribe cuando se toma una decisión con consecuencias duraderas:
  una dependencia, una separación de capas, un formato de datos, una regla de
  negocio no obvia.
- Los ADRs **no se reescriben**. Si una decisión se revierte o cambia, se crea un
  ADR nuevo que la reemplaza y se marca el anterior como `Reemplazado por NNNN`.
- Cada ADR nombra el código que lo implementa, para poder verificarlo.

## Índice

| ADR | Título | Estado |
|---|---|---|
| [0001](0001-pyside6.md) | Reescribir en Python + PySide6 en vez de Electron | Reemplazado por 0009 (histórico v1) |
| [0002](0002-yt-dlp-subproceso.md) | Ejecutar yt-dlp y ffmpeg como subprocesos | Vigente en concepto; implementación v2 en `downloader.rs` |
| [0003](0003-tags-fuente-de-verdad.md) | Los tags del archivo son la fuente de verdad | Vigente en concepto; implementación v2 en `scanner.rs` |
| [0004](0004-indice-por-mtime-y-tamano.md) | Índice SQLite descartable validado por `mtime_ns` + tamaño | Reemplazado: en v2 hay `library.sqlite3` (SQLite, `mtime` + tamaño) + watcher `notify` |
| [0005](0005-modelo-no-widgets.md) | Biblioteca con modelo Qt, no con un widget por fila | Reemplazado: en v2 es `App.tsx` (React, monolito) |
| [0006](0006-temas-por-tokens.md) | Temas como tokens y dimensiones, no como colores sueltos | Vigente en concepto; en v2 son variables `--accent-*` + paleta Tailwind |
| [0007](0007-deshacer-con-manifiestos.md) | Deshacer un lote de tags con manifiestos JSON | Retirado en v2: no hay manifiestos ni deshacer |
| [0008](0008-hilos-y-cierre-limpio.md) | Nada pesado en el hilo de la UI y cierre limpio de hilos | Vigente en concepto; en v2 es Rust (`rayon`/hilos) + `cancel_all()` al salir |
| [0009](0009-migracion-tauri-2-rust.md) | Migración de PySide6 a Tauri 2.0 y Rust nativo | Vigente |
| [0010](0010-cierre-seguridad-atomicidad.md) | Cierre de deuda: seguridad, atomicidad y cancelación | Vigente |
| [0011](0011-cola-persistente.md) | Persistir la cola y reanudar al abrir | Vigente |

## Cómo agregar una decisión

1. Copiá la estructura de cualquier ADR existente (Estado, Contexto, Decisión,
   Consecuencias, Reflejo en el código).
2. Numerá con el siguiente número libre (`0012-...`) y agregá la fila a la tabla.
3. Linkeá desde el documento que corresponda (`arquitectura.md`, `requisitos.md`
   o el manual).
