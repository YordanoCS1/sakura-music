# 🌸 Sakura Music 2.0

Gestor, reproductor, descargador y etiquetador de música moderno para escritorio, construido con **Tauri 2.0 (Rust)** y **React 18 (TypeScript + Tailwind CSS)**.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-1.80+-orange?logo=rust)
![React](https://img.shields.io/badge/React-18.3-cyan?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?logo=tailwind-css)

---

## ✨ Características Principales

### ⚡ Motor de Escaneo Ultrarrápido en Rust
- **Paralelismo masivo:** Utiliza `rayon` y `walkdir` para escanear y extraer metadatos de bibliotecas con miles de canciones en cuestión de milisegundos.
- **Soporte multiformato:** Lee y parsea tags y carátulas de archivos `OPUS`, `MP3`, `FLAC`, `M4A`, `OGG`, `WAV` y `AAC`.
- **Caché persistente en disco:** La biblioteca se sincroniza en `.tauri_data/library_cache.json` administrada por Rust, eliminando las restricciones de cuota (`QuotaExceededError`) del navegador.
- **Extracción de carátulas:** Almacenamiento en caché de imágenes locales deduplicadas mediante hashing.

### 🎵 Reproducción Libre de Bloqueos en Caliente
- **Carga en memoria vía Blob URLs:** El reproductor carga los archivos de audio en memoria RAM a través del protocolo IPC de Tauri.
- **Descriptores libres:** Cierra de inmediato el *handle* del sistema operativo Windows, permitiendo renombrar, editar metadatos o incrustar carátulas **mientras la canción está sonando en vivo**, sin bloqueos ni errores de *Acceso denegado (os error 5)*.
- **Controles completos:** Play/pausa, barra de progreso con seek suave, volumen, mute, modo aleatorio (shuffle), repetición (desactivada, todas, una) y avance automático.

### 🏷️ Editor de Metadatos Pro & Edición en Lote
- **Motor atómico en memoria:** Implementado con `lofty` en Rust puro. Ensambla y valida paquetes de tags (Vorbis Comments, ID3v2, MP4 boxes) en RAM antes de escribirlos atómicamente al disco.
- **Edición en Lote (Batch Editor):**
  - Selección múltiple intuitiva mediante casillas en **Vista Cuadrícula** y **Vista Tabla**.
  - Barra de herramientas con selector rápido (*«Seleccionar Todas»*, *«Deseleccionar»*).
  - Modal por lote con casillas de activación individual por campo: aplica Álbum, Artista, Artista del Álbum, Año, Género y Portada común a decenas de canciones de una sola vez.
  - **Filosofía no destructiva:** Todo campo que no esté expresamente marcado para modificar se conserva intacto en cada pista individual.
- **Campos soportados:** Título, Artista, Artista del Álbum, Álbum, Número de Pista, Año y Género.
- **Gestión completa de carátulas:**
  - Selector de imágenes locales (JPG, PNG, WEBP) e incrustación individual o por lote.
  - Eliminación completa de carátulas incrustadas.
  - **Pegado directo desde el portapapeles (`Ctrl + V`)**: Copia cualquier imagen de la web o de tu capturador y pégala directamente en el editor.
- **Buscador en Catálogo Oficial:**
  - Integración nativa con la API de **Apple Music / iTunes**.
  - Descarga automática de carátulas oficiales en **Alta Definición (600x600 px)**.
  - Opciones de *«Aplicar todo»* o *«Solo portada»*.
- **Control de cambios:** Botones de reversión individual por campo y botón para restablecer todos los valores originales.

### 📥 Búsqueda, Playlists y Descarga en Segundo Plano
- **Integración nativa con yt-dlp:** Búsqueda en línea en YouTube directamente desde la aplicación.
- **Descarga de Playlists y Álbumes Completos:**
  - Detección automática al pegar URLs de playlists o álbumes de YouTube (`playlist?list=...` o enlaces `/album/`).
  - Previsualización completa de pistas detectadas con canal, duraciones y miniaturas.
  - Selección individualizada con casillas para elegir exactamente qué pistas descargar.
  - Opción de organización automática en subcarpeta dedicada con el nombre del álbum/playlist.
  - Botón de un solo clic *«Descargar N Canciones»* para encolar el lote completo.
- **Descargas asíncronas:** Procesamiento en segundo plano mediante hilos de Tokio, sin congelar la interfaz.
- **Formatos de descarga configurables:**
  - **Opus** (Audio original de YouTube sin pérdidas por transcodificación).
  - **MP3** (Alta calidad 320 kbps).
  - **M4A** (AAC 192 kbps).
  - **FLAC** (Compresión sin pérdidas).
- **Monitor de progreso en tiempo real:** Barra de porcentaje, velocidad de descarga en vivo y tiempo estimado (ETA).

### 🎨 Interfaz Glassmorphism & Personalización
- **4 Temas visuales dinámicos:** Sakura (Rosa Neón), Cyber (Azul Ciano), Amber (Dorado Cálido) y Emerald (Verde Neón).
- **Vistas conmutables:** Vista en cuadrícula (*Grid Cards*) con portadas grandes y vista en tabla (*Table View*) para análisis rápido.
- **Sistema de favoritos:** Marcado persistente de canciones preferidas.
- **Filtros rápidos:** Filtros por formato (Todos, FLAC, Recientes, Favoritos) y barra de búsqueda reactiva instantánea.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React 18 + TypeScript)               │
│   • Glassmorphism UI (Tailwind CSS) + Lucide Icons          │
│   • HTML5 Audio Player (In-Memory Blob URL)                 │
│   • Editor Pro (Catálogo Apple Music + Paste Ctrl+V)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ IPC Commands & Events
┌──────────────────────────────▼──────────────────────────────┐
│                  Backend (Tauri 2.0 / Rust)                 │
│   • scanner.rs: Rayon Parallel Scan + Lofty In-Memory Engine│
│   • downloader.rs: yt-dlp Async Orchestration & Events      │
│   • lib.rs: Tauri Commands, Cache & Window Lifecycle        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Almacenamiento Local                     │
│   • .tauri_data/library_cache.json (Caché de canciones)     │
│   • .tauri_data/covers/ (Caché de carátulas JPG deduplicada)│
│   • .tauri_data/bin/ (Herramientas portables yt-dlp/ffmpeg) │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Requisitos e Instalación

