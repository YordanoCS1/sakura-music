import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { invoke, showInFolder, trashItem, confirm, musicDir } from '../bridge';
import { InfoPanel } from '../components/InfoPanel';
import { MetadataEditor } from '../components/MetadataEditor';
import { FolderCoverModal } from '../components/FolderCoverModal';
import { ContextMenu } from '../components/ContextMenu';
import { Skeleton } from '../components/Skeleton';
import { Play, Edit3, Info, FolderOpen, Trash2 } from 'lucide-react';
import { LayoutGlass } from '../components/library/LayoutGlass';
import { LayoutListMinimal } from '../components/library/LayoutListMinimal';
import { LayoutMasonry } from '../components/library/LayoutMasonry';
import { LayoutSplit } from '../components/library/LayoutSplit';
import { LayoutCarousel } from '../components/library/LayoutCarousel';
import { LayoutMosaic } from '../components/library/LayoutMosaic';
import { LayoutFeed } from '../components/library/LayoutFeed';
import { LayoutIndex } from '../components/library/LayoutIndex';
import { LayoutFrame } from '../components/library/LayoutFrame';
import { LayoutCityPop } from '../components/library/LayoutCityPop';
import { LayoutTokyoNeon } from '../components/library/LayoutTokyoNeon';
import { LayoutKawaii } from '../components/library/LayoutKawaii';
import { LayoutVisualKei } from '../components/library/LayoutVisualKei';
import { LayoutZenGarden } from '../components/library/LayoutZenGarden';
import { LayoutRetroWave } from '../components/library/LayoutRetroWave';
import { LayoutAnimeOP } from '../components/library/LayoutAnimeOP';
import { LayoutYokai } from '../components/library/LayoutYokai';
import { LayoutCiudadProhibida } from '../components/library/LayoutCiudadProhibida';
import { LayoutErudito } from '../components/library/LayoutErudito';
import { LayoutPorcelana } from '../components/library/LayoutPorcelana';
import { LayoutDragon } from '../components/library/LayoutDragon';
import { LayoutFestival } from '../components/library/LayoutFestival';
import { LayoutJade } from '../components/library/LayoutJade';
import type { FileItem, SongMetadata } from './LibraryTypes';
import type { LibraryLayout } from '../components/library/LayoutTypes';
import toast from 'react-hot-toast';

type SortKey = 'name' | 'artist' | 'date' | 'size';

const emptyMeta: SongMetadata = { title: null, artist: null, album: null, cover: null, duration: null };

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const numeral = (n: number) => n.toLocaleString();

const layouts: Record<LibraryLayout, React.FC<any>> = {
  glass: LayoutGlass, 'list-minimal': LayoutListMinimal, masonry: LayoutMasonry, split: LayoutSplit, carousel: LayoutCarousel, mosaic: LayoutMosaic, feed: LayoutFeed, index: LayoutIndex, frame: LayoutFrame,
  citypop: LayoutCityPop, 'tokyo-neon': LayoutTokyoNeon, kawaii: LayoutKawaii, 'visual-kei': LayoutVisualKei, 'zen-garden': LayoutZenGarden, retrowave: LayoutRetroWave,
  'anime-op': LayoutAnimeOP, yokai: LayoutYokai, 'ciudad-prohibida': LayoutCiudadProhibida, erudito: LayoutErudito, porcelana: LayoutPorcelana, dragon: LayoutDragon, festival: LayoutFestival, jade: LayoutJade,
};

