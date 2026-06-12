import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Music, Search, Trash2, Edit3, FolderOpen, Disc3, Crosshair, Target
} from 'lucide-react';
import type { LibraryLayoutProps } from './LayoutTypes';
import { hashStr } from '../../utils/hash';



const COLORS = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

interface RadarItemProps {
  file: LibraryLayoutProps['filteredFiles'][0];
  meta: ReturnType<LibraryLayoutProps['getMeta']>;
  index: number;
  total: number;
  isCenter: boolean;
  isHovered: boolean;
  selected: boolean;
  onClick: () => void;
  onSelect: () => void;
  onOpenEditor: () => void;
  onHover: (path: string | null) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  formatDuration: (d: number | null) => string;
}

const RadarItem: React.FC<RadarItemProps> = React.memo(({
  file, meta, index, total, isCenter, isHovered, selected,
  onClick, onSelect, onOpenEditor, onHover, onContextMenu, formatDuration,
}) => {
  const isDir = file.is_dir;
  const color = COLORS[index % COLORS.length];
  const title = isDir ? file.name : (meta?.title || file.name.replace(/\.[^/.]+$/, ''));

  if (isCenter) {
    return (
      <motion.div
        layoutId={`radar-${file.path}`}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 24 }}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={() => onHover(file.path)}
        onMouseLeave={() => onHover(null)}
        style={{
          width: '100%', maxWidth: 400, margin: '0 auto', cursor: 'pointer',
        }}
      >
        <div style={{
          borderRadius: 20, overflow: 'hidden',
          background: 'var(--bg-card)', border: '2px solid var(--accent-glow-medium)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        }}>
          <div style={{
            position: 'relative', width: '100%', aspectRatio: '1/1',
            background: `radial-gradient(circle at 30% 30%, ${color}, ${color}44)`,
          }}>
            {meta?.cover ? (
              <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : isDir ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FolderOpen size={48} style={{ color: 'rgba(255,255,255,0.3)' }} />
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Disc3 size={48} style={{ color: 'rgba(255,255,255,0.25)' }} />
              </div>
            )}
            <div style={{
              position: 'absolute', top: 10, left: 10,
              background: 'rgba(0,0,0,0.5)', borderRadius: 8, padding: '4px 10px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <Target size={12} color="#fff" />
              <span style={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>En foco</span>
            </div>
            {!isDir && (
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={e => { e.stopPropagation(); onOpenEditor(); }}
                style={{
                  position: 'absolute', bottom: 12, right: 12, padding: '6px 14px', borderRadius: 8,
                  border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,0.4)', color: '#fff',
                  fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5,
                  backdropFilter: 'blur(4px)',
                }}>
                <Edit3 size={12} /> Editar
              </motion.button>
            )}
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 100%)',
              padding: '50px 16px 14px',
            }}>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {title}
              </p>
              {!isDir && (
                <p style={{ margin: '4px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.7)' }}>
                  {meta?.artist || 'Artista desconocido'} · {formatDuration(meta?.duration ?? null)}
                </p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.006 }}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={() => onHover(file.path)}
      onMouseLeave={() => onHover(null)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px', borderRadius: 12, cursor: 'pointer',
        background: selected ? 'var(--bg-accent-active)' : isHovered ? 'var(--bg-hover)' : 'transparent',
        border: `1px solid ${selected ? 'var(--accent-glow-medium)' : 'transparent'}`,
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
        background: `radial-gradient(circle at 30% 30%, ${color}, ${color}66)`,
        border: `2px solid ${isHovered ? color : 'var(--border-card)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'border-color 0.2s',
      }}>
        {meta?.cover ? (
          <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Music size={14} style={{ color: 'rgba(255,255,255,0.4)' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-heading)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {title}
        </p>
        {!isDir && (
          <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-dim)' }}>
            {meta?.artist || 'Artista desconocido'}
          </p>
        )}
      </div>
      {!isDir && (
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={e => { e.stopPropagation(); onOpenEditor(); }}
          style={{
            width: 26, height: 26, borderRadius: '50%', border: 'none', cursor: 'pointer',
            background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0,
          }}>
          <Edit3 size={10} style={{ color: 'var(--text-body)' }} />
        </motion.button>
      )}
    </motion.div>
  );
});

export const LayoutRadar: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles, onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover, formatDuration,
  } = props;

  const [centerIdx, setCenterIdx] = useState(0);

  const centerFile = filteredFiles[centerIdx];
  const centerMeta = centerFile ? getMeta(centerFile.path) : null;

  const orbitingItems = useMemo(() => {
    return filteredFiles.filter((_, i) => i !== centerIdx);
  }, [filteredFiles, centerIdx]);

  const handlePrev = useCallback(() => {
    setCenterIdx(i => Math.max(0, i - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCenterIdx(i => Math.min(filteredFiles.length - 1, i + 1));
  }, [filteredFiles.length]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') handlePrev();
    else if (e.key === 'ArrowRight') handleNext();
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', paddingBottom: 80 }} onKeyDown={handleKeyDown} tabIndex={0}>
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h2 style={{ color: 'var(--text-heading)', fontSize: 18, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Crosshair size={18} style={{ color: 'var(--accent-glow-medium)' }} /> Radar
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

      <div style={{ flex: 1, overflow: 'auto', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {centerFile && (
            <>
              <RadarItem
                file={centerFile}
                meta={centerMeta}
                index={centerIdx}
                total={filteredFiles.length}
                isCenter={true}
                isHovered={hoveredCard === centerFile.path}
                selected={selectedFiles.has(centerFile.path)}
                onClick={() => onFileClick(centerFile, centerFile.is_dir)}
                onSelect={() => onSelect(centerFile.path, false)}
                onOpenEditor={() => (onOpenEditor || setMetadataEditorFile)(centerFile)}
                onHover={onHover}
                onContextMenu={(e) => onFileContextMenu?.(centerFile, e)}
                formatDuration={formatDuration}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 12 }}>
                <button onClick={handlePrev} disabled={centerIdx === 0}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: centerIdx === 0 ? 'default' : 'pointer', opacity: centerIdx === 0 ? 0.3 : 1, fontSize: 11, fontWeight: 600 }}>
                  ← Anterior
                </button>
                <span style={{ color: 'var(--text-label)', fontSize: 12, fontWeight: 500 }}>
                  {centerIdx + 1} / {filteredFiles.length}
                </span>
                <button onClick={handleNext} disabled={centerIdx >= filteredFiles.length - 1}
                  style={{ padding: '4px 12px', borderRadius: 6, border: 'var(--border-card)', background: 'var(--bg-card)', color: 'var(--text-icon)', cursor: centerIdx >= filteredFiles.length - 1 ? 'default' : 'pointer', opacity: centerIdx >= filteredFiles.length - 1 ? 0.3 : 1, fontSize: 11, fontWeight: 600 }}>
                  Siguiente →
                </button>
              </div>
            </>
          )}
        </div>

        <div style={{
          position: 'relative', padding: '16px 0 8px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
          }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent-glow-medium)' }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Órbita ({orbitingItems.length})
            </span>
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 6,
          }}>
            {orbitingItems.map((file) => {
              const idx = filteredFiles.indexOf(file);
              return (
                <RadarItem
                  key={file.path}
                  file={file}
                  meta={getMeta(file.path)}
                  index={idx}
                  total={filteredFiles.length}
                  isCenter={false}
                  isHovered={hoveredCard === file.path}
                  selected={selectedFiles.has(file.path)}
                  onClick={() => setCenterIdx(idx)}
                  onSelect={() => onSelect(file.path, false)}
                  onOpenEditor={() => (onOpenEditor || setMetadataEditorFile)(file)}
                  onHover={onHover}
                  onContextMenu={(e) => onFileContextMenu?.(file, e)}
                  formatDuration={formatDuration}
                />
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
