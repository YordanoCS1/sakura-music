# Cómo agregar un tema

Guía práctica para sumar una apariencia nueva a Sakura Music. La regla central
es la del [ADR 0019](adr/0019-temas-propios-estructurales.md), ampliada en el
[ADR 0022](adr/0022-cinco-temas-con-biblioteca-propia.md): **un tema propio no es
una paleta nueva, es una estructura nueva**. Hay 19 temas oficiales y ninguno
puede reutilizar la biblioteca de otro con otro color.

Si el objetivo es sólo probar colores, use el generador de temas de
`docs/herramientas/generador-temas.html`: inyecta CSS en runtime y guarda el
resultado en `localStorage`, sin tocar el código. Esta guía es para un tema
oficial con vistas propias.

## Checklist

Marque cada paso antes de dar el cambio por terminado.

### 1. Registrar el tema

| Archivo | Qué hacer |
|---|---|
| `src/themes/themeCatalog.ts` | Agregar la entrada a `TEMAS_DISPONIBLES` (`id`, `nombre`, `descripcion`), incluirlo en `TEMAS_CON_VISTAS_PROPIAS` y darle un color a `THEME_GLOWS`. |
| `src/themes/themeMeta.ts` | Completar `GLIFOS` (carácter del tema), `SWATCHES` (muestra en la galería) y `PREVIEWS` (miniatura). |
| `src/themes/themeIcons.ts` | Definir los siete glifos de `ICONOS_TEMA` para `home`, `library`, `search`, `queue`, `settings`, `playlists` y `stats`. |

**Verificación:** el tema aparece en Ajustes → Apariencia y en la galería, con
nombre, descripción, muestra y glifo propios.

### 2. Definir tokens y transición

En `src/App.css`, agregar el bloque `.app-shell[data-skin='<id>']` con
`--m3-*`, `--space-*`, `--accent-*` y `--theme-*`. El atributo `data-theme` del
HTML **no se cambia**: queda fijo en `space`; el tema se aplica con
`data-skin={tema}` y la clase `tema-{tema}`.

Si el tema tiene animación de entrada, declarar una transición `t-<id>` siguiendo
el patrón de `t-estudio` o `t-manga`.

**Verificación:** al aplicar el tema cambian el fondo, la tipografía, los bordes
y las sombras, no sólo el acento.

### 3. Crear el CSS de identidad

| Situación | Dónde ponerlo |
|---|---|
| Ajustes de tokens y detalles pequeños | Bloque del tema en `src/App.css` |
| Identidad completa (Home, biblioteca, nav, paneles) | Módulo nuevo en `src/themes/styles/`, importado desde `App.css` **al final** de la lista |

Tomar como modelo `bibliotecas-unicas.css`: selectores siempre bajo
`.app-shell[data-skin='<id>']`, animaciones con `@keyframes` propios y una
regla `@media (prefers-reduced-motion: reduce)` que las desactive.

**Verificación:** ningún selector del tema nuevo afecta a otros temas.

### 4. Dibujar el Home

Agregar la rama del tema en `src/components/ThemeHome.tsx`. El Home debe tener
una metáfora propia (consola, pergamino, portada de revista, jardín, rollo…),
no la misma tarjeta con otro borde.

**Verificación:** el Home del tema nuevo no se parece al de ningún otro.

### 5. Dibujar la biblioteca con estructura propia

Agregar la rama del tema en `src/components/ThemeLibrary.tsx`. Antes de escribir,
comparar con las 18 bibliotecas existentes y elegir una forma que no se repita:

| Tema | Forma ya ocupada |
|---|---|
| `space` | Canales con fader y medidor VU |
| `sumie` | Pergamino con ensō |
| `byobu` | Díptico editorial |
| `manga` | Páginas de viñetas |
| `sakura` | Jardín hanami con flores y rama |
| `loto` | Tríptico de rollos de seda |
| `ukiyo` | Rollo lateral de estampas |
| `vinilo` | Estantería de fundas y plato |
| `karesansui` | Arena rastrillada con piedras |

