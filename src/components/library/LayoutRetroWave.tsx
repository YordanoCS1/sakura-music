import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const SUNSET_COLORS = ['#ff007f', '#ff2a6d', '#d3278a', '#7b2d8e', '#1a0a2e', '#ff3c5f', '#b53789', '#ff1c7a'];

const ROAD_SIGNS = ['▶', '◆', '◈', '⬧', '▸', '◇'];

export const LayoutRetroWave: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover, formatDuration,
  } = props;

  const [scrollPos, setScrollPos] = useState(0);
  const itemsPerPage = 6;

  const maxScroll = Math.max(0, filteredFiles.length - itemsPerPage);
  const visibleFiles = useMemo(() => {
    return filteredFiles.slice(scrollPos, scrollPos + itemsPerPage);
  }, [filteredFiles, scrollPos]);

  const handlePrev = useCallback(() => setScrollPos(s => Math.max(0, s - 1)), []);
  const handleNext = useCallback(() => setScrollPos(s => Math.min(maxScroll, s + 1)), [maxScroll]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') handleNext();
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') handlePrev();
  }, [handlePrev, handleNext]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
        <div style={{ width: 24, height: 24, border: '2px solid var(--border-card)', borderTopColor: 'var(--accent-gradient)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-card-alt)', border: 'var(--border-card)', marginBottom: 16 }}>
          <Search size={24} style={{ color: 'var(--text-dim)' }} />
        </div>
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 600, margin: 0 }}>No hay archivos</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }} onKeyDown={handleKeyDown} tabIndex={0}>
      <div style={{
        padding: '20px 24px 0', position: 'relative', zIndex: 2,
        background: 'var(--bg-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: '#ff007f', fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '0.08em', textShadow: '0 0 20px rgba(255,0,127,0.2)' }}>
              ⟐ RETROWAVE
            </h2>
            <p style={{ color: 'rgba(255,0,127,0.3)', fontSize: 12, margin: '2px 0 0' }}>
              {numeral(stats.totalFiles)} canciones · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 240, width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar…"
              style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 4, background: 'var(--bg-input)', border: 'var(--border-card)', color: '#ff007f', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '20%', left: '50%', marginLeft: -100,
          width: 200, height: 80,
          background: 'linear-gradient(180deg, #ff007f 0%, #ff2a6d 30%, #d3278a 60%, #7b2d8e 100%)',
          borderRadius: '50% / 100% 100% 0 0',
          filter: 'blur(30px)',
          opacity: 0.15,
        }} />

        <div style={{
          position: 'absolute', top: '10%', left: '50%', marginLeft: -80,
          width: 160, height: 60,
          background: 'radial-gradient(ellipse, #ff6b35 0%, #ff007f 50%, transparent 80%)',
          borderRadius: '50%',
          filter: 'blur(40px)',
          opacity: 0.2,
        }} />

        <div style={{
          position: 'absolute', inset: 0,
          background: `
            repeating-linear-gradient(90deg, transparent 0px, transparent 50px, rgba(255,0,127,0.03) 50px, rgba(255,0,127,0.03) 51px),
            repeating-linear-gradient(0deg, transparent 0px, transparent 50px, rgba(255,0,127,0.03) 50px, rgba(255,0,127,0.03) 51px)
          `,
          maskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, black 30%, black 70%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }} />

        <div style={{
          position: 'absolute', bottom: 0, left: '50%', marginLeft: -1,
          width: 2,
          height: '80%',
          background: 'linear-gradient(180deg, transparent, rgba(255,0,127,0.05), transparent)',
          zIndex: 0,
        }} />

        <div style={{
          position: 'relative', zIndex: 1, height: '100%',
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 100px',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <button onClick={handlePrev} disabled={scrollPos === 0}
                style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid rgba(255,0,127,0.1)', background: 'rgba(0,0,0,0.2)', color: '#ff007f', cursor: scrollPos === 0 ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: scrollPos === 0 ? 0.2 : 0.5 }}>
                <ChevronLeft size={14} />
              </button>
              <span style={{ color: 'rgba(255,0,127,0.3)', fontSize: 11, fontFamily: 'monospace' }}>
                {scrollPos + 1}–{Math.min(scrollPos + itemsPerPage, filteredFiles.length)} / {filteredFiles.length}
              </span>
              <button onClick={handleNext} disabled={scrollPos >= maxScroll}
                style={{ width: 32, height: 32, borderRadius: 4, border: '1px solid rgba(255,0,127,0.1)', background: 'rgba(0,0,0,0.2)', color: '#ff007f', cursor: scrollPos >= maxScroll ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: scrollPos >= maxScroll ? 0.2 : 0.5 }}>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 16, perspective: 800,
          }}>
            {visibleFiles.map((file, i) => {
              const meta = getMeta(file.path);
              const isDir = file.is_dir;
              const seed = hashStr(file.path);
              const sunset = SUNSET_COLORS[seed % SUNSET_COLORS.length];
              const sign = ROAD_SIGNS[seed % ROAD_SIGNS.length];
              const isHovered = hoveredCard === file.path;
              const selected = selectedFiles.has(file.path);
              const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

              const depth = i;
              const scale = Math.max(0.6, 1 - depth * 0.08);
              const translateZ = -depth * 30;
              const opacity = Math.max(0.3, 1 - depth * 0.12);

              return (
                <motion.div
                  key={file.path}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity,
                    scale,
                    y: depth * 10,
                    z: translateZ,
                  }}
                  transition={{ type: 'spring', stiffness: 200, damping: 26, delay: i * 0.04 }}
                  onClick={() => onFileClick(file, isDir)}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                  onMouseEnter={() => onHover(file.path)}
                  onMouseLeave={() => onHover(null)}
                  style={{
                    cursor: 'pointer',
                    transformStyle: 'preserve-3d',
                    flexShrink: 0,
                  }}
                >
                  <div style={{
                    width: 160, borderRadius: 4, overflow: 'hidden',
                    border: `1px solid ${selected ? sunset : 'rgba(255,0,127,0.06)'}`,
                    background: 'var(--bg-card)',
                    boxShadow: isHovered
                      ? `0 0 30px ${sunset}22, 0 4px 20px rgba(0,0,0,0.2)`
                      : `0 2px 12px rgba(0,0,0,0.15)`,
                    transition: 'box-shadow 0.2s, border-color 0.2s',
                  }}>
                    <div style={{
                      height: 3,
                      background: `linear-gradient(90deg, ${sunset}, #7b2d8e)`,
                      opacity: 0.6,
                    }} />
                    <div style={{
                      position: 'relative', width: '100%', aspectRatio: '1/1', overflow: 'hidden',
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <FolderOpen size={28} style={{ color: 'rgba(255,0,127,0.1)' }} />
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Disc3 size={28} style={{ color: 'rgba(255,0,127,0.08)' }} />
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', top: 4, left: 4,
                        background: 'var(--bg-card)', padding: '1px 6px',
                        border: '1px solid rgba(255,0,127,0.06)',
                      }}>
                        <span style={{ color: sunset, fontSize: 7, fontFamily: 'monospace' }}>{sign}</span>
                      </div>
                      <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0,
                        background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
                        padding: '24px 8px 6px',
                      }}>
                        <p style={{ margin: 0, fontSize: 9, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 0 8px rgba(255,0,127,0.2)' }}>
                          {title}
                        </p>
                        {!isDir && (
                          <p style={{ margin: '1px 0 0', fontSize: 8, color: 'rgba(255,0,127,0.4)' }}>
                            {meta?.artist || 'Artista desconocido'}
                          </p>
                        )}
                      </div>
                      {isHovered && !isDir && (
                        <motion.button
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          whileHover={{ scale: 1.1 }}
                          onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                          style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, border: '1px solid rgba(255,0,127,0.1)', background: 'rgba(0,0,0,0.4)', color: sunset, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>
                          <Edit3 size={8} />
                        </motion.button>
                      )}
                    </div>
                    <div style={{
                      padding: '4px 8px', borderTop: '1px solid rgba(255,0,127,0.03)',
                      background: 'rgba(255,0,127,0.02)',
                      display: 'flex', justifyContent: 'flex-end',
                    }}>
                      <span style={{ fontSize: 7, color: 'rgba(255,0,127,0.2)', fontFamily: 'monospace' }}>
                        {isDir ? 'DIR' : (formatDuration(meta?.duration ?? null))}
                      </span>
                    </div>
                  </div>
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
              borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--accent-glow-medium)',
              boxShadow: '0 4px 24px var(--accent-glow-soft)', backdropFilter: 'blur(16px)',
            }}>
            <span style={{ color: 'var(--text-body)', fontSize: 12, fontWeight: 600 }}>{selectedFiles.size} seleccionados</span>
            <div style={{ width: 1, height: 16, background: 'var(--border-card)' }} />
            <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Edit3 size={11} /> Editar
            </button>
            <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Trash2 size={11} /> Eliminar
            </button>
            <button onClick={clearSelection}
              style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: 'var(--text-label)', cursor: 'pointer' }}>
              Cancelar
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
