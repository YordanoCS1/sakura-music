# Sakura Music 🎵

Gestor y descargador de música con interfaz visual temática japonesa y china.

## ✨ Características

- **Descarga de música** desde YouTube con soporte para MP3, M4A y video (hasta 4K)
- **Explorador de biblioteca** con 20+ layouts visuales temáticos
- **Reproductor integrado** con cola de reproducción
- **Editor de metadatos** incorporado
- **Soporte para cookies** de navegador para videos con restricción de edad
- **Actualización automática** de yt-dlp y ffmpeg
- **Temas visuales**: Sakura, City Pop, Tokyo Neon, Wabi-Sabi, Vaporwave, Anime OP, Yōkai, Ciudad Prohibida, Erudito, Porcelana, Dragón Celestial, Festival, Jade y más

## 🚀 Instalación

```bash
npm install
npm run dev
```

## 🏗️ Build

```bash
npm run build
```

## 🧩 Tecnologías

- Electron + React + TypeScript
- Vite
- Framer Motion
- yt-dlp + fluent-ffmpeg
- Lucide React

## 📁 Estructura

```
src/
├── components/    # Componentes React
├── pages/         # Páginas principales
├── styles/        # Temas y estilos CSS
├── electron/      # Código del proceso principal
└── bridge/        # Puente IPC main/renderer
```
