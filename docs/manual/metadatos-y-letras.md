# Metadatos y letras

Los tags son la fuente de verdad de la biblioteca: lo que dice el archivo manda.
Esta página explica cómo editarlos de a una pista, en lote, desde un catálogo
externo, cómo deshacer un lote y cómo incrustar letras.

## Abrir el editor

Hay tres caminos:

1. Doble clic en una fila de la Biblioteca → se abre la **ficha** → **Editar
   metadatos**.
2. Seleccionar una pista y pulsar **Editar metadatos** en el panel de detalle.
3. Seleccionar varias pistas y pulsar **Editar en lote**.

El editor individual lee los tags al abrir y **no escribe nada hasta confirmar**.
**Cancelar** no toca el archivo.

## Campos del editor

Los campos están agrupados por sentido:

| Grupo | Campos |
|---|---|
| **Identidad** | Título, artista, artista del álbum |
| **Álbum** | Álbum, año, número de pista |
| **Clasificación** | Género |

Además podés:

- elegir una **portada local** desde un archivo;
- quitar la portada actual;
- **Buscar en catálogo** para traer los datos de un servicio externo.

Al guardar se escribe el tag del formato y, si elegiste una portada, se incrusta
en el archivo. La biblioteca relee la pista y actualiza fila, ficha, filtros y
contadores.

## Buscar en un catálogo

**Buscar en catálogo** abre un panel con:

| Fuente | Qué aporta |
|---|---|
| **Automático** | iTunes y, si no hay nada, Deezer |
| **Apple Music (iTunes)** | Fichas completas con `album_id`, portada y número de pista |
| **Deezer** | Alternativa cuando iTunes no tiene el disco |
| **MusicBrainz** | Metadatos abiertos; la portada viene de Cover Art Archive |

MusicBrainz queda fuera del modo automático a propósito: exige un `User-Agent`
propio y limita a una petición por segundo. Se consulta solo cuando lo pedís.

El emparejado normaliza antes de comparar: minúsculas, sin acentos ni puntuación,
y descarta palabras ruido (`feat`, `remix`, `official video`…).

### Aplicar un candidato

1. Buscá por título o por artista.
2. Elegí un resultado.
3. Pulsá **Usar datos seleccionados**.
4. Los campos se llenan y la portada se prepara. La descarga de la portada ocurre
   antes de guardar; si falla, se conserva la actual.
5. **Guardar cambios**.

### Comparar antes de aplicar

El panel **Comparar antes de aplicar** muestra, columna a columna, el valor del
catálogo y el valor actual del archivo. Podés marcar o desmarcar campos y aplicar
solo los que te interesan.

### Aplicar a todo el álbum

Si el candidato tiene un `album_id` de iTunes, aparece **Aplicar a todo el
álbum** junto al campo Álbum.

1. La app pide el álbum completo al catálogo.
2. Empareja por título normalizado contra los archivos de la misma carpeta.
3. Escribe tags y portada en los que coinciden.
4. Informa cuántas quedaron etiquetadas y cuáles fallaron.

Esto es lo que hace que los archivos de una descarga (`01 - One More Time.mp3`)
reciban su título, año, género y número de pista correctos de una sola vez.

## Editar en lote

Con dos o más pistas seleccionadas, **Editar en lote** abre un diálogo con estos
campos:

- artista;
- álbum;
- artista del álbum;
- año;
- género;
- número de pista.

**El título queda afuera a propósito:** cambiarlo en lote convertiría 200 pistas
en la misma canción.

### La regla que define la pantalla

> **Un campo vacío no se toca.**

Si dejaste “Álbum” en blanco es porque no querés cambiarlo, no porque quieras
borrarlo. Vacío como “borrar” convertiría un clic mal dado en 200 pistas sin
álbum, y eso no se puede deshacer de forma razonable.

Para limpiar un campo hay que hacerlo de a una pista, desde el editor individual.

### Qué informa

Al aplicar:

- cuántas pistas se actualizaron;
- cuántas ya tenían ese valor (“sin cambios”);
- qué pistas fallaron y por qué.

Por cada campo que cambió se guarda un manifiesto para poder deshacer.

## Deshacer el último lote

