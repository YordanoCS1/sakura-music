import React, { useState, useMemo } from 'react';
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



const LETTERS = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function getLetter(name: string): string {
  const c = name.trim().toUpperCase()[0] || '#';
  return /[A-Z]/.test(c) ? c : '#';
}

export const LayoutIndex: React.FC<LibraryLayoutProps> = (props) => {
  const {
    filteredFiles, searchInput, onSearchChange,
    selectedFiles, loading, stats, getMeta, numeral,
    onFileClick, onFileContextMenu, onSelect, clearSelection,
    onDeleteFiles,
    onOpenEditor, setMetadataEditorFile,
    hoveredCard, onHover,
  } = props;

  const audioFiles = useMemo(() => filteredFiles.filter(f => !f.is_dir && f.is_audio), [filteredFiles]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredFiles>();
    for (const f of filteredFiles) {
      const meta = getMeta(f.path);
      const name = meta?.title || f.name.replace(/\.[^/.]+$/, '');
      const letter = getLetter(name);
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(f);
    }
    const result: { letter: string; files: typeof filteredFiles }[] = [];
    for (const l of LETTERS) {
      if (map.has(l) && map.get(l)!.length > 0) {
        result.push({ letter: l, files: map.get(l)! });
      }
    }
    return result;
  }, [filteredFiles, getMeta]);

  const [activeLetter, setActiveLetter] = useState<string | null>(null);

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
    <div style={{ width: '100%', padding: '24px 24px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ color: 'var(--text-heading)', fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: '-0.03em' }}>Biblioteca</h1>
          <p style={{ color: 'var(--text-label)', fontSize: 12, margin: '4px 0 0' }}>
            {numeral(stats.totalFiles)} archivos · {grouped.length} secciones
          </p>
        </div>
        <div style={{ position: 'relative', maxWidth: 220, width: '100%' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          <input value={searchInput} onChange={e => onSearchChange(e.target.value)} placeholder="Buscar…"
            style={{ width: '100%', height: 36, paddingLeft: 36, paddingRight: 12, borderRadius: 10, background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-input)', fontSize: 13, outline: 'none' }} />
        </div>
      </div>

      <div style={{
        display: 'flex', gap: 4, marginBottom: 24, overflowX: 'auto', paddingBottom: 4,
        scrollbarWidth: 'none', msOverflowStyle: 'none', position: 'sticky', top: 0, zIndex: 10,
      }}>
        {grouped.map(g => (
          <button key={g.letter} onClick={() => setActiveLetter(g.letter === activeLetter ? null : g.letter)}
            style={{
              minWidth: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: activeLetter === g.letter ? 'var(--accent-gradient)' : 'var(--bg-card-alt)',
              color: activeLetter === g.letter ? '#fff' : 'var(--text-body)',
              fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              transition: 'all 0.12s', flexShrink: 0,
            }}>
            {g.letter}
          </button>
        ))}
      </div>

      {grouped.map(group => {
        if (activeLetter && group.letter !== activeLetter) return null;
        return (
          <div key={group.letter} style={{ marginBottom: 32 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, paddingLeft: 2,
            }}>
              <h2 style={{ color: 'var(--text-heading)', fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: '-0.04em' }}>
                {group.letter}
              </h2>
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{group.files.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {group.files.map((file, idx) => {
                const meta = getMeta(file.path);
                const isHovered = hoveredCard === file.path;
                const selected = selectedFiles.has(file.path);
                const g = gradients[hashStr(file.path) % gradients.length];
                const title = meta?.title || file.name.replace(/\.[^/.]+$/, '');
                const artist = meta?.artist || '';
                const isDir = file.is_dir;

                return (
                  <motion.div
                    key={file.path}
                    layout
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.005 }}
                    onMouseEnter={() => onHover(file.path)}
                    onMouseLeave={() => onHover(null)}
                    onClick={() => onFileClick(file, isDir)}
                    onContextMenu={(e) => onFileContextMenu?.(file, e)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
                      padding: '6px 10px', borderRadius: 10,
                      background: selected ? 'var(--bg-accent-active)' : isHovered ? 'var(--bg-hover)' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7, overflow: 'hidden', flexShrink: 0,
                      background: g, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {meta?.cover ? (
                        <img src={meta.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : isDir ? (
                        <FolderOpen size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                      ) : (
                        <Music size={13} style={{ color: 'rgba(255,255,255,0.35)' }} />
                      )}
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); onSelect(file.path, e.shiftKey); }}
                      style={{
                        width: 16, height: 16, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: selected ? 'var(--accent-gradient)' : 'var(--bg-card-alt)',
                        border: selected ? 'none' : '1px solid var(--border-card)',
                      }}>
                      {selected && <Check size={8} strokeWidth={3} color="#fff" />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'var(--text-heading)', fontSize: 12, fontWeight: 500, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {isDir ? file.name : title}
                      </p>
                      {!isDir && artist && (
                        <p style={{ color: 'var(--text-label)', fontSize: 10, margin: '1px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{artist}</p>
                      )}
                    </div>
                    {!isDir && meta?.duration != null && (
                      <span style={{ color: 'var(--text-muted)', fontSize: 10, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
                        {Math.floor(meta.duration / 60)}:{String(meta.duration % 60).padStart(2, '0')}
                      </span>
                    )}
                    <AnimatePresence>
                      {isHovered && !isDir && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          onClick={e => { e.stopPropagation(); onOpenEditor(file); }}
                          style={{ padding: '3px 7px', borderRadius: 5, border: 'none', cursor: 'pointer', background: 'var(--bg-input)', color: 'var(--text-label)', fontSize: 9, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0 }}>
                          <Edit3 size={8} /> Editar
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

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
