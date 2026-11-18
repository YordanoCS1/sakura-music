import { ArrowRight, Search, DownloadCloud, Settings } from 'lucide-react';
import type { AppTab, ThemeMode } from '../types';

interface ThemeHomeProps {
  theme: ThemeMode;
  trackCount: number;
  onNavigate: (tab: AppTab) => void;
}

/** Portada de inicio propia de los temas orientalistas. */
export default function ThemeHome({ theme, trackCount, onNavigate }: ThemeHomeProps) {
  if (theme !== 'sumie' && theme !== 'byobu') return null;

  if (theme === 'sumie') {
    return (
      <div className="sumie-home">
        <div className="sumie-home-enso" aria-hidden="true">
          <span>桜</span>
        </div>
        <p className="sumie-home-kicker">桜 · Estudio de tinta</p>
        <h1>Bienvenido a la tinta</h1>
        <p className="sumie-home-copy">
          Tu música dispuesta como un pergamino. Elegí una carpeta y el recorrido comienza.
        </p>
        <div className="sumie-home-actions">
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onNavigate('search')}>
            <Search className="w-4 h-4" /> Buscar música
          </button>
        </div>
        <p className="sumie-home-stat">{trackCount} piezas en la colección · 100% local</p>
      </div>
    );
  }

  return (
    <div className="byobu-home">
      <aside className="byobu-home-panel">
        <span className="byobu-home-sello" aria-hidden="true">
          桜
        </span>
        <span className="byobu-home-kanji" aria-hidden="true">
          蔵
        </span>
        <div className="byobu-home-panel-copy">
          <strong>Sakura</strong>
          <small>Estudio de tinta</small>
        </div>
        <div className="byobu-home-stat">
          <strong>{trackCount}</strong>
          <span>PIEZAS EN LA COLECCIÓN</span>
        </div>
      </aside>
      <section className="byobu-home-content">
        <p className="byobu-home-kicker">蔵 · Inicio</p>
        <h1>Bienvenido a la tinta</h1>
        <p className="byobu-home-copy">
          Dos paneles, uno de tinta y otro de contenido. Tu música, dispuesta como un byōbu.
        </p>
        <div className="byobu-home-actions">
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onNavigate('search')}>
            <Search className="w-4 h-4" /> Buscar música
          </button>
        </div>
        <div className="byobu-home-links">
          <button type="button" onClick={() => onNavigate('queue')}>
            <DownloadCloud className="w-4 h-4" /> Descargas
          </button>
          <button type="button" onClick={() => onNavigate('settings')}>
            <Settings className="w-4 h-4" /> Ajustes
          </button>
        </div>
      </section>
    </div>
  );
}
