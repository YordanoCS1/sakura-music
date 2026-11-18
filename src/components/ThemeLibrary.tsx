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
  if (
    theme !== 'sumie' &&
    theme !== 'byobu' &&
    theme !== 'shoji' &&
    theme !== 'origami' &&
    theme !== 'swiss'
  ) {
    return null;
  }

  // El hook de carpetas ya calcula las pistas de cada nivel. `filteredTracks`
  // no filtra por carpeta cuando la vista es "folders", así que en los temas
  // propios usamos directamente el resultado del explorador.
  const vistaTracks = currentFolderNav.length > 0 ? folderExplorerData.directTracks : tracks;

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
      <p className="theme-library-count">{vistaTracks.length} piezas en esta vista</p>
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

  const acciones = (track: ScannedTrack) => (
    <div className="theme-row-actions">
      <button
        type="button"
        onClick={(e) => onToggleFavorite(track.id, e)}
        aria-label="Favorito"
        className={favorites.includes(track.id) ? 'is-fav' : ''}
      >
        ♡
      </button>
      <button type="button" onClick={() => onOpenEdit(track)} aria-label="Editar metadatos">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button type="button" onClick={() => onRequestDelete(track)} aria-label="Eliminar canción">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  const portadaDe = (track: ScannedTrack) =>
    track.cover_url ? (
      <img src={getCoverSrc(track.cover_url)} alt="" />
    ) : (
      <span aria-hidden="true">桜</span>
    );

  if (theme === 'sumie') {
    return (
      <div className="sumie-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="sumie-recortes">
            {vistaTracks.map((track) => (
              <article
                key={track.id}
                className={`sumie-recorte ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="recorte-cinta" aria-hidden="true" />
                <span className="recorte-cinta recorte-cinta-abajo" aria-hidden="true" />
                <span className="recorte-sello" aria-hidden="true">
                  桜
                </span>
                <button
                  type="button"
                  className="recorte-play"
                  onClick={() => onPlayTrack(track)}
                  aria-label={`Reproducir ${track.title}`}
                >
                  <span className="recorte-portada">
                    {track.cover_url ? (
                      <img src={getCoverSrc(track.cover_url)} alt="" />
                    ) : (
                      <span aria-hidden="true">
                        {isPlaying && activeTrack?.id === track.id ? 'Ⅱ' : '♪'}
                      </span>
                    )}
                  </span>
                  <strong>{track.title}</strong>
                </button>
                <p className="recorte-meta">
                  {track.artist}
                  <br />
                  {track.album} · {track.format} · {track.duration_str}
                </p>
                <div className="theme-row-actions recorte-acciones">
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
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'shoji') {
    return (
      <div className="shoji-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="shoji-tabla">
            <div className="shoji-fila shoji-cab">
              <span>#</span>
              <span></span>
              <span>TÍTULO</span>
              <span>ARTISTA</span>
              <span>ÁLBUM</span>
              <span>TIEMPO</span>
            </div>
            {vistaTracks.map((track, i) => (
              <div
                key={track.id}
                className={`shoji-fila ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="shoji-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="shoji-portada">{portadaDe(track)}</span>
                <button type="button" className="shoji-titulo" onClick={() => onPlayTrack(track)}>
                  {track.title}
                </button>
                <span>{track.artist}</span>
                <span>{track.album}</span>
                <span className="shoji-final">
                  {acciones(track)}
                  <small>{track.duration_str}</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'origami') {
    return (
      <div className="origami-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="origami-papeles">
            {vistaTracks.map((track) => (
              <article
                key={track.id}
                className={`origami-papel ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <button type="button" className="origami-play" onClick={() => onPlayTrack(track)}>
                  <span className="origami-portada">{portadaDe(track)}</span>
                  <strong>{track.title}</strong>
                </button>
                <small>
                  {track.artist} · {track.album} · {track.duration_str}
                </small>
                {acciones(track)}
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'swiss') {
    return (
      <div className="swiss-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="swiss-tabla">
            <div className="swiss-fila swiss-cab">
              <span>Nº</span>
              <span></span>
              <span>TÍTULO</span>
              <span>ARTISTA</span>
              <span>ÁLBUM</span>
              <span>TIEMPO</span>
            </div>
            {vistaTracks.map((track, i) => (
              <div
                key={track.id}
                className={`swiss-fila ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span>{String(i + 1).padStart(2, '0')}</span>
                <span className="swiss-portada">{portadaDe(track)}</span>
                <button type="button" className="swiss-titulo" onClick={() => onPlayTrack(track)}>
                  {track.title}
                </button>
                <span>{track.artist}</span>
                <span>{track.album}</span>
                <span className="swiss-final">
                  {acciones(track)}
                  <small>{track.duration_str}</small>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="byobu-library">
      {encabezado}
      {selectorCarpetas}
      {vistaTracks.length === 0 ? (
        vacio
      ) : (
        <ol className="byobu-indice">
          {vistaTracks.map((track, i) => (
            <li key={track.id} className={activeTrack?.id === track.id ? 'is-active' : ''}>
              <button type="button" className="byobu-fila" onClick={() => onPlayTrack(track)}>
                <span className="byobu-cover">
                  {track.cover_url ? (
                    <img src={getCoverSrc(track.cover_url)} alt="" />
                  ) : (
                    <span aria-hidden="true">墨</span>
                  )}
                </span>
                <span className="byobu-num">{String(i + 1).padStart(2, '0')}</span>
                <span className="byobu-titulo">
                  {track.title}
                  <small>
                    {track.artist} · {track.album} · {track.format}
                  </small>
                </span>
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
      )}
    </div>
  );
}
