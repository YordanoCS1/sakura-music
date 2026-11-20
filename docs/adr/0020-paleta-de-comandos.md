# 0020. Paleta de comandos y navegación de seis pestañas

- **Estado:** Aceptada (2026-11-19)

## Contexto

Con 16 temas, seis pestañas y cientos de pistas, cambiar de sección o de tema
recorriendo Ajustes era lento. Los atajos existentes cubrían reproducción, no
navegación.

> Nota (2026-11-20): la cifra de 16 es la del momento de la decisión. En su
> momento se pasó a **17 temas** (13 propios + 4 genéricos, con `manga` entre
> los propios); hoy son **14 propios**, tras retirar Yoru, Hanabi y Aizuri por
> ser variantes de paleta sin vistas estructurales propias y rediseñar `space`
> (antes M3 Zen, el genérico) como **Estudio**. La paleta de comandos y la sexta
> pestaña cubren también el tema nuevo, con estilo y transición `t-estudio`
> propios.

## Decisión

`Ctrl+K` / `⌘K` abre un diálogo con búsqueda difusa simple sobre tres grupos:
Ir a, Reproducción y Temas/Pistas. ↑↓ navega, ↵ ejecuta y esc cierra. Se agregó
la sexta pestaña `playlists` a todos los temas (cada uno con su propio glifo).

## Alternativas

- **Atajos directos por tema (`1`…`6`):** no escalan y no son descubribles.
- **Buscador global separado:** duplicaría la pestaña Buscar.

## Consecuencias

- El contrato de `AppTab` y `ICONOS_TEMA` cambió; los tests de iconos y los
  snapshots visuales se actualizaron.
- La paleta se estiliza con el tema activo mediante variables `--cmd-*`.

## Reflejo en el código

`src/components/CommandPalette.tsx`, `src/App.tsx`, `src/types.ts`,
`src/themes/themeIcons.ts`, `ThemeNav.tsx`, `ZenTopNav.tsx`.
