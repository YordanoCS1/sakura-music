import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, Trash2, Edit3, FolderOpen, Disc3, Pin
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const magnetColors = [
  '#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff',
  '#ff8fab', '#845ef7', '#ff922b', '#20c997',
];

const CARD_W = 160;
const CARD_H = 200;

interface NeveraCardProps {
  file: LibraryLayoutProps['filteredFiles'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  rotation: number;
  idx: number;
  selected: boolean;
  isHovered: boolean;
  onClick: () => void;
  onSelect: () => void;
  onOpenEditor: () => void;
  onHover: (path: string | null) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const NeveraCard: React.FC<NeveraCardProps> = React.memo(({
  file, meta, rotation, idx, selected, isHovered, onClick, onSelect, onOpenEditor, onHover, onContextMenu,
}) => {
  const isDir = file.is_dir;
  const mc = magnetColors[idx % magnetColors.length];
  const g = `linear-gradient(135deg, ${magnetColors[idx % magnetColors.length]}, ${magnetColors[(idx + 3) % magnetColors.length]})`;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, rotateZ: rotation - 5 }}
      animate={{ opacity: 1, scale: 1, rotateZ: rotation }}
      whileHover={{ scale: 1.04, rotateZ: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 18, delay: idx * 0.02 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
      style={{
        width: CARD_W,
        height: CARD_H,
        cursor: 'pointer',
        position: 'relative',
        background: 'var(--bg-card)',
        border: `2px solid ${selected ? 'var(--accent-glow-medium)' : 'var(--border-card)'}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: selected
          ? `0 4px 20px var(--accent-glow-soft)`
          : '0 3px 10px rgba(0,0,0,0.08)',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        transformStyle: 'preserve-3d',
      }}
    >
      <div style={{
        position: 'relative', width: '100%', height: CARD_H * 0.58,
        background: g, overflow: 'hidden',
      }}>
        {meta?.cover ? (
          <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isDir ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Disc3 size={32} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}

        <div style={{
          position: 'absolute', top: 6, right: 6, width: 14, height: 14,
          borderRadius: '50%', background: mc, display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 0 2px rgba(255,255,255,0.3)`,
        }}>
          <Pin size={8} color="#fff" style={{ transform: 'rotate(45deg)' }} />
        </div>
      </div>

      <div style={{ padding: '8px 10px 10px' }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''))}
        </p>
        {!isDir && (
          <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-label)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {meta?.artist || 'Artista desconocido'}
          </p>
        )}
      </div>

      <AnimatePresence>
        {isHovered && !isDir && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              display: 'flex', gap: 4, padding: 6,
              background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
            }}
          >
            <div onClick={e => { e.stopPropagation(); onSelect(); }}
              style={{
                width: 24, height: 24, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.2)', border: selected ? 'none' : '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {selected && <Music size={10} strokeWidth={3} color="#fff" />}
            </div>
            <div onClick={e => { e.stopPropagation(); onOpenEditor(); }}
              style={{
                width: 24, height: 24, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.15)', border: 'none',
              }}>
              <Edit3 size={10} color="#fff" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

export const LayoutNevera: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const fileRotations = useMemo(() => {
    return filteredFiles.map((f, i) => {
      const seed = hashStr(f.path);
      return (seed % 7) - 3;
    });
  }, [filteredFiles]);

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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80 }}>
      <div style={{
        padding: '20px 24px',
        background: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 8px)',
        borderBottom: '1px solid var(--border-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0 }}>Nevera Musical</h2>
            <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '2px 0 0' }}>
              {numeral(stats.totalFiles)} canciones · {stats.totalSize} GB
            </p>
          </div>
          <div style={{ position: 'relative', maxWidth: 240, width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
            <input value={searchInput} onChange={e => onSearchChange(e.target.value)}
              placeholder="Buscar…"
              style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 10, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Pin size={11} style={{ transform: 'rotate(45deg)' }} /> Imanes en la nevera — haz clic para reproducir
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px', display: 'flex', flexWrap: 'wrap', gap: 16, alignContent: 'flex-start', justifyContent: 'center' }}>
        {filteredFiles.map((file, idx) => (
          <NeveraCard
            key={file.path}
            file={file}
            meta={getMeta(file.path)}
            rotation={fileRotations[idx]}
            idx={idx}
            selected={selectedFiles.has(file.path)}
            isHovered={hoveredCard === file.path}
            onClick={() => onFileClick(file, file.is_dir)}
            onSelect={() => onSelect(file.path, false)}
            onOpenEditor={() => (onOpenEditor || setMetadataEditorFile)(file)}
            onHover={onHover}
            onContextMenu={(e) => onFileContextMenu?.(file, e)}
          />
        ))}
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
