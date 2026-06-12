import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3, Cloud, Star, Sparkles } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const CLOUD_GRADIENTS = [
  ['#fce4ec', '#f8bbd0', '#f48fb1'],
  ['#e8f5e9', '#c8e6c9', '#a5d6a7'],
  ['#fff3e0', '#ffe0b2', '#ffcc80'],
  ['#f3e5f5', '#e1bee7', '#ce93d8'],
  ['#e0f7fa', '#b2ebf2', '#80deea'],
  ['#fffde7', '#fff9c4', '#fff176'],
  ['#fbe9e7', '#ffccbc', '#ffab91'],
  ['#e8eaf6', '#c5cae9', '#9fa8da'],
  ['#fce4ec', '#f8bbd0', '#f48fb1'],
  ['#e0f2f1', '#b2dfdb', '#80cbc4'],
];

const STAR_TYPES = ['✦', '✧', '⋆', '☆', '·'];

export const LayoutKawaii: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover, formatDuration,
  } = props;

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
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px' }}>
        <motion.div animate={{ y: [-4, 4, -4] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: 56, marginBottom: 12, lineHeight: 1 }}>☁️</motion.div>
        <p style={{ color: 'var(--text-body)', fontSize: 16, fontWeight: 600, margin: 0 }}>Nubes vacías...</p>
        <p style={{ color: 'var(--text-label)', fontSize: 12, marginTop: 4 }}>Sube canciones para llenar el cielo</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <div style={{
        padding: '18px 24px 16px',
        background: 'linear-gradient(135deg, rgba(252,228,236,0.3), rgba(224,247,250,0.3), rgba(243,229,245,0.3))',
        borderBottom: 'var(--border-card)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 4, left: '20%', fontSize: 10, opacity: 0.2 }}>✦</div>
        <div style={{ position: 'absolute', top: 8, right: '30%', fontSize: 8, opacity: 0.15 }}>✧</div>
        <div style={{ position: 'absolute', bottom: 6, left: '50%', fontSize: 7, opacity: 0.12 }}>⋆</div>
        <div style={{ position: 'absolute', bottom: 4, right: '15%', fontSize: 9, opacity: 0.18 }}>✦</div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <motion.div
              animate={{ y: [-3, 3, -3], rotate: [-2, 2, -2] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              style={{ fontSize: 30, lineHeight: 1 }}>☁️</motion.div>
            <div>
              <h2 style={{ color: 'var(--text-heading)', fontSize: 20, fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={16} style={{ color: '#f48fb1' }} /> Kawaii Dream
              </h2>
              <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '1px 0 0' }}>
                <span style={{ opacity: 0.6 }}>✧</span> {numeral(stats.totalFiles)} canciones · {stats.totalSize} GB <span style={{ opacity: 0.6 }}>✧</span>
              </p>
            </div>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar en el cielo..."
              style={{ width: '100%', height: 36, paddingLeft: 34, paddingRight: 12, borderRadius: 18, background: 'rgba(255,255,255,0.35)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '28px 28px',
        background: 'linear-gradient(180deg, rgba(252,228,236,0.12), rgba(224,247,250,0.08), rgba(252,228,236,0.06))',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))',
          gap: 28,
          justifyItems: 'center',
        }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const grads = CLOUD_GRADIENTS[seed % CLOUD_GRADIENTS.length];
            const star = STAR_TYPES[seed % STAR_TYPES.length];
            const isHovered = hoveredCard === file.path;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const hasCover = !!meta?.cover;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 150, damping: 18, delay: i * 0.008 }}
                style={{ width: '100%', maxWidth: 185, position: 'relative' }}
              >
                <motion.div
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 3 + (seed % 3), repeat: Infinity, ease: 'easeInOut', delay: (seed % 10) * 0.1 }}
                  whileHover={{ scale: 1.05, y: -6 }}
                  onClick={() => { onFileClick(file, isDir); }}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                  onMouseEnter={() => onHover(file.path)}
                  onMouseLeave={() => onHover(null)}
                  style={{ cursor: 'pointer', position: 'relative' }}
                >
                  <div style={{
                    background: `linear-gradient(160deg, ${grads[0]}, ${grads[1]}, ${grads[2]})`,
                    borderRadius: 22,
                    padding: 10,
                    border: selected ? '2.5px solid #f48fb1' : '1px solid rgba(255,255,255,0.25)',
                    boxShadow: isHovered
                      ? '0 12px 36px rgba(244,143,177,0.12)'
                      : '0 4px 16px rgba(0,0,0,0.03)',
                    transition: 'box-shadow 0.25s',
                    position: 'relative',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <div style={{
                      position: 'absolute', top: -4, right: 6, fontSize: 10,
                      opacity: selected ? 0.8 : 0.3, color: '#f48fb1',
                      transition: 'opacity 0.2s',
                    }}>
                      {star}
                    </div>

                    <div style={{
                      width: '100%', aspectRatio: '1/1', borderRadius: 14,
                      overflow: 'hidden', background: 'rgba(255,255,255,0.3)',
                      position: 'relative',
                    }}>
                      {hasCover ? (
                        <img src={meta!.cover!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : !isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={30} style={{ color: 'rgba(255,255,255,0.35)' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderOpen size={28} style={{ color: 'rgba(255,255,255,0.3)' }} />
                        </div>
                      )}

                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        height: '40%',
                        background: 'linear-gradient(to top, rgba(255,255,255,0.15), transparent)',
                      }} />

                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          style={{
                            position: 'absolute', top: 6, left: 6,
                            fontSize: 8, color: 'rgba(255,255,255,0.5)',
                          }}>
                          {star}
                        </motion.div>
                      )}
                    </div>

                    <p style={{
                      margin: '8px 2px 0', fontSize: 11, fontWeight: 700,
                      color: 'var(--text-heading)',
                      textAlign: 'center', lineHeight: 1.3,
                      display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {title}
                    </p>

                    {!isDir && (
                      <p style={{
                        margin: '2px 2px 0', fontSize: 9,
                        color: 'var(--text-label)',
                        textAlign: 'center',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {meta?.artist || 'Artista desconocido'}
                      </p>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
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
