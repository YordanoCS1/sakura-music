import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const NEON_SIGN_COLORS = ['#ff2d55', '#00e5ff', '#ffeb3b', '#ff6d00', '#d500f9', '#00e676', '#ff4081', '#448aff'];
const SIGN_SHAPES = ['rect', 'round', 'diamond', 'arch', 'star'] as const;

const SIGN_VARIANTS = [
  { width: 40, height: 180, shape: 'rect' as const },
  { width: 50, height: 220, shape: 'round' as const },
  { width: 35, height: 150, shape: 'diamond' as const },
  { width: 55, height: 260, shape: 'arch' as const },
  { width: 30, height: 130, shape: 'star' as const },
  { width: 45, height: 200, shape: 'rect' as const },
  { width: 38, height: 170, shape: 'round' as const },
  { width: 48, height: 240, shape: 'diamond' as const },
];

function getSignVariant(seed: number) {
  return SIGN_VARIANTS[seed % SIGN_VARIANTS.length];
}

export const LayoutTokyoNeon: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [activeIdx, setActiveIdx] = useState<number | null>(null);

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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: '#00e5ff', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 0 20px rgba(0,229,255,0.2)' }}>
              <span style={{ fontSize: 10 }}>◉</span> Tokyo Neon
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, margin: '2px 0 0' }}>
              {numeral(stats.totalFiles)} canciones · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 240, width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar…"
              style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 4, background: 'var(--bg-input)', border: 'var(--border-card)', color: '#00e5ff', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%',
          background: 'linear-gradient(180deg, transparent 0%, var(--bg-app) 100%)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          position: 'absolute', bottom: 20, left: 0, right: 0, height: 2,
          background: 'repeating-linear-gradient(90deg, var(--border-card) 0px, var(--border-card) 30px, transparent 30px, transparent 40px)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          height: '100%', gap: 2, padding: '0 24px',
          position: 'relative', zIndex: 1, overflow: 'auto',
        }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const neonColor = NEON_SIGN_COLORS[seed % NEON_SIGN_COLORS.length];
            const variant = getSignVariant(seed);
            const isActive = activeIdx === i;
            const isHovered = hoveredCard === file.path;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const height = variant.height + (isActive ? 30 : 0);
            const width = variant.width + (isActive ? 8 : 0);

            const borderRadius = variant.shape === 'round' ? `${width}px ${width}px 0 0` :
              variant.shape === 'diamond' ? '4px' :
              variant.shape === 'arch' ? `${width}px ${width}px 0 0` :
              variant.shape === 'star' ? '8px 8px 0 0' : '2px 2px 0 0';

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 40 }}
                animate={{
                  opacity: isActive ? 1 : (isHovered ? 0.9 : 0.55),
                  height,
                  width,
                  y: isActive ? -8 : 0,
                }}
                transition={{ type: 'spring', stiffness: 200, damping: 24, delay: i * 0.004 }}
                onClick={() => {
                  setActiveIdx(i === activeIdx ? null : i);
                  onFileClick(file, isDir);
                }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{
                  cursor: 'pointer', position: 'relative', flexShrink: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
                }}
              >
                <motion.div
                  animate={{
                    boxShadow: isActive
                      ? `0 0 30px ${neonColor}66, 0 0 60px ${neonColor}33, inset 0 0 20px ${neonColor}22`
                      : isHovered
                      ? `0 0 15px ${neonColor}33`
                      : 'none',
                  }}
                  style={{
                    width: '100%', height: '100%',
                    borderRadius, overflow: 'hidden',
                    position: 'relative',
                    background: `linear-gradient(180deg, ${neonColor}22, #0a0020)`,
                    border: `1px solid ${isActive ? neonColor : `${neonColor}33`}`,
                    transition: 'border-color 0.2s',
                  }}>
                  {meta?.cover ? (
                    <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: isActive ? 1 : 0.4 }} />
                  ) : isDir ? (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FolderOpen size={16} style={{ color: `${neonColor}44` }} />
                    </div>
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Music size={14} style={{ color: `${neonColor}33` }} />
                    </div>
                  )}

                  <div style={{
                    position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)',
                    background: `var(--bg-card)`, padding: '1px 4px', borderRadius: 2,
                    border: `1px solid ${neonColor}22`,
                    whiteSpace: 'nowrap',
                  }}>
                    <span style={{ color: neonColor, fontSize: 8, fontWeight: 700, letterSpacing: '0.05em' }}>{title.slice(0, 6)}</span>
                  </div>
                </motion.div>

                <div style={{
                  width: width + 12, height: 6, borderRadius: '50%',
                  background: isActive ? `${neonColor}44` : 'rgba(255,255,255,0.02)',
                  boxShadow: isActive ? `0 0 20px ${neonColor}44` : 'none',
                  marginTop: -2, flexShrink: 0,
                }} />

                {isActive && !isDir && (
                  <motion.button
                    initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                    style={{ position: 'absolute', bottom: 16, padding: '3px 8px', borderRadius: 4, border: `1px solid ${neonColor}33`, background: 'rgba(0,0,0,0.6)', color: neonColor, cursor: 'pointer', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Edit3 size={8} /> Editar
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>

        {activeIdx !== null && filteredFiles[activeIdx] && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{
              position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              zIndex: 5, textAlign: 'center',
            }}>
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, textShadow: '0 0 20px rgba(0,0,0,0.5)' }}>
              {filteredFiles[activeIdx].is_dir ? filteredFiles[activeIdx].name : (getMeta(filteredFiles[activeIdx].path)?.title || filteredFiles[activeIdx].name.replace(/\.[^/.]+$/, ''))}
            </p>
            {!filteredFiles[activeIdx].is_dir && (
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, margin: '2px 0 0' }}>
                {getMeta(filteredFiles[activeIdx].path)?.artist || 'Artista desconocido'}
              </p>
            )}
          </motion.div>
        )}
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
