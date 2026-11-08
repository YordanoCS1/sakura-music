# Problemas y diagnóstico

Esta página es para cuando algo no funciona. Está ordenada por síntoma: buscá el
que se parezca al tuyo y seguí la causa probable.

## Antes de tocar nada

1. **Abrí la app desde una terminal**, no con doble clic, para ver los mensajes:

   ```bash
   python -m sakura --no-launcher
   ```

   Con `SakuraMusic.pyw` no hay consola y los errores de Python se pierden.

2. **Verificá las herramientas:**

   ```bash
   ffmpeg -version
   ffprobe -version
   python -m yt_dlp --version
   ```

3. **Probá sin decoración:**

   ```bash
   SAKURA_NO_SPLASH=1 python -m sakura --no-launcher
   ```

4. Si la app parece colgada al cerrar:

   ```bash
   SAKURA_TRACE=1 python -m sakura
   ```

   A los 6 segundos vuelca la pila a `close_hang.txt` en la raíz del repo.

## Arranque

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `No module named sakura` | El paquete no está instalado | `python -m pip install -e .` |
| `ModuleNotFoundError: PySide6` | Faltan dependencias | `python -m pip install -e .` |
| La ventana no aparece | `QT_QPA_PLATFORM=offscreen` activo | Quitá esa variable del entorno |
| Arranca y se cierra al instante | Error en un servicio o en el tema | Corré desde terminal y leé el traceback |
| Se cuelga al cerrar | Un `QThread` quedó vivo | Probá `SAKURA_TRACE=1`; reportá la pila |
| El launcher no aparece | `SAKURA_NO_LAUNCHER` o `--no-launcher` | Quitá la variable o el flag |
| El splash no aparece | `SAKURA_NO_SPLASH` o modo offscreen | Es intencional |

## ffmpeg y yt-dlp

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “ffmpeg no está instalado” al descargar | Falta el binario | Instalalo en el `PATH` o en `%LOCALAPPDATA%\SakuraMusic\bin` |
| La app detecta FFmpeg pero falla al convertir | Versión vieja o build incompleto | Actualizá desde **Ajustes → Herramientas** |
| `ToolMissing` al buscar | yt-dlp no está instalado | `python -m pip install -e .` |
| La actualización de FFmpeg falla | `winget` no disponible | Instalalo a mano y reintentá |
| La actualización de yt-dlp falla | `pip` sin permisos | Actualizá con `python -m pip install -U yt-dlp` |

La app busca `ffmpeg` primero en el `PATH` y después en
`%LOCALAPPDATA%\SakuraMusic\bin`. Si la build de Microsoft Store redirige
`%LOCALAPPDATA%`, la carpeta de datos puede estar en
`%USERPROFILE%\SakuraMusic`.

## Búsqueda y descargas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “Sin resultados” | La consulta es muy específica o YouTube no devolvió nada | Probá con artista + título, o pegá una URL |
| La búsqueda tarda | yt-dlp está arrancando o la red está lenta | Esperá; la app no lanza una búsqueda por tecla |
| El video es privado | El dueño lo restringió | No hay forma de bajarlo |
| “El video tiene restricción de edad” | YouTube pide sesión | Configurá cookies de navegador en Ajustes |
| “El video es solo para miembros” | Contenido pago | No hay forma de bajarlo |
| “El video tiene copyright” | Bloqueo por derechos | No hay forma de bajarlo |
| Se queda en **Pendiente** | No hay slots libres | Esperá; hay 2 descargas simultáneas por defecto |
| Se queda en **Descargando** sin avanzar | Red colgada o yt-dlp esperando | Cancelá y reintentá |
| Falla siempre en el mismo punto | Video caído o formato no disponible | Probá otro resultado u otro formato |
| El archivo no aparece | Se movió a la carpeta de descargas o biblioteca | Mirá la ruta en la fila de Cola |
| “No se encontró el archivo descargado” | yt-dlp terminó sin dejar un archivo válido | Reintentá; si persiste, actualizá yt-dlp |
| La cola guardada no se pudo leer | `download_queue.json` corrupto | La app arranca vacía; borrá el archivo si molesta |

### Duplicados

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Todo queda “Ya estaba” | El archivo ya existe en la biblioteca o en descargas | Es intencional; revisá la carpeta |
| No puedo bajar una versión distinta | Mismo video ya encolado | Esperá a que termine o cancelá el trabajo anterior |

### Cookies de navegador

Las cookies sirven para videos con restricción de edad o que piden sesión.

1. **Ajustes → Descargas → Cookies de YouTube.**
2. Elegí Chrome, Edge, Firefox, Brave o Vivaldi.
3. Cerrá el navegador antes de descargar: algunos bloquean la base de cookies.
4. Tené en cuenta que con cookies **solo se baja una descarga a la vez**.

Si el navegador está abierto y bloquea el archivo, yt-dlp falla con un error de
permisos. Cerrarlo y reintentar suele alcanzar.

## Biblioteca

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “No se encontró la carpeta” | La ruta configurada no existe | **Cambiar carpeta** en la barra de Biblioteca |
| La biblioteca está vacía | No hay audio en la carpeta | Importá una carpeta o revisá la ruta |
| Una pista nueva no aparece | El watcher espera 900 ms | Esperá un segundo o pulsá **Volver a escanear** |
| Una pista borrada sigue en la lista | El cambio no llegó al watcher | **Volver a escanear** |
| El contador no coincide | Hay archivos ilegibles o no soportados | Revisá la carpeta con el explorador |
| No se ve la portada | No hay tag ni `folder.jpg`/`cover.*` | Editá la portada o agregá `folder.jpg` |
| Una pista aparece dos veces | Son dos archivos distintos | Mirá el chip **Duplicados** y la ruta de cada uno |
| La vista no cambia | La vista está oculta | Clic derecho → **Mostrar todas las vistas** |
| El escaneo tarda mucho | Primera vez o disco lento | Es esperable; después usa el índice |
| El índice está corrupto | Cierre abrupto o disco lleno | Borrá `library_index.sqlite3`; se reconstruye |

