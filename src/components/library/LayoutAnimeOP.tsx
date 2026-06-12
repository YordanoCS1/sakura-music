import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3, Sparkles } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const PANEL_BORDERS = ['2px', '3px', '4px', '1px', '5px', '2px'];
const ACCENT_COLORS = ['#ff4081', '#00e5ff', '#ffeb3b', '#76ff03', '#e040fb', '#ff6d00'];

const SPEED_LINE_ANGLES = [0, 15, -10, 25, -5, 20, -15, 10];

export const LayoutAnimeOP: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-card)', borderTopColor: '#ff4081', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <Sparkles size={40} style={{ color: '#ff4081', marginBottom: 12 }} />
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 700, margin: 0 }}>¡Sin episodios!</p>
        <p style={{ color: 'var(--text-label)', fontSize: 12, marginTop: 4 }}>Agrega música para empezar el opening...</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)', position: 'relative' }}>
      <div style={{
        padding: '14px 24px 10px', zIndex: 2, position: 'relative',
        borderBottom: '2px solid #ff4081',
        background: 'linear-gradient(180deg, var(--bg-card), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#ff4081', fontSize: 22, fontWeight: 900, margin: 0, letterSpacing: '0.04em', textShadow: '0 0 20px rgba(255,64,129,0.2)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} /> ANIME OPENING
            </h2>
            <p style={{ color: 'var(--text-label)', fontSize: 11, margin: '1px 0 0' }}>
              {numeral(stats.totalFiles)} temas · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar..."
              style={{
                width: '100%', height: 32, paddingLeft: 32, paddingRight: 10,
                borderRadius: 0, background: 'transparent',
                border: 'none', borderBottom: '2px solid var(--text-muted)',
                color: 'var(--text-input)', fontSize: 12, outline: 'none', fontWeight: 700,
              }}
            />
          </div>
        </div>
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '24px 24px',
        position: 'relative',
      }}>
        {filteredFiles.length > 0 && (
          <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
            {filteredFiles.slice(0, 6).map((_, i) => (
              <motion.div key={i}
                animate={{ opacity: [0, 0.03, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                style={{
                  position: 'absolute', top: `${10 + i * 15}%`, left: 0, right: 0, height: 1,
                  background: `linear-gradient(90deg, transparent, ${ACCENT_COLORS[i]}44, transparent)`,
                  transform: `rotate(${SPEED_LINE_ANGLES[i]}deg)`,
                }}
              />
            ))}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 24, position: 'relative', zIndex: 1 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const borderW = PANEL_BORDERS[seed % PANEL_BORDERS.length];
            const accent = ACCENT_COLORS[seed % ACCENT_COLORS.length];
            const isHovered = hoveredCard === file.path;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

            return (
              <motion.div
                key={file.path}
                layout
                initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.025, type: 'spring', stiffness: 200, damping: 22 }}
                whileHover={{ scale: 1.03 }}
                onClick={() => onFileClick(file, isDir)}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)}
                onMouseLeave={() => onHover(null)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div style={{
                  background: 'var(--bg-card)',
                  border: `${borderW} solid ${selected ? accent : `${accent}33`}`,
                  boxShadow: isHovered ? `0 0 30px ${accent}22, 0 4px 20px rgba(0,0,0,0.15)` : `0 2px 10px rgba(0,0,0,0.08)`,
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: `linear-gradient(90deg, ${accent}, var(--bg-app))`,
                    zIndex: 2,
                  }} />

                  <div style={{ position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                    {meta?.cover ? (
                      <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : isDir ? (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}08` }}>
                        <FolderOpen size={28} style={{ color: `${accent}55` }} />
                      </div>
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}08` }}>
                        <Disc3 size={28} style={{ color: `${accent}44` }} />
                      </div>
                    )}

                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        style={{
                          position: 'absolute', inset: 0,
                          background: `linear-gradient(135deg, ${accent}11, transparent 40%)`,
                          pointerEvents: 'none',
                        }}
                      />
                    )}

                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      padding: '32px 10px 8px',
                      background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
                    }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 1px 8px rgba(0,0,0,0.5)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.2 }}>
                        {title}
                      </p>
                      {!isDir && (
                        <p style={{ margin: '1px 0 0', fontSize: 9, color: `${accent}aa`, fontWeight: 600 }}>
                          {meta?.artist || 'Artista desconocido'}
                        </p>
                      )}
                    </div>

                    {(isHovered) && !isDir && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                        style={{
                          position: 'absolute', top: 6, right: 6, zIndex: 3,
                          width: 24, height: 24, borderRadius: '50%',
                          border: `1px solid ${accent}55`, background: 'rgba(0,0,0,0.5)',
                          color: accent, cursor: 'pointer', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(4px)',
                        }}>
                        <Edit3 size={10} />
                      </motion.button>
                    )}
                  </div>

                  <div style={{
                    padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: `${accent}06`,
                    borderTop: `1px solid ${accent}11`,
                  }}>
                    <span style={{ fontSize: 8, color: `${accent}88`, fontWeight: 700, fontFamily: 'monospace' }}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 8, color: `${accent}66` }}>
                      {isDir ? '📁' : '🎵'}
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
              borderRadius: 4, background: 'var(--bg-card)',
              border: '1px solid #ff408144',
              boxShadow: '0 4px 24px rgba(255,64,129,0.15)',
              backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: '#ff4081', fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: 'rgba(255,64,129,0.2)' }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 700, background: 'rgba(255,64,129,0.1)', border: '1px solid rgba(255,64,129,0.2)', color: '#ff4081', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 700, background: 'rgba(255,50,50,0.1)', border: '1px solid rgba(255,50,50,0.2)', color: '#ff5252', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
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
