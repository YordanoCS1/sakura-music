# Auditoría de contraste (WCAG AA)

Revisión del 2026-11-20 sobre los **14 temas originales**. Los cinco temas nuevos (`sakura`, `loto`, `ukiyo`, `vinilo` y `karesansui`) se revisaron con capturas reales y ajustes puntuales de contraste el 2026-11-25. Todo el texto normal
de la interfaz debe superar **4.5:1** contra su superficie; los textos grandes
pueden conformarse con 3:1, pero aquí se exige el criterio estricto.

## Método

Script de auditoría que lee `src/App.css`, extrae por tema las variables
`--m3-surface` / `--m3-on-surface` (y `--theme-canvas` / `--theme-ink` donde
aplica), calcula la luminancia relativa y aplica la fórmula de contraste de
WCAG 2.1. El resultado quedó fijado como test en `src/lib/contraste.test.ts`,
así cualquier cambio de paleta que rompa AA falla el pipeline.

## Resultados

| Temas | Texto principal | Texto secundario | Acción |
|---|---|---|---|
| Los 14 | 2.72 – 16.85:1 | 2.72 – 7.05:1 | Ver detalles abajo |

Antes de la corrección, el texto secundario fallaba en tres temas:

| Tema | Superficie | Color anterior | Ratio | Color nuevo | Ratio |
|---|---|---|---|---|---|
| Origami | `#fdf5f7` | `#8c7180` | 4.09 | `#7a5f6e` | 5.31 |
| Swiss | `#f2f2f0` | `#777777` | 4.00 | `#666666` | 5.12 |
| Kawaii | `#fff7fb` | `#b98ca3` | 2.72 | `#8a5c74` | 5.16 |

## Texto sobre acento

Muchos acentos son claros, así que el texto encima no puede ser blanco. Se
definió `--set-on-accent-base` por tema:

- **Tinta oscura (`#141018`)**: space, origami, sumi ink, moonlit, fantasmas,
  samurái, kawaii y shōnen.
- **Blanco**: sumi-e, byōbu, shoji, ledger, swiss y manga.

## Excepciones documentadas

- Los textos decorativos con opacidad muy baja (marcas de agua, tramados y
  números de viñeta de Manga) no transmiten información y quedan fuera del
  criterio AA.
- Los estados deshabilitados no se auditan: WCAG los exime.

## Mantenimiento

Si cambiás una paleta, actualice la pareja en `contraste.test.ts` y ejecute
`npm test`. No cambies un color sólo "porque se ve mejor" sin verificar el ratio.
