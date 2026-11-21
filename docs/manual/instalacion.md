# Instalación y primer arranque

Sakura Music 2.0 es una app de escritorio Tauri. La compilás con Node + Rust y
guardás todo lo suyo en la carpeta de datos del usuario
(`AppData/Local/com.sakura.music` en Windows). No necesitás Python.

## Lo que necesitás

| Requisito | Para qué | Cómo se resuelve |
|---|---|---|
| **Node.js 20+** | Correr Vite y Tauri CLI | [nodejs.org](https://nodejs.org/) |
| **Rust estable** | Compilar el backend | [rustup.rs](https://rustup.rs/) |
| **yt-dlp** | Buscar y descargar de YouTube | En el `PATH`, o en `bin/` de la carpeta de datos |
| **ffmpeg** | Convertir a FLAC/MP3/M4A/Opus | En el `PATH`, winget o `bin/` |
| **WebView2** | Mostrar la interfaz | Preinstalado en Windows 10/11 |

La app **detecta** yt-dlp y ffmpeg y te informa dónde los encontró (Cola y
Ajustes). Sin yt-dlp no puede buscar ni descargar.

Si no los tiene, abra **Ajustes → Herramientas de descarga** y seleccione **Instalar**:
Sakura baja la versión fijada, verifica su hash SHA256 y la guarda en `bin/`.
No reemplaza un binario que ya estés usando. Si preferís instalarlos usted:

**Windows (con winget):**

```powershell
winget install yt-dlp.yt-dlp
winget install Gyan.FFmpeg
```

**Manual:** descargue los binarios, descomprimilos en la carpeta de datos
(`%LOCALAPPDATA%\com.sakura.music\bin\`) y reinicie la app.

## Instalar y abrir

Desde la raíz del repositorio:

```powershell
npm install
npm run tauri dev
```

En Windows también puede hacer doble clic en **`iniciar_sakura.bat`**: hace
exactamente `npm run tauri dev`.

Para tener la app instalada (instalador .exe / .msi):

```powershell
npm run tauri build
```

## Dónde quedan sus datos

Por defecto, en Windows:

```text
%LOCALAPPDATA%\com.sakura.music\
  library.sqlite3        ← índice local de la biblioteca (SQLite + FTS5)
  library_cache.json     ← caché antigua; se importa una vez si existe
  covers\                ← carátulas con extensión real
  trash\                 ← borrados recientes, recuperables con Deshacer
  bin\                   ← yt-dlp / ffmpeg opcionales
```

Su música **no vive allí**: vive en la carpeta que seleccionó como biblioteca
(por defecto, la carpeta Música de Windows). Las preferencias (tema, vista,
carpeta actual, favoritos) viven en el almacenamiento del navegador
(`localStorage`, claves `sakura_*`), no en archivos sueltos.

La caché anterior `library_cache.json` se conserva después de importarla. Para
reconstruir el índice nuevo, usá **Ajustes → Limpiar Caché** y luego escanee de
nuevo. No perdés tags ni audio.

## Primer recorrido

1. Abrí la app: arranca en **Biblioteca** con la última carpeta visitada.
2. Si está vacía, haga clic en **Escanear Carpeta de Música** o
   **Escanear Música de Windows** y seleccione su colección.
3. Andá a **Buscar**, escribí un artista o pegue un enlace de YouTube y
   descargue su primera canción en el formato que prefiera.
4. En **Cola** vea el porcentaje, velocidad y ETA; al terminar, la canción
   aparece sola en Biblioteca.
5. En **Ajustes** seleccione uno de los 14 temas y ajuste los efectos visuales; en
   **Ajustes → Sistema** puede verificar la base, vaciar la papelera y buscar

Los siguientes pasos están en [buscar-y-descargar.md](buscar-y-descargar.md) y
[biblioteca.md](biblioteca.md).

## Desinstalar

1. Desinstalá la app como cualquier programa de Windows (Panel de control o
   Configuración → Aplicaciones).
2. Si desea, elimine la carpeta de datos
   (`%LOCALAPPDATA%\com.sakura.music`): perderá caché y carátulas, **no su
   música**, que está en su biblioteca.

## Si algo no arranca

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `node` no reconocido | Node no instalado o no en `PATH` | Instalá Node 20+ y reabrí la terminal |
| `cargo` no reconocido | Rust no instalado o no en `PATH` | Instalá rustup y reabrí la terminal |
| La ventana no aparece | Vite no arrancó | Corré `npm run tauri dev` desde terminal y lea el error |
| “yt-dlp no encontrado” | Falta el binario | Instalalo desde Ajustes → Herramientas de descarga |
| “ffmpeg no encontrado” | Falta el binario | Instalalo desde Ajustes → Herramientas de descarga |

Más casos en [problemas.md](problemas.md).
