# Decisiones de arquitectura (ADR)

Un **ADR** (*Architecture Decision Record*) documenta una decisión importante, el
contexto que la originó, las alternativas consideradas y las consecuencias de
elegirla. Sirve para que quien lea el código dentro de seis meses entienda
**por qué** es así y no de otra forma.

Los ADRs 0001–0008 describen la **versión 1.0 en Python/PySide6** y quedaron como
histórico al migrar: no se reescriben, se les marca el estado (reemplazado,
retirado o vigente en concepto) en el índice y en el propio ADR. Los 0009 en
adelante rigen la v2.

> **Nota (2026-11-20):** los temas Yoru, Hanabi y Aizuri se retiraron por ser
> variantes de paleta sin vistas estructurales propias. El estado actual es
> **14 temas propios**: el ex genérico `space` (antes M3 Zen) fue rediseñado como
> **Estudio** y ningún tema oficial es genérico. Los ADRs 0009, 0010, 0012,
> 0013, 0019 y 0020 conservan sus cifras originales y aclaran el retiro y el
> cambio de nombre en notas históricas.

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
| [0007](0007-deshacer-con-manifiestos.md) | Deshacer un lote de tags con manifiestos JSON | Retirado para tags; el deshacer de borrados se reimplementó en 0014 |
| [0008](0008-hilos-y-cierre-limpio.md) | Nada pesado en el hilo de la UI y cierre limpio de hilos | Vigente en concepto; en v2 es Rust (`rayon`/hilos) + `cancel_all()` al salir |
| [0009](0009-migracion-tauri-2-rust.md) | Migración de PySide6 a Tauri 2.0 y Rust nativo | Vigente |
| [0010](0010-cierre-seguridad-atomicidad.md) | Cierre de deuda: seguridad, atomicidad y cancelación | Vigente |
| [0011](0011-cola-persistente.md) | Persistir la cola y reanudar al abrir | Vigente |
| [0012](0012-temas-multiples.md) | Temas múltiples con selector en Ajustes | Vigente (supera el tema único) |
| [0013](0013-playlists-persistentes.md) | Playlists persistentes en SQLite | Vigente |
| [0014](0014-papelera-y-deshacer.md) | Borrado con papelera y deshacer | Vigente |
| [0015](0015-letras-lrc-y-panel-detalle.md) | Letras LRC y panel de detalle | Vigente |
| [0016](0016-migraciones-y-hardening-bd.md) | Migraciones versionadas, backups y PRAGMAs | Vigente |
| [0017](0017-validacion-ipc-y-scope.md) | Validación de parámetros IPC y scope de paths | Vigente |
| [0018](0018-updater-firmado-e-instaladores.md) | Actualizaciones firmadas e instaladores | Vigente |
| [0019](0019-temas-propios-estructurales.md) | Temas propios con identidad estructural | Vigente (amplía 0012; hoy 14 propios, incluidos Manga y Estudio) |
| [0020](0020-paleta-de-comandos.md) | Paleta de comandos y navegación de seis pestañas | Vigente |
| [0021](0021-busqueda-de-letras-online.md) | Búsqueda de letras online con LRCLIB | Vigente (amplía 0015) |

## Cómo agregar una decisión

1. Copiá la estructura de cualquier ADR existente (Estado, Contexto, Decisión,
   Consecuencias, Reflejo en el código).
2. Numerá con el siguiente número libre (`0013-...`) y agregá la fila a la tabla.
3. Linkeá desde el documento que corresponda (`arquitectura.md`, `requisitos.md`
   o el manual).
