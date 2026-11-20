import { useRef, type KeyboardEvent } from 'react';
import { Search, X } from 'lucide-react';
import type { AppTab, ThemeMode } from '../types';
import { estiloIconos, iconosDe } from '../themes/themeIcons';

interface ThemeNavProps {
  theme: ThemeMode;
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  trackCount: number;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

const ITEMS: { id: AppTab; label: string }[] = [
  { id: 'home', label: 'Inicio' },
  { id: 'library', label: 'Biblioteca' },
  { id: 'search', label: 'Buscar' },
  { id: 'queue', label: 'Cola' },
  { id: 'playlists', label: 'Listas' },
  { id: 'stats', label: 'Datos' },
  { id: 'settings', label: 'Ajustes' },
];

const GLIFOS: Partial<Record<ThemeMode, string>> = {
  space: '◎',
  sumie: '墨',
  byobu: '屏',
  shoji: '障',
  origami: '折',
  swiss: '＋',
  sumiink: '墨',
  moonlit: '月',
  ledger: '帳',
  shonen: '⚡',
  ghost: '☻',
  samurai: '侍',
  kawaii: '♡',
  manga: '漫',
};

/**
 * Barra superior de los temas propios. Reemplaza el sidebar y la cabecera
 * genérica para que cada tema tenga la estructura de su bosquejo original.
 */
export default function ThemeNav({
  theme,
  activeTab,
  onNavigate,
  trackCount,
  searchQuery,
  onSearchChange,
}: ThemeNavProps) {
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const alNavegarConTeclado = (evento: KeyboardEvent<HTMLButtonElement>, id: AppTab) => {
    const indice = ITEMS.findIndex((item) => item.id === id);
    let siguiente = indice;
    if (evento.key === 'ArrowRight') siguiente = (indice + 1) % ITEMS.length;
    else if (evento.key === 'ArrowLeft') siguiente = (indice - 1 + ITEMS.length) % ITEMS.length;
    else if (evento.key === 'Home') siguiente = 0;
    else if (evento.key === 'End') siguiente = ITEMS.length - 1;
    else return;
    evento.preventDefault();
    const destino = ITEMS[siguiente]!.id;
    onNavigate(destino);
    btnRefs.current[destino]?.focus();
  };
  const iconos = iconosDe(theme);
  const estilo = estiloIconos(theme);

  return (
    <nav
      className={`theme-nav tema-${theme}`}
      data-icon-style={estilo}
      role="navigation"
      aria-label="Navegación principal"
    >
      <span className="theme-nav-glifo" aria-hidden="true">
        {GLIFOS[theme] ?? '桜'}
      </span>
      <span className="theme-nav-name">SAKURA</span>

      <div className="theme-nav-tabs" role="tablist" aria-label="Secciones de la aplicación">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={activeTab === item.id}
            aria-controls={`panel-${item.id}`}
            tabIndex={activeTab === item.id ? 0 : -1}
            ref={(el) => {
              btnRefs.current[item.id] = el;
            }}
            className={activeTab === item.id ? 'is-active' : ''}
            onClick={() => onNavigate(item.id)}
            onKeyDown={(evento) => alNavegarConTeclado(evento, item.id)}
          >
            <span className="theme-nav-tab-icon" aria-hidden="true">
              {iconos[item.id]}
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>

      <div className="theme-nav-search">
        <Search className="w-3.5 h-3.5" aria-hidden="true" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar en tu música..."
          aria-label="Buscar en tu música"
        />
        {searchQuery && (
          <button type="button" onClick={() => onSearchChange('')} aria-label="Limpiar búsqueda">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      <span className="theme-nav-count">{trackCount} pistas</span>
    </nav>
  );
}
