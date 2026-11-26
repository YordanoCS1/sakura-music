# Funciones nuevas (2026)

Resumen de los cambios recientes. El detalle técnico y el porqué están en los
ADR [0013](adr/0013-playlists-persistentes.md) a
[0020](adr/0020-paleta-de-comandos.md); los formatos persistidos están en
[data-formats.md](data-formats.md) y el contrato IPC en
[ipc-contract.md](ipc-contract.md).

## Identidad visual y presentación

El fondo se tiñe con los colores dominantes de la carátula (`cover-glow-layer`) y transiciona suavemente al cambiar de pista. Cada tema tiene una animación de entrada propia, desactivada con `prefers-reduced-motion`. La barra de título muestra una insignia con el glifo del tema activo. Las microinteracciones usan `sonidoUI()` al cambiar de pestaña, marcar favorito o completar una descarga.

Doble clic en la portada del reproductor abre el **modo presentación**: pantalla completa con la carátula y las letras LRC sincronizadas; Escape la cierra.

## Atajos y biblioteca portátil

Ajustes → Sistema permite **reasignar atajos** (paleta, navegación, reproducción, favorito); se guardan en `localStorage` bajo `sakura_atajos`. Las descargas terminadas muestran un toast con la acción **Ver biblioteca**.

La tarjeta **Biblioteca portátil** exporta un ZIP con `library.sqlite3` (copia `VACUUM INTO`), las carátulas y `preferencias.json`, y permite importarlo: se valida `PRAGMA integrity_check` antes de reemplazar la base.

## Playlists persistentes

Pestaña **Listas** en la navegación (también accesible desde ⌘K). Las listas viven en las tablas `playlists` y `playlist_tracks` de SQLite, con `ON DELETE CASCADE`. Se pueden crear, renombrar, borrar, cargar pistas desde la biblioteca, quitarlas y reordenar con las flechas. Cada tema tiene su propio estilo de panel; los arquetipos Swiss, Shōnen, Kawaii, Fantasmas, Luna y Samurái tienen variantes explícitas, el resto hereda las variables del tema.

## Deshacer borrados

`delete_library_track` ya no borra el archivo: lo mueve a `<datos>/trash` y guarda los datos de la pista en `deleted_tracks`. El frontend muestra un toast con **Deshacer** durante 9 segundos; al tocarlo se restauran el archivo y la fila de SQLite. Ajustes → Sistema tiene el contador de la papelera y **Vaciar papelera** para el borrado definitivo.

## Letras sincronizadas

La pestaña **Letras** del panel “Ahora suena” busca un `.lrc` al lado del audio (también reconoce `.LRC`). El parser acepta varios timestamps por línea y metadatos `[ar:...]`. La línea activa se resalta y hace autoscroll con `currentTime`.

## Tema Manga

`manga` ("Viñetas, tinta y screentone") es el decimotercer tema propio y el
decimoséptimo en total. Tiene identidad estructural completa: el Inicio es una
portada de revista (`第 01 話`, globo de diálogo, sello 開 y línea de tiempo) y
la biblioteca son páginas de viñetas con panel halftone, globo con el título,
tag **GO!** y carátulas en blanco y negro. La cabecera es negra con el glifo 漫,
la navegación lleva kanji sobre cuadrado rojo y el tema tiene estilo propio en
Ajustes, panel "Ahora suena", playlists, paleta ⌘K, modales de metadatos, splash
y transición de página `t-manga`. Paleta: papel `#fbfaf7`, tinta `#101010` y
acento rojo `#d62828`, con tramado screentone. Fija `data-theme="space"` y usa
`data-skin="manga"`, y está disponible como arquetipo en
`ThemeGeneratorModal`/`customThemes.ts`. Sumó los snapshots
`manga-home-win32.png` y `manga-library-win32.png`; el loop de
`visuals.spec.ts` cubre hoy 8 temas, con `space-home-win32.png` y
`space-library-win32.png` para Estudio.

## Tema Estudio