### Requisitos Previos
1. **Node.js:** Versión 18 o superior ([nodejs.org](https://nodejs.org/)).
2. **Rust & Cargo:** Versión estable ([rustup.rs](https://rustup.rs/)).
3. **yt-dlp y FFmpeg:** Opcionales en el `PATH` de Windows (la app también los detecta automáticamente en `.tauri_data/bin/` o Winget).

### Instalación de Dependencias

```powershell
# Clona el repositorio
git clone https://github.com/tu-usuario/Sakura_Music.git
cd Sakura_Music

# Instala dependencias del frontend
npm install
```

### Ejecución en Modo Desarrollo

Podés iniciar la aplicación de dos formas:

1. **Vía script directo (Recomendado en Windows):**
   Hacé doble clic en el archivo:
   👉 **`iniciar_sakura.bat`**

2. **Vía terminal de comandos:**
   ```powershell
   npm run tauri dev
   ```

### Compilar para Producción (Instalador .exe / .msi)

```powershell
npm run tauri build
```
El instalador generado se ubicará en `src-tauri/target/release/bundle/nsis/`.

---

## 📁 Estructura del Proyecto

```text
Sakura_Music/
├── src/                         # Código fuente Frontend (React + TypeScript)
│   ├── App.tsx                  # Componente principal (UI, Player, Editor, Descargas)
│   ├── main.tsx                 # Punto de entrada de React
│   └── index.css                # Estilos globales y Tailwind CSS
├── src-tauri/                   # Backend nativo en Rust
│   ├── src/
│   │   ├── lib.rs               # Registro de comandos Tauri e inicialización
│   │   ├── main.rs              # Punto de entrada de la aplicación desktop
│   │   ├── scanner.rs           # Motor de escaneo Rayon y editor Lofty en memoria
│   │   └── downloader.rs        # Orquestación de yt-dlp y eventos de descarga
│   ├── Cargo.toml               # Dependencias de Rust
│   └── tauri.conf.json          # Configuración de ventana, plugins y permisos Tauri
├── docs/                        # Documentación técnica completa y manuales
│   ├── README.md                # Índice general de la documentación
│   ├── arquitectura.md          # Especificación de capas y modelo de hilos
│   ├── manual/                  # Manuales de usuario paso a paso
│   │   ├── instalacion.md       # Guía de instalación y dependencias
│   │   ├── biblioteca.md        # Uso de la biblioteca y vistas
│   │   ├── metadatos-y-letras.md# Editor de metadatos y catálogo
│   │   └── buscar-y-descargar.md# Descargas y búsqueda en YouTube
│   └── adr/                     # Registros de Decisiones de Arquitectura
│       └── 0009-migracion-tauri-2-rust.md  # Migración a Tauri 2 y Rust
├── legacy_python/               # Versión 1.0 histórica (Python + PySide6)
├── iniciar_sakura.bat           # Lanzador nativo de conveniencia para Windows
└── package.json                 # Scripts y dependencias de Node.js
```

---

## 📚 Documentación Adicional

Para más detalles sobre el funcionamiento interno, diseño y casos de uso, consulta la carpeta [`docs/`](docs/README.md):
- [Manual de Usuario](docs/manual/README.md)
- [Arquitectura del Sistema](docs/arquitectura.md)
- [Registro de Decisiones Técnicas (ADR)](docs/adr/README.md)
- [Casos de Uso](docs/casos-de-uso.md)

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
