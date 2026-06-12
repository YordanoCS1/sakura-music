import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const INK = '#1a1a1a';
const PAPER = '#f0e8d8';
const CORD = '#c0392b';
const SEAL = '#c0392b';

const PAPER_TONES = ['#f5efe0', '#f0e8d8', '#ede5d0', '#f2eadc', '#e8e0cc', '#f0ecd8'];
const CORD_COLORS = ['#c0392b', '#8e44ad', '#d35400', '#2c3e50', '#7f8c8d', '#a08060'];

const BRUSH_STROKES = [
  'linear-gradient(160deg, transparent 30%, rgba(0,0,0,0.03) 31%, transparent 32%)',
  'linear-gradient(200deg, transparent 45%, rgba(0,0,0,0.02) 46%, transparent 47%)',
  'linear-gradient(120deg, transparent 20%, rgba(0,0,0,0.04) 21%, transparent 22%)',
  'linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.025) 51%, transparent 52%)',
];

export const LayoutErudito: React.FC<LibraryLayoutProps> = (props) => {
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
        <div style={{ width: 24, height: 24, border: '2px solid rgba(0,0,0,0.08)', borderTopColor: INK, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🖌️</div>
        <p style={{ color: INK, fontSize: 15, fontWeight: 700, margin: 0, fontFamily: 'Georgia, serif' }}>Pergaminos vacíos</p>
        <p style={{ color: `${INK}77`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Escribe música con tinta...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{
        padding: '14px 24px 10px', borderBottom: `1px solid ${INK}11`,
        background: `linear-gradient(180deg, var(--bg-card), transparent)`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              color: INK, fontSize: 20, fontWeight: 400, margin: 0,
              letterSpacing: '0.35em', fontFamily: 'Georgia, serif',
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 24, opacity: 0.35 }}>筆</span>
              ERUDITO
              <span style={{ fontSize: 24, opacity: 0.35 }}>墨</span>
            </h2>
            <p style={{ color: `${INK}66`, fontSize: 11, margin: '1px 0 0', fontStyle: 'italic' }}>
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

      <div style={{ flex: 1, overflow: 'auto', padding: '28px 28px', position: 'relative' }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            repeating-linear-gradient(0deg, transparent, transparent 24px, ${INK}04 24px, ${INK}04 25px)
          `,
          pointerEvents: 'none',
        }} />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 32, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const paper = PAPER_TONES[seed % PAPER_TONES.length];
            const cord = CORD_COLORS[seed % CORD_COLORS.length];
            const brush = BRUSH_STROKES[seed % BRUSH_STROKES.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const scrollW = 140;

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, duration: 0.6 }}
                whileHover={{ y: -3 }}
                onClick={() => {
                  setFocusedIdx(isFocused ? null : i);
                  onFileClick(file, isDir);
                }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '8px 0' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  {/* Red cord tie */}
                  <div style={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
                    <div style={{ width: 1, height: 6, background: cord, opacity: 0.5 }} />
                    <div style={{ width: 2, height: 10, background: cord, opacity: 0.7, borderRadius: '0 0 1px 1px' }} />
                    <div style={{ width: 1, height: 6, background: cord, opacity: 0.5 }} />
                  </div>

                  {/* Scroll paper */}
                  <div style={{
                    width: scrollW, position: 'relative',
                    background: paper,
                    boxShadow: selected
                      ? `0 0 0 2px ${INK}66, 0 8px 24px rgba(0,0,0,0.12)`
                      : isHovered
                      ? `0 0 0 1px ${INK}22, 0 6px 20px rgba(0,0,0,0.08)`
                      : '0 4px 12px rgba(0,0,0,0.04)',
                    transition: 'box-shadow 0.3s',
                    padding: 8,
                  }}>
                    {/* Ink wash texture */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: brush,
                      pointerEvents: 'none',
                    }} />

                    {/* Artwork area */}
                    <div style={{
                      width: '100%', aspectRatio: '1/1',
                      overflow: 'hidden', position: 'relative',
                      background: meta?.cover ? 'none' : `${INK}04`,
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

                      {/* Red seal */}
                      <div style={{
                        position: 'absolute', bottom: 4, right: 4,
                        width: 16, height: 16,
                        border: `1px solid ${cord}55`,
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 6, color: cord, opacity: 0.4,
                        fontFamily: 'Georgia, serif',
                        background: `${cord}08`,
                      }}>
                        印
                      </div>

                      {(isHovered || isFocused) && !isDir && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                          style={{
                            position: 'absolute', top: 2, right: 2, zIndex: 3,
                            width: 22, height: 22, borderRadius: '50%',
                            border: `1px solid ${INK}33`, background: `${INK}cc`,
                            color: PAPER, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                          }}>
                          <Edit3 size={9} />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Bottom cord */}
                  <div style={{
                    width: 2, height: 6,
                    background: cord, opacity: 0.5,
                    borderRadius: '0 0 1px 1px',
                  }} />

                  {/* Title tag */}
                  <div style={{ marginTop: 6, textAlign: 'center', maxWidth: scrollW + 16 }}>
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
              borderRadius: 2, background: 'var(--bg-card)',
              border: `1px solid ${INK}22`,
              boxShadow: `0 4px 24px ${INK}11`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: INK, fontSize: 12, fontWeight: 700, fontFamily: 'Georgia, serif' }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `${INK}22` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 1, fontSize: 11, fontWeight: 600, background: `${INK}11`, border: `1px solid ${INK}22`, color: INK, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Georgia, serif' }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 1, fontSize: 11, fontWeight: 600, background: `${CORD}11`, border: `1px solid ${CORD}22`, color: CORD, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'Georgia, serif' }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 1, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: `${INK}55`, cursor: 'pointer', fontFamily: 'Georgia, serif' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
