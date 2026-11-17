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
- impacto estimado y, si tenés, una probación de concepto.

Acusamos recibo en un plazo de **7 días** y procuramos publicar una corrección en **30 días** para problemas confirmados en la versión con soporte. Si el caso merece más tiempo por coordinar una divulgación, lo avisamos.

## Qué consideramos dentro del alcance

- Ejecución de código arbitrario vía archivos de audio, carátulas o respuestas de APIs.
- Escalada del scope del protocolo `asset:` para leer archivos fuera de las carpetas autorizadas.
- Path traversal en el borrado de pistas o en la carpeta de salida de descargas.
- Inyección de argumentos en los subprocessos.
- Exfiltración de datos de la biblioteca.

Fuera de alcance: el contenido de las canciones descargadas, las políticas de los servicios externos (YouTube, iTunes, Deezer, MusicBrainz) y las vulnerabilidades de `yt-dlp`/`ffmpeg` que deban reportarse a esos proyectos.

## Medidas ya implementadas

- **CSP acotada** en `tauri.conf.json`: sin `unsafe-eval`, `object-src 'none'`, `frame-ancestors 'none'`; `connect-src` solo a los hosts necesarios.
- **Capabilities mínimas**: `core:default`, window y dialog. No se conceden permisos amplios de `fs`, `shell` ni `http`.
- **Scope de assets** restringido a `$AUDIO`, `$APPLOCALDATA` y `$TEMP`, ampliado en runtime solo para las carpetas de la biblioteca.
- **Validación de rutas** antes de borrar: `symlink_metadata` + `canonicalize` + comprobación de que el archivo quede dentro de la carpeta raíz. El mismo criterio se aplica al ampliar el scope: una ruta canónica fuera de la raíz activa se rechaza y el fallo se informa al frontend.
- **Registro local** en `<datos>/sakura.log` para avisos que antes se perdían en una consola inexistente; no guarda datos personales ni rutas de búsquedas.
- **Subprocessos sin shell**: `Command` con argumentos por `.arg()`, sin interpolación.
- **Sin secretos en el código** ni rutas hardcodeadas de usuarios.

## Para releases

Antes de publicar: `npm audit`, `cargo audit`, revisión de dependencias y firma de los instaladores. La app no incluye actualizaciones automáticas todavía, así que cada versión debe distribuirse por un canal verificable.
