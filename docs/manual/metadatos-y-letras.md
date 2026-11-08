# Metadatos y Catálogo

Los tags incrustados en cada archivo son la **fuente de verdad** de la biblioteca.

> [!TIP]
> **En Sakura Music 2.0:** El motor de etiquetado fue reimplementado en **Rust nativo con `lofty`**, ensamblando paquetes de metadatos en memoria a través de streams atómicos (`Cursor<Vec<u8>>`). Esto garantiza que **nunca se bloqueen los archivos en disco** y permite editar canciones incluso mientras las estás escuchando.

## Abrir el editor

Hay tres caminos:

1. **Desde la vista Grid (Cuadrícula):** Pasá el cursor sobre cualquier tarjeta de canción y hacé clic en el botón flotante de lápiz (✏️).
2. **Desde la vista Tabla:** En la columna *Acciones* de cada fila, hacé clic en el botón de edición.
3. **Desde el Reproductor inferior:** Hacé clic en el icono de edición sobre la pista activa actual.

El editor lee los tags al abrir y **no escribe nada hasta confirmar**. Si hacés clic en **Cancelar**, no se toca ningún archivo.

## Características del Editor Pro

El modal de edición cuenta con dos pestañas optimizadas:

### 1. Pestaña «Etiquetas & Portada»

- **Gestión de Carátula:**
  - **Cargar...**: Abre el selector nativo para elegir imágenes JPG, PNG o WEBP.
  - **Buscar HD**: Salta directamente a la búsqueda en catálogo oficial.
  - **Quitar carátula**: Marca la imagen para eliminación completa del archivo.
  - **Restaurar**: Vuelve a la carátula original del archivo.
  - **Pegar desde el Portapapeles (`Ctrl + V`)**: Podés copiar cualquier imagen de tu navegador o capturador y pegarla al instante en el editor.
- **Campos organizados:**
  - **Información Principal:** Título, Artista, Artista del Álbum.
  - **Álbum & Posición:** Nombre del Álbum, Número de Pista.
  - **Año & Género:** Año de lanzamiento, Género con botones rápidos para géneros populares (*J-Pop, K-Pop, Anime, Rock, Pop, Lo-Fi, Electrónica, Hip-Hop, Metal, Vocaloid, Jazz, Clásica*).
- **Botones de Reversión individual:** Cada campo cuenta con su propio botón *«Revertir»* que aparece cuando el valor ha sido modificado.
- **Restablecer valores originales:** Restaura todos los campos a su estado inicial antes de editar.

### 2. Pestaña «Buscador Catálogo»

- Búsqueda integrada contra la API oficial de **Apple Music / iTunes**.
- Autocompleta la consulta con el Artista y Título actuales.
- Muestra los resultados con miniaturas de carátula, artista, álbum, año y género.
- Cada resultado tiene dos botones directos:
  - **Aplicar todo:** Rellena todos los campos de texto e importa automáticamente la carátula en alta definición (600x600 px).
  - **Solo portada:** Descarga únicamente el arte en alta resolución sin tocar los textos que ya editaste.

## Guardado seguro en caliente

Al presionar **Guardar Cambios**:
1. El backend en Rust procesa los cambios en memoria.
2. Escribe de forma atómica los nuevos bloques Vorbis (Opus), ID3v2 (MP3) o MP4 (M4A/AAC).
3. La biblioteca local y la caché de disco se sincronizan al instante sin necesidad de re-escanear toda la carpeta.
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

## Editar en lote (Batch Editor)

En Sakura Music 2.0, seleccioná dos o más pistas marcando las casillas de verificación tanto en la **Vista Cuadrícula** como en la **Vista Tabla**.

Al seleccionar canciones, se activa automáticamente la **Barra de Selección en Lote** que indica la cantidad de canciones elegidas y ofrece:
- **Seleccionar Todas**: Marca rápidamente todas las canciones mostradas.
- **Deseleccionar**: Limpia la selección actual.
- **Editar en Lote (N)**: Abre el modal del Batch Editor.

### Campos modificables en lote:
- **Artista**
- **Álbum**
- **Artista del álbum**
- **Año**
- **Género**
- **Carátula compartida** (o remoción masiva de carátulas)

> **Nota de diseño:** El campo *Título* queda excluido de la edición por lotes para preservar la identidad de cada canción.

### La regla de oro del Batch Editor

> **Un campo desmarcado no se toca.**

Cada campo cuenta con una casilla de activación independiente. Si el usuario no activa explícitamente la casilla de un campo, el motor en Rust respeta el valor existente en cada pista individual.

### Procesamiento atómico en Rust

El motor de Rust procesa el lote de manera atómica en memoria RAM con reintentos automáticos para evitar bloqueos por parte del explorador de Windows, actualizando la caché y la interfaz en tiempo real.

## Formatos soportados

Los tags y carátulas se procesan con el motor nativo en Rust (**Lofty**). La app soporta:
- **OPUS** (Vorbis Comments nativos)
- **FLAC** (Vorbis Comments con carátulas PICTURE)
- **MP3** (ID3v2.3 y ID3v2.4)
- **M4A / AAC** (MP4 atoms/boxes)
- **OGG / WAV**

Si un archivo no permite escribir por problemas de permisos del sistema de archivos, el motor informa el error puntualmente sin corromper el resto de las canciones del lote.
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
