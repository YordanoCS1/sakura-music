import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, ChevronLeft, ChevronRight,
  Trash2, Edit3, FolderOpen, Disc3
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

const OFFSET_X = 6;
const OFFSET_Y = 8;
const ROTATION_STEP = 1.2;

export const LayoutCascada: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [cascadeIndex, setCascadeIndex] = useState(0);
  const maxVisible = 8;

  const audioFiles = useMemo(() => filteredFiles.filter(f => !f.is_dir && f.is_audio), [filteredFiles]);

  const totalItems = filteredFiles.length;
  const visibleFiles = useMemo(() => {
    return filteredFiles.slice(cascadeIndex, cascadeIndex + maxVisible);
  }, [filteredFiles, cascadeIndex]);

  const topFile = filteredFiles[cascadeIndex];
  const topMeta = topFile ? getMeta(topFile.path) : null;

  const handlePrev = useCallback(() => {
    setCascadeIndex(i => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCascadeIndex(i => Math.min(totalItems - 1, i + 1));
  }, [totalItems]);

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

  if (filteredFiles.length === 0) {
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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', perspective: 1200 }}>
        <button onClick={handlePrev} disabled={cascadeIndex === 0}
          style={{ position: 'absolute', left: 40, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: cascadeIndex === 0 ? 'default' : 'pointer', opacity: cascadeIndex === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ChevronLeft size={18} />
        </button>

        <div style={{ position: 'relative', width: 340, height: 380 }}>
          <AnimatePresence mode="popLayout">
            {visibleFiles.map((file, i) => {
              const meta = getMeta(file.path);
              const g = gradients[hashStr(file.path) % gradients.length];
              const isTop = i === 0;
              const isDir = file.is_dir;
              const offsetX = i * OFFSET_X;
              const offsetY = i * OFFSET_Y;
              const rotation = i * ROTATION_STEP;
              const scale = 1 - i * 0.02;

              return (
                <motion.div
                  key={file.path}
                  layout
                  initial={{ opacity: 0, x: 80 }}
                  animate={{
                    opacity: isTop ? 1 : 0.85,
                    x: offsetX,
                    y: offsetY,
                    rotateZ: rotation,
                    scale: Math.max(scale, 0.8),
                    zIndex: maxVisible - i,
                  }}
                  exit={{ opacity: 0, x: -80, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 280, damping: 26 }}
                  onClick={() => {
                    if (isTop) onFileClick(file, isDir);
                    else setCascadeIndex(cascadeIndex + i);
                  }}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                  onMouseEnter={() => onHover(file.path)}
                  onMouseLeave={() => onHover(null)}
                  style={{
                    position: 'absolute', top: 0, left: '50%', marginLeft: -150,
                    width: 300, cursor: 'pointer',
                    transformStyle: 'preserve-3d',
                  }}
                >
                  <div style={{
                    width: '100%', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden', position: 'relative',
                    boxShadow: isTop
                      ? '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px var(--border-card)'
                      : '0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px var(--border-card)',
                    background: g,
                  }}>
                    {meta?.cover ? (
                      <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : isDir ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                        <FolderOpen size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Carpeta</span>
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Disc3 size={44} style={{ color: 'rgba(255,255,255,0.25)' }} />
                      </div>
                    )}
                    {isTop && (
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                        padding: '40px 16px 16px',
                      }}>
                        <p style={{ color: '#fff', fontSize: 16, fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''))}
                        </p>
                        {!isDir && (
                          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, margin: '4px 0 0' }}>
                            {meta?.artist || 'Artista desconocido'}
                          </p>
                        )}
                      </div>
                    )}
                    {isTop && !isDir && (
                      <motion.button
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                        style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(4px)' }}>
                        <Edit3 size={12} /> Editar
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button onClick={handleNext} disabled={cascadeIndex >= totalItems - 1}
          style={{ position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: cascadeIndex >= totalItems - 1 ? 'default' : 'pointer', opacity: cascadeIndex >= totalItems - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ padding: '0 40px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-label)', fontSize: 12, fontWeight: 500 }}>
          {cascadeIndex + 1} / {totalItems}
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
          {filteredFiles.slice(0, Math.min(totalItems, 20)).map((f, i) => {
            const meta = getMeta(f.path);
            return (
              <div key={f.path}
                onClick={() => setCascadeIndex(i)}
                style={{
                  width: 8, height: 8, borderRadius: '50%', cursor: 'pointer', flexShrink: 0,
                  background: i === cascadeIndex ? 'var(--accent-glow-medium)' : 'var(--border-card)',
                  transition: 'all 0.2s',
                }}
              />
            );
          })}
          {totalItems > 20 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 4 }}>+{totalItems - 20}</span>
          )}
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
