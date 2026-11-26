# Sistema de diseño

Sakura Music usa **19 temas, todos propios**: ningún tema oficial es genérico.
Cada uno redefine la estructura completa con `ThemeLibrary`/`ThemeHome`/
`ThemeNav`. El tema por defecto es **Estudio** (`space`), una consola de mezcla
con medidores VU. La vista genérica `LibraryTab`/`ZenTopNav` sigue en el código
sólo como fallback para temas importados; ningún tema oficial la usa. Prototipos
de referencia en `docs/prototipos/` (históricos) y `docs/temas/` (propuestas). La
fuente de verdad son `tailwind.config.js` y `App.css`.

## Capas de tokens

Los tokens se organizan de lo concreto a lo semántico. La regla es que los
componentes consuman las capas 2 a 4, nunca un hex suelto:

| Capa | Qué contiene | Ejemplo en el proyecto |
|---|---|---|
| 1. Literales | Colores, fuentes y tamaños crudos | `--m3-surface`, `--font-display`, `16px` |
| 2. Semánticos | Significado dentro del tema | `--accent-*`, `--theme-ink`, `--tema-linea` |
| 3. De UI | Superficies y estados compartidos | `--loto-hover`, `--loto-activo`, `--loto-suave` |
| 4. De componente | Decisiones locales de un componente | `--loto-rollo-borde` |

Los tokens de la capa 3 **no se escriben a mano**: se derivan en OKLCH a partir
del acento de cada tema con `npm run paletas`, que genera
`src/themes/styles/tonos-oklch.css` (archivo generado, no editar). Así los
estados de hover, activo y superficie mantienen una relación perceptual uniforme entre
los cinco temas nuevos, en vez de depender de valores elegidos uno por uno.


## Tipografía de exhibición

Además de Plus Jakarta Sans, JetBrains Mono y Cormorant Garamond, los cinco
temas nuevos usan **Fraunces Variable** (`public/fonts/fraunces-latin-variable.woff2`,
OFL-1.1) en sus titulares. Es una fuente variable con ejes `wght` (100–900),
`opsz` (9–144), `SOFT` (0–100) y `WONK` (0–1); se sirve desde la propia app, sin
red, y se carga bajo demanda. La declaración y los selectores viven en
`src/styles/fuentes.css`.

## Temas disponibles

### Propios (19)

| Id | Nombre | Personalidad |
|---|---|---|
| `space` | Estudio | **Consola de mezcla y medidores VU**: grafito `#15181a`, panel `#1d2226`, ámbar `#f0a23c`, verde LED `#7ee081`, texto `#f2ede6` y tipografía monospace (por defecto) |
| `sumie` | Sumi-e | **Pergamino**: nav kanji flotante a la derecha, columna central, dock circular y ensō sobre tinta |
| `byobu` | Byōbu | **Díptico editorial**: panel izquierdo de álbum con kanji monumental y reproductor, panel derecho con la lista de pistas |
| `shoji` | Shōji | Paneles de papel translúcido, líneas de madera, luz difusa |
| `origami` | Origami | Pliegues geométricos, superficies angulares, paleta de papel plegado |
| `swiss` | Swiss | Retícula estricta, tipografía grotesca, blanco/negro con un acento |
| `sumiink` | Sumi Ink | Tinta sumi sobre papel crudo, alto contraste monocromo |
| `moonlit` | Moonlit | Lunar plateado, azul profundo y reflexiones suaves |
| `ledger` | Ledger | Papel contable, rayas y números, estética de registro |
| `shonen` | Shōnen | Viñetas, rojo y negro, dinamismo de cómic |
| `ghost` | Fantasmas | Neo-brutalismo nocturno, bordes duros y neón ácido |
| `samurai` | Samurái | Lacado rojo/negro, textura de armadura, serif marcada |
| `kawaii` | Kawaii | Pastel, redondeado extremo y detalles playful |
| `manga` | Manga | **Revista de viñetas**: papel `#fbfaf7`, tinta `#101010`, tramado screentone y un solo acento rojo `#d62828` |
| `sakura` | Sakura | **Jardín hanami**: foto real del cerezo, medallón de cinco pétalos, rama y flores en zigzag |
| `loto` | Loto Imperial | **Tríptico de seda**: rollos con varillas doradas, aletas laterales y sellos |
| `ukiyo` | La Gran Ola | **Rollo lateral de estampas**: láminas apaisadas con ola SVG y sello rojo |
| `vinilo` | Tocadiscos 3D | **Estantería analógica**: fundas inclinadas, discos que asoman y plato activo |
| `karesansui` | Karesansui | **Jardín zen**: arena rastrillada, piedras de paso orgánicas y roca mayor |