`space` dejó de ser el tema genérico M3 Zen y pasó a ser **Estudio** ("Consola
de mezcla y medidores VU"), con identidad estructural completa: Home tipo
consola de mezcla con `EST·01`, medidor VU y rack de canales con faders;
biblioteca en canales con fader y VU; navegación negra con el glifo ◎ y acento
ámbar `#f0a23c`. Tiene estilo propio en Buscar, Cola, Ajustes, panel "Ahora
suena", playlists, paleta ⌘K, estadísticas, modales de metadatos, splash y la
transición `t-estudio`. Paleta: grafito `#15181a`, panel `#1d2226`, ámbar
`#f0a23c`, verde LED `#7ee081` y texto `#f2ede6`, con tipografía monospace.
Mantiene `data-theme="space"` fijo y aplica también `data-skin="space"`. Sumó
los snapshots `space-home-win32.png` y `space-library-win32.png` y el badge
**PROPIO** en la galería. Los 19 temas oficiales son propios: `LibraryTab` y
`ZenTopNav` quedan como fallback para temas importados.

## Cinco temas nuevos con biblioteca propia

Se sumaron `sakura` (anillos de crecimiento por canción con foto real del
cerezo y medallón de cinco pétalos), `loto` (tríptico de rollos de seda con
varillas doradas), `ukiyo` (rollo lateral de estampas apaisadas con ola
SVG), `vinilo` (estantería de fundas con discos que asoman y plato activo)
y `karesansui` (arena rastrillada con piedras de paso). Ninguno reutiliza la
grilla de tarjetas de otro tema: comparten el mecanismo `data-skin` pero
tienen Home y biblioteca estructuralmente distintos. El detalle está en
[racional-de-decisiones.md](racional-de-decisiones.md#5-bibliotecas-con-estructura-propia-no-un-cambio-de-color).

## Paleta de comandos

`Ctrl+K` / `⌘K` abre una paleta para navegar, cambiar tema, controlar la reproducción y buscar pistas. ↑↓ navega, ↵ ejecuta, esc cierra. Está estilizada con el tema activo, incluido Manga.

## CI y benchmarking

- `.github/workflows/ci.yml` corre `npm run pipeline` en cada push y PR (Windows + Node 20 + Rust stable + Chromium).
- `scripts/benchmark_scan.mjs [cantidad]` genera MP3 mínimos y mide el escaneo real del CLI en release. En esta máquina, **10.000 pistas tardaron ~12,6 s** en el primer escaneo (el CLI ya imprime los milisegundos).

## Pruebas

Se agregaron tests de integración para la migración `user_version` con backup automático sobre una base en disco, del parser LRC, de las consultas de playlists y del toast de deshacer. Los snapshots visuales se actualizaron por la sexta pestaña de navegación y por el tema Manga.


## Buscador de letras online

La pestaña Letras del panel “Ahora suena” busca en **LRCLIB** con el mismo
patrón del editor de metadatos: Rust consulta el servicio (sin clave, User-Agent
identificado), el frontend muestra resultados con badge SINC/PLANA y *Aplicar*
guarda el `.lrc` al lado de la pista con escritura atómica. No se agregó caché:
el `.lrc` local ya es la persistencia. Ver [ADR 0021](adr/0021-busqueda-de-letras-online.md).


## Buscar y Cola en Manga

El tema Manga extiende su identidad a las pestañas **Buscar** y **Cola** y al
**editor de metadatos**: cabeceras de capítulo, viñetas screentone, botones de
borde grueso con sombra roja y portadas en color. El editor agrega una cinta
`第 01 話 · EDICIÓN DE METADATOS` y fuerza superficies blancas sobre el diseño
base.


## Galería de temas y estados de carga

La **galería de temas** muestra las 14 apariencias · 14 con identidad propia como
miniaturas con preview en vivo y aplicación directa (todas con badge **PROPIO**).
Los **estados de carga** tienen 14 variantes (un
indicador distinto por tema) y aparecen en escaneo, búsqueda online, letras y
guardado de metadatos. Ver [contraste.md](contraste.md) para la auditoría AA.


## Vinyl, iconos animados y estadísticas

La portada del reproductor gira mientras suena (se detiene al pausar) con un
estilo por tema. Los glifos de la navegación tienen animación CSS propia:
chispa, niebla, pétalo, tinta o tramado según el tema, y se desactivan con
`prefers-reduced-motion`. La nueva pestaña **Datos** resume la biblioteca con
duración, géneros, artistas, décadas, formatos y portadas, con gráficos que
cambian de lenguaje visual en Estudio, Swiss, Ledger y Manga.
