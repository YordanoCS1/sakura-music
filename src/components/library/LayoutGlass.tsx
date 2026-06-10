import React, { useRef, useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Music, Search, FolderOpen, Clock, Home, Check, Edit3, Trash2, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

const CARD_WIDTH = 180;
const CARD_GAP = 20;
const CARD_HEIGHT = 260;

const placeholderColors = [
  '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#14b8a6', '#f97316',
];

const containerBase: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  position: 'relative' as const,
};

const scrollArea: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '24px 32px 120px',
};

const floatingSearch: React.CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 50,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 16px',
  borderRadius: 'var(--card-radius)',
  background: 'var(--card-surface)',
  border: 'var(--card-border)',
  backdropFilter: 'var(--card-blur, blur(20px))',
  WebkitBackdropFilter: 'var(--card-blur, blur(20px))',
  marginBottom: 24,
};

const searchIcon: React.CSSProperties = {
  color: 'var(--text-icon)',
  flexShrink: 0,
};

const searchInputStyle: React.CSSProperties = {
  flex: 1,
  background: 'transparent',
  border: 'none',
  outline: 'none',
  color: 'var(--text-input)',
  fontSize: 15,
  fontFamily: 'inherit',
};

const statsRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 16,
  marginBottom: 28,
};

const statCard: React.CSSProperties = {
  background: 'var(--card-surface)',
  border: 'var(--card-border)',
  borderRadius: 'var(--card-radius-sm)',
  padding: '18px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: 16,
  backdropFilter: 'var(--card-blur, blur(12px))',
  WebkitBackdropFilter: 'var(--card-blur, blur(12px))',
};

const statIconBox: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 12,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const statNumber: React.CSSProperties = {
  fontSize: 22,
  fontWeight: 700,
  color: 'var(--text-heading)',
  lineHeight: 1.2,
};

const statLabel: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--text-muted)',
  marginTop: 2,
};

const sectionHeader: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 16,
};

const sectionTitle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: 'var(--text-heading)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const sectionAction: React.CSSProperties = {
  fontSize: 13,
  color: 'var(--accent-glow-medium)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  background: 'none',
  border: 'none',
  fontFamily: 'inherit',
};

const emptyState: React.CSSProperties = {
  gridColumn: '1 / -1',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 20px',
  color: 'var(--text-dim)',
  gap: 12,
};

const selectionBar: React.CSSProperties = {
  position: 'fixed',
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 100,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '12px 24px',
  borderRadius: 'var(--pill-radius)',
  background: 'var(--card-surface)',
  border: 'var(--card-border)',
  backdropFilter: 'var(--card-blur, blur(24px))',
  WebkitBackdropFilter: 'var(--card-blur, blur(24px))',
  boxShadow: '0 8px 32px var(--shadow-color)',
};

interface CardProps {
  file: import('../../pages/LibraryTypes').FileItem;
  meta: import('../../pages/LibraryTypes').SongMetadata | null;
  selected: boolean;
  isHovered: boolean;
  idx: number;
  onHover: (path: string | null) => void;
  onClick: (file: import('../../pages/LibraryTypes').FileItem, isDir: boolean) => void;
  onContextMenu?: (file: import('../../pages/LibraryTypes').FileItem, e: React.MouseEvent) => void;
  onSelect: (path: string, shift: boolean) => void;
}

