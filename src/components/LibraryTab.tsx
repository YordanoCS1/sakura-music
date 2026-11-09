import { ArrowLeft, Calendar, CheckSquare, ChevronRight, Clock, CornerLeftUp, Disc3, Folder, FolderOpen, Heart, Layers, Music2, Pause, Pencil, Play, Square } from 'lucide-react';
import type { AlbumGroup, FolderExplorerData, ScannedTrack, ViewMode } from '../types';
import LibraryToolbar from './LibraryToolbar';

interface LibraryTabProps {
  tracks: ScannedTrack[];
  filteredTracks: ScannedTrack[];
  favorites: string[];
  currentFolder: string | null;
  defaultMusicDir: string | null;
  isScanning: boolean;
  isPlaying: boolean;
  isWWM: boolean;
  activeTrack: ScannedTrack | null;
  viewMode: ViewMode;
  selectedTrackIds: Set<string>;
  currentFolderNav: string[];
  folderExplorerData: FolderExplorerData;
  albumGroups: AlbumGroup[];
  selectedAlbum: AlbumGroup | null;
  getCoverSrc: (coverUrl: string | null) => string;
  formatTotalTime: (secs: number) => string;
  onSetViewMode: (mode: ViewMode) => void;
  onOpenFolderDialog: () => void;
  onScanFolder: (folderPath: string) => void;
  onNavigateUp: () => void;
  onNavigateToBreadcrumb: (index: number) => void;
  onNavigateIntoFolder: (folderName: string) => void;
  onPlayFolderTracks: (tracks: ScannedTrack[]) => void;
  onSelectFolderTracks: (tracks: ScannedTrack[], e: React.MouseEvent) => void;
  onPlayTrack: (track: ScannedTrack) => void;
  onOpenEdit: (track: ScannedTrack, e: React.MouseEvent) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onToggleSelectTrack: (id: string, e: React.MouseEvent) => void;
  onSelectAllFiltered: () => void;
  onClearSelection: () => void;
  onOpenBatchModal: () => void;
  onSetFolderNav: (nav: string[]) => void;
  onSetExpandedAlbumKey: (key: string | null) => void;
  onPlayAlbum: (group: AlbumGroup) => void;
  onSelectAlbumTracks: (group: AlbumGroup, e: React.MouseEvent) => void;
}

