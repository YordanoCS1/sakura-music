import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const JADE = '#2a8a5a';
const GOLD = '#d4a017';
const IMPERIAL = '#c0392b';

const SCALE_TYPES = [
  'repeating-linear-gradient(45deg, transparent 0px, transparent 4px, rgba(42,138,90,0.06) 4px, rgba(42,138,90,0.06) 5px)',
  'repeating-linear-gradient(135deg, transparent 0px, transparent 6px, rgba(42,138,90,0.04) 6px, rgba(42,138,90,0.04) 7px)',
  'repeating-linear-gradient(90deg, transparent 0px, transparent 8px, rgba(212,160,23,0.04) 8px, rgba(212,160,23,0.04) 9px)',
  'radial-gradient(circle at 30% 40%, rgba(42,138,90,0.04) 0%, transparent 50%)',
];

const PEARL_SHAPES = [
  { borderRadius: '50%', transform: 'scale(1)' },
  { borderRadius: '45% 55% 50% 50% / 50% 45% 55% 50%', transform: 'scale(0.95)' },
  { borderRadius: '55% 45% 50% 50% / 45% 50% 50% 55%', transform: 'scale(1.05)' },
  { borderRadius: '50% 40% 60% 50% / 50% 50% 50% 50%', transform: 'scale(0.98)' },
];

const CLOUD_SYMBOLS = ['☁', '龙', '雲', '气'];

