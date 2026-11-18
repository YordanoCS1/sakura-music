import type { MouseEvent } from 'react';
import { ChevronLeft, Folder, FolderOpen, Pencil, Trash2 } from 'lucide-react';
import type { FolderExplorerData, ScannedTrack, ThemeMode } from '../types';
import EmptyState from './EmptyState';

interface ThemeLibraryProps {
  theme: ThemeMode;
  tracks: ScannedTrack[];
  favorites: string[];
  activeTrack: ScannedTrack | null;
  isPlaying: boolean;
  getCoverSrc: (coverUrl: string | null) => string;
  currentFolderNav: string[];
  folderExplorerData: FolderExplorerData;
  onPlayTrack: (track: ScannedTrack) => void;
  onToggleFavorite: (id: string, e: MouseEvent) => void;
  onOpenFolderDialog: () => void;
  onScanFolder: (folder: string) => void;
  onNavigateUp: () => void;
  onNavigateToBreadcrumb: (index: number) => void;
  onNavigateIntoFolder: (name: string) => void;
  onShowAll: () => void;
  onOpenEdit: (track: ScannedTrack) => void;
  onRequestDelete: (track: ScannedTrack) => void;
}

/** Biblioteca propia de los temas orientalistas: no usa las 9 vistas genéricas. */
export default function ThemeLibrary({
  theme,
  tracks,
  favorites,
  activeTrack,
  isPlaying,
  getCoverSrc,
  currentFolderNav,
  folderExplorerData,
  onPlayTrack,
  onToggleFavorite,
  onOpenFolderDialog,
  onScanFolder,
  onNavigateUp,
  onNavigateToBreadcrumb,
  onNavigateIntoFolder,
  onShowAll,
  onOpenEdit,
  onRequestDelete,
}: ThemeLibraryProps) {
  if (theme !== 'sumie' && theme !== 'byobu') return null;

  const encabezado = (
    <header className="theme-library-head">
      <div className="theme-library-nav">
        <button
          type="button"
          onClick={onShowAll}
          className={currentFolderNav.length === 0 ? 'is-active' : ''}
        >
          Todas juntas
        </button>
        <button
          type="button"
          onClick={onNavigateUp}
          disabled={currentFolderNav.length === 0}
          aria-label="Subir un nivel"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <button type="button" onClick={onOpenFolderDialog}>
          <FolderOpen className="w-3.5 h-3.5" /> Elegir carpeta
        </button>
        {currentFolderNav.map((parte, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onNavigateToBreadcrumb(i)}
            className={i === currentFolderNav.length - 1 ? 'is-active' : ''}
          >
            {parte}
          </button>
        ))}
      </div>
      <p className="theme-library-count">{tracks.length} piezas en esta vista</p>
    </header>
  );

  const subcarpetas = folderExplorerData.subfolders.slice(0, 12);
  const selectorCarpetas = subcarpetas.length > 0 && (
    <div className="theme-folders">
      <span className="theme-folders-label">Carpetas</span>
      {subcarpetas.map((carpeta) => (
        <button
          key={carpeta.relativePath}
          type="button"
          onClick={() => onNavigateIntoFolder(carpeta.name)}
        >
          <Folder className="w-3.5 h-3.5" />
          {carpeta.name}
          <small>{carpeta.trackCount}</small>
        </button>
      ))}
    </div>
  );

  const vacio = (
    <EmptyState
      titulo="Aún no hay piezas"
      descripcion="Elegí una carpeta o escaneá la biblioteca para indexar tus títulos, artistas y portadas."
      accion={
        <div className="theme-empty-actions">
          <button type="button" onClick={onOpenFolderDialog} className="cta">
            Elegir carpeta
          </button>
          {folderExplorerData.currentPathStr && (
            <button
              type="button"
              onClick={() => onScanFolder(folderExplorerData.currentPathStr)}
              className="cta"
            >
              Escanear esta carpeta
            </button>
          )}
        </div>
      }
    />
  );

  if (theme === 'sumie') {
    return (
      <div className="sumie-library">
        {encabezado}
        {selectorCarpetas}
        {tracks.length === 0 ? (
          vacio
        ) : (
          <div className="sumie-hojas">
            {tracks.map((track, i) => (
              <div
                key={track.id}
                className={`sumie-hoja ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                style={{ rotate: `${i % 2 === 0 ? '-0.5' : '0.5'}deg` }}
              >
                <button
                  type="button"
                  className="sumie-play"
                  onClick={() => onPlayTrack(track)}
                  aria-label={`Reproducir ${track.title}`}
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
                </button>
                <div className="sumie-texto">
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} · {track.album}
                  </small>
                  <em>
                    {track.format} · {track.year ?? '—'}
                  </em>
                </div>
                <span className="sumie-dur">{track.duration_str}</span>
                <div className="theme-row-actions">
                  <button
                    type="button"
                    onClick={(e) => onToggleFavorite(track.id, e)}
                    aria-label="Favorito"
                    className={favorites.includes(track.id) ? 'is-fav' : ''}
                  >
                    ♡
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenEdit(track)}
                    aria-label="Editar metadatos"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(track)}
                    aria-label="Eliminar canción"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const protagonista = activeTrack ?? tracks[0] ?? null;
  const portada = protagonista?.cover_url ? getCoverSrc(protagonista.cover_url) : null;
  return (
    <div className="byobu-library">
      {encabezado}
      {selectorCarpetas}
      {tracks.length === 0 ? (
        vacio
      ) : (
        <div className="byobu-diptico">
          <aside
            className="byobu-panel"
            style={
              portada
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(10,8,7,.35), rgba(10,8,7,.92)), url("${portada}")`,
                  }
                : undefined
            }
          >
            <span className="byobu-kanji" aria-hidden="true">
              蔵
            </span>
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
              <li key={track.id} className={activeTrack?.id === track.id ? 'is-active' : ''}>
                <button type="button" className="byobu-fila" onClick={() => onPlayTrack(track)}>
                  <span className="byobu-num">{String(i + 1).padStart(2, '0')}</span>
                  <span className="byobu-titulo">{track.title}</span>
                  <span className="byobu-art">{track.artist}</span>
                  <span className="byobu-dur">{track.duration_str}</span>
                </button>
                <div className="theme-row-actions">
                  <button
                    type="button"
                    onClick={() => onOpenEdit(track)}
                    aria-label="Editar metadatos"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(track)}
                    aria-label="Eliminar canción"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
