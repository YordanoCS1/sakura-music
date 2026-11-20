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

Arriba de la búsqueda tenés la **Calidad de audio**:

| Formato | Qué hace | Cuándo conviene |
|---|---|---|
| **Opus (Original)** | Audio original de YouTube, sin recodificar | Uso general, archivo liviano |
| **M4A · AAC 192 kbps** | Recodifica a AAC | Compatibilidad amplia (iOS, muchos reproductores) |
| **MP3 320 kbps** | Recodifica a MP3 | Cuando el destino solo acepta MP3 |
| **FLAC (Sin pérdida)** | Compresión lossless | Tu colección de calidad (valor por defecto) |

En todos los casos la app embebe carátula y metadatos.

## Descargar una canción

1. Elegí el formato.
2. Pulsá el botón de descarga de la tarjeta (o **Descargar Enlace** si pegaste
   una URL única).
3. El trabajo aparece en **Cola** como `en cola` y arranca enseguida si hay
   slot libre.

## Descargar una playlist

1. Pegá una URL de playlist o de álbum de YouTube y pulsá **Cargar Playlist**.
2. Las pistas aparecen conforme `yt-dlp` las va encontrando; la lista sigue
   cargando hasta que termine la consulta. Esto no descarga nada.
3. Marcá o desmarcá pistas con las casillas, o usá **Seleccionar todas**.
4. Elegí si **organizar en subcarpeta dedicada** con el nombre de la playlist.
5. Pulsá **Descargar N Canciones**. Cada pista baja como descarga independiente;
   podés cancelarlas una por una sin frenar las demás.

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
| `cancelado` | Lo cancelaste vos; también ofrece **Reintentar** |

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
3. Si el error es temporal (red, timeout), probá **Reintentar**.
4. Si el video es privado, borrado o tiene restricción de edad, no hay forma de
   bajarlo desde la app: probá otro resultado.

Los errores llegan traducidos por yt-dlp (por ejemplo, "Video unavailable").

## Listas y atajos

Las **playlists de YouTube que cargás acá** son listas de descarga temporales;
para guardar tu propia colección usá la pestaña **Listas**, con playlists
persistentes en SQLite. Cómo crearlas, renombrarlas y reordenarlas está en
[biblioteca.md](biblioteca.md#listas-playlists).

Desde cualquier pestaña podés apretar `Ctrl+K` / `⌘K` para abrir la **paleta de
comandos**: navegación, cambio de tema, reproducción y búsqueda de pistas con
**↑↓**, **↵** y **esc**. Está disponible en los 14 temas y se detalla en
[apariencia.md](apariencia.md).


## Cómo se nombran los archivos

Las descargas se guardan como `Artista - Título.opus` (o `.flac`/`.m4a`/`.mp3`
según el formato elegido), sin el ID de YouTube. Si ya existe un archivo con
ese nombre, se agrega `(2)`, `(3)` y así sucesivamente: las dos canciones se
descargan igual, ninguna se saltea. La única excepción es la **misma URL** dos
veces en la cola: se rechaza con un aviso para no duplicar el archivo.
