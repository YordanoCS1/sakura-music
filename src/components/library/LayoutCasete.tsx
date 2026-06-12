import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Trash2, Edit3, FolderOpen, Disc3 } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const TAPE_COLORS = ['#2a1a3a', '#1a2a3a', '#3a2a1a', '#1a3a2a', '#3a1a2a'];

export const LayoutCasete: React.FC<LibraryLayoutProps> = (props) => {
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
      <div style={{ width: 24, height: 24, border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (filteredFiles.length === 0) return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '120px 20px' }}>
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>📼</div>
      <p style={{ color: '#ccc', fontSize: 15, fontWeight: 700, margin: 0 }}>Estante vacío</p>
      <p style={{ color: '#888', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>No hay casetes que reproducir...</p>
    </motion.div>
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80, background: 'var(--bg-app)' }}>
      <div style={{ padding: '14px 24px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, var(--bg-card), transparent)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: '0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ opacity: 0.4, fontSize: 12 }}>◻</span> CASETE
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 11, margin: '1px 0 0' }}>{numeral(stats.totalFiles)} cintas · {stats.totalSize} GB</p>
          </div>
          <div style={{ position: 'relative', maxWidth: 200, width: '100%' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)} placeholder="Buscar..." style={{ width: '100%', height: 32, paddingLeft: 32, paddingRight: 10, borderRadius: 6, background: 'var(--bg-input)', border: 'var(--border-input)', color: 'var(--text-input)', fontSize: 12, outline: 'none' }} />
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 20 }}>
          {filteredFiles.map((file, i) => {
            const meta = getMeta(file.path);
            const isDir = file.is_dir;
            const seed = hashStr(file.path);
            const isHovered = hoveredCard === file.path;
            const isFocused = focusedIdx === i;
            const selected = selectedFiles.has(file.path);
            const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
            const tapeColor = TAPE_COLORS[seed % TAPE_COLORS.length];

            return (
              <motion.div key={file.path} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.015, type: 'spring', stiffness: 150, damping: 20 }}
                whileHover={{ y: -3 }}
                onClick={() => { setFocusedIdx(isFocused ? null : i); onFileClick(file, isDir); }}
                onContextMenu={(e) => onFileContextMenu?.(file, e)}
                onMouseEnter={() => onHover(file.path)} onMouseLeave={() => onHover(null)}
                style={{ cursor: 'pointer' }}>
                {/* Cassette body */}
                <div style={{
                  width: '100%', aspectRatio: '1.3/1', borderRadius: 4,
                  background: tapeColor,
                  border: selected ? `1.5px solid var(--text-accent)` : `1px solid rgba(255,255,255,0.06)`,
                  boxShadow: isHovered ? `0 8px 24px rgba(0,0,0,0.3)` : `0 3px 10px rgba(0,0,0,0.15)`,
                  transition: 'box-shadow 0.3s, border-color 0.2s',
                  position: 'relative', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}>
                  {/* Top label area */}
                  <div style={{ flex: 1, margin: '8%', borderRadius: 2, overflow: 'hidden', position: 'relative', background: meta?.cover ? 'transparent' : 'rgba(0,0,0,0.2)' }}>
                    {meta?.cover ? (
                      <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {isDir ? <FolderOpen size={18} style={{ color: 'rgba(255,255,255,0.15)' }} /> : <Disc3 size={16} style={{ color: 'rgba(255,255,255,0.12)' }} />}
                      </div>
                    )}
                  </div>
                  {/* Bottom wheels */}
                  <div style={{ height: '22%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(0,0,0,0.15)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }} />
                    <div style={{ width: 4, height: 8, borderRadius: 1, background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ width: 10, height: 10, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)' }} />
                  </div>
                  {/* Edit */}
                  {(isHovered || isFocused) && !isDir && (
                    <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                      onClick={e => { e.stopPropagation(); (onOpenEditor || setMetadataEditorFile)(file); }}
                      style={{ position: 'absolute', bottom: 4, right: 4, zIndex: 3, width: 20, height: 20, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Edit3 size={8} />
                    </motion.button>
                  )}
                </div>
                <p style={{ margin: '5px 0 0', fontSize: 10, fontWeight: 700, color: 'var(--text-heading)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
                {!isDir && <p style={{ margin: 0, fontSize: 8, color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta?.artist || 'anónimo'}</p>}
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>{selectedFiles.size > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
          style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', zIndex: 50, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, background: 'var(--bg-card)', border: 'var(--border-card)', boxShadow: 'var(--shadow-lg)', backdropFilter: 'blur(16px)' }}>
          <span style={{ color: 'var(--text-heading)', fontSize: 12, fontWeight: 700 }}>{selectedFiles.size} seleccionados</span>
          <div style={{ width: 1, height: 16, background: 'var(--border-divider)' }} />
          <button onClick={() => { const first = filteredFiles.find(f => selectedFiles.has(f.path)); if (first) (onOpenEditor || setMetadataEditorFile)(first); }}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'var(--bg-hover)', border: 'var(--border-subtle)', color: 'var(--text-body)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Edit3 size={11} /> Editar</button>
          <button onClick={() => onDeleteFiles(Array.from(selectedFiles))}
            style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, background: 'rgba(180,60,60,0.08)', border: '1px solid rgba(180,60,60,0.15)', color: '#a04040', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Trash2 size={11} /> Eliminar</button>
          <button onClick={clearSelection} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancelar</button>
        </motion.div>
      )}</AnimatePresence>
    </div>
  );
};
