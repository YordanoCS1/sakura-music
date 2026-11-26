# 0022. Cinco temas nuevos con biblioteca de estructura propia

- **Estado:** Aceptada (2026-11-25)
- **Completa a:** ADR 0019 (temas propios con identidad estructural)

## Contexto

El ADR 0019 fijó que los temas oficiales no son variantes de paleta: cada uno
redibuja Home, biblioteca, cabecera, diálogos y transiciones. Con 14 temas
propios, el riesgo al sumar nuevos era repetir la grilla de tarjetas con otros
colores, que había producido vistas indistinguibles en intentos anteriores.

El 2026-11-25 se pidieron cinco temas nuevos —Árbol de Sakura, Loto Imperial,
La Gran Ola, Tocadiscos 3D y Karesansui— con la condición explícita de que
ninguno se pareciera a otro.

## Decisión

Los cinco temas nuevos tienen Home y biblioteca propios, con una metáfora
estructural distinta:

| Tema | Biblioteca |
|---|---|
| `sakura` | Jardín hanami: foto real del cerezo, medallón de cinco pétalos, rama y flores en zigzag |
| `loto` | Tríptico de rollos de seda con aletas laterales, varillas doradas y sellos |
| `ukiyo` | Rollo lateral de estampas apaisadas con ola SVG y sello rojo |
| `vinilo` | Estantería de fundas con discos que asoman, inclinación 3D y plato activo |
| `karesansui` | Arena rastrillada con piedras de paso orgánicas y roca mayor |

El tema Sakura usa una fotografía CC0 guardada en `public/images/`, no un SVG
ni una URL remota, para conservar el funcionamiento sin conexión. El CSS de
estas cuatro bibliotecas vive en `src/themes/styles/bibliotecas-unicas.css` y se
importa al final de `App.css`. Como en el ADR 0019, `data-theme` sigue fijo en
`space` y el tema se aplica con `data-skin`.

## Alternativas

- **Reutilizar la grilla de tarjetas cambiando `--accent-*`:** rápido, pero los
  cinco temas seguían pareciéndose entre sí y rompían la regla del ADR 0019.
- **Imagen del cerezo servida desde una URL externa:** rompía el modo sin red y
  dejaba el fondo a merced de un tercero.
- **SVG del árbol:** se leía como un dibujo y no transmitía "hanami".

## Consecuencias

- El catálogo pasa de 14 a **19 temas oficiales**, todos con vistas propias.
- Los snapshots automáticos de `e2e/visuals.spec.ts` siguen cubriendo ocho temas
  históricos; los cinco nuevos se verifican con capturas reales y un test E2E
  que comprueba que conservan Home y biblioteca propios.
- El contraste de las bibliotecas nuevas se ajustó en dos puntos: iconos de
  Ukiyo sobre píldora clara y etiqueta rectangular oscura en Vinilo.
- Se agregó [la guía para sumar temas](../como-agregar-un-tema.md) para que el
  próximo no caiga en el cambio de paleta.

## Reflejo en el código

`src/themes/themeCatalog.ts`, `src/themes/themeMeta.ts`,
`src/themes/themeIcons.ts`, `src/components/ThemeHome.tsx`,
`src/components/ThemeLibrary.tsx`, `src/themes/styles/bibliotecas-unicas.css`,
`src/themes/styles/nuevos-5-temas-pro.css`, `src/App.css`,
`src/components/CoverFullscreen.tsx`, `public/images/sakura-tree.jpg` y
`e2e/app.spec.ts`.

---

> **Nota (2026-11-26):** la biblioteca de `sakura` se rediseñó después de esta
> decisión: pasó del jardín en zigzag a **anillos de crecimiento por canción**,
> con un anillo y una flor por pista en vez de una rama. La metáfora del cerezo
> y la foto real del hero se conservan.
