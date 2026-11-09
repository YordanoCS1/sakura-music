# Apariencia

Sakura Music 2.0 tiene **4 temas de color** (Sakura, Cyber, Amber, Emerald) y
**2 universos visuales** (Sakura Zen y Wuxia Jianghu). Cambiar de tema conserva
tu música y recolorea toda la interfaz al instante.

## Cambiar de tema

1. En el **sidebar**, al pie de **Tema visual**, elegí uno de los cuatro colores.
2. En **Ajustes**, en **Universo y Diseño Visual**, elegí la atmósfera cultural:
   **Sakura Zen** (rosa y violeta, 🌸) o **Wuxia Jianghu** (esmeralda y bambú, 🎋).

El tema se guarda en `localStorage` (`sakura_theme`) y el universo en
`sakura_theme_world`: al reabrir la app, vuelve lo que elegiste.

### Los cuatro temas

| Tema | Carácter |
|---|---|
| **Sakura** | Rosa neón (por defecto) |
| **Cyber** | Azul ciano neón |
| **Amber** | Dorado cálido |
| **Emerald** | Verde neón |

Los temas definen 8 variables (`--accent-200…950`) y toda la UI usa la paleta
`accent-*` de Tailwind. Sin recolorear a mano: botones, badges, glows y acentos
siguen al tema en tiempo real.

### Los dos universos

| Universo | Carácter |
|---|---|
| **Sakura Zen** | Fondo oscuro rosado, títulos "Sakura Music", pétalos cayendo |
| **Wuxia Jianghu** | Fondo esmeralda, títulos "Wuxia Jianghu", bruma y chispas |

El universo fuerza fondos, títulos y partículas; el tema de color sigue
aplicando dentro. Podés combinar Sakura Zen + Cyber, o Wuxia + Amber.

## Efectos de vidrio (Glassmorphism)

En **Ajustes**, ajustá:

- **Opacidad del vidrio** (15–95 %): qué tan transparente se ve el panel.
- **Desenfoque (Backdrop Blur)** (0–32 px): cuánto se difumina el fondo.
- **Resplandor ambiental fluido (Dynamic Glow)**: si está activo, los glows
  siguen los colores de la carátula que suena.
- **Efectos atmosféricos de partículas**: pétalos de cerezo o chispas de bambú
  según el universo.

Todo se aplica en tiempo real.

## Estilo de reproductor

- **Cápsula Flotante (Dock)**: el reproductor flotante clásico.
- **Barra Fija Continua**: reproductor anclado abajo, siempre visible.

## Vistas de biblioteca

En **Biblioteca** cambiás entre **Carpetas**, **Cuadrícula**, **Tabla** y
**Álbumes**. La vista se persiste (`sakura_view_mode`).

## Qué cambia y qué no al cambiar de tema

| Cambia | No cambia |
|---|---|
| Colores de fondo, texto, acentos, glows | Tu música, tags y portadas |
| Título y subtítulo del sidebar | Las vistas de biblioteca |
| Partículas según universo | Los atajos y controles |
| Efectos de vidrio (opacidad/blur) | La lógica de descargas o escaneo |

## Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El tema no cambia un botón | Ese botón usa un color de estado fijo (rojo/ámbar/verde) | Es intencional: los estados de condición no siguen el tema |
| El tema no se guarda | `localStorage` bloqueado por el WebView | Limpiá los datos del sitio en WebView2 y volvé a elegir |
| Las partículas no aparecen | Están apagadas en Ajustes | Activá **Efectos atmosféricos de partículas** |

Más en [problemas.md](problemas.md).