export const LibraryPage: React.FC = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [libraryLayout, setLibraryLayout] = useState<LibraryLayout>(() => (localStorage.getItem('library_layout') as LibraryLayout) || 'glass');
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterType, setFilterType] = useState<string>('all');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [infoPanelFile, setInfoPanelFile] = useState<FileItem | null>(null);
  const [metadataEditorFile, setMetadataEditorFile] = useState<FileItem | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{ name: string; path: string }[]>([]);
  const [libraryRoot, setLibraryRoot] = useState('');
  const metasRef = useRef<Map<string, SongMetadata>>(new Map());
  const [metaVersion, setMetaVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [folderCoverTarget, setFolderCoverTarget] = useState<FileItem | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; file: FileItem } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastClickedPathRef = useRef<string | null>(null);
  const folderCoversRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const p = localStorage.getItem('libraryPath') || localStorage.getItem('downloadPath') || musicDir;
    setLibraryRoot(p);
    loadPath(p);
  }, []);

  useEffect(() => {
    localStorage.setItem('library_layout', libraryLayout);
  }, [libraryLayout]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 200);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const stats = useMemo(() => {
    const audioFiles = files.filter(f => f.is_audio);
    const totalSize = audioFiles.reduce((acc, f) => acc + (f.size || 0), 0);
    return {
      totalFiles: audioFiles.length,
      folders: files.filter(f => f.is_dir).length,
      totalSize: (totalSize / (1024 * 1024 * 1024)).toFixed(1),
    };
  }, [files]);

  const filteredAndSortedFiles = useMemo(() => {
    let f = [...files];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      f = f.filter(x => x.name.toLowerCase().includes(q) || (getMeta(x.path)?.artist || '').toLowerCase().includes(q) || (getMeta(x.path)?.album || '').toLowerCase().includes(q));
    }
    if (filterType === 'audio') f = f.filter(x => x.is_audio);
    else if (filterType === 'video') f = f.filter(x => x.is_video);
    else if (filterType === 'folder') f = f.filter(x => x.is_dir);
    else f = f.filter(x => x.is_dir || x.is_audio || x.is_video);
    f.sort((a, b) => {
      if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
      const dir = sortOrder === 'asc' ? 1 : -1;
      if (sortBy === 'name') return dir * a.name.localeCompare(b.name);
      if (sortBy === 'size') return dir * (a.size - b.size);
      if (sortBy === 'date') return dir * (a.modified - b.modified);
      if (sortBy === 'artist') {
        const ma = getMeta(a.path)?.artist || '';
        const mb = getMeta(b.path)?.artist || '';
        return dir * ma.localeCompare(mb);
      }
      return 0;
    });
    return f;
  }, [files, searchQuery, sortBy, sortOrder, filterType, metaVersion]);

  const filteredRef = useRef(filteredAndSortedFiles);
  filteredRef.current = filteredAndSortedFiles;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedFiles(new Set()); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const paths = filteredRef.current.filter(f => !f.is_dir).map(f => f.path);
        setSelectedFiles(new Set(paths));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const getMeta = useCallback((path: string): SongMetadata | null => {
    const m = metasRef.current.get(path);
    if (m) return m;
    const folderCover = folderCoversRef.current.get(path);
    if (folderCover) return { title: null, artist: null, album: null, cover: folderCover, duration: null };
    return null;
  }, []);

  async function loadPath(p?: string) {
    const target = p || libraryRoot;
    if (!target) return;
    setLoading(true);
    setSelectedFiles(new Set());
    try {
      const result = await invoke<FileItem[]>('list_directory', { dirPath: target });
      setFiles(result || []);
      setCurrentPath(target);
      updateBreadcrumbs(target);
      const coverTs = Date.now();
      folderCoversRef.current = new Map();
      for (const f of result || []) {
        if (f.is_dir && f.cover) {
          folderCoversRef.current.set(f.path, `sakura-cover:///${encodeURIComponent(f.cover)}?t=${coverTs}`);
        }
      }
      loadMetadataForFiles(result || []);
    } catch {
      toast.error('Error al cargar la biblioteca');
    } finally { setLoading(false); }
  }

  function loadMetadataForFiles(items: FileItem[]) {
    const audios = items.filter(f => f.is_audio);
    if (audios.length === 0) return;
    let i = 0;
    let pending = 0;
    let batchCount = 0;
    const BATCH_SIZE = 20;
    function flushBatch() {
      if (batchCount > 0) { setMetaVersion(v => v + 1); batchCount = 0; }
    }
    function next() {
      while (pending < 4 && i < audios.length) {
        const f = audios[i++];
        pending++;
        invoke<SongMetadata>('get_file_metadata', { filePath: f.path }).then(meta => {
          if (meta) {
            metasRef.current.set(f.path, meta);
            batchCount++;
            if (batchCount >= BATCH_SIZE) flushBatch();
          }
        }).catch(() => {}).finally(() => { pending--; next(); });
      }
      if (pending === 0 && i >= audios.length) flushBatch();
    }
    next();
  }

  function updateBreadcrumbs(p: string) {
    const parts = p.replace(/\\/g, '/').split('/').filter(Boolean);
    const crumbs = [{ name: 'Biblioteca', path: libraryRoot }];
    let cur = '';
    for (const part of parts) {
      cur += (cur ? '\\' : '') + part;
      crumbs.push({ name: part, path: cur });
    }
    setBreadcrumbs(crumbs);
  }

  const handleFileClick = useCallback((file: FileItem, isDir: boolean) => {
    if (isDir) { loadPath(file.path); setSelectedFile(null); }
    else { setSelectedFile(file); }
  }, []);

  const handleSelectWithShift = useCallback((path: string, isShift: boolean) => {
    if (isShift && lastClickedPathRef.current) {
      const fromIdx = filteredAndSortedFiles.findIndex(f => f.path === lastClickedPathRef.current);
      const toIdx = filteredAndSortedFiles.findIndex(f => f.path === path);
      if (fromIdx !== -1 && toIdx !== -1) {
        const [start, end] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
        setSelectedFiles(new Set(filteredAndSortedFiles.slice(start, end + 1).map(f => f.path)));
        return;
      }
    }
    lastClickedPathRef.current = path;
    setSelectedFiles(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  }, [filteredAndSortedFiles]);

  function clearSelection() { setSelectedFiles(new Set()); }

  const handleOpenEditor = useCallback((file: FileItem) => {
    if (file.is_dir) setFolderCoverTarget(file);
    else setMetadataEditorFile(file);
  }, []);

  const handleContextMenu = useCallback((file: FileItem, e: React.MouseEvent) => {
    e.preventDefault();
    setSelectedFile(file);
    setSelectedFiles(new Set([file.path]));
    setCtxMenu({ x: e.clientX, y: e.clientY, file });
  }, []);

  const handleCtxAction = useCallback((action: string) => {
    const file = ctxMenu?.file;
    if (!file) return;
    setCtxMenu(null);
    if (action === 'play') {
      window.dispatchEvent(new CustomEvent('play-song', { detail: { ...file, id: file.path, title: getMeta(file.path)?.title || file.name, artist: getMeta(file.path)?.artist || '' } }));
    } else if (action === 'edit') {
      handleOpenEditor(file);
    } else if (action === 'info') {
      setInfoPanelFile(file);
    } else if (action === 'folder') {
      showInFolder(file.path);
    } else if (action === 'delete') {
      handleDeleteFiles([file.path]);
    }
  }, [ctxMenu, handleOpenEditor, setInfoPanelFile]);

  async function handleDeleteFiles(paths: string[]) {
    const ok = await confirm(`Eliminar ${paths.length} archivo(s)? Esta acción no se puede deshacer.`);
    if (!ok) return;
    let deleted = 0;
    for (const p of paths) { try { await trashItem(p); deleted++; } catch {} }
    toast.success(`${deleted} archivo(s) eliminado(s)`);
    clearSelection();
    loadPath(currentPath);
  }

  const handleSort = useCallback((key: string) => {
    if (sortBy === key) setSortOrder(o => o === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key as SortKey); setSortOrder('asc'); }
  }, [sortBy]);

  const navigateToRoot = useCallback(() => loadPath(libraryRoot), [libraryRoot]);

  const layoutProps = useMemo(() => ({
    files, filteredFiles: filteredAndSortedFiles, currentPath, breadcrumbs, libraryRoot, searchQuery,
    selectedFiles, selectedFile, loading, stats, getMeta, formatDuration, formatSize, numeral,
    navigate: loadPath, navigateToRoot,
    onFileClick: handleFileClick, onFileContextMenu: handleContextMenu, onSelect: handleSelectWithShift, clearSelection,
    onDeleteFiles: handleDeleteFiles, onOpenInfo: setInfoPanelFile, onOpenEditor: handleOpenEditor,
    searchInput, onSearchChange: setSearchInput,
    sortBy, sortOrder, onSort: handleSort,
    filterType, onFilterChange: setFilterType,
    hoveredCard, onHover: setHoveredCard,
    scrollRef, setSelectedFile, loadPath, setInfoPanelFile, setMetadataEditorFile,
  }), [files, filteredAndSortedFiles, currentPath, breadcrumbs, libraryRoot, searchQuery,
    selectedFiles, selectedFile, loading, stats, getMeta, formatDuration, formatSize, numeral,
    loadPath, navigateToRoot, handleFileClick, handleContextMenu, handleSelectWithShift, clearSelection,
    handleDeleteFiles, setInfoPanelFile, handleOpenEditor,
    searchInput, setSearchInput, sortBy, sortOrder, handleSort,
    filterType, setFilterType, hoveredCard, setHoveredCard,
    scrollRef, setSelectedFile, setMetadataEditorFile]);

  const LayoutComponent = layouts[libraryLayout];

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {loading && files.length === 0 ? (
        <div style={{ padding: '32px 32px 120px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="flex items-center gap-3 mb-2">
            <Skeleton width={36} height={36} borderRadius={8} />
            <Skeleton width="30%" height={18} borderRadius={6} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
                <Skeleton width="100%" height={140} borderRadius={10} style={{ marginBottom: 10 }} />
                <Skeleton width="70%" height={14} borderRadius={4} style={{ marginBottom: 6 }} />
                <Skeleton width="50%" height={10} borderRadius={4} />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <LayoutComponent {...layoutProps} />
      )}
      {infoPanelFile && (
        <InfoPanel file={infoPanelFile} onClose={() => setInfoPanelFile(null)}
          onEdit={() => { setMetadataEditorFile(infoPanelFile); setInfoPanelFile(null); }}
          onPlay={() => setInfoPanelFile(null)} />
      )}
      {metadataEditorFile && (
        <MetadataEditor file={metadataEditorFile} onClose={() => setMetadataEditorFile(null)}
          onSave={() => { loadPath(currentPath); setMetadataEditorFile(null); }} libraryLayout={libraryLayout} />
      )}
      {folderCoverTarget && (
        <FolderCoverModal
          folderName={folderCoverTarget.name}
          folderPath={folderCoverTarget.path}
          onClose={() => setFolderCoverTarget(null)}
          onSaved={() => { loadPath(currentPath); setFolderCoverTarget(null); }} />
      )}
      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={[
          { label: 'Reproducir', icon: <Play size={13} />, onClick: () => handleCtxAction('play') },
          { label: 'Editar metadatos', icon: <Edit3 size={13} />, onClick: () => handleCtxAction('edit') },
          { label: 'Información', icon: <Info size={13} />, onClick: () => handleCtxAction('info') },
          { label: 'Mostrar en carpeta', icon: <FolderOpen size={13} />, onClick: () => handleCtxAction('folder') },
          { label: 'Eliminar', icon: <Trash2 size={13} />, onClick: () => handleCtxAction('delete'), danger: true },
        ]} onClose={() => setCtxMenu(null)} />
      )}
    </div>
  );
};
