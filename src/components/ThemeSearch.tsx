import {
  ArrowDownToLine,
  CheckSquare,
  DownloadCloud,
  FolderCheck,
  ListMusic,
  Loader2,
  Music2,
  Search,
  Square,
  X,
} from 'lucide-react';
import type {
  DownloadItem,
  DownloaderStatus,
  OnlineSearchResult,
  PlaylistInfo,
  ThemeMode,
} from '../types';

interface ThemeSearchProps {
  theme: ThemeMode;
  toolsStatus: DownloaderStatus | null;
  onlineQuery: string;
  onlineResults: OnlineSearchResult[];
  isSearchingOnline: boolean;
  onlineSearchError: string | null;
  playlistSearchError: string | null;
  isResolvingPlaylist: boolean;
  playlistInfo: PlaylistInfo | null;
  downloadFormat: string;
  downloads: DownloadItem[];
  createAlbumFolder: boolean;
  selectedPlaylistItems: Set<string>;
  onQueryChange: (v: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onFormatChange: (f: string) => void;
  onGoQueue: () => void;
  onCancelDownload: (jobId: string) => void;
  onClosePlaylist: () => void;
  onCreateFolderChange: (v: boolean) => void;
  onSelectAllPlaylist: () => void;
  onClearPlaylist: () => void;
  onDownloadSelectedPlaylist: () => void;
  onTogglePlaylistItem: (id: string) => void;
  onTriggerDownload: (
    title: string,
    artist: string,
    url: string,
    thumbnail?: string | null,
  ) => void;
  onSuggestionSearch: (title: string) => void;
}

const GLIFOS: Partial<Record<ThemeMode, string>> = {
  sumie: '墨',
  byobu: '屏',
  shoji: '障',
  origami: '折',
  swiss: '＋',
  sumiink: '墨',
  moonlit: '月',
  ledger: '帳',
};

const SUGERENCIAS = [
  { titulo: 'LiSA - Gurenge (紅蓮華)', detalle: 'Demon Slayer OP · 3:58' },
  { titulo: 'YOASOBI - Idol (アイドル)', detalle: 'Oshi no Ko OP · 3:33' },
  { titulo: 'Kenshi Yonezu - LADY', detalle: 'Chainsaw Man ED · 3:26' },
  { titulo: 'Ado - Odo', detalle: 'Single · 3:30' },
  { titulo: 'Eve - Kaikai Kitan', detalle: 'Jujutsu Kaisen OP · 3:54' },
  { titulo: 'Kikuo - Aishite Aishite Aishite', detalle: 'Single · 3:12' },
];

/** Buscador con composición propia por tema. */
export default function ThemeSearch({
  theme,
  toolsStatus,
  onlineQuery,
  onlineResults,
  isSearchingOnline,
  onlineSearchError,
  playlistSearchError,
  isResolvingPlaylist,
  playlistInfo,
  downloadFormat,
  downloads,
  createAlbumFolder,
  selectedPlaylistItems,
  onQueryChange,
  onSearchSubmit,
  onFormatChange,
  onGoQueue,
  onCancelDownload,
  onClosePlaylist,
  onCreateFolderChange,
  onSelectAllPlaylist,
  onClearPlaylist,
  onDownloadSelectedPlaylist,
  onTogglePlaylistItem,
  onTriggerDownload,
  onSuggestionSearch,
}: ThemeSearchProps) {
  const activas = downloads.filter(
    (d) =>
      !d.status.startsWith('completado') && !d.status.includes('error') && d.status !== 'cancelado',
  );
  const esEnlace =
    onlineQuery.includes('list=') ||
    onlineQuery.includes('playlist') ||
    onlineQuery.includes('/album/');
  const textoBoton = esEnlace
    ? 'Cargar playlist'
    : onlineQuery.startsWith('http')
      ? 'Descargar enlace'
      : 'Buscar';

  return (
    <div className={`tsearch tema-${theme}`}>
      <header className="tsearch-hero">
        <span className="tsearch-glifo" aria-hidden="true">
          {GLIFOS[theme] ?? '桜'}
        </span>
        <div className="tsearch-hero-copy">
          <p>BUSCADOR · DESCARGA</p>
          <h2>Buscador y Descargas de Música</h2>
          <span>YouTube, enlaces directos y playlists completas.</span>
        </div>
        <div className="tsearch-tools">
          <span className={toolsStatus?.ytdlp_available ? 'is-ok' : 'is-bad'}>
            yt-dlp {toolsStatus?.ytdlp_available ? 'listo' : 'ausente'}
          </span>
          <span className={toolsStatus?.ffmpeg_available ? 'is-ok' : 'is-bad'}>
            ffmpeg {toolsStatus?.ffmpeg_available ? 'listo' : 'ausente'}
          </span>
        </div>
      </header>

      <section className="tsearch-form-block">
        <form onSubmit={onSearchSubmit} className="tsearch-form">
          <label htmlFor="tsearch-input">Título, artista o enlace</label>
          <div className="tsearch-input-row">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              id="tsearch-input"
              type="text"
              value={onlineQuery}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Ej: LiSA Gurenge o https://youtube.com/playlist?list=..."
            />
            <button
              type="submit"
              disabled={isSearchingOnline || isResolvingPlaylist || !onlineQuery.trim()}
            >
              {isSearchingOnline || isResolvingPlaylist ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                textoBoton
              )}
            </button>
          </div>
          <div className="tsearch-calidad">
            <label htmlFor="tsearch-format">Calidad de audio</label>
            <select
              id="tsearch-format"
              value={downloadFormat}
              onChange={(e) => onFormatChange(e.target.value)}
            >
              <option value="OPUS">Opus · original</option>
              <option value="M4A">M4A · AAC 192 kbps</option>
              <option value="MP3">MP3 · 320 kbps</option>
              <option value="FLAC">FLAC · sin pérdida</option>
            </select>
          </div>
        </form>
      </section>

      {(onlineSearchError || playlistSearchError) && (
        <div className="tsearch-error">{onlineSearchError || playlistSearchError}</div>
      )}

      {isResolvingPlaylist && (
        <div className="tsearch-loading">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Extrayendo pistas de la playlist…</span>
        </div>
      )}

      {activas.length > 0 && (
        <section className="tsearch-descargas">
          <div className="tsearch-subhead">
            <DownloadCloud className="w-4 h-4" />
            <h3>Descargas en curso</h3>
            <button type="button" onClick={onGoQueue}>
              Ver cola completa →
            </button>
          </div>
          <div className="tsearch-descargas-lista">
            {activas.slice(0, 3).map((item) => (
              <div key={item.id} className="tsearch-descarga">
                <div className="tsearch-descarga-thumb">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt="" />
                  ) : (
                    <Music2 className="w-4 h-4" />
                  )}
                </div>
                <div className="tsearch-descarga-info">
                  <strong>{item.title}</strong>
                  <small>
                    {item.artist} · {item.format}
                  </small>
                  <div className="tsearch-bar">
                    <i style={{ width: `${Math.max(0, item.progress)}%` }} />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onCancelDownload(item.id)}
                  aria-label="Cancelar descarga"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {playlistInfo && (
        <section className="tsearch-playlist">
          <div className="tsearch-playlist-head">
            <ListMusic className="w-5 h-5" />
            <div>
              <strong>{playlistInfo.title}</strong>
              <small>
                {playlistInfo.uploader || 'YouTube'} · {playlistInfo.track_count} pistas
              </small>
            </div>
            <button type="button" onClick={onClosePlaylist} aria-label="Cerrar playlist">
              <X className="w-4 h-4" />
            </button>
          </div>
          <label className="tsearch-playlist-folder">
            <input
              type="checkbox"
              checked={createAlbumFolder}
              onChange={(e) => onCreateFolderChange(e.target.checked)}
            />
            <FolderCheck className="w-3.5 h-3.5" /> Organizar en subcarpeta
          </label>
          <div className="tsearch-playlist-lista">
            {playlistInfo.items.map((it) => {
              const sel = selectedPlaylistItems.has(it.id);
              return (
                <button
                  key={it.id}
                  type="button"
                  className={`tsearch-playlist-item ${sel ? 'is-selected' : ''}`}
                  onClick={() => onTogglePlaylistItem(it.id)}
                >
                  {sel ? (
                    <CheckSquare className="w-3.5 h-3.5" />
                  ) : (
                    <Square className="w-3.5 h-3.5" />
                  )}
                  <span className="tsearch-playlist-thumb">
                    {it.thumbnail ? (
                      <img src={it.thumbnail} alt="" />
                    ) : (
                      <Music2 className="w-3 h-3" />
                    )}
                  </span>
                  <span>{it.title}</span>
                </button>
              );
            })}
          </div>
          <div className="tsearch-playlist-actions">
            <button
              type="button"
              onClick={
                selectedPlaylistItems.size === playlistInfo.items.length
                  ? onClearPlaylist
                  : onSelectAllPlaylist
              }
            >
              {selectedPlaylistItems.size === playlistInfo.items.length
                ? 'Deseleccionar todas'
                : 'Seleccionar todas'}
            </button>
            <button
              type="button"
              onClick={onDownloadSelectedPlaylist}
              disabled={selectedPlaylistItems.size === 0}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Añadir {selectedPlaylistItems.size} a la
              cola
            </button>
          </div>
        </section>
      )}

      <section className="tsearch-resultados">
        <div className="tsearch-subhead">
          <h3>{onlineResults.length > 0 ? 'Resultados' : 'Búsquedas sugeridas'}</h3>
        </div>
        <div className="tsearch-cards">
          {onlineResults.length > 0
            ? onlineResults.map((r, i) => (
                <article key={i} className="tsearch-card">
                  <div className="tsearch-card-thumb">
                    {r.thumbnail ? (
                      <img src={r.thumbnail} alt="" />
                    ) : (
                      <Music2 className="w-4 h-4" />
                    )}
                  </div>
                  <div className="tsearch-card-copy">
                    <strong>{r.title}</strong>
                    <small>{r.uploader}</small>
                  </div>
                  <button
                    type="button"
                    onClick={() => onTriggerDownload(r.title, r.uploader, r.url, r.thumbnail)}
                  >
                    <ArrowDownToLine className="w-3.5 h-3.5" />
                  </button>
                </article>
              ))
            : SUGERENCIAS.map((s, i) => (
                <article key={i} className="tsearch-card">
                  <span className="tsearch-card-num">{String(i + 1).padStart(2, '0')}</span>
                  <div className="tsearch-card-copy">
                    <strong>{s.titulo}</strong>
                    <small>{s.detalle}</small>
                  </div>
                  <button type="button" onClick={() => onSuggestionSearch(s.titulo)}>
                    Buscar
                  </button>
                </article>
              ))}
        </div>
      </section>
    </div>
  );
}
