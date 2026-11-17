# ADR-0003 · Los tags del archivo son la fuente de verdad

- **Estado:** Vigente en concepto; implementación v2 en `scanner.rs`
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/core/library.py`, `sakura/core/metadata.py`,
  `sakura/core/library_index.py`, `sakura/ui/pages/library.py`

## Contexto

La app consulta catálogos externos (iTunes, Deezer, MusicBrainz) y genera
metadatos propios (duración, formato, tamaño, portada extraída). También
descarga de YouTube, donde los tags de origen son poco confiables. Si hubiera
dos lugares donde vive “la verdad” sobre una pista, cualquier discrepancia sería
imposible de resolver sin reglas de fusión.

Tampoco hay servidor ni cuenta: la música vive en carpetas del usuario y los
archivos pueden editarse con cualquier reproductor o herramienta externa.

## Decisión

La **única fuente de verdad es el archivo de audio**: sus tags, su portada
embebida y los archivos laterales (`folder.jpg`, horarios, `.lrc`/`.txt`).

- Lo que muestran las vistas sale de leer el archivo (vía el índice,
  ver [ADR-0004](0004-indice-por-mtime-y-tamano.md)).
- Los catálogos externos son **ayuda para editar**, no una base: al aplicar un
  candidato se **escribe** en el archivo y ahí queda.
- La cola, el historial y los manifiestos son estado de la app, no del audio:
  se pueden borrar sin perder música.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Base de datos propia como verdad | Duplica los tags; cualquier edición externa quedaría desincronizada |
| Sincronizar siempre con un catálogo | Exige red y credenciales; Spotify quedó afuera por eso |
| Ignorar los tags y mostrar solo el nombre de archivo | Se pierde toda la información de la colección |

## Consecuencias

**Positivas**

- Cualquier herramienta externa (reproductor, editor de tags) edita la misma
  fuente: no hay sincronización que fallar.
- Borrar el índice o la config no pierde la colección.
- La carpeta de música es portable: copiarla basta.

**Negativas / a tener en cuenta**

- Cada arranque ingenuo exigiría releer miles de archivos: se resuelve con el
  índice descartable de [ADR-0004](0004-indice-por-mtime-y-tamano.md).
- Editar tags toca el archivo del usuario: hay que ofrecer deshacer
  (ver [ADR-0007](0007-deshacer-con-manifiestos.md)).
- Los formatos con limitaciones (portada en WAV, campo `comment`) quedan
  limitados por lo que mutagen permite por formato.

## Verificación

`test_library.py` y `test_metadata.py` leen y escriben tags reales con mutagen.
