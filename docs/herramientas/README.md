# Herramientas

Utilidades que acompañan a Sakura Music. Ninguna es necesaria para usar la app.

## 1. Generador de temas

[`generador-temas.html`](generador-temas.html) es una página standalone: elegí fondo, superficie, texto, acento y radio, y te devuelve el CSS listo para pegar al final de `src/App.css`. Incluye vista previa en vivo y botón de copiar.

**Para cambiar toda la app**, elegí un **arquetipo de diseño** en el generador y copiá el **JSON del tema**. En Sakura andá a **Ajustes → Importar un tema**, pegá el JSON y tocá *Aplicar tema*. El arquetipo define la estructura de Home, biblioteca, barra superior, Buscar y Cola; el CSS define la paleta. Los temas importados se guardan en `localStorage` (`sakura_temas_personalizados`) y se inyectan en runtime, sin tocar el código fuente.

Arquetipos disponibles: `shoji`, `origami`, `swiss`, `sumiink`, `moonlit`, `ledger`, `sumie` y `byobu`.

También se puede generar desde el CLI:

```powershell
cargo run --bin sakura-cli -- theme --name "Mi tema" --bg "#101820" --accent "#4fd1c5" --out mi-tema.css
```

Para registrar el tema nuevo:

1. Agregá el id a `ThemeMode` en `src/types.ts`.
2. Agregá la entrada a `TEMAS_DISPONIBLES` y los glows en `src/App.tsx`.
3. Sumá el color al mapa `SWATCHES` de `SettingsTab.tsx` y al `PREVIEWS`.
4. Pegá el CSS generado.
5. Si querés vista propia, sumalo a `TEMAS_CON_VISTAS_PROPIAS` y creá las ramas en `ThemeHome` / `ThemeLibrary` / `ThemeNav`.

## 2. CLI `sakura-cli`

Binario Rust que usa los mismos módulos que la app (sin interfaz). Se compila con el resto del proyecto:

```powershell
cd src-tauri
cargo run --bin sakura-cli -- help
```

Comandos:

| Comando | Qué hace |
|---|---|
| `scan <carpeta>` | Escanea archivos de audio y sincroniza SQLite. |
| `search <texto> [--limit N]` | Busca con el índice FTS5. |
| `export [-o archivo]` | Exporta la biblioteca a JSON (o la imprime). |
| `import <archivo.json>` | Importa pistas con el mismo upsert que la app. |
| `doctor` | `PRAGMA integrity_check`, cuenta pistas y reconstruye el índice FTS. |
| `theme ...` | Genera CSS de un tema nuevo. |

Por defecto usa `src-tauri/.tauri_data`, la misma carpeta que la app. Con `--data <ruta>` se puede apuntar a otra base:

```powershell
cargo run --bin sakura-cli -- --data "C:\Backup\sakura" search gurenge
```

## 3. Control remoto local

La app levanta un servidor HTTP mínimo en el puerto **17342**. Se activa desde **Ajustes → Control remoto**. Desde el celular, en la misma Wi-Fi, se entra a `http://<IP local>:17342`.

La página permite play/pause, anterior/siguiente, volumen, ver la canción actual y buscar en la biblioteca. El backend busca con FTS5 y manda la pista elegida al frontend con el evento `remote-command`; el frontend publica el estado cada segundo con `remote_update_state`.

No expone archivos ni acepta comandos arbitrarios: sólo las rutas `/api/*` documentadas en [`../ipc-contract.md`](../ipc-contract.md). Está pensado para la red local; no lo expongas a Internet sin un proxy con autenticación.
