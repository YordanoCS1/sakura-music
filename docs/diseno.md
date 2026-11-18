# Sistema de diseño

Sakura Music usa cinco temas: **M3 Zen** (por defecto), Sumi-e, Yoru, Hanabi y Aizuri. Comparten la escala y el layout, y cambian color, tipografía y forma mediante tokens. Este documento es la referencia; la fuente de verdad son `tailwind.config.js` y `App.css`.

## Temas disponibles

| Id | Nombre | Personalidad |
|---|---|---|
| `space` | M3 Zen | Superficies marfil, acento rosa sakura, redondeado suave |
| `sumie` | Sumi-e | **Tinta sobre tinta**: lienzo carbón con lavados, rail vertical de kanji, sello hanko bermellón, ensō y marca de agua 墨, tipografía serif clara |
| `yoru` | Yoru | Noche cálida, grafito y ámbar, sans geométrica |
| `hanabi` | Hanabi | Azul noche, cian y magenta, monoespacio, esquinas vivas |
| `aizuri` | Aizuri | Índigo teñido, blanco hueso y cian, serif |

Cada tema define `--m3-*`, `--space-*`, `--accent-*` y `--theme-*` en su bloque
`.app-shell[data-skin='id']`, **y además reescribe la estructura**: disposición de
la navegación (banda horizontal, rail de iconos o lateral), forma de las tarjetas,
bordes del reproductor, tipografía de las pestañas y sistema de sombras. Los
bloques de identidad están al final de `App.css`, bajo el encabezado
`IDENTIDAD POR TEMA`.

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

## Movimiento

| Token | Duración | Uso |
|---|---|---|
| `duration-fast` | 140 ms | Hover, focus, microinteracciones |
| `duration-base` | 200 ms | Cambios de estado, barras de progreso |
| `duration-slow` | 320 ms | Transiciones de vista y modales |

Siempre se respeta `prefers-reduced-motion`.

## Forma y elevación

- `rounded-xl` y `rounded-2xl` son los valores por defecto; `rounded-3xl` para tarjetas grandes y `rounded-full` para píldoras.
- Las tarjetas usan `.glass-card`, con borde sutil y una sola sombra suave. No se apilan blur ni resplandores.

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
