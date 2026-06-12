

<p align="center">
  <img src="build/icon.png" alt="Sakura Music" width="120" />
</p>

<h1 align="center">🌸 Sakura Music</h1>

<p align="center">
  <strong>Gestor y descargador de música con interfaz visual temática</strong>
  <br />
  Japonés · Chino · Retro · Cyberpunk · Minimalista
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-instalación">Instalación</a> •
  <a href="#-layouts">Layouts</a> •
  <a href="#-temas">Temas</a> •
  <a href="#-stack">Stack</a> •
  <a href="#-estructura">Estructura</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Electron-33-blue?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Windows-ready-0078D4?logo=windows&logoColor=white" alt="Windows" />
  <img src="https://img.shields.io/badge/Vitest-6E9F18?logo=vitest&logoColor=white" alt="Vitest" />
  <img src="https://img.shields.io/badge/Zustand-443E38?logo=react&logoColor=white" alt="Zustand" />
</p>

---

https://github.com/user-attachments/assets/ee65e2a7-ca27-46a9-92f0-cb9f7ba3a2ec

---

## ✨ Features

<table>
  <tr>
    <td width="50%">
      <h3>🎧 Descargas</h3>
      <ul>
        <li>MP3, M4A y Video (hasta 4K)</li>
        <li>Calidad seleccionable (320 kbps · 1080p · 2160p)</li>
        <li>Organización automática Artista/Álbum</li>
        <li>Soporte para cookies de navegador</li>
        <li>Actualización integrada de yt-dlp y ffmpeg</li>
        <li><strong>Descarga directa desde resultados de búsqueda</strong></li>
        <li>Botón "Descargar" con feedback visual (spinner + check)</li>
        <li>Envío a cola desde resultados de búsqueda</li>
      </ul>
    </td>
    <td width="50%">
      <h3>📚 Biblioteca</h3>
      <ul>
        <li>26 layouts visuales intercambiables</li>
        <li>Exploración por carpetas del sistema</li>
        <li>Editor de metadatos incorporado</li>
        <li>Portadas de álbumes</li>
        <li>Vista de información detallada</li>
      </ul>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <h3>🎵 Reproductor</h3>
      <ul>
        <li>Reproducción de audio con cola</li>
        <li>Barra de progreso interactiva</li>
        <li>Soporte para letras (LRC)</li>
        <li>Lista de reproducción dinámica</li>
        <li>Control desde bandeja del sistema</li>
        <li><strong>Volumen inicial configurable</strong> desde Ajustes</li>
        <li><strong>Atajos de teclado globales</strong> (10+ combinaciones)</li>
        <li>Limpieza de memoria audio al cambiar de canción</li>
      </ul>
    </td>
    <td width="50%">
      <h3>🎨 Temas & UI</h3>
      <ul>
        <li>16 temas de color intercambiables</li>
        <li>Paletas OKLCH profesionales</li>
        <li>Transiciones suaves entre temas</li>
        <li>Estéticas: japonesa, china, retro, cyberpunk</li>
        <li>Tema aplicado en tiempo real sin recarga</li>
        <li><strong>Partículas decorativas configurables por tema</strong></li>
        <li>Página de Ajustes con 8 secciones organizadas</li>
        <li><strong>Reset de configuración con confirmación</strong></li>
      </ul>
    </td>
  </tr>
</table>

---

## 🚀 Instalación

```bash
# Requisitos: Node.js 18+ y npm 9+
git clone https://github.com/YordanoCS1/sakura-music.git
cd sakura-music

npm install           # Instalar dependencias
npm run dev           # Modo desarrollo (Vite + Electron)
npm run build         # Build producción
npm run start         # Ejecutar con build existente
```

---

## 🎨 Layouts

La biblioteca cuenta con **26 layouts visuales** que transforman por completo la experiencia de exploración musical. Cada uno tiene una disposición, animaciones y estética únicas.

