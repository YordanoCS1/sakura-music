import type { CSSProperties, MouseEvent } from 'react';
import { ChevronLeft, Folder, FolderOpen, Layers, Pencil, Trash2 } from 'lucide-react';
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
  onOpenBatch: () => void;
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
  onOpenBatch,
}: ThemeLibraryProps) {
  if (
    theme !== 'sumie' &&
    theme !== 'byobu' &&
    theme !== 'shoji' &&
    theme !== 'origami' &&
    theme !== 'swiss' &&
    theme !== 'sumiink' &&
    theme !== 'moonlit' &&
    theme !== 'ledger'
  ) {
    return null;
  }

  // El hook de carpetas ya calcula las pistas de cada nivel. `filteredTracks`
  // no filtra por carpeta cuando la vista es "folders", así que en los temas
  // propios usamos directamente el resultado del explorador.
  const vistaTracks = currentFolderNav.length > 0 ? folderExplorerData.directTracks : tracks;

  // Navegación por carpetas, compartida en lógica pero con estampa propia.
  const navCarpetas = (
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
      <button type="button" onClick={onOpenBatch} disabled={vistaTracks.length === 0}>
        <Layers className="w-3.5 h-3.5" /> Edición en lote
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
  );

  const total = vistaTracks.length;
  const encabezado = (() => {
    switch (theme) {
      case 'shoji':
        return (
          <header className="shoji-cabecera">
            <span className="shoji-cabecera-sello" aria-hidden="true">
              障
            </span>
            <div className="shoji-cabecera-tit">
              <small>01 · COLECCIÓN</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="shoji-cabecera-count">{total} piezas</span>
          </header>
        );
      case 'origami':
        return (
          <header className="origami-cabecera">
            <span className="origami-cabecera-pestana" aria-hidden="true">
              折
            </span>
            <div className="origami-cabecera-tit">
              <small>COLECCIÓN · 01</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="origami-cabecera-count">{total} piezas</span>
          </header>
        );
      case 'swiss':
        return (
          <header className="swiss-cabecera">
            <span className="swiss-cabecera-id">Colección / 01</span>
            <h1>Biblioteca</h1>
            {navCarpetas}
            <span className="swiss-cabecera-count">{total} PIEZAS</span>
          </header>
        );
      case 'sumiink':
        return (
          <header className="sumiink-cabecera">
            <div className="sumiink-cabecera-tit">
              <small>墨 · COLECCIÓN</small>
              <h1>Biblioteca</h1>
            </div>
            <span className="sumiink-cabecera-trazo" aria-hidden="true" />
            {navCarpetas}
            <span className="sumiink-cabecera-count">{total} piezas</span>
          </header>
        );
      case 'moonlit':
        return (
          <header className="moonlit-cabecera">
            <span className="moonlit-cabecera-luna" aria-hidden="true" />
            <div className="moonlit-cabecera-tit">
              <small>MOONLIT · COLECCIÓN</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="moonlit-cabecera-count">{total} piezas</span>
          </header>
        );
      case 'ledger':
        return (
          <header className="ledger-cabecera">
            <span className="ledger-cabecera-sello" aria-hidden="true">
              帳
            </span>
            <div className="ledger-cabecera-tit">
              <small>REGISTRO · 01</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="ledger-cabecera-count">{total} piezas · 100% local</span>
          </header>
        );
      default:
        return (
          <header className="theme-library-head">
            {navCarpetas}
            <p className="theme-library-count">{total} piezas en esta vista</p>
          </header>
        );
    }
  })();

  const etiquetasCarpetas: Partial<Record<ThemeMode, string>> = {
    shoji: 'Biombos',
    origami: 'Hojas',
    swiss: 'Secciones',
    sumiink: 'Trazos',
    moonlit: 'Sectores',
    ledger: 'Registros',
  };
  const subcarpetas = folderExplorerData.subfolders.slice(0, 12);
  const selectorCarpetas = subcarpetas.length > 0 && (
    <div className={`theme-folders tema-${theme}`}>
      <span className="theme-folders-label">{etiquetasCarpetas[theme] ?? 'Carpetas'}</span>
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
    const paneles = Array.from({ length: 3 }, (_, p) => vistaTracks.filter((_, i) => i % 3 === p));
    const kanjis = ['静', '桜', '音'];
    return (
      <div className="shoji-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="shoji-biombo">
            {paneles.map((grupo, p) => (
              <section className="shoji-panel-screen" key={p}>
                <span className="shoji-panel-kanji" aria-hidden="true">
                  {kanjis[p]}
                </span>
                <div className="shoji-panel-slats">
                  {grupo.map((track) => {
                    const numero = vistaTracks.indexOf(track) + 1;
                    return (
                      <article
                        key={track.id}
                        className={`shoji-slata ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                      >
                        <span className="shoji-slata-num">{String(numero).padStart(2, '0')}</span>
                        <span className="shoji-slata-portada">{portadaDe(track)}</span>
                        <button type="button" onClick={() => onPlayTrack(track)}>
                          <strong>{track.title}</strong>
                          <small>
                            {track.artist} · {track.album}
                          </small>
                        </button>
                        <span className="shoji-slata-dur">{track.duration_str}</span>
                        {acciones(track)}
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'origami') {
    const mitad = (vistaTracks.length - 1) / 2;
    return (
      <div className="origami-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="origami-abanico">
            {vistaTracks.map((track, i) => (
              <article
                key={track.id}
                className={`origami-hoja ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                style={
                  {
                    '--giro': `${(i - mitad) * 1.6}deg`,
                    '--sube': `${(i % 3) * 16}px`,
                  } as CSSProperties
                }
              >
                <button
                  type="button"
                  className="origami-hoja-play"
                  onClick={() => onPlayTrack(track)}
                >
                  <span className="origami-hoja-cara">{portadaDe(track)}</span>
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} · {track.album}
                  </small>
                </button>
                <div className="origami-hoja-pie">
                  <span>{track.duration_str}</span>
                  {acciones(track)}
                </div>
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
          <div className="swiss-modulos">
            {vistaTracks.map((track, i) => (
              <article
                key={track.id}
                className={`swiss-modulo ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="swiss-modulo-portada">{portadaDe(track)}</span>
                <span className="swiss-modulo-num">{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="swiss-modulo-tit"
                  onClick={() => onPlayTrack(track)}
                >
                  {track.title}
                </button>
                <span className="swiss-modulo-art">{track.artist}</span>
                <span className="swiss-modulo-alb">{track.album}</span>
                <div className="swiss-modulo-pie">
                  <span>{track.duration_str}</span>
                  {acciones(track)}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'sumiink') {
    return (
      <div className="sumiink-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="sumiink-rollos">
            {vistaTracks.map((track, i) => (
              <article
                key={track.id}
                className={`sumiink-rollo ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="sumiink-rollo-barra" aria-hidden="true" />
                <span className="sumiink-rollo-portada">{portadaDe(track)}</span>
                <span className="sumiink-rollo-num">{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="sumiink-rollo-tit"
                  onClick={() => onPlayTrack(track)}
                >
                  {track.title}
                </button>
                <small>
                  {track.artist} · {track.album}
                </small>
                <span className="sumiink-rollo-dur">{track.duration_str}</span>
                {acciones(track)}
                <span className="sumiink-rollo-barra" aria-hidden="true" />
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'moonlit') {
    return (
      <div className="moonlit-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="moonlit-senda">
            <span className="moonlit-luna-inicio" aria-hidden="true">
              月
            </span>
            {vistaTracks.map((track) => (
              <div
                key={track.id}
                className={`moonlit-nodo ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="moonlit-nodo-cover">{portadaDe(track)}</span>
                <button
                  type="button"
                  className="moonlit-nodo-play"
                  onClick={() => onPlayTrack(track)}
                >
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} · {track.album} · {track.duration_str}
                  </small>
                </button>
                <span className="moonlit-nodo-acc">{acciones(track)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'ledger') {
    return (
      <div className="ledger-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="ledger-mayor">
            <div className="ledger-lomo" aria-hidden="true">
              <span>帳</span>
            </div>
            <div className="ledger-hoja">
              <div className="ledger-hoja-cab">
                <span>LIBRO MAYOR · FOLIO 01</span>
                <span>{vistaTracks.length} ASIENTOS</span>
              </div>
              <div className="ledger-columnas">
                <span>Nº</span>
                <span></span>
                <span>TÍTULO</span>
                <span>ARTISTA / ÁLBUM</span>
                <span>ESTADO</span>
              </div>
              <div className="ledger-asientos">
                {vistaTracks.map((track, i) => (
                  <div
                    key={track.id}
                    className={`ledger-fila ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                  >
                    <span className="ledger-num-sello">{String(i + 1).padStart(2, '0')}</span>
                    <span className="ledger-portada">{portadaDe(track)}</span>
                    <button
                      type="button"
                      className="ledger-fila-tit"
                      onClick={() => onPlayTrack(track)}
                    >
                      {track.title}
                    </button>
                    <span className="ledger-fila-art">
                      {track.artist} · {track.album} · {track.duration_str}
                    </span>
                    <span className="ledger-fila-est">
                      <small>REGISTRADA ✓</small>
                      {acciones(track)}
                    </span>
                  </div>
                ))}
              </div>
              <span className="ledger-sello-final" aria-hidden="true">
                桜
              </span>
            </div>
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