export default function LibraryTab({
  tracks,
  filteredTracks,
  favorites,
  currentFolder,
  defaultMusicDir,
  isScanning,
  isPlaying,
  isWWM,
  activeTrack,
  viewMode,
  selectedTrackIds,
  currentFolderNav,
  folderExplorerData,
  albumGroups,
  selectedAlbum,
  getCoverSrc,
  formatTotalTime,
  onSetViewMode,
  onOpenFolderDialog,
  onScanFolder,
  onNavigateUp,
  onNavigateToBreadcrumb,
  onNavigateIntoFolder,
  onPlayFolderTracks,
  onSelectFolderTracks,
  onPlayTrack,
  onOpenEdit,
  onToggleFavorite,
  onToggleSelectTrack,
  onSelectAllFiltered,
  onClearSelection,
  onOpenBatchModal,
  onSetFolderNav,
  onSetExpandedAlbumKey,
  onPlayAlbum,
  onSelectAlbumTracks,
}: LibraryTabProps) {
  return (
            <div>
              <LibraryToolbar
                currentFolder={currentFolder}
                isScanning={isScanning}
                isWWM={isWWM}
                viewMode={viewMode}
                selectedCount={selectedTrackIds.size}
                filteredCount={filteredTracks.length}
                onOpenFolderDialog={onOpenFolderDialog}
                onScanFolder={onScanFolder}
                onSetViewMode={onSetViewMode}
                onClearExpandedAlbum={() => onSetExpandedAlbumKey(null)}
                onSelectAllFiltered={onSelectAllFiltered}
                onClearSelection={onClearSelection}
                onOpenBatchModal={onOpenBatchModal}
              />

              {/* Estado vacío si no hay canciones */}
              {tracks.length === 0 && !isScanning && (
                <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border border-white/5 my-6">
                  <div className={`w-16 h-16 rounded-3xl ${isWWM ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-accent-500/10 border border-accent-500/20'} flex items-center justify-center text-3xl mb-4`}>
                    {isWWM ? '🎋' : '🌸'}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Tu biblioteca aún está vacía</h3>
                  <p className="text-xs text-gray-400 max-w-sm mb-6">
                    Selecciona una carpeta en tu disco para que el motor en Rust extraiga títulos, artistas, carátulas y formatos de audio en milisegundos.
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={onOpenFolderDialog}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r ${isWWM ? 'from-emerald-500 to-teal-400 shadow-emerald-500/25' : 'from-accent-500 to-accent-400 shadow-accent-500/25'} text-white text-xs font-bold shadow-xl hover:brightness-110 active:scale-95 transition-all`}>
                      <FolderOpen className="w-4 h-4" />
                      <span>Escanear Carpeta de Música</span>
                    </button>
                    {defaultMusicDir && (
                      <button 
                        onClick={() => onScanFolder(defaultMusicDir)}
                        className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all">
                        Escanear Música de Windows
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Indicador de filtro de carpeta si se navega en Grid / Table / Albums */}
              {currentFolderNav.length > 0 && viewMode !== 'folders' && (
                <div className="flex items-center justify-between p-2.5 px-4 mb-4 rounded-xl bg-white/5 border border-white/10 text-xs text-gray-300 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Folder className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                    <span>Filtrando por carpeta:</span>
                    <span className="font-semibold text-white">{currentFolderNav.join(' / ')}</span>
                    <span className="text-gray-500 font-mono text-[11px]">({filteredTracks.length} canciones)</span>
                  </div>
                  <button 
                    onClick={() => onSetFolderNav([])}
                    className="text-[11px] text-gray-400 hover:text-white underline transition-colors">
                    Mostrar toda la biblioteca
                  </button>
                </div>
              )}

              {/* VISTA EXPLORADOR POR CARPETAS (FOLDERS) */}
              {viewMode === 'folders' && tracks.length > 0 && (
                <div className="space-y-6 mb-24 animate-in fade-in duration-200">
                  
                  {/* Barra de Navegación y Rutas (Breadcrumbs) */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl glass-card border border-white/10">
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <button 
                        onClick={onNavigateUp} 
                        disabled={currentFolderNav.length === 0} 
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all disabled:opacity-30 disabled:pointer-events-none active:scale-95"
                        title="Subir un nivel de carpeta">
                        <CornerLeftUp className="w-3.5 h-3.5" />
                        <span>Subir</span>
                      </button>

                      <div className="flex items-center gap-1.5 flex-wrap font-mono">
                        <button 
                          onClick={() => onNavigateToBreadcrumb(-1)}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors ${
                            currentFolderNav.length === 0 ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'
                          }`}>
                          <Folder className="w-3.5 h-3.5" />
                          <span>{folderExplorerData.rootFolderName}</span>
                        </button>

                        {currentFolderNav.map((seg, idx) => (
                          <div key={`${seg}-${idx}`} className="flex items-center gap-1.5">
                            <ChevronRight className="w-3 h-3 text-gray-600" />
                            <button 
                              onClick={() => onNavigateToBreadcrumb(idx)}
                              className={`px-2 py-1 rounded-lg transition-colors ${
                                idx === currentFolderNav.length - 1 ? 'bg-white/10 text-white font-bold' : 'text-gray-400 hover:text-white'
                              }`}>
                              {seg}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Acciones de la carpeta activa */}
                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button 
                        onClick={() => onPlayFolderTracks(folderExplorerData.allFolderTracks)}
                        disabled={folderExplorerData.allFolderTracks.length === 0}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r ${isWWM ? 'from-emerald-500 to-teal-400 shadow-emerald-500/20' : 'from-accent-500 to-accent-400 shadow-accent-500/20'} text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40`}>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Reproducir Carpeta ({folderExplorerData.allFolderTracks.length})</span>
                      </button>

                      <button 
                        onClick={(e) => onSelectFolderTracks(folderExplorerData.allFolderTracks, e)}
                        disabled={folderExplorerData.allFolderTracks.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95 disabled:opacity-40"
                        title="Seleccionar todas las canciones de esta carpeta para edición en lote">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Lote</span>
                      </button>
                    </div>
                  </div>

                  {/* Sección: Subcarpetas en este nivel */}
                  {folderExplorerData.subfolders.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Folder className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                          <span>Carpetas ({folderExplorerData.subfolders.length})</span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {folderExplorerData.subfolders.map((sub) => (
                          <div 
                            key={sub.name}
                            onClick={() => onNavigateIntoFolder(sub.name)}
                            className={`group relative p-3.5 rounded-2xl glass-card transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl border ${
                              isWWM ? 'border-white/5 hover:border-emerald-500/40' : 'border-white/5 hover:border-accent-500/40'
                            } flex flex-col justify-between`}>
                            
                            <div className="flex items-start justify-between">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                isWWM ? 'bg-gradient-to-tr from-emerald-950/60 to-teal-900/40 text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-tr from-accent-950/60 to-purple-900/40 text-accent-400 border border-accent-500/30'
                              } shadow-md group-hover:scale-105 transition-transform`}>
                                <Folder className="w-5 h-5 fill-current/25" />
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); onPlayFolderTracks(sub.tracks); }}
                                className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${
                                  isWWM ? 'from-emerald-500 to-teal-400 shadow-emerald-500/30' : 'from-accent-500 to-accent-400 shadow-accent-500/30'
                                } text-white shadow-md hover:scale-110 active:scale-95`}
                                title={`Reproducir carpeta ${sub.name}`}>
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </button>
                            </div>

                            <div className="mt-3">
                              <h4 className={`text-xs font-bold text-white truncate ${isWWM ? 'group-hover:text-emerald-300' : 'group-hover:text-accent-300'} transition-colors`} title={sub.name}>
                                {sub.name}
                              </h4>
                              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono mt-1">
                                <span>{sub.trackCount} {sub.trackCount === 1 ? 'canción' : 'canciones'}</span>
                                {sub.subfolderCount > 0 && <span>{sub.subfolderCount} sub</span>}
                              </div>
                            </div>

                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sección: Canciones directas en este nivel */}
                  {folderExplorerData.directTracks.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <Music2 className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                          <span>Canciones en {currentFolderNav.length === 0 ? 'la raíz' : currentFolderNav[currentFolderNav.length - 1]} ({folderExplorerData.directTracks.length})</span>
                        </h3>
                      </div>

                      <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">
                                <button 
                                  onClick={(e) => onSelectFolderTracks(folderExplorerData.directTracks, e)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="Seleccionar todas las canciones de este nivel">
                                  {folderExplorerData.directTracks.every(t => selectedTrackIds.has(t.id)) ? (
                                    <CheckSquare className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </th>
                              <th className="py-2.5 px-4 w-12 text-center">#</th>
                              <th className="py-2.5 px-4">Título</th>
                              <th className="py-2.5 px-4">Artista</th>
                              <th className="py-2.5 px-4">Álbum</th>
                              <th className="py-2.5 px-4 w-20 text-center">Formato</th>
                              <th className="py-2.5 px-4 w-20 text-right">Duración</th>
                              <th className="py-2.5 px-4 w-20 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {folderExplorerData.directTracks.map((track, idx) => {
                              const isCurrent = activeTrack?.id === track.id;
                              const isSelected = selectedTrackIds.has(track.id);
                              const isFav = favorites.includes(track.id);

                              return (
                                <tr 
                                  key={track.id}
                                  onClick={() => onPlayTrack(track)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? isWWM ? 'bg-emerald-500/20 text-emerald-200' : 'bg-accent-500/20 text-accent-200'
                                      : isCurrent 
                                        ? isWWM ? 'bg-emerald-500/10 text-emerald-300' : 'bg-accent-500/10 text-accent-300' 
                                        : 'hover:bg-white/5 text-gray-300'
                                  }`}>
                                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={(e) => onToggleSelectTrack(track.id, e)}
                                      className={`p-1 rounded-md transition-colors ${
                                        isSelected ? (isWWM ? 'text-emerald-400' : 'text-accent-400') : 'text-gray-600 hover:text-gray-400'
                                      }`}>
                                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                    </button>
                                  </td>
                                  <td className="py-2 px-4 text-center text-gray-500 font-mono">
                                    {isCurrent && isPlaying ? '▶' : track.track_number || idx + 1}
                                  </td>
                                  <td className="py-2 px-4 font-semibold text-white truncate max-w-xs">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-7 h-7 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                                        {track.cover_url ? (
                                          <img src={getCoverSrc(track.cover_url)} alt={track.title} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-white/5">
                                            <Music2 className="w-3.5 h-3.5 text-gray-500" />
                                          </div>
                                        )}
                                      </div>
                                      <span className="truncate">{track.title}</span>
                                    </div>
                                  </td>
                                  <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                                    {track.artist || '—'}
                                  </td>
                                  <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                                    {track.album || '—'}
                                  </td>
                                  <td className={`py-2 px-4 text-center font-mono text-[10px] ${isWWM ? 'text-emerald-300' : 'text-accent-300'}`}>
                                    {track.format}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono text-gray-400">
                                    {track.duration_str}
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenEdit(track, e); }}
                                        className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                                        title="Editar metadatos">
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => onToggleFavorite(track.id, e)}
                                        className={`text-gray-500 ${isWWM ? 'hover:text-emerald-400' : 'hover:text-accent-400'} transition-colors p-1`}
                                        title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                                        <Heart className={`w-3.5 h-3.5 ${isFav ? (isWWM ? 'text-emerald-400 fill-current' : 'text-accent-400 fill-current') : ''}`} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Estado si la carpeta actual no tiene ni subcarpetas ni canciones */}
                  {folderExplorerData.subfolders.length === 0 && folderExplorerData.directTracks.length === 0 && (
                    <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border border-white/5 my-6">
                      <Folder className="w-12 h-12 text-gray-600 mb-3" />
                      <h4 className="text-sm font-bold text-white mb-1">Esta carpeta no contiene archivos de audio</h4>
                      <p className="text-xs text-gray-400 mb-4">Puedes volver al nivel anterior para explorar otras carpetas.</p>
                      <button 
                        onClick={onNavigateUp}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold border border-white/10 transition-all">
                        <CornerLeftUp className="w-3.5 h-3.5" />
                        <span>Subir un nivel</span>
                      </button>
                    </div>
                  )}

                </div>
              )}

              {/* VISTA CUADRÍCULA (GRID) */}
              {viewMode === 'grid' && tracks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-24">
                  {filteredTracks.map((track) => {
                    const isCurrent = activeTrack?.id === track.id;
                    const isFav = favorites.includes(track.id);
                    const isSelected = selectedTrackIds.has(track.id);

                    return (
                      <div 
                        key={track.id}
                        onClick={() => onPlayTrack(track)}
                        className={`group relative flex items-center gap-3.5 p-3 rounded-2xl glass-card transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? isWWM ? 'ring-2 ring-emerald-500 bg-emerald-500/15 shadow-lg shadow-emerald-950/40' : 'ring-2 ring-accent-500 bg-accent-500/15 shadow-lg'
                            : isCurrent 
                              ? isWWM ? 'ring-1 ring-emerald-500/60 bg-emerald-950/30 shadow-lg shadow-emerald-950/40' : 'ring-1 ring-accent-500/60 bg-white/10 shadow-lg' 
                              : isWWM ? 'hover:bg-emerald-950/20 hover:border-emerald-500/20' : 'hover:bg-white/5 hover:border-white/10'
                        }`}>
                        
                        {/* Checkbox de selección rápida para lote */}
                        <button
                          onClick={(e) => onToggleSelectTrack(track.id, e)}
                          className={`absolute top-2.5 left-2.5 z-10 p-1 rounded-lg backdrop-blur-md transition-all ${
                            isSelected 
                              ? isWWM ? 'bg-emerald-500 text-white shadow-md' : 'bg-accent-500 text-white shadow-md' 
                              : 'bg-black/60 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                          }`}
                          title={isSelected ? "Deseleccionar" : "Seleccionar para edición en lote"}>
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        </button>

                        {/* Portada con fallback elegante */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md">
                          {track.cover_url ? (
                            <img 
                              src={getCoverSrc(track.cover_url)} 
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className={`w-full h-full bg-gradient-to-br ${isWWM ? 'from-emerald-950/60 to-teal-900/40' : 'from-purple-900/40 to-accent-900/40'} flex items-center justify-center`}>
                              <Music2 className={`w-6 h-6 ${isWWM ? 'text-emerald-400/80' : 'text-accent-400/80'}`} />
                            </div>
                          )}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isCurrent && isPlaying ? (
                              <Pause className={`w-5 h-5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'} fill-current`} />
                            ) : (
                              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-xs font-semibold truncate transition-colors ${
                            isCurrent 
                              ? isWWM ? 'text-emerald-300' : 'text-accent-300' 
                              : isWWM ? 'text-white group-hover:text-emerald-200' : 'text-white group-hover:text-accent-200'
                          }`}>
                            {track.title}
                          </h3>
                          <p className="text-[11px] text-gray-400 truncate">
                            {track.artist} {track.album ? `· ${track.album}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 ${isWWM ? 'text-emerald-300' : 'text-accent-300'} font-mono font-medium`}>
                              {track.format}
                            </span>
                            {track.year && (
                              <span className="text-[10px] text-gray-500 font-mono">
                                {track.year}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Duración, Editar y Favorito */}
                        <div className="flex flex-col items-end gap-1 text-[11px] text-gray-400 font-mono pr-1">
                          <span>{track.duration_str}</span>
                          <div className="flex items-center gap-0.5">
                            <button 
                              onClick={(e) => onOpenEdit(track, e)}
                              className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                              title="Editar metadatos">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => onToggleFavorite(track.id, e)}
                              className={`text-gray-500 ${isWWM ? 'hover:text-emerald-400' : 'hover:text-accent-400'} transition-colors p-1`}
                              title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                              <Heart className={`w-3.5 h-3.5 ${isFav ? (isWWM ? 'text-emerald-400 fill-current' : 'text-accent-400 fill-current') : ''}`} />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* VISTA TABLA (LIST) */}
              {viewMode === 'table' && tracks.length > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5 mb-24">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <button 
                            onClick={selectedTrackIds.size === filteredTracks.length ? onClearSelection : onSelectAllFiltered}
                            className="text-gray-400 hover:text-white transition-colors"
                            title={selectedTrackIds.size === filteredTracks.length ? "Deseleccionar todas" : "Seleccionar todas"}>
                            {selectedTrackIds.size > 0 && selectedTrackIds.size === filteredTracks.length ? (
                              <CheckSquare className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </th>
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Título</th>
                        <th className="py-2.5 px-4">Artista</th>
                        <th className="py-2.5 px-4">Álbum</th>
                        <th className="py-2.5 px-4 w-20 text-center">Formato</th>
                        <th className="py-2.5 px-4 w-20 text-right">Duración</th>
                        <th className="py-2.5 px-4 w-20 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTracks.map((track, idx) => {
                        const isCurrent = activeTrack?.id === track.id;
                        const isSelected = selectedTrackIds.has(track.id);
                        return (
                          <tr 
                            key={track.id}
                            onClick={() => onPlayTrack(track)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? isWWM ? 'bg-emerald-500/20 text-emerald-200' : 'bg-accent-500/20 text-accent-200'
                                : isCurrent 
                                  ? isWWM ? 'bg-emerald-500/10 text-emerald-300' : 'bg-accent-500/10 text-accent-300' 
                                  : 'hover:bg-white/5 text-gray-300'
                            }`}>
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={(e) => onToggleSelectTrack(track.id, e)}
                                className={`p-1 rounded-md transition-colors ${
                                  isSelected ? (isWWM ? 'text-emerald-400' : 'text-accent-400') : 'text-gray-600 hover:text-gray-400'
                                }`}>
                                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="py-2 px-4 text-center text-gray-500 font-mono">
                              {isCurrent && isPlaying ? '▶' : idx + 1}
                            </td>
                            <td className="py-2 px-4 font-semibold text-white truncate max-w-xs">
                              {track.title}
                            </td>
                            <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                              {track.artist || '—'}
                            </td>
                            <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                              {track.album || '—'}
                            </td>
                            <td className={`py-2 px-4 text-center font-mono text-[10px] ${isWWM ? 'text-emerald-300' : 'text-accent-300'}`}>
                              {track.format}
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-gray-400">
                              {track.duration_str}
                            </td>
                            <td className="py-2 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onOpenEdit(track, e); }}
                                  className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                                  title="Editar metadatos">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => onToggleFavorite(track.id, e)}
                                  className={`text-gray-500 ${isWWM ? 'hover:text-emerald-400' : 'hover:text-accent-400'} transition-colors p-1`}
                                  title={favorites.includes(track.id) ? "Quitar de favoritas" : "Marcar como favorita"}>
                                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(track.id) ? (isWWM ? 'text-emerald-400 fill-current' : 'text-accent-400 fill-current') : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VISTA ÁLBUMES (ALBUM SHELF) */}
              {viewMode === 'albums' && tracks.length > 0 && (
                <div className="mb-24">
                  {selectedAlbum ? (
                    /* VISTA DETALLADA DEL ÁLBUM SELECCIONADO */
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
                      
                      {/* Barra de navegación superior con botón atrás */}
                      <div className="flex items-center justify-between">
                        <button 
                          onClick={() => onSetExpandedAlbumKey(null)}
                          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95">
                          <ArrowLeft className="w-4 h-4" />
                          <span>Volver a Álbumes</span>
                        </button>
                        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
                          <span>Biblioteca</span>
                          <span>/</span>
                          <span>Álbumes</span>
                          <span>/</span>
                          <span className="text-white font-semibold truncate max-w-xs">{selectedAlbum.album}</span>
                        </div>
                      </div>

                      {/* Hero Banner del Álbum con Funda y Vinilo */}
                      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-card border border-white/10 bg-gradient-to-r ${isWWM ? 'from-emerald-950/40 via-teal-950/30 to-black/20' : 'from-accent-950/40 via-purple-950/30 to-black/20'}`}>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10">
                          
                          {/* Portada 3D con disco de vinilo asomándose */}
                          <div className="relative group/sleeve flex-shrink-0">
                            {/* Disco de vinilo que gira si una pista de este álbum está sonando */}
                            <div className={`absolute top-2 -right-6 sm:-right-8 w-44 h-44 sm:w-52 sm:h-52 rounded-full vinyl-disc transition-transform duration-500 flex items-center justify-center ${
                              selectedAlbum.tracks.some(t => t.id === activeTrack?.id) && isPlaying 
                                ? 'animate-spin-slow shadow-2xl' 
                                : 'group-hover/sleeve:translate-x-3'
                            }`}>
                              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/20 ${isWWM ? 'bg-gradient-to-tr from-emerald-800 to-teal-700' : 'bg-gradient-to-tr from-accent-800 to-purple-700'} flex items-center justify-center shadow-inner`}>
                                <div className="w-4 h-4 rounded-full bg-black/90 border border-white/10" />
                              </div>
                            </div>

                            {/* Funda del disco */}
                            <div className="relative z-10 w-44 h-44 sm:w-52 sm:h-52 rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-2xl">
                              {selectedAlbum.cover_url ? (
                                <img 
                                  src={getCoverSrc(selectedAlbum.cover_url)} 
                                  alt={selectedAlbum.album}
                                  className="w-full h-full object-cover" 
                                />
                              ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${isWWM ? 'from-emerald-950/80 to-teal-900/60' : 'from-purple-900/60 to-accent-900/60'} flex flex-col items-center justify-center p-4 text-center`}>
                                  <Disc3 className={`w-16 h-16 ${isWWM ? 'text-emerald-400/80' : 'text-accent-400/80'} mb-2`} />
                                  <span className="text-xs text-gray-300 font-bold truncate max-w-full">{selectedAlbum.album}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                            </div>
                          </div>

                          {/* Metadatos y acciones del álbum */}
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border border-white/10 bg-white/5">
                              <Disc3 className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                              <span className="text-gray-300">Álbum Completo</span>
                            </div>
                            
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-1 truncate" title={selectedAlbum.album}>
                              {selectedAlbum.album}
                            </h1>
                            
                            <p className="text-sm font-semibold text-gray-300 mb-4 truncate" title={selectedAlbum.artist}>
                              {selectedAlbum.artist}
                            </p>

                            {/* Píldoras de información */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 mb-6 text-xs text-gray-400 font-mono">
                              {selectedAlbum.year && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                  <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                  <span>{selectedAlbum.year}</span>
                                </span>
                              )}
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                <Disc3 className="w-3.5 h-3.5 text-gray-500" />
                                <span>{selectedAlbum.tracks.length} {selectedAlbum.tracks.length === 1 ? 'canción' : 'canciones'}</span>
                              </span>
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/5">
                                <Clock className="w-3.5 h-3.5 text-gray-500" />
                                <span>{formatTotalTime(selectedAlbum.totalDurationSec)}</span>
                              </span>
                              {selectedAlbum.formats.map((fmt) => (
                                <span key={fmt} className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${isWWM ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-accent-500/20 text-accent-300 border border-accent-500/30'}`}>
                                  {fmt}
                                </span>
                              ))}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                              <button 
                                onClick={() => onPlayAlbum(selectedAlbum)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${isWWM ? 'from-emerald-500 to-teal-400 shadow-emerald-500/25' : 'from-accent-500 to-accent-400 shadow-accent-500/25'} text-white text-xs font-bold shadow-xl hover:brightness-110 active:scale-95 transition-all`}>
                                <Play className="w-4 h-4 fill-current" />
                                <span>Reproducir Álbum</span>
                              </button>
                              
                              <button 
                                onClick={(e) => onSelectAlbumTracks(selectedAlbum, e)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all active:scale-95">
                                <Layers className="w-4 h-4" />
                                <span>
                                  {selectedAlbum.tracks.every(t => selectedTrackIds.has(t.id)) 
                                    ? 'Deseleccionar Pistas' 
                                    : 'Seleccionar para Lote'}
                                </span>
                              </button>
                            </div>

                          </div>
                        </div>
                      </div>

                      {/* Lista de Canciones del Álbum */}
                      <div className="glass-card rounded-2xl overflow-hidden border border-white/5">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                            <tr>
                              <th className="py-2.5 px-3 w-10 text-center">
                                <button 
                                  onClick={(e) => onSelectAlbumTracks(selectedAlbum, e)}
                                  className="text-gray-400 hover:text-white transition-colors"
                                  title="Seleccionar todas las pistas del álbum">
                                  {selectedAlbum.tracks.every(t => selectedTrackIds.has(t.id)) ? (
                                    <CheckSquare className={`w-3.5 h-3.5 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
                                  ) : (
                                    <Square className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </th>
                              <th className="py-2.5 px-4 w-12 text-center">#</th>
                              <th className="py-2.5 px-4">Título</th>
                              <th className="py-2.5 px-4">Artista</th>
                              <th className="py-2.5 px-4 w-20 text-center">Formato</th>
                              <th className="py-2.5 px-4 w-20 text-right">Duración</th>
                              <th className="py-2.5 px-4 w-20 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {selectedAlbum.tracks.map((track, idx) => {
                              const isCurrent = activeTrack?.id === track.id;
                              const isSelected = selectedTrackIds.has(track.id);
                              const isFav = favorites.includes(track.id);
                              return (
                                <tr 
                                  key={track.id}
                                  onClick={() => onPlayTrack(track)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? isWWM ? 'bg-emerald-500/20 text-emerald-200' : 'bg-accent-500/20 text-accent-200'
                                      : isCurrent 
                                        ? isWWM ? 'bg-emerald-500/10 text-emerald-300' : 'bg-accent-500/10 text-accent-300' 
                                        : 'hover:bg-white/5 text-gray-300'
                                  }`}>
                                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={(e) => onToggleSelectTrack(track.id, e)}
                                      className={`p-1 rounded-md transition-colors ${
                                        isSelected ? (isWWM ? 'text-emerald-400' : 'text-accent-400') : 'text-gray-600 hover:text-gray-400'
                                      }`}>
                                      {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                                    </button>
                                  </td>
                                  <td className="py-2 px-4 text-center text-gray-500 font-mono">
                                    {isCurrent && isPlaying ? '▶' : track.track_number || idx + 1}
                                  </td>
                                  <td className="py-2 px-4 font-semibold text-white truncate max-w-xs">
                                    {track.title}
                                  </td>
                                  <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                                    {track.artist}
                                  </td>
                                  <td className={`py-2 px-4 text-center font-mono text-[10px] ${isWWM ? 'text-emerald-300' : 'text-accent-300'}`}>
                                    {track.format}
                                  </td>
                                  <td className="py-2 px-4 text-right font-mono text-gray-400">
                                    {track.duration_str}
                                  </td>
                                  <td className="py-2 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); onOpenEdit(track, e); }}
                                        className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                                        title="Editar metadatos">
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={(e) => onToggleFavorite(track.id, e)}
                                        className={`text-gray-500 ${isWWM ? 'hover:text-emerald-400' : 'hover:text-accent-400'} transition-colors p-1`}
                                        title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                                        <Heart className={`w-3.5 h-3.5 ${isFav ? (isWWM ? 'text-emerald-400 fill-current' : 'text-accent-400 fill-current') : ''}`} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  ) : (
                    /* ESTANTE GENERAL DE ÁLBUMES (GRID) */
                    <div>
                      {/* Subbarra informativa */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs text-gray-400 font-mono">
                          <span className="text-white font-bold">{albumGroups.length}</span> {albumGroups.length === 1 ? 'álbum' : 'álbumes'} en tu colección
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {albumGroups.map((group) => {
                          const isAlbumPlaying = group.tracks.some(t => t.id === activeTrack?.id) && isPlaying;
                          const hasSelectedTracks = group.tracks.some(t => selectedTrackIds.has(t.id));

                          return (
                            <div 
                              key={group.key}
                              onClick={() => onSetExpandedAlbumKey(group.key)}
                              className={`group relative flex flex-col p-3 rounded-2xl glass-card transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl border ${
                                hasSelectedTracks 
                                  ? isWWM ? 'border-emerald-500/60 ring-1 ring-emerald-500/40 bg-emerald-950/20' : 'border-accent-500/60 ring-1 ring-accent-500/40 bg-accent-950/20' 
                                  : isAlbumPlaying 
                                    ? isWWM ? 'border-emerald-500/50 shadow-lg shadow-emerald-950/40' : 'border-accent-500/50 shadow-lg shadow-accent-950/40'
                                    : 'border-white/5 hover:border-white/20'
                              }`}>
                              
                              {/* Funda del Disco con Vinilo peeking */}
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 shadow-inner mb-3 flex items-center justify-center">
                                
                                {/* Disco de vinilo asomándose en hover */}
                                <div className={`absolute right-1 top-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full vinyl-disc opacity-0 group-hover:opacity-100 group-hover:translate-x-3 transition-all duration-300 pointer-events-none flex items-center justify-center ${
                                  isAlbumPlaying ? 'opacity-100 translate-x-2 animate-spin-slow' : ''
                                }`}>
                                  <div className={`w-8 h-8 rounded-full border border-white/20 ${isWWM ? 'bg-emerald-800' : 'bg-accent-800'} flex items-center justify-center shadow-inner`}>
                                    <div className="w-2.5 h-2.5 rounded-full bg-black/90" />
                                  </div>
                                </div>

                                {/* Carátula de portada */}
                                {group.cover_url ? (
                                  <img 
                                    src={getCoverSrc(group.cover_url)} 
                                    alt={group.album}
                                    className="relative z-10 w-full h-full object-cover rounded-xl group-hover:shadow-lg transition-transform duration-300 group-hover:scale-102" 
                                  />
                                ) : (
                                  <div className={`relative z-10 w-full h-full rounded-xl bg-gradient-to-br ${isWWM ? 'from-emerald-950/60 to-teal-900/40' : 'from-purple-900/40 to-accent-900/40'} flex flex-col items-center justify-center text-center p-3`}>
                                    <Disc3 className={`w-10 h-10 ${isWWM ? 'text-emerald-400/80' : 'text-accent-400/80'} mb-1`} />
                                    <span className="text-[10px] text-gray-400 font-mono truncate max-w-full">{group.album}</span>
                                  </div>
                                )}

                                {/* Overlay de Play directo al pasar el mouse */}
                                <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onPlayAlbum(group); }}
                                    className={`p-3 rounded-full bg-gradient-to-r ${isWWM ? 'from-emerald-500 to-teal-400 shadow-emerald-500/40' : 'from-accent-500 to-accent-400 shadow-accent-500/40'} text-white shadow-xl hover:scale-110 active:scale-95 transition-all`}
                                    title="Reproducir álbum">
                                    <Play className="w-4 h-4 fill-current ml-0.5" />
                                  </button>
                                </div>

                                {/* Formato badge */}
                                {group.formats.length > 0 && (
                                  <div className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[9px] font-mono text-gray-300 font-semibold border border-white/10">
                                    {group.formats[0]}
                                  </div>
                                )}
                              </div>

                              {/* Título y Artista */}
                              <h3 className={`text-xs font-bold text-white truncate ${isWWM ? 'group-hover:text-emerald-300' : 'group-hover:text-accent-300'} transition-colors`} title={group.album}>
                                {group.album}
                              </h3>
                              <p className="text-[11px] text-gray-400 truncate mt-0.5" title={group.artist}>
                                {group.artist}
                              </p>

                              {/* Footer con pistas y año */}
                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-gray-500 font-mono">
                                <span>{group.tracks.length} {group.tracks.length === 1 ? 'pista' : 'pistas'}</span>
                                {group.year && <span>{group.year}</span>}
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
  );
}
