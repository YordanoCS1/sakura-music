import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Search, Trash2, Edit3, FolderOpen, Disc3, Waves } from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) { h = ((h << 5) - h) + s.charCodeAt(i); h |= 0; }
  return Math.abs(h);
}

const WAVE_COLORS = [
  '#f43f5e', '#3b82f6', '#10b981', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#14b8a6', '#6366f1', '#d946ef',
];

const BAR_MIN_WIDTH = 60;
const BAR_GAP = 6;
const BAR_HEIGHT_MIN = 60;
const BAR_HEIGHT_MAX = 220;

interface WaveBarProps {
  file: LibraryLayoutProps['filteredFiles'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  index: number;
  height: number;
  isHovered: boolean;
  selected: boolean;
  onClick: () => void;
  onSelect: () => void;
  onOpenEditor: () => void;
  onHover: (path: string | null) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
}

const WaveBar: React.FC<WaveBarProps> = React.memo(({
  file, meta, index, height, isHovered, selected, onClick, onSelect, onOpenEditor, onHover, onContextMenu,
}) => {
  const isDir = file.is_dir;
  const color = WAVE_COLORS[index % WAVE_COLORS.length];
  const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));
  const artist = meta?.artist || '';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 22, delay: index * 0.008 }}
      whileHover={{ scale: 1.05, zIndex: 10 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer',
        width: BAR_MIN_WIDTH, flexShrink: 0, gap: 6,
      }}
    >
      <div
        style={{
          width: '100%',
          height,
          borderRadius: 8,
          overflow: 'hidden',
          position: 'relative',
          background: meta?.cover ? undefined : `linear-gradient(180deg, ${color}, ${color}44)`,
          boxShadow: isHovered
            ? `0 0 0 2px ${color}, 0 8px 24px rgba(0,0,0,0.12)`
            : selected
              ? '0 0 0 2px var(--accent-glow-medium)'
              : '0 2px 8px rgba(0,0,0,0.06)',
          transition: 'box-shadow 0.2s',
        }}
      >
        {meta?.cover ? (
          <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : isDir ? (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderOpen size={18} style={{ color: 'rgba(255,255,255,0.3)' }} />
          </div>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Disc3 size={18} style={{ color: 'rgba(255,255,255,0.25)' }} />
          </div>
        )}

        {isHovered && !isDir && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
          }}>
            <div onClick={e => { e.stopPropagation(); onSelect(); }}
              style={{
                width: 20, height: 20, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: selected ? color : 'rgba(255,255,255,0.2)', border: selected ? 'none' : '1px solid rgba(255,255,255,0.3)',
              }}>
              {selected && <Music size={8} strokeWidth={3} color="#fff" />}
            </div>
            <div onClick={e => { e.stopPropagation(); onOpenEditor(); }}
              style={{
                width: 20, height: 20, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.15)', border: 'none',
              }}>
              <Edit3 size={8} color="#fff" />
            </div>
          </div>
        )}
      </div>

      <div style={{ width: '100%', textAlign: 'center' }}>
        <p style={{
          margin: 0, fontSize: 9, fontWeight: 600, color: isHovered ? 'var(--text-heading)' : 'var(--text-body)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          transition: 'color 0.15s',
        }}>
          {title}
        </p>
        {!isDir && artist && (
          <p style={{ margin: '1px 0 0', fontSize: 8, color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {artist}
          </p>
        )}
      </div>
    </motion.div>
  );
});

export const LayoutPiano: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const waveItems = useMemo(() => {
    return filteredFiles.map((file, i) => {
      const seed = hashStr(file.path + 'wave');
      const h = BAR_HEIGHT_MIN + (seed % (BAR_HEIGHT_MAX - BAR_HEIGHT_MIN));
      return { file, height: h };
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
        padding: '20px 24px 0',
        background: 'linear-gradient(180deg, var(--bg-card) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Waves size={18} style={{ color: 'var(--accent-glow-medium)' }} /> Oleaje
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
        display: 'flex', alignItems: 'flex-end', gap: BAR_GAP,
        flexWrap: 'nowrap', justifyContent: 'center',
      }}>
        {waveItems.map(({ file, height }, i) => (
          <WaveBar
            key={file.path}
            file={file}
            meta={getMeta(file.path)}
            index={i}
            height={height}
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