const GlassCard = React.memo(function GlassCard({
  file, meta, selected, isHovered, idx,
  onHover, onClick, onContextMenu, onSelect,
}: CardProps) {
  const isDir = file.is_dir;
  const hasCover = meta?.cover;
  const gradient = placeholderColors[idx % placeholderColors.length];

  const cardStyle: React.CSSProperties = {
    background: 'var(--card-surface)',
    border: 'var(--card-border)',
    borderRadius: 'var(--card-radius)',
    overflow: 'hidden',
    cursor: 'pointer',
    position: 'relative',
    transition: 'border-color 0.25s, box-shadow 0.25s',
    boxShadow: isHovered
      ? '0 0 24px var(--accent-glow-medium)'
      : '0 2px 8px var(--shadow-color)',
  };

  const coverWrap: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '1 / 1',
    overflow: 'hidden',
  };

  const checkboxWrap: React.CSSProperties = {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 26,
    height: 26,
    borderRadius: 6,
    background: selected ? 'var(--accent-glow-medium)' : 'rgba(0,0,0,0.35)',
    border: selected ? 'none' : '1px solid rgba(255,255,255,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isHovered || selected ? 1 : 0,
    transition: 'opacity 0.2s',
    cursor: 'pointer',
  };

  const infoStyle: React.CSSProperties = {
    padding: '12px 14px 14px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-heading)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const artistStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-dim)',
    marginTop: 3,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const dirIcon: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
    gap: 6,
    color: 'var(--text-icon)',
  };

  const dirLabel: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--text-muted)',
  };

  const handleClick = () => onClick(file, isDir);
  const handleCheck = (e: React.MouseEvent) => { e.stopPropagation(); onSelect(file.path, e.shiftKey); };

  return (
    <div
      style={cardStyle}
      onClick={handleClick}
      onContextMenu={onContextMenu ? (e) => onContextMenu(file, e) : undefined}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
    >
      <div style={coverWrap}>
        {hasCover ? (
          <img
            src={meta!.cover!}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            loading="lazy"
          />
        ) : isDir ? (
          <div style={dirIcon}>
            <FolderOpen size={40} />
            <span style={dirLabel}>Carpeta</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Disc3 size={48} color="rgba(255,255,255,0.25)" />
          </div>
        )}

        <div style={checkboxWrap} onClick={handleCheck} role="checkbox" aria-checked={selected}>
          {selected && <Check size={16} color="#fff" />}
        </div>
      </div>

      <div style={infoStyle}>
        <div style={nameStyle} title={file.name}>
          {isDir ? file.name : (meta?.title || file.name)}
        </div>
        {!isDir && (
          <div style={artistStyle} title={meta?.artist || undefined}>
            {meta?.artist || 'Artista desconocido'}
          </div>
        )}
      </div>
    </div>
  );
});

