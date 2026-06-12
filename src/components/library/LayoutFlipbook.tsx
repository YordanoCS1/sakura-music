import React, { useState, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, ChevronLeft, ChevronRight,
  Trash2, Edit3, FolderOpen, Disc3
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';

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



const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export const LayoutFlipbook: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [page, setPage] = useState(0);
  const [flipDir, setFlipDir] = useState<'left' | 'right'>('right');
  const itemsPerPage = 2;
  const totalPages = Math.ceil(filteredFiles.length / itemsPerPage);

  const currentFiles = useMemo(() => {
    const start = page * itemsPerPage;
    return filteredFiles.slice(start, start + itemsPerPage);
  }, [filteredFiles, page]);

  const goNext = useCallback(() => {
    if (page < totalPages - 1) { setFlipDir('right'); setPage(p => p + 1); }
  }, [page, totalPages]);

  const goPrev = useCallback(() => {
    if (page > 0) { setFlipDir('left'); setPage(p => p - 1); }
  }, [page]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') goPrev();
    else if (e.key === 'ArrowRight') goNext();
  }, [goPrev, goNext]);

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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>Flipbook</h2>
            <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '2px 0 0' }}>
              {numeral(stats.totalFiles)} canciones
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

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', perspective: 1600, padding: '0 60px' }}>
        <button onClick={goPrev} disabled={page === 0}
          style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ChevronLeft size={18} />
        </button>

        <div style={{ display: 'flex', gap: 40, alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: 800 }}>
          <AnimatePresence mode="wait" custom={flipDir}>
            {currentFiles.map((file, idx) => {
              const meta = getMeta(file.path);
              const isDir = file.is_dir;
              const color = COLORS[hashStr(file.path) % COLORS.length];
              const globalIdx = page * itemsPerPage + idx;

              return (
                <motion.div
                  key={file.path}
                  custom={flipDir}
                  initial={{ opacity: 0, rotateY: flipDir === 'right' ? -90 : 90, x: flipDir === 'right' ? -100 : 100 }}
                  animate={{ opacity: 1, rotateY: 0, x: 0 }}
                  exit={{ opacity: 0, rotateY: flipDir === 'right' ? 90 : -90, x: flipDir === 'right' ? 100 : -100 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 24, delay: idx * 0.08 }}
                  onClick={() => onFileClick(file, isDir)}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                  onMouseEnter={() => onHover(file.path)}
                  onMouseLeave={() => onHover(null)}
                  style={{ cursor: 'pointer', width: '100%', maxWidth: 340, transformStyle: 'preserve-3d' }}
                >
                  <div style={{
                    background: 'var(--bg-card)', borderRadius: 20,
                    border: 'var(--border-card)', overflow: 'hidden',
                    boxShadow: hoveredCard === file.path
                      ? '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px var(--accent-glow-medium)'
                      : '0 8px 32px rgba(0,0,0,0.06)',
                    transition: 'box-shadow 0.25s',
                  }}>
                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '1/1',
                      background: `linear-gradient(135deg, ${color}88, ${color}33)`,
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
                          <FolderOpen size={44} style={{ color: `${color}aa` }} />
                          <span style={{ color: `${color}aa`, fontSize: 12 }}>Carpeta</span>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={48} style={{ color: `${color}55` }} />
                        </div>
                      )}

                      <div style={{ position: 'absolute', top: 12, left: 12, background: color, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 6 }}>
                        #{globalIdx + 1}
                      </div>
                    </div>

                    <div style={{ padding: '16px 18px 18px' }}>
                      <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-heading)', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''))}
                      </p>
                      {!isDir && (
                        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {meta?.artist || 'Artista desconocido'}
                          {meta?.duration != null && ` · ${Math.floor(meta.duration / 60)}:${String(meta.duration % 60).padStart(2, '0')}`}
                        </p>
                      )}
                      {!isDir && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                            onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                            style={{ padding: '5px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-input)', color: 'var(--text-body)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Edit3 size={11} /> Editar
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button onClick={goNext} disabled={page >= totalPages - 1}
          style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', zIndex: 20, width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
          <ChevronRight size={18} />
        </button>
      </div>

      <div style={{ padding: '0 24px', textAlign: 'center' }}>
        <span style={{ color: 'var(--text-label)', fontSize: 12, fontWeight: 500 }}>
          Página {page + 1} de {totalPages}
        </span>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 8 }}>
          {Array.from({ length: Math.min(totalPages, 20) }).map((_, i) => (
            <div key={i} onClick={() => { setFlipDir(i > page ? 'right' : 'left'); setPage(i); }}
              style={{
                width: i === page ? 16 : 6, height: 6, borderRadius: 4, cursor: 'pointer',
                background: i === page ? 'var(--accent-glow-medium)' : 'var(--border-card)',
                transition: 'all 0.2s',
              }}
            />
          ))}
          {totalPages > 20 && (
            <span style={{ color: 'var(--text-dim)', fontSize: 10, marginLeft: 4 }}>+{totalPages - 20}</span>
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
