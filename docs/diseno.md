# Sistema de diseño

Sakura Music usa **14 temas**: 1 genérico y 13 propios. El genérico usa
la escala de tokens y las 9 vistas de `LibraryTab.tsx`; los 13 propios redefinen
la estructura completa con `ThemeLibrary`/`ThemeHome`/`ThemeNav`. Prototipos de
referencia en `docs/prototipos/` (históricos) y `docs/temas/` (propuestas). La
fuente de verdad son `tailwind.config.js` y `App.css`.

## Temas disponibles

### Genérico (1)

| Id | Nombre | Personalidad |
|---|---|---|
| `space` | M3 Zen | Superficies marfil, acento rosa sakura, redondeado suave (por defecto) |

Este fija `data-theme="space"` y usa `LibraryTab.tsx` con sus **9
vistas** (Carpetas, Cuadrícula, Lista, Álbumes, Pared, CDs, 3D, Luz y
Portadas), con `VirtualizedGrid` y `content-visibility` condicional cuando la
biblioteca pasa de 60 pistas.

### Propios (13)

| Id | Nombre | Personalidad |
|---|---|---|
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

Cada tema propio fija `data-theme="space"` y usa `data-skin={tema}` con
`ThemeLibrary`, `ThemeHome` y `ThemeNav` propios: cabecera, Buscar, Cola,
ajustes, diálogos y transiciones propios, además de iconos y splash propios.
**No usan las 9 vistas genéricas**: `ThemeLibrary.tsx` dibuja una biblioteca
propia (hojas washi, díptico, retícula, etc.).

Todos los temas definen `--m3-*`, `--space-*`, `--accent-*` y `--theme-*` en su
bloque `.app-shell[data-skin='id']`, y además reescriben la estructura:
disposición de la navegación (banda horizontal, rail de iconos o lateral),
forma de las tarjetas, bordes del reproductor, tipografía de las pestañas y
sistema de sombras. Los bloques de identidad están al final de `App.css`, bajo
el encabezado `IDENTIDAD POR TEMA`.

### Estructura

| Familia | Cantidad | Biblioteca | Navegación | Superficies |
|---|---|---|---|---|
| Genérico (`space`) | 1 | `LibraryTab` con 9 vistas + `VirtualizedGrid` | `ZenTopNav` | Tokens + `App.css` |
| Propios (`sumie`, `byobu`, `shoji`, `origami`, `swiss`, `sumiink`, `moonlit`, `ledger`, `shonen`, `ghost`, `samurai`, `kawaii`, `manga`) | 13 | `ThemeLibrary` propio | `ThemeHome` + `ThemeNav` propios | `data-skin={tema}`, estilos, iconos y splash propios |

### Notas visuales de Manga

`manga` es el tema propio más nuevo y se aparta de `shonen` (que es naranja y
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
13 temas propios pueden cambiar fondo, tipografía, borde y sombra además del
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
`view-transition-name: sakura-glifo`, aplicable a los 14 temas (Manga usa
además la transición de página `t-manga`).

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
tarjetas y los bordes del tema: los arquetipos Swiss, Shōnen, Kawaii,
Fantasmas, Luna, Samurái y Manga tienen variantes explícitas y el resto hereda
las variables del tema.

## Estados vacíos

Todo estado vacío usa el componente `EmptyState.tsx`: una marca (sakura, descarga o búsqueda), un título, una descripción y **una acción concreta**. No se dejan carteles de texto suelto.

## Accesibilidad

- Foco siempre visible: la regla `:focus-visible` de `App.css` es la red de seguridad.
- Los controles de icono llevan `aria-label`; los grupos de pestañas y menús, sus roles ARIA.
- Contraste mínimo AA para texto normal; `text-ink-400` se reserva para texto auxiliar sobre superficies claras.

## Antes de hacer un cambio visual

1. ¿Usa un token existente? Si no, agregalo acá y en `App.css`/`tailwind.config.js`.
2. ¿Respeta `prefers-reduced-motion`?
3. ¿El estado vacío tiene acción?
4. ¿El foco con teclado sigue siendo visible?


**Manga en Buscar/Cola/editor:** las tres vistas comparten la mismas reglas que
la biblioteca (papel `#fbfaf7`, tinta `#101010`, acento `#d62828`, screentone).
El editor fuerza sus superficies internas porque usa clases Tailwind propias.
