# Apariencia

Sakura Music 2.0 ofrece **14 temas visuales, todos propios con estructura
completa**: ningún tema oficial es genérico. Elegí el que quieras en **Ajustes →
Diseño Visual**; el cambio es inmediato y se recuerda al reabrir la app.

## El tema por defecto: Estudio

| Tema | Cómo se ve |
|---|---|
| **Estudio** (`space`) | **Consola de mezcla y medidores VU**: grafito, ámbar y verde LED sobre tipografía monospace. Antes se llamaba M3 Zen y era el tema genérico; hoy tiene identidad propia. |

## Los otros 13 temas propios

Cada uno de estos trece tiene **Home, biblioteca, cabecera, Buscar, Cola,
ajustes, diálogos y transiciones propios**, igual que Estudio: no se limitan a
recolorear la interfaz. El selector base queda fijo en `data-theme='space'` y cada tema se
aplica con `data-skin` (en Estudio, `data-skin="space"`). `LibraryTab` y
`ZenTopNav` siguen en el código como fallback para temas importados.

| Tema | Cómo se ve |
|---|---|
| **Sumi-e** | Pergamino flotante, papel crudo, tinta carbón y bermellón, con tipografía serif. |
| **Byōbu** | Pantalla dividida: panel de tinta con kanji monumental y reproductor, panel editorial de contenido. |
| **Shoji** | Biombo de papel y madera: paneles translúcidos con marcos de listones. |
| **Origami** | Papel plegado rosa, con pliegues y sombras geométricas. |
| **Swiss** | Grid estricto y Helvetica: tipografía grande, blanco y negro, acento rojo. |
| **Sumi Ink** | Pincelada blanca sobre negro, alto contraste y tinta expresiva. |
| **Moonlit** | Noche azul y luna, con superficies frías y resplandor suave. |
| **Ledger** | Libro mayor y sellos rojos: tablas, rayas y aspecto de papel contable. |
| **Shōnen** | Manga, energía y viñetas: ritmo de cómic, amarillo y negro. |
| **Fantasmas** | Espectros y niebla azul, con transparencias y aire frío. |
| **Samurái** | Lacado rojo, acero y oro, con líneas de armadura y sellos. |
| **Kawaii** | Pastel, ternura y caritas, con formas redondeadas y colores dulces. |
| **Manga** | Viñetas, tinta y screentone. Papel `#fbfaf7`, tinta `#101010` y un acento rojo `#d62828`. El Inicio es una portada de revista (`第 01 話`, globo de diálogo, sello 開 y línea de tiempo) y la biblioteca son páginas de viñetas con tramado halftone, globo con el título, tag **GO!** y carátulas en blanco y negro. La cabecera es negra con el glifo 漫 y la navegación lleva kanji sobre cuadrado rojo; también tiene estilo propio en Ajustes, panel "Ahora suena", playlists, paleta ⌘K, modales de metadatos, splash y transición de página `t-manga`. |

También podés crear los tuyos con el **generador de temas**: elegís un
arquetipo entre los 14 propios (Estudio y Manga también están disponibles), ajustás colores
y el CSS se inyecta en runtime sin tocar archivos del proyecto. Los temas
generados se guardan en `localStorage` (`sakura_temas_personalizados`) y aparecen
en el selector.

## Identidad del tema Estudio

**Concepto:** una consola de mezcla y medidores VU. El Home arma una mesa de
mezcla con la marca `EST·01`, un medidor VU y un rack de canales con faders; la
biblioteca muestra cada canal con su fader y su VU.

| Rasgo | Descripción |
|---|---|
| Paleta | Grafito `#15181a`, panel `#1d2226`, ámbar `#f0a23c`, verde LED `#7ee081` y texto `#f2ede6` |
| Tipografía | Monospace, como en un rack de estudio |
| Navegación | Negra, con el glifo **◎** y acento ámbar `#f0a23c` |
| Superficies | Paneles de consola sobre grafito, con medidores y faders |
| Cobertura | Estilo propio en Buscar, Cola, Ajustes, panel "Ahora suena", playlists, paleta ⌘K, estadísticas, modales de metadatos, splash y transición `t-estudio` |
| Selector | `data-theme="space"` fijo más `data-skin="space"`; en la galería figura con badge **PROPIO** |

Detalle claro: los estados condicionales (éxito/error/aviso) mantienen sus
colores verdes/rojos/ámbar; no se recolorean con el tema.

## Preferencias que se guardan

Todas viven en `localStorage` y se restauran al reabrir la app:

| Clave | Qué guarda |
|---|---|
| `sakura_theme` | Tema visual: `space` (Estudio) o `sumie`, `byobu`, `shoji`, `origami`, `swiss`, `sumiink`, `moonlit`, `ledger`, `shonen`, `ghost`, `samurai`, `kawaii`, `manga` (todos propios) |
| `sakura_temas_personalizados` | Temas creados con el generador (arquetipo + CSS) |
| `sakura_view_mode` | Vista de biblioteca activa en la vista genérica, hoy fallback de temas importados (`folders`, `grid`, `table`, `albums`, `mosaic`, `cds`, `tilt`, `glow`, `portadas`) |
| `sakura_player_style` | Estilo del reproductor (`floating` / `fixed` / `mini`) |
| `sakura_glass_opacity` | Opacidad del vidrio |
| `sakura_glass_blur` | Desenfoque (backdrop blur) |
| `sakura_ambient_glow` | Resplandor ambiental |
| `sakura_ambient_particles` | Partículas atmosféricas |
| `sakura_download_folder` | Carpeta destino de descargas |

## Efectos (Ajustes)

En **Ajustes** todavía podés ajustar lo que queda del sistema visual:

