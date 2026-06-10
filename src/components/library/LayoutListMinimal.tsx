import React, { useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music, Search, FolderOpen, Home, ChevronRight, Check, Trash2, Edit3, Info, ArrowUpDown } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

const Thumbnail: React.FC<{ cover: string | null; name: string }> = ({ cover, name }) => {
  const [err, setErr] = useState(false);
  if (cover && !err) {
    return (
      <img src={cover} alt="" className="flex-shrink-0 rounded object-cover"
        style={{ width: 32, height: 32 }}
        onError={() => setErr(true)} />
    );
  }
  return (
    <div className="flex-shrink-0 rounded flex items-center justify-center"
      style={{ width: 32, height: 32, background: 'var(--bg-hover)' }}>
      <Music size={14} style={{ color: 'var(--text-muted)' }} />
    </div>
  );
};

const FileRow: React.FC<{
  file: LibraryLayoutProps['files'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  isSelected: boolean;
  formatDuration: LibraryLayoutProps['formatDuration'];
  onSelect: (path: string, shift: boolean) => void;
  onOpenInfo: (file: LibraryLayoutProps['files'][0]) => void;
  onOpenEditor: (file: LibraryLayoutProps['files'][0]) => void;
  onClick: (file: LibraryLayoutProps['files'][0], isDir: boolean) => void;
  onContextMenu?: (file: LibraryLayoutProps['files'][0], e: React.MouseEvent) => void;
}> = React.memo(({ file, meta, isSelected, formatDuration, onSelect, onOpenInfo, onOpenEditor, onClick, onContextMenu }) => {
  const [h, sH] = useState(false);
  const isDir = file.is_dir;
  const title = meta?.title || file.name.replace(/\.[^/.]+$/, '');
  const artist = meta?.artist || (isDir ? '' : '\u2014');
  const album = meta?.album || (isDir ? '' : '\u2014');
  const duration = meta?.duration ?? null;

  const handleRowClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[data-select]')) return;
    onClick(file, isDir);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!isDir) onContextMenu?.(file, e);
  };

  return (
    <div
      onClick={handleRowClick}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => sH(true)}
      onMouseLeave={() => sH(false)}
      className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all"
      style={{
        background: isSelected ? 'var(--bg-hover)' : h ? 'var(--bg-hover)' : 'transparent',
        borderBottom: '1px solid var(--border-card)',
        height: 48,
      }}>
      <div data-select onClick={(e) => { e.stopPropagation(); onSelect(file.path, e.shiftKey); }}
        className="w-4 h-4 rounded flex items-center justify-center cursor-pointer flex-shrink-0 transition-all"
        style={{
          background: isSelected ? 'var(--text-nav)' : 'transparent',
          border: `1.5px solid ${isSelected ? 'var(--text-nav)' : 'var(--text-dim)'}`,
        }}>
        {isSelected && <Check size={10} strokeWidth={3} color="white" />}
      </div>

      {meta?.cover ? (
        <Thumbnail cover={meta.cover} name={file.name} />
      ) : isDir ? (
        <div className="flex-shrink-0 rounded flex items-center justify-center"
          style={{ width: 32, height: 32, background: 'var(--bg-hover)' }}>
          <FolderOpen size={16} style={{ color: 'var(--text-nav)' }} />
        </div>
      ) : (
        <Thumbnail cover={null} name={file.name} />
      )}

      <div className="flex-1 min-w-0" style={{ flex: '2 1 0' }}>
        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-heading)' }}>
          {isDir ? file.name : title}
        </p>
      </div>

      <div className="flex-1 min-w-0 hidden md:block" style={{ flex: '1.5 1 0' }}>
        <p className="text-xs truncate" style={{ color: 'var(--text-body)' }}>
          {isDir ? 'Carpeta' : artist}
        </p>
      </div>

      <div className="flex-1 min-w-0 hidden lg:block" style={{ flex: '1.5 1 0' }}>
        <p className="text-xs truncate" style={{ color: 'var(--text-body)' }}>
          {isDir ? '' : album}
        </p>
      </div>

      <div className="flex-shrink-0 w-14 text-right">
        <span className="text-xs" style={{ color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>
          {isDir ? '' : formatDuration(duration)}
        </span>
      </div>

      <div className="flex-shrink-0 w-16 text-right">
        <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{
          color: 'var(--text-muted)',
          background: 'var(--bg-input)',
        }}>
          {isDir ? 'DIR' : file.extension?.toUpperCase()}
        </span>
      </div>

      {!isDir && (
        <div className="flex items-center gap-0.5 flex-shrink-0" style={{ opacity: h ? 1 : 0, transition: 'opacity 0.12s' }}>
          <button onClick={(e) => { e.stopPropagation(); onOpenEditor(file); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-nav)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            <Edit3 size={12} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onOpenInfo(file); }}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-dim)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-nav)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
            <Info size={12} />
          </button>
        </div>
      )}
    </div>
  );
});

