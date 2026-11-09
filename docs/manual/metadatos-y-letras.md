# Metadatos y portadas

Los tags incrustados en cada archivo son la **fuente de verdad** de la
biblioteca. Sakura los lee y escribe en Rust con `lofty`, en RAM, y solo toca el
disco al final con escritura atómica.

## Abrir el editor

Hay dos caminos:

1. **Desde Biblioteca:** botón de lápiz (✏️) en la tarjeta de Cuadrícula, en la
   columna de acciones de Tabla, o en **Editar metadatos** del panel de detalle.
2. **Desde el reproductor:** botón de edición sobre la pista activa.

El editor lee los tags al abrir y **no escribe nada hasta Confirmar**. Si hacés
clic en **Cancelar**, no se toca ningún archivo.

## Qué podés editar

- **Información principal:** título, artista, artista del álbum
- **Álbum y posición:** nombre del álbum, número de pista
- **Año y género:** año de lanzamiento (solo números) y género
- **Carátula:** archivo local (JPG, PNG, WebP), pegar con `Ctrl+V`, eliminar o
  restaurar la carátula original

Cada campo que modificás muestra su botón de **reversión individual**, y hay un
**restablecer valores originales** para volver al estado de apertura.

### Carátula

- **Cargar…** abre el selector nativo de imágenes.
- **Pegar desde el portapapeles (`Ctrl+V`)**: copiá cualquier imagen de la web
  o de una captura y pegala al instante.
- **Quitar carátula** la elimina del archivo; **Restaurar** vuelve a la original.

Las imágenes que pegás o cargás se guardan como temporales en `covers/temp_*`
y se borran solos al abrir la app o antes de guardar la siguiente. No acumulan
basura.

## Guardado seguro (incluso mientras suena)

Al presionar **Guardar**:

1. El backend Rust procesa los cambios en RAM.
2. Escribe los bloques del formato (Vorbis para Opus/FLAC, ID3 para MP3, MP4
   para M4A) con temporal + `rename`, con reintentos.
3. Actualiza la caché y el frontend sin reescanear toda la carpeta.

Como el reproductor carga el audio en memoria, Windows no bloquea el archivo:
editás aunque esté sonando, sin errores de "acceso denegado".

## Buscar en catálogo (iTunes o Deezer)

La pestaña **Buscador Catálogo** del editor busca por artista + título y muestra
resultados con carátula, artista, álbum, año y género.

- Cada fuente consulta su **API real** (antes "Deezer" consultaba iTunes):
  **Apple Music (iTunes)** descarga la carátula en alta definición (600x600)
  y **Deezer** trae `cover_xl`/`cover_big`/`cover_medium`.
- **Aplicar todo:** rellena los campos de texto e importa la carátula HD.
- **Solo portada:** descarga solo el arte, sin tocar lo que ya editaste.

## Editar en lote (Batch Editor)

Seleccioná dos o más pistas (casillas en Cuadrícula o Tabla). La barra de
selección muestra **Editar en lote (N)** con **Seleccionar todas** y
**Deseleccionar**.

El modal del lote permite activar por campo: artista, álbum, artista del álbum,
año, género y carátula compartida. **El título no entra al lote** para no
destruir la identidad de cada canción.

### La regla de oro

> **Un campo desmarcado no se toca.**

Si no activás la casilla de un campo, el motor respeta el valor que cada pista
ya tenga. Solo se escribe lo que marcaste.

### Si el lote falla en parte

El lote devuelve `{ actualizadas, errores }`. Si 8 de 10 se guardan y 2 fallan
(archivo bloqueado, permisos, formato no soportado), la app te dice
**"Se actualizaron 8 y 2 fallaron: …"** con las primeras razones, y no abre el
modal de éxito total. Antes, la v1 fingía éxito aunque nada se hubiera escrito.

## Formatos soportados

| Formato | Contenedor de tags |
|---|---|
| OPUS / FLAC / OGG | Vorbis Comments |
| MP3 | ID3v2.3 / ID3v2.4 |
| M4A / AAC | MP4 boxes |
| WAV | Vorbis/RIF |

Si un archivo no permite escribir (bloqueado, sin permisos), el editor informa
el error puntual y el resto del lote sigue.

## Buenos hábitos

- **No uses el lote para borrar**: un campo desmarcado no se toca. Para limpiar
  una pista, editala individualmente.
- **Revisá el contador** después de importar música de fuentes diversas.
- **Dejá un `folder.jpg`** en cada carpeta de álbum: es el respaldo de portada
  más compatible.
- **Hacé una copia** de tu biblioteca antes de un lote grande: la escritura es
  atómica, pero un lote equivocado sigues siendo tuyo.
- **La v1 no existe más acá**: no hay letra incrustada (LRCLIB), ni deshacer con
  manifiestos, ni "aplicar a todo el álbum" del editor. Si extrañás alguna de
  esas funciones, está en `legacy_python/`.

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “No se pudo guardar” | Archivo bloqueado o sin permisos | Cerrá el reproductor y revisá permisos; la app quita el flag de solo-lectura y reintenta sola |
| La portada no cambia | Formato sin soporte de carátula | Probá otro formato o dejá `folder.jpg` |
| El lote no actualizó nada | Todos los campos estaban desmarcados | Activá al menos un campo |
| Quedaron `temp_*` en `covers/` | La app se cerró con un editor abierto | Ventana nueva: se limpian solos al arrancar |

Más en [problemas.md](problemas.md).
