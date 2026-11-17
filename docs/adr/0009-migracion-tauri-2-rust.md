# ADR 0009: Migración de PySide6 a Tauri 2.0 y Rust

## Estado
Aceptado

## Contexto
La versión 1.0 de Sakura Music fue desarrollada en Python con PySide6 (Qt). Aunque funcional, presentaba limitaciones de rendimiento en el escaneo de bibliotecas grandes con miles de archivos bajo el GIL de Python, complejidad de distribución de entornos virtuales (virtualenvs y dependencias de Python como mutagen y PySide6), y una interfaz gráfica atada a los estilos QSS de Qt.

Se evaluó la migración hacia una arquitectura moderna basada en **Tauri 2.0** con backend en **Rust** y frontend en **React + TypeScript + Tailwind CSS**.

## Decisión

1. **Backend en Rust:**
   - **Escaneo paralelo:** Se utiliza `rayon` y `walkdir` para escanear bibliotecas locales en todos los núcleos de CPU simultáneamente, logrando indexar miles de pistas en milisegundos.
   - **Lectura y edición de metadatos nativa:** Se utiliza `lofty` en modo de streams en memoria (`Cursor<Vec<u8>>`), evitando los bloqueos de descriptores de archivos de Windows y permitiendo editar metadatos en caliente sin dependencias de Python ni herramientas externas.
   - **Caché persistente en disco:** La biblioteca se guarda en `.tauri_data/library_cache.json` gestionada por Rust, eliminando las restricciones de cuota (`QuotaExceededError`) del `localStorage` del navegador.
   - **Descargas multihilo:** Orquestación asíncrona de `yt-dlp` con eventos de progreso en tiempo real (`download-progress`) enviados al frontend vía IPC de Tauri.

2. **Frontend en React + TypeScript + Tailwind CSS:**
   - **Diseño Glassmorphism:** Interfaz moderna con blur de fondo, degradados dinámicos y 4 paletas de color conmutables (Sakura, Cyber, Amber, Emerald). Nota: decisión revertida; hoy hay un único tema con id `space` (M3 Zen), sin glassmorphism ni selector de paletas.
   - **Reproducción libre de bloqueos:** El reproductor carga el audio en memoria mediante Blob URLs (`URL.createObjectURL`), cerrando de inmediato el handle del archivo en el sistema operativo y permitiendo editar tags o carátulas incluso mientras la canción está sonando.
   - **Editor Pro con Catálogo:** Búsqueda en línea integrada contra la API de Apple Music / iTunes para obtener metadatos y carátulas en alta resolución (600x600), soporte de pegado de imágenes (`Ctrl+V`), y controles de reversión individuales.

3. **Compatibilidad y preservación:**
   - El código de la versión original en Python se mantiene íntegramente en `legacy_python/` como referencia histórica.

## Consecuencias

### Positivas
- Binario nativo ultraligero y de arranque instantáneo.
- Consumo mínimo de memoria y CPU.
- Cero dependencias de Python en tiempo de ejecución.
- Interfaz moderna, reactiva y totalmente responsiva.
- Escaneo e indexación en paralelo hasta 10 veces más rápido que la versión Python.
- Edición de metadatos segura y atómica en todos los formatos de audio (Opus, MP3, FLAC, M4A, OGG, WAV).

### Negativas / Mitigaciones
- Requiere compilador de Rust (`cargo`) para el desarrollo y empaquetado inicial.