- **Opacidad del vidrio** (15–95 %): qué tan transparente se ve el panel.
- **Desenfoque (Backdrop Blur)** (0–32 px): cuánto se difumina el fondo.
- **Resplandor ambiental fluido (Dynamic Glow)**: si está activo, los glows
  siguen los colores de la carátula que suena.
- **Efectos atmosféricos de partículas**: pétalos de cerezo o chispas.

> Nota: con Estudio estas tres opciones (vidrio, blur, resplandor) son de bajo
> impacto visual, porque los paneles de la consola son sólidos y oscuros. Siguen
> funcionando para quien las active.

Todo se aplica en tiempo real.

## Estilo de reproductor

- **Cápsula Flotante (Dock)**: el reproductor flota sobre el contenido.
- **Barra Fija Continua**: reproductor anclado abajo, siempre visible.
- **Mini**: reduce la ventana a 400×132 px y la deja siempre encima, con
  portada, título y controles básicos. El botón de maximizar dentro del mini
  vuelve al modo flotante y restaura el tamaño original.

En ambos, hacer clic en la **portada** del reproductor abre el panel **Ahora
suena**: portada grande, fondo teñido con el color dominante de la carátula,
controles amplios y cuatro pestañas — **Detalles**, **Letras** (con `.lrc`
sincronizadas), **Álbum** y **Artista**. Clic fuera o el botón × lo cierra. Al
entrar, el glifo del splash pasa a la navegación con una transición continua
(View Transitions).

## Paleta de comandos (⌘K)

`Ctrl+K` / `⌘K` abre la paleta de comandos: sirve para navegar entre pestañas,
cambiar de tema, controlar la reproducción y buscar pistas. Usá **↑↓** para
moverte, **↵** para ejecutar y **esc** para cerrar. La paleta toma el estilo del
tema activo, incluidos los 14 propios.

## Vistas de biblioteca

En la **vista genérica**, hoy reservada como fallback para temas importados,
**Biblioteca** ofrece nueve vistas en el switcher del toolbar:

| Vista | Qué muestra |
|---|---|
| **Carpetas** | Explorador de carpetas con breadcrumbs y subcarpetas |
| **Cuadrícula** | Tarjetas con portada, título y artista |
| **Lista** | Tabla de columnas ordenables |
| **Álbumes** | Colección agrupada por disco |
| **Pared** | Mosaico de portadas a escala variable, filtrado por la carpeta seleccionada y con el nombre y artista de cada pista |
| **CDs** | Portadas presentadas como discos |
| **3D (Tilt)** | Portadas con efecto de inclinación tridimensional |
| **Luz (Glow)** | Portadas con resplandor ambiental |
| **Portadas** | Galería de carátulas |

La vista se persiste en `sakura_view_mode`. En los **14 temas propios** no hay
switcher de nueve vistas: cada tema dibuja su propia biblioteca estructural (en
Estudio, canales con fader y VU), con Home, cabecera, Buscar, Cola, ajustes y
diálogos a juego.

## Qué cambia y qué no

Con 14 temas, al cambiar de tema cambian la paleta, la tipografía, los componentes
y —en todos los oficiales— la estructura completa de cada pantalla. Aun así:

| Sí | No |
|---|---|
| La paleta, la tipografía y el estilo de navegación, tarjetas y reproductor | Tu música, tags y portadas |
| El layout de la biblioteca (vista propia en los 14 oficiales; 9 vistas genéricas sólo en importados) | Los atajos y controles |
| El tamaño/orientación del reproductor (flotante, fijo o mini) y los efectos (opcionales) | La lógica de descargas o escaneo |

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El botón no cambia de color | Usa un color de estado fijo (rojo/ámbar/verde) | Es intencional: los estados de condición no siguen el tema |
| La preferencia no se guarda | `localStorage` bloqueado por el WebView | Limpiá los datos del sitio en WebView2 y volvé a elegir |
| Las partículas no aparecen | Están apagadas en Ajustes | Activá **Efectos atmosféricos de partículas** |
| Texto poco legible en algún modal | Superficie heredada de estilos viejos | Reportalo: los modales nuevos usan las superficies claras del tema activo |
| Un tema no cambia la estructura | Estás con un tema importado, que cae en la vista genérica | Elegí uno de los 14 temas oficiales: todos traen Home, biblioteca y diálogos propios, incluido Estudio (`space`) |

Más en [problemas.md](problemas.md) y en [../nuevas-funciones.md](../nuevas-funciones.md).


### Buscar y Cola en Estudio

En Estudio, **Buscar** y **Cola** mantienen la estética de consola: formularios
y filas sobre paneles grafito con acento ámbar y LEDs verdes, sin salir del
lenguaje de faders y medidores VU. Las estadísticas y los modales de metadatos
siguen la misma paleta, con tipografía monospace.

### Buscar y Cola en Manga

En Manga, **Buscar** muestra el formulario dentro de una viñeta con el sello
`¡BUSCA!` y los resultados como páginas de cómic. **Cola** presenta cada
descarga como una página numerada con barra de progreso roja. El editor de
metadatos abre con una cinta `第 01 話 · EDICIÓN DE METADATOS` y campos sobre
papel blanco con borde negro.


### Biblioteca de Estudio: mesa de mezcla

Cada pista es un **canal vertical** con número CH, LED de estado, tapa, controles
rápidos (favorito, editar, borrar), perillas de EQ de 3 bandas, fader con escala
en dB, medidor VU de salida y control de pan. Arriba están la sesión, el medidor
master y el transporte; abajo, el bus master. Los canales se recorren con scroll
horizontal, como en una consola real.
