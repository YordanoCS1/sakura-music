import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const VINYL_COLORS = ['#ff6b35', '#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261', '#9b5de5', '#00bbf9'];

export const LayoutCityPop: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [centerIdx, setCenterIdx] = useState(0);

  const scrollTo = useCallback((idx: number) => {
    setCenterIdx(Math.max(0, Math.min(idx, filteredFiles.length - 1)));
  }, [filteredFiles.length]);

  const handlePrev = useCallback(() => scrollTo(centerIdx - 1), [centerIdx, scrollTo]);
  const handleNext = useCallback(() => scrollTo(centerIdx + 1), [centerIdx, scrollTo]);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Disc3 size={18} style={{ color: '#ff6b35' }} /> City Pop
            </h2>
            <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '2px 0 0' }}>
              {numeral(stats.totalFiles)} canciones · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 240, width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar…"
              style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 10, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        <button onClick={handlePrev} disabled={centerIdx === 0}
          style={{ position: 'absolute', left: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: centerIdx === 0 ? 'default' : 'pointer', opacity: centerIdx === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <ChevronLeft size={20} />
        </button>

        <div ref={scrollRef} style={{ overflow: 'hidden', width: '100%', padding: '20px 80px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0, height: 400, perspective: 1000 }}>
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((file, i) => {
                const meta = getMeta(file.path);
                const isDir = file.is_dir;
                const seed = hashStr(file.path);
                const color = VINYL_COLORS[seed % VINYL_COLORS.length];
                const isCenter = i === centerIdx;
                const dist = Math.abs(i - centerIdx);
                const tilt = dist === 0 ? 0 : (i < centerIdx ? -8 - dist * 4 : 8 + dist * 4);
                const translateY = dist === 0 ? 0 : dist * 12;
                const scale = Math.max(0.55, 1 - dist * 0.12);
                const zIndex = 100 - dist;
                const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

                return (
                  <motion.div
                    key={file.path}
                    layout
                    initial={{ opacity: 0, x: i < centerIdx ? -60 : 60 }}
                    animate={{
                      opacity: dist === 0 ? 1 : 0.5,
                      scale,
                      rotateZ: tilt,
                      y: translateY,
                      zIndex,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 28 }}
                    onClick={() => {
                      if (isCenter) onFileClick(file, isDir);
                      else scrollTo(i);
                    }}
                    onContextMenu={(e) => onFileContextMenu?.(file, e)}
                    onMouseEnter={() => onHover(file.path)}
                    onMouseLeave={() => onHover(null)}
                    style={{
                      position: 'absolute', cursor: 'pointer',
                      transformStyle: 'preserve-3d',
                      width: 220,
                      left: '50%', marginLeft: -110,
                    }}
                  >
                    <div style={{
                      width: '100%', aspectRatio: '1/1', borderRadius: 16, overflow: 'hidden',
                      position: 'relative',
                      boxShadow: isCenter
                        ? '0 20px 60px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,107,53,0.3)'
                        : '0 8px 24px rgba(0,0,0,0.08)',
                      background: `linear-gradient(135deg, ${color}, ${color}88)`,
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderOpen size={40} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={44} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </div>
                      )}
                      {isCenter && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                          style={{
                            position: 'absolute', top: '50%', left: '50%', marginTop: -30, marginLeft: -30,
                            width: 60, height: 60, borderRadius: '50%',
                            border: '2px solid rgba(255,255,255,0.15)',
                            background: 'rgba(0,0,0,0.3)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                          }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                        </motion.div>
                      )}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
                        padding: '40px 16px 14px',
                      }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                          {title}
                        </p>
                        {!isDir && (
                          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>
                            {meta?.artist || 'Artista desconocido'}
                          </p>
                        )}
                      </div>
                      {isCenter && !isDir && (
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                          style={{ position: 'absolute', top: 12, right: 12, padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, backdropFilter: 'blur(4px)' }}>
                          <Edit3 size={12} /> Editar
                        </motion.button>
                      )}
                      <div style={{
                        position: 'absolute', top: 12, left: 12,
                        background: 'rgba(0,0,0,0.3)', borderRadius: 4, padding: '2px 8px',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: 700, letterSpacing: '0.08em' }}>{String(i + 1).padStart(2, '0')}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <button onClick={handleNext} disabled={centerIdx >= filteredFiles.length - 1}
          style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 40, height: 40, borderRadius: 10, border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: centerIdx >= filteredFiles.length - 1 ? 'default' : 'pointer', opacity: centerIdx >= filteredFiles.length - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div style={{ padding: '0 24px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-label)', fontSize: 12, fontWeight: 500 }}>
          {centerIdx + 1} / {filteredFiles.length}
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
          {filteredFiles.slice(0, Math.min(filteredFiles.length, 24)).map((f, i) => (
            <div key={f.path} onClick={() => scrollTo(i)}
              style={{ width: 6, height: 6, borderRadius: '50%', cursor: 'pointer', flexShrink: 0, background: i === centerIdx ? '#ff6b35' : 'var(--border-card)', transition: 'all 0.2s' }} />
          ))}
          {filteredFiles.length > 24 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 4 }}>+{filteredFiles.length - 24}</span>
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
            }}>
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
