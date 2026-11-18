import {
  AlertCircle,
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

interface SearchTabProps {
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

export default function SearchTab({
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
}: SearchTabProps) {
  const activeDownloads = downloads.filter(
    (item) =>
      !item.status.startsWith('completado') &&
      !item.status.includes('error') &&
      item.status !== 'cancelado',
  );
  const visibleDownloads = activeDownloads.slice(0, 3);

  return (
    <div className={`buscar-view tema-${theme}`}>
      <header className="buscar-hero">
        <div className="buscar-hero-mark" aria-hidden="true">
          {GLIFOS[theme] ?? '桜'}
        </div>
        <div className="buscar-hero-copy">
          <p>BUSCADOR · DESCARGA</p>
          <h2>Buscador y Descargas de Música</h2>
          <span>
            Búsqueda instantánea en YouTube o descarga por enlace directo en FLAC / MP3 320k.
          </span>
        </div>
        <div className="buscar-hero-badges">
          <span className={toolsStatus?.ytdlp_available ? 'is-ok' : 'is-bad'}>
            yt-dlp: {toolsStatus?.ytdlp_available ? 'Listo' : 'No encontrado'}
          </span>
          <span className={toolsStatus?.ffmpeg_available ? 'is-ok' : 'is-bad'}>
            ffmpeg: {toolsStatus?.ffmpeg_available ? 'Listo' : 'No encontrado'}
          </span>
        </div>
      </header>

      {/* Barra de Búsqueda y Opciones */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
        <form onSubmit={onSearchSubmit}>
          <label className="text-xs text-ink-400 font-medium block mb-2">
            Escribe el nombre de la canción/artista o pega un enlace de video o Playlist / Álbum de
            YouTube:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={onlineQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Ej: LiSA Gurenge, YOASOBI Idol, o https://youtube.com/playlist?list=..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-ink-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
              />
              <Search className="w-4 h-4 text-ink-400 absolute left-3.5 top-3" />
            </div>

            <button
              type="submit"
              disabled={isSearchingOnline || isResolvingPlaylist || !onlineQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold shadow-lg shadow-accent-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {isSearchingOnline || isResolvingPlaylist ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isResolvingPlaylist ? 'Cargando Lista...' : 'Buscando...'}</span>
                </>
              ) : (
                <span>
                  {onlineQuery.includes('list=') ||
                  onlineQuery.includes('playlist') ||
                  onlineQuery.includes('/album/')
                    ? 'Cargar Playlist'
                    : onlineQuery.startsWith('http')
                      ? 'Descargar Enlace'
                      : 'Buscar'}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Calidad deseada en un selector compacto */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/5 pt-3">
          <label htmlFor="download-format" className="text-xs text-ink-400">
            Calidad de audio
          </label>
          <select
            id="download-format"
            value={downloadFormat}
            onChange={(event) => onFormatChange(event.target.value)}
            className="min-w-48 bg-[#17111e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
          >
            <option value="OPUS">Opus · calidad original</option>
            <option value="M4A">M4A · AAC 192 kbps</option>
            <option value="MP3">MP3 · 320 kbps</option>
            <option value="FLAC">FLAC · sin pérdida</option>
          </select>
        </div>
      </div>

      {/* Descargas pendientes y en curso */}
      <section className="glass-card p-4 rounded-2xl border border-white/10 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <DownloadCloud className="w-4 h-4 text-accent-300" />
            <div>
              <h3 className="text-xs font-bold text-white">Descargas en curso</h3>
              <p className="text-2xs text-ink-400">
                {activeDownloads.length === 0
                  ? 'Al añadir una canción a la cola, su progreso aparecerá aquí.'
                  : `${activeDownloads.length} pendiente${activeDownloads.length === 1 ? '' : 's'} o en curso`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onGoQueue}
            className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-2xs font-semibold text-ink-300 hover:text-white transition-colors"
          >
            Ver cola completa
          </button>
        </div>

        {activeDownloads.length > 0 && (
          <div className="space-y-2">
            {visibleDownloads.map((item) => (
              <div key={item.id} className="rounded-xl bg-black/20 border border-white/5 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                    {item.thumbnail ? (
                      <img src={item.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-4 h-4 text-accent-400" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-white truncate">{item.title}</h4>
                      <span className="text-2xs text-amber-300 whitespace-nowrap">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-2xs text-ink-400 truncate">
                      {item.artist} · {item.format}
                    </p>
                    <div
                      className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden"
                      role="progressbar"
                      aria-label={`Progreso de ${item.title}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.min(100, Math.max(0, item.progress))}
                    >
                      <div
                        className="h-full bg-gradient-to-r from-accent-500 to-accent-300 transition-all duration-base"
                        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-2xs text-ink-500 font-mono">
                      <span>
                        {item.progress.toFixed(0)}%
                        {item.speed && item.speed !== '--' ? ` · ${item.speed}` : ''}
                      </span>
                      <span>
                        {item.eta && item.eta !== '--' && item.eta !== '00:00'
                          ? `ETA ${item.eta}`
                          : ''}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCancelDownload(item.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                    title="Cancelar descarga"
                    aria-label={`Cancelar descarga de ${item.title}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {activeDownloads.length > visibleDownloads.length && (
              <button
                type="button"
                onClick={onGoQueue}
                className="w-full py-1.5 text-2xs text-accent-300 hover:text-white transition-colors"
              >
                Ver {activeDownloads.length - visibleDownloads.length} descargas más
              </button>
            )}
          </div>
        )}
      </section>

      {/* Mensaje de error si la búsqueda falla */}
      {onlineSearchError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{onlineSearchError}</span>
        </div>
      )}

      {/* Mensaje de error si falla la resolución de playlist */}
      {playlistSearchError && (
        <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{playlistSearchError}</span>
        </div>
      )}

      {/* Estado de carga de playlist */}
      {isResolvingPlaylist && (
        <div className="flex flex-col items-center justify-center p-8 rounded-3xl glass-card border border-accent-500/20 text-center animate-pulse">
          <Loader2 className="w-8 h-8 text-accent-400 animate-spin mb-3" />
          <h4 className="text-sm font-bold text-white mb-1">
            Extrayendo pistas de la Playlist / Álbum...
          </h4>
          <p className="text-xs text-ink-400">
            {playlistInfo
              ? `${playlistInfo.items.length} pistas recibidas; la lista sigue cargando`
              : 'Esperando las primeras pistas de yt-dlp'}
          </p>
        </div>
      )}

      {/* Panel de Álbum / Playlist Completa */}
      {playlistInfo && (
        <div className="glass-card rounded-3xl border border-accent-500/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-3">
          {/* Cabecera de la playlist */}
          <div className="p-6 bg-gradient-to-r from-accent-900/40 via-purple-900/30 to-accent-900/20 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-300 flex-shrink-0 shadow-lg">
                  <ListMusic className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-2xs font-semibold mb-1">
                    <span>Álbum / Playlist Completa</span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {playlistInfo.title}
                  </h3>
                  <p className="text-xs text-ink-300">
                    Canal:{' '}
                    <span className="font-semibold text-white">
                      {playlistInfo.uploader || 'YouTube'}
                    </span>{' '}
                    · {playlistInfo.track_count} pistas{' '}
                    {isResolvingPlaylist ? 'recibidas' : 'totales'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClosePlaylist}
                className="self-start sm:self-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-ink-400 hover:text-white border border-white/10 transition-colors"
                title="Cerrar vista de playlist"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Acciones y carpeta */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-5 pt-4 border-t border-white/10">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-ink-300 select-none">
                <input
                  type="checkbox"
                  checked={createAlbumFolder}
                  onChange={(e) => onCreateFolderChange(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0 focus:ring-offset-0"
                />
                <FolderCheck className="w-4 h-4 text-accent-400" />
                <span>Organizar en subcarpeta dedicada</span>
              </label>

              <div className="flex items-center gap-2">
                <button
                  onClick={
                    selectedPlaylistItems.size === playlistInfo.items.length
                      ? onClearPlaylist
                      : onSelectAllPlaylist
                  }
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-ink-300 text-xs font-semibold border border-white/10 transition-all"
                >
                  {selectedPlaylistItems.size === playlistInfo.items.length
                    ? 'Deseleccionar Todas'
                    : 'Seleccionar Todas'}
                </button>

                <button
                  onClick={onDownloadSelectedPlaylist}
                  disabled={selectedPlaylistItems.size === 0 || isResolvingPlaylist}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 text-white text-xs font-bold shadow-lg shadow-accent-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
                >
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Añadir {selectedPlaylistItems.size} a la cola</span>
                </button>
              </div>
            </div>
          </div>

          {/* Lista de canciones de la playlist */}
          <div className="max-h-96 overflow-y-auto custom-scroll divide-y divide-white/5 p-2">
            {playlistInfo.items.map((it, idx) => {
              const isSelected = selectedPlaylistItems.has(it.id);
              return (
                <div
                  key={it.id}
                  onClick={() => onTogglePlaylistItem(it.id)}
                  className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-accent-500/10'
                      : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePlaylistItem(it.id);
                      }}
                      className={`p-1 rounded transition-colors ${isSelected ? 'text-accent-400' : 'text-ink-500'}`}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <span className="w-6 text-center font-mono text-xs text-ink-500">
                      {idx + 1}
                    </span>

                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {it.thumbnail ? (
                        <img
                          src={it.thumbnail}
                          alt={it.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
                          <Music2 className="w-3.5 h-3.5 text-accent-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4
                        className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-ink-300'}`}
                      >
                        {it.title}
                      </h4>
                      <p className="text-2xs text-ink-400 truncate">{it.uploader}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs font-mono text-ink-400">{it.duration}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerDownload(it.title, it.uploader, it.url, it.thumbnail);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-accent-500/20 text-ink-400 hover:text-accent-300 transition-colors"
                      title="Añadir solo esta pista a la cola"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resultados de búsqueda en línea en vivo */}
      {onlineResults.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-ink-400 uppercase tracking-wider mb-3">
            Resultados en YouTube ({onlineResults.length})
          </h3>

          <div className="space-y-2.5">
            {onlineResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-2xl glass-card hover:bg-white/5 border border-white/5 transition-all group"
              >
                {/* Miniatura */}
                <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                      <Music2 className="w-4 h-4 text-accent-400" />
                    </div>
                  )}
                </div>

                {/* Título y canal */}
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-semibold text-white truncate group-hover:text-accent-300 transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-center gap-2 text-2xs text-ink-400 mt-0.5">
                    <span className="truncate">{item.uploader}</span>
                    <span>•</span>
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-ink-300">
                      {item.duration}
                    </span>
                  </div>
                </div>

                {/* Botón de Descarga */}
                <button
                  onClick={() =>
                    onTriggerDownload(item.title, item.uploader, item.url, item.thumbnail)
                  }
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold shadow-md shadow-accent-500/20 active:scale-95 transition-all"
                >
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Añadir a la cola</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sugerencias compactas */}
      {onlineResults.length === 0 && !isSearchingOnline && (
        <div className="space-y-2">
          <h3 className="text-2xs font-semibold text-ink-500 uppercase tracking-wider">
            Búsquedas sugeridas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              { title: 'LiSA - Gurenge (紅蓮華)', genre: 'Demon Slayer OP', duration: '3:58' },
              { title: 'YOASOBI - Idol (アイドル)', genre: 'Oshi no Ko OP', duration: '3:33' },
            ].map((sug) => (
              <div
                key={sug.title}
                className="flex items-center justify-between gap-3 p-2.5 rounded-xl glass-card hover:bg-white/5 border border-white/5"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white truncate">{sug.title}</div>
                  <div className="text-2xs text-ink-500">
                    {sug.genre} · {sug.duration}
                  </div>
                </div>
                <button
                  onClick={() => onSuggestionSearch(sug.title)}
                  className="flex-shrink-0 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-accent-300 hover:text-white text-2xs font-medium border border-white/5 transition-colors"
                >
                  Buscar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
