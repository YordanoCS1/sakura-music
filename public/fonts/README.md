# Fuentes incluidas

Este directorio contiene los archivos WOFF2 (subconjunto latino) que usa la app. Están servidos desde el propio instalador para que la interfaz funcione sin conexión y sin contactar a Google Fonts.

| Archivo | Fuente | Licencia |
|---|---|---|
| `plus-jakarta-sans-latin.woff2` | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | SIL Open Font License 1.1 |
| `jetbrains-mono-latin.woff2` | [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | SIL Open Font License 1.1 |
| `cormorant-garamond-latin.woff2` | [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | SIL Open Font License 1.1 |
| `fraunces-latin-variable.woff2` | [Fraunces Variable](https://github.com/undercasetype/Fraunces) — subconjunto latino, ejes `wght` (100–900), `opsz` (9–144), `SOFT` (0–100) y `WONK` (0–1) | SIL Open Font License 1.1 |

Todas se distribuyen bajo la SIL OFL 1.1, que permite embeberlas y redistribuirlas con la aplicación. Los textos completos de la licencia están en:

- https://openfontlicense.org/open-font-license-official-text/
- https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt
- https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt
- https://github.com/google/fonts/blob/main/ofl/fraunces/OFL.txt

Fraunces se declara en `src/styles/fuentes.css` y se carga bajo demanda (`font-display: swap`), sin `preload`: sólo aparece cuando está activo uno de los cinco temas nuevos. El CSP ya permite `font-src 'self' data:` en `src-tauri/tauri.conf.json`.

Si se cambia el peso o la familia de alguna fuente preloadada, actualizar también `src/App.css`, el `preload` de `index.html` y el `font-src` del CSP en `src-tauri/tauri.conf.json`.
