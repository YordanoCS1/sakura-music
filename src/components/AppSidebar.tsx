import {
  Cpu,
  DownloadCloud,
  Home,
  Library,
  Search,
  Settings,
} from 'lucide-react';
import type { AppInfo, DownloadItem, ThemeMode, ThemeWorld } from '../types';

export type AppTab = 'home' | 'search' | 'library' | 'queue' | 'settings';

interface AppSidebarProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  worldStyle: {
    name: string;
    accentGradient: string;
    accentText: string;
    activeTabBg: string;
    glowColor: string;
    sidebarTitle: string;
    sidebarSubtitle: string;
    logoIcon: string;
  };
  isWWM: boolean;
  trackCount: number;
  downloads: DownloadItem[];
  themeWorld: ThemeWorld;
  onSetThemeWorld: (world: ThemeWorld) => void;
  theme: ThemeMode;
  onSetTheme: (theme: ThemeMode) => void;
  appInfo: AppInfo | null;
}

export default function AppSidebar({
  activeTab,
  onNavigate,
  worldStyle,
  isWWM,
  trackCount,
  downloads,
  themeWorld,
  onSetThemeWorld,
  theme,
  onSetTheme,
  appInfo,
}: AppSidebarProps) {
  const activeDownloadCount = downloads.filter(
    download =>
      !download.status.startsWith('completado') &&
      !download.status.includes('error') &&
      download.status !== 'cancelado'
  ).length;
  const isDownloading = downloads.some(download => download.status === 'descargando');
  const navigationItems = [
    { id: 'home' as const, label: 'Inicio', icon: Home },
    { id: 'library' as const, label: 'Biblioteca', icon: Library, count: trackCount },
    { id: 'search' as const, label: 'Buscar y Descargar', icon: Search },
    { id: 'queue' as const, label: 'Cola de Descargas', icon: DownloadCloud, count: activeDownloadCount, live: isDownloading },
    { id: 'settings' as const, label: 'Ajustes', icon: Settings },
  ];
  const themeOptions: { id: ThemeMode; label: string; swatch: string }[] = [
    { id: 'sakura', label: 'Sakura', swatch: 'theme-swatch-sakura' },
    { id: 'cyber', label: 'Cyan', swatch: 'theme-swatch-cyber' },
    { id: 'amber', label: 'Ámbar', swatch: 'theme-swatch-amber' },
    { id: 'emerald', label: 'Jade', swatch: 'theme-swatch-emerald' },
    { id: 'glass', label: 'Glass', swatch: 'theme-swatch-glass' },
    { id: 'retro', label: 'Vinilo', swatch: 'theme-swatch-retro' },
    { id: 'cyberpunk', label: 'Cyberpunk', swatch: 'theme-swatch-cyberpunk' },
    { id: 'artdeco', label: 'Jazz Club', swatch: 'theme-swatch-artdeco' },
    { id: 'editorial', label: 'Editorial', swatch: 'theme-swatch-editorial' },
    { id: 'shanshui', label: 'Shanshui', swatch: 'theme-swatch-shanshui' },
    { id: 'm3zen', label: 'M3 Zen', swatch: 'theme-swatch-m3zen' },
  ];

  return (
    <aside className={`app-sidebar ${isWWM ? 'app-sidebar-wuxia' : ''}`}>
      <div className="sidebar-brand">
        <div className={`sidebar-brand-mark bg-gradient-to-tr ${worldStyle.accentGradient}`}>
          {worldStyle.logoIcon}
        </div>
        <div className="sidebar-brand-copy">
          <h1>{worldStyle.sidebarTitle}</h1>
          <span>
            {worldStyle.sidebarSubtitle}
          </span>
        </div>
      </div>

      <nav className="sidebar-navigation" aria-label="Navegación principal">
        <span className="sidebar-section-label">ESPACIO DE TRABAJO</span>
        {navigationItems.map(({ id, label, icon: Icon, count, live }) => (
          <button
            key={id}
            type="button"
            onClick={() => onNavigate(id)}
            aria-current={activeTab === id ? 'page' : undefined}
            className={`sidebar-nav-item ${activeTab === id ? 'is-active' : ''}`}>
            <span className="sidebar-nav-icon"><Icon className="h-[17px] w-[17px]" /></span>
            <span className="sidebar-nav-label">{label}</span>
            {typeof count === 'number' && count > 0 && (
              <span className={`sidebar-nav-count ${id === 'queue' ? 'is-queue' : ''}`}>{count}</span>
            )}
            {live && <span className="sidebar-live-indicator" aria-label="Descarga en curso" />}
          </button>
        ))}
      </nav>

      <section className="sidebar-appearance" aria-label="Apariencia">
        <div className="sidebar-section-heading">
          <span className="sidebar-section-label">APARIENCIA</span>
          <span className="sidebar-current-world">{worldStyle.name}</span>
        </div>
        <div className="sidebar-world-switch">
          <button
            onClick={() => onSetThemeWorld('sakura_zen')}
            aria-pressed={themeWorld === 'sakura_zen'}
            className={`sidebar-world-option ${themeWorld === 'sakura_zen' ? 'is-active' : ''}`}>
            <span aria-hidden="true">🌸</span><span>Sakura</span>
          </button>
          <button
            onClick={() => onSetThemeWorld('where_winds_meet')}
            aria-pressed={themeWorld === 'where_winds_meet'}
            className={`sidebar-world-option ${themeWorld === 'where_winds_meet' ? 'is-active' : ''}`}>
            <span aria-hidden="true">🎋</span><span>Wuxia</span>
          </button>
        </div>

        <div className="sidebar-theme-heading">
          <span>Estilo visual</span>
          <span className="sidebar-theme-name">{themeOptions.find(option => option.id === theme)?.label ?? 'Sakura'}</span>
        </div>
        <div className="sidebar-theme-options" role="group" aria-label="Tema visual">
          {themeOptions.map(option => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSetTheme(option.id)}
              className={`sidebar-theme-option ${theme === option.id ? 'is-active' : ''}`}
              aria-pressed={theme === option.id}>
              <span className={`sidebar-theme-swatch ${option.swatch}`} aria-hidden="true" />
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      </section>

      <footer className="sidebar-system">
        <div className="sidebar-system-heading">
          <span className="sidebar-system-indicator"><Cpu className="h-3.5 w-3.5" /></span>
          <span>{appInfo?.engine ?? 'Tauri + Rust'}</span>
        </div>
        <div className="sidebar-system-details">
          <span>{appInfo?.rust_version ?? 'rustc'}</span>
          <span>{appInfo?.memory_usage ?? '—'}</span>
        </div>
      </footer>
    </aside>
  );
}