const TableHeader: React.FC<{
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSort: (key: string) => void;
}> = ({ sortBy, sortOrder, onSort }) => {
  const cols = [
    { key: '', label: '', className: 'w-4' },
    { key: '', label: '', className: 'w-8' },
    { key: 'title', label: 'T\u00edtulo', className: 'flex-[2]' },
    { key: 'artist', label: 'Artista', className: 'flex-[1.5] hidden md:block' },
    { key: 'album', label: '\u00c1lbum', className: 'flex-[1.5] hidden lg:block' },
    { key: 'duration', label: 'Duraci\u00f3n', className: 'w-14 text-right' },
    { key: 'format', label: 'Formato', className: 'w-16 text-right' },
    { key: '', label: '', className: 'w-12' },
  ];

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-card)' }}>
      {cols.map((col, i) => {
        const isSortable = !!col.key;
        return (
          <div key={i} className={`flex items-center gap-1 ${col.className}`}
            style={{ cursor: isSortable ? 'pointer' : 'default' }}
            onClick={() => isSortable && onSort(col.key)}>
            {col.label}
            {isSortable && sortBy === col.key && (
              <ArrowUpDown size={10} style={{
                transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

const VirtualizedList: React.FC<{
  items: LibraryLayoutProps['filteredFiles'];
  getMeta: LibraryLayoutProps['getMeta'];
  selectedFiles: LibraryLayoutProps['selectedFiles'];
  formatDuration: LibraryLayoutProps['formatDuration'];
  onSelect: LibraryLayoutProps['onSelect'];
  onOpenInfo: LibraryLayoutProps['onOpenInfo'];
  onOpenEditor: LibraryLayoutProps['onOpenEditor'];
  onFileClick: LibraryLayoutProps['onFileClick'];
  onFileContextMenu?: LibraryLayoutProps['onFileContextMenu'];
  scrollRef: React.RefObject<HTMLDivElement>;
}> = ({ items, getMeta, selectedFiles, formatDuration, onSelect, onOpenInfo, onOpenEditor, onFileClick, onFileContextMenu, scrollRef }) => {
  const ROW_HEIGHT = 48;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  return (
    <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
      {virtualizer.getVirtualItems().map(virtualItem => {
        const file = items[virtualItem.index];
        const meta = getMeta(file.path);
        return (
          <div key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}>
            <FileRow
              file={file}
              meta={meta}
              isSelected={selectedFiles.has(file.path)}
              formatDuration={formatDuration}
              onSelect={onSelect}
              onOpenInfo={onOpenInfo}
              onOpenEditor={onOpenEditor}
              onClick={onFileClick}
              onContextMenu={onFileContextMenu}
            />
          </div>
        );
      })}
    </div>
  );
};

const LayoutListMinimal: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles,
    breadcrumbs,
    currentPath,
    libraryRoot,
    searchInput,
    onSearchChange,
    selectedFiles,
    loading,
    stats,
    getMeta,
    formatDuration,
    numeral,
    navigate,
    navigateToRoot,
    onFileClick,
    onFileContextMenu,
    onSelect,
    clearSelection,
    onDeleteFiles,
    onOpenInfo,
    onOpenEditor,
    sortBy,
    sortOrder,
    onSort,
    scrollRef,
  } = props;

  const allSelected = filteredFiles.length > 0 && filteredFiles.every(f => selectedFiles.has(f.path));
  const someSelected = selectedFiles.size > 0;

  const handleSelectAllClick = useCallback(() => {
    if (allSelected) {
      clearSelection();
    } else {
      const toAdd = filteredFiles.filter(f => !selectedFiles.has(f.path));
      if (toAdd.length === filteredFiles.length) {
        clearSelection();
        window.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'a', ctrlKey: true, metaKey: false, bubbles: true,
        }));
      } else {
        toAdd.forEach(f => onSelect(f.path, false));
      }
    }
  }, [allSelected, filteredFiles, selectedFiles, clearSelection, onSelect]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      ref={scrollRef}
      className="flex flex-col overflow-hidden"
      style={{ height: '100%' }}>
      {/* Breadcrumb */}
      <div className="flex items-center gap-1 px-1 py-2 text-xs" style={{ color: 'var(--text-dim)' }}>
        <button onClick={navigateToRoot}
          className="p-1 rounded transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-icon)' }}>
          <Home size={14} />
        </button>
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={i}>
            <ChevronRight size={12} style={{ color: 'var(--text-dim)', opacity: 0.4 }} />
            <button onClick={() => navigate(crumb.path)}
              className="px-1.5 py-0.5 rounded transition-colors truncate max-w-[100px]"
              style={{
                color: currentPath === crumb.path ? 'var(--text-nav)' : 'var(--text-dim)',
                fontWeight: currentPath === crumb.path ? 600 : 400,
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-nav)'}
              onMouseLeave={e => { if (currentPath !== crumb.path) e.currentTarget.style.color = 'var(--text-dim)'; }}>
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-3 px-1 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
        <span>{numeral(stats.totalFiles)} canciones</span>
        <span style={{ color: 'var(--text-dim)' }}>·</span>
        <span>{numeral(stats.folders)} carpetas</span>
        <span style={{ color: 'var(--text-dim)' }}>·</span>
        <span>{stats.totalSize} GB</span>
      </div>

      {/* Search + Toolbar */}
      <div className="flex items-center gap-2 px-1 py-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-[260px]">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input placeholder="Buscar en esta carpeta..." value={searchInput} onChange={e => onSearchChange(e.target.value)}
            className="w-full h-8 pl-8 pr-2 rounded-lg text-xs outline-none transition-all"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              color: 'var(--text-input)',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--text-nav)'; e.target.style.boxShadow = '0 0 0 2px var(--text-nav)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-card)'; e.target.style.boxShadow = 'none'; }} />
        </div>

        <div className="flex items-center gap-1">
          <button onClick={handleSelectAllClick}
            className="px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
            style={{
              background: allSelected ? 'var(--bg-hover)' : 'transparent',
              color: allSelected ? 'var(--text-nav)' : 'var(--text-dim)',
              border: '1px solid var(--border-card)',
            }}
            onMouseEnter={e => { if (!allSelected) e.currentTarget.style.background = 'var(--bg-hover)'; }}
            onMouseLeave={e => { if (!allSelected) e.currentTarget.style.background = 'transparent'; }}>
            <Check size={11} />
            {allSelected ? 'Deseleccionar' : 'Seleccionar'}
          </button>

          {someSelected && (
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              className="px-2 py-1.5 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1"
              style={{
                background: 'rgba(239,68,68,0.1)',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.2)',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
              <Trash2 size={11} /> {selectedFiles.size}
            </button>
          )}

        </div>
      </div>

      {/* Column headers */}
      <TableHeader sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />

      {/* File list (virtualized) */}
      <div className="flex-1 overflow-y-auto" ref={scrollRef as React.RefObject<HTMLDivElement>}>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--border-card)', borderTopColor: 'var(--text-nav)' }} />
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-card)' }}>
              <Music size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-body)' }}>
              Carpeta vac\u00eda
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              No hay archivos en esta carpeta
            </p>
          </div>
        ) : (
          <VirtualizedList
            items={filteredFiles}
            getMeta={getMeta}
            selectedFiles={selectedFiles}
            formatDuration={formatDuration}
            onSelect={onSelect}
            onOpenInfo={onOpenInfo}
            onOpenEditor={onOpenEditor}
            onFileClick={onFileClick}
            onFileContextMenu={onFileContextMenu}
            scrollRef={scrollRef}
          />
        )}
      </div>

      {/* Floating selection bar */}
      <AnimatePresence>
        {selectedFiles.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg"
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-card)',
              backdropFilter: 'blur(16px)',
            }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
              {numeral(selectedFiles.size)} seleccionado{selectedFiles.size !== 1 && 's'}
            </span>
            <div className="w-px h-4" style={{ background: 'var(--border-card)' }} />
            <button onClick={() => {
              const first = filteredFiles.find(f => selectedFiles.has(f.path));
              if (first) onOpenEditor(first);
            }}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5"
              style={{ background: 'var(--bg-hover)', color: 'var(--text-nav)' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-input)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-hover)'}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              className="px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5"
              style={{ background: 'rgba(239,68,68,0.1)', color: '#f87171' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium transition-all"
              style={{ color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-body)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export { LayoutListMinimal };
