# Fuentes incluidas

Este directorio contiene los archivos WOFF2 (subconjunto latino) que usa la app. Están servidos desde el propio instalador para que la interfaz funcione sin conexión y sin contactar a Google Fonts.

| Archivo | Fuente | Licencia |
|---|---|---|
| `plus-jakarta-sans-latin.woff2` | [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) | SIL Open Font License 1.1 |
| `jetbrains-mono-latin.woff2` | [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | SIL Open Font License 1.1 |
| `cormorant-garamond-latin.woff2` | [Cormorant Garamond](https://fonts.google.com/specimen/Cormorant+Garamond) | SIL Open Font License 1.1 |

Ambas fuentes se distribuyen bajo la SIL OFL 1.1, que permite embeberlas y redistribuirlas con la aplicación. Los textos completos de la licencia están en:

- https://openfontlicense.org/open-font-license-official-text/
- https://github.com/google/fonts/blob/main/ofl/plusjakartasans/OFL.txt
- https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt

Si se cambia el peso o la familia, actualizar también `src/App.css`, el `preload` de `index.html` y el `font-src` del CSP en `src-tauri/tauri.conf.json`.
