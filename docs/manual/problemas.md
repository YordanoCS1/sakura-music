# Problemas y diagnóstico

Esta página es para cuando algo no funciona. Está ordenada por síntoma: buscá el
que se parezca al tuyo y seguí la causa probable.

## Antes de tocar nada

1. **Abrí la app desde una terminal**, no con doble clic, para ver los errores:

   ```powershell
   npm run tauri dev
   ```

   Con `iniciar_sakura.bat` los errores de dev también se ven en la ventana.

2. **Verificá las herramientas:**

   ```powershell
   yt-dlp --version
   ffmpeg -version
   ```

   La app también las detecta en la carpeta de datos `bin/` y en winget.

3. **Comprobá el estado en la app:** en **Cola** y en la tarjeta de estado del
   sidebar ves el motor Tauri, la versión de `rustc` (real, no de ejemplo) y la
   memoria del proceso.

## Arranque

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `node` / `cargo` no reconocido | Node o Rust no están en `PATH` | Instalalos y reabrí la terminal |
| La ventana no aparece | Vite no levantó | Corré `npm run tauri dev` desde terminal y leé el error |
| Se cierra al instante | Error en el backend o falta WebView2 | Abrí desde terminal y probá dev; en prod, reinstalá WebView2 |
| “yt-dlp no encontrado” | Falta el binario | Instalalo en `PATH` o en la carpeta de datos `bin\` |
| “ffmpeg no encontrado” | Falta el binario | Instalalo en `PATH`, con winget o en `bin\` |

## Búsqueda y descargas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “Sin resultados” | La consulta no devuelve nada en YouTube | Probá con artista + título, o pegá una URL |
| La búsqueda tarda | yt-dlp arrancando o red lenta | Esperá unos segundos; no es un cuelgue |
| El video es privado/eliminado | El dueño lo restringió | Probá otro resultado |
| “Restricción de edad” / “solo miembros” | YouTube pide sesión | La v2 no soporta cookies de navegador (era la v1); buscá otro video |
| La fila queda en `en cola` | Ya hay 2 descargas en curso | Esperá: solo 2 corren a la vez |
| Una descarga no avanza | Red colgada | Cancelala con **X** y reintentala |
| Falla siempre en el mismo punto | Video caído o red inestable | Probá otro resultado u otro formato |
| “No se encontró el archivo descargado” | yt-dlp terminó sin dejar archivo válido | Reintentá; si persiste, actualizá yt-dlp |
| Querés más de 2 descargas a la vez | Límite del motor | No es configurable: el `DownloadManager` está fijo en 2 |

### La cola no se guarda entre sesiones

Esto es **intencional** en la v2: si cerrás la app a mitad de camino, las filas
desaparecen y las descargas incompletas no se reanudan. La v1 sí persistía la
cola en `download_queue.json`; la v2 la conserva solo en memoria.

## Biblioteca

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “No se encontró la carpeta” | La ruta elegida no existe | Elegí la carpeta de nuevo con **Escanear Carpeta de Música** |
| La biblioteca está vacía | No hay audio en la carpeta | Revisá la ruta o importá otra carpeta |
| Falta una pista descargada | La carpeta de descarga no es la biblioteca | La Cola reescanea sola al terminar; si el archivo está en otra carpeta, abrí esa carpeta como biblioteca |
| No se ve la portada | No hay tag ni `folder.jpg`/`cover.*` | Editá la portada en el editor |
| Cambié de carpeta y no veo audio | La caché es de la carpeta anterior | Volvé a escanear; la caché se regenera sola |
| La app arranca vacía | caché borrada o corrupta | Es normal: reescanéa la carpeta; la caché se reconstruye |

### La caché

`library_cache.json` es descartable. Si sospechás que quedó desincronizada:

1. Cerrá la app.
2. Borrá `%LOCALAPPDATA%\com.sakura.music\library_cache.json`.
3. Abrí la app y dejá que escanee.

No perdés tags ni portadas: todo eso vive en los archivos de audio.

## Metadatos

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “No se pudo guardar” | Archivo bloqueado o sin permisos | La app quita el flag de solo-lectura y reintenta; si persiste, revisá permisos |
| La portada no se incrusta | El formato no soporta carátula | Probá otro formato o dejá un `folder.jpg` |
| El lote no cambió nada | Todos los campos estaban desmarcados | Activá al menos un campo: **un campo desmarcado no se toca** |
| El lote dice “M fallaron” | Fallo parcial real | La v2 lo informa (antes fingía éxito). Leé las razones y corregí esos archivos |
| “Deezer” no encuentra nada | La búsqueda de Deezer es distinta a la de iTunes | Probá iTunes, o buscá con otro artista/título |
| Quedaron `temp_*` en `covers\` | La app se cerró con el editor abierto | Se limpian solos al reabrir |

## Apariencia

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El tema no cambia un color de estado | Los estados (rojo error, verde éxito) no siguen el tema | Es intencional |
| El tema no se guarda | `localStorage` bloqueado | Limpiá los datos del WebView2 y volvé a elegir |
| El universo no cambió el color | El universo cambia fondos y partículas; el color lo manda el tema | Cambiá el **Tema visual** del sidebar |

## Dónde están los datos

```text
%LOCALAPPDATA%\com.sakura.music\
  library_cache.json     ← caché (descartable)
  covers\                ← carátulas (con extensión real)
  bin\                   ← yt-dlp / ffmpeg opcionales
```

**Tu música no vive ahí**: vive en tu biblioteca. Si borrás estos archivos,
solo perdés caché y carátulas; la app los regenera.

```text
WebView2 → localStorage → claves sakura_*:
  sakura_theme, sakura_theme_world, sakura_view_mode,
  sakura_current_folder, sakura_favorites, sakura_player_style, ...
```

## Errores del sistema

| Mensaje | Qué significa |
|---|---|
| `os error 5` | Archivo bloqueado por Windows (abierto en otro programa) |
| Falla de `rename` al guardar tags | Archivo abierto o permisos: la escritura reintenta 4 veces |
| CSP bloquea una imagen o red | El host no está en el `connect-src`/`img-src` de `tauri.conf.json` |
| Asset no visible | La carpeta no está autorizada en el scope: se autoriza al escanear |

## Para reportar un problema

Incluí:

1. Qué hiciste, paso a paso.
2. Qué esperabas y qué pasó.
3. El mensaje exacto de la fila de Cola o de la terminal.
4. Versiones:

   ```powershell
   node --version
   rustc --version
   yt-dlp --version
   ffmpeg -version
   ```

5. Si es visual, una captura.

## Diagnóstico para desarrolladores

```powershell
cargo test --manifest-path src-tauri/Cargo.toml   # 9 tests Rust
node node_modules/typescript/bin/tsc --noEmit      # tipos
npm run build                                      # tsc + vite build
```

Más en [../desarrollo.md](../desarrollo.md).
