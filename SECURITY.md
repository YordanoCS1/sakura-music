# Política de seguridad

Sakura Music es una app de escritorio que lee la biblioteca musical del usuario, escribe tags en esos archivos y lanza procesos externos (`yt-dlp`, `ffmpeg`). Tomamos eso en serio.

## Versiones con soporte

| Versión | Soporte |
|---|---|
| 2.0.0 (actual, sin publicar como versión oficial) | ✅ |
| 1.x (Python/PySide6, en `legacy_python/`) | ❌ Referencia histórica, sin soporte |

## Cómo reportar una vulnerabilidad

**No abras un issue público.** Mandá el detalle a `sakura@music.app` (el mismo User-Agent identificado que usa el catálogo) con:

- módulo afectado (`biblioteca`, `descargas`, `metadatos`, `IPC`, `UI`),
- pasos para reproducirlo,
- versión de la app y sistema operativo,
- impacto estimado y, si tiene, una prueba de concepto.

Acusamos recibo en un plazo de **7 días** y procuramos publicar una corrección en **30 días** para problemas confirmados en la versión con soporte. Si el caso merece más tiempo por coordinar una divulgación, lo avisamos.

## Qué consideramos dentro del alcance

- Ejecución de código arbitrario vía archivos de audio, carátulas o respuestas de APIs.
- Escalada del scope del protocolo `asset:` para leer archivos fuera de las carpetas autorizadas.
- Path traversal en el borrado de pistas o en la carpeta de salida de descargas.
- Inyección de argumentos en los subprocessos.
- Exfiltración de datos de la biblioteca.
- Abuso del host de letras (`https://lrclib.net`) o inyección de contenido en un `.lrc`.

Fuera de alcance: el contenido de las canciones descargadas, las políticas de los servicios externos (YouTube, iTunes, Deezer, MusicBrainz) y las vulnerabilidades de `yt-dlp`/`ffmpeg` que deban reportarse a esos proyectos.

## Medidas ya implementadas

- **CSP acotada** en `tauri.conf.json`: sin `unsafe-eval`, `object-src 'none'`, `frame-ancestors 'none'`; `connect-src` solo a los hosts necesarios.
- **Capabilities mínimas**: `core:default`, window y dialog. No se conceden permisos amplios de `fs`, `shell` ni `http`.
- **Scope de assets** restringido a `$AUDIO`, `$APPLOCALDATA` y `$TEMP`, ampliado en runtime solo para las carpetas de la biblioteca.
- **Validación de rutas** antes de borrar: `symlink_metadata` + `canonicalize` + comprobación de que el archivo quede dentro de la carpeta raíz. El mismo criterio se aplica al ampliar el scope y **antes de escribir tags**: se valida la ruta canónica y que la pista pertenezca a la biblioteca activa; una ruta fuera de la raíz se rechaza y el fallo se informa al frontend.
- **Validación de parámetros IPC** en `src-tauri/src/validacion.rs`: longitudes máximas, ausencia de bytes NUL y de caracteres de control en los argumentos que llegan del frontend.
- **Registro local** en `<datos>/sakura.log` para avisos que antes se perdían en una consola inexistente; no guarda datos personales ni rutas de búsquedas, y los tokens quedan **redactados** antes de escribirse.
- **Subprocessos sin shell**: `Command` con argumentos por `.arg()`, sin interpolación.
- **Herramientas verificadas**: si el usuario instala yt-dlp o FFmpeg desde Ajustes, se descargan de URLs fijadas y se valida su SHA256 antes de escribir nada; nunca se pisa un binario existente.
- **Sin secretos en el código** ni rutas hardcodeadas de usuarios. LRCLIB no requiere clave; el User-Agent va en `catalog.rs`.
- **Letras validadas**: los archivos `.lrc` se escriben con el mismo scope canónico que los tags y el frontend convierte las letras planas a formato LRC antes de guardarlas.

## Por qué no hay login

Sakura Music es **local-first**: lee y escribe archivos que están en su equipo y no tiene cuenta, usuario ni servidor propio. Un login local sería **teatro de seguridad**: cualquiera con acceso al equipo podría eludirlo, y no protegería nada de lo que la app realmente maneja. Tendría sentido solo con **sincronización entre dispositivos**, y ahí sí correspondería almacenar credenciales con un KDF como **Argon2id**. Hoy no hay login y **no está planeado**.

## Para releases

Antes de publicar: `npm audit`, `cargo audit` y revisión de dependencias. El CI de GitHub Actions corre la matriz Windows/macOS/Linux. La app no tiene canal de actualizaciones automáticas: cada versión se distribuye por separado y el usuario decide cuándo instalarla.
