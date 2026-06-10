import React, { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music, Search, FolderOpen, Home, ChevronRight, Check, Trash2, Edit3, List, LayoutGrid, Sliders, Disc3, Hash, Calendar } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  background: 'var(--bg-card)',
  borderRadius: '12px',
  border: '1px solid var(--border-card)',
  overflow: 'hidden',
};

const breadcrumbBarStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '10px 16px',
  borderBottom: '1px solid var(--border-card)',
  background: 'var(--bg-card-alt)',
  fontSize: '13px',
  color: 'var(--text-nav)',
  flexShrink: 0,
};

const panelsWrapperStyle: React.CSSProperties = {
  display: 'flex',
  flex: 1,
  overflow: 'hidden',
};

const leftPanelStyle: React.CSSProperties = {
  width: '220px',
  flexShrink: 0,
  borderRight: '1px solid var(--border-card)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-sidebar)',
};

const rightPanelStyle: React.CSSProperties = {
  width: '200px',
  flexShrink: 0,
  borderLeft: '1px solid var(--border-card)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  background: 'var(--bg-sidebar)',
};

const panelHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 14px 8px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: 'var(--text-label)',
};

const panelBodyStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '4px 8px',
};

const ListItem = React.memo<{
  file: { path: string; name: string; is_audio: boolean; is_dir: boolean };
  meta: { title: string | null; artist: string | null; duration: number | null; cover: string | null } | null;
  selected: boolean;
  formatDuration: (s: number | null) => string;
  onDoubleClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
}>(({ file, meta, selected, formatDuration, onDoubleClick, onSelect, onContextMenu }) => {
  const title = meta?.title || file.name.replace(/\.[^.]+$/, '');
  const artist = meta?.artist || 'Desconocido';
  const dur = meta?.duration ?? null;
  const coverUrl = meta?.cover || null;

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '6px 10px',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '13px',
        background: selected ? 'var(--accent-gradient)' : 'transparent',
        color: selected ? '#fff' : 'var(--text-body)',
        transition: 'background 0.12s',
        height: 48,
      }}
      onMouseEnter={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={e => { if (!selected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '5px',
          flexShrink: 0,
          overflow: 'hidden',
          background: 'var(--bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Music size={16} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>{title}</div>
        <div style={{ fontSize: '11px', color: selected ? 'oklch(1 0 0 / 0.65)' : 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</div>
      </div>
      <div style={{ fontSize: '11px', color: selected ? 'oklch(1 0 0 / 0.6)' : 'var(--text-muted)', flexShrink: 0 }}>{formatDuration(dur)}</div>
      <div style={{ width: 26, flexShrink: 0 }} />
    </div>
  );
});

ListItem.displayName = 'ListItem';

const GridCard = React.memo<{
  file: { path: string; name: string; is_audio: boolean; is_dir: boolean };
  meta: { title: string | null; artist: string | null; cover: string | null } | null;
  selected: boolean;
  onDoubleClick: () => void;
  onSelect: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}>(({ file, meta, selected, onDoubleClick, onSelect, onContextMenu }) => {
  const title = meta?.title || file.name.replace(/\.[^.]+$/, '');
  const artist = meta?.artist || '';
  const coverUrl = meta?.cover || null;

  return (
    <div
      onClick={onSelect}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        borderRadius: '8px',
        overflow: 'hidden',
        cursor: 'pointer',
        background: 'var(--bg-card-alt)',
        border: selected ? '1.5px solid var(--accent-gradient)' : '1px solid var(--border-card)',
        boxShadow: selected ? 'var(--accent-glow-medium)' : 'none',
        transition: 'border 0.15s, box-shadow 0.15s',
        position: 'relative',
        aspectRatio: '1 / 1.15',
      }}
    >
      <div
        style={{
          width: '100%',
          height: '70%',
          overflow: 'hidden',
          background: 'var(--bg-input)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {coverUrl ? (
          <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Disc3 size={28} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            transition: 'opacity 0.18s',
          }}
          className="card-play-overlay"
        />
      </div>
      <div style={{ padding: '8px 10px 10px' }}>
        <div style={{ fontWeight: 500, fontSize: '12px', color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>{title}</div>
        {artist && <div style={{ fontSize: '11px', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>{artist}</div>}
      </div>
    </div>
  );
});

GridCard.displayName = 'GridCard';

const BreadcrumbItem: React.FC<{
  name: string;
  path: string;
  isLast: boolean;
  onClick: (path: string) => void;
}> = ({ name, path, isLast, onClick }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
    <span
      onClick={() => onClick(path)}
      style={{
        color: isLast ? 'var(--text-heading)' : 'var(--text-nav)',
        fontWeight: isLast ? 600 : 400,
        cursor: 'pointer',
        transition: 'color 0.12s',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => { if (!isLast) (e.currentTarget as HTMLSpanElement).style.color = 'var(--text-body)'; }}
      onMouseLeave={e => { if (!isLast) (e.currentTarget as HTMLSpanElement).style.color = 'var(--text-nav)'; }}
    >
      {name}
    </span>
    {!isLast && <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />}
  </span>
);

const SelectionBar: React.FC<{
  count: number;
  onClear: () => void;
  onDelete: () => void;
  onOpenEditor: () => void;
}> = ({ count, onClear, onDelete, onOpenEditor }) => (
  <motion.div
    initial={{ y: 60, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    exit={{ y: 60, opacity: 0 }}
    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
    style={{
      position: 'absolute',
      bottom: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      padding: '8px 14px',
      borderRadius: '10px',
      background: 'var(--bg-card)',
      border: '1px solid var(--border-card)',
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      fontSize: '13px',
      color: 'var(--text-body)',
      zIndex: 20,
    }}
  >
    <span style={{ fontWeight: 600, marginRight: '4px', color: 'var(--text-heading)' }}>{count}</span>
    <span style={{ color: 'var(--text-dim)', fontSize: '12px' }}>seleccionados</span>
    <div style={{ width: '1px', height: '18px', background: 'var(--border-card)', margin: '0 6px' }} />
    <ActionBtn icon={<Edit3 size={14} />} label="Editar" onClick={onOpenEditor} />
    <ActionBtn icon={<Trash2 size={14} />} label="Eliminar" onClick={onDelete} />
    <div style={{ width: '1px', height: '18px', background: 'var(--border-card)', margin: '0 6px' }} />
    <button
      onClick={onClear}
      style={{
        background: 'transparent',
        border: 'none',
        color: 'var(--text-dim)',
        cursor: 'pointer',
        fontSize: '12px',
        padding: '4px 8px',
        borderRadius: '5px',
        transition: 'color 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-body)'}
      onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)'}
    >
      Limpiar
    </button>
  </motion.div>
);

const ActionBtn: React.FC<{ icon: React.ReactNode; label: string; onClick: () => void }> = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      padding: '5px 10px',
      borderRadius: '6px',
      border: 'none',
      background: 'transparent',
      color: 'var(--text-body)',
      cursor: 'pointer',
      fontSize: '12px',
      transition: 'background 0.12s, color 0.12s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent-gradient)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-body)'; }}
  >
    {icon}{label}
  </button>
);

const MockSlider: React.FC<{ label: string; icon: React.ReactNode }> = ({ label, icon }) => {
  const [val, setVal] = useState(50);
  const [val2] = useState(80);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-label)', marginBottom: '6px' }}>
        {icon}
        <span>{label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '32px', textAlign: 'right' }}>{Math.round((val / 100) * 2020 + 1980)}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={e => setVal(Number(e.target.value))}
          style={{
            flex: 1,
            height: '3px',
            appearance: 'none',
            background: 'var(--bg-input)',
            borderRadius: '2px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '32px' }}>{Math.round((val2 / 100) * 2020 + 1980)}</span>
      </div>
    </div>
  );
};

const BpmSlider: React.FC = () => {
  const [val, setVal] = useState(50);
  const [val2] = useState(100);

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-label)', marginBottom: '6px' }}>
        <Hash size={12} />
        <span>Rango BPM</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px', textAlign: 'right' }}>{Math.round((val / 100) * 180)}</span>
        <input
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={e => setVal(Number(e.target.value))}
          style={{
            flex: 1,
            height: '3px',
            appearance: 'none',
            background: 'var(--bg-input)',
            borderRadius: '2px',
            outline: 'none',
            cursor: 'pointer',
          }}
        />
        <span style={{ fontSize: '10px', color: 'var(--text-muted)', width: '28px' }}>{Math.round((val2 / 100) * 180)}</span>
      </div>
    </div>
  );
};

const GENRES = ['Pop', 'Rock', 'Jazz', 'Electronic', 'Classical'];

const GenreCheckboxes: React.FC = () => {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (g: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };

  return (
    <div style={{ marginBottom: '14px' }}>
      {GENRES.map(g => (
        <label
          key={g}
          onClick={() => toggle(g)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 0',
            cursor: 'pointer',
            fontSize: '12px',
            color: checked.has(g) ? 'var(--text-heading)' : 'var(--text-body)',
            transition: 'color 0.1s',
          }}
        >
          <span
            style={{
              width: '15px',
              height: '15px',
              borderRadius: '4px',
              border: '1px solid var(--border-card)',
              background: checked.has(g) ? 'var(--accent-gradient)' : 'var(--bg-input)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.12s, border-color 0.12s',
              flexShrink: 0,
            }}
          >
            {checked.has(g) && <Check size={10} strokeWidth={3} style={{ color: '#fff' }} />}
          </span>
          {g}
        </label>
      ))}
    </div>
  );
};

const FolderTreeNode: React.FC<{
  name: string;
  path: string;
  active: boolean;
  onClick: (path: string) => void;
}> = ({ name, path, active, onClick }) => (
  <div
    onClick={() => onClick(path)}
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '6px 10px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: active ? 600 : 400,
      color: active ? 'var(--text-heading)' : 'var(--text-body)',
      background: active ? 'var(--accent-gradient)' : 'transparent',
      transition: 'background 0.12s, color 0.12s',
      marginBottom: '2px',
    }}
    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
  >
    <FolderOpen size={14} style={{ color: active ? '#fff' : 'var(--text-icon)', flexShrink: 0 }} />
    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
  </div>
);

