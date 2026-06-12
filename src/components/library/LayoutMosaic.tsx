import React, { useState, useRef, useMemo, useCallback } from 'react';
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
  'linear-gradient(135deg, #667eea, #764ba2)',
  'linear-gradient(135deg, #f093fb, #f5576c)',
];



interface TileProps {
  file: LibraryLayoutProps['filteredFiles'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  selected: boolean;
  isHovered: boolean;
  size: 'large' | 'wide' | 'square';
  onSelect: (path: string, shift: boolean) => void;
  onOpenEditor: (f: LibraryLayoutProps['filteredFiles'][0]) => void;
  onHover: (path: string | null) => void;
  onFileClick: (file: LibraryLayoutProps['filteredFiles'][0], isDir: boolean) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const Tile = React.memo<TileProps>(({ file, meta, selected, isHovered, size, onSelect, onOpenEditor, onHover, onFileClick, onContextMenu }) => {
  const gradient = gradients[hashStr(file.path) % gradients.length];
  const title = meta?.title || file.name.replace(/\.[^/.]+$/, '');
  const artist = meta?.artist || 'Artista desconocido';

  const sizeMap = {
    large: { gridColumn: 'span 2', gridRow: 'span 2', aspectRatio: '1/1' as const },
    wide: { gridColumn: 'span 2', gridRow: 'span 1', aspectRatio: '2/1' as const },
    square: { gridColumn: 'span 1', gridRow: 'span 1', aspectRatio: '1/1' as const },
  };

  const dims = sizeMap[size];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onFileClick(file, file.is_dir)}
      onContextMenu={onContextMenu}
      style={{ cursor: 'pointer', position: 'relative', ...dims }}
    >
      <div style={{
        width: '100%', height: '100%', borderRadius: 14, overflow: 'hidden', position: 'relative',
        background: gradient,
        boxShadow: isHovered ? '0 8px 32px rgba(0,0,0,0.1)' : '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s',
      }}>
        {meta?.cover ? (
          <img src={meta.cover} alt="" style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transition: 'transform 0.3s', transform: isHovered ? 'scale(1.05)' : 'scale(1)',
          }} />
        ) : file.is_dir ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 4 }}>
            <FolderOpen size={size === 'large' ? 40 : 24} style={{ color: 'rgba(255,255,255,0.3)' }} />
            {size !== 'square' && <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Carpeta</span>}
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Music size={size === 'large' ? 40 : 24} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}

        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(0,0,0,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                backdropFilter: 'blur(2px)',
              }}
            >
              <div onClick={e => { e.stopPropagation(); onSelect(file.path, e.shiftKey); }}
                style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selected ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.2)', border: selected ? 'none' : '1px solid rgba(255,255,255,0.3)' }}>
                {selected && <Check size={13} strokeWidth={3} color="#fff" />}
              </div>
              <div onClick={e => { e.stopPropagation(); onOpenEditor(file); }}
                style={{ width: 28, height: 28, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', border: 'none', backdropFilter: 'blur(4px)' }}>
                <Edit3 size={12} color="#fff" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {size !== 'square' && (
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            padding: size === 'large' ? '30px 14px 12px' : '20px 10px 8px',
          }}>
          <p style={{ color: '#fff', fontSize: size === 'large' ? 13 : 11, fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</p>
          {!file.is_dir && (
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: size === 'large' ? 11 : 10, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</p>
          )}
          </div>
        )}
      </div>
      {size === 'square' && (
        <p style={{ color: 'var(--text-body)', fontSize: 10, fontWeight: 500, margin: '4px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', letterSpacing: '0.02em' }}>{title}</p>
      )}
    </motion.div>
  );
});

export const LayoutMosaic: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles,
    onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const audioFiles = useMemo(() => filteredFiles.filter(f => !f.is_dir && f.is_audio), [filteredFiles]);

  const tiles = useMemo(() => {
    return filteredFiles.map((f, i) => {
      let size: 'large' | 'wide' | 'square';
      if (i === 0) size = 'large';
      else if (i === 1 && filteredFiles.length > 3) size = 'wide';
      else size = 'square';
      return { file: f, size };
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
    <div style={{ width: '100%', padding: '20px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--text-heading)', fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>Biblioteca</h1>
          <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '4px 0 0' }}>
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
        gridAutoRows: 'minmax(130px, auto)',
        gap: 12,
      }}>
        {tiles.map(({ file, size }) => {
          if (size === 'large' || size === 'wide') {
            const colSpan = size === 'large' ? 'span 2' : 'span 2';
            return (
              <div key={file.path} style={{ gridColumn: colSpan, gridRow: size === 'large' ? 'span 2' : 'span 1' }}>
                <Tile
                  file={file}
                  meta={getMeta(file.path)}
                  selected={selectedFiles.has(file.path)}
                  isHovered={hoveredCard === file.path}
                  size={size}
                  onSelect={onSelect}
                  onOpenEditor={onOpenEditor || setMetadataEditorFile}
                  onHover={onHover}
                  onFileClick={onFileClick}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                />
              </div>
            );
          }
          return (
            <Tile
              key={file.path}
              file={file}
              meta={getMeta(file.path)}
              selected={selectedFiles.has(file.path)}
              isHovered={hoveredCard === file.path}
              size="square"
              onSelect={onSelect}
              onOpenEditor={onOpenEditor || setMetadataEditorFile}
              onHover={onHover}
              onFileClick={onFileClick}
              onContextMenu={(e) => onFileContextMenu?.(file, e)}
            />
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
