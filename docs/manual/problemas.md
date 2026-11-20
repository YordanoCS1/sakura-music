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

3. **Comprobá el estado en la app:** en **Cola** y en **Ajustes** ves el motor
   Tauri, la versión de `rustc` (real, no de ejemplo) y la memoria del proceso;
   en **Ajustes → Sistema** está el doctor de SQLite, la papelera, las
   actualizaciones y los logs.

## Arranque

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `node` / `cargo` no reconocido | Node o Rust no están en `PATH` | Instalalos y reabrí la terminal |
| La ventana no aparece | Vite no levantó | Corré `npm run tauri dev` desde terminal y leé el error |
| Se cierra al instante | Error en el backend o falta WebView2 | Abrí desde terminal y probá dev; en prod, reinstalá WebView2 |
| WebView2 falla con `0x800700AA` | El perfil está ocupado por otra instancia/proceso | Cerrá Sakura duplicada y las apps que estén usando `%LOCALAPPDATA%\SakuraMusic\webview`; no borres `.tauri_data` |
| “yt-dlp no encontrado” | Falta el binario | Instalalo en `PATH` o en la carpeta de datos `bin\` |
| “ffmpeg no encontrado” | Falta el binario | Instalalo en `PATH`, con winget o en `bin\` |

## Búsqueda y descargas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| “Sin resultados” | La consulta no devuelve nada en YouTube | Probá con artista + título, o pegá una URL |
| La búsqueda tarda | yt-dlp arrancando o red lenta | Esperá unos segundos; no es un cuelgue |
| `PYI-... Could not create temporary directory` | yt-dlp no pudo crear su carpeta de extracción temporal | Reiniciá la app; Sakura prepara una carpeta temporal propia para yt-dlp. Si persiste, revisá permisos y espacio libre en la carpeta de datos |
| El video es privado/eliminado | El dueño lo restringió | Probá otro resultado |
| “Restricción de edad” / “solo miembros” | YouTube pide sesión | La v2 no soporta cookies de navegador (era la v1); buscá otro video |
| La fila queda en `en cola` | Ya hay 2 descargas en curso | Esperá: solo 2 corren a la vez |
| Una descarga no avanza | Red colgada | Cancelala con **X** y reintentala |
| Falla siempre en el mismo punto | Video caído o red inestable | Probá otro resultado u otro formato |
| “No se encontró el archivo descargado” | yt-dlp terminó sin dejar archivo válido | Reintentá; si persiste, actualizá yt-dlp |
| Querés más de 2 descargas a la vez | Límite del motor | No es configurable: el `DownloadManager` está fijo en 2 |

### La cola se guarda y se reanuda

Si cerrás la app a mitad de camino, al reabrir la Cola restaura las filas y las
interrumpidas **se reanudan solas** (yt-dlp se invoca con `--continue`, así que
reutiliza el archivo parcial cuando puede). Si el archivo `download_queue.json`
se corrompe, la app arranca con la cola vacía en vez de romperse.

| Síntoma | Qué hacer |
|---|---|
| Una descarga se reanuda sola al abrir | Es lo esperado: estaba `interrumpida` |
| La cola vieja no desaparece | **Limpiar terminadas** saca las filas finales; **Cancelar todo** cancela lo activo |
| Querés vaciar todo el historial | Dejá la Cola vacía: el archivo se reescribe solo |

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

La biblioteca ahora se guarda en `library.sqlite3`. Si sospechás que quedó
desincronizada, usá **Ajustes → Limpiar Caché** y luego volvé a escanear la
carpeta. La caché anterior `library_cache.json` se importa una sola vez si
está presente.

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
| El tema no se guarda | `localStorage` bloqueado | Limpiá los datos del WebView2 y volvé a abrir la app |
| Cambié de tema y la biblioteca no cambia de vista | Elegiste uno de los 4 temas genéricos | Los 13 temas propios son los que traen biblioteca, cabecera y diálogos propios |
| La paleta `⌘K` no abre | El atajo no llegó al WebView | Probá `Ctrl+K` en Windows/Linux; tocá la lupa de la cabecera como alternativa |

## Actualizaciones y papelera

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| **Buscar actualizaciones** dice que no hay | No hay versión nueva publicada, o el endpoint apunta a `REPLACE_OWNER/REPLACE_REPO` | Si compilaste vos, configurá el owner/repo real en `tauri.conf.json` antes de publicar |
| El actualizador falla con error de firma | El bundle no fue firmado con la clave privada correcta, o el binario fue modificado | No lo instales: bajá el instalador del canal oficial, que sí pasa la verificación minisign |
| Después de instalar no se reinicia | El proceso no pudo relanzarse | Cerrá la app y abrila de nuevo: la versión nueva ya está instalada |
| Borré pistas y no aparece **Deshacer** | Pasaron los 9 segundos del toast | El archivo quedó en `trash\`: Ajustes → Sistema muestra el contador, pero la restauración sólo se hace desde el toast dentro de esos 9 segundos |
| El contador de la papelera no baja | Hay archivos pendientes de borrado definitivo | Tocá **Vaciar papelera** en Ajustes → Sistema; esa acción sí es irreversible |
| La base crece sin parar o las búsquedas van lentas | Índice SQLite desactualizado | En Ajustes → Sistema usá **Verificar** y **Compactar**; los respaldos se crean con `VACUUM INTO` |

El panel **Ajustes → Sistema** también muestra integridad, pistas indexadas,
entradas FTS, tamaño y esquema (`user_version=2`), y tiene un visor de
`sakura.log` con botón **Copiar** para pegarlo en un issue.

## Dónde están los datos

```text
%LOCALAPPDATA%\com.sakura.music\
  library.sqlite3        ← índice local de la biblioteca (SQLite + FTS5)
  library_cache.json     ← caché antigua (se conserva tras importarla)
  covers\                ← carátulas (con extensión real)
  trash\                 ← borrados recuperables con Deshacer (9 s)
  bin\                   ← yt-dlp / ffmpeg opcionales
```

**Tu música no vive ahí**: vive en tu biblioteca. Si borrás el índice y las
carátulas, la app los regenera; en cambio, borrar `trash\` descarta los archivos
que todavía podías recuperar con **Deshacer**.

```text
WebView2 → localStorage → claves sakura_*:
  sakura_theme, sakura_view_mode,
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
cargo test --manifest-path src-tauri/Cargo.toml   # 43 tests Rust
npm run pipeline                                  # 29 unitarios + 28 E2E + 43 tests Rust + build
node node_modules/typescript/bin/tsc --noEmit      # tipos
npm run build                                      # tsc + vite build
```

Más en [../desarrollo.md](../desarrollo.md).
