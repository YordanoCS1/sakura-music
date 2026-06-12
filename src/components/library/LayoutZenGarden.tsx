import React, { useState, useMemo, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const SCROLL_SILK = ['#e8ddd0', '#f0e8d8', '#d8d0c0', '#e0d8c8', '#f0e0d0', '#d0c8b8', '#e0d5c5', '#f5ead5'];
const ROLLER_COLOR = '#5a3a2a';
const CORD_COLORS = ['#c0392b', '#2c3e50', '#8e44ad', '#d35400', '#7f8c8d', '#a08060'];

const INK = '#3a3228';
const SAND = '#c4b89a';

const PETAL_COLORS = ['#f8bbd0', '#f48fb1', '#f06292', '#e8a0bf', '#ffcdd2', '#fce4ec'];

const EN_SO = '○';

const FloatingPetal: React.FC<{ index: number }> = memo(({ index }) => {
  const seed = index * 137.5;
  const left = 5 + (seed % 90);
  const delay = -(seed % 20);
  const duration = 14 + (seed % 12);
  const drift = -20 + (seed % 40);
  const color = PETAL_COLORS[index % PETAL_COLORS.length];
  const size = 4 + (seed % 4);

  return (
    <motion.div
      initial={{ x: left, y: -10, rotate: 0, opacity: 0 }}
      animate={{
        x: [left, left + drift * 0.3, left + drift * 0.7, left + drift],
        y: ['-5vh', '25vh', '55vh', '105vh'],
        rotate: [0, 60, 120, 200],
        opacity: [0, 0.6, 0.5, 0],
      }}
      transition={{ duration, repeat: Infinity, delay, ease: 'easeInOut' }}
      style={{
        position: 'absolute', zIndex: 0, pointerEvents: 'none',
        width: size, height: size * 0.8,
        borderRadius: '50% 0 50% 0',
        background: color,
        opacity: 0.5,
      }}
    />
  );
});

export const LayoutZenGarden: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [rippledIdx, setRippledIdx] = useState<number | null>(null);
  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  const triggerRipple = useCallback((idx: number) => {
    setRippledIdx(idx);
    setTimeout(() => setRippledIdx(null), 1200);
  }, []);

  const petals = useMemo(() => Array.from({ length: 10 }, (_, i) => i), []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-card)', borderTopColor: SAND, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>📜</div>
        <p style={{ color: INK, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif' }}>Galería vacía</p>
        <p style={{ color: `${INK}88`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Cada canción es una obra de arte...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{
        padding: '14px 28px 8px', position: 'relative', zIndex: 3,
        borderBottom: `1px solid ${SAND}33`,
        background: `linear-gradient(180deg, var(--bg-card), transparent)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
          <div>
            <h2 style={{
              color: INK, fontSize: 20, fontWeight: 400, margin: 0,
              letterSpacing: '0.3em', fontFamily: 'Georgia, serif',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 22, fontWeight: 100, opacity: 0.35 }}>禅</span>
              ZEN GARDEN
              <span style={{ fontSize: 22, fontWeight: 100, opacity: 0.35 }}>庭</span>
            </h2>
            <p style={{ color: `${INK}55`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic', letterSpacing: '0.08em' }}>
              {numeral(stats.totalFiles)} obras · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${INK}44`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: `1px solid ${INK}22`,
                color: INK, fontSize: 12, outline: 'none',
                fontFamily: 'Georgia, serif', fontStyle: 'italic',
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse 80% 60% at 50% 50%, ${SAND}33 0%, transparent 70%),
            repeating-conic-gradient(${SAND}15 0% 0.5%, transparent 0.5% 2%) 0 0 / 40px 40px,
            repeating-linear-gradient(90deg, ${SAND}10 0px, ${SAND}10 1px, transparent 1px, transparent 80px),
            repeating-linear-gradient(0deg, transparent 0px, transparent 19px, ${SAND}08 19px, ${SAND}08 20px)
          `,
          borderRadius: 0,
        }}>
          <motion.div
            animate={{ rotate: [0.5, -0.5, 0.5] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', top: '4%', right: '8%', zIndex: 1,
              fontSize: 40, color: `${INK}08`, fontFamily: 'Georgia, serif',
              fontWeight: 100, lineHeight: 1, pointerEvents: 'none',
            }}>
            {EN_SO}
          </motion.div>
        </div>

        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
          {petals.map(i => <FloatingPetal key={i} index={i} />)}
        </div>

        <div style={{ height: '100%', overflow: 'auto', padding: '28px 32px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 32,
            position: 'relative',
          }}>
            {filteredFiles.map((file, i) => {
              const meta = getMeta(file.path);
              const isDir = file.is_dir;
              const seed = hashStr(file.path);
              const silkColor = SCROLL_SILK[seed % SCROLL_SILK.length];
              const cordColor = CORD_COLORS[seed % CORD_COLORS.length];
              const isHovered = hoveredCard === file.path;
              const isFocused = focusedIdx === i;
              const selected = selectedFiles.has(file.path);
              const isRippling = rippledIdx === i;
              const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
              const scrollW = 150;
              const artH = scrollW;

              return (
                <motion.div
                  key={file.path}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.012, duration: 0.7, ease: 'easeOut' }}
                  onClick={() => {
                    triggerRipple(i);
                    setFocusedIdx(isFocused ? null : i);
                    onFileClick(file, isDir);
                  }}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                  onMouseEnter={() => onHover(file.path)}
                  onMouseLeave={() => onHover(null)}
                  style={{
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifySelf: (i % 5 === 1 || i % 5 === 3) ? 'end' : (i % 5 === 2) ? 'center' : 'start',
                    padding: '4px 0',
                  }}
                >
                  <motion.div
                    animate={isRippling ? { scale: [1, 1.03, 1], transition: { duration: 0.8 } } : {}}
                    whileHover={{ y: -3 }}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                  >
                    {isRippling && (
                      <motion.div
                        initial={{ opacity: 0.3, scale: 0.8 }}
                        animate={{ opacity: 0, scale: 2.5 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        style={{
                          position: 'absolute', top: '40%', left: '50%',
                          marginTop: -60, marginLeft: -60,
                          width: 120, height: 120, borderRadius: '50%',
                          background: `${SAND}33`,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      {/* Hanging cord */}
                      <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                        <div style={{ width: 1, height: 7, background: cordColor, opacity: 0.4 }} />
                        <div style={{ width: 1, height: 9, background: cordColor, opacity: 0.6 }} />
                        <div style={{ width: 1, height: 6, background: cordColor, opacity: 0.4 }} />
                      </div>

                      {/* Top roller */}
                      <div style={{
                        width: scrollW + 14, height: 5,
                        background: `linear-gradient(180deg, ${ROLLER_COLOR}, ${ROLLER_COLOR}cc)`,
                        borderRadius: '2px 2px 0 0',
                        boxShadow: `0 1px 3px rgba(0,0,0,0.15), inset 0 1px 0 ${ROLLER_COLOR}88`,
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute', left: -3, top: -1,
                          width: 4, height: 7,
                          background: ROLLER_COLOR,
                          borderRadius: '2px 0 0 2px',
                          boxShadow: `inset -1px 0 0 ${ROLLER_COLOR}88`,
                        }} />
                        <div style={{
                          position: 'absolute', right: -3, top: -1,
                          width: 4, height: 7,
                          background: ROLLER_COLOR,
                          borderRadius: '0 2px 2px 0',
                          boxShadow: `inset 1px 0 0 ${ROLLER_COLOR}88`,
                        }} />
                      </div>

                      {/* Scroll body with silk border */}
                      <div style={{
                        width: scrollW, position: 'relative',
                        background: silkColor,
                        boxShadow: selected
                          ? `0 0 0 2px ${INK}66, 0 8px 24px rgba(0,0,0,0.15)`
                          : isHovered
                          ? `0 0 0 1px ${SAND}88, 0 6px 20px rgba(0,0,0,0.1)`
                          : '0 4px 12px rgba(0,0,0,0.06)',
                        transition: 'box-shadow 0.3s',
                        padding: 6,
                      }}>
                        {/* Inner border (silk mat) */}
                        <div style={{
                          border: `1px solid ${INK}15`,
                          padding: 2,
                        }}>
                          {/* Artwork area */}
                          <div style={{
                            width: '100%', aspectRatio: '1/1',
                            overflow: 'hidden',
                            background: meta?.cover ? 'none' : `${INK}08`,
                            position: 'relative',
                          }}>
                            {meta?.cover ? (
                              <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : isDir ? (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FolderOpen size={24} style={{ color: `${INK}33` }} />
                              </div>
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Disc3 size={24} style={{ color: `${INK}22` }} />
                              </div>
                            )}

                            {/* Red stamp seal */}
                            <div style={{
                              position: 'absolute', bottom: 4, right: 4,
                              width: 14, height: 14,
                              border: `1px solid ${cordColor}66`,
                              borderRadius: '2px',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 6, color: cordColor, opacity: 0.5,
                              fontFamily: 'Georgia, serif',
                            }}>
                              印
                            </div>

                            {(isHovered || isFocused) && !isDir && (
                              <motion.button
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                                style={{
                                  position: 'absolute', top: 2, right: 2, zIndex: 3,
                                  width: 22, height: 22, borderRadius: '50%',
                                  border: `1px solid ${SAND}66`,
                                  background: `${INK}cc`,
                                  color: SAND, cursor: 'pointer', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  backdropFilter: 'blur(4px)',
                                }}>
                                <Edit3 size={9} />
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bottom roller */}
                      <div style={{
                        width: scrollW + 14, height: 5,
                        background: `linear-gradient(180deg, ${ROLLER_COLOR}cc, ${ROLLER_COLOR})`,
                        borderRadius: '0 0 2px 2px',
                        boxShadow: `0 2px 4px rgba(0,0,0,0.1), inset 0 -1px 0 ${ROLLER_COLOR}88`,
                        position: 'relative',
                      }}>
                        <div style={{
                          position: 'absolute', left: -3, top: -1,
                          width: 4, height: 7,
                          background: ROLLER_COLOR,
                          borderRadius: '2px 0 0 2px',
                        }} />
                        <div style={{
                          position: 'absolute', right: -3, top: -1,
                          width: 4, height: 7,
                          background: ROLLER_COLOR,
                          borderRadius: '0 2px 2px 0',
                        }} />
                      </div>

                      {/* Paper label/tag */}
                      <div style={{
                        marginTop: 6, textAlign: 'center',
                        maxWidth: scrollW + 14,
                      }}>
                        <p style={{
                          margin: 0, fontSize: 11, fontWeight: 700,
                          color: INK, fontFamily: 'Georgia, serif',
                          lineHeight: 1.3,
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}>
                          {title}
                        </p>
                        {!isDir && (
                          <p style={{
                            margin: '1px 0 0', fontSize: 9,
                            color: `${INK}55`, fontStyle: 'italic',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          }}>
                            {meta?.artist || 'anónimo'}
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
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
              borderRadius: 4, background: 'var(--bg-card)',
              border: `1px solid ${SAND}55`,
              boxShadow: `0 4px 24px ${INK}22`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: INK, fontSize: 12, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `${INK}22` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: `${INK}11`, border: `1px solid ${INK}22`, color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Georgia, serif' }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.15)', color: '#a04040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Georgia, serif' }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: `${INK}55`, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