El botón **Deshacer último lote** está en la barra de la Biblioteca. Se habilita
solo si hay un manifiesto legible.

1. Pulsá el botón.
2. La app muestra el resumen del lote y pide confirmación.
3. Al confirmar, restaura los valores anteriores **solo si el archivo sigue con
   los valores que dejó el lote**.
4. Si alguien reetiquetó el archivo por fuera, esa pista se saltea para no pisar
   el cambio.
5. Si no hubo errores, el manifiesto se borra. La vista se refresca y se informa
   cuántas se restauraron y cuántas se saltearon.

### Cómo funciona por dentro

No se copia el audio entero: sería duplicar gigabytes. Se guarda un **manifiesto
JSON** en `Historial/AAAAmmdd-HHMMSS-xxxxxx.json` con:

- la ruta del archivo;
- los campos que cambiaron;
- el valor anterior y el nuevo de cada uno.

Se conservan los **20 manifiestos más nuevos**. Un manifiesto corrupto se
descarta y se busca el anterior; un archivo borrado se informa como error y se
sigue con el resto.

## Incrustar letras

Se puede hacer por pista o en lote.

### Por pista

En el panel de detalle o en la ficha, pulsá **Buscar e incrustar letra**.

### En lote

Seleccioná una o varias pistas y pulsá **Incrustar letras** en la barra de
selección. El proceso corre en un hilo con progreso por pista.

### Orden de búsqueda

Por cada pista, la app intenta en este orden:

1. **Archivo lateral** `.lrc` o `.txt` junto al audio, emparejado por nombre
   normalizado.
2. **Tag ya incrustado** en el archivo.
3. **LRCLIB**, si no hay nada local.

Si encuentra letra:

- escribe el tag del formato (letra plana o sincronizada, según corresponda);
- conserva o actualiza el archivo lateral como respaldo editable.

### Resultado

Al terminar se muestra un resumen con cinco estados:

| Estado | Significado |
|---|---|
| **Incrustadas** | Se escribió la letra en el tag |
| **Descargadas** | Se encontró en LRCLIB y se incrustó |
| **Ya tenían** | El archivo ya tenía letra |
| **No encontradas** | No se encontró en ningún lado |
| **Con error** | Falló la lectura o la escritura |

Si todas fallaron, se muestran hasta cuatro mensajes de error para que puedas
diagnosticar.

### Letras sincronizadas

Si el `.lrc` o la letra de LRCLIB tiene marcas de tiempo, se conserva el formato
sincronizado. La ficha muestra **Letra: Sí** y podés abrir el archivo lateral para
editarlo con cualquier editor de texto.

## Formatos soportados

Los tags se leen y escriben con **mutagen**. La app soporta los formatos que
mutagen maneja y que el índice reconoce: MP3, M4A/AAC, FLAC, OGG/Opus, WAV y
similares. Si un formato no permite escribir un campo, la app informa el error de
metadata sin romper el resto del lote.

## Buenos hábitos

- **Editá el álbum completo de una vez** con **Aplicar a todo el álbum** antes de
  tocar pistas sueltas.
- **No uses el lote para borrar**: un campo vacío no se toca. Para limpiar, editá
  la pista individual.
- **Revisá el chip Sin tags** después de importar música de fuentes diversas.
- **Dejá un `folder.jpg`** en cada carpeta de álbum: es el respaldo de portada más
  compatible.
- **Hacé una copia** de tu biblioteca antes de un lote grande. El manifiesto
  deshace los tags, no un borrado de archivos.

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “No se pudo guardar” | Archivo bloqueado o sin permisos | Cerrá el reproductor y revisá permisos |
| La portada no cambia | Formato sin soporte de portada | Probá otro formato o dejá `folder.jpg` |
| El lote no actualizó nada | Todos los campos estaban vacíos | Completá al menos un campo |
| Deshacer no restaura una pista | El archivo cambió después del lote | Es intencional: no se pisa un cambio externo |
| No encuentra letra | No hay `.lrc` ni tag y LRCLIB no la tiene | Agregá un `.lrc` junto al audio |
| La letra quedó plana | La fuente no tenía marcas de tiempo | Es lo que había; se puede editar el `.lrc` |

Más en [problemas.md](problemas.md).
