import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Search, FolderOpen, Plus, Clock, Home, ChevronRight, Edit3, Sparkles, Disc3, X } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

const GENRES = ['Pop', 'Jazz', 'Lo-fi', 'Classical', 'Electronic', 'Rock'] as const;

const heights = [1, 1.2, 1.5, 1, 1.3, 1.1, 1.4, 1];

interface MasonryCardProps {
  file: LibraryLayoutProps['filteredFiles'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  index: number;
  onFileClick: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onHover: (path: string | null) => void;
  isHovered: boolean;
  formatDuration: (d: number | null) => string;
  onOpenEditor: (f: LibraryLayoutProps['filteredFiles'][0]) => void;
}

const MasonryCard: React.FC<MasonryCardProps> = React.memo(({ file, meta, index, onFileClick, onContextMenu, onHover, isHovered, formatDuration, onOpenEditor }) => {
  const coverUrl = meta?.cover;
  const heightMult = heights[index % heights.length];
  const bgGradients = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
    'linear-gradient(135deg, #fccb90 0%, #d57eeb 100%)',
    'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  ];

  return (
    <div
      style={{
        borderRadius: 'var(--card-radius)',
        overflow: 'hidden',
        background: 'var(--card-surface)',
        border: 'var(--card-border)',
        cursor: 'pointer',
        position: 'relative',
      }}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
      onClick={onFileClick}
      onContextMenu={onContextMenu}
    >
      <div style={{ position: 'relative', width: '100%', aspectRatio: `${1 / heightMult}`, overflow: 'hidden', background: file.is_dir ? 'var(--bg-card-alt)' : bgGradients[index % bgGradients.length] }}>
        {coverUrl ? (
          <img src={coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : file.is_dir ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <FolderOpen size={32} style={{ color: 'var(--text-icon)' }} />
            <span style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 600 }}>CARPETA</span>
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Disc3 size={28} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        )}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%', background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', pointerEvents: 'none' }} />
        <AnimatePresence>
          {isHovered && !file.is_dir && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={(e) => { e.stopPropagation(); onOpenEditor(file); }}
              style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
              }}
            >
              <Edit3 size={15} color="white" />
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{ position: 'absolute', bottom: 8, left: 10, right: 10, zIndex: 1 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {meta?.title || file.name.replace(/\.[^/.]+$/, '')}
          </p>
          {meta?.duration && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              <Clock size={9} color="rgba(255,255,255,0.6)" />
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)' }}>{formatDuration(meta.duration)}</span>
            </div>
          )}
        </div>
      </div>
      <div style={{ padding: '6px 10px 8px' }}>
        <p style={{ margin: 0, fontSize: 10, color: 'var(--text-label)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {meta?.artist || 'Artista desconocido'}
        </p>
      </div>
    </div>
  );
});

const MASON_CARD_HEIGHT = 260;

