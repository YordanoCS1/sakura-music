import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const JADE_GREEN = '#2d5a3a';
const JADE_DEEP = '#1a3828';
const JADE_LIGHT = '#7ab88a';
const GOLD = '#c9a84c';
const CREAM = '#f5f0e8';

const JADE_VEINS = [
  'radial-gradient(ellipse at 30% 40%, rgba(122,184,138,0.06), transparent 60%)',
  'radial-gradient(ellipse at 70% 60%, rgba(122,184,138,0.04), transparent 50%)',
  'linear-gradient(135deg, transparent 40%, rgba(122,184,138,0.03) 40%, rgba(122,184,138,0.03) 42%, transparent 42%)',
  'radial-gradient(ellipse at 50% 20%, rgba(201,168,76,0.04), transparent 50%)',
];

export const LayoutJade: React.FC<LibraryLayoutProps> = (props) => {
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
        <div style={{ width: 28, height: 28, border: '2px solid rgba(122,184,138,0.15)', borderTopColor: JADE_LIGHT, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3, filter: 'drop-shadow(0 2px 8px rgba(122,184,138,0.2))' }}>🟢</div>
        <p style={{ color: JADE_GREEN, fontSize: 15, fontWeight: 700, margin: 0, letterSpacing: '0.12em' }}>MURO DE JADE VACÍO</p>
        <p style={{ color: `${JADE_GREEN}77`, fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Esperando ser tallado...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      {/* Header carved in jade */}
      <div style={{
        padding: '16px 24px 12px',
        background: `linear-gradient(180deg, ${JADE_DEEP}0c, transparent)`,
        borderBottom: `1px solid ${GOLD}22`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{
              color: JADE_GREEN, fontSize: 16, fontWeight: 600, margin: 0,
              letterSpacing: '0.2em', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 6, color: GOLD }}>━━━</span>
              TALLA DE JADE
              <span style={{ fontSize: 6, color: GOLD }}>━━━</span>
            </h2>
            <p style={{ color: `${JADE_GREEN}66`, fontSize: 10, margin: '2px 0 0', fontStyle: 'italic', letterSpacing: '0.05em' }}>
              {numeral(stats.totalFiles)} piezas talladas · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 180, width: '100%' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: `${JADE_GREEN}44`, pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar en jade..."
              style={{
                width: '100%', height: 30, paddingLeft: 30, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: `1px solid ${GOLD}33`,
                color: JADE_GREEN, fontSize: 11, outline: 'none', fontWeight: 400,
                letterSpacing: '0.05em',
              }}
            />
          </div>
        </div>
      </div>

      {/* Jade wall */}
      <div style={{ flex: 1, overflow: 'auto', padding: '24px 20px 40px', position: 'relative' }}>
        {/* Jade stone background with veining */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `
            radial-gradient(ellipse at 50% 30%, ${JADE_LIGHT}08, transparent 60%),
            repeating-linear-gradient(90deg, transparent 0px, transparent 120px, ${JADE_DEEP}04 120px, ${JADE_DEEP}04 122px, transparent 122px, transparent 240px),
            repeating-linear-gradient(0deg, transparent 0px, transparent 80px, ${JADE_DEEP}03 80px, ${JADE_DEEP}03 81px, transparent 81px, transparent 160px)
          `,
          pointerEvents: 'none',
        }} />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))',
          gap: '20px 16px',
          position: 'relative', zIndex: 1,
        }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const vein = JADE_VEINS[seed % JADE_VEINS.length];
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 150, damping: 20 }}
                whileHover={{ y: -2 }}
                onClick={() => {
                  setFocusedIdx(isFocused ? null : i);
                  onFileClick(file, isDir);
                }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{
                  cursor: 'pointer', position: 'relative',
                }}
              >
                {/* Carved alcove in jade wall */}
                <div style={{ position: 'relative' }}>
                  {/* Outer carved frame (recessed effect) */}
                  <div style={{
                    position: 'relative',
                    borderRadius: 6,
                    background: meta?.cover
                      ? 'transparent'
                      : `linear-gradient(180deg, ${JADE_DEEP}44, ${JADE_GREEN}33)`,
                    border: `1px solid ${GOLD}44`,
                    boxShadow: `
                      inset 0 2px 6px ${JADE_DEEP}33,
                      inset 0 -1px 3px ${JADE_DEEP}22,
                      0 2px 8px ${JADE_DEEP}15
                    `,
                    transition: 'box-shadow 0.3s, border-color 0.2s',
                    overflow: 'hidden',
                  }}>
                    {/* Inner carved surface */}
                    <div style={{
                      position: 'relative',
                      margin: 3,
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}>
                      {/* The cover / carved image */}
                      <div style={{
                        position: 'relative', width: '100%', paddingBottom: '100%',
                      }}>
                        {meta?.cover ? (
                          <img src={meta.cover} alt=""
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: vein,
                          }} />
                        )}

                        {/* Jade overlay — makes the cover look like it's carved into jade */}
                        {meta?.cover && (
                          <div style={{
                            position: 'absolute', inset: 0,
                            background: `linear-gradient(135deg, ${JADE_LIGHT}20, transparent 40%, ${JADE_GREEN}0d)`,
                            mixBlendMode: 'overlay',
                          }} />
                        )}

                        {/* Inner carved ring */}
                        <div style={{
                          position: 'absolute', inset: 4, borderRadius: 3,
                          border: `0.5px solid ${meta?.cover ? `${CREAM}33` : `${GOLD}15`}`,
                          pointerEvents: 'none',
                        }} />

                        {/* Carved cloud motifs at corners */}
                        <div style={{
                          position: 'absolute', top: -1, left: -1, width: 12, height: 12,
                          borderTop: `1.5px solid ${GOLD}55`,
                          borderLeft: `1.5px solid ${GOLD}55`,
                          borderRadius: '3px 0 0 0',
                        }} />
                        <div style={{
                          position: 'absolute', top: -1, right: -1, width: 12, height: 12,
                          borderTop: `1.5px solid ${GOLD}55`,
                          borderRight: `1.5px solid ${GOLD}55`,
                          borderRadius: '0 3px 0 0',
                        }} />
                        <div style={{
                          position: 'absolute', bottom: -1, left: -1, width: 12, height: 12,
                          borderBottom: `1.5px solid ${GOLD}55`,
                          borderLeft: `1.5px solid ${GOLD}55`,
                          borderRadius: '0 0 0 3px',
                        }} />
                        <div style={{
                          position: 'absolute', bottom: -1, right: -1, width: 12, height: 12,
                          borderBottom: `1.5px solid ${GOLD}55`,
                          borderRight: `1.5px solid ${GOLD}55`,
                          borderRadius: '0 0 3px 0',
                        }} />

                        {/* Folder / disc */}
                        {!meta?.cover && (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {isDir ? <FolderOpen size={26} style={{ color: `${JADE_GREEN}44` }} /> : <Disc3 size={24} style={{ color: `${JADE_GREEN}33` }} />}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Edit */}
                    {(isHovered || isFocused) && !isDir && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                        style={{
                          position: 'absolute', bottom: 8, right: 8, zIndex: 3,
                          width: 22, height: 22, borderRadius: '50%',
                          border: `1px solid ${GOLD}66`, background: `${JADE_DEEP}dd`,
                          color: CREAM, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}>
                        <Edit3 size={9} />
                      </motion.button>
                    )}

                    {/* Selection indicator */}
                    {selected && (
                      <div style={{
                        position: 'absolute', top: 8, left: 8, zIndex: 3,
                        width: 16, height: 16, borderRadius: '50%',
                        background: GOLD, display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        border: `1.5px solid ${JADE_DEEP}`,
                      }}>
                        <span style={{ color: JADE_DEEP, fontSize: 9, fontWeight: 700 }}>✓</span>
                      </div>
                    )}

                    {/* Hover glow */}
                    {isHovered && (
                      <div style={{
                        position: 'absolute', inset: -2, borderRadius: 8,
                        border: `1px solid ${GOLD}44`,
                        boxShadow: `0 0 20px ${JADE_LIGHT}33`,
                        pointerEvents: 'none',
                      }} />
                    )}
                  </div>

                  {/* Carved inscription below */}
                  <div style={{
                    marginTop: 8, padding: '0 4px',
                    borderTop: `0.5px solid ${GOLD}22`,
                    paddingTop: 6,
                  }}>
                    <p style={{
                      margin: 0, fontSize: 11, fontWeight: 600,
                      color: JADE_GREEN, lineHeight: 1.3,
                      letterSpacing: '0.03em',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textAlign: 'center',
                    }}>
                      {title}
                    </p>
                    {!isDir && (
                      <p style={{
                        margin: '2px 0 0', fontSize: 9,
                        color: `${JADE_GREEN}55`,
                        textAlign: 'center',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        fontStyle: 'italic',
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
              borderRadius: 6, background: `${JADE_DEEP}ee`,
              border: `1px solid ${GOLD}44`,
              boxShadow: `0 4px 24px ${JADE_DEEP}44`,
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: CREAM, fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: `${GOLD}44` }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: `${CREAM}15`, border: `1px solid ${GOLD}33`, color: CREAM, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 600, background: 'rgba(200,80,80,0.15)', border: '1px solid rgba(200,80,80,0.2)', color: '#e08080', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: `${CREAM}55`, cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
