import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const CRIMSON = '#c6202c';
const GOLD = '#ffd700';
const GOLD_DIM = '#b8860b';

const FRAME_BORDERS = [
  { outer: `1px solid ${GOLD}44`, inner: `1px solid ${CRIMSON}33`, inset: `inset 0 0 20px ${CRIMSON}11` },
  { outer: `1px solid ${GOLD}33`, inner: `1px solid ${CRIMSON}22`, inset: `inset 0 0 30px ${CRIMSON}08` },
  { outer: `1px solid ${GOLD}55`, inner: `1px solid ${CRIMSON}44`, inset: `inset 0 0 25px ${CRIMSON}15` },
  { outer: `1px solid ${GOLD}44`, inner: `1px solid ${CRIMSON}22`, inset: `inset 0 0 35px ${CRIMSON}10` },
  { outer: `1px solid ${GOLD}33`, inner: `1px solid ${CRIMSON}33`, inset: `inset 0 0 20px ${CRIMSON}12` },
  { outer: `1px solid ${GOLD}55`, inner: `1px solid ${CRIMSON}44`, inset: `inset 0 0 40px ${CRIMSON}08` },
];

const BORDER_RADII = ['4px', '0px', '16px', '8px', '20px', '12px'];

const CORNER_GLYPH_TOP = ['♛', '♔', '✧', '✦', '♜', '♝'];
const CORNER_GLYPH_BOT = ['♚', '♕', '✤', '❖', '♞', '♟'];

