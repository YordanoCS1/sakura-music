import { AlertCircle, ArrowDownToLine, CheckSquare, FolderCheck, ListMusic, Loader2, Music2, Search, Square, X } from 'lucide-react';
import type { DownloaderStatus, OnlineSearchResult, PlaylistInfo } from '../types';

interface SearchTabProps {
  toolsStatus: DownloaderStatus | null;
  onlineQuery: string;
  onlineResults: OnlineSearchResult[];
  isSearchingOnline: boolean;
  onlineSearchError: string | null;
  playlistSearchError: string | null;
  isResolvingPlaylist: boolean;
  playlistInfo: PlaylistInfo | null;
  downloadFormat: string;
  createAlbumFolder: boolean;
  selectedPlaylistItems: Set<string>;
  onQueryChange: (v: string) => void;
  onSearchSubmit: (e?: React.FormEvent) => void;
  onFormatChange: (f: string) => void;
  onClosePlaylist: () => void;
  onCreateFolderChange: (v: boolean) => void;
  onSelectAllPlaylist: () => void;
  onClearPlaylist: () => void;
  onDownloadSelectedPlaylist: () => void;
  onTogglePlaylistItem: (id: string) => void;
  onTriggerDownload: (title: string, artist: string, url: string, thumbnail?: string | null) => void;
  onSuggestionSearch: (title: string) => void;
}