Si la nueva biblioteca es una grilla de tarjetas con otra paleta, **no está
terminada**. Cambie la disposición, la forma de la portada o la interacción.

**Verificación:** reproduce con datos de prueba y compara dos capturas lado a
lado con el tema más parecido.

### 6. Ajustar el resto de la interfaz

- `src/components/ThemeNav.tsx`: navegación y glifo del logo si el tema lo requiere.
- `src/components/NowPlayingPanel.tsx`: glifo del panel «Ahora suena».
- `src/components/CoverFullscreen.tsx`: tripleta de colores del póster en el
  mapa de paletas (`[fondo, acento, texto]`).
- `src/components/SettingsTab.tsx`, `StatsTab.tsx` y `PlaylistsPanel.tsx`:
  estilos propios si el tema introduce superficies nuevas.

### 7. Recursos: locales o ninguno

Si el tema usa una imagen (como la foto del cerezo de Sakura), guardarla en
`public/images/` con licencia CC0 o equivalente y documentar la atribución en
`docs/manual/apariencia.md`. **No usar URLs externas en runtime**: la app es
local-first y debe verse igual sin conexión.

### 8. Tests

| Suite | Acción |
|---|---|
| `src/lib/contraste.test.ts` | Verificar que el texto normal supera 4.5:1 sobre la superficie del tema. |
| `e2e/app.spec.ts` | Ampliar el test «los cinco temas nuevos conservan home y biblioteca propias» con el tema nuevo, o crear uno equivalente. |
| `e2e/visuals.spec.ts` | Agregar snapshots `tema-home-win32.png` y `tema-library-win32.png` al loop visual. Hoy cubre ocho temas históricos. |
| Captura manual | Tomar una captura real y guardarla en `docs/img/v2-<tema>.png`. |

**Verificación:** `npm run pipeline` en verde (94 unitarios + 41 E2E + 59 Rust).

### 9. Documentación

- `docs/diseno.md`: fila nueva en la tabla de temas y en la tabla de familias; actualizar el total.
- `docs/manual/apariencia.md`: descripción del tema en la tabla y total de temas.
- `docs/arquitectura.md`, `docs/README.md`, `docs/requisitos.md`, `docs/casos-de-uso.md`, `docs/contraste.md`: donde aparezca el total.
- `docs/racional-de-decisiones.md`: si el tema introduce una decisión nueva, agregar apartado y fila al resumen.
- `CHANGELOG.md`: entrada bajo **Agregado**.
- ADR nuevo si hay una decisión estructural; nunca reescribir los anteriores.

### 10. Revisión final

Antes de commitear, comprobar todas estas condiciones:

- [ ] `npm run pipeline` pasa.
- [ ] El tema funciona sin conexión y sin assets remotos.
- [ ] `prefers-reduced-motion` desactiva sus animaciones.
- [ ] La biblioteca no se parece a ninguna otra.
- [ ] El contraste supera AA.
- [ ] La galería, los atajos `⌘K` y la presentación usan el tema.
- [ ] Documentación y captura actualizadas.

## Errores frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| El tema no cambia la biblioteca | Falta en `TEMAS_CON_VISTAS_PROPIAS` o la rama en `ThemeLibrary.tsx` | Registrarlo y agregar su bloque |
| La galería muestra un glifo genérico | Falta en `themeMeta.ts` o `themeIcons.ts` | Completar ambos mapas |
| El póster exportado usa colores de otro tema | Falta la paleta en `CoverFullscreen.tsx` | Agregar la tripleta |
| Otros temas cambian de estilo | Selector sin el prefijo `[data-skin='<id>']` | Ámbitar todos los selectores |
| Las animaciones molestan con movimiento reducido | Falta el bloque `@media` | Agregarlo y verificar con la preferencia activada |
