# 0019. Temas propios con identidad estructural

- **Estado:** Aceptada (2026-11-19); ampliada el 2026-11-20 con `manga`
- **Completa a:** ADR 0012 (temas múltiples)

## Contexto

Los primeros temas cambiaban sobre todo color y tipografía. Con doce temas
propios nuevos (Sumi-e, Byōbu, Shoji, Origami, Swiss, Sumi Ink, Moonlit, Ledger,
Shōnen, Fantasmas, Samurái y Kawaii), repetir la misma estructura con otra
paleta no era suficiente.

> Nota (2026-11-20): se sumó **Manga** (`manga`) como decimotercer tema propio
> con esta misma identidad estructural: `ThemeHome` de portada de
> revista, `ThemeLibrary` de páginas de viñetas, cabecera con glifo 漫 y
> transición `t-manga`, sobre papel `#fbfaf7`, tinta `#101010` y rojo
> `#d62828`. Las cifras "doce" de más abajo son las originales de la decisión;
> hoy son 13 propios + 4 genéricos = 17 temas.

## Decisión

Los 12 temas propios de la decisión original (hoy 13, ver nota arriba) renderizan
componentes exclusivos para Home, biblioteca, cabecera, Buscar, Cola, Ajustes,
diálogos y transiciones, además de iconos,
splash y panel “Ahora suena” propios. El atributo `data-theme` del HTML queda
fijo en `space` para no romper los selectores históricos; el tema elegido se
aplica con `data-skin={tema}` y la clase `tema-{tema}`. Los 4 temas genéricos
(`space`, `yoru`, `hanabi`, `aizuri`) conservan `LibraryTab` con sus 9 vistas.

El glifo del splash y el logo de la nav comparten
`view-transition-name: sakura-glifo`, así el arranque es un solo movimiento.

## Alternativas

- **Ampliar los selectores `[data-theme='space']`:** rompió `.app-shell` en
  intentos anteriores.
- **Un único componente con muchas variantes:** se volvía inmantenible con doce
  identidades visuales distintas.

## Consecuencias

- Nuevos temas requieren tocar varios componentes y actualizar snapshots.
- `content-visibility: auto` se activa sólo en bibliotecas propias de más de
  60 pistas, para no alterar las capturas de las vistas chicas.

## Reflejo en el código

`src/App.css` (bloque `data-skin='manga'`, `t-manga`), `ThemeHome.tsx`,
`ThemeLibrary.tsx`, `ThemeNav.tsx`, `src/themes/themeIcons.ts`, `index.html`,
`src/main.tsx`, más los snapshots `manga-home-win32.png` y
`manga-library-win32.png` de `e2e/visuals.spec.ts`.
