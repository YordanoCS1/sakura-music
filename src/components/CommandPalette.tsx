import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CornerDownLeft,
  Home,
  ListMusic,
  Music2,
  Palette,
  Play,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Pause,
} from 'lucide-react';
import type { AppTab, ScannedTrack, ThemeMode, ThemeOption } from '../types';

interface CommandPaletteProps {
  theme: ThemeMode;
  tracks: ScannedTrack[];
  temas: ThemeOption[];
  isPlaying: boolean;
  onClose: () => void;
  onNavigate: (tab: AppTab) => void;
  onSetTheme: (id: string) => void;
  onPlayTrack: (track: ScannedTrack) => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

type Entrada = {
  id: string;
  grupo: string;
  label: string;
  pista?: string;
  icono: typeof Home;
  accion: () => void;
};

/** Paleta de comandos ⌘K / Ctrl+K. Se estampa con el tema activo. */
export default function CommandPalette({
  theme,
  tracks,
  temas,
  isPlaying,
  onClose,
  onNavigate,
  onSetTheme,
  onPlayTrack,
  onTogglePlay,
  onNext,
  onPrevious,
}: CommandPaletteProps) {
  const [consulta, setConsulta] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const entradas = useMemo<Entrada[]>(() => {
    const base: Entrada[] = [
      {
        id: 'nav-home',
        grupo: 'Ir a',
        label: 'Inicio',
        icono: Home,
        accion: () => onNavigate('home'),
      },
      {
        id: 'nav-library',
        grupo: 'Ir a',
        label: 'Biblioteca',
        icono: Music2,
        accion: () => onNavigate('library'),
      },
      {
        id: 'nav-search',
        grupo: 'Ir a',
        label: 'Buscar',
        icono: Search,
        accion: () => onNavigate('search'),
      },
      {
        id: 'nav-queue',
        grupo: 'Ir a',
        label: 'Cola de descargas',
        icono: ListMusic,
        accion: () => onNavigate('queue'),
      },
      {
        id: 'nav-playlists',
        grupo: 'Ir a',
        label: 'Playlists',
        icono: ListMusic,
        accion: () => onNavigate('playlists'),
      },
      {
        id: 'nav-settings',
        grupo: 'Ir a',
        label: 'Ajustes',
        icono: Settings,
        accion: () => onNavigate('settings'),
      },
      {
        id: 'play-toggle',
        grupo: 'Reproducción',
        label: isPlaying ? 'Pausar' : 'Reproducir',
        icono: isPlaying ? Pause : Play,
        accion: onTogglePlay,
      },
      {
        id: 'play-next',
        grupo: 'Reproducción',
        label: 'Pista siguiente',
        icono: SkipForward,
        accion: onNext,
      },
      {
        id: 'play-prev',
        grupo: 'Reproducción',
        label: 'Pista anterior',
        icono: SkipBack,
        accion: onPrevious,
      },
    ];
    const deTemas: Entrada[] = temas.map((tema) => ({
      id: `tema-${tema.id}`,
      grupo: 'Temas',
      label: `Tema: ${tema.nombre}`,
      icono: Palette,
      accion: () => onSetTheme(tema.id),
    }));
    const dePistas: Entrada[] = tracks.slice(0, 200).map((pista) => ({
      id: `pista-${pista.id}`,
      grupo: 'Pistas',
      label: pista.title,
      pista: pista.artist,
      icono: Music2,
      accion: () => onPlayTrack(pista),
    }));
    return [...base, ...deTemas, ...dePistas];
  }, [
    temas,
    tracks,
    isPlaying,
    onNavigate,
    onSetTheme,
    onPlayTrack,
    onTogglePlay,
    onNext,
    onPrevious,
  ]);

  const filtradas = useMemo(() => {
    const texto = consulta.trim().toLowerCase();
    if (!texto) return entradas.slice(0, 12);
    return entradas
      .filter((entrada) =>
        `${entrada.label} ${entrada.pista ?? ''} ${entrada.grupo}`.toLowerCase().includes(texto),
      )
      .slice(0, 14);
  }, [entradas, consulta]);

  useEffect(() => {
    setIndice(0);
  }, [consulta]);

  const ejecutar = (entrada: Entrada | undefined) => {
    if (!entrada) return;
    entrada.accion();
    onClose();
  };

  return createPortal(
    <div
      className="cmd-paleta"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de comandos"
      onClick={onClose}
    >
      <div
        className={`cmd-paleta-inner tema-${theme}`}
        onClick={(evento) => evento.stopPropagation()}
        onKeyDown={(evento) => {
          if (evento.key === 'Escape') onClose();
          if (evento.key === 'ArrowDown') {
            evento.preventDefault();
            setIndice((actual) => Math.min(actual + 1, filtradas.length - 1));
          }
          if (evento.key === 'ArrowUp') {
            evento.preventDefault();
            setIndice((actual) => Math.max(actual - 1, 0));
          }
          if (evento.key === 'Enter') {
            evento.preventDefault();
            ejecutar(filtradas[indice]);
          }
        }}
      >
        <div className="cmd-buscar">
          <Search className="w-4 h-4" aria-hidden="true" />
          <input
            ref={inputRef}
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            placeholder="Buscá canciones, temas o comandos…"
            aria-label="Buscar comandos"
          />
          <kbd>esc</kbd>
        </div>
        <div className="cmd-resultados" role="listbox">
          {filtradas.length === 0 && <p className="cmd-vacio">Sin resultados.</p>}
          {filtradas.map((entrada, posicion) => {
            const Icono = entrada.icono;
            const grupoCambia = posicion === 0 || filtradas[posicion - 1]!.grupo !== entrada.grupo;
            return (
              <div key={entrada.id}>
                {grupoCambia && <div className="cmd-grupo">{entrada.grupo}</div>}
                <button
                  type="button"
                  role="option"
                  aria-selected={posicion === indice}
                  className={`cmd-opcion ${posicion === indice ? 'is-active' : ''}`}
                  onMouseEnter={() => setIndice(posicion)}
                  onClick={() => ejecutar(entrada)}
                >
                  <Icono className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    <strong>{entrada.label}</strong>
                    {entrada.pista && <small>{entrada.pista}</small>}
                  </span>
                  {posicion === indice && <CornerDownLeft className="w-3 h-3" aria-hidden="true" />}
                </button>
              </div>
            );
          })}
        </div>
        <div className="cmd-pie">
          <span>↑↓ navegar</span>
          <span>↵ elegir</span>
          <span>esc cerrar</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