export const LayoutVisualKei: React.FC<LibraryLayoutProps> = (props) => {
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
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-card)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${CRIMSON}11`, border: `1px solid ${GOLD}22`, marginBottom: 16 }}>
          <span style={{ fontSize: 20, color: GOLD }}>♛</span>
        </div>
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 700, margin: 0 }}>Cámaras vacías</p>
        <p style={{ color: `${GOLD}88`, fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>El castillo aguarda sus tesoros...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{
        background: 'linear-gradient(180deg, var(--bg-card), var(--bg-card-alt))',
        padding: '20px 24px 0', borderBottom: `1px solid ${CRIMSON}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div>
            <h2 style={{
              color: GOLD, fontSize: 22, fontWeight: 900, margin: 0,
              letterSpacing: '0.18em', fontFamily: 'Georgia, serif',
              textShadow: `0 0 20px ${GOLD}22, 0 0 60px ${CRIMSON}11`,
              lineHeight: 1.1,
            }}>
              <span style={{ fontSize: 16, marginRight: 6 }}>♛</span>VISUAL KEI<span style={{ fontSize: 16, marginLeft: 6 }}>♛</span>
            </h2>
            <p style={{ color: `${GOLD}66`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic', letterSpacing: '0.06em' }}>
              {numeral(stats.totalFiles)} obras · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 240, width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: `${GOLD}55`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 36, paddingLeft: 36, paddingRight: 12,
                borderRadius: 0, background: 'var(--bg-input)',
                border: `1px solid ${GOLD}22`, borderBottom: `2px solid ${CRIMSON}44`,
                color: GOLD, fontSize: 13, outline: 'none', fontFamily: 'Georgia, serif',
                fontWeight: 600,
              }}
            />
          </div>
        </div>
        <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${CRIMSON}66 20%, ${GOLD}44 50%, ${CRIMSON}66 80%, transparent 100%)`, marginBottom: 0 }} />
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '28px 28px',
        backgroundImage: `
          repeating-linear-gradient(0deg, transparent, transparent 60px, ${GOLD}08 60px, ${GOLD}08 61px),
          repeating-linear-gradient(90deg, transparent, transparent 60px, ${GOLD}08 60px, ${GOLD}08 61px)
        `,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 36, justifyItems: 'center' }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const fb = FRAME_BORDERS[seed % FRAME_BORDERS.length];
            const br = BORDER_RADII[seed % BORDER_RADII.length];
            const glyphTop = CORNER_GLYPH_TOP[seed % CORNER_GLYPH_TOP.length];
            const glyphBot = CORNER_GLYPH_BOT[(seed + 3) % CORNER_GLYPH_BOT.length];
            const isFocused = focusedIdx === i;
            const isHovered = hoveredCard === file.path;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.01, type: 'spring', stiffness: 180, damping: 22 }}
                onClick={() => {
                  setFocusedIdx(isFocused ? null : i);
                  onFileClick(file, isDir);
                }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}
              >
                <div style={{ width: '100%', position: 'relative' }}>
                  <div style={{
                    background: 'var(--bg-card)',
                    borderRadius: br,
                    border: selected ? `2px solid ${GOLD}` : fb.outer,
                    boxShadow: isFocused
                      ? `0 0 0 1px ${CRIMSON}33, ${fb.inset}, 0 0 50px ${CRIMSON}11, 0 8px 32px rgba(0,0,0,0.3)`
                      : isHovered
                      ? `0 0 0 1px ${GOLD}22, ${fb.inset}, 0 4px 16px rgba(0,0,0,0.15)`
                      : `${fb.inset}, 0 2px 8px rgba(0,0,0,0.1)`,
                    transition: 'box-shadow 0.3s, border-color 0.2s',
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{
                      position: 'absolute', top: 3, left: 5, fontSize: 11,
                      color: `${GOLD}44`, fontFamily: 'Georgia, serif',
                      zIndex: 2,
                    }}>{glyphTop}</div>
                    <div style={{
                      position: 'absolute', top: 3, right: 5, fontSize: 11,
                      color: `${GOLD}44`, fontFamily: 'Georgia, serif',
                      zIndex: 2,
                    }}>{glyphTop}</div>

                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '1/1',
                      overflow: 'hidden', borderRadius: br,
                      background: meta?.cover ? 'none' : 'var(--bg-card-alt)',
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderOpen size={32} style={{ color: `${GOLD}33` }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={32} style={{ color: `${GOLD}22` }} />
                        </div>
                      )}

                      <div style={{
                        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                        background: `linear-gradient(135deg, ${CRIMSON}08, transparent 40%, ${GOLD}08 100%)`,
                        pointerEvents: 'none', zIndex: 1,
                      }} />

                      <div style={{
                        position: 'absolute', inset: 0,
                        border: fb.inner, borderRadius: br,
                        pointerEvents: 'none', zIndex: 1,
                      }} />

                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        padding: '48px 14px 14px',
                        background: `linear-gradient(to top, ${CRIMSON}dd 0%, ${CRIMSON}55 40%, transparent 100%)`,
                        zIndex: 2,
                      }}>
                        <p style={{
                          margin: 0, fontSize: 12, fontWeight: 800,
                          color: GOLD, overflow: 'hidden',
                          textOverflow: 'ellipsis', letterSpacing: '0.05em',
                          textShadow: `0 1px 8px ${CRIMSON}88`,
                          lineHeight: 1.2, wordBreak: 'break-word',
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                        }}>
                          {title}
                        </p>
                        {!isDir && (
                          <p style={{ margin: '1px 0 0', fontSize: 10, color: `${GOLD}77`, fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {meta?.artist || 'Artista desconocido'}
                          </p>
                        )}
                      </div>

                      {isFocused && !isDir && (
                        <motion.button
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                          style={{
                            position: 'absolute', top: 8, right: 8, zIndex: 3,
                            width: 26, height: 26,
                            border: `1px solid ${GOLD}33`, background: `${CRIMSON}66`,
                            color: GOLD, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                            backdropFilter: 'blur(4px)',
                          }}>
                          <Edit3 size={10} />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  <div style={{
                    marginTop: 8, textAlign: 'center',
                    borderTop: `1px solid ${GOLD}15`,
                    paddingTop: 6, width: '90%', marginLeft: '5%',
                  }}>
                    <span style={{
                      fontSize: 9, color: `${GOLD}55`, fontStyle: 'italic',
                      fontFamily: 'Georgia, serif', letterSpacing: '0.04em',
                    }}>
                      <span style={{ fontSize: 7, marginRight: 3 }}>{glyphBot}</span>
                      {isDir ? '— C A R P E T A —' : (meta?.album ? meta.album.toUpperCase() : '— Á L B U M —')}
                      <span style={{ fontSize: 7, marginLeft: 3 }}>{glyphBot}</span>
                    </span>
                  </div>
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
              borderRadius: 4, background: 'var(--bg-card)', border: `1px solid ${GOLD}33`,
              boxShadow: `0 4px 24px ${CRIMSON}22`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: GOLD, fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `1px solid ${GOLD}22` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 700, background: `${CRIMSON}22`, border: `1px solid ${GOLD}22`, color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 700, background: `${CRIMSON}33`, border: `1px solid ${CRIMSON}55`, color: '#ff6b6b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: `${GOLD}66`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
