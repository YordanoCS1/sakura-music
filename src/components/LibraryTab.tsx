import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, Calendar, CheckSquare, ChevronLeft, ChevronRight, Clock, CornerLeftUp, Disc3, Folder, FolderOpen, Heart, Layers, Music2, Pause, Pencil, Play, Square } from 'lucide-react';
import type { RefObject } from 'react';
import type { AlbumGroup, FolderExplorerData, ScannedTrack, ViewMode } from '../types';
import VirtualizedGrid from './VirtualizedGrid';
import LibraryShowcase from './LibraryShowcase';
import NovelLibraryViews from './NovelLibraryViews';

type TableSortKey = 'track_number' | 'title' | 'artist' | 'album' | 'year' | 'format' | 'bitrate_kbps' | 'duration';

function getHanafudaSeason(track: ScannedTrack) {
  const genre = track.genre?.toLocaleLowerCase() ?? '';
  const format = track.format.toLocaleUpperCase();
  if (/jazz|classical|clásic|tradicional/.test(genre)) return { label: 'Crisantemo', symbol: '菊', className: 'hanafuda-autumn' };
  if (/rock|metal|punk/.test(genre)) return { label: 'Arce', symbol: '紅', className: 'hanafuda-maple' };
  if (/electronic|electrónica|ambient|chill/.test(genre) || format === 'FLAC') {
    return { label: 'Luna y bambú', symbol: '月', className: 'hanafuda-moon' };
  }
  return { label: 'Cerezo', symbol: '桜', className: 'hanafuda-spring' };
}

interface LibraryTabProps {
  tracks: ScannedTrack[];
  scrollElementRef: RefObject<HTMLDivElement | null>;
  filteredTracks: ScannedTrack[];
  favorites: string[];
  defaultMusicDir: string | null;
  isScanning: boolean;
  isPlaying: boolean;
  activeTrack: ScannedTrack | null;
  viewMode: ViewMode;
  selectedTrackIds: Set<string>;
  currentFolderNav: string[];
  folderExplorerData: FolderExplorerData;
  albumGroups: AlbumGroup[];
  selectedAlbum: AlbumGroup | null;
  getCoverSrc: (coverUrl: string | null) => string;
  formatTotalTime: (secs: number) => string;
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
  onSetFolderNav: (nav: string[]) => void;
  onSetExpandedAlbumKey: (key: string | null) => void;
  onPlayAlbum: (group: AlbumGroup) => void;
  onSelectAlbumTracks: (group: AlbumGroup, e: React.MouseEvent) => void;
}

