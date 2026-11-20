# ADR-0012 · Temas múltiples con selector en Ajustes

- **Estado:** Vigente
- **Fecha:** 2026-11-17
- **Supera a:** la decisión de tema único registrada en 0009/0010 y materializada al limpiar el código muerto en `daf0d14`.

> **Nota histórica (2026-11-20):** esta decisión original incorporó `yoru`,
> `hanabi` y `aizuri`, que después se retiraron por ser variantes de paleta sin
> vistas estructurales propias. El estado actual es **14 temas propios**: el
> entonces genérico `space` (M3 Zen) fue rediseñado como **Estudio**, con vistas
> propias y `data-skin="space"`, y `LibraryTab`/`ZenTopNav` quedan como fallback
> para temas importados. Las cifras "cinco" y "cuatro" de más abajo se
> conservan porque documentan la decisión tal como se tomó.

## Contexto

Después de la limpieza de código muerto quedó un único tema fijo: `theme = 'space'` en `App.tsx`, `ThemeMode = 'space'` y 248 selectores atados a `[data-theme='space']`. Esa decisión simplificó el mantenimiento, pero el producto perdió la posibilidad de cambiar radicalmente de apariencia.

El usuario pidió explícitamente varios diseños nuevos "totalmente diferentes" y la posibilidad de elegirlos desde la interfaz.

## Decisión

1. `ThemeMode` pasa a ser una unión de cinco identificadores: `space` (M3 Zen en la redacción original, hoy **Estudio**), `sumie`, `yoru`, `hanabi` y `aizuri` (redacción original; ver la nota de retirada arriba).
2. El tema se lee de `localStorage` (`sakura_theme`) al arrancar, con `space` como valor por defecto. El selector vive en **Ajustes → Diseño Visual** y aplica el cambio sin recargar.
3. Se mantiene `data-theme="space"` fijo para que **todas** las reglas existentes sigan aplicando. El tema elegido se expone como `data-skin` en el contenedor raíz; los bloques nuevos se keyean por `[data-skin='id']`. Así no hay que duplicar ni romper cientos de selectores.
4. Cada tema nuevo define un bloque `.app-shell[data-skin='id']` que sobrescribe `--m3-*`, `--space-*`, `--accent-*` y un conjunto de variables `--theme-*` (canvas, topnav, tarjeta, borde, texto, dock, tipografía de display, radio y sombra).
5. Cada tema tiene además un bloque de **identidad estructural**: redefine la navegación (banda editorial, rail de iconos, lateral angular o banda serif), el radio y borde de las tarjetas, el reproductor y el estilo de las pestañas. Un tema no es una paleta: cambia la composición.
6. Las reglas comunes leen `--theme-*`; agregar un sexto tema requiere un bloque de tokens y su bloque de identidad.

## Consecuencias

- **Positivo**: cinco identidades visuales distintas (papel/tinta, noche ámbar, neón, índigo) sin mantener cinco copias del CSS de layout.
- **Positivo**: el cambio de tema es instantáneo y persiste entre sesiones.
- **Negativo**: todavía quedan ~230 colores literales en `App.css` fuera de las variables. Los temas nuevos cubren las superficies principales (shell, topnav, tarjetas, dock, títulos) pero algunos acentos incrustados pueden conservar el color original. La deuda queda registrada para una futura tokenización completa.
- **Negativo**: el CSP y los colores de acento de Tailwind deben estar en sync con los `--accent-*` de cada tema.

## Reflejo en el código

- `src/types.ts` — `ThemeMode`, `ThemeOption`.
- `src/App.tsx` — `TEMAS_DISPONIBLES`, estado del tema, `handleSetTheme`, `themeGlows`.
- `src/components/SettingsTab.tsx` — selector con `aria-pressed`.
- `src/App.css` — selectores extendidos, bloques de los cuatro temas nuevos, reglas compartidas `--theme-*`; hoy incluye el bloque de Estudio (`data-skin='space'`).
- `docs/diseno.md` — tokens y reglas visuales.