const VirtualizedSplitItems: React.FC<{
  items: import('../../pages/LibraryTypes').FileItem[];
  viewMode: 'list' | 'grid';
  getMeta: (path: string) => import('../../pages/LibraryTypes').SongMetadata | null;
  selectedFiles: Set<string>;
  formatDuration: (seconds: number | null) => string;
  onFileClick: (file: import('../../pages/LibraryTypes').FileItem, isDir: boolean) => void;
  onSelect: (path: string, shift: boolean) => void;
  setSelectedFile: (f: import('../../pages/LibraryTypes').FileItem | null) => void;
  onFileContextMenu?: (file: import('../../pages/LibraryTypes').FileItem, e: React.MouseEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}> = ({ items, viewMode, getMeta, selectedFiles, formatDuration, onFileClick, onFileContextMenu, onSelect, setSelectedFile, scrollRef }) => {
  const ROW_HEIGHT = 54;
  const CARD_HEIGHT = 220;
  const itemSize = viewMode === 'list' ? ROW_HEIGHT : CARD_HEIGHT;

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => itemSize,
    overscan: 3,
  });

  if (viewMode === 'list') {
    return (
      <>
        <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '4px 8px 6px' }}>Archivos</div>
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map(virtualItem => {
            const f = items[virtualItem.index];
            return (
              <div key={virtualItem.key}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${virtualItem.start}px)` }}>
                <ListItem
                  file={f}
                  meta={getMeta(f.path)}
                  selected={selectedFiles.has(f.path)}
                  formatDuration={formatDuration}
                  onDoubleClick={() => onFileClick(f, false)}
                  onSelect={e => onSelect(f.path, e.shiftKey)}
                  onContextMenu={e => { setSelectedFile(f); onFileContextMenu?.(f, e); }}
                />
              </div>
            );
          })}
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '4px 8px 6px' }}>Archivos</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px' }}>
        {items.map(f => (
          <GridCard
            key={f.path}
            file={f}
            meta={getMeta(f.path)}
            selected={selectedFiles.has(f.path)}
            onDoubleClick={() => onFileClick(f, false)}
            onSelect={e => onSelect(f.path, e.shiftKey)}
            onContextMenu={e => { onFileContextMenu?.(f, e); }}
          />
        ))}
      </div>
    </>
  );
};

export const LayoutSplit: React.FC<LibraryLayoutProps> = ({
  files,
  filteredFiles,
  currentPath,
  breadcrumbs,
  libraryRoot,
  searchQuery,
  selectedFiles,
  selectedFile,
  loading,
  stats,
  getMeta,
  formatDuration,
  formatSize,
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
  searchInput,
  onSearchChange,
  sortBy,
  sortOrder,
  onSort,
  filterType,
  onFilterChange,
  hoveredCard,
  onHover,
  scrollRef,
  setSelectedFile,
  loadPath,
  setInfoPanelFile,
  setMetadataEditorFile,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const items = filteredFiles.length > 0 ? filteredFiles : files;
  const folderItems = items.filter(f => f.is_dir);
  const audioItems = items.filter(f => f.is_audio);

  return (
    <div style={containerStyle}>
      <div style={breadcrumbBarStyle}>
        <Home
          size={15}
          onClick={navigateToRoot}
          style={{ cursor: 'pointer', color: 'var(--text-nav)', flexShrink: 0, marginRight: '2px' }}
          onMouseEnter={e => (e.currentTarget as SVGElement).style.color = 'var(--text-body)'}
          onMouseLeave={e => (e.currentTarget as SVGElement).style.color = 'var(--text-nav)'}
        />
        <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        {breadcrumbs.map((crumb, i) => (
          <BreadcrumbItem
            key={crumb.path}
            name={crumb.name}
            path={crumb.path}
            isLast={i === breadcrumbs.length - 1}
            onClick={navigate}
          />
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {stats.totalFiles} archivos · {stats.folders} carpetas
        </span>
      </div>

      <div style={panelsWrapperStyle}>
        {/* Left Panel – Folder Tree */}
        <div style={leftPanelStyle}>
          <div style={panelHeaderStyle}>
            <FolderOpen size={13} />
            Explorador
          </div>
          <div style={panelBodyStyle}>
            <FolderTreeNode name={libraryRoot.split(/[/\\]/).pop() || 'Library'} path={libraryRoot} active={currentPath === libraryRoot} onClick={navigate} />
            {folderItems.map(f => (
              <FolderTreeNode
                key={f.path}
                name={f.name}
                path={f.path}
                active={currentPath === f.path}
                onClick={navigate}
              />
            ))}
          </div>
        </div>

        {/* Center Panel – Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0, position: 'relative' }}>
          {/* Toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderBottom: '1px solid var(--border-card)', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '2px', background: 'var(--bg-input)', borderRadius: '6px', padding: '2px', flexShrink: 0 }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: viewMode === 'list' ? 'var(--accent-gradient)' : 'transparent',
                  color: viewMode === 'list' ? '#fff' : 'var(--text-icon)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
              >
                <List size={15} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '5px 8px',
                  borderRadius: '5px',
                  border: 'none',
                  background: viewMode === 'grid' ? 'var(--accent-gradient)' : 'transparent',
                  color: viewMode === 'grid' ? '#fff' : 'var(--text-icon)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.12s',
                }}
              >
                <LayoutGrid size={15} />
              </button>
            </div>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 10px',
              borderRadius: '7px',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-card)',
              maxWidth: '280px',
            }}>
              <Search size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <input
                value={searchInput}
                onChange={e => onSearchChange(e.target.value)}
                placeholder="Buscar..."
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-input)',
                  fontSize: '13px',
                  minWidth: 0,
                }}
              />
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              {audioItems.length} pistas
            </span>
          </div>

          {/* File Listing */}
          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: viewMode === 'grid' ? '12px' : '4px 6px' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: '10px' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: '2px solid var(--border-card)',
                  borderTopColor: 'var(--accent-gradient)',
                  animation: 'spin 0.7s linear infinite',
                }} />
                <span style={{ fontSize: '13px', color: 'var(--text-dim)' }}>Cargando...</span>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {folderItems.length > 0 && (
                  <div style={{ marginBottom: '8px' }}>
                    <div style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-label)', padding: '4px 8px 6px' }}>Carpetas</div>
                    {viewMode === 'list' ? (
                      folderItems.map(f => (
                        <ListItem
                          key={f.path}
                          file={f}
                          meta={getMeta(f.path)}
                          selected={selectedFiles.has(f.path)}
                          formatDuration={formatDuration}
                          onDoubleClick={() => navigate(f.path)}
                          onSelect={e => onSelect(f.path, e.shiftKey)}
                          onContextMenu={e => { onFileContextMenu?.(f, e); }}
                        />
                      ))
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px' }}>
                        {folderItems.map(f => (
                          <GridCard
                            key={f.path}
                            file={f}
                            meta={getMeta(f.path)}
                            selected={selectedFiles.has(f.path)}
                            onDoubleClick={() => navigate(f.path)}
                            onSelect={e => onSelect(f.path, e.shiftKey)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <VirtualizedSplitItems
                  items={audioItems}
                  viewMode={viewMode}
                  getMeta={getMeta}
                  selectedFiles={selectedFiles}
                  formatDuration={formatDuration}
                  onFileClick={onFileClick}
                  onFileContextMenu={onFileContextMenu}
                  onSelect={onSelect}
                  setSelectedFile={setSelectedFile}
                  scrollRef={scrollRef}
                />
              </AnimatePresence>
            )}
          </div>

          {/* Floating Selection Bar */}
          <AnimatePresence>
            {selectedFiles.size > 0 && (
              <SelectionBar
                count={selectedFiles.size}
                onClear={clearSelection}
                onDelete={() => onDeleteFiles(Array.from(selectedFiles))}
                onOpenEditor={() => {
                  const first = items.find(f => selectedFiles.has(f.path));
                  if (first) onOpenEditor(first);
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Right Panel – Filters */}
        <div style={rightPanelStyle}>
          <div style={panelHeaderStyle}>
            <Sliders size={13} />
            Filtros
          </div>
          <div style={panelBodyStyle}>
            <GenreCheckboxes />
            <div style={{ height: '1px', background: 'var(--border-card)', margin: '0 0 12px' }} />
            <MockSlider label="Año" icon={<Calendar size={12} />} />
            <BpmSlider />
            <div style={{ height: '1px', background: 'var(--border-card)', margin: '0 0 10px' }} />
            <button
              onClick={() => {}}
              style={{
                width: '100%',
                padding: '7px 0',
                borderRadius: '6px',
                border: '1px solid var(--border-card)',
                background: 'transparent',
                color: 'var(--text-body)',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-gradient)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-card)'; }}
            >
              Restablecer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


