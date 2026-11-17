# ADR-0001 · Reescribir en Python + PySide6 en vez de Electron

- **Estado:** Reemplazado por 0009 (histórico v1)
- **Fecha:** 2026-11-07 (formalizada; decisión original de la reescritura)
- **Reflejo en el código:** `pyproject.toml` (`PySide6>=6.8`), `sakura/app.py`,
  `sakura/ui/`

## Contexto

La versión anterior era una app Electron (TypeScript) que hacía `spawn` de
`yt-dlp` y `ffmpeg`, parseaba su salida a mano, leía tags con librerías
externas y se compilaba con Vite + tsup + electron-builder. El consumo en
reposo era alto: Electron mantiene un Chromium completo en memoria
(~130–220 MB).

Las necesidades eran concretas y mundanas: lanzar procesos, leer JSON, leer y
escribir tags, escanear carpetas y dibujar una interfaz con varias vistas,
temas y estados. Ninguna exige un motor web.

## Decisión

Reescribir la app en **Python + PySide6**, con un único punto de entrada
(`python -m sakura`) y dependencias declaradas en `pyproject.toml`:
PySide6, yt-dlp y mutagen. Nada de build intermedio.

## Alternativas consideradas

| Alternativa | Por qué no |
|---|---|
| Seguir con Electron | Mantener el build TS/Vite/electron-builder; mayor memoria en reposo |
| Tkinter | Vistas custom (discos, carrusel, mosaico) y QSS serían mucho más costosas |
| Qt con C++ | Potencia innecesaria; el trabajo es I/O y parsing, no cómputo nativo |

## Consecuencias

**Positivas**

- Un solo `python -m sakura` arranca la app; no hay pipeline de frontend.
- `mutagen` y `pathlib` reemplazan `execFile` y `music-metadata` con menos código.
- Consumo en reposo de ~55–90 MB, muy por debajo de Electron.
- Los tests corren con Qt en modo offscreen, sin navegador ni empaquetador.

**Negativas / a tener en cuenta**

- Hay que distribuir Python o un empaquetado propio; no hay firma ni
  instalador oficial.
- La interfaz depende del QSS de Qt: hay que conocer sus límites
  (ver [ADR-0006](0006-temas-por-tokens.md)).
- El hilo de la UI es Python: cualquier trabajo pesado hay que sacarlo
  (ver [ADR-0008](0008-hilos-y-cierre-limpio.md)).

## Verificación

`python -m pytest` corre la suite completa en modo offscreen; el consumo en
reposo se puede medir con el Administrador de tareas tras abrir la app.
