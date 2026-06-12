import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const COBALT = '#1a3a5a';
const PORCELAIN_WHITE = '#f0ece4';
const ACCENT_BLUE = '#2a6a9a';

const PLATE_SIZES = [130, 140, 150, 135, 145, 155];

const BLUE_PATTERNS = [
  'radial-gradient(circle at 50% 30%, rgba(42,106,154,0.06) 0%, transparent 50%)',
  'radial-gradient(circle at 30% 60%, rgba(42,106,154,0.04) 0%, transparent 40%), radial-gradient(circle at 70% 40%, rgba(42,106,154,0.04) 0%, transparent 40%)',
  'repeating-linear-gradient(45deg, rgba(42,106,154,0.03) 0px, rgba(42,106,154,0.03) 2px, transparent 2px, transparent 6px)',
  'radial-gradient(circle at 50% 50%, rgba(42,106,154,0.05) 0%, transparent 60%)',
];

const DELFT_FLOWERS = ['❀', '✿', '❁', '✤', '❋', '✾'];

export const LayoutPorcelana: React.FC<LibraryLayoutProps> = (props) => {
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
        <div style={{ width: 24, height: 24, border: '2px solid rgba(42,106,154,0.15)', borderTopColor: COBALT, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🍽️</div>
        <p style={{ color: COBALT, fontSize: 15, fontWeight: 700, margin: 0 }}>Mesa vacía</p>
        <p style={{ color: `${COBALT}77`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Porcelana esperando ser decorada...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{
        padding: '14px 24px 10px',
        borderBottom: `2px solid ${COBALT}22`,
        background: 'linear-gradient(180deg, var(--bg-card), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              color: COBALT, fontSize: 18, fontWeight: 600, margin: 0,
              letterSpacing: '0.12em', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ opacity: 0.5, fontStyle: 'italic', fontWeight: 300 }}>✧</span>
              PORCELANA
              <span style={{ opacity: 0.5, fontStyle: 'italic', fontWeight: 300 }}>✧</span>
            </h2>
            <p style={{ color: `${COBALT}66`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic' }}>
              {numeral(stats.totalFiles)} piezas · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${COBALT}44`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: `1px solid ${COBALT}33`,
                color: COBALT, fontSize: 12, outline: 'none', fontWeight: 500,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '32px 28px', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: `radial-gradient(ellipse at 50% 20%, ${ACCENT_BLUE}06, transparent 60%)`,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 32, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const plateSize = PLATE_SIZES[seed % PLATE_SIZES.length];
            const pattern = BLUE_PATTERNS[seed % BLUE_PATTERNS.length];
            const flower = DELFT_FLOWERS[seed % DELFT_FLOWERS.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const rimWidth = 5;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 150, damping: 20 }}
                whileHover={{ y: -4 }}
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
                  {/* Plate */}
                  <div style={{ width: plateSize, height: plateSize, position: 'relative' }}>
                    {/* Outer blue rim */}
                    <div style={{
                      position: 'absolute', inset: 0, borderRadius: '50%',
                      background: `linear-gradient(135deg, ${COBALT}, ${ACCENT_BLUE})`,
                      boxShadow: isHovered
                        ? `0 8px 28px rgba(42,106,154,0.15), 0 0 0 1px ${COBALT}33`
                        : `0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px ${COBALT}22`,
                      transition: 'box-shadow 0.3s',
                    }}>
                      {/* Inner white ring */}
                      <div style={{
                        position: 'absolute', inset: rimWidth, borderRadius: '50%',
                        background: meta?.cover ? 'transparent' : PORCELAIN_WHITE,
                        overflow: 'hidden',
                      }}>
                        {/* Cover fills the entire plate surface */}
                        {meta?.cover ? (
                          <img src={meta.cover} alt=""
                            style={{
                              width: '100%', height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: pattern,
                          }} />
                        )}

                        {/* Subtle blue overlay on cover */}
                        {meta?.cover && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: `${ACCENT_BLUE}06`,
                            mixBlendMode: 'overlay',
                          }} />
                        )}

                        {/* Inner decorative ring */}
                        <div style={{
                          position: 'absolute', inset: '14%', borderRadius: '50%',
                          border: `1px solid ${meta?.cover ? `${PORCELAIN_WHITE}33` : `${COBALT}10`}`,
                        }} />

                        {/* Center decorative dot */}
                        {!meta?.cover && (
                          <>
                            {isDir ? (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <FolderOpen size={22} style={{ color: `${COBALT}30` }} />
                              </div>
                            ) : (
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Disc3 size={22} style={{ color: `${COBALT}22` }} />
                              </div>
                            )}
                          </>
                        )}

                        {/* Decorative flower */}
                        <div style={{
                          position: 'absolute', top: '8%', left: '10%',
                          fontSize: 7, color: meta?.cover ? `${PORCELAIN_WHITE}44` : `${COBALT}18`,
                        }}>{flower}</div>
                        <div style={{
                          position: 'absolute', bottom: '8%', right: '10%',
                          fontSize: 7, color: meta?.cover ? `${PORCELAIN_WHITE}44` : `${COBALT}18`,
                        }}>{flower}</div>
                      </div>
                    </div>

                    {/* Plate rim highlight */}
                    <div style={{
                      position: 'absolute', inset: rimWidth - 1, borderRadius: '50%',
                      border: `1px solid ${PORCELAIN_WHITE}22`,
                      pointerEvents: 'none',
                    }} />

                    {/* Edit button */}
                    {(isHovered || isFocused) && !isDir && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                        style={{
                          position: 'absolute', bottom: 2, right: 2, zIndex: 3,
                          width: 22, height: 22, borderRadius: '50%',
                          border: `1px solid ${PORCELAIN_WHITE}66`,
                          background: `${COBALT}cc`,
                          color: PORCELAIN_WHITE, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}>
                        <Edit3 size={9} />
                      </motion.button>
                    )}
                  </div>

                  {/* Pedestal / stand */}
                  <div style={{
                    width: plateSize * 0.45, height: 8, marginTop: -3,
                    borderRadius: '0 0 50% 50% / 0 0 100% 100%',
                    background: `linear-gradient(180deg, ${COBALT}dd, ${COBALT}88)`,
                    boxShadow: `0 2px 6px rgba(0,0,0,0.08)`,
                  }} />
                  <div style={{
                    width: plateSize * 0.35, height: 3, marginTop: -1,
                    borderRadius: '0 0 50% 50%',
                    background: COBALT,
                    opacity: 0.2,
                  }} />

                  <p style={{
                    margin: '8px 0 0', fontSize: 11, fontWeight: 700,
                    color: COBALT, textAlign: 'center',
                    lineHeight: 1.3, maxWidth: 140,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {title}
                  </p>

                  {!isDir && (
                    <p style={{
                      margin: '1px 0 0', fontSize: 9,
                      color: `${COBALT}55`, fontStyle: 'italic',
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
              border: `1px solid ${COBALT}33`,
              boxShadow: `0 4px 24px ${COBALT}11`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: COBALT, fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `${COBALT}22` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: `${COBALT}11`, border: `1px solid ${COBALT}22`, color: COBALT, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.15)', color: '#a04040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: `${COBALT}55`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