Cada tema propio fija `data-theme="space"` y usa `data-skin={tema}` con
`ThemeLibrary`, `ThemeHome` y `ThemeNav` propios: cabecera, Buscar, Cola,
ajustes, diálogos y transiciones propios, además de iconos y splash propios.
**Ninguno usa las 9 vistas genéricas**: `ThemeLibrary.tsx` dibuja una biblioteca
propia (rack de canales con fader y VU en Estudio, hojas washi, díptico,
retícula, etc.). `LibraryTab`/`ZenTopNav` se conservan como fallback para temas
importados, que sí pueden caer en las 9 vistas con `VirtualizedGrid` y
`content-visibility` condicional pasado el umbral de 60 pistas.

Todos los temas definen `--m3-*`, `--space-*`, `--accent-*` y `--theme-*` en su
bloque `.app-shell[data-skin='id']`, y además reescriben la estructura:
disposición de la navegación (banda horizontal, rail de iconos o lateral),
forma de las tarjetas, bordes del reproductor, tipografía de las pestañas y
sistema de sombras. Los bloques de identidad están al final de `App.css`, bajo
el encabezado `IDENTIDAD POR TEMA`.

### Estructura

| Familia | Cantidad | Biblioteca | Navegación | Superficies |
|---|---|---|---|---|
| Propios (`space`, `sumie`, `byobu`, `shoji`, `origami`, `swiss`, `sumiink`, `moonlit`, `ledger`, `shonen`, `ghost`, `samurai`, `kawaii`, `manga`, `sakura`, `loto`, `ukiyo`, `vinilo`, `karesansui`) | 19 | `ThemeLibrary` propio | `ThemeHome` + `ThemeNav` propios | `data-skin={tema}`, estilos, iconos y splash propios |
| Fallback (temas importados) | — | `LibraryTab` con 9 vistas + `VirtualizedGrid` | `ZenTopNav` | Tokens + `App.css`; ningún tema oficial la usa |

### Notas visuales de Estudio

`space` dejó de ser el tema genérico M3 Zen: hoy es **Estudio**, "Consola de
mezcla y medidores VU", con identidad estructural completa. El Home arma una
**consola de mezcla** con la marca `EST·01`, un medidor VU y un rack de canales
con faders; la biblioteca muestra cada canal con su fader y su VU. La navegación
es negra con el glifo ◎ y acento ámbar `#f0a23c`. La paleta es grafito
`#15181a`, panel `#1d2226`, ámbar `#f0a23c`, verde LED `#7ee081` y texto
`#f2ede6`, con tipografía monospace. Estudio tiene estilo propio en Buscar,
Cola, Ajustes, panel "Ahora suena", playlists, paleta ⌘K, estadísticas, modales
de metadatos, splash y la transición `t-estudio`. Conserva `data-theme="space"`
fijo y suma `data-skin="space"`; en la galería figura con badge **PROPIO**.

### Notas visuales de Manga

`manga` fue el último tema propio incorporado (después se rediseñó el ex
genérico `space` como Estudio) y se aparta de `shonen` (que es naranja y
de ritmo de cómic) por una paleta estricta: papel `#fbfaf7`, tinta `#101010` y
un único acento rojo `#d62828`, con tramado screentone como textura de fondo.
El `ThemeHome` arma una **portada de revista**: número `第 01 話`, globo de
diálogo, sello 開 y una línea de tiempo. El `ThemeLibrary` dibuja **páginas de
viñetas**: panel con halftone, globo con el título de la pista, tag **GO!** y
portadas en blanco y negro (`filter: grayscale(1)`).

La identidad se completa con cabecera negra y glifo 漫, barra de navegación
negra con kanji sobre cuadrado rojo, estilo propio en Ajustes, panel "Ahora
suena", playlists y paleta ⌘K con tokens `--cmd-*`, modales de metadatos,
splash y la transición de página `t-manga`. Mantiene `data-theme="space"` fijo
y aplica `data-skin="manga"` para no romper los selectores históricos; también
es arquetipo disponible en `ThemeGeneratorModal`/`customThemes.ts`.

## Tipografía

Plus Jakarta Sans para la interfaz, JetBrains Mono para datos técnicos y Cormorant Garamond para tipografía display. Las tres se sirven desde `public/fonts/`. En Sumi-e, Cormorant Garamond encabeza y Plus Jakarta Sans queda sólo para texto de lectura.

| Token | Tamaño | Uso |
|---|---|---|
| `text-2xs` | 12 px | Mínimo legible: ayuda, metadatos, contadores |
| `text-xs` | 13 px | Etiquetas secundarias |
| `text-sm` | 14 px | Texto base de la app |
| `text-base` | 16 px | Títulos de sección |
| `text-lg` | 20 px | Encabezados |
| `text-xl` | 24 px | Títulos grandes |