| # | Layout | Estilo | Descripción |
|---|--------|--------|-------------|
| 1 | **Glassmorphism** | 🌫️ | Cristal oscuro con cuadrícula de portadas |
| 2 | **Lista Minimalista** | 📋 | Tabla limpia con columnas ordenables |
| 3 | **Masonry Grid** | 🧱 | Cuadrícula escalonada tipo Pinterest |
| 4 | **Vista Dividida** | 📐 | Panel triple profesional |
| 5 | **Carrusel** | 🎠 | Cover-flow horizontal con foco central |
| 6 | **Mosaico** | 🧩 | Cuadrícula con tamaños variables |
| 7 | **Feed** | 📜 | Columna vertical tipo playlist |
| 8 | **Índice A-Z** | 📇 | Agrupación alfabética tipo agenda |
| 9 | **Galería** | 🖼️ | Marcos de cuadro con paginación |
| 10 | **City Pop** | 🌆 | Estética retro 80s japonesa con degradados atardecer |
| 11 | **Tokyo Neon** | 🌃 | Shibuya nocturno con bordes neón |
| 12 | **Kawaii Dream** | ☁️ | Nubes y estrellas flotantes pastel |
| 13 | **Visual Kei** | 🥀 | Gótico victoriano con dorado vibrante |
| 14 | **Zen Garden** | 🪨 | Jardín japonés karesansui con rollos colgantes |
| 15 | **Retro Wave** | 🌴 | Vaporwave con neón púrpura/rosa |
| 16 | **Anime OP** | ⚡ | Paneles de manga con líneas de velocidad |
| 17 | **Yōkai** | 🏮 | Folclore nocturno con linternas fantasma |
| 18 | **Ciudad Prohibida** | 🏯 | Palacio imperial chino con abanicos de seda |
| 19 | **Erudito** | 🖌️ | Caligrafía china con tinta y bambú |
| 20 | **Porcelana Azul** | 🏺 | Cerámica Ming azul y blanca en platos |
| 21 | **Dragón Celestial** | 🐉 | Dragón chino con nubes doradas |
| 22 | **Festival** | 🏮 | Festival de linternas rojas con borlas |
| 23 | **Jade** | 🟢 | Muro de jade tallado con nichos dorados |
| 24 | **Vinilo** | 💿 | Discos de vinilo girando en el tornamesa |
| 25 | **Casete** | 📼 | Cintas de casete retro en el estante |
| 26 | **Estudio** | 🎛️ | Consola de grabación con rack de efectos |

---

## 🎨 Temas

Cada tema redefine completamente la paleta de color de la aplicación usando variables CSS con espacio de color **OKLCH** para precisión cromática.