export default function SearchTab({
  toolsStatus,
  onlineQuery,
  onlineResults,
  isSearchingOnline,
  onlineSearchError,
  playlistSearchError,
  isResolvingPlaylist,
  playlistInfo,
  downloadFormat,
  createAlbumFolder,
  selectedPlaylistItems,
  onQueryChange,
  onSearchSubmit,
  onFormatChange,
  onClosePlaylist,
  onCreateFolderChange,
  onSelectAllPlaylist,
  onClearPlaylist,
  onDownloadSelectedPlaylist,
  onTogglePlaylistItem,
  onTriggerDownload,
  onSuggestionSearch,
}: SearchTabProps) {
  return (
    <div className="space-y-6 max-w-3xl mb-24">
      {/* Encabezado y Estado de Herramientas */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white mb-1">Buscador y Descargas de Música</h2>
          <p className="text-xs text-gray-400">
            Búsqueda instantánea en YouTube o descarga por enlace directo en FLAC / MP3 320k.
          </p>
        </div>

        {/* Badges de estado de herramientas */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
            toolsStatus?.ytdlp_available
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${toolsStatus?.ytdlp_available ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
            <span>yt-dlp: {toolsStatus?.ytdlp_available ? 'Listo' : 'No encontrado'}</span>
          </div>

          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
            toolsStatus?.ffmpeg_available
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${toolsStatus?.ffmpeg_available ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
            <span>ffmpeg: {toolsStatus?.ffmpeg_available ? 'Listo' : 'No encontrado'}</span>
          </div>
        </div>
      </div>

      {/* Barra de Búsqueda y Opciones */}
      <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
        <form onSubmit={onSearchSubmit}>
          <label className="text-[11px] text-gray-400 font-medium block mb-2">
            Escribe el nombre de la canción/artista o pega un enlace de video o Playlist / Álbum de YouTube:
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={onlineQuery}
                onChange={(e) => onQueryChange(e.target.value)}
                placeholder="Ej: LiSA Gurenge, YOASOBI Idol, o https://youtube.com/playlist?list=..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500/30"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            </div>

            <button
              type="submit"
              disabled={isSearchingOnline || isResolvingPlaylist || !onlineQuery.trim()}
              className="px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold shadow-lg shadow-accent-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
              {isSearchingOnline || isResolvingPlaylist ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{isResolvingPlaylist ? 'Cargando Lista...' : 'Buscando...'}</span>
                </>
              ) : (
                <span>
                  {onlineQuery.includes('list=') || onlineQuery.includes('playlist') || onlineQuery.includes('/album/')
                    ? 'Cargar Playlist'
                    : onlineQuery.startsWith('http')
                      ? 'Descargar Enlace'
                      : 'Buscar'}
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Formato deseado */}
        <div className="flex items-center gap-4 text-xs text-gray-300 pt-1">
          <span className="text-[11px] text-gray-400">Calidad de audio:</span>
          <div className="flex gap-2">
            {[
              { id: 'OPUS', label: 'Opus (Original 129 kbps)' },
              { id: 'M4A', label: 'm4a · AAC (192 kbps)' },
              { id: 'MP3', label: 'mp3 (320 kbps)' },
              { id: 'FLAC', label: 'FLAC (Sin pérdida)' }
            ].map(fmt => (
              <button
                key={fmt.id}
                type="button"
                onClick={() => onFormatChange(fmt.id)}
                className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                  downloadFormat === fmt.id
                    ? 'bg-accent-500/20 text-accent-300 border border-accent-500/40 font-semibold shadow-sm'
                    : 'bg-white/5 text-gray-400 hover:text-white'
                }`}>
                {fmt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

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
          <h4 className="text-sm font-bold text-white mb-1">Extrayendo pistas de la Playlist / Álbum...</h4>
          <p className="text-xs text-gray-400">Consultando los metadatos de todos los videos de la lista con yt-dlp</p>
        </div>
      )}

      {/* Panel de Álbum / Playlist Completa */}
      {playlistInfo && (
        <div className="glass-card rounded-3xl border border-accent-500/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-3">
          {/* Header de la playlist */}
          <div className="p-6 bg-gradient-to-r from-accent-900/40 via-purple-900/30 to-accent-900/20 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-2xl bg-accent-500/20 border border-accent-500/30 flex items-center justify-center text-accent-300 flex-shrink-0 shadow-lg">
                  <ListMusic className="w-7 h-7" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-[10px] font-semibold mb-1">
                    <span>Álbum / Playlist Completa</span>
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tight">
                    {playlistInfo.title}
                  </h3>
                  <p className="text-xs text-gray-300">
                    Canal: <span className="font-semibold text-white">{playlistInfo.uploader || 'YouTube'}</span> · {playlistInfo.track_count} pistas totales
                  </p>
                </div>
              </div>

              <button
                onClick={onClosePlaylist}
                className="self-start sm:self-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
                title="Cerrar vista de playlist">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Acciones y carpeta */}
            <div className="flex items-center justify-between flex-wrap gap-3 mt-5 pt-4 border-t border-white/10">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 select-none">
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
                  onClick={selectedPlaylistItems.size === playlistInfo.items.length ? onClearPlaylist : onSelectAllPlaylist}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all">
                  {selectedPlaylistItems.size === playlistInfo.items.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                </button>

                <button
                  onClick={onDownloadSelectedPlaylist}
                  disabled={selectedPlaylistItems.size === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 text-white text-xs font-bold shadow-lg shadow-accent-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                  <ArrowDownToLine className="w-4 h-4" />
                  <span>Descargar {selectedPlaylistItems.size} Canciones</span>
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
                    isSelected ? 'bg-accent-500/10' : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                  }`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); onTogglePlaylistItem(it.id); }}
                      className={`p-1 rounded transition-colors ${isSelected ? 'text-accent-400' : 'text-gray-500'}`}>
                      {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>

                    <span className="w-6 text-center font-mono text-[11px] text-gray-500">
                      {idx + 1}
                    </span>

                    <div className="w-12 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                      {it.thumbnail ? (
                        <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
                          <Music2 className="w-3.5 h-3.5 text-accent-400" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                        {it.title}
                      </h4>
                      <p className="text-[10px] text-gray-400 truncate">
                        {it.uploader}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] font-mono text-gray-400">{it.duration}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTriggerDownload(it.title, it.uploader, it.url, it.thumbnail);
                      }}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-accent-500/20 text-gray-400 hover:text-accent-300 transition-colors"
                      title="Descargar solo esta pista">
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resultados de Búsqueda Online en Vivo */}
      {onlineResults.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Resultados en YouTube ({onlineResults.length})
          </h3>

          <div className="space-y-2.5">
            {onlineResults.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-4 p-3.5 rounded-2xl glass-card hover:bg-white/5 border border-white/5 transition-all group">

                {/* Miniatura */}
                <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
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
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                    <span className="truncate">{item.uploader}</span>
                    <span>•</span>
                    <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.duration}</span>
                  </div>
                </div>

                {/* Botón de Descarga */}
                <button
                  onClick={() => onTriggerDownload(item.title, item.uploader, item.url, item.thumbnail)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold shadow-md shadow-accent-500/20 active:scale-95 transition-all">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  <span>Descargar</span>
                </button>

              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tendencias Sakura / Sugerencias */}
      {onlineResults.length === 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tendencias Populares</h3>
          <div className="space-y-2">
            {[
              { title: 'LiSA - Gurenge (紅蓮華)', genre: 'Demon Slayer OP', duration: '3:58' },
              { title: 'YOASOBI - Idol (アイドル)', genre: 'Oshi no Ko OP', duration: '3:33' },
              { title: 'Kenshi Yonezu - KICK BACK', genre: 'Chainsaw Man OP', duration: '3:13' },
              { title: 'Ado - Usseewa (うっせぇわ)', genre: 'J-Pop / Rock', duration: '3:24' }
            ].map((sug, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/5 border border-white/5">
                <div>
                  <div className="text-xs font-semibold text-white">{sug.title}</div>
                  <div className="text-[10px] text-gray-400">{sug.genre} · {sug.duration}</div>
                </div>
                <button
                  onClick={() => onSuggestionSearch(sug.title)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-accent-300 hover:text-white text-[11px] font-medium border border-white/5 transition-colors">
                  Buscar esta canción
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