export default function LibraryTab({
  tracks,
  scrollElementRef,
  filteredTracks,
  favorites,
  defaultMusicDir,
  isScanning,
  isPlaying,
  activeTrack,
  viewMode,
  selectedTrackIds,
  currentFolderNav,
  folderExplorerData,
  albumGroups,
  selectedAlbum,
  getCoverSrc,
  formatTotalTime,
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
  onSetFolderNav,
  onSetExpandedAlbumKey,
  onPlayAlbum,
  onSelectAlbumTracks,
}: LibraryTabProps) {
  const makimonoScrollRef = useRef<HTMLDivElement>(null);
  const favoriteTrackIds = useMemo(() => new Set(favorites), [favorites]);
  const [tableSort, setTableSort] = useState<{ key: TableSortKey; direction: 'asc' | 'desc' }>({
    key: 'track_number',
    direction: 'asc',
  });
  const makimonoTracks = filteredTracks;
  const sortedTableTracks = useMemo(() => {
    if (viewMode !== 'table') return filteredTracks;
    const direction = tableSort.direction === 'asc' ? 1 : -1;
    return [...filteredTracks].sort((a, b) => {
      const left = a[tableSort.key];
      const right = b[tableSort.key];
      if (left == null && right == null) return 0;
      if (left == null) return 1;
      if (right == null) return -1;
      if (typeof left === 'number' && typeof right === 'number') {
        return (left - right) * direction;
      }
      return String(left).localeCompare(String(right), undefined, { sensitivity: 'base', numeric: true }) * direction;
    });
  }, [filteredTracks, tableSort, viewMode]);

  const changeTableSort = (key: TableSortKey) => {
    setTableSort(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const tableSortButton = (key: TableSortKey, label: string, align = 'text-left') => (
    <button
      type="button"
      onClick={() => changeTableSort(key)}
      aria-sort={tableSort.key === key ? (tableSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`w-full inline-flex items-center gap-1 ${
        align === 'text-center' ? 'justify-center' : align === 'text-right' ? 'justify-end' : 'justify-start'
      } ${align} hover:text-white transition-colors`}>
      <span>{label}</span>
      <span className="text-[9px] text-accent-300">
        {tableSort.key === key ? (tableSort.direction === 'asc' ? '↑' : '↓') : '↕'}
      </span>
    </button>
  );

  return (
            <div className={`library-tab-content ${viewMode === 'albums' ? 'library-albums-view' : ''}`}>
              {/* Vistas novedosas (vinilos / 3D / luz / carrusel / flotante) */}
              {(viewMode === 'cds' || viewMode === 'tilt' || viewMode === 'glow' || viewMode === 'portadas') && (
                <NovelLibraryViews
                  view={viewMode}
                  tracks={filteredTracks}
                  albumGroups={albumGroups}
                  activeTrack={activeTrack}
                  isPlaying={isPlaying}
                  favorites={favorites}
                  getCoverSrc={getCoverSrc}
                  onPlayTrack={onPlayTrack}
                  onToggleFavorite={onToggleFavorite}
                  onPlayAlbum={onPlayAlbum}
                  onOpenEdit={onOpenEdit}
                />
              )}

              {/* Estado vacío si no hay canciones */}
              {tracks.length === 0 && !isScanning && !(viewMode === 'mosaic') && !(viewMode === 'cds' || viewMode === 'tilt' || viewMode === 'glow' || viewMode === 'portadas') && (
                <div className="library-empty-state flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border border-white/5 my-6">
                  <div className={`w-16 h-16 rounded-3xl ${'bg-accent-500/10 border border-accent-500/20'} flex items-center justify-center text-3xl mb-4`}>
                    {'🌸'}
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Tu biblioteca aún está vacía</h3>
                  <p className="text-xs text-gray-400 max-w-sm mb-6">
                    Selecciona una carpeta en tu disco para que el motor en Rust extraiga títulos, artistas, carátulas y formatos de audio en milisegundos.
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={onOpenFolderDialog}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r ${'from-accent-500 to-accent-400 shadow-accent-500/25'} text-white text-xs font-bold shadow-xl hover:brightness-110 active:scale-95 transition-all`}>
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
                    <Folder className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
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

              {/* VISTA PARED DE PORTADAS (MOSAIC) */}
              {viewMode === 'mosaic' && (
                <LibraryShowcase
                  mode={viewMode}
                  tracks={filteredTracks}
                  activeTrack={activeTrack}
                  isPlaying={isPlaying}
                  getCoverSrc={getCoverSrc}
                  onPlayTrack={onPlayTrack}
                  onOpenEdit={onOpenEdit}
                />
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
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r ${'from-accent-500 to-accent-400 shadow-accent-500/20'} text-white text-xs font-bold shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-40`}>
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
                          <Folder className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
                          <span>Carpetas ({folderExplorerData.subfolders.length})</span>
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                        {folderExplorerData.subfolders.map((sub) => (
                          <div 
                            key={sub.name}
                            onClick={() => onNavigateIntoFolder(sub.name)}
                            className={`group relative p-3.5 rounded-2xl glass-card transition-all duration-200 cursor-pointer hover:-translate-y-1 hover:shadow-xl border ${
                              'border-white/5 hover:border-accent-500/40'
                            } flex flex-col justify-between`}>
                            
                            <div className="flex items-start justify-between">
                              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                                'bg-gradient-to-tr from-accent-950/60 to-purple-900/40 text-accent-400 border border-accent-500/30'
                              } shadow-md group-hover:scale-105 transition-transform`}>
                                <Folder className="w-5 h-5 fill-current/25" />
                              </div>

                              <button 
                                onClick={(e) => { e.stopPropagation(); onPlayFolderTracks(sub.tracks); }}
                                className={`p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-r ${
                                  'from-accent-500 to-accent-400 shadow-accent-500/30'
                                } text-white shadow-md hover:scale-110 active:scale-95`}
                                title={`Reproducir carpeta ${sub.name}`}>
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              </button>
                            </div>

                            <div className="mt-3">
                              <h4 className={`text-xs font-bold text-white truncate ${'group-hover:text-accent-300'} transition-colors`} title={sub.name}>
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
                          <Music2 className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
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
                                    <CheckSquare className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
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
                              const isFav = favoriteTrackIds.has(track.id);

                              return (
                                <tr 
                                  key={track.id}
                                  onClick={() => onPlayTrack(track)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-accent-500/20 text-accent-200'
                                      : isCurrent 
                                        ? 'bg-accent-500/10 text-accent-300' 
                                        : 'hover:bg-white/5 text-gray-300'
                                  }`}>
                                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={(e) => onToggleSelectTrack(track.id, e)}
                                      className={`p-1 rounded-md transition-colors ${
                                        isSelected ? ('text-accent-400') : 'text-gray-600 hover:text-gray-400'
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
                                  <td className={`py-2 px-4 text-center font-mono text-[10px] ${'text-accent-300'}`}>
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
                                        className={`text-gray-500 ${'hover:text-accent-400'} transition-colors p-1`}
                                        title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                                        <Heart className={`w-3.5 h-3.5 ${isFav ? ('text-accent-400 fill-current') : ''}`} />
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
                    const isFav = favoriteTrackIds.has(track.id);
                    const isSelected = selectedTrackIds.has(track.id);

                    return (
                      <div 
                        key={track.id}
                        onClick={() => onPlayTrack(track)}
                        className={`group relative flex items-center gap-3.5 p-3 rounded-2xl glass-card transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-accent-500 bg-accent-500/15 shadow-lg'
                            : isCurrent 
                              ? 'ring-1 ring-accent-500/60 bg-white/10 shadow-lg' 
                              : 'hover:bg-white/5 hover:border-white/10'
                        }`}>
                        
                        {/* Checkbox de selección rápida para lote */}
                        <button
                          onClick={(e) => onToggleSelectTrack(track.id, e)}
                          className={`absolute top-2.5 left-2.5 z-10 p-1 rounded-lg backdrop-blur-md transition-all ${
                            isSelected 
                              ? 'bg-accent-500 text-white shadow-md' 
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
                            <div className={`w-full h-full bg-gradient-to-br ${'from-purple-900/40 to-accent-900/40'} flex items-center justify-center`}>
                              <Music2 className={`w-6 h-6 ${'text-accent-400/80'}`} />
                            </div>
                          )}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isCurrent && isPlaying ? (
                              <Pause className={`w-5 h-5 ${'text-accent-400'} fill-current`} />
                            ) : (
                              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-xs font-semibold truncate transition-colors ${
                            isCurrent 
                              ? 'text-accent-300' 
                              : 'text-white group-hover:text-accent-200'
                          }`}>
                            {track.title}
                          </h3>
                          <p className="text-[11px] text-gray-400 truncate">
                            {track.artist} {track.album ? `· ${track.album}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 ${'text-accent-300'} font-mono font-medium`}>
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
                              className={`text-gray-500 ${'hover:text-accent-400'} transition-colors p-1`}
                              title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                              <Heart className={`w-3.5 h-3.5 ${isFav ? ('text-accent-400 fill-current') : ''}`} />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* VISTA PERGAMINO MAKIMONO */}
              {false && ( /* makimono (reemplazada) */
                <section className={`makimono-scene mb-24 rounded-3xl ${'makimono-sakura'}`}>
                  <div className="flex items-center justify-between gap-4 px-5 pt-4 pb-3">
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-[0.24em] text-amber-100/70">巻物 · Makimono</p>
                      <h3 className="text-sm font-semibold text-white">Rollo de canciones</h3>
                    </div>
                    <p className="hidden sm:block text-[11px] text-gray-300/70">
                      {makimonoTracks.length} {makimonoTracks.length === 1 ? 'canción' : 'canciones'} · rueda para recorrer
                    </p>
                  </div>

                  <div className="makimono-roller" aria-hidden="true" />
                  <div className="relative px-3 sm:px-5 pb-5">
                    <button
                      type="button"
                      onClick={() => makimonoScrollRef.current?.scrollBy({ left: -480, behavior: 'smooth' })}
                      className="makimono-arrow left-1 sm:left-3"
                      aria-label="Desplazar pergamino hacia la izquierda">
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div
                      ref={makimonoScrollRef}
                      className="makimono-scroll custom-scroll"
                      role="region"
                      aria-label="Canciones en el pergamino horizontal"
                      tabIndex={0}
                      onWheel={(event) => {
                        const container = event.currentTarget;
                        const maxScroll = container.scrollWidth - container.clientWidth;
                        const canScrollInDirection = event.deltaY > 0
                          ? container.scrollLeft < maxScroll
                          : container.scrollLeft > 0;
                        if (Math.abs(event.deltaY) > Math.abs(event.deltaX) && canScrollInDirection) {
                          container.scrollLeft = Math.max(0, Math.min(maxScroll, container.scrollLeft + event.deltaY));
                          event.preventDefault();
                        }
                      }}>
                      <div className="makimono-shelf">
                        {makimonoTracks.length === 0 ? (
                          <p className="px-8 py-16 text-sm text-gray-300">No hay canciones para mostrar con este filtro.</p>
                        ) : (
                          makimonoTracks.map((track, index) => {
                            const isCurrent = activeTrack?.id === track.id;
                            const isSelected = selectedTrackIds.has(track.id);
                            const isFav = favoriteTrackIds.has(track.id);
                            const startsArtistSection = index === 0 || makimonoTracks[index - 1].artist !== track.artist;
                            return (
                              <div className="makimono-item" key={track.id}>
                                {startsArtistSection && (
                                  <div className="makimono-seal" title={track.artist || 'Artista desconocido'}>
                                    {(track.artist || '?').slice(0, 1).toLocaleUpperCase()}
                                  </div>
                                )}
                                <article className={`makimono-card ${isCurrent && isPlaying ? 'is-playing' : ''} ${isSelected ? 'is-selected' : ''}`}>
                                  <div className="makimono-cover">
                                    {track.cover_url ? (
                                      <img src={getCoverSrc(track.cover_url)} alt={`Portada de ${track.album || track.title}`} loading="lazy" decoding="async" />
                                    ) : (
                                      <div className="makimono-cover-fallback">
                                        <Music2 className="w-10 h-10" />
                                        <span>{track.title}</span>
                                      </div>
                                    )}
                                    <span className="makimono-format">{track.format}</span>
                                    {isCurrent && isPlaying && <span className="makimono-playing">En reproducción</span>}
                                  </div>
                                  <div className="makimono-track-copy">
                                    <h4 title={track.title}>{track.title}</h4>
                                    <p title={track.artist}>{track.artist || 'Artista desconocido'}</p>
                                    <div>
                                      <span title={track.album || 'Sin álbum'}>{track.album || 'Sin álbum'}</span>
                                      <span>{track.duration_str}{track.year ? ` · ${track.year}` : ''}</span>
                                    </div>
                                  </div>
                                  <div className="makimono-track-actions">
                                    <button
                                      type="button"
                                      onClick={() => onPlayTrack(track)}
                                      className="makimono-play"
                                      aria-label={`Reproducir ${track.title} de ${track.artist}`}>
                                      <Play className="h-3.5 w-3.5 fill-current" />
                                      Escuchar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => onToggleSelectTrack(track.id, event)}
                                      className={`makimono-select ${isSelected ? 'is-selected' : ''}`}
                                      aria-label={isSelected ? `Quitar selección de ${track.title}` : `Seleccionar ${track.title}`}>
                                      {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => onToggleFavorite(track.id, event)}
                                      className={`makimono-select ${isFav ? 'is-favorite' : ''}`}
                                      aria-label={isFav ? `Quitar ${track.title} de favoritas` : `Marcar ${track.title} como favorita`}>
                                      <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(event) => onOpenEdit(track, event)}
                                      className="makimono-select"
                                      aria-label={`Editar metadatos de ${track.title}`}>
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </article>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => makimonoScrollRef.current?.scrollBy({ left: 480, behavior: 'smooth' })}
                      className="makimono-arrow right-1 sm:right-3"
                      aria-label="Desplazar pergamino hacia la derecha">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="makimono-roller" aria-hidden="true" />
                </section>
              )}

              {/* VISTA JARDÍN NOCTURNO */}
              {false && ( /* lanterns (reemplazada) */
                <section className={`lantern-scene mb-24 rounded-3xl ${'lantern-sakura'}`}>
                  <header className="lantern-heading">
                    <div className="min-w-0">
                      <p className="lantern-kicker">夜 · Biblioteca nocturna</p>
                      <h3>Jardín de canciones</h3>
                    </div>
                    <span>{filteredTracks.length} {filteredTracks.length === 1 ? 'canción' : 'canciones'}</span>
                  </header>
                  <div className="lantern-river" role="list">
                    {filteredTracks.map((track, index) => {
                      const isCurrent = activeTrack?.id === track.id;
                      const isSelected = selectedTrackIds.has(track.id);
                      const isFav = favoriteTrackIds.has(track.id);
                      return (
                        <article
                          key={track.id}
                          className={`lantern-item ${isCurrent && isPlaying ? 'is-lit' : ''}`}
                          role="listitem">
                          <button
                            type="button"
                            className="lantern-play-target"
                            onClick={() => onPlayTrack(track)}
                            aria-label={`Reproducir ${track.title} de ${track.artist}`}>
                            <span className="lantern-index">{String(index + 1).padStart(2, '0')}</span>
                            <span className="lantern-cover">
                              {track.cover_url ? (
                                <img src={getCoverSrc(track.cover_url)} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <Music2 className="h-5 w-5" />
                              )}
                              <span className="lantern-cover-play">
                                {isCurrent && isPlaying
                                  ? <Pause className="h-4 w-4 fill-current" />
                                  : <Play className="h-4 w-4 fill-current" />}
                              </span>
                            </span>
                            <span className="lantern-copy">
                              <strong title={track.title}>{track.title}</strong>
                              <span title={track.artist}>{track.artist || 'Artista desconocido'}</span>
                            </span>
                            <span className="lantern-meta">
                              <span>{track.format}</span>
                              <span>{track.duration_str}{track.year ? ` · ${track.year}` : ''}</span>
                            </span>
                          </button>
                          <div className="lantern-controls">
                            <button
                              type="button"
                              onClick={(event) => onToggleSelectTrack(track.id, event)}
                              className={isSelected ? 'is-selected' : ''}
                              aria-label={isSelected ? `Quitar selección de ${track.title}` : `Seleccionar ${track.title} para edición en lote`}
                              title={isSelected ? 'Quitar selección' : 'Seleccionar para edición en lote'}>
                              {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              onClick={(event) => onToggleFavorite(track.id, event)}
                              className={isFav ? 'is-favorite' : ''}
                              aria-label={isFav ? `Quitar ${track.title} de favoritas` : `Marcar ${track.title} como favorita`}
                              title={isFav ? 'Quitar de favoritas' : 'Marcar como favorita'}>
                              <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => onOpenEdit(track, event)}
                              aria-label={`Editar metadatos de ${track.title}`}
                              title="Editar metadatos">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                    {filteredTracks.length === 0 && (
                      <p className="py-12 text-center text-sm text-gray-300">No hay canciones para mostrar con este filtro.</p>
                    )}
                  </div>
                </section>
              )}

              {/* VISTA CELOSÍAS SHŌJI */}
              {false && ( /* shoji (reemplazada) */
                <section className={`shoji-scene mb-24 rounded-3xl ${''}`}>
                  <header className="shoji-heading">
                    <div>
                      <p className="shoji-kicker">障子 · Shōji</p>
                      <h3>Galería de canciones</h3>
                    </div>
                    <span>{filteredTracks.length} {filteredTracks.length === 1 ? 'canción' : 'canciones'}</span>
                  </header>

                  {filteredTracks.length > 0 ? (
                      <VirtualizedGrid
                        items={filteredTracks}
                        scrollElementRef={scrollElementRef}
                        minItemWidth={340}
                        itemHeight={146}
                        className="shoji-grid"
                        renderItem={(track) => {
                        const isCurrent = track.id === activeTrack?.id && isPlaying;
                        const isSelected = selectedTrackIds.has(track.id);
                        const isFav = favoriteTrackIds.has(track.id);
                        return (
                          <article className={`shoji-panel shoji-song-panel ${isSelected ? 'is-selected' : ''} ${isCurrent ? 'is-playing' : ''}`}>
                            <span className="shoji-panel-cover">
                              {track.cover_url ? (
                                <img src={getCoverSrc(track.cover_url)} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <Music2 className="h-8 w-8" />
                              )}
                            </span>
                            <button
                              type="button"
                              className="shoji-panel-copy shoji-song-play"
                              onClick={() => onPlayTrack(track)}
                              aria-label={`Reproducir ${track.title} de ${track.artist}`}>
                              <strong title={track.title}>{track.title}</strong>
                              <span title={track.artist}>{track.artist || 'Artista desconocido'}</span>
                              <small title={track.album || 'Sin álbum'}>
                                {track.album || 'Sin álbum'} · {track.format} · {track.duration_str}
                              </small>
                            </button>
                            <div className="shoji-song-actions">
                              <button
                                type="button"
                                className={`shoji-action shoji-action-small ${isSelected ? 'is-selected' : ''}`}
                                onClick={(event) => onToggleSelectTrack(track.id, event)}
                                aria-label={isSelected ? `Quitar selección de ${track.title}` : `Seleccionar ${track.title}`}>
                                {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                              </button>
                              <button
                                type="button"
                                className={`shoji-action shoji-action-small ${isFav ? 'is-favorite' : ''}`}
                                onClick={(event) => onToggleFavorite(track.id, event)}
                                aria-label={isFav ? `Quitar ${track.title} de favoritas` : `Marcar ${track.title} como favorita`}>
                                <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                              </button>
                              <button
                                type="button"
                                className="shoji-action shoji-action-small"
                                onClick={(event) => onOpenEdit(track, event)}
                                aria-label={`Editar metadatos de ${track.title}`}>
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </article>
                        );
                        }}
                      />
                  ) : (
                    <p className="px-6 py-16 text-center text-sm text-gray-300">No hay canciones para mostrar con este filtro.</p>
                  )}
                </section>
              )}

              {/* VISTA CARTAS HANAFUDA */}
              {false && ( /* hanafuda (reemplazada) */
                <section className={`hanafuda-scene mb-24 ${''}`}>
                  <header className="hanafuda-heading">
                    <div>
                      <p className="hanafuda-kicker">花札 · Hanafuda</p>
                      <h3>Cartas de la colección</h3>
                    </div>
                    <span>{filteredTracks.length} {filteredTracks.length === 1 ? 'carta' : 'cartas'}</span>
                  </header>
                  {filteredTracks.length > 0 ? (
                    <VirtualizedGrid
                      items={filteredTracks}
                      scrollElementRef={scrollElementRef}
                      minItemWidth={150}
                      itemHeight={278}
                      className="hanafuda-grid"
                      renderItem={(track) => {
                      const season = getHanafudaSeason(track);
                      const isCurrent = activeTrack?.id === track.id;
                      const isSelected = selectedTrackIds.has(track.id);
                      const isFav = favoriteTrackIds.has(track.id);
                      return (
                        <article
                          key={track.id}
                          className={`hanafuda-card ${season.className} ${isCurrent && isPlaying ? 'is-playing' : ''} ${isSelected ? 'is-selected' : ''}`}>
                          <button
                            type="button"
                            className="hanafuda-play-target"
                            onClick={() => onPlayTrack(track)}
                            aria-label={`Reproducir ${track.title} de ${track.artist}`}>
                            <span className="hanafuda-card-top">
                              <span className="hanafuda-month">{season.label}</span>
                              <span className="hanafuda-seal" aria-label={`Estación: ${season.label}`}>{season.symbol}</span>
                            </span>
                            <span className="hanafuda-art">
                              {track.cover_url ? (
                                <img src={getCoverSrc(track.cover_url)} alt="" loading="lazy" decoding="async" />
                              ) : (
                                <span className="hanafuda-art-fallback"><Music2 className="h-10 w-10" /></span>
                              )}
                              <span className="hanafuda-audio">{track.format}</span>
                            </span>
                            <span className="hanafuda-caption">
                              <strong title={track.title}>{track.title}</strong>
                              <span title={track.artist}>{track.artist || 'Artista desconocido'}</span>
                              <small>{track.duration_str}{track.year ? ` · ${track.year}` : ''}</small>
                            </span>
                          </button>
                          <div className="hanafuda-actions">
                            <button
                              type="button"
                              className={isSelected ? 'is-selected' : ''}
                              onClick={(event) => onToggleSelectTrack(track.id, event)}
                              aria-label={isSelected ? `Quitar selección de ${track.title}` : `Seleccionar ${track.title} para edición en lote`}>
                              {isSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              type="button"
                              className={isFav ? 'is-favorite' : ''}
                              onClick={(event) => onToggleFavorite(track.id, event)}
                              aria-label={isFav ? `Quitar ${track.title} de favoritas` : `Marcar ${track.title} como favorita`}>
                              <Heart className={`h-3.5 w-3.5 ${isFav ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={(event) => onOpenEdit(track, event)}
                              aria-label={`Editar metadatos de ${track.title}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </article>
                      );
                      }}
                    />
                  ) : (
                    <p className="py-16 text-center text-sm text-gray-300">No hay canciones para mostrar con este filtro.</p>
                  )}
                </section>
              )}

              {/* VISTA TABLA (LIST) */}
              {viewMode === 'table' && tracks.length > 0 && (
                <div className="glass-card rounded-2xl overflow-x-auto border border-white/5 mb-24 custom-scroll">
                  <table className="w-full min-w-[980px] table-fixed text-left text-[11px]">
                    <thead className="sticky top-0 z-10 bg-[#17111e] text-[10px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                      <tr>
                        <th className="py-1.5 px-2 w-9 text-center">
                          <button 
                            onClick={selectedTrackIds.size === filteredTracks.length ? onClearSelection : onSelectAllFiltered}
                            className="text-gray-400 hover:text-white transition-colors"
                            title={selectedTrackIds.size === filteredTracks.length ? "Deseleccionar todas" : "Seleccionar todas"}>
                            {selectedTrackIds.size > 0 && selectedTrackIds.size === filteredTracks.length ? (
                              <CheckSquare className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </th>
                        <th className="py-1.5 px-2 w-12 text-center">{tableSortButton('track_number', '#', 'text-center')}</th>
                        <th className="py-1.5 px-2 min-w-48">{tableSortButton('title', 'Título')}</th>
                        <th className="py-1.5 px-2 min-w-36">{tableSortButton('artist', 'Artista')}</th>
                        <th className="py-1.5 px-2 min-w-36">{tableSortButton('album', 'Álbum')}</th>
                        <th className="py-1.5 px-2 w-16 text-center">{tableSortButton('year', 'Año', 'text-center')}</th>
                        <th className="py-1.5 px-2 w-20 text-center">{tableSortButton('format', 'Formato', 'text-center')}</th>
                        <th className="py-1.5 px-2 w-20 text-right">{tableSortButton('bitrate_kbps', 'Bitrate', 'text-right')}</th>
                        <th className="py-1.5 px-2 w-20 text-right">{tableSortButton('duration', 'Duración', 'text-right')}</th>
                        <th className="py-1.5 px-2 w-16 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {sortedTableTracks.map((track, idx) => {
                        const isCurrent = activeTrack?.id === track.id;
                        const isSelected = selectedTrackIds.has(track.id);
                        return (
                          <tr 
                            key={track.id}
                            onClick={() => onPlayTrack(track)}
                            className={`h-7 cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-accent-500/20 text-accent-200'
                                : isCurrent 
                                  ? 'bg-accent-500/10 text-accent-300' 
                                  : 'hover:bg-white/5 text-gray-300'
                            }`}>
                            <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={(e) => onToggleSelectTrack(track.id, e)}
                                className={`p-0.5 rounded-md transition-colors ${
                                  isSelected ? ('text-accent-400') : 'text-gray-600 hover:text-gray-400'
                                }`}>
                                {isSelected ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
                              </button>
                            </td>
                            <td className="px-2 text-center text-gray-500 font-mono">
                              {isCurrent && isPlaying ? '▶' : track.track_number ?? idx + 1}
                            </td>
                            <td className="px-2 font-semibold text-white truncate max-w-[240px]" title={track.title}>
                              {track.title}
                            </td>
                            <td className="px-2 truncate max-w-[180px] text-gray-400" title={track.artist}>
                              {track.artist || '—'}
                            </td>
                            <td className="px-2 truncate max-w-[180px] text-gray-400" title={track.album}>
                              {track.album || '—'}
                            </td>
                            <td className="px-2 text-center text-gray-400 font-mono">
                              {track.year ?? '—'}
                            </td>
                            <td className={`px-2 text-center font-mono text-[10px] ${'text-accent-300'}`}>
                              {track.format}
                            </td>
                            <td className="px-2 text-right font-mono text-gray-400">
                              {track.bitrate_kbps ? `${track.bitrate_kbps} kbps` : '—'}
                            </td>
                            <td className="px-2 text-right font-mono text-gray-400">
                              {track.duration_str}
                            </td>
                            <td className="px-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onOpenEdit(track, e); }}
                                  className="text-gray-500 hover:text-cyan-400 transition-colors p-0.5"
                                  title="Editar metadatos">
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={(e) => onToggleFavorite(track.id, e)}
                                  className={`text-gray-500 ${'hover:text-accent-400'} transition-colors p-0.5`}
                                  title={favoriteTrackIds.has(track.id) ? "Quitar de favoritas" : "Marcar como favorita"}>
                                  <Heart className={`w-3 h-3 ${favoriteTrackIds.has(track.id) ? ('text-accent-400 fill-current') : ''}`} />
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
                      <div className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 glass-card border border-white/10 bg-gradient-to-r ${'from-accent-950/40 via-purple-950/30 to-black/20'}`}>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 relative z-10">
                          
                          {/* Portada 3D con disco de vinilo asomándose */}
                          <div className="relative group/sleeve flex-shrink-0">
                            {/* Disco de vinilo que gira si una pista de este álbum está sonando */}
                            <div className={`absolute top-2 -right-6 sm:-right-8 w-44 h-44 sm:w-52 sm:h-52 rounded-full vinyl-disc transition-transform duration-500 flex items-center justify-center ${
                              selectedAlbum.tracks.some(t => t.id === activeTrack?.id) && isPlaying 
                                ? 'animate-spin-slow shadow-2xl' 
                                : 'group-hover/sleeve:translate-x-3'
                            }`}>
                              <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/20 ${'bg-gradient-to-tr from-accent-800 to-purple-700'} flex items-center justify-center shadow-inner`}>
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
                                <div className={`w-full h-full bg-gradient-to-br ${'from-purple-900/60 to-accent-900/60'} flex flex-col items-center justify-center p-4 text-center`}>
                                  <Disc3 className={`w-16 h-16 ${'text-accent-400/80'} mb-2`} />
                                  <span className="text-xs text-gray-300 font-bold truncate max-w-full">{selectedAlbum.album}</span>
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-tr from-black/20 via-transparent to-white/10 pointer-events-none" />
                            </div>
                          </div>

                          {/* Metadatos y acciones del álbum */}
                          <div className="flex-1 min-w-0 text-center sm:text-left">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border border-white/10 bg-white/5">
                              <Disc3 className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
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
                                <span key={fmt} className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${'bg-accent-500/20 text-accent-300 border border-accent-500/30'}`}>
                                  {fmt}
                                </span>
                              ))}
                            </div>

                            {/* Botones de acción */}
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
                              <button 
                                onClick={() => onPlayAlbum(selectedAlbum)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r ${'from-accent-500 to-accent-400 shadow-accent-500/25'} text-white text-xs font-bold shadow-xl hover:brightness-110 active:scale-95 transition-all`}>
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
                                    <CheckSquare className={`w-3.5 h-3.5 ${'text-accent-400'}`} />
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
                              const isFav = favoriteTrackIds.has(track.id);
                              return (
                                <tr 
                                  key={track.id}
                                  onClick={() => onPlayTrack(track)}
                                  className={`cursor-pointer transition-colors ${
                                    isSelected
                                      ? 'bg-accent-500/20 text-accent-200'
                                      : isCurrent 
                                        ? 'bg-accent-500/10 text-accent-300' 
                                        : 'hover:bg-white/5 text-gray-300'
                                  }`}>
                                  <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                                    <button 
                                      onClick={(e) => onToggleSelectTrack(track.id, e)}
                                      className={`p-1 rounded-md transition-colors ${
                                        isSelected ? ('text-accent-400') : 'text-gray-600 hover:text-gray-400'
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
                                  <td className={`py-2 px-4 text-center font-mono text-[10px] ${'text-accent-300'}`}>
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
                                        className={`text-gray-500 ${'hover:text-accent-400'} transition-colors p-1`}
                                        title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                                        <Heart className={`w-3.5 h-3.5 ${isFav ? ('text-accent-400 fill-current') : ''}`} />
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

                      <div className="library-album-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {albumGroups.map((group) => {
                          const isAlbumPlaying = group.tracks.some(t => t.id === activeTrack?.id) && isPlaying;
                          const hasSelectedTracks = group.tracks.some(t => selectedTrackIds.has(t.id));

                          return (
                            <div 
                              key={group.key}
                              onClick={() => onSetExpandedAlbumKey(group.key)}
                              className={`group relative flex flex-col p-3 rounded-2xl glass-card transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl border ${
                                hasSelectedTracks 
                                  ? 'border-accent-500/60 ring-1 ring-accent-500/40 bg-accent-950/20' 
                                  : isAlbumPlaying 
                                    ? 'border-accent-500/50 shadow-lg shadow-accent-950/40'
                                    : 'border-white/5 hover:border-white/20'
                              }`}>
                              
                              {/* Funda del Disco con Vinilo peeking */}
                              <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-black/40 shadow-inner mb-3 flex items-center justify-center">
                                
                                {/* Disco de vinilo asomándose en hover */}
                                <div className={`absolute right-1 top-1/2 -translate-y-1/2 w-4/5 h-4/5 rounded-full vinyl-disc opacity-0 group-hover:opacity-100 group-hover:translate-x-3 transition-all duration-300 pointer-events-none flex items-center justify-center ${
                                  isAlbumPlaying ? 'opacity-100 translate-x-2 animate-spin-slow' : ''
                                }`}>
                                  <div className={`w-8 h-8 rounded-full border border-white/20 ${'bg-accent-800'} flex items-center justify-center shadow-inner`}>
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
                                  <div className={`relative z-10 w-full h-full rounded-xl bg-gradient-to-br ${'from-purple-900/40 to-accent-900/40'} flex flex-col items-center justify-center text-center p-3`}>
                                    <Disc3 className={`w-10 h-10 ${'text-accent-400/80'} mb-1`} />
                                    <span className="text-[10px] text-gray-400 font-mono truncate max-w-full">{group.album}</span>
                                  </div>
                                )}

                                {/* Overlay de Play directo al pasar el mouse */}
                                <div className="absolute inset-0 z-20 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); onPlayAlbum(group); }}
                                    className={`p-3 rounded-full bg-gradient-to-r ${'from-accent-500 to-accent-400 shadow-accent-500/40'} text-white shadow-xl hover:scale-110 active:scale-95 transition-all`}
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
                              <h3 className={`text-xs font-bold text-white truncate ${'group-hover:text-accent-300'} transition-colors`} title={group.album}>
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
