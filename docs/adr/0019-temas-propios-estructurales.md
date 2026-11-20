# 0019. Temas propios con identidad estructural

- **Estado:** Aceptada (2026-11-19)
- **Completa a:** ADR 0012 (temas múltiples)

## Contexto

Los primeros temas cambiaban sobre todo color y tipografía. Con doce temas
propios nuevos (Sumi-e, Byōbu, Shoji, Origami, Swiss, Sumi Ink, Moonlit, Ledger,
Shōnen, Fantasmas, Samurái y Kawaii), repetir la misma estructura con otra
paleta no era suficiente.

## Decisión

Los 12 temas propios renderizan componentes exclusivos para Home, biblioteca,
cabecera, Buscar, Cola, Ajustes, diálogos y transiciones, además de iconos,
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

`src/App.css`, `ThemeHome.tsx`, `ThemeLibrary.tsx`, `ThemeNav.tsx`,
`src/themes/themeIcons.ts`, `index.html`, `src/main.tsx`.