export const LayoutGlass: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles,
    breadcrumbs,
    searchQuery,
    searchInput,
    onSearchChange,
    selectedFiles,
    clearSelection,
    stats,
    numeral,
    navigate,
    navigateToRoot,
    onFileClick,
    onFileContextMenu,
    onSelect,
    onDeleteFiles,
    onOpenEditor,
    hoveredCard,
    onHover,
    scrollRef,
  } = props;

  const hasSelection = selectedFiles.size > 0;
  const noResults = filteredFiles.length === 0;
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const c = Math.max(1, Math.floor((w + CARD_GAP) / (CARD_WIDTH + CARD_GAP)));
      setColumns(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const rowCount = useMemo(() => Math.ceil(filteredFiles.length / columns), [filteredFiles.length, columns]);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef ? (scrollRef as React.RefObject<HTMLDivElement>).current : null,
    estimateSize: () => CARD_HEIGHT + CARD_GAP,
    overscan: 2,
  });

  return (
    <div style={containerBase} ref={scrollRef as React.RefObject<HTMLDivElement>}>
      <div style={scrollArea}>
        <div style={floatingSearch}>
          <Search size={18} style={searchIcon} />
          <input
            style={searchInputStyle}
            placeholder="Buscar canciones, artistas, álbumes…"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div style={statsRow}>
          <motion.div style={statCard} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div style={{ ...statIconBox, background: 'rgba(139,92,246,0.15)' }}>
              <Music size={20} color="#8b5cf6" />
            </div>
            <div>
              <div style={statNumber}>{numeral(stats.totalFiles)}</div>
              <div style={statLabel}>Canciones</div>
            </div>
          </motion.div>

          <motion.div style={statCard} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div style={{ ...statIconBox, background: 'rgba(236,72,153,0.15)' }}>
              <FolderOpen size={20} color="#ec4899" />
            </div>
            <div>
              <div style={statNumber}>{numeral(stats.folders)}</div>
              <div style={statLabel}>Carpetas</div>
            </div>
          </motion.div>

          <motion.div style={statCard} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div style={{ ...statIconBox, background: 'rgba(16,185,129,0.15)' }}>
              <Disc3 size={20} color="#10b981" />
            </div>
            <div>
              <div style={statNumber}>{numeral(stats.folders + stats.totalFiles)}</div>
              <div style={statLabel}>Álbumes</div>
            </div>
          </motion.div>

          <motion.div style={statCard} whileHover={{ y: -2 }} transition={{ type: 'spring', stiffness: 300 }}>
            <div style={{ ...statIconBox, background: 'rgba(245,158,11,0.15)' }}>
              <Clock size={20} color="#f59e0b" />
            </div>
            <div>
              <div style={statNumber}>{stats.totalSize}</div>
              <div style={statLabel}>Total</div>
            </div>
          </motion.div>
        </div>

        <div style={sectionHeader}>
          <div style={sectionTitle}>
            <Disc3 size={18} color="var(--accent-glow-medium)" />
            {breadcrumbs.length > 0
              ? breadcrumbs[breadcrumbs.length - 1].name
              : 'Todos los archivos'}
          </div>
          <button style={sectionAction} onClick={navigateToRoot}>
            <Home size={14} /> Ir a inicio
          </button>
        </div>

        {noResults ? (
          <div style={emptyState}>
            <Search size={48} opacity={0.3} />
            <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-body)' }}>
              Sin resultados
            </span>
            <span style={{ fontSize: 13 }}>
              Intenta ajustar tu búsqueda o filtros
            </span>
          </div>
        ) : (
          <div ref={gridRef} style={{ position: 'relative', height: `${virtualizer.getTotalSize()}px` }}>
            {virtualizer.getVirtualItems().map(virtualRow => {
              const rowStart = virtualRow.index * columns;
              const rowItems = filteredFiles.slice(rowStart, rowStart + columns);
              return (
                <div key={virtualRow.key}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    display: 'grid',
                    gridTemplateColumns: `repeat(${columns}, minmax(${CARD_WIDTH}px, 1fr))`,
                    gap: `${CARD_GAP}px`,
                    minWidth: `${columns * CARD_WIDTH + (columns - 1) * CARD_GAP}px`,
                  }}>
                  {rowItems.map((file) => {
                    const meta = props.getMeta(file.path);
                    const selected = selectedFiles.has(file.path);
                    const isHovered = hoveredCard === file.path;
                    return (
                      <GlassCard
                        key={file.path}
                        file={file}
                        meta={meta}
                        selected={selected}
                        isHovered={isHovered}
                        idx={virtualRow.index * columns + rowItems.indexOf(file)}
                        onHover={onHover}
                        onClick={onFileClick}
                        onContextMenu={onFileContextMenu}
                        onSelect={onSelect}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {hasSelection && (
          <motion.div
            style={selectionBar}
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            <span style={{ fontSize: 13, color: 'var(--text-label)', whiteSpace: 'nowrap' }}>
              {selectedFiles.size} seleccionado{selectedFiles.size !== 1 ? 's' : ''}
            </span>
            <div style={{ width: 1, height: 20, background: 'var(--border-card)' }} />
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-nav)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'inherit', padding: '6px 10px', borderRadius: 'var(--button-radius)' }}
              onClick={() => {
                const firstSelected = filteredFiles.find(f => selectedFiles.has(f.path));
                if (firstSelected) onOpenEditor(firstSelected);
              }}
            >
              <Edit3 size={14} /> Editar
            </button>
            <button
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'inherit', padding: '6px 10px', borderRadius: 'var(--button-radius)' }}
              onClick={() => onDeleteFiles(Array.from(selectedFiles))}
            >
              <Trash2 size={14} /> Eliminar
            </button>
            <div style={{ width: 1, height: 20, background: 'var(--border-card)' }} />
            <button
              style={{ background: 'none', border: 'none', color: 'var(--text-nav)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'inherit', padding: '6px 10px', borderRadius: 'var(--button-radius)' }}
              onClick={clearSelection}
            >
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
