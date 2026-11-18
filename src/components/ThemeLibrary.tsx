import type { MouseEvent } from 'react';
import type { ScannedTrack, ThemeMode } from '../types';
import EmptyState from './EmptyState';

interface ThemeLibraryProps {
  theme: ThemeMode;
  tracks: ScannedTrack[];
  favorites: string[];
  activeTrack: ScannedTrack | null;
  isPlaying: boolean;
  getCoverSrc: (coverUrl: string | null) => string;
  onPlayTrack: (track: ScannedTrack) => void;
  onToggleFavorite: (id: string, e: MouseEvent) => void;
  onOpenFolderDialog: () => void;
}

/** Biblioteca propia de los temas orientalistas: no usa las 9 vistas genéricas. */
export default function ThemeLibrary({
  theme,
  tracks,
  favorites,
  activeTrack,
  isPlaying,
  getCoverSrc,
  onPlayTrack,
  onToggleFavorite,
  onOpenFolderDialog,
}: ThemeLibraryProps) {
  if (theme !== 'sumie' && theme !== 'byobu') return null;

  const vacio = (
    <EmptyState
      titulo="Aún no hay piezas"
      descripcion="Elige una carpeta en tu disco para que el motor en Rust indexe tus títulos, artistas y portadas."
      accion={
        <button type="button" onClick={onOpenFolderDialog} className="cta">
          Escanear carpeta de música
        </button>
      }
    />
  );

  if (theme === 'sumie') {
    return (
      <div className="sumie-library">
        <header className="sumie-library-head">
          <p className="sumie-kicker">桜 · Colección serena</p>
          <h1>Biblioteca</h1>
          <span>{tracks.length} piezas · Hojas de washi</span>
        </header>
        {tracks.length === 0 ? (
          vacio
        ) : (
          <div className="sumie-hojas">
            {tracks.map((track, i) => (
              <button
                key={track.id}
                type="button"
                className={`sumie-hoja ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                onClick={() => onPlayTrack(track)}
                style={{ rotate: `${i % 2 === 0 ? '-0.5' : '0.5'}deg` }}
              >
                <span className="sumie-sello" aria-hidden="true">
                  桜
                </span>
                <span className="sumie-portada">
                  {track.cover_url ? (
                    <img src={getCoverSrc(track.cover_url)} alt="" />
                  ) : (
                    <span>{isPlaying && activeTrack?.id === track.id ? 'Ⅱ' : '♪'}</span>
                  )}
                </span>
                <span className="sumie-texto">
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} · {track.album}
                  </small>
                  <em>
                    {track.format} · {track.year ?? '—'}
                  </em>
                </span>
                <span className="sumie-dur">{track.duration_str}</span>
                <span
                  className={`sumie-corazon ${favorites.includes(track.id) ? 'is-fav' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    favorites.includes(track.id) ? 'Quitar de favoritas' : 'Añadir a favoritas'
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(track.id, e);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onToggleFavorite(track.id, e as unknown as MouseEvent);
                    }
                  }}
                >
                  ♡
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  const protagonista = activeTrack ?? tracks[0] ?? null;
  return (
    <div className="byobu-library">
      <header className="byobu-library-head">
        <p className="byobu-kicker">蔵 · Índice de la colección</p>
        <h1>Biblioteca</h1>
        <span>{tracks.length} piezas</span>
      </header>
      {tracks.length === 0 ? (
        vacio
      ) : (
        <div className="byobu-diptico">
          <aside className="byobu-panel">
            <span className="byobu-kanji" aria-hidden="true">
              蔵
            </span>
            <div className="byobu-portada">
              {protagonista?.cover_url ? (
                <img src={getCoverSrc(protagonista.cover_url)} alt="" />
              ) : (
                <span>桜</span>
              )}
            </div>
            <p className="byobu-label">Pieza actual</p>
            <h2>{protagonista?.title ?? '—'}</h2>
            <p className="byobu-artista">{protagonista?.artist ?? '—'}</p>
            <p className="byobu-meta">
              {protagonista?.album ?? '—'} · {protagonista?.format ?? '—'} ·{' '}
              {protagonista?.duration_str ?? '—'}
            </p>
          </aside>
          <ol className="byobu-lista">
            {tracks.map((track, i) => (
              <li key={track.id}>
                <button
                  type="button"
                  className={activeTrack?.id === track.id ? 'is-active' : ''}
                  onClick={() => onPlayTrack(track)}
                >
                  <span className="byobu-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="byobu-titulo">{track.title}</span>
                  <span className="byobu-art">{track.artist}</span>
                  <span className="byobu-dur">{track.duration_str}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
