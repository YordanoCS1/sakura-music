import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, Check, Trash2, Edit3, FolderOpen
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';

const gradients = [
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
  'linear-gradient(135deg, #4facfe, #00f2fe)',
  'linear-gradient(135deg, #43e97b, #38f9d7)',
  'linear-gradient(135deg, #fa709a, #fee140)',
  'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  'linear-gradient(135deg, #fccb90, #d57eeb)',
  'linear-gradient(135deg, #e0c3fc, #8ec5fc)',
];



export const LayoutFeed: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles,
    onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const audioFiles = useMemo(() => filteredFiles.filter(f => !f.is_dir && f.is_audio), [filteredFiles]);

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
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-card-alt)', border: 'var(--border-card)', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {searchInput ? <Search size={24} style={{ color: 'var(--text-dim)' }} /> : <Music size={24} style={{ color: 'var(--text-dim)' }} />}
        </div>
        <p style={{ color: 'var(--text-body)', fontSize: 15, fontWeight: 600, margin: 0 }}>{searchInput ? 'Sin resultados' : 'No hay archivos'}</p>
      </motion.div>
    );
  }

  return (
    <div style={{ width: '100%', padding: '24px 24px 80px', maxWidth: 640, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: 'var(--text-heading)', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>Biblioteca</h1>
        <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '4px 0 12px' }}>
          {numeral(stats.totalFiles)} canciones · {stats.totalSize} GB
        </p>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input value={searchInput} onChange={e => onSearchChange(e.target.value)} placeholder="Buscar…"
            style={{ width: '100%', height: 40, paddingLeft: 40, paddingRight: 14, borderRadius: 12, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filteredFiles.map((file, idx) => {
          const meta = getMeta(file.path);
          const isHovered = hoveredCard === file.path;
          const selected = selectedFiles.has(file.path);
          const g = gradients[hashStr(file.path) % gradients.length];
          const title = meta?.title || file.name.replace(/\.[^/.]+$/, '');
          const artist = meta?.artist || 'Artista desconocido';
          const isDir = file.is_dir;

          return (
            <motion.div
              key={file.path}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.015 }}
              onMouseEnter={() => onHover(file.path)}
              onMouseLeave={() => onHover(null)}
              onClick={() => onFileClick(file, isDir)}
              onContextMenu={(e) => onFileContextMenu?.(file, e)}
              style={{
                display: 'flex', gap: 14, cursor: 'pointer', padding: '10px 12px',
                borderRadius: 14,
                background: selected ? 'var(--bg-accent-active)' : isHovered ? 'var(--bg-hover)' : 'var(--bg-card)',
                border: 'var(--border-card)',
                transition: 'background 0.15s',
              }}
            >
              <div style={{
                width: 60, height: 60, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                background: g, position: 'relative',
              }}>
                {meta?.cover ? (
                  <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : isDir ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FolderOpen size={22} style={{ color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Music size={22} style={{ color: 'rgba(255,255,255,0.25)' }} />
                  </div>
                )}
                <div onClick={e => { e.stopPropagation(); onSelect(file.path, e.shiftKey); }}
                  style={{
                    position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 5, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: selected ? 'var(--accent-gradient)' : 'rgba(0,0,0,0.25)',
                    border: selected ? 'none' : '1px solid rgba(255,255,255,0.2)',
                    opacity: isHovered || selected ? 1 : 0,
                    transition: 'opacity 0.15s',
                  }}>
                  {selected && <Check size={9} strokeWidth={3} color="#fff" />}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-heading)', fontSize: 13, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {isDir ? file.name : title}
                </p>
                {!isDir && (
                  <p style={{ color: 'var(--text-label)', fontSize: 11, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {artist}
                    {meta?.duration != null && ` · ${Math.floor(meta.duration / 60)}:${String(meta.duration % 60).padStart(2, '0')}`}
                  </p>
                )}
              </div>
              <AnimatePresence>
                {isHovered && !isDir && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    onClick={e => { e.stopPropagation(); onOpenEditor(file); }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--bg-input)', color: 'var(--text-label)', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0, alignSelf: 'center' }}>
                    <Edit3 size={11} /> Editar
                  </motion.button>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
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
            }}
          >
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
