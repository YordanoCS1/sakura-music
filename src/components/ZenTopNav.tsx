import { useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  BarChart3,
  DownloadCloud,
  Heart,
  Home,
  Library,
  ListMusic,
  Search,
  Settings,
} from 'lucide-react';
import type { AppTab, DownloadItem } from '../types';

interface ZenTopNavProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  trackCount: number;
  downloads: DownloadItem[];
  nombreTema?: string;
}

const items: { id: AppTab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'library', label: 'Biblioteca', icon: Library },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'queue', label: 'Cola', icon: DownloadCloud },
  { id: 'playlists', label: 'Listas', icon: ListMusic },
  { id: 'stats', label: 'Datos', icon: BarChart3 },
  { id: 'settings', label: 'Ajustes', icon: Settings },
];

export default function ZenTopNav({
  activeTab,
  onNavigate,
  trackCount,
  downloads,
  nombreTema = 'M3 Zen',
}: ZenTopNavProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [slider, setSlider] = useState<{ left: number; width: number } | null>(null);

  const activeDownloads = downloads.filter(
    (d) =>
      !d.status.startsWith('completado') && !d.status.includes('error') && d.status !== 'cancelado',
  ).length;

  // Medimos antes del paint para que el indicador aparezca ya en su sitio.
  // useLayoutEffect evita el salto visible que daría un useEffect normal.
  useLayoutEffect(() => {
    const tabs = tabsRef.current;
    const btn = btnRefs.current[activeTab];
    if (!tabs || !btn) return;
    const tabsRect = tabs.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setSlider({ left: btnRect.left - tabsRect.left, width: btnRect.width });
  }, [activeTab]);

  // Las pestañas siguen el patrón ARIA: sola la activa entra en el orden de
  // tabulación y las flechas permiten recorrerlas sin salir del teclado.
  const alNavegarConTeclado = (event: KeyboardEvent<HTMLButtonElement>, id: AppTab) => {
    const indice = items.findIndex((item) => item.id === id);
    let siguiente = indice;
    if (event.key === 'ArrowRight') siguiente = (indice + 1) % items.length;
    else if (event.key === 'ArrowLeft') siguiente = (indice - 1 + items.length) % items.length;
    else if (event.key === 'Home') siguiente = 0;
    else if (event.key === 'End') siguiente = items.length - 1;
    else return;

    event.preventDefault();
    const destino = items[siguiente].id;
    onNavigate(destino);
    btnRefs.current[destino]?.focus();
  };

  return (
    <div className="zen-topnav" role="navigation" aria-label="Navegación principal">
      <div className="zen-topnav-brand">
        <span className="zen-topnav-brand-mark" aria-hidden="true">
          <span className="zen-topnav-vinyl" />
          <span className="zen-topnav-label">桜</span>
        </span>
        <div className="zen-topnav-brand-copy">
          <strong>Sakura</strong>
          <small>{nombreTema}</small>
        </div>
      </div>

      <div
        className="zen-topnav-tabs"
        role="tablist"
        aria-label="Secciones de la aplicación"
        ref={tabsRef}
      >
        <span
          className="zen-topnav-slider"
          aria-hidden="true"
          style={
            slider
              ? { transform: `translate(${slider.left}px, -50%)`, width: `${slider.width}px` }
              : undefined
          }
        />
        {items.map(({ id, label, icon: Icon }) => {
          const active = activeTab === id;
          const count = id === 'library' ? trackCount : id === 'queue' ? activeDownloads : 0;
          return (
            <button
              key={id}
              ref={(el) => {
                btnRefs.current[id] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${id}`}
              aria-controls={`panel-${id}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onNavigate(id)}
              onKeyDown={(event) => alNavegarConTeclado(event, id)}
              className={`zen-topnav-tab ${active ? 'is-active' : ''}`}
            >
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
