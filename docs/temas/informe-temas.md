# 🌸 Sakura Music — Informe de 8 Temas (todas las pantallas)

> [!IMPORTANT]
> **Esto es documentación de diseño / propuesta de prototipo histórica.** Los
> ocho temas de abajo (Cyberpunk, Bosque Místico, Océano Profundo, Lavanda
> Verano, Bambú Minimal, Puesta de Sol, Noche Estrellada y Neón Rosa) son
> **prototipos HTML** de una etapa de exploración visual: **no son los temas que
> implementa hoy la app**. La implementación real está en `src/App.css` (tokens
> `--m3-*`, `--space-*`, `--accent-*` y `--theme-*` bajo
> `[data-skin='id']`), en `src/components/ThemeLibrary.tsx` y en
> `src/components/ThemeHome.tsx` (con `ThemeNav`, `ThemeSearch`, `ThemeQueue` y
> los diálogos/transiciones/iconos/splash propios). Consultá
> [diseno.md](../diseno.md) y [ADR 0012](../adr/0012-temas-multiples.md) para el
> estado actual.

**Propuesta original de identidad visual para el reproductor.** Se veían
**todas las pantallas** de la app en cada tema, no solo el inicio. Cada tema
mostraba las 5 vistas principales: **Home, Biblioteca (cuadrícula), Lista de
canciones, Now Playing y Cola.**

> 💡 **Ver los prototipos en vivo:** abra `docs/temas/sakura_temas.html` (doble
> clic, autocontenido). Ahí están los 8 prototipos, cada uno con sus 5 pantallas
> en una fila. Es una maqueta, no la UI de la app.

## Estado actual de la implementación

La app **no usa seis temas ni estos ocho prototipos**: implementa **19 temas,
todos propios**:

- **Estudio** (`space`, antes M3 Zen y hoy tema propio): fija
  `data-theme="space"` y aplica también `data-skin="space"`. Es una consola de
  mezcla con medidores VU, Home con `EST·01`, biblioteca en canales con fader y
  VU y navegación negra con glifo ◎ sobre acento ámbar `#f0a23c`.
- **Los otros dieciocho** (`sumie`, `byobu`, `shoji`, `origami`, `swiss`,
  `sumiink`, `moonlit`, `ledger`, `shonen`, `ghost`, `samurai`, `kawaii`,
  `manga`, `sakura`, `loto`, `ukiyo`, `vinilo` y `karesansui`): usan
  `data-skin={tema}` y tienen `ThemeLibrary`, `ThemeHome` y `ThemeNav` propios,
  con cabecera, Buscar, Cola, ajustes, diálogos, transiciones, iconos y splash
  propios.

`LibraryTab.tsx` con sus 9 vistas y `ZenTopNav` siguen en el código como fallback
para temas importados; ningún tema oficial los usa.

> **Nota (2026-11-20):** ninguno de los ocho prototipos de este informe se
> implementó como tema. Los temas `yoru`, `hanabi` y `aizuri` no salieron de aquí:
> fueron variantes de paleta de una etapa posterior y también se retiraron por
> no tener vistas estructurales propias. En ese momento eran **14 temas propios**
> (incluido Estudio, el ex `space` genérico); el 2026-11-25 se sumaron cinco más
> y hoy son **19** (ver nota al final).

Algunos prototipos de este informe inspiraron temas propios (por ejemplo,
*Bambú Minimal* → `sumie`/`shoji`, *Noche Estrellada* → `moonlit`,
*Neón Rosa* → `kawaii`/`ghost`), pero las paletas y la estructura final son las
de `App.css`, no las de este HTML. El prototipo
**Neón Rosa** es el antecedente más cercano del tema implementado `manga`
(viñetas, rojo y negro), aunque `manga` no existía en este HTML: se diseñó
después con papel `#fbfaf7`, tinta `#101010`, acento `#d62828` y tramado
screentone, y es el único tema de la app con portada de revista y páginas de
viñetas en la biblioteca.

---

## 🟣 01 · Cyberpunk
**Violeta + cian neón · futurista**

- **Pantallas:** Home (portada con halo neón), Biblioteca (cuadrícula), Lista (con búsqueda), Now Playing, Cola.
- **Nav:** rail de iconos a la izquierda.
- **Look:** neón cian/morado sobre negro, con brillos.
- **Idea:** música electrónica / urbana / futurista.

## 🟢 02 · Bosque Místico
**Verde esmeralda + oro · sereno**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior (con buscador).
- **Look:** verde bosque con portadas esmeralda, textos verde menta.
- **Idea:** lofi / relajación / naturaleza.

## 🔵 03 · Océano Profundo
**Azul + teal · calma acuática**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior.
- **Look:** azul marino con teal/cian, portadas acuáticas.
- **Idea:** ambient / chill / acuático.

## 🟣 04 · Lavanda Verano
**Lila + durazno · fresca**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior.
- **Look:** lavanda/violeta suave con acentos lila.
- **Idea:** pop suave / verano / ligero.

## 🟩 05 · Bambú Minimal
**Verde suave + marfil · zen japonés**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior.
- **Look:** CLARO — fondo marfil/verde pálido, textos oscuros, estética japonesa zen.
- **Idea:** japonés / minimal / tradicional.

## 🔴 06 · Puesta de Sol
**Coral + rosa · cálido**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior.
- **Look:** coral/rosa/berenjena con brillos cálidos.
- **Idea:** romántico / nostálgico / atardecer.

## 🟡 07 · Noche Estrellada
**Azul noche + ámbar · nostálgica**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior.
- **Look:** azul noche profundo con ámbar/dorado, portadas estrelladas.
- **Idea:** nocturno / melancólico / celestial.

## 🟪 08 · Neón Rosa
**Magenta + rosa brillante · vibrante**

- **Pantallas:** Home, Biblioteca, Lista, Now Playing, Cola.
- **Nav:** barra superior.
- **Look:** rosa neón brillante sobre negro/magenta, con glow.
- **Idea:** pop / anime / vibrante.

---

## 📊 Pantallas que se muestran por tema

| # | Tema | ① Home | ② Biblioteca | ③ Lista | ④ Now Playing | ⑤ Cola |
|---|------|:---:|:---:|:---:|:---:|:---:|
| 01 | Cyberpunk | ✔ | ✔ | ✔ | ✔ | ✔ |
| 02 | Bosque Místico | ✔ | ✔ | ✔ | ✔ | ✔ |
| 03 | Océano Profundo | ✔ | ✔ | ✔ | ✔ | ✔ |
| 04 | Lavanda Verano | ✔ | ✔ | ✔ | ✔ | ✔ |
| 05 | Bambú Minimal | ✔ | ✔ | ✔ | ✔ | ✔ |
| 06 | Puesta de Sol | ✔ | ✔ | ✔ | ✔ | ✔ |
| 07 | Noche Estrellada | ✔ | ✔ | ✔ | ✔ | ✔ |
| 08 | Neón Rosa | ✔ | ✔ | ✔ | ✔ | ✔ |

---

## 📂 Archivos
- `docs/temas/sakura_temas.html` — los 8 temas × 5 pantallas **en vivo**.
- `docs/temas/informe-temas.md` — este informe.

---

## ▶️ Siguientes pasos (históricos)

Esta sección se conserva tal cual porque documenta el proceso de diseño original:
"abra el HTML, vea cada tema en sus 5 pantallas y decí cuál te gusta". Hoy esos
pasos ya no están pendientes: la app implementa los 14 temas descriptos arriba
(incluido `manga`, que se sumó después de este informe) y los cinco nuevos
`sakura`, `loto`, `ukiyo`, `vinilo` y `karesansui`.

> **Nota (2026-11-25):** los cinco temas nuevos tienen Home y biblioteca de
> estructura propia —jardín hanami, rollos de seda, estampas, estantería y
> jardín zen—, no una variante de paleta. Ver
> [racional-de-decisiones.md](../racional-de-decisiones.md#5-bibliotecas-con-estructura-propia-no-un-cambio-de-color).
Para temas nuevos, seguí la receta de [desarrollo.md](../desarrollo.md).