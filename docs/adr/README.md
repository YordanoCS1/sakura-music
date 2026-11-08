# Decisiones de arquitectura (ADR)

Un **ADR** (*Architecture Decision Record*) documenta una decisión importante, el
contexto que la originó, las alternativas consideradas y las consecuencias de
elegirla. Sirve para que quien lea el código dentro de seis meses entienda
**por qué** es así y no de otra forma.

Las decisiones acá ya estaban tomadas en el código y descritas en el
[README principal](../../README.md). Se formalizaron el **2026-11-07** en este
formato, sin cambiar su contenido.

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
| [0001](0001-pyside6.md) | Reescribir en Python + PySide6 en vez de Electron | Vigente |
| [0002](0002-yt-dlp-subproceso.md) | Ejecutar yt-dlp y ffmpeg como subprocesos | Vigente |
| [0003](0003-tags-fuente-de-verdad.md) | Los tags del archivo son la fuente de verdad | Vigente |
| [0004](0004-indice-por-mtime-y-tamano.md) | Índice SQLite descartable validado por `mtime_ns` + tamaño | Vigente |
| [0005](0005-modelo-no-widgets.md) | Biblioteca con modelo Qt, no con un widget por fila | Vigente |
| [0006](0006-temas-por-tokens.md) | Temas como tokens y dimensiones, no como colores sueltos | Vigente |
| [0007](0007-deshacer-con-manifiestos.md) | Deshacer un lote de tags con manifiestos JSON | Vigente |
| [0008](0008-hilos-y-cierre-limpio.md) | Nada pesado en el hilo de la UI y cierre limpio de hilos | Vigente |
| [0009](0009-migracion-tauri-2-rust.md) | Migración de PySide6 a Tauri 2.0 y Rust nativo | Vigente |

## Cómo agregar una decisión

1. Copiá la estructura de cualquier ADR existente (Estado, Contexto, Decisión,
   Consecuencias, Reflejo en el código).
2. Numerá con el siguiente número libre (`0009-...`) y agregá la fila a la tabla.
3. Linkeá desde el documento que corresponda (`arquitectura.md`, `requisitos.md`
   o el manual).