<table>
  <tr>
    <th>Tema</th>
    <th>Paleta</th>
    <th>Vibra</th>
  </tr>
  <tr>
    <td><strong>Sakura</strong></td>
    <td><code>#cc1a4a</code> · rosa · blanco</td>
    <td>🌈 Elegante, primaveral</td>
  </tr>
  <tr>
    <td><strong>City Pop</strong></td>
    <td><code>#F95738</code> · naranja · cian</td>
    <td>🌴 Retro 80s, veraniego</td>
  </tr>
  <tr>
    <td><strong>Tokyo Neón</strong></td>
    <td><code>#FF1493</code> · rosa · cian</td>
    <td>🌃 Cyberpunk, nocturno</td>
  </tr>
  <tr>
    <td><strong>Wabi-Sabi</strong></td>
    <td><code>#C23B22</code> · tierra · papel</td>
    <td>🍂 Natural, sereno</td>
  </tr>
  <tr>
    <td><strong>Vaporwave</strong></td>
    <td><code>#FF6B9D</code> · púrpura · rosa</td>
    <td>🌴 Retro, neón suave</td>
  </tr>
  <tr>
    <td><strong>Anime OP</strong></td>
    <td><code>#1E90FF</code> · azul · naranja</td>
    <td>⚡ Brillante, dinámico</td>
  </tr>
  <tr>
    <td><strong>Yōkai</strong></td>
    <td><code>#c0392b</code> · rojo oscuro</td>
    <td>🏮 Tenebroso, místico</td>
  </tr>
  <tr>
    <td><strong>Ciudad Prohibida</strong></td>
    <td><code>#c0392b</code> · rojo · oro</td>
    <td>🏯 Imperial, majestuoso</td>
  </tr>
  <tr>
    <td><strong>Erudito</strong></td>
    <td><code>#1a1a1a</code> · tinta · pergamino</td>
    <td>🖌️ Clásico, académico</td>
  </tr>
  <tr>
    <td><strong>Porcelana Azul</strong></td>
    <td><code>#2a6a9a</code> · cobalto · marfil</td>
    <td>🏺 Ming, refinado</td>
  </tr>
  <tr>
    <td><strong>Dragón Celestial</strong></td>
    <td><code>#2a8a5a</code> · jade · oro</td>
    <td>🐉 Mítico, celestial</td>
  </tr>
  <tr>
    <td><strong>Festival</strong></td>
    <td><code>#d4a017</code> · rojo · dorado</td>
    <td>🎉 Festivo, vibrante</td>
  </tr>
  <tr>
    <td><strong>Jade</strong></td>
    <td><code>#2d5a3a</code> · verde · oro</td>
    <td>🟢 Elegante, natural</td>
  </tr>
  <tr>
    <td><strong>Bambú</strong></td>
    <td><code>#4a7c59</code> · verde bosque</td>
    <td>🎋 Sereno, natural</td>
  </tr>
  <tr>
    <td><strong>Atardecer</strong></td>
    <td><code>#e86a33</code> · naranja · dorado</td>
    <td>🌅 Cálido, crepuscular</td>
  </tr>
  <tr>
    <td><strong>Hielo</strong></td>
    <td><code>#5bc0de</code> · azul cristal</td>
    <td>❄️ Frío, puro</td>
  </tr>
</table>

---

## 🧱 Stack tecnológico

<p align="center">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white" />
</p>

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Frontend** | React 19 + TypeScript | UI component-based |
| **Build** | Vite 5 | Bundler rápido con HMR |
| **Estado global** | Zustand | Estado del reproductor centralizado |
| **Animaciones** | Framer Motion | Transiciones fluidas y gestos |
| **Iconos** | Lucide React | Iconografía limpia y consistente |
| **Estilos** | Tailwind CSS 3 + CSS custom properties | Diseño atómico + theming dinámico |
| **Color** | OKLCH | Precisión cromática en los temas |
| **Desktop** | Electron 33 | Aplicación de escritorio nativa |
| **Descargas** | yt-dlp + fluent-ffmpeg | Motor de descarga y conversión |
| **Testing** | Vitest + @testing-library/react | Tests unitarios (13 tests) |
| **E2E** | Playwright | Tests de flujos críticos |

---

## ⚡ Optimizaciones y calidad

| Área | Mejora |
|------|--------|
| **Rendimiento** | `loadPath`, `updateBreadcrumbs`, `loadMetadataForFiles` envueltas en `useCallback` — evita renders innecesarios del layout |
| **Estabilidad** | `loadTrending` con `try/catch` — evita unhandled promise rejection al cargar tendencias |
| **Código** | Importación estática de `musicDir` en vez de `await import()` dinámico |
| **Compatibilidad** | Normalización de rutas Windows (`replace(/\\/g, '/')`) — paths consistentes en todos los SO |
| **Testing** | 13 tests unitarios (Vitest) para `hashStr`, `formatDuration` y `formatSize` |

---

## 📁 Estructura del proyecto

