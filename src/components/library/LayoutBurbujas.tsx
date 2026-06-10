import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, Trash2, Edit3, FolderOpen, Disc3
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const GRADIENTS = [
  ['#667eea', '#764ba2'],
  ['#f093fb', '#f5576c'],
  ['#4facfe', '#00f2fe'],
  ['#43e97b', '#38f9d7'],
  ['#fa709a', '#fee140'],
  ['#a18cd1', '#fbc2eb'],
  ['#fccb90', '#d57eeb'],
  ['#e0c3fc', '#8ec5fc'],
  ['#f43f5e', '#e11d48'],
  ['#3b82f6', '#1d4ed8'],
  ['#10b981', '#059669'],
  ['#f59e0b', '#d97706'],
  ['#6366f1', '#4f46e5'],
  ['#d946ef', '#a21caf'],
];

const SHADOW_COLORS = [
  '#667eea44', '#f093fb44', '#4facfe44', '#43e97b44',
  '#fa709a44', '#a18cd144', '#fccb9044', '#e0c3fc44',
];

interface BubbleCardProps {
  file: LibraryLayoutProps['filteredFiles'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  index: number;
  total: number;
  isHovered: boolean;
  selected: boolean;
  onClick: () => void;
  onSelect: () => void;
  onOpenEditor: () => void;
  onHover: (path: string | null) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const BubbleCard: React.FC<BubbleCardProps> = React.memo(({
  file, meta, index, total, isHovered, selected, onClick, onSelect, onOpenEditor, onHover, onContextMenu,
}) => {
  const isDir = file.is_dir;
  const g = GRADIENTS[hashStr(file.path) % GRADIENTS.length];
  const sc = SHADOW_COLORS[hashStr(file.path) % SHADOW_COLORS.length];
  const size = 80 + (hashStr(file.path + 'sz') % 70);
  const hasCover = !!meta?.cover;
  const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

  const floatY = (hashStr(file.path + 'fy') % 4) - 2;
  const floatDur = 4 + (hashStr(file.path + 'fd') % 3);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, floatY, 0],
      }}
      transition={{
        type: 'spring', stiffness: 200, damping: 20, delay: index * 0.008,
        y: { duration: floatDur, repeat: Infinity, ease: 'easeInOut' },
      }}
      whileHover={{
        scale: 1.08,
        zIndex: 100,
        transition: { type: 'spring', stiffness: 300, damping: 15 },
      }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
      style={{
        width: size,
        cursor: 'pointer',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        position: 'relative',
        background: hasCover ? undefined : `radial-gradient(circle at 35% 35%, ${g[0]}, ${g[1]})`,
        boxShadow: selected
          ? `0 0 0 3px var(--accent-glow-medium), 0 8px 32px rgba(0,0,0,0.18)`
          : isHovered
            ? `0 0 0 3px ${g[0]}66, 0 12px 40px ${sc}`
            : `0 4px 20px ${sc}`,
        transition: 'box-shadow 0.25s',
        border: selected ? 'none' : '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {hasCover ? (
          <img src={meta!.cover!} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isDir ? (
          <FolderOpen size={size * 0.28} style={{ color: 'rgba(255,255,255,0.35)' }} />
        ) : (
          <Disc3 size={size * 0.3} style={{ color: 'rgba(255,255,255,0.2)' }} />
        )}

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '45%',
          background: 'linear-gradient(to top, rgba(0,0,0,0.65) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />

        <p style={{
          position: 'absolute', bottom: 6, left: 8, right: 8,
          margin: 0, fontSize: 9, fontWeight: 700, color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.6)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          letterSpacing: '0.01em', textAlign: 'center',
          pointerEvents: 'none',
          transition: 'opacity 0.2s',
          opacity: isHovered ? 0.5 : 1,
        }}>
          {title}
        </p>

        {isHovered && !isDir && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              backdropFilter: 'blur(3px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <motion.div
              whileHover={{ scale: 1.15 }}
              onClick={e => { e.stopPropagation(); onSelect(); }}
              style={{
                width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.2)',
                border: selected ? 'none' : '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {selected && <Music size={11} strokeWidth={3} color="#fff" />}
            </motion.div>
            <motion.div
              whileHover={{ scale: 1.15 }}
              onClick={e => { e.stopPropagation(); onOpenEditor(); }}
              style={{
                width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.15)', border: 'none',
              }}>
              <Edit3 size={11} color="#fff" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export const LayoutBurbujas: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const aSeed = hashStr(a.path);
      const bSeed = hashStr(b.path);
      return aSeed - bSeed;
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
      <div style={{ padding: '20px 24px 0', position: 'relative', zIndex: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'inline-flex', width: 22, height: 22, borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, #667eea, #764ba2)',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <Disc3 size={12} color="rgba(255,255,255,0.6)" />
              </span>
              Burbujas
            </h2>
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
      </div>

      <div style={{
        flex: 1, overflow: 'auto', padding: '20px 24px',
        position: 'relative',
      }}>
        <div style={{
          position: 'sticky', top: 0, left: 0, right: 0, height: 120,
          background: 'radial-gradient(ellipse at 50% 0%, var(--accent-glow-soft) 0%, transparent 70%)',
          opacity: 0.15, pointerEvents: 'none', zIndex: 0,
          marginTop: -60,
        }} />
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 16, alignContent: 'flex-start',
          justifyContent: 'center', alignItems: 'flex-start', position: 'relative', zIndex: 1,
          minHeight: 200,
        }}>
          {sortedFiles.map((file, i) => (
            <BubbleCard
              key={file.path}
              file={file}
              meta={getMeta(file.path)}
              index={i}
              total={sortedFiles.length}
              isHovered={hoveredCard === file.path}
              selected={selectedFiles.has(file.path)}
              onClick={() => onFileClick(file, file.is_dir)}
              onSelect={() => onSelect(file.path, false)}
              onOpenEditor={() => (onOpenEditor || setMetadataEditorFile)(file)}
              onHover={onHover}
              onContextMenu={(e) => onFileContextMenu?.(file, e)}
            />
          ))}
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
