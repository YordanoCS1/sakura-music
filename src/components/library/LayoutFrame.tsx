import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, Check, Trash2, Edit3, FolderOpen, ChevronLeft, ChevronRight
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const frameColors = [
  '#d4c5a9', '#c9b99a', '#dfd0b5', '#e8dcc8', '#d0c0a0',
  '#c4b490', '#e0d0b8', '#d8c8a8', '#ccc0a8', '#d4c8b0',
];

export const LayoutFrame: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles,
    onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [page, setPage] = useState(0);
  const perPage = 20;
  const totalPages = Math.ceil(filteredFiles.length / perPage);
  const pageFiles = useMemo(() => filteredFiles.slice(page * perPage, (page + 1) * perPage), [filteredFiles, page]);
  const audioFiles = useMemo(() => filteredFiles.filter(f => !f.is_dir && f.is_audio), [filteredFiles]);

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
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-card-alt)', border: 'var(--border-card)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {searchInput ? <Search size={24} style={{ color: 'var(--text-dim)' }} /> : <Music size={24} style={{ color: 'var(--text-dim)' }} />}
        </div>
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 600, margin: 0 }}>{searchInput ? 'Sin resultados' : 'No hay archivos'}</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '24px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h1 style={{ color: 'var(--text-heading)', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>Galería</h1>
            <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '4px 0 0' }}>
              {stats.totalFiles} archivos
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card-alt)', borderRadius: 8, padding: '3px' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: page === 0 ? 'transparent' : 'var(--bg-card)', color: 'var(--text-icon)', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronLeft size={14} />
            </button>
            <span style={{ color: 'var(--text-label)', fontSize: 11, fontWeight: 500, minWidth: 50, textAlign: 'center' }}>
              {page + 1} / {totalPages || 1}
            </span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ width: 28, height: 28, borderRadius: 6, border: 'none', background: page >= totalPages - 1 ? 'transparent' : 'var(--bg-card)', color: 'var(--text-icon)', cursor: page >= totalPages - 1 ? 'default' : 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
        <div style={{ position: 'relative', maxWidth: 220, width: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input value={searchInput} onChange={e => { setPage(0); onSearchChange(e.target.value); }}
            placeholder="Buscar…"
            style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 10, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: 24, justifyContent: 'center',
      }}>
        {pageFiles.map((file, i) => {
          const meta = getMeta(file.path);
          const isHovered = hoveredCard === file.path;
          const selected = selectedFiles.has(file.path);
          const frameColor = frameColors[(page * perPage + i) % frameColors.length];
          const title = meta?.title || file.name.replace(/\.[^/.]+$/, '');
          const artist = meta?.artist || '';
          const isDir = file.is_dir;
          const gIdx = hashStr(file.path) % 8;
          const gradients = ['#667eea,#764ba2', '#f093fb,#f5576c', '#4facfe,#00f2fe', '#43e97b,#38f9d7', '#fa709a,#fee140', '#a18cd1,#fbc2eb', '#fccb90,#d57eeb', '#e0c3fc,#8ec5fc'];
          const g = gradients[gIdx];

          return (
            <motion.div
              key={file.path}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              onMouseEnter={() => onHover(file.path)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onFileClick(file, isDir)}
              onContextMenu={(e) => onFileContextMenu?.(file, e)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{
                padding: '8px 8px 28px 8px',
                background: frameColor,
                borderRadius: 4,
                boxShadow: isHovered
                  ? '0 16px 48px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)'
                  : '0 2px 8px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.03)',
                transition: 'box-shadow 0.25s, transform 0.25s',
                transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
                position: 'relative',
              }}>
                <div style={{
                  width: '100%', aspectRatio: '1/1', borderRadius: 2, overflow: 'hidden',
                  background: `linear-gradient(135deg, ${g})`,
                }}>
                  {meta?.cover ? (
                    <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s', transform: isHovered ? 'scale(1.04)' : 'scale(1)' }} />
                  ) : isDir ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={28} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={28} style={{ color: 'rgba(255,255,255,0.25)' }} />
                    </div>
                  )}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        style={{
                          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                        <div onClick={e => { e.stopPropagation(); onSelect(file.path, e.shiftKey); }}
                          style={{ width: 28, height: 28, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.2)', border: selected ? 'none' : '1px solid rgba(255,255,255,0.3)' }}>
                          {selected && <Check size={12} strokeWidth={3} color="#fff" />}
                        </div>
                        {!isDir && (
                          <div onClick={e => { e.stopPropagation(); onOpenEditor(file); }}
                            style={{ width: 28, height: 28, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', border: 'none', backdropFilter: 'blur(4px)' }}>
                            <Edit3 size={12} color="#fff" />
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {selected && !isHovered && (
                    <div style={{ position: 'absolute', top: 6, right: 6, width: 20, height: 20, borderRadius: 5, background: 'var(--accent-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Check size={10} strokeWidth={3} color="#fff" />
                    </div>
                  )}
                </div>
                <p style={{ color: 'rgba(0,0,0,0.6)', fontSize: 10, fontWeight: 500, margin: '8px 0 0', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isDir ? file.name : title}
                </p>
              </div>
            </motion.div>
          );
        })}
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