```
📦 sakura-music
├── 📂 build/                    # Iconos y assets de empaquetado
│   ├── icon.ico / icon.png
│   └── icons/                  # Múltiples resoluciones (16px-512px)
├── 📂 dist/                     # Build de producción (generado)
├── 📂 electron/                 # 🖥️ Proceso principal
│   ├── 📂 core/
│   │   └── dependency-manager.js   # Gestión de yt-dlp/ffmpeg
│   ├── 📂 ipc/
│   │   ├── ipc-download.js      # API de descargas
│   │   ├── ipc-home.js          # API de inicio
│   │   ├── ipc-library.js       # API de biblioteca
│   │   ├── ipc-queue.js         # API de cola
│   │   └── ipc-search.js        # API de búsqueda
│   ├── covers.js                # Gestión de portadas
│   ├── logger.js                # Logging
│   ├── main.js                  # Entry point Electron
│   ├── notifier.js              # Notificaciones del sistema
│   ├── preload.js               # Bridge IPC seguro
│   ├── tray.js                  # Bandeja del sistema
│   └── taskbar-progress.js      # Progreso en barra de tareas
├── 📂 src/                      # 🎨 Frontend (renderer)
│   ├── 📂 components/
│   │   ├── 📂 library/          # 26 layouts visuales
│   │   │   ├── LayoutGlass.tsx
│   │   │   ├── LayoutCityPop.tsx
│   │   │   ├── LayoutKawaii.tsx
│   │   │   ├── LayoutJade.tsx
│   │   │   ├── LayoutVinilo.tsx
│   │   │   ├── LayoutCasete.tsx
│   │   │   ├── LayoutEstudio.tsx
│   │   │   └── ... (26 en total)
│   │   ├── 📂 shared/           # Componentes reutilizables
│   │   │   ├── SelectionBar.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   └── EmptyState.tsx
│   │   ├── ZenPlayer.tsx        # Reproductor
│   │   ├── InfoPanel.tsx        # Panel de metadatos
│   │   ├── MetadataEditor.tsx   # Editor ID3
│   │   ├── SakuraBackground.tsx # Fondo animado
│   │   ├── Skeleton.tsx         # Esqueletos de carga
│   │   └── ...
│   ├── 📂 contexts/
│   │   └── PlaybackContext.tsx  # Estado global de reproducción
│   ├── 📂 pages/
│   │   ├── LibraryPage.tsx      # 📚 Explorador (layout switching)
│   │   ├── DownloaderPage.tsx   # ⬇️ Descargas
│   │   ├── SettingsPage.tsx     # ⚙️ Configuración y temas
│   │   ├── SearchPage.tsx       # 🔍 Búsqueda
│   │   ├── QueuePage.tsx        # 📋 Cola de reproducción
│   │   └── HomePage.tsx         # 🏠 Inicio
│   ├── 📂 store/
│   │   └── usePlayerStore.ts    # Zustand store del reproductor
│   ├── 📂 styles/
│   │   ├── themes.css           # 16 temas completos (1700+ líneas)
│   │   └── index.css            # Estilos base y utilidades
│   ├── 📂 utils/
│   │   ├── hash.ts              # Hash determinístico para IDs
│   │   ├── format.ts            # Formateo duración y tamaño
│   │   └── lrc.ts               # Parseador de letras LRC
│   ├── App.tsx                  # Root component (routing, atajos, reproductor)
│   ├── bridge.ts                # Tipos IPC
│   └── main.tsx                 # Entry point React
├── 📂 tests/
│   ├── e2e/
│   │   ├── critical-flows.spec.ts
│   │   └── search.spec.js
│   └── unit/
│       ├── hash.test.ts          # 5 tests: hashStr determinístico
│       └── format.test.ts        # 8 tests: formatDuration / formatSize
├── package.json
├── vite.config.ts
└── README.md
```

---

## 📋 Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia Vite + Electron en modo desarrollo |
| `npm run dev:vite` | Solo frontend (Vite, sin Electron) |
| `npm run dev:electron` | Solo Electron (requiere build previo) |
| `npm run build` | Build de producción (Vite) |
| `npm run start` | Ejecuta Electron con build existente |
| `npm run test` | Tests unitarios (Vitest) |
| `npm run test:e2e` | Tests E2E con Playwright |

---

## 🖼️ Screenshots

<p align="center">
  <em>Próximamente — capturas de los layouts y temas más representativos.</em>
</p>

---

## 🧑‍💻 Autor

**YordanoCS1** — [GitHub](https://github.com/YordanoCS1)

---

<p align="center">
  <sub>Hecho con ❤️ y TypeScript</sub>
  <br />
  <sub>Sakura Music © 2026</sub>
</p>
