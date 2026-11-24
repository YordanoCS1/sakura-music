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
  onPresentTrack?: (track: ScannedTrack) => void;
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
  onPresentTrack,
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
    theme !== 'ledger' &&
    theme !== 'shonen' &&
    theme !== 'ghost' &&
    theme !== 'samurai' &&
    theme !== 'kawaii' &&
    theme !== 'manga' &&
    theme !== 'space'
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
      case 'shonen':
        return (
          <header className="shonen-cab">
            <span className="shonen-cab-glifo" aria-hidden="true">
              ⚡
            </span>
            <div className="shonen-cab-tit">
              <small>TEAM / BIBLIOTECA</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="shonen-cab-count">{total} PISTAS</span>
          </header>
        );
      case 'manga':
        return (
          <header className="manga-cab">
            <span className="manga-cab-glifo" aria-hidden="true">
              漫
            </span>
            <div className="manga-cab-tit">
              <small>CAPÍTULO · BIBLIOTECA</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="manga-cab-count">{total} VIÑETAS</span>
          </header>
        );
      case 'space':
        return (
          <header className="estudio-cab-lib">
            <span className="estudio-cab-lib-glifo" aria-hidden="true">
              ◎
            </span>
            <div className="estudio-cab-lib-tit">
              <small>RACK · BIBLIOTECA</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="estudio-cab-lib-count">{total} CANALES</span>
          </header>
        );
      case 'ghost':
        return (
          <header className="ghost-cab">
            <span className="ghost-cab-glifo" aria-hidden="true">
              ☻
            </span>
            <div className="ghost-cab-tit">
              <small>ESPÍRITUS · 01</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="ghost-cab-count">{total} ECOS</span>
          </header>
        );
      case 'samurai':
        return (
          <header className="samurai-cab">
            <span className="samurai-cab-glifo" aria-hidden="true">
              侍
            </span>
            <div className="samurai-cab-tit">
              <small>DOJO · 01</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="samurai-cab-count">{total} PIEZAS</span>
          </header>
        );
      case 'kawaii':
        return (
          <header className="kawaii-cab">
            <span className="kawaii-cab-glifo" aria-hidden="true">
              ♡
            </span>
            <div className="kawaii-cab-tit">
              <small>PARQUE · 01</small>
              <h1>Biblioteca</h1>
            </div>
            {navCarpetas}
            <span className="kawaii-cab-count">{total} AMIGOS</span>
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
    shonen: 'Misiones',
    ghost: 'Ecos',
    samurai: 'Formas',
    kawaii: 'Amigos',
    manga: 'Capítulos',
    space: 'Canales',
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
      descripcion="Seleccione una carpeta o escanee la biblioteca para indexar sus títulos, artistas y portadas."
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
      <img src={getCoverSrc(track.cover_url)} alt="" width={160} height={160} loading="lazy" />
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
                data-track-id={track.id}
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
                  onDoubleClick={() => onPresentTrack?.(track)}
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
                        data-track-id={track.id}
                        className={`shoji-slata ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                      >
                        <span className="shoji-slata-num">{String(numero).padStart(2, '0')}</span>
                        <span className="shoji-slata-portada">{portadaDe(track)}</span>
                        <button
                          type="button"
                          onClick={() => onPlayTrack(track)}
                          onDoubleClick={() => onPresentTrack?.(track)}
                        >
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
                data-track-id={track.id}
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
                  onDoubleClick={() => onPresentTrack?.(track)}
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
          <div className="swiss-posters">
            {vistaTracks.map((track, i) => (
              <article
                key={track.id}
                data-track-id={track.id}
                className={`swiss-poster ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  className="swiss-poster-btn"
                  onClick={() => onPlayTrack(track)}
                  onDoubleClick={() => onPresentTrack?.(track)}
                >
                  <div className="swiss-poster-img">
                    <span className="swiss-poster-num">{String(i + 1).padStart(2, '0')}</span>
                    {portadaDe(track)}
                  </div>
                  <div className="swiss-poster-info">
                    <span className="swiss-poster-tag">TRK {String(i + 1).padStart(2, '0')}</span>
                    <strong>{track.title}</strong>
                    <small>{track.artist}</small>
                  </div>
                </button>
                <div className="swiss-poster-foot">
                  <span>
                    {track.album} · {track.duration_str}
                  </span>
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
                data-track-id={track.id}
                className={`sumiink-rollo ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="sumiink-rollo-barra" aria-hidden="true" />
                <span className="sumiink-rollo-portada">{portadaDe(track)}</span>
                <span className="sumiink-rollo-num">{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="sumiink-rollo-tit"
                  onClick={() => onPlayTrack(track)}
                  onDoubleClick={() => onPresentTrack?.(track)}
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
                data-track-id={track.id}
                className={`moonlit-nodo ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="moonlit-nodo-cover">{portadaDe(track)}</span>
                <button
                  type="button"
                  className="moonlit-nodo-play"
                  onClick={() => onPlayTrack(track)}
                  onDoubleClick={() => onPresentTrack?.(track)}
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
                    data-track-id={track.id}
                    className={`ledger-fila ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                  >
                    <span className="ledger-num-sello">{String(i + 1).padStart(2, '0')}</span>
                    <span className="ledger-portada">{portadaDe(track)}</span>
                    <button
                      type="button"
                      className="ledger-fila-tit"
                      onClick={() => onPlayTrack(track)}
                      onDoubleClick={() => onPresentTrack?.(track)}
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

  if (theme === 'shonen') {
    return (
      <div className="shonen-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="shonen-combate">
            <div className="shonen-cabecera-lista">
              <span>ENTRENAMIENTO / 01</span>
              <span>{vistaTracks.length} OPONENTES</span>
            </div>
            <div className="shonen-ronda">
              {vistaTracks.map((track, i) => (
                <article
                  key={track.id}
                  data-track-id={track.id}
                  className={`shonen-oponente ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                >
                  <span className="shonen-rango">{String(i + 1).padStart(2, '0')}</span>
                  <button
                    type="button"
                    className="shonen-retador"
                    onClick={() => onPlayTrack(track)}
                    onDoubleClick={() => onPresentTrack?.(track)}
                  >
                    <span className="shonen-avatar">{portadaDe(track)}</span>
                    <span className="shonen-datos">
                      <strong>{track.title}</strong>
                      <small>
                        {track.artist} · {track.album} · {track.duration_str}
                      </small>
                    </span>
                  </button>
                  <span className="shonen-vs">VS</span>
                  <div className="shonen-acc">{acciones(track)}</div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (theme === 'ghost') {
    return (
      <div className="ghost-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="ghost-cementerio">
            <div className="ghost-niebla-fondo" aria-hidden="true" />
            {vistaTracks.map((track) => (
              <article
                key={track.id}
                data-track-id={track.id}
                className={`ghost-lapida ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onPlayTrack(track)}
                  onDoubleClick={() => onPresentTrack?.(track)}
                >
                  <span className="ghost-retrato">{portadaDe(track)}</span>
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} · {track.album}
                  </small>
                  <span className="ghost-anos">R.I.P. · {track.duration_str}</span>
                </button>
                <span className="ghost-acc">{acciones(track)}</span>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'samurai') {
    return (
      <div className="samurai-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="samurai-dojo">
            <div className="samurai-muro" aria-hidden="true">
              <span className="samurai-sol" />
            </div>
            <div className="samurai-tatami">
              {vistaTracks.map((track, i) => (
                <article
                  key={track.id}
                  data-track-id={track.id}
                  className={`samurai-kata ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                >
                  <span className="samurai-kanji">侍</span>
                  <button
                    type="button"
                    onClick={() => onPlayTrack(track)}
                    onDoubleClick={() => onPresentTrack?.(track)}
                  >
                    <span className="samurai-portada">{portadaDe(track)}</span>
                    <strong>{track.title}</strong>
                    <small>
                      {track.artist} · {track.album}
                    </small>
                  </button>
                  <span className="samurai-grado">{['I', 'II', 'III', 'IV', 'V'][i % 5]} DAN</span>
                  <div className="samurai-acc">{acciones(track)}</div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (theme === 'space') {
    return (
      <div className="estudio-library space-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="estudio-mesa">
            {/* Cabecera de la consola: sesión, transporte y medidor general */}
            <div className="estudio-mesa-cab">
              <div className="estudio-sesion">
                <span>SESIÓN · 01</span>
                <strong>{total} CANALES</strong>
                <small>RACK A · 48 kHz / 24 BIT</small>
              </div>
              <div className="estudio-master" aria-hidden="true">
                <div className="estudio-master-vu">
                  {Array.from({ length: 18 }, (_, i) => (
                    <i key={i} className={i > 14 ? 'es-rojo' : i > 11 ? 'es-ambar' : ''} />
                  ))}
                </div>
                <div className="estudio-master-escala">
                  <span>-20</span>
                  <span>-10</span>
                  <span>-5</span>
                  <span>0</span>
                  <span>+3</span>
                </div>
              </div>
              <div className="estudio-transporte" aria-hidden="true">
                <button type="button" title="Retroceder">
                  ◀◀
                </button>
                <button type="button" className={isPlaying ? 'is-on' : ''} title="Reproducir">
                  {isPlaying ? '❚❚' : '▶'}
                </button>
                <button type="button" title="Detener">
                  ■
                </button>
              </div>
            </div>

            {/* Estantería: fundas cuadradas uniformes, como discos en un rack */}
            <div className="estudio-estanteria">
              {vistaTracks.map((track, i) => (
                <article
                  key={track.id}
                  data-track-id={track.id}
                  className={`estudio-disco ${activeTrack?.id === track.id ? 'is-activo' : ''}`}
                >
                  <div className="estudio-disco-tapa">
                    <span className="estudio-disco-vinilo" aria-hidden="true">
                      <i />
                    </span>
                    <button
                      type="button"
                      className="estudio-disco-funda"
                      onClick={() => onPlayTrack(track)}
                      onDoubleClick={() => onPresentTrack?.(track)}
                      aria-label={`Reproducir ${track.title}`}
                      title={track.title}
                    >
                      {portadaDe(track)}
                      <span className="estudio-disco-brillo" aria-hidden="true" />
                    </button>
                    <span className="estudio-disco-num" aria-hidden="true">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="estudio-disco-led" aria-hidden="true" />
                  </div>
                  <div className="estudio-disco-copy">
                    <strong title={track.title}>{track.title}</strong>
                    <small title={track.artist}>{track.artist}</small>
                    <span className="estudio-disco-vu" aria-hidden="true">
                      {Array.from({ length: 10 }, (_, k) => (
                        <i key={k} className={k < 4 + (i % 6) ? 'is-on' : ''} />
                      ))}
                    </span>
                  </div>
                  <div className="estudio-disco-acc">{acciones(track)}</div>
                </article>
              ))}
            </div>

            <div className="estudio-mesa-pie">
              <span>MASTER OUT</span>
              <div className="estudio-mesa-pie-linea" aria-hidden="true">
                <i />
              </div>
              <span>0 dB · ESTÉREO</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (theme === 'manga') {
    return (
      <div className="manga-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="manga-paginas">
            {vistaTracks.map((track, i) => (
              <article
                key={track.id}
                data-track-id={track.id}
                className={`manga-pagina ${activeTrack?.id === track.id ? 'is-active' : ''}`}
              >
                <span className="manga-pagina-num" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="manga-pagina-go" aria-hidden="true">
                  GO!
                </span>
                <button
                  type="button"
                  className="manga-pagina-play"
                  onClick={() => onPlayTrack(track)}
                  onDoubleClick={() => onPresentTrack?.(track)}
                  aria-label={`Reproducir ${track.title}`}
                >
                  <span className="manga-vineta-cover">{portadaDe(track)}</span>
                </button>
                <div className="manga-globo-titulo">
                  <strong>{track.title}</strong>
                </div>
                <small className="manga-pagina-meta">{track.artist}</small>
                <div className="manga-pagina-acciones">{acciones(track)}</div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (theme === 'kawaii') {
    return (
      <div className="kawaii-library">
        {encabezado}
        {selectorCarpetas}
        {vistaTracks.length === 0 ? (
          vacio
        ) : (
          <div className="kawaii-jardin">
            <span className="kawaii-arco-arriba" aria-hidden="true" />
            {vistaTracks.map((track, i) => (
              <article
                key={track.id}
                data-track-id={track.id}
                className={`kawaii-nube-amiga ${activeTrack?.id === track.id ? 'is-active' : ''}`}
                style={
                  {
                    '--c': ['#ffc0d9', '#b8ecd8', '#d9c6f2', '#ffe0b0'][i % 4],
                  } as React.CSSProperties
                }
              >
                <button
                  type="button"
                  onClick={() => onPlayTrack(track)}
                  onDoubleClick={() => onPresentTrack?.(track)}
                >
                  <span className="kawaii-foto">
                    {portadaDe(track)}
                    <span className="kawaii-ojitos">(◕‿◕)</span>
                  </span>
                  <strong>{track.title}</strong>
                  <small>
                    {track.artist} · {track.album}
                  </small>
                </button>
                <div className="kawaii-acc">{acciones(track)}</div>
              </article>
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
            <li
              key={track.id}
              data-track-id={track.id}
              className={activeTrack?.id === track.id ? 'is-active' : ''}
            >
              <button
                type="button"
                className="byobu-fila"
                onClick={() => onPlayTrack(track)}
                onDoubleClick={() => onPresentTrack?.(track)}
              >
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
