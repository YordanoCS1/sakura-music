import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const IMPERIAL_RED = '#c0392b';
const GOLD = '#d4a017';
const AZURE = '#2a6a9a';

const FAN_COLORS = [
  ['#c0392b', '#d4a017', '#1a1a1a'],
  ['#b03a2e', '#c99a10', '#2a2a2a'],
  ['#d35400', '#e0a800', '#1a1a1a'],
  ['#a93226', '#c9940e', '#2a2a2a'],
  ['#c0392b', '#d4a017', '#1a3520'],
  ['#b8452a', '#d4a017', '#1a1a3a'],
];

const CLOUD_MOTIF = ['☁', '雲', '祥', '气'];

export const LayoutCiudadProhibida: React.FC<LibraryLayoutProps> = (props) => {
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
        <div style={{ width: 24, height: 24, border: '2px solid rgba(212,160,23,0.2)', borderTopColor: GOLD, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>👑</div>
        <p style={{ color: IMPERIAL_RED, fontSize: 15, fontWeight: 700, margin: 0 }}>Salón vacío</p>
        <p style={{ color: `${GOLD}77`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>El emperador espera tu música...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{
        padding: '0 24px 0', position: 'relative',
        background: 'linear-gradient(180deg, var(--bg-card), transparent)',
      }}>
        {/* Curved palace roof */}
        <div style={{
          position: 'relative', paddingTop: 6,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
          marginBottom: 8,
        }}>
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <div style={{ width: 20, height: 8, background: IMPERIAL_RED, borderRadius: '20px 0 0 0' }} />
            <div style={{ width: 12, height: 12, background: IMPERIAL_RED, borderRadius: '8px 8px 0 0' }} />
            <div style={{ width: 50, height: 6, background: IMPERIAL_RED }} />
            <div style={{ width: 12, height: 12, background: IMPERIAL_RED, borderRadius: '8px 8px 0 0' }} />
            <div style={{ width: 20, height: 8, background: IMPERIAL_RED, borderRadius: '0 20px 0 0' }} />
          </div>
          <div style={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <div style={{ width: 15, height: 6, background: IMPERIAL_RED, borderRadius: '15px 0 0 0' }} />
            <div style={{ width: 10, height: 10, background: IMPERIAL_RED, borderRadius: '6px 6px 0 0' }} />
            <div style={{ width: 30, height: 4, background: IMPERIAL_RED }} />
            <div style={{ width: 10, height: 10, background: IMPERIAL_RED, borderRadius: '6px 6px 0 0' }} />
            <div style={{ width: 15, height: 6, background: IMPERIAL_RED, borderRadius: '0 15px 0 0' }} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10 }}>
          <div>
            <h2 style={{
              color: GOLD, fontSize: 18, fontWeight: 700, margin: 0,
              letterSpacing: '0.15em', textShadow: `0 0 20px ${GOLD}22`,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: IMPERIAL_RED, fontSize: 14 }}>〒</span>
              CIUDAD PROHIBIDA
            </h2>
            <p style={{ color: `${GOLD}66`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic' }}>
              {numeral(stats.totalFiles)} tesoros · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${GOLD}55`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: `1px solid ${GOLD}33`,
                color: GOLD, fontSize: 12, outline: 'none', fontWeight: 500,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse at 50% 20%, ${GOLD}06, transparent 60%)`, pointerEvents: 'none' }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 28, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const fanColors = FAN_COLORS[seed % FAN_COLORS.length];
            const cloud = CLOUD_MOTIF[seed % CLOUD_MOTIF.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const fanW = 140;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 160, damping: 22 }}
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
                  {/* Imperial fan */}
                  <div style={{
                    width: fanW, position: 'relative',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                  }}>
                    {/* Fan top curve */}
                    <div style={{
                      width: '100%', height: fanW * 0.45,
                      background: `linear-gradient(180deg, ${fanColors[0]}, ${fanColors[1]})`,
                      clipPath: 'polygon(0% 100%, 50% 0%, 100% 100%)',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
                      position: 'relative',
                    }}>
                      {/* Fan ribs */}
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '25%', width: 1, background: `${GOLD}22`, transform: 'rotate(15deg)', transformOrigin: 'top' }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: `${GOLD}22` }} />
                      <div style={{ position: 'absolute', top: 0, bottom: 0, right: '25%', width: 1, background: `${GOLD}22`, transform: 'rotate(-15deg)', transformOrigin: 'top' }} />
                    </div>

                    {/* Album art area (fan face) */}
                    <div style={{
                      position: 'relative',
                      width: '100%', aspectRatio: '1/1',
                      marginTop: -fanW * 0.25,
                      background: `linear-gradient(160deg, ${fanColors[0]}, ${fanColors[2]})`,
                      boxShadow: selected
                        ? `0 0 0 2px ${GOLD}, 0 8px 24px rgba(0,0,0,0.15)`
                        : isHovered
                        ? `0 0 0 1px ${GOLD}66, 0 6px 20px rgba(0,0,0,0.1)`
                        : `0 4px 12px rgba(0,0,0,0.06)`,
                      transition: 'box-shadow 0.3s',
                      overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '80%', height: '80%', objectFit: 'cover', borderRadius: 4 }} />
                      ) : isDir ? (
                        <FolderOpen size={24} style={{ color: `${GOLD}55` }} />
                      ) : (
                        <Disc3 size={24} style={{ color: `${GOLD}44` }} />
                      )}

                      {/* Decorative cloud */}
                      <div style={{
                        position: 'absolute', bottom: 4, left: 4,
                        fontSize: 8, color: `${GOLD}33`,
                      }}>{cloud}</div>

                      {(isHovered || isFocused) && !isDir && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                          style={{
                            position: 'absolute', top: 4, right: 4, zIndex: 3,
                            width: 22, height: 22, borderRadius: '50%',
                            border: `1px solid ${GOLD}55`, background: `${IMPERIAL_RED}cc`,
                            color: GOLD, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                          }}>
                          <Edit3 size={9} />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Tassel */}
                  <div style={{
                    width: 2, height: 8, background: `${GOLD}55`, marginTop: 2,
                  }} />
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: IMPERIAL_RED, opacity: 0.6,
                  }} />

                  <p style={{
                    margin: '6px 0 0', fontSize: 11, fontWeight: 700,
                    color: GOLD, textAlign: 'center',
                    lineHeight: 1.3, maxWidth: fanW + 10,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden', textShadow: `0 0 10px ${GOLD}11`,
                  }}>
                    {title}
                  </p>

                  {!isDir && (
                    <p style={{
                      margin: '1px 0 0', fontSize: 9,
                      color: `${GOLD}55`, fontStyle: 'italic',
                      maxWidth: fanW + 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
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
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: `${IMPERIAL_RED}22`, border: `1px solid ${GOLD}33`, color: GOLD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
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