### El índice

El índice es descartable. Si sospechás que quedó desincronizado:

1. Cerrá la app.
2. Borrá `%LOCALAPPDATA%\SakuraMusic\library_index.sqlite3`.
3. Abrí la app y dejá que reescaneе.

No perdés tags ni portadas: todo eso vive en los archivos.

## Metadatos y letras

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “No se pudo guardar” | Archivo bloqueado o sin permisos | Cerrá el reproductor y revisá permisos |
| La portada no se incrusta | El formato no soporta portada | Probá otro formato o usá `folder.jpg` |
| El lote no cambió nada | Todos los campos estaban vacíos | Completá al menos un campo |
| El lote cambió un campo que no quería | Se completó sin querer | **Deshacer último lote** |
| Deshacer saltea una pista | El archivo cambió después del lote | Es intencional: no se pisa un cambio externo |
| No encuentra letra | No hay `.lrc`/`.txt`, tag ni resultado en LRCLIB | Agregá un `.lrc` junto al audio |
| La letra quedó sin sincronizar | La fuente no tenía marcas de tiempo | Editá el `.lrc` a mano |
| “El archivo de letra está vacío” | El `.lrc` existe pero no tiene texto | Borralo o completalo |
| No puedo aplicar a todo el álbum | El candidato no tiene `album_id` de iTunes | Elegí un resultado de iTunes, no de Deezer |

## Apariencia

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| Un widget quedó con el color anterior | Estilo inline no refrescado | Cambiá de tema y volvé |
| El tema no se guarda | `config.json` sin permisos | Revisá la carpeta de datos |
| La navegación se movió de lugar | El tema usa otro shell | Es intencional |
| El acento no sigue la portada | La opción está apagada | **Ajustes → Apariencia** |
| Un icono no cambia | PNG inválido o bloqueado | Probá otro PNG y mirá la vista previa |
| Un tema se ve mal | No debería: todos pasan contraste | Reportalo con captura y nombre del tema |

## Rendimiento

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El primer escaneo tarda minutos | Miles de archivos y tags | Es esperable; después usa el índice |
| La UI se traba al escanear | No debería: corre en un hilo | Reportalo con `SAKURA_TRACE=1` |
| Las descargas van lentas | Red o límite de YouTube | Probá de a una; revisá cookies |
| Cambiar de tema tarda | Se regenera todo el QSS | Es normal en el primer cambio |
| La app tarda en cerrar | Está esperando hilos | Debería ser rápido; si no, reportá la pila |

## Dónde están los datos

```text
%LOCALAPPDATA%\SakuraMusic\
  config.json
  download_queue.json
  download_history.json
  library_index.sqlite3
  Historial\
  Iconos\
  Cache\Portadas\
  Musica\
  Descargas\
```

Si `%LOCALAPPDATA%` está redirigido por la build de Microsoft Store, buscá en
`%USERPROFILE%\SakuraMusic`.

**Antes de borrar algo**, tené en cuenta:

| Archivo | Si lo borrás… |
|---|---|
| `config.json` | Perdés ajustes; la app arranca con valores por defecto |
| `download_queue.json` | Perdés la cola reanudable |
| `download_history.json` | Perdés el historial de descargas |
| `library_index.sqlite3` | Se reconstruye al escanear |
| `Historial\` | Perdés la posibilidad de deshacer lotes |
| `Iconos\` | Volvés a los iconos por defecto |
| `Cache\Portadas\` | Se regeneran |

**Tu música no vive ahí** salvo que hayas dejado la biblioteca en `Musica\`.

## Errores del sistema

| Mensaje | Qué significa |
|---|---|
| `PermissionError` al guardar | Otro programa tiene el archivo abierto, o falta permiso |
| `OSError: [Errno 28]` | Disco lleno |
| `sqlite3.DatabaseError` | Índice corrupto; borralo y reescaneá |
| `json.JSONDecodeError` | Un archivo de estado se corrompió; la app lo ignora |
| `QThread: Destroyed while thread is still running` | Un servicio no se cerró; reportalo con la pila |

## Para reportar un problema

Incluí:

1. Qué hiciste, paso a paso.
2. Qué esperabas y qué pasó.
3. El mensaje exacto de la app o de la terminal.
4. Versión de Python, PySide6 y yt-dlp:

   ```bash
   python --version
   python -c "import PySide6; print(PySide6.__version__)"
   python -m yt_dlp --version
   ```

5. Si es visual, una captura.
6. Si es un cuelgue, el `close_hang.txt` generado con `SAKURA_TRACE=1`.

## Diagnóstico para desarrolladores

```bash
python -m pytest                    # suite completa
python -m ruff check .              # lint
python scripts/audit_contrast.py    # contraste WCAG de los 14 temas
python scripts/check_theme_switch.py
python scripts/smoke_download.py    # descarga real
python scripts/smoke_formats.py     # opus, m4a y mp3
python scripts/smoke_metadata.py    # tags y portadas
python scripts/smoke_lookup.py      # iTunes + etiquetado de álbum
```

Los `smoke_*` tocan red o disco y no forman parte de la suite. Más en
[../desarrollo.md](../desarrollo.md).
