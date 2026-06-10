import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, CheckCircle, AlertCircle, Clock, Trash2, RefreshCw, ChevronDown, ChevronUp, ListMusic, Check, FolderOpen, Copy, ExternalLink } from 'lucide-react';
import { invoke, listen, showInFolder } from '../bridge';
import toast from 'react-hot-toast';
import { ContextMenu } from '../components/ContextMenu';
import { Skeleton, SkeletonLine } from '../components/Skeleton';

interface QueueItem {
  id: string; title: string; url: string; format: string; quality: string;
  status: 'pending' | 'downloading' | 'completed' | 'error'; progress: number; error_message: string | null;
  playlist_title: string | null; playlist_id: string | null; thumbnail: string | null; added_at: string; completed_at: string | null;
  subfolder: string | null;
}

const ProgressRing = ({ progress, size = 40, stroke = 4, color = 'oklch(var(--zen-sakura-base))' }: { progress: number; size?: number; stroke?: number; color?: string }) => {
  const radius = size / 2 - stroke;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
    </svg>
  );
};

interface GroupedQueue { playlists: { id: string; title: string; items: QueueItem[] }[]; singles: QueueItem[]; }

const itemAnim = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export const QueuePage: React.FC = () => {
  const [queue, setQueue] = useState<GroupedQueue>({ playlists: [], singles: [] });
  const [stats, setStats] = useState({ pending: 0, downloading: 0, completed: 0, error: 0, total: 0 });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'pending' | 'downloading' | 'completed' | 'error'>('all');
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; item: QueueItem } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQueue();
    const unsubProgress = listen('queue-progress', (data: { id: string; progress: number }) => updateItemProgress(data.id, data.progress));
    const unsubUpdated = listen('queue-updated', () => loadQueue());
    const unsubCompleted = listen('queue-item-completed', (data: { id: string; title: string }) => { toast.success(`${data.title} descargado`); loadQueue(); });
    const unsubError = listen('queue-item-error', (data: { id: string; error: string }) => { toast.error(`Error: ${data.error}`); loadQueue(); });
    return () => { unsubProgress(); unsubUpdated(); unsubCompleted(); unsubError(); };
  }, []);

  const loadQueue = async () => {
    setLoading(true);
    const data = await invoke<GroupedQueue>('queue_get_grouped');
    setQueue(data);
    const all = [...data.singles, ...data.playlists.flatMap(p => p.items)];
    setStats({ pending: all.filter(i => i.status === 'pending').length, downloading: all.filter(i => i.status === 'downloading').length, completed: all.filter(i => i.status === 'completed').length, error: all.filter(i => i.status === 'error').length, total: all.length });
    setLoading(false);
  };

  const updateItemProgress = (id: string, progress: number) => {
    setQueue(prev => {
      const nq = { ...prev };
      const si = nq.singles.findIndex(i => i.id === id); if (si !== -1) nq.singles[si].progress = progress;
      for (const pl of nq.playlists) { const ii = pl.items.findIndex(i => i.id === id); if (ii !== -1) pl.items[ii].progress = progress; }
      return nq;
    });
  };

  const handleRemove = async (id: string) => { await invoke('queue_remove', { id }); loadQueue(); };
  const handleRetry = async (id: string) => { await invoke('queue_retry', { id }); loadQueue(); toast.success('Reintentando descarga', { icon: '🔄' }); };
  const handleClearCompleted = async () => { const count = await invoke('queue_clear_completed'); loadQueue(); toast.success(`Completados eliminados`); };
  const toggleGroup = (key: string) => { const s = new Set(expandedGroups); s.has(key) ? s.delete(key) : s.add(key); setExpandedGroups(s); };

  const statusConfig: Record<string, { icon: React.ComponentType<{ size?: number; color?: string }>; color: string; label: string }> = {
    pending: { icon: Clock, color: '#eab308', label: 'Pendiente' },
    downloading: { icon: Download, color: '#3b82f6', label: 'Descargando' },
    completed: { icon: CheckCircle, color: '#22c55e', label: 'Completado' },
    error: { icon: AlertCircle, color: '#ef4444', label: 'Error' },
  };

  const filterTabs = ['all', 'pending', 'downloading', 'completed', 'error'] as const;
  const filterLabels: Record<string, string> = { all: 'Todos', pending: 'Pendientes', downloading: 'Descargando', completed: 'Completados', error: 'Errores' };

  const getGroupData = (items: QueueItem[]) => {
    const total = items.length;
    const completed = items.filter(i => i.status === 'completed').length;
    const failed = items.filter(i => i.status === 'error').length;
    const downloading = items.filter(i => i.status === 'downloading').length;
    const pending = items.filter(i => i.status === 'pending').length;
    const avgProgress = total > 0 ? items.reduce((sum, i) => sum + (i.status === 'completed' ? 100 : (i.progress || 0)), 0) / total : 0;
    return { total, completed, failed, downloading, pending, avgProgress };
  };

  const handleCtxAction = useCallback((action: string, item: QueueItem) => {
    if (action === 'copy-url') navigator.clipboard.writeText(item.url).then(() => toast.success('URL copiada'));
    else if (action === 'retry') handleRetry(item.id);
    else if (action === 'remove') handleRemove(item.id);
  }, []);

  const renderItem = (item: QueueItem) => {
    if (filter !== 'all' && item.status !== filter) return null;
    const cfg = statusConfig[item.status];
    return (
      <motion.div key={item.id} layout variants={itemAnim} initial="hidden" animate="show" exit={{ opacity: 0, x: -40 }}
        onContextMenu={e => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item }); }}
        style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: cfg.color }} />
          <span style={{ fontSize: '0.78rem', color: item.status === 'completed' ? 'var(--text-dim)' : 'var(--text-body)', textDecoration: item.status === 'completed' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {item.status === 'downloading' && <span style={{ fontSize: '0.7rem', color: 'oklch(var(--zen-sakura-base))', fontWeight: 700 }}>{Math.round(item.progress || 0)}%</span>}
          {item.status === 'completed' && <Check size={13} color="#22c55e" />}
          {item.status === 'error' && (
            <button onClick={() => handleRetry(item.id)} style={{ background: 'none', border: 'none', color: '#22c55e', cursor: 'pointer', padding: 4, display: 'flex' }} title="Reintentar">
              <RefreshCw size={13} />
            </button>
          )}
          {(item.status === 'pending' || item.status === 'error') && (
            <button onClick={() => handleRemove(item.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 4, display: 'flex' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  const renderGroup = (title: string, items: QueueItem[], isPlaylist: boolean) => {
    if (items.length === 0) return null;
    const g = getGroupData(items);
    const isExpanded = expandedGroups.has(title);

    return (
      <div key={title} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Group header */}
        <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', flex: 1 }} onClick={() => toggleGroup(title)}>
            <ProgressRing progress={g.avgProgress} size={40} color={g.failed > 0 ? '#ef4444' : 'oklch(var(--zen-sakura-base))'} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-body)', margin: 0 }}>{title}</p>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', margin: '2px 0 0 0' }}>
                {g.completed}/{g.total} completadas
                {g.failed > 0 && <span style={{ color: '#ef4444' }}> · {g.failed} fallidas</span>}
                {g.pending > 0 && <span style={{ color: 'var(--text-muted)' }}> · {g.pending} pendientes</span>}
                {g.downloading > 0 && <span style={{ color: '#3b82f6' }}> · {g.downloading} descargando</span>}
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {g.downloading > 0 && (
              <span style={{ padding: '4px 10px', background: 'oklch(var(--zen-sakura-base) / 0.12)', color: 'oklch(var(--zen-sakura-base))', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700 }}>
                {g.downloading} activas
              </span>
            )}
            <button onClick={() => toggleGroup(title)} style={{ padding: '6px 10px', borderRadius: 6, background: 'var(--bg-primary)', color: 'var(--text-muted)', border: 'var(--border-card)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.12s' }}>
              {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {isExpanded ? 'Ocultar' : `${items.length} canciones`}
            </button>
            <button onClick={() => items.forEach(item => handleRemove(item.id))} style={{ padding: '6px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.12s' }}>
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.04)', margin: '0 16px' }}>
          <div style={{ width: '100%', height: '100%', transform: `scaleX(${g.avgProgress / 100})`, transformOrigin: 'left', background: g.failed > 0 ? 'linear-gradient(90deg, oklch(var(--zen-sakura-base)), #ef4444)' : 'oklch(var(--zen-sakura-base))', transition: 'transform 0.3s ease', borderRadius: 2 }} />
        </div>

        {/* Expanded items */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
              <div style={{ padding: '8px 16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.filter(i => filter === 'all' || i.status === filter).map(renderItem)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Failed summary when collapsed */}
        {!isExpanded && g.failed > 0 && (
          <div style={{ margin: '0 16px 12px', padding: '8px 12px', background: 'rgba(239,68,68,0.08)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
            <p style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 600, marginBottom: 4 }}>❌ Fallidas ({g.failed})</p>
            {items.filter(i => i.status === 'error').map(item => (
              <div key={item.id} style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#ef4444', display: 'inline-block', flexShrink: 0 }} />
                {item.title}
                {item.error_message && <span style={{ color: 'var(--text-muted)' }}> - {item.error_message}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const statCards = [
    { label: 'Total', value: stats.total, color: 'var(--text-body)' },
    { label: 'Pendientes', value: stats.pending, color: '#eab308' },
    { label: 'Descargando', value: stats.downloading, color: '#3b82f6' },
    { label: 'Completados', value: stats.completed, color: '#22c55e' },
    { label: 'Errores', value: stats.error, color: '#ef4444' },
  ];

  return (
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="space-y-5">
      <motion.div variants={itemAnim} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)' }}>Cola de Descargas</h1>
          <p style={{ fontSize: '0.8rem', marginTop: 2, color: 'var(--text-label)' }}>Gestiona tus descargas en curso y completadas</p>
        </div>
        <button onClick={handleClearCompleted}
          style={{ padding: '8px 14px', borderRadius: 8, border: 'var(--border-card)', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Trash2 size={13} /> Limpiar
        </button>
      </motion.div>

      <motion.div variants={itemAnim} style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
        {statCards.map((s, i) => (
          <div key={i} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.65rem', marginTop: 2, color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </motion.div>

      <motion.div variants={itemAnim} style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {filterTabs.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 14px', borderRadius: 7, border: 'none', background: filter === f ? 'oklch(var(--zen-sakura-base) / 0.15)' : 'transparent', color: filter === f ? 'oklch(var(--zen-sakura-base))' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.12s' }}>
            {filterLabels[f]}
          </button>
        ))}
      </motion.div>

      <motion.div variants={itemAnim} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (
          <div className="space-y-2">
            <Skeleton width="30%" height={20} borderRadius={6} style={{ marginBottom: 12 }} />
            {[1,2,3].map(i => (
              <div key={i} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
                <Skeleton width={8} height={8} borderRadius="50%" />
                <Skeleton width={`${40 + i * 15}%`} height={14} borderRadius={4} />
                <Skeleton width="15%" height={12} borderRadius={4} style={{ marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {renderGroup('Descargas Individuales', queue.singles, false)}
            {queue.playlists.map(pl => renderGroup(pl.title, pl.items, true))}
            {queue.singles.length === 0 && queue.playlists.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-card)' }}>
                  <ListMusic size={22} style={{ color: 'var(--text-dim)' }} />
                </div>
                <p style={{ fontSize: '0.85rem', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Cola vacía</p>
                <p style={{ fontSize: '0.7rem', marginTop: 4, color: 'var(--text-dim)' }}>Agrega descargas desde la página de descargas</p>
              </div>
            )}
          </>
        )}
      </motion.div>

      {ctxMenu && (
        <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={[
          { label: 'Copiar URL', icon: <Copy size={13} />, onClick: () => handleCtxAction('copy-url', ctxMenu.item) },
          { label: 'Reintentar', icon: <RefreshCw size={13} />, onClick: () => handleCtxAction('retry', ctxMenu.item) },
          { label: 'Eliminar', icon: <Trash2 size={13} />, onClick: () => handleCtxAction('remove', ctxMenu.item), danger: true },
        ]} onClose={() => setCtxMenu(null)} />
      )}
    </motion.div>
  );
};