export const LayoutMasonry: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange, loading, scrollRef,
    onFileClick, onFileContextMenu, hoveredCard, onHover, getMeta, formatDuration,
    navigateToRoot, breadcrumbs, navigate, currentPath, libraryRoot,
    stats, numeral, onOpenEditor,
  } = props;

  const [activeGenres, setActiveGenres] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(4);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.offsetWidth;
      const c = Math.max(1, Math.floor(w / 200));
      setColumns(c);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const files = useMemo(() => filteredFiles.filter(f => f.is_dir || f.is_audio), [filteredFiles]);
  const rowCount = useMemo(() => Math.ceil(files.length / columns), [files.length, columns]);
  const isEmpty = !loading && filteredFiles.length === 0;

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef ? (scrollRef as React.RefObject<HTMLDivElement>).current : null,
    estimateSize: () => MASON_CARD_HEIGHT,
    overscan: 2,
  });

  const toggleGenre = useCallback((genre: string) => {
    setActiveGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  return (
    <div ref={scrollRef} style={{ height: '100%', overflow: 'auto', position: 'relative', padding: '20px 24px 100px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Home size={14} style={{ color: 'var(--text-icon)', cursor: 'pointer', flexShrink: 0 }} onClick={navigateToRoot} />
        {breadcrumbs.map((crumb, i) => (
          <React.Fragment key={crumb.path}>
            <ChevronRight size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <span
              onClick={() => navigate(crumb.path)}
              style={{ fontSize: 11, color: i === breadcrumbs.length - 1 ? 'var(--text-heading)' : 'var(--text-dim)', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {crumb.name}
            </span>
          </React.Fragment>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-input)', pointerEvents: 'none' }} />
          <input
            value={searchInput}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar en tu biblioteca..."
            style={{
              width: '100%', height: 34, padding: '0 10px 0 32px', borderRadius: 'var(--input-radius)', border: '1px solid var(--border-card)',
              background: 'var(--bg-input)', color: 'var(--text-input)', fontSize: 12, outline: 'none',
            }}
          />
          {searchInput && (
            <X size={13} onClick={() => onSearchChange('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', cursor: 'pointer' }} />
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          <Sparkles size={12} style={{ color: 'var(--text-icon)' }} />
          <span>{numeral(files.length)} temas</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
        {GENRES.map(genre => {
          const active = activeGenres.includes(genre);
          return (
            <motion.button
              key={genre}
              whileTap={{ scale: 0.92 }}
              onClick={() => toggleGenre(genre)}
              style={{
                padding: '5px 12px', borderRadius: 'var(--pill-radius)', border: '1px solid', fontSize: 10, fontWeight: 500,
                cursor: 'pointer', transition: 'all 0.2s', background: active ? 'var(--bg-hover)' : 'transparent',
                borderColor: active ? 'var(--accent-gradient)' : 'var(--border-card)',
                color: active ? 'var(--text-heading)' : 'var(--text-label)',
              }}
            >
              {genre}
            </motion.button>
          );
        })}
      </div>

      {isEmpty ? (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 12 }}>
          <div style={{ width: 56, height: 56, borderRadius: 'var(--card-radius-sm)', background: 'var(--bg-card-alt)', border: '1px solid var(--border-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={24} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-heading)' }}>Tu biblioteca está vacía</p>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 260 }}>
            Agrega archivos de audio desde la carpeta de tu biblioteca para empezar a escuchar
          </p>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={() => navigate(libraryRoot)}
            style={{ marginTop: 4, padding: '8px 20px', borderRadius: 'var(--button-radius)', border: 'none', fontSize: 11, fontWeight: 500, cursor: 'pointer', color: 'white', background: 'var(--accent-gradient)', boxShadow: '0 2px 12px var(--accent-glow-soft)' }}>
            Explorar biblioteca
          </motion.button>
        </motion.div>
      ) : (
        <div ref={gridRef} style={{ position: 'relative', height: `${virtualizer.getTotalSize()}px` }}>
          {virtualizer.getVirtualItems().map(virtualRow => {
            const rowStart = virtualRow.index * columns;
            const rowItems = files.slice(rowStart, rowStart + columns);
            return (
              <div key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columns}, 1fr)`,
                  gap: '12px',
                }}>
                {rowItems.map((file) => {
                  const i = rowStart + rowItems.indexOf(file);
                  const meta = getMeta(file.path);
                  return (
                    <MasonryCard
                      key={file.path}
                      file={file}
                      meta={meta}
                      index={i}
                      onFileClick={() => onFileClick(file, file.is_dir)}
                      onContextMenu={(e) => onFileContextMenu?.(file, e)}
                      onHover={onHover}
                      isHovered={hoveredCard === file.path}
                      formatDuration={formatDuration}
                      onOpenEditor={onOpenEditor}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => showToast('¡Funcionalidad próximamente!')}
        style={{
          position: 'fixed', bottom: 100, right: 28, zIndex: 999,
          width: 48, height: 48, borderRadius: '50%', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--accent-gradient)', color: 'white',
          boxShadow: '0 4px 24px var(--accent-glow-medium)',
          cursor: 'pointer',
        }}
      >
        <Plus size={20} />
      </motion.button>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed', bottom: 160, right: 28, zIndex: 1000,
              padding: '10px 16px', borderRadius: 10, fontSize: 11, fontWeight: 500,
              background: 'var(--bg-hover)', border: '1px solid var(--border-card)',
              color: 'var(--text-body)', backdropFilter: 'blur(12px)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
