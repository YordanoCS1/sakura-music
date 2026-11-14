import { useLayoutEffect, useRef, useState } from 'react';
import { DownloadCloud, Heart, Home, Library, Search, Settings } from 'lucide-react';
import type { AppTab, DownloadItem } from '../types';

interface ZenTopNavProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  trackCount: number;
  downloads: DownloadItem[];
}

const items: { id: AppTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'library', label: 'Biblioteca', icon: Library },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'queue', label: 'Cola', icon: DownloadCloud },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function ZenTopNav({ activeTab, onNavigate, trackCount, downloads }: ZenTopNavProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [slider, setSlider] = useState<{ left: number; width: number } | null>(null);

  const activeDownloads = downloads.filter(
    d => !d.status.startsWith('completado') && !d.status.includes('error') && d.status !== 'cancelado'
  ).length;

  // Coloca el indicador deslizante bajo la pestaña activa.
  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const btn = btnRefs.current[activeTab];
    if (!tabs || !btn) return;
    const tabsRect = tabs.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setSlider({ left: btnRect.left - tabsRect.left, width: btnRect.width });
  }, [activeTab]);

  return (
    <div className="zen-topnav" role="navigation" aria-label="Navegación principal">
      <div className="zen-topnav-brand">
        <span className="zen-topnav-brand-mark" aria-hidden="true">
          <span className="zen-topnav-vinyl" />
          <span className="zen-topnav-label">桜</span>
        </span>
        <div className="zen-topnav-brand-copy">
          <strong>Sakura</strong>
          <small>M3 · Zen</small>
        </div>
      </div>

      <div className="zen-topnav-tabs" role="tablist" aria-label="Secciones de la aplicación" ref={tabsRef}>
        <span
          className="zen-topnav-slider"
          aria-hidden="true"
          style={slider ? { transform: `translate(${slider.left}px, -50%)`, width: `${slider.width}px` } : undefined}
        />
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const count = id === 'library' ? trackCount : id === 'queue' ? activeDownloads : 0;
          return (
            <button
              key={id}
              ref={el => { btnRefs.current[id] = el; }}
              type="button"
              onClick={() => onNavigate(id)}
              aria-current={active ? 'page' : undefined}
              className={`zen-topnav-tab ${active ? 'is-active' : ''}`}>
              <Icon className="zen-topnav-tab-icon" />
              <span className="zen-topnav-tab-label">{label}</span>
              {count > 0 && <span className="zen-topnav-tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="zen-topnav-meta">
        <span className="zen-topnav-chip">
          <Heart className="zen-topnav-chip-icon" />
          {trackCount} pistas
        </span>
      </div>
    </div>
  );
}