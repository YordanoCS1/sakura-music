import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, ChevronLeft, ChevronRight,
  Trash2, Edit3, FolderOpen
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

const gradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

export const LayoutCarousel: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles,
    onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [focusIndex, setFocusIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);

  const audioFiles = useMemo(() => filteredFiles.filter(f => !f.is_dir && f.is_audio), [filteredFiles]);
  const folders = useMemo(() => filteredFiles.filter(f => f.is_dir), [filteredFiles]);
  const allItems = useMemo(() => filteredFiles, [filteredFiles]);

  const focusFile = allItems[focusIndex] || allItems[0] || null;
  const focusMeta = focusFile ? getMeta(focusFile.path) : null;

  const scrollStrip = (dir: 'left' | 'right') => {
    stripRef.current?.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  const handlePrev = useCallback(() => {
    setFocusIndex(i => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setFocusIndex(i => Math.min(allItems.length - 1, i + 1));
  }, [allItems.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    else if (e.key === 'ArrowRight') handleNext();
  }, [handlePrev, handleNext]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-card)', borderTopColor: 'var(--accent-gradient)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-alt)', border: 'var(--border-card)', marginBottom: 16 }}>
          <Search size={24} style={{ color: 'var(--text-dim)' }} />
        </div>
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 600, margin: 0 }}>No hay archivos</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80 }} onKeyDown={handleKeyDown} tabIndex={0}>
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ position: 'relative', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar…"
            style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 10, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 60px', position: 'relative' }}>
        <button onClick={handlePrev} disabled={focusIndex === 0}
          style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: focusIndex === 0 ? 'default' : 'pointer', opacity: focusIndex === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ChevronLeft size={18} />
        </button>

        <AnimatePresence mode="wait">
          {focusFile && (
            <motion.div
              key={focusFile.path}
              initial={{ opacity: 0, x: 60, scale: 0.92 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -60, scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 260, damping: 28 }}
              onClick={() => onFileClick(focusFile, focusFile.is_dir)}
              onContextMenu={(e) => onFileContextMenu?.(focusFile, e)}
              style={{ cursor: 'pointer', width: '100%', maxWidth: 420 }}
            >
              <div style={{
                width: '100%', aspectRatio: '1/1', borderRadius: 20, overflow: 'hidden', position: 'relative',
                boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--border-card)',
                background: gradients[hashStr(focusFile.path) % gradients.length],
              }}>
                {focusMeta?.cover ? (
                  <img src={focusMeta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : focusFile.is_dir ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
                    <FolderOpen size={48} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>Carpeta</span>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={48} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                )}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                  padding: '40px 20px 20px',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {focusFile.is_dir ? focusFile.name : (focusMeta?.title || focusFile.name.replace(/\.[^/.]+$/, ''))}
                    </h2>
                    {!focusFile.is_dir && (
                      <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '4px 0 0' }}>
                        {focusMeta?.artist || 'Artista desconocido'}
                        {focusMeta?.duration != null && ` · ${props.formatDuration(focusMeta.duration)}`}
                      </p>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(focusFile); }}
                    style={{ padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(4px)', flexShrink: 0 }}>
                    <Edit3 size={12} /> Editar
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button onClick={handleNext} disabled={focusIndex >= allItems.length - 1}
          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 10, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: focusIndex >= allItems.length - 1 ? 'default' : 'pointer', opacity: focusIndex >= allItems.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ padding: '0 24px', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ color: 'var(--text-label)', fontSize: 12, fontWeight: 500 }}>
            {focusIndex + 1} / {allItems.length}
          </span>
          <span style={{ color: 'var(--text-label)', fontSize: 12 }}>
            {numeral(stats.totalFiles)} canciones
          </span>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => scrollStrip('left')}
            style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <ChevronLeft size={12} />
          </button>
          <button onClick={() => scrollStrip('right')}
            style={{ position: 'absolute', right: -10, top: '50%', transform: 'translateY(-50%)', zIndex: 5, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <ChevronRight size={12} />
          </button>
          <div ref={stripRef} style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {allItems.map((file, i) => {
              const meta = getMeta(file.path);
              const isFocus = i === focusIndex;
              const g = gradients[hashStr(file.path) % gradients.length];
              return (
                <motion.div
                  key={file.path}
                  onClick={() => setFocusIndex(i)}
                  whileHover={{ y: -2 }}
                  style={{
                    minWidth: 52, width: 52, height: 52, borderRadius: 10, overflow: 'hidden', cursor: 'pointer', flexShrink: 0,
                    boxShadow: isFocus ? '0 0 0 2px var(--accent-glow-medium)' : 'none',
                    background: g, position: 'relative',
                  }}
                >
                  {meta?.cover ? (
                    <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: g }}>
                      {file.is_dir ? <FolderOpen size={16} style={{ color: 'rgba(255,255,255,0.3)' }} /> : <Music size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFiles.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 50,
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px',
              borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--accent-glow-medium)',
              boxShadow: '0 4px 24px var(--accent-glow-soft)', backdropFilter: 'blur(16px)',
            }}
          >
            <span style={{ color: 'var(--text-body)', fontSize: 12, fontWeight: 600 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: 'var(--border-card)' }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: 'var(--text-label)', cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
