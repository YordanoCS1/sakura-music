# Buscar y descargar

La pestaña **Buscar** es la puerta de entrada de la app. Desde ahí buscás en
YouTube, resolvés playlists y descargás pistas sueltas. Todo lo que se encola
aparece en **Cola**.

## Buscar por texto

1. Escribí un título o un artista en el buscador y pulsá **Buscar** (o Enter).
2. La app ejecuta `yt-dlp` y muestra hasta 10 resultados con miniatura, título,
   canal, duración y botón de descarga.
3. Si el texto es una **URL** (`http://` o `https://`), intentará detectarla
   como playlist o enlace directo.

## Elegir formato

Arriba de la búsqueda tiene la **Calidad de audio**:

| Formato | Qué hace | Cuándo conviene |
|---|---|---|
| **Opus (Original)** | Audio original de YouTube, sin recodificar | Uso general, archivo liviano |
| **M4A · AAC 192 kbps** | Recodifica a AAC | Compatibilidad amplia (iOS, muchos reproductores) |
| **MP3 320 kbps** | Recodifica a MP3 | Cuando el destino solo acepta MP3 |
| **FLAC (Sin pérdida)** | Compresión lossless | Su colección de calidad (valor por defecto) |

En todos los casos la app embebe carátula y metadatos.

## Descargar una canción

1. Seleccione el formato.
2. Pulsá el botón de descarga de la tarjeta (o **Descargar Enlace** si pegaste
   una URL única).
3. El trabajo aparece en **Cola** como `en cola` y arranca enseguida si hay
   slot libre.

## Descargar una playlist

1. Pegá una URL de playlist o de álbum de YouTube y pulsá **Cargar Playlist**.
2. Las pistas aparecen conforme `yt-dlp` las va encontrando; la lista sigue
   cargando hasta que termine la consulta. Esto no descarga nada.
3. Marcá o desmarcá pistas con las casillas, o usá **Seleccionar todas**.
4. Seleccione si desea **organizar en subcarpeta dedicada** con el nombre de la playlist.
5. Pulsá **Descargar N Canciones**. Cada pista baja como descarga independiente;
   puede cancelarlas una por una sin frenar las demás.

## La cola

La pestaña **Cola** muestra cada trabajo con su estado, porcentaje, velocidad,
ETA y ruta final. Como máximo **dos descargas corren a la vez**; la tercera
espera turno.

| Estado | Significado |
|---|---|
| `en cola` | Esperando turno |
| `descargando` | yt-dlp está trabajando |
| `convirtiendo audio` | ffmpeg está convirtiendo |
| `completado` | Archivo guardado (con ruta real); ofrece **Ver en Biblioteca** |
| `error: ...` | Falló; muestra la última línea del error y ofrece **Reintentar** |
| `cancelado` | Lo cancelaste usted; también ofrece **Reintentar** |

### Acciones

| Botón | Qué hace |
|---|---|
| **X** en la fila | Cancela esa descarga sola |
| **Cancelar todo** | Cancela todo lo activo (lo terminado no se toca) |
| **Reintentar** en la fila | Vuelve a encolar ese trabajo |
| **Limpiar terminadas** | Saca las filas finales de la vista |

**Al cerrar la app se cancela y mata todo lo pendiente.** No quedan procesos
`yt-dlp` huérfanos. Pero la cola **sí se guarda entre sesiones**: al reabrir
aparece el aviso "Se restauraron N descargas…", y las que estaban en curso
vuelven como `interrumpida` y **se reanudan solas**: yt-dlp se invoca con
`--continue` y reutiliza el archivo parcial cuando puede. Las terminadas,
canceladas y con error quedan como historial en la Cola.

## Qué hacer si una descarga falla

1. Leé el motivo en la fila de Cola.
2. Revisá la tabla de [problemas.md](problemas.md).
3. Si el error es temporal (red, timeout), pruebe **Reintentar**.
4. Si el video es privado, borrado o tiene restricción de edad, no hay forma de
   descargarlo desde la app: pruebe otro resultado.

Los errores llegan traducidos por yt-dlp (por ejemplo, "Video unavailable").

## Listas y atajos

Las **playlists de YouTube que cargás aquí** son listas de descarga temporales;
para guardar su propia colección use la pestaña **Listas**, con playlists
persistentes en SQLite. Cómo crearlas, renombrarlas y reordenarlas está en
[biblioteca.md](biblioteca.md#listas-playlists).

Desde cualquier pestaña puede apretar `Ctrl+K` / `⌘K` para abrir la **paleta de
comandos**: navegación, cambio de tema, reproducción y búsqueda de pistas con
**↑↓**, **↵** y **esc**. Está disponible en los 19 temas y se detalla en
[apariencia.md](apariencia.md).


## Cómo se nombran los archivos

Las descargas se guardan como `Artista - Título.opus` (o `.flac`/`.m4a`/`.mp3`
según el formato elegido), sin el ID de YouTube. Si ya existe un archivo con
ese nombre, se agrega `(2)`, `(3)` y así sucesivamente: las dos canciones se
descargan igual, ninguna se saltea. La única excepción es la **misma URL** dos
veces en la cola: se rechaza con un aviso para no duplicar el archivo.


## Mejoras del flujo de descarga

- **No se repiten**: un archivo `download_archive.txt` guarda los IDs ya bajados, así que aunque limpies la cola o reinicies, la misma URL no se descarga dos veces.
- **Se indexan solas**: al terminar, la pista se agrega a la biblioteca y aparece sin escaneo manual (evento `library-track-added`).
- **Portada HD**: antes de descargar se busca carátula en iTunes; si hay, se incrusta en el archivo terminado con ffmpeg (sobre un temporal, para no dañar el audio). Si falla, se conserva la miniatura de YouTube.
- **Errores claros**: en vez del texto crudo de yt-dlp, la cola dice cosas como "El video es privado", "Sin conexión a internet" o "YouTube pidió verificación".
- **Paralelismo configurable**: Ajustes → Sistema → *Descargas en paralelo* permite elegir entre 1 y 4.


## Reintentos, errores de formato y filtros

- **Reintentos automáticos**: los errores transitorios (429, sin conexión, timeout) se reintentan hasta 3 veces con esperas de 2 y 4 segundos; la cola muestra "Reintentando en…".
- **Fallback de formato**: si el formato pedido no existe (por ejemplo FLAC), se prueba OPUS, M4A y MP3 automáticamente.
- **Aviso al terminar**: notificación de Windows y un tono breve que cambia según el tema. Si el navegador bloquea las notificaciones, el sonido sigue funcionando.
- **Prioridad y filtro en la cola**: cada fila tiene botones para subir/descargar y el encabezado permite filtrar por *En curso*, *Terminadas* o *Con error*.
- **Filtro de duración en la búsqueda**: *Menos de 5 min*, *5 a 10 min* o *Más de 10 min*, usando la duración que reporta YouTube.
- **Arranque rápido (opcional)**: en Ajustes → Sistema puede evitar el reescaneo automático al abrir. Si cambiás archivos con la app cerrada, seleccione *Actualizar biblioteca*.


## Limpieza y duplicados

- La cola ordena primero las descargas activas y deja abajo las canceladas, terminadas o con error.
- **Limpiar terminadas** quita sólo las que terminaron bien. **Limpiar canceladas y errores** pide confirmación y quita el resto de inactivas.
- Si agregás una pista que ya está en la cola con la misma carpeta y formato, no se crea una fila nueva que falla: aparece un aviso y se resalta la fila existente.
- Al cancelar, la fila se queda como *cancelada* (no desaparece) con opciones de reintentar o quitar.
