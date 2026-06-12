import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const LAMP_COLORS = ['#c0392b', '#e74c3c', '#b03a2e', '#d35400', '#a93226', '#cb4335'];
const FIRE_COLORS = ['#f39c12', '#e67e22', '#d4ac0d', '#f5b041'];
const WAVE_PATTERN = 'repeating-linear-gradient(90deg, transparent 0px, transparent 15px, rgba(26,82,118,0.04) 15px, rgba(26,82,118,0.04) 17px, transparent 17px, transparent 32px)';

export const LayoutYokai: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(192,57,43,0.2)', borderTopColor: '#c0392b', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🏮</div>
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 700, margin: 0 }}>Noche de yōkai</p>
        <p style={{ color: 'var(--text-label)', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Las linternas aguardan ser encendidas...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{
        padding: '14px 24px 10px', position: 'relative', zIndex: 2,
        borderBottom: '1px solid rgba(192,57,43,0.2)',
        background: 'linear-gradient(180deg, var(--bg-card), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#c0392b', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '0.15em', display: 'flex', alignItems: 'center', gap: 8, textShadow: '0 0 20px rgba(192,57,43,0.15)' }}>
              <span style={{ fontSize: 14 }}>🏮</span> YŌKAI
            </h2>
            <p style={{ color: 'var(--text-label)', fontSize: 11, margin: '1px 0 0', fontStyle: 'italic' }}>
              {numeral(stats.totalFiles)} cuentos · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: '1px solid var(--text-muted)',
                color: 'var(--text-input)', fontSize: 12, outline: 'none', fontStyle: 'italic',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '24px 28px',
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: WAVE_PATTERN, opacity: 0.5, pointerEvents: 'none' }} />

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'radial-gradient(ellipse at 50% 100%, rgba(192,57,43,0.04) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 32, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const lampColor = LAMP_COLORS[seed % LAMP_COLORS.length];
            const fireColor = FIRE_COLORS[seed % FIRE_COLORS.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const floatDelay = (seed % 5) * 0.3;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 160, damping: 22 }}
                onClick={() => {
                  setFocusedIdx(isFocused ? null : i);
                  onFileClick(file, isDir);
                }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <motion.div
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ duration: 3 + floatDelay, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  {/* Lantern top hook */}
                  <div style={{ width: 1, height: 6, background: `${lampColor}66` }} />

                  {/* Lantern body - octagonal */}
                  <div style={{
                    width: 130, position: 'relative',
                    background: `linear-gradient(180deg, ${lampColor}, ${lampColor}dd, ${lampColor})`,
                    borderRadius: '30% 30% 20% 20% / 40% 40% 30% 30%',
                    border: selected ? `2px solid ${fireColor}` : `1px solid ${lampColor}88`,
                    boxShadow: isHovered
                      ? `0 0 30px ${fireColor}33, 0 0 60px ${lampColor}22, inset 0 0 20px ${fireColor}11`
                      : `0 4px 16px rgba(0,0,0,0.08), inset 0 0 10px ${lampColor}11`,
                    transition: 'box-shadow 0.3s',
                    overflow: 'hidden',
                    padding: 8,
                  }}>
                    {/* Lantern ribs */}
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: '33%', width: 1,
                      background: `${lampColor}44`,
                    }} />
                    <div style={{
                      position: 'absolute', top: 0, bottom: 0, left: '66%', width: 1,
                      background: `${lampColor}44`,
                    }} />
                    <div style={{
                      position: 'absolute', left: 0, right: 0, top: '40%', height: 1,
                      background: `${lampColor}44`,
                    }} />

                    {/* Glow effect */}
                    <div style={{
                      position: 'absolute', top: '30%', left: '20%', right: '20%', bottom: '30%',
                      background: `radial-gradient(ellipse, ${fireColor}22, transparent)`,
                    }} />

                    {/* Album art */}
                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: '20% 20% 15% 15% / 30% 30% 20% 20%',
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderOpen size={24} style={{ color: 'rgba(255,255,255,0.25)' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={24} style={{ color: 'rgba(255,255,255,0.2)' }} />
                        </div>
                      )}

                      {/* Fire glow overlay */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
                        background: `linear-gradient(to top, ${fireColor}44, transparent)`,
                        pointerEvents: 'none',
                      }} />
                    </div>

                    {/* Bottom rim */}
                    <div style={{
                      position: 'absolute', bottom: 2, left: '15%', right: '15%', height: 2,
                      background: `${lampColor}66`,
                      borderRadius: '50%',
                    }} />

                    {(isHovered || isFocused) && !isDir && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                        style={{
                          position: 'absolute', top: 4, right: 4, zIndex: 3,
                          width: 22, height: 22, borderRadius: '50%',
                          border: `1px solid rgba(255,255,255,0.3)`, background: 'rgba(0,0,0,0.4)',
                          color: fireColor, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}>
                        <Edit3 size={9} />
                      </motion.button>
                    )}
                  </div>

                  {/* Fire light */}
                  {isHovered && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      style={{
                        width: 20, height: 20, marginTop: -6,
                        background: `radial-gradient(ellipse, ${fireColor}44, transparent)`,
                        borderRadius: '50%',
                        filter: 'blur(2px)',
                      }}
                    />
                  )}

                  {/* Tassel */}
                  <div style={{
                    width: 2, height: 8,
                    background: `${lampColor}55`,
                    marginTop: 2, borderRadius: '0 0 1px 1px',
                  }} />
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: lampColor,
                    opacity: 0.5,
                  }} />
                </motion.div>

                <p style={{
                  margin: '6px 0 0', fontSize: 11, fontWeight: 700,
                  color: 'var(--text-heading)', textAlign: 'center',
                  lineHeight: 1.3, maxWidth: 140,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}>
                  {title}
                </p>

                {!isDir && (
                  <p style={{
                    margin: '1px 0 0', fontSize: 9,
                    color: 'var(--text-label)', fontStyle: 'italic',
                    maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}>
                    {meta?.artist || 'anónimo'}
                  </p>
                )}
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
              borderRadius: 4, background: 'var(--bg-card)',
              border: '1px solid rgba(192,57,43,0.3)',
              boxShadow: '0 4px 24px rgba(192,57,43,0.1)',
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: '#c0392b', fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: 'rgba(192,57,43,0.2)' }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(192,57,43,0.1)', border: '1px solid rgba(192,57,43,0.2)', color: '#c0392b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.15)', color: '#a04040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: 'var(--text-label)', cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