**Regla**: no se usan tamaños arbitrarios (`text-[10px]`). Si algo parece necesitar menos de 12 px, probablemente sobre información en esa vista.

## Color

- **Acento**: `--accent-200` … `--accent-950`, en canal RGB para soportar opacidad (`accent-500/20`).
- **Neutros**: `--ink-100` … `--ink-600`, también en RGB. Se usan como `text-ink-400`, `bg-ink-200`, `border-ink-300`.
- **Superficies M3**: `--m3-surface`, `--m3-surface-card`, `--m3-on-surface` y `--m3-primary`, más `--theme-*` para cada tema, bajo `[data-skin='id']`.

No se usan `gray-*` de Tailwind: los neutros salen de `ink-*` para que un cambio en `App.css` recoloree toda la app.

### Paleta por tema

La paleta de cada tema es un conjunto de variables, no una lista de clases: los
19 temas propios pueden cambiar fondo, tipografía, borde y sombra además del
acento. Por eso las superficies se leen siempre desde `--m3-*` y `--theme-*`, y
los componentes usan `accent-*` para seguir el tema sin duplicar estilos. La
paleta de comandos (`CommandPalette`, ⌘K) y los diálogos se estilizan con esos
mismos tokens, de modo que cambiar de tema recoloréa también la navegación por
teclado.

## Movimiento

| Token | Duración | Uso |
|---|---|---|
| `duration-fast` | 140 ms | Hover, focus, microinteracciones |
| `duration-base` | 200 ms | Cambios de estado, barras de progreso |
| `duration-slow` | 320 ms | Transiciones de vista y modales |

Siempre se respeta `prefers-reduced-motion`. El glifo del splash hace un
handoff continuo al logo de la navegación con
`view-transition-name: sakura-glifo`, aplicable a los 19 temas (Estudio usa
`t-estudio` y Manga la transición de página `t-manga`).

## Forma y elevación

- `rounded-xl` y `rounded-2xl` son los valores por defecto; `rounded-3xl` para tarjetas grandes y `rounded-full` para píldoras.
- Las tarjetas usan `.glass-card`, con borde sutil y una sola sombra suave. No se apilan blur ni resplandores.

## Panel Ahora suena

`NowPlayingPanel.tsx` organiza la información en cuatro pestañas: **Detalles**,
**Letras**, **Álbum** y **Artista**. La pestaña Letras resalta la línea activa
del `.lrc` y hace autoscroll con `currentTime`; las de Álbum y Artista
aprovechan la ficha del catálogo. El panel respeta la superficie y la tipografía
del tema activo (en los temas propios, su `ThemeHome`/`ThemeNav` provee la
identidad) y usa `asset:` + Blob URL para no bloquear el archivo.

## Playlists

`PlaylistsPanel.tsx` vive en la pestaña **Listas** (sexta pestaña de `AppTab`,
también accesible desde ⌘K). Cada lista se crea, renombra, borra y reordena con
las flechas; las pistas se cargan desde la biblioteca. Visualmente usa las
tarjetas y los bordes del tema: los arquetipos Estudio, Swiss, Shōnen, Kawaii,
Fantasmas, Luna, Samurái y Manga tienen variantes explícitas y el resto hereda
las variables del tema.

## Estados vacíos

Todo estado vacío usa el componente `EmptyState.tsx`: una marca (sakura, descarga o búsqueda), un título, una descripción y **una acción concreta**. No se dejan carteles de texto suelto.

## Accesibilidad

- Foco siempre visible: la regla `:focus-visible` de `App.css` es la red de seguridad.
- Los controles de icono llevan `aria-label`; los grupos de pestañas y menús, sus roles ARIA.
- Contraste mínimo AA para texto normal; `text-ink-400` se reserva para texto auxiliar sobre superficies claras.

## Antes de hacer un cambio visual

1. ¿Usa un token existente? Si no, agregalo aquí y en `App.css`/`tailwind.config.js`.
2. ¿Respeta `prefers-reduced-motion`?
3. ¿El estado vacío tiene acción?
4. ¿El foco con teclado sigue siendo visible?


**Manga en Buscar/Cola/editor:** las tres vistas comparten la mismas reglas que
la biblioteca (papel `#fbfaf7`, tinta `#101010`, acento `#d62828`, screentone).
El editor fuerza sus superficies internas porque usa clases Tailwind propias.


**Biblioteca de Estudio:** mesa de mezcla con canales verticales, perillas EQ,
faders con escala dB, VU segmentado, pan, transporte y bus master. Es la vista
más detallada del sistema y rompe con el patrón de filas o grillas.
