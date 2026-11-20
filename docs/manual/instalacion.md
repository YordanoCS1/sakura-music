# Instalación y primer arranque

Sakura Music 2.0 es una app de escritorio Tauri. La compilás con Node + Rust y
guardás todo lo suyo en la carpeta de datos del usuario
(`AppData/Local/com.sakura.music` en Windows). No necesitás Python.

## Lo que necesitás

| Requisito | Para qué | Cómo se resuelve |
|---|---|---|
| **Node.js 20+** | Correr Vite y Tauri CLI | [nodejs.org](https://nodejs.org/) |
| **Rust estable** | Compilar el backend | [rustup.rs](https://rustup.rs/) |
| **yt-dlp** | Buscar y bajar de YouTube | En el `PATH`, o en `bin/` de la carpeta de datos |
| **ffmpeg** | Convertir a FLAC/MP3/M4A/Opus | En el `PATH`, winget o `bin/` |
| **WebView2** | Mostrar la interfaz | Preinstalado en Windows 10/11 |

La app **detecta** yt-dlp y ffmpeg y te informa dónde los encontró (Cola y
Ajustes). Sin yt-dlp no podés buscar ni descargar.

Si no los tenés, abrí **Ajustes → Herramientas de descarga** y tocá **Instalar**:
Sakura baja la versión fijada, verifica su hash SHA256 y la guarda en `bin/`.
No reemplaza un binario que ya estés usando. Si preferís instalarlos vos:

**Windows (con winget):**

```powershell
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

**Manual:** descargá los binarios, descomprimilos en la carpeta de datos
(`%LOCALAPPDATA%\com.sakura.music\bin\`) y reiniciá la app.

## Instalar y abrir

Desde la raíz del repositorio:

```powershell
npm install
npm run tauri dev
```

En Windows también podés hacer doble clic en **`iniciar_sakura.bat`**: hace
exactamente `npm run tauri dev`.

Para tener la app instalada (instalador .exe / .msi):

```powershell
npm run tauri build
```

## Actualizaciones

Si instalaste la app con el instalador, entrá a **Ajustes → Sistema** y tocá
**Buscar actualizaciones**. Si hay una versión nueva aparece **Instalar
\<versión\>**: se baja, se verifica la firma **minisign** con la clave pública
incluida y se instala; después la app se reinicia sola. Las actualizaciones
firmadas son las únicas que se aceptan, así que no hace falta buscar instaladores
por fuera del canal oficial. Si compilás desde el código, antes de publicar hay
que configurar el endpoint real en `tauri.conf.json` (el repo trae
`REPLACE_OWNER/REPLACE_REPO` como marcador de posición); el detalle está en
[../nuevas-funciones.md](../nuevas-funciones.md).

## Dónde quedan tus datos

Por defecto, en Windows:

```text
%LOCALAPPDATA%\com.sakura.music\
  library.sqlite3        ← índice local de la biblioteca (SQLite + FTS5)
  library_cache.json     ← caché antigua; se importa una vez si existe
  covers\                ← carátulas con extensión real
  trash\                 ← borrados recientes, recuperables con Deshacer
  bin\                   ← yt-dlp / ffmpeg opcionales
```

Tu música **no vive ahí**: vive en la carpeta que elegiste como biblioteca
(por defecto, la carpeta Música de Windows). Las preferencias (tema, vista,
carpeta actual, favoritos) viven en el almacenamiento del navegador
(`localStorage`, claves `sakura_*`), no en archivos sueltos.

La caché anterior `library_cache.json` se conserva después de importarla. Para
reconstruir el índice nuevo, usá **Ajustes → Limpiar Caché** y luego escaneá de
nuevo. No perdés tags ni audio.

## Primer recorrido

1. Abrí la app: arranca en **Biblioteca** con la última carpeta visitada.
2. Si está vacía, hacé clic en **Escanear Carpeta de Música** o
   **Escanear Música de Windows** y elegí tu colección.
3. Andá a **Buscar**, escribí un artista o pegá un enlace de YouTube y
   descargá tu primera canción en el formato que prefieras.
4. En **Cola** mirá el porcentaje, velocidad y ETA; al terminar, la canción
   aparece sola en Biblioteca.
5. En **Ajustes** elegí uno de los 16 temas y ajustá los efectos visuales; en
   **Ajustes → Sistema** podés verificar la base, vaciar la papelera y buscar
   actualizaciones.

Los siguientes pasos están en [buscar-y-descargar.md](buscar-y-descargar.md) y
[biblioteca.md](biblioteca.md).

## Desinstalar

1. Desinstalá la app como cualquier programa de Windows (Panel de control o
   Configuración → Aplicaciones).
2. Si querés, borrá la carpeta de datos
   (`%LOCALAPPDATA%\com.sakura.music`): perdés caché y carátulas, **no tu
   música**, que está en tu biblioteca.

## Si algo no arranca

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `node` no reconocido | Node no instalado o no en `PATH` | Instalá Node 20+ y reabrí la terminal |
| `cargo` no reconocido | Rust no instalado o no en `PATH` | Instalá rustup y reabrí la terminal |
| La ventana no aparece | Vite no arrancó | Corré `npm run tauri dev` desde terminal y leé el error |
| “yt-dlp no encontrado” | Falta el binario | Instalalo desde Ajustes → Herramientas de descarga |
| “ffmpeg no encontrado” | Falta el binario | Instalalo desde Ajustes → Herramientas de descarga |

Más casos en [problemas.md](problemas.md).