export const LayoutDragon: React.FC<LibraryLayoutProps> = (props) => {
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
        <div style={{ width: 24, height: 24, border: '2px solid rgba(42,138,90,0.2)', borderTopColor: JADE, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🐉</div>
        <p style={{ color: IMPERIAL, fontSize: 15, fontWeight: 700, margin: 0 }}>Cielo vacío</p>
        <p style={{ color: `${GOLD}77`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>El dragón duerme sin música...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{
        padding: '14px 24px 10px', position: 'relative', zIndex: 2,
        borderBottom: `1px solid ${JADE}33`,
        background: 'linear-gradient(180deg, var(--bg-card), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              color: GOLD, fontSize: 20, fontWeight: 700, margin: 0,
              letterSpacing: '0.12em', textShadow: `0 0 20px ${GOLD}22`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: IMPERIAL }}>🐉</span> DRAGÓN CELESTIAL
            </h2>
            <p style={{ color: `${JADE}88`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic' }}>
              {numeral(stats.totalFiles)} perlas · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${GOLD}55`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: `1px solid ${JADE}44`,
                color: 'var(--text-input)', fontSize: 12, outline: 'none', fontWeight: 500,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 80% 20%, ${GOLD}06, transparent 50%), radial-gradient(ellipse at 20% 80%, ${JADE}04, transparent 50%)`,
          pointerEvents: 'none',
        }} />

        <div style={{
          position: 'absolute', top: '10%', left: '5%', right: '5%', height: 1,
          background: `linear-gradient(90deg, transparent, ${GOLD}11, ${JADE}11, transparent)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 32, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const pearl = PEARL_SHAPES[seed % PEARL_SHAPES.length];
            const scale = SCALE_TYPES[seed % SCALE_TYPES.length];
            const cloud = CLOUD_SYMBOLS[seed % CLOUD_SYMBOLS.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const pearlSize = 120;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 160, damping: 22 }}
                whileHover={{ y: -5 }}
                onClick={() => {
                  setFocusedIdx(isFocused ? null : i);
                  onFileClick(file, isDir);
                }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Cloud platform */}
                  <div style={{
                    position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}>
                    <motion.div
                      animate={{ y: [-3, 3, -3] }}
                      transition={{ duration: 4 + (seed % 3), repeat: Infinity, ease: 'easeInOut' }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                    >
                      {/* Glow behind pearl */}
                      <div style={{
                        position: 'absolute', top: '50%', left: '50%',
                        marginTop: -pearlSize * 0.6, marginLeft: -pearlSize * 0.6,
                        width: pearlSize * 1.2, height: pearlSize * 1.2,
                        background: `radial-gradient(circle, ${GOLD}15, ${JADE}08, transparent)`,
                        borderRadius: '50%',
                        filter: 'blur(10px)',
                        pointerEvents: 'none',
                      }} />

                      {/* Jade pearl */}
                      <div style={{
                        width: pearlSize, height: pearlSize,
                        ...pearl,
                        background: `radial-gradient(ellipse at 35% 25%, ${JADE}88, ${JADE}, #1a6a3a)`,
                        border: selected
                          ? `2px solid ${GOLD}`
                          : `1px solid ${GOLD}44`,
                        boxShadow: isHovered
                          ? `0 0 40px ${GOLD}33, 0 0 80px ${JADE}22, inset 0 -4px 20px rgba(0,0,0,0.2)`
                          : `0 4px 20px rgba(0,0,0,0.08), inset 0 -2px 12px rgba(0,0,0,0.15)`,
                        transition: 'box-shadow 0.3s',
                        overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute', inset: 0,
                          background: `radial-gradient(ellipse at 30% 20%, ${JADE}aa, transparent 60%)`,
                          pointerEvents: 'none',
                        }} />

                        <div style={{
                          position: 'absolute', inset: 0,
                          background: scale,
                          pointerEvents: 'none',
                        }} />

                        {meta?.cover ? (
                          <div style={{
                            width: '70%', height: '70%', overflow: 'hidden',
                            borderRadius: 'inherit',
                            position: 'relative', zIndex: 1,
                          }}>
                            <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </div>
                        ) : isDir ? (
                          <FolderOpen size={24} style={{ color: `${GOLD}66`, position: 'relative', zIndex: 1 }} />
                        ) : (
                          <Disc3 size={24} style={{ color: `${GOLD}44`, position: 'relative', zIndex: 1 }} />
                        )}

                        {/* Cloud symbol */}
                        <div style={{
                          position: 'absolute', bottom: 4, left: 4,
                          fontSize: 8, color: `${GOLD}33`,
                          pointerEvents: 'none',
                        }}>{cloud}</div>

                        {(isHovered || isFocused) && !isDir && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                            style={{
                              position: 'absolute', bottom: 4, right: 4, zIndex: 3,
                              width: 22, height: 22, borderRadius: '50%',
                              border: `1px solid ${GOLD}55`, background: `${IMPERIAL}cc`,
                              color: GOLD, cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              backdropFilter: 'blur(4px)',
                            }}>
                            <Edit3 size={9} />
                          </motion.button>
                        )}
                      </div>
                    </motion.div>

                    {/* Cloud platform */}
                    <div style={{
                      display: 'flex', gap: 2, marginTop: -4,
                    }}>
                      {[8, 16, 20, 14, 6].map((w, ci) => (
                        <div key={ci} style={{
                          width: w, height: 4,
                          background: `radial-gradient(ellipse, ${GOLD}22, transparent)`,
                          borderRadius: '50%',
                          filter: 'blur(2px)',
                        }} />
                      ))}
                    </div>
                  </div>

                  <p style={{
                    margin: '6px 0 0', fontSize: 11, fontWeight: 700,
                    color: JADE, textAlign: 'center',
                    lineHeight: 1.3, maxWidth: 140,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {title}
                  </p>

                  {!isDir && (
                    <p style={{
                      margin: '1px 0 0', fontSize: 9,
                      color: `${GOLD}66`, fontStyle: 'italic',
                      maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {meta?.artist || 'anónimo'}
                    </p>
                  )}
                </div>
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
              border: `1px solid ${GOLD}44`,
              boxShadow: `0 4px 24px ${GOLD}11`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `${GOLD}33` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: `${JADE}22`, border: `1px solid ${JADE}44`, color: JADE, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.15)', color: '#a04040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: `${GOLD}55`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
