# ADR-0006 · Temas como tokens y dimensiones, no como colores sueltos

- **Estado:** Vigente
- **Fecha:** 2026-11-07 (formalizada)
- **Reflejo en el código:** `sakura/ui/theme/tokens.py`,
  `sakura/ui/theme/palettes.py`, `sakura/ui/theme/qss.py`,
  `sakura/ui/theme/ambient.py`, `sakura/ui/main_window.py` (`apply_theme`)

## Contexto

Con 14 temas, si cada widget escribiera sus propios colores, cambiar de tema
dejaría restos del tema anterior (sucedió con la barra lateral: título y
subtítulo se armaban una vez en el constructor y quedaban con el color viejo
para siempre). Además, un color suelto no dice qué **significa**: el acento
`#FF5DA8` marcaba a la vez la selección de fila, el botón primario, el nombre
del artista y la página activa, así que dejaba de significar nada.

## Decisión

Un tema (`Theme`, frozen dataclass) declara **cinco dimensiones**:

| Dimensión | Tokens | Efecto |
|---|---|---|
| Paleta | `bg`, `surface`, `surface_alt`, `surface_hover`, `border`, `text`, `text_dim`, `text_muted`, `accent`, `danger`, `success`, `warning` | Colores de fondo, texto y estados |
| Forma | `radius`, `radius_sm`, `radius_pill`, `sidebar_w`, `border_w`, `flat` | Esquinas, bordes y si hay gradientes |
| Densidad | `density` | Escala los paddings del QSS vía `px(t, n)` |
| Jerarquía | `selection`, `selection_text` (tinte del acento al 20 %, derivado con `tint()`) | Selección **distinta** del botón primario |
| Estructura | `shell` (`sidebar`, `dock`, `rail`, `top`, `tabs`, `bottom`, `split`) | Dónde vive la navegación |

Reglas:

- **Ningún widget escribe un color literal.** Todo sale de `theme.color(...)` o
  de los `objectName` del QSS.
- `build_qss(theme)` genera **todo** el stylesheet desde los tokens; agregar un
  tema es agregar un `Theme` al registro (`THEME_LIST`), sin tocar widgets.
- Cambiar de tema es `window.apply_theme(t)`: regenera el QSS, cambia el shell,
  cambia el icono de la ventana y refresca los estilos inline y los botones.
- `Theme.with_ambient()` produce variantes (acento tomado de la portada
  seleccionada) sin mutar el tema base.
- Cada tema pasa **12 pares WCAG × 14 temas = 168 verificaciones** de contraste
  (`test_theme_contrast.py`).

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Colores escritos en cada widget | El cambio de tema deja restos; agregar un tema toca todo el código |
| QSS entero por tema, a mano | Duplicación enorme; cualquier cambio hay que repetirlo 14 veces |
| Un token por cada uso visual (micro-temas) | Explosión combinatoria; no escala a 14 diseños |

## Consecuencias

**Positivas**

- Agregar un tema cuesta un `Theme` nuevo y cero cambios en widgets.
- El contraste es verificable automáticamente, no “a ojo”.
- La selección deja de competir con el botón primario: `selection` es un tinte
  derivado, no el acento puro.
- Las dimensiones de forma, densidad y shell hacen que dos temas se vean como
  apps distintas, no como el mismo esqueleto pintado.

**Negativas / a tener en cuenta**

- Los widgets con estilos inline hay que refrescarlos manualmente al cambiar de
  tema (`refresh_theme()`); `scripts/check_theme_switch.py` verifica que no
  queden colores viejos.
- Un `QWidget` propio necesita `WA_StyledBackground` para recibir el fondo del
  QSS; sin eso las tarjetas salen invisibles.
- Un `QLabel` con texto largo estira la ventana (`minimumSizeHint`): se usa
  `widgets/elided.py` para elipsis.
- El QSS de Qt tiene un subconjunto limitado de CSS: los diseños deben jugar
  dentro de ese límite.

## Verificación

`test_theme.py`, `test_theme_contrast.py`, `test_theme_switch.py`,
`test_shells.py` y `test_designs.py`.
