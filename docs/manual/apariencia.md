# Apariencia

Sakura Music 2.0 ofrece **cinco temas visuales**: M3 Zen, Sumi-e, Yoru, Hanabi y
Aizuri. Elegí el que quieras en **Ajustes → Diseño Visual**; el cambio es
inmediato y se recuerda al reabrir la app.

## Los cinco temas

| Tema | Cómo se ve |
|---|---|
| **M3 Zen** | Marfil y rosa sakura. El tema clásico de la app. |
| **Sumi-e** | Papel crudo, tinta carbón y bermellón, con tipografía serif. |
| **Yoru** | Noche cálida, grafito y ámbar. Oscuro pero sin neón. |
| **Hanabi** | Azul noche con cian y magenta, tipografía monoespacio y esquinas vivas. |
| **Aizuri** | Índigo profundo, blanco hueso y cian, con serif. |

Los cinco comparten la misma distribución; cambian color, tipografía, bordes y sombras.

## Identidad del tema M3 Zen

| Rasgo | Descripción |
|---|---|
| Superficies | Marfil cálido (`--m3-surface`) con tarjetas blancas y sombras suaves |
| Acento | Rosa sakura (`--m3-primary`: `#b5126a`) en botones, foco y pistas activas |
| Estilo | Sin glassmorphism ni blur; bordes redondeados suaves (radio ~20 px) |
| Tipografía | Base 14 px y tamaños mayores que la v1, pensada para lectura cómoda |
| Emblema | Disco de vinilo con el kanji **桜** (sakura) en la navegación superior |
| Navegación | Barra superior de pestañas con indicador deslizante animado |

Detalle claro: los estados condicionales (éxito/error/aviso) mantienen sus
colores verdes/rojos/ámbar; no se recolorean con el tema.

## Preferencias que se guardan

Todas viven en `localStorage` y se restauran al reabrir la app:

| Clave | Qué guarda |
|---|---|
| `sakura_theme` | Tema visual (`space`, `sumie`, `yoru`, `hanabi` o `aizuri`) |
| `sakura_view_mode` | Vista de biblioteca activa (`folders`, `grid`, `table`, `albums`, `mosaic`, `cds`, `tilt`, `glow`, `portadas`) |
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

> Nota: con M3 Zen estas tres opciones (vidrio, blur, resplandor) son de bajo
> impacto visual, porque las superficies son sólidas y claras. Siguen
> funcionando para quien las active.

Todo se aplica en tiempo real.

## Estilo de reproductor

- **Cápsula Flotante (Dock)**: el reproductor flota sobre el contenido.
- **Barra Fija Continua**: reproductor anclado abajo, siempre visible.
- **Mini**: reduce la ventana a 400×132 px y la deja siempre encima, con
  portada, título y controles básicos. El botón de maximizar dentro del mini
  vuelve al modo flotante y restaura el tamaño original.

En ambos, hacer clic en la **portada** del reproductor abre el **Now Playing
inmersivo**: portada grande, fondo teñido con el color dominante de la carátula
y controles amplios. Clic fuera o el botón × lo cierra.

## Vistas de biblioteca

En **Biblioteca** cambiás entre nueve vistas, disponibles en el switcher del
toolbar:

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

La vista se persiste en `sakura_view_mode`.

## Qué cambia y qué no

Como solo hay un tema, no hay conmutación visual que explique cambios de
colores entre secciones. Aun así:

| Sí | No |
|---|---|
| El layout de cada vista de biblioteca (Carpetas/Cuadrícula/Lista/Álbumes/Pared/CDs/3D/Luz/Portadas) | Tu música, tags y portadas |
| El tamaño/orientación del reproductor (flotante o fijo) | Los atajos y controles |
| Los efectos de vidrio, glow y partículas (opcionales) | La lógica de descargas o escaneo |

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El botón no cambia de color | Usa un color de estado fijo (rojo/ámbar/verde) | Es intencional: los estados de condición no siguen el tema |
| La preferencia no se guarda | `localStorage` bloqueado por el WebView | Limpiá los datos del sitio en WebView2 y volvé a elegir |
| Las partículas no aparecen | Están apagadas en Ajustes | Activá **Efectos atmosféricos de partículas** |
| Texto poco legible en algún modal | Superficie heredada de estilos viejos | Reportalo: los modales nuevos usan las superficies claras de M3 Zen |

Más en [problemas.md](problemas.md).
