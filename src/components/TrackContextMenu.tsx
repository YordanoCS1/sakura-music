import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '../lib/puente';
import { Edit3, Heart, ListPlus, Pause, Play, Trash2, X } from 'lucide-react';
import type { Playlist, ScannedTrack, ThemeMode } from '../types';
import { sonidoUI } from '../lib/sonidos';

interface TrackContextMenuProps {
  x: number;
  y: number;
  theme: ThemeMode;
  track: ScannedTrack;
  esFav: boolean;
  isPlaying: boolean;
  onClose: () => void;
  onPlay: () => void;
  onPlayNext: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAviso: (mensaje: string) => void;
}

/** Menú contextual de una pista, con estampa por tema. */
export default function TrackContextMenu(props: TrackContextMenuProps) {
  const {
    x,
    y,
    theme,
    track,
    esFav,
    isPlaying,
    onClose,
    onPlay,
    onPlayNext,
    onToggleFavorite,
    onEdit,
    onDelete,
    onAviso,
  } = props;
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [mostrarPlaylists, setMostrarPlaylists] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sonidoUI(theme, 'open');
    invoke<Playlist[]>('list_playlists')
      .then((lista) => setPlaylists(lista ?? []))
      .catch(() => setPlaylists([]));
    const cerrar = (evento: MouseEvent) => {
      if (!ref.current?.contains(evento.target as Node)) onClose();
    };
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
    };
    window.addEventListener('mousedown', cerrar);
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('mousedown', cerrar);
      window.removeEventListener('keydown', tecla);
    };
  }, [onClose, theme]);

  const ejecutar = (accion: () => void) => {
    sonidoUI(theme, 'click');
    accion();
    onClose();
  };

  const anadirAPlaylist = async (lista: Playlist) => {
    sonidoUI(theme, 'confirm');
    try {
      const cantidad = await invoke<number>('playlist_add_tracks', {
        id: lista.id,
        paths: [track.path],
      });
      onAviso(cantidad ? `Agregada a “${lista.name}”.` : `Ya estaba en “${lista.name}”.`);
    } catch (error) {
      onAviso(`No se pudo agregar: ${String(error)}`);
    }
    onClose();
  };

  const ancho = 232;
  const alto = 300;
  const posicion = {
    left: Math.min(x, window.innerWidth - ancho - 12),
    top: Math.min(y, window.innerHeight - alto - 12),
  };

  return createPortal(
    <div
      ref={ref}
      className={`ctx-menu tema-${theme}`}
      style={posicion}
      role="menu"
      aria-label={`Acciones para ${track.title}`}
    >
      <div className="ctx-cab">
        <strong>{track.title}</strong>
        <small>{track.artist}</small>
        <button type="button" onClick={onClose} aria-label="Cerrar menú">
          <X className="w-3 h-3" />
        </button>
      </div>

      <button type="button" role="menuitem" onClick={() => ejecutar(onPlay)}>
        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        {isPlaying ? 'Pausar' : 'Reproducir'}
      </button>
      <button type="button" role="menuitem" onClick={() => ejecutar(onPlayNext)}>
        <Play className="w-3.5 h-3.5" /> Reproducir después
      </button>
      <div className="ctx-sep" />
      <button type="button" role="menuitem" onClick={() => setMostrarPlaylists((valor) => !valor)}>
        <ListPlus className="w-3.5 h-3.5" /> Añadir a playlist
        <span className="ctx-flecha">›</span>
      </button>
      {mostrarPlaylists && (
        <div className="ctx-submenu">
          {playlists.length === 0 && <small>No hay listas todavía.</small>}
          {playlists.map((lista) => (
            <button key={lista.id} type="button" onClick={() => void anadirAPlaylist(lista)}>
              {lista.name} <small>{lista.track_count}</small>
            </button>
          ))}
        </div>
      )}
      <button type="button" role="menuitem" onClick={() => ejecutar(onToggleFavorite)}>
        <Heart className="w-3.5 h-3.5" fill={esFav ? 'currentColor' : 'none'} />
        {esFav ? 'Quitar de favoritas' : 'Añadir a favoritas'}
      </button>
      <div className="ctx-sep" />
      <button type="button" role="menuitem" onClick={() => ejecutar(onEdit)}>
        <Edit3 className="w-3.5 h-3.5" /> Editar metadatos
      </button>
      <button
        type="button"
        role="menuitem"
        className="ctx-peligro"
        onClick={() => ejecutar(onDelete)}
      >
        <Trash2 className="w-3.5 h-3.5" /> Eliminar canción
      </button>
    </div>,
    document.body,
  );
}
