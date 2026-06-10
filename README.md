# Sakura Music 🎵

> Un gestor y descargador de música con interfaz elegante, temas visuales inspirados en estéticas japonesas y chinas, y una biblioteca con más de 20 layouts únicos.

---

## 📖 Descripción

Sakura Music es una aplicación de escritorio construida con Electron que permite **descargar música y video** desde YouTube, **gestionar una biblioteca local** con exploración visual, **editar metadatos**, y **reproducir** tu colección con un reproductor integrado.

El proyecto destaca por su **interfaz altamente personalizable**: más de 20 layouts de biblioteca visualmente distintos, cada uno con una estética y disposición únicas. Desde mosaicos tipo Pinterest hasta biombos chinos, linternas japonesas, porcelana Ming o jade tallado.

---

## ✨ Funcionalidades

### 🎧 Descargas
- Soporte para **MP3, M4A y Video** (hasta 4K)
- Selección de calidad (320 kbps, 1080p, 2160p, etc.)
- Organización automática en carpetas Artista/Álbum
- Integración con cookies del navegador para contenido restringido
- Actualización incorporada de **yt-dlp** y **ffmpeg**

### 📚 Biblioteca
- Exploración por carpetas del sistema
- **20+ layouts visuales** intercambiables:
  - Glassmorphism, Minimalista, Masonry, Split, Carrusel, Mosaico, Feed, Índice, Galería
  - City Pop, Tokyo Neon, Kawaii Dream, Visual Kei, Zen Garden, Retro Wave
  - Anime OP, Yōkai, Ciudad Prohibida, Erudito, Porcelana Azul
  - Dragón Celestial, Festival, Jade
- Vista de información con metadatos
- Editor de metadatos integrado
- Portadas de álbumes

### 🎵 Reproductor
- Reproducción de audio con cola
- Barra de progreso, controles de reproducción
- Soporte para letras (LRC)
- Lista de reproducción (queue)

### 🎨 Temas visuales
- **13 temas de color** intercambiables en tiempo real
- Paletas cuidadosamente diseñadas con OKLCH
- Transiciones suaves entre temas
- Estética japonesa, china, retro, cyberpunk y más

---

## 🚀 Instalación

```bash
# Clonar
git clone https://github.com/YordanoCS1/sakura-music.git
cd sakura-music

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Build para producción
npm run build
```

### Requisitos

- Node.js 18+
- npm 9+
- Windows (la app está desarrollada para Windows)

---

## 🧱 Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + TypeScript |
| UI/Animaciones | Framer Motion, Lucide React |
| Estilos | Tailwind CSS, OKLCH, CSS custom properties |
| Build | Vite 5 |
| Desktop | Electron 33 |
| Descargas | yt-dlp + fluent-ffmpeg |
| Testing | Playwright |

---

## 📁 Estructura del proyecto

```
sakura-music/
├── build/                    # Assets para build (iconos, etc.)
├── dist/                     # Build de producción
├── electron/                 # Código del proceso principal
│   ├── core/                 # Lógica principal (descargas, dependencias)
│   ├── ipc/                  # Manejadores IPC
│   ├── main.js               # Entry point de Electron
│   ├── preload.js            # Bridge de seguridad
│   ├── covers.js             # Gestión de portadas
│   ├── tray.js               # Bandeja del sistema
│   └── ...
├── scripts/                  # Scripts de utilidad
├── src/                      # Código fuente (renderer)
│   ├── components/           # Componentes React
│   │   ├── library/          # Layouts de biblioteca (20+)
│   │   ├── ZenPlayer.tsx     # Reproductor
│   │   ├── InfoPanel.tsx     # Panel de información
│   │   ├── MetadataEditor.tsx
│   │   └── ...
│   ├── contexts/             # Contextos React
│   ├── pages/                # Páginas de la app
│   │   ├── LibraryPage.tsx   # Explorador de música
│   │   ├── DownloaderPage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── QueuePage.tsx
│   │   └── HomePage.tsx
│   ├── styles/               # Estilos y temas
│   │   ├── themes.css        # 13 temas visuales completos
│   │   └── index.css         # Estilos base
│   ├── utils/                # Utilidades
│   └── bridge.ts             # Comunicación IPC
├── tests/                    # Tests E2E
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🎨 Layouts de biblioteca

| Layout | Descripción |
|--------|-------------|
| **Glassmorphism** | Cristal oscuro con cuadrícula de portadas |
| **Lista Minimalista** | Tabla limpia con columnas ordenables |
| **Masonry Grid** | Cuadrícula escalonada tipo Pinterest |
| **Vista Dividida** | Panel triple profesional |
| **Carrusel** | Cover-flow horizontal con foco central |
| **Mosaico** | Cuadrícula con tamaños variables |
| **Feed** | Columna vertical tipo playlist |
| **Índice A-Z** | Agrupación alfabética tipo agenda |
| **Galería** | Marcos de cuadro con paginación |
| **City Pop** | Estética retro 80s japonesa |
| **Tokyo Neon** | Shibuya nocturno con neón |
| **Kawaii Dream** | Nubes y estrellas flotantes pastel |
| **Visual Kei** | Gótico victoriano con dorado |
| **Zen Garden** | Jardín japonés karesansui |
| **Retro Wave** | Vaporwave con neón púrpura |
| **Anime OP** | Paneles de manga con líneas de velocidad |
| **Yōkai** | Folclore nocturno con linternas |
| **Ciudad Prohibida** | Palacio imperial chino |
| **Erudito** | Caligrafía china con tinta |
| **Porcelana Azul** | Cerámica Ming en platos |
| **Dragón Celestial** | Dragón chino con jade y oro |
| **Festival** | Festival de linternas rojas |
| **Jade** | Muro de jade tallado con nichos |

---

## 🎨 Temas de color

| Tema | Estilo |
|------|--------|
| Sakura | Magenta vibrante, sidebar flotante |
| City Pop | Retro ochentero, rejilla y neón |
| Tokyo Neón | Shibuya, neón rosa y cian |
| Wabi-Sabi | Tierra, papel y tinta japonesa |
| Vaporwave | Púrpura neón, scanlines |
| Anime OP | Azul brillante, líneas de acción |
| Yōkai | Rojo oscuro, folklore nocturno |
| Ciudad Prohibida | Rojo imperial y oro |
| Erudito | Tinta oscura, pergamino cálido |
| Porcelana Azul | Marfil y cobalto intenso |
| Dragón Celestial | Verde jade y oro |
| Festival | Rojo vibrante y dorado |
| Jade | Verde jade cálido y dorado |

---

## ⚙️ Comandos disponibles

```bash
npm run dev          # Inicia Vite + Electron en modo desarrollo
npm run dev:vite     # Solo Vite (frontend)
npm run dev:electron # Solo Electron
npm run build        # Build de producción
npm run start        # Inicia Electron con build existente
npm run test:e2e     # Tests E2E con Playwright
```

---

## 📄 Licencia

Este proyecto es de uso personal y educativo.
