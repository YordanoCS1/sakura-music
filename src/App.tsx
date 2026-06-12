import React, { useState, useEffect, useCallback, useMemo, useRef, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import { CustomTitleBar } from './components/CustomTitleBar';
import { SplashScreen } from './components/SplashScreen';
import { SakuraBackground } from './components/SakuraBackground';
import { ZenPlayer } from './components/ZenPlayer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Skeleton } from './components/Skeleton';
import { PlaybackProvider } from './contexts/PlaybackContext';
import type { Song } from './contexts/PlaybackContext';
import { invoke } from './bridge';
import { Home, Download, Library, List, Search, Settings, Music, type LucideIcon } from 'lucide-react';
import { usePlayerStore } from './store/usePlayerStore';

const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
const DownloaderPage = lazy(() => import('./pages/DownloaderPage').then(m => ({ default: m.DownloaderPage })));
const LibraryPage = lazy(() => import('./pages/LibraryPage').then(m => ({ default: m.LibraryPage })));
const QueuePage = lazy(() => import('./pages/QueuePage').then(m => ({ default: m.QueuePage })));
const SearchPage = lazy(() => import('./pages/SearchPage').then(m => ({ default: m.SearchPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

type Page = 'home' | 'downloader' | 'library' | 'queue' | 'search' | 'settings';

const navItems: { id: Page; label: string; icon: LucideIcon; desc: string }[] = [
  { id: 'home', label: 'Inicio', icon: Home, desc: 'Panel principal' },
  { id: 'search', label: 'Explorar', icon: Search, desc: 'Buscar música' },
  { id: 'downloader', label: 'Descargar', icon: Download, desc: 'Gestor de descargas' },
  { id: 'library', label: 'Biblioteca', icon: Library, desc: 'Tu colección' },
  { id: 'queue', label: 'Cola', icon: List, desc: 'Descargas activas' },
  { id: 'settings', label: 'Ajustes', icon: Settings, desc: 'Configuración' },
];

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  const currentSong = usePlayerStore(s => s.currentSong);
  const queue = usePlayerStore(s => s.queue);
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const togglePlay = usePlayerStore(s => s.togglePlay);
  const playNext = usePlayerStore(s => s.playNext);
  const playPrevious = usePlayerStore(s => s.playPrevious);
  const setQueue = usePlayerStore(s => s.setQueue);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'sakura';
    document.documentElement.setAttribute('data-theme', savedTheme);
    document.body.classList.add('theme-zen');
  }, []);

  useEffect(() => {
    const handlePlaySong = (e: Event) => {
      const detail = (e as CustomEvent<{ tracks?: Song[]; id: string; title: string; artist: string; cover?: string; duration: number; path: string }>).detail;
      const { tracks, ...song } = detail;
      if (tracks) {
        setQueue(tracks, song);
      } else {
        setQueue([song], song);
      }
      invoke('add_recent_song', { title: song.title, artist: song.artist, cover: song.cover, path: song.path });
    };
    window.addEventListener('play-song', handlePlaySong as EventListener);
    return () => window.removeEventListener('play-song', handlePlaySong as EventListener);
  }, [setQueue]);

  useEffect(() => {
    const unsubTrayPlay = window.electronAPI?.on('tray-play-pause', () => togglePlay());
    const unsubTrayNext = window.electronAPI?.on('tray-next', () => { playNext(); });
    const unsubTrayPrev = window.electronAPI?.on('tray-previous', () => { playPrevious(); });
    const unsubNavigate = window.electronAPI?.on('navigate', (page: unknown) => setCurrentPage(page as Page));
    return () => { unsubTrayPlay?.(); unsubTrayNext?.(); unsubTrayPrev?.(); unsubNavigate?.(); };
  }, [togglePlay, playNext, playPrevious]);

  useEffect(() => { window.electronAPI?.send('tray:set-playing', isPlaying); }, [isPlaying]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === ' ' && !ctrl) { e.preventDefault(); togglePlay(); return; }
      if (ctrl && e.key === 'ArrowRight') { e.preventDefault(); playNext(); return; }
      if (ctrl && e.key === 'ArrowLeft') { e.preventDefault(); playPrevious(); return; }
      if (ctrl && e.key === 'h') { e.preventDefault(); setCurrentPage('home'); return; }
      if (ctrl && e.key === 'd') { e.preventDefault(); setCurrentPage('downloader'); return; }
      if (ctrl && e.key === 'l') { e.preventDefault(); setCurrentPage('library'); return; }
      if (ctrl && e.key === 'f') { e.preventDefault(); setCurrentPage('search'); return; }
      if (ctrl && e.key === ',') { e.preventDefault(); setCurrentPage('settings'); return; }
      if (ctrl && e.key === 'n') { e.preventDefault(); const pages: Page[] = ['home', 'search', 'downloader', 'library', 'queue', 'settings']; const idx = pages.indexOf(currentPage); setCurrentPage(pages[(idx + 1) % pages.length]); return; }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, togglePlay, playNext, playPrevious]);



  const navigateTo = useCallback((page: string) => setCurrentPage(page as Page), []);

  const pages: Record<Page, React.ReactNode> = useMemo(() => ({
    home: <ErrorBoundary name="Home"><HomePage onNavigate={navigateTo} /></ErrorBoundary>,
    downloader: <ErrorBoundary name="Downloader"><DownloaderPage /></ErrorBoundary>,
    library: <ErrorBoundary name="Library"><LibraryPage /></ErrorBoundary>,
    queue: <ErrorBoundary name="Queue"><QueuePage /></ErrorBoundary>,
    search: <ErrorBoundary name="Search"><SearchPage onNavigate={navigateTo} /></ErrorBoundary>,
    settings: <ErrorBoundary name="Settings"><SettingsPage /></ErrorBoundary>,
  }), [navigateTo]);

  return (
    <PlaybackProvider>
    <div className="h-screen flex flex-col overflow-hidden">
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <SakuraBackground />
      <CustomTitleBar />

      <div className="flex flex-1 pt-11 min-h-0">
        <aside className="w-[210px] flex-shrink-0 flex flex-col z-20 skin-sidebar"
          style={{ background: 'var(--bg-sidebar)', backdropFilter: 'var(--sidebar-blur)', borderRight: '1px solid var(--bg-sidebar-border)' }}>
          <div className="flex items-center gap-3 px-4 pt-5 pb-6 skin-logo">
            <div className="skin-logo-icon" style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, oklch(var(--zen-sakura-base)), oklch(var(--zen-sakura-deep)))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px oklch(var(--zen-sakura-base) / 0.3)' }}>
              <Music size={17} color="white" />
            </div>
            <div className="min-w-0 skin-logo-text">
              <h1 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>Sakura Music</h1>
              <p className="skin-logo-sub text-[9px] tracking-wider" style={{ color: 'var(--text-dim)' }}>GESTOR MUSICAL</p>
            </div>
          </div>

          <nav className="flex-1 px-2.5 space-y-0.5 overflow-y-auto skin-nav">
            {navItems.map(({ id, label, icon: Icon, desc }) => {
              const isActive = currentPage === id;
              const isHovered = hoveredNav === id;
              return (
                <motion.button key={id} whileTap={{ scale: 0.97 }}
                  onClick={() => setCurrentPage(id)}
                  onMouseEnter={() => setHoveredNav(id)}
                  onMouseLeave={() => setHoveredNav(null)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 text-left skin-nav-item"
                  style={{
                    background: isActive ? 'var(--bg-accent-active)' : isHovered ? 'var(--bg-hover)' : 'transparent',
                  }}>
                  <div className="skin-nav-icon" style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: isActive ? 'oklch(var(--zen-sakura-base))' : 'transparent', transition: 'all 0.15s' }}>
                    <Icon size={15} color={isActive ? 'var(--text-active)' : 'var(--text-icon)'} />
                  </div>
                  <div className="flex-1 min-w-0 skin-nav-content">
                    <span className="skin-nav-text text-sm block truncate" style={{ color: isActive ? 'var(--text-active)' : 'var(--text-nav)', fontWeight: isActive ? 600 : 400, transition: 'color 0.15s' }}>{label}</span>
                    {isActive && <span className="skin-nav-desc text-[9px] block truncate" style={{ color: 'var(--text-dim)' }}>{desc}</span>}
                  </div>
                  {isActive && <motion.div layoutId="navIndicator" className="skin-indicator" style={{ width: 3, height: 20, borderRadius: 2, background: 'oklch(var(--zen-sakura-base))', boxShadow: '0 0 8px oklch(var(--zen-sakura-base) / 0.5)' }} />}
                </motion.button>
              );
            })}
          </nav>

          <div className="skin-footer px-5 py-4 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-divider)' }}>
            <div className="skin-version-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px #22c55e66' }} />
            <span className="skin-version-text text-[10px]" style={{ color: 'var(--text-dim)' }}>v1.0.0</span>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 overflow-y-auto px-10 pb-28 pt-6">
            <AnimatePresence mode="wait">
              <motion.div key={currentPage}
                initial={{ opacity: 0, scale: 0.96, filter: 'blur(2px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.02, filter: 'blur(4px)' }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}>
                <Suspense fallback={<div className="p-8 space-y-4"><Skeleton width="60%" height={28} borderRadius={8} /><Skeleton width="40%" height={16} borderRadius={6} /><div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">{[1,2,3,4].map(i => <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}><div className="w-9 h-9 rounded-xl mb-3 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /><div className="h-6 w-16 rounded mb-2 animate-pulse" style={{ background: 'rgba(255,255,255,0.04)' }} /><div className="h-3 w-20 rounded animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} /></div>)}</div></div>}>
                  {pages[currentPage]}
                </Suspense>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      <div className="skin-player">
        <ZenPlayer currentSong={currentSong || undefined} isPlaying={isPlaying} onPlayPause={togglePlay} onNext={playNext} onPrevious={playPrevious} queue={queue} />
      </div>

      <Toaster position="bottom-right" toastOptions={{
        style: { background: 'var(--toast-bg)', color: 'var(--text-body)', borderRadius: '12px', border: 'var(--toast-border)', fontSize: '13px', boxShadow: 'var(--toast-shadow)' },
        duration: 3000,
      }} />
    </div>
    </PlaybackProvider>
  );
};
