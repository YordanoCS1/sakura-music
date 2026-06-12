import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Edit3, FolderOpen, Disc3, Sliders } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const RACK_COLORS = ['#1a1a1a', '#0d0d0d', '#1a1010', '#10101a', '#1a1a10'];

export const LayoutEstudio: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const [focusedIdx, setFocusedIdx] = useState<number | null>(null);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '120px 0' }}>
      <div style={{ width: 24, height: 24, border: '2px solid rgba(0,200,255,0.15)', borderTopColor: '#00ccff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (filteredFiles.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>🎚️</div>
      <p style={{ color: '#ccc', fontSize: 15, fontWeight: 700, margin: 0 }}>Consola vacía</p>
      <p style={{ color: '#888', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>Conecta equipo al rack...</p>
    </motion.div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{ padding: '14px 24px 10px', borderBottom: '1px solid rgba(0,200,255,0.08)', background: 'linear-gradient(180deg, var(--bg-card), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: '#00ccff', fontSize: 16, fontWeight: 700, margin: 0, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sliders size={15} style={{ opacity: 0.5 }} /> ESTUDIO
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '1px 0 0' }}>{numeral(stats.totalFiles)} unidades · {stats.totalSize} GB</p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)} placeholder="Buscar..." style={{ width: '100%', height: 32, paddingLeft: 32, paddingRight: 10, borderRadius: 4, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(0,200,255,0.1)', color: '#00ccff', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '24px', background: 'repeating-linear-gradient(0deg, transparent, transparent 19px, rgba(0,200,255,0.03) 19px, rgba(0,200,255,0.03) 20px)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxWidth: 700, margin: '0 auto' }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const rackColor = RACK_COLORS[seed % RACK_COLORS.length];
            const leds = Array.from({ length: 3 }, (_, li) => ({ on: (seed + li) % 2 === 0 }));

            return (
              <motion.div key={file.path} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.008, type: 'spring', stiffness: 180, damping: 22 }}
                whileHover={{ x: 3 }}
                onClick={() => { setFocusedIdx(isFocused ? null : i); onFileClick(file, isDir); }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)} onMouseLeave={() => onHover(null)}
                style={{
                  cursor: 'pointer',
                  background: selected ? 'rgba(0,200,255,0.05)' : rackColor,
                  border: selected ? `1px solid #00ccff` : `1px solid rgba(0,200,255,0.06)`,
                  borderRadius: 2, padding: '6px 10px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  transition: 'background 0.2s, border-color 0.2s',
                  boxShadow: isHovered ? `inset 0 0 20px rgba(0,200,255,0.03)` : 'none',
                }}>
                {/* Rack handles */}
                <div style={{ width: 3, height: 30, borderRadius: 1, background: 'rgba(255,255,255,0.04)' }} />
                {/* Cover */}
                <div style={{ width: 30, height: 30, borderRadius: 2, overflow: 'hidden', flexShrink: 0, position: 'relative', background: meta?.cover ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                  {meta?.cover ? (
                    <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : isDir ? (
                    <FolderOpen size={14} style={{ position: 'absolute', inset: 0, margin: 'auto', color: 'rgba(0,200,255,0.15)' }} />
                  ) : (
                    <Disc3 size={13} style={{ position: 'absolute', inset: 0, margin: 'auto', color: 'rgba(0,200,255,0.12)' }} />
                  )}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#00ccff', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'monospace' }}>
                    {title.toUpperCase()}
                  </p>
                  {!isDir && <p style={{ margin: '1px 0 0', fontSize: 9, color: 'rgba(0,200,255,0.4)', fontFamily: 'monospace' }}>{meta?.artist || 'anónimo'}</p>}
                </div>
                {/* VU Meters */}
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 20 }}>
                  {leds.map((l, li) => (
                    <div key={li} style={{
                      width: 4, height: l.on ? 12 + (seed + li * 3) % 8 : 4, borderRadius: '1px 1px 0 0',
                      background: l.on ? '#00ccff' : 'rgba(0,200,255,0.05)',
                      transition: 'height 0.3s, background 0.3s',
                    }} />
                  ))}
                </div>
                {/* Edit */}
                {(isHovered || isFocused) && !isDir && (
                  <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                    onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                    style={{ width: 18, height: 18, borderRadius: 2, border: '1px solid rgba(0,200,255,0.2)', background: 'rgba(0,0,0,0.5)', color: '#00ccff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Edit3 size={8} />
                  </motion.button>
                )}
                {/* Rack handle right */}
                <div style={{ width: 3, height: 30, borderRadius: 1, background: 'rgba(255,255,255,0.04)' }} />
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{selectedFiles.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 4, background: '#0a0a0a', border: '1px solid rgba(0,200,255,0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.4)', backdropFilter: 'blur(16px)' }}>
          <span style={{ color: '#00ccff', fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
          <div style={{ width: 1, height: 16, background: 'rgba(0,200,255,0.15)' }} />
          <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
            style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(0,200,255,0.06)', border: '1px solid rgba(0,200,255,0.1)', color: '#00ccff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Edit3 size={11} /> Editar</button>
          <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
            style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 600, background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.15)', color: '#a04040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={11} /> Eliminar</button>
          <button onClick={clearSelection} style={{ padding: '4px 10px', borderRadius: 2, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: 'rgba(0,200,255,0.4)', cursor: 'pointer' }}>Cancelar</button>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
};
