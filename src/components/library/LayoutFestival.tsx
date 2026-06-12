import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const LAMP_RED = '#c0392b';
const GOLD = '#d4a017';

const TASSEL_COLORS = ['#d4a017', '#e8c840', '#c0392b', '#e67e22', '#f1c40f', '#e74c3c'];

const CONFETTI_COLORS = ['#c0392b', '#d4a017', '#e74c3c', '#f39c12', '#e67e22', '#f1c40f'];

const FIREWORK_TYPES = ['✦', '✧', '✶', '✴', '✹', '★'];

export const LayoutFestival: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const confetti = useMemo(() => Array.from({ length: 8 }, (_, i) => i), []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <div style={{ width: 24, height: 24, border: '2px solid rgba(192,57,43,0.2)', borderTopColor: LAMP_RED, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>🧧</div>
        <p style={{ color: LAMP_RED, fontSize: 15, fontWeight: 700, margin: 0 }}>Festival vacío</p>
        <p style={{ color: `${GOLD}77`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Las linternas esperan ser encendidas...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{
        padding: '14px 24px 10px', position: 'relative', zIndex: 2,
        borderBottom: `1px solid ${LAMP_RED}33`,
        background: 'linear-gradient(180deg, var(--bg-card), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              color: LAMP_RED, fontSize: 22, fontWeight: 800, margin: 0,
              letterSpacing: '0.08em', textShadow: `0 0 20px ${LAMP_RED}22`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 18 }}>🧧</span> FESTIVAL
            </h2>
            <p style={{ color: `${GOLD}77`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic' }}>
              {numeral(stats.totalFiles)} celebraciones · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${GOLD}55`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: `1px solid ${LAMP_RED}44`,
                color: LAMP_RED, fontSize: 12, outline: 'none', fontWeight: 600,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', position: 'relative' }}>
        {/* Confetti particles */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {confetti.map(i => (
            <motion.div
              key={i}
              initial={{ x: `${5 + i * 12}%`, y: -10, rotate: 0, opacity: 0 }}
              animate={{
                y: ['-5%', '30%', '70%', '105%'],
                x: [`${5 + i * 12}%`, `${3 + i * 12}%`, `${7 + i * 12}%`, `${5 + i * 12}%`],
                rotate: [0, 90, 180, 360],
                opacity: [0, 0.6, 0.5, 0],
              }}
              transition={{ duration: 6 + (i % 4), repeat: Infinity, delay: -(i * 0.7), ease: 'easeInOut' }}
              style={{
                position: 'absolute', zIndex: 0,
                width: 4 + (i % 3), height: 6 + (i % 2),
                borderRadius: '1px',
                background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                opacity: 0.4,
              }}
            />
          ))}
        </div>

        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 20%, ${LAMP_RED}06, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 36, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const tasselColor = TASSEL_COLORS[seed % TASSEL_COLORS.length];
            const firework = FIREWORK_TYPES[seed % FIREWORK_TYPES.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const floatDelay = (seed % 4) * 0.2;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.012, type: 'spring', stiffness: 160, damping: 22 }}
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
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ duration: 3.5 + floatDelay, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                  {/* Lantern string */}
                  <div style={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    <div style={{ width: 1, height: 5, background: `${LAMP_RED}44` }} />
                    <div style={{ width: 1, height: 8, background: `${LAMP_RED}66` }} />
                    <div style={{ width: 1, height: 5, background: `${LAMP_RED}44` }} />
                  </div>

                  {/* Octagonal lantern */}
                  <div style={{
                    width: 130, position: 'relative',
                    background: `linear-gradient(180deg, ${LAMP_RED}, #e74c3c, ${LAMP_RED})`,
                    borderRadius: '8px',
                    border: selected ? `2px solid ${GOLD}` : `1px solid ${GOLD}44`,
                    boxShadow: isHovered
                      ? `0 0 30px ${LAMP_RED}33, 0 0 60px ${GOLD}11`
                      : `0 4px 16px rgba(0,0,0,0.08)`,
                    transition: 'box-shadow 0.3s',
                    overflow: 'hidden',
                    padding: 8,
                  }}>
                    {/* Lantern top rim */}
                    <div style={{
                      position: 'absolute', top: 0, left: '10%', right: '10%', height: 3,
                      background: `${GOLD}55`,
                      borderRadius: '0 0 50% 50%',
                    }} />

                    {/* Vertical ribs */}
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '25%', width: 1, background: `${GOLD}22` }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: `${GOLD}22` }} />
                    <div style={{ position: 'absolute', top: 0, bottom: 0, right: '25%', width: 1, background: `${GOLD}22` }} />

                    {/* Album art */}
                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden', borderRadius: 4,
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderOpen size={24} style={{ color: `${GOLD}55` }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={24} style={{ color: `${GOLD}44` }} />
                        </div>
                      )}

                      {/* Firework sparkle */}
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            position: 'absolute', top: 4, left: 4,
                            fontSize: 14, color: GOLD,
                            textShadow: `0 0 10px ${GOLD}`,
                          }}>
                          {firework}
                        </motion.div>
                      )}
                    </div>

                    {/* Bottom rim */}
                    <div style={{
                      position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 3,
                      background: `${GOLD}55`,
                      borderRadius: '50% 50% 0 0',
                    }} />

                    {(isHovered || isFocused) && !isDir && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                        style={{
                          position: 'absolute', top: 4, right: 4, zIndex: 3,
                          width: 22, height: 22, borderRadius: '50%',
                          border: `1px solid ${GOLD}55`, background: `${LAMP_RED}cc`,
                          color: GOLD, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}>
                        <Edit3 size={9} />
                      </motion.button>
                    )}
                  </div>

                  {/* Gold tassel */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 2 }}>
                    <div style={{ width: 2, height: 6, background: `${GOLD}66` }} />
                    <div style={{
                      width: 8, height: 10,
                      background: tasselColor,
                      borderRadius: '0 0 4px 4px',
                      opacity: 0.7,
                    }} />
                    <div style={{
                      width: 6, height: 6,
                      background: tasselColor,
                      borderRadius: '50%',
                      opacity: 0.4,
                      marginTop: 1,
                    }} />
                  </div>
                </motion.div>

                <p style={{
                  margin: '6px 0 0', fontSize: 11, fontWeight: 700,
                  color: LAMP_RED, textAlign: 'center',
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
              boxShadow: `0 4px 24px ${LAMP_RED}22`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: LAMP_RED, fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `${LAMP_RED}33` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: `${GOLD}22`, border: `1px solid ${GOLD}44`, color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
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
