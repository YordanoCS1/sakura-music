import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { invoke } from '../bridge';
import { Music, Download, Clock, HardDrive, Sparkles, ArrowRight, Headphones, History, RefreshCw, List, AlertCircle, CheckCircle } from 'lucide-react';

interface HomeStats {
  songCount: number;
  folderCount: number;
  totalSize: string;
  totalBytes: number;
  queueStats: { pending: number; downloading: number; completed: number; failed: number; total: number };
  history: DownloadHistoryItem[];
}

interface DownloadHistoryItem {
  title: string;
  url: string;
  format: string;
  quality: string;
  downloadedAt: string;
}

interface RecentSong {
  title: string;
  artist: string;
  cover?: string;
  path: string;
  playedAt: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemAnim = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `Hace ${days}d`;
  return new Date(iso).toLocaleDateString();
}

export const HomePage: React.FC = () => {
  const [stats, setStats] = useState<HomeStats | null>(null);
  const [recentSongs, setRecentSongs] = useState<RecentSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        invoke<HomeStats>('get_home_stats'),
        invoke<RecentSong[]>('get_recent_songs'),
      ]);
      setStats(s);
      setRecentSongs(r || []);
    } catch {}
    setLoading(false);
  };

  const statCards = stats ? [
    { icon: Music, label: 'Canciones', value: stats.songCount.toLocaleString(), color: '#a855f7' },
    { icon: List, label: 'En cola', value: stats.queueStats.total.toString(), color: '#0ea5e9', sub: stats.queueStats.downloading > 0 ? `${stats.queueStats.downloading} descargando` : undefined },
    { icon: Clock, label: 'Descargas hoy', value: stats.history.filter(h => new Date(h.downloadedAt).toDateString() === new Date().toDateString()).length.toString(), color: '#10b981' },
    { icon: HardDrive, label: 'Espacio usado', value: `${stats.totalSize} GB`, color: '#f97316' },
  ] : [];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {loading && !stats ? (
        <motion.div variants={itemAnim} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl p-4 animate-pulse" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
              <div className="w-9 h-9 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-6 w-16 rounded mb-2" style={{ background: 'rgba(255,255,255,0.04)' }} />
              <div className="h-3 w-20 rounded" style={{ background: 'rgba(255,255,255,0.03)' }} />
            </div>
          ))}
        </motion.div>
      ) : (
        <>
          <motion.div variants={itemAnim} className="relative overflow-hidden rounded-2xl p-7"
            style={{ background: 'linear-gradient(135deg, oklch(var(--zen-sakura-base) / 0.12), oklch(0.08 0.01 270))', border: '1px solid oklch(var(--zen-sakura-base) / 0.12)' }}>
            <div className="absolute top-0 right-0 w-72 h-72 rounded-full blur-3xl" style={{ background: 'oklch(var(--zen-sakura-base) / 0.06)', transform: 'translate(30%, -30%)' }} />
            <div className="relative z-10 flex items-center gap-4">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px oklch(var(--zen-sakura-base) / 0.25)' }}>
                <Sparkles size={24} color="white" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Bienvenido a Sakura Music</h1>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-label)' }}>
                  {stats ? `${stats.songCount} canciones en ${stats.folderCount} carpetas` : 'Descarga, organiza y administra tu música'}
                </p>
              </div>
              <button onClick={loadData} className="p-2 rounded-lg transition-all" style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--text-body)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                <RefreshCw size={14} />
              </button>
            </div>
          </motion.div>

          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {statCards.map((stat, idx) => (
              <motion.div key={idx} variants={itemAnim} className="relative overflow-hidden rounded-xl p-4"
                style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
                <div className="absolute inset-0 opacity-[0.03]" style={{ background: `linear-gradient(135deg, ${stat.color}, transparent)` }} />
                <div className="relative z-10">
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                    <stat.icon size={17} color={stat.color} />
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>{stat.value}</h3>
                  <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-label)' }}>{stat.label}</p>
                  {stat.sub && <p className="text-[9px]" style={{ color: 'var(--text-dim)' }}>{stat.sub}</p>}
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: Download, gradient: 'from-purple-500 to-pink-500', title: 'Descargar música', desc: 'Desde YouTube, SoundCloud y más plataformas', color: 'oklch(var(--zen-sakura-base))' },
              { icon: Headphones, gradient: 'from-pink-500 to-rose-500', title: 'Explorar biblioteca', desc: 'Organiza, edita metadatos y descubre tu colección', color: 'oklch(var(--zen-sakura-light))' },
            ].map((item, i) => (
              <motion.div key={i} variants={itemAnim} whileHover={{ y: -2 }}
                className="relative overflow-hidden rounded-xl p-5 cursor-pointer group"
                style={{ background: `linear-gradient(135deg, ${item.color}12, transparent)`, border: `1px solid ${item.color}20` }}>
                <div className="absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl" style={{ background: `${item.color}06`, transform: 'translate(20%, -20%)' }} />
                <div className="relative z-10 flex items-center gap-4">
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `linear-gradient(135deg, ${item.gradient})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 20px rgba(0,0,0,0.2)', transition: 'transform 0.2s' }}
                    className="group-hover:scale-110">
                    <item.icon size={22} color="white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-heading)' }}>
                      {item.title}
                      <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" style={{ color: 'var(--text-label)' }} />
                    </h3>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-label)' }}>{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Recently played */}
          {recentSongs.length > 0 && (
            <motion.div variants={itemAnim}>
              <div className="flex items-center gap-2 mb-3">
                <History size={14} style={{ color: 'var(--text-dim)' }} />
                <h3 className="text-xs font-semibold tracking-wider" style={{ color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reproducido recientemente</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {recentSongs.map((item, idx) => (
                  <motion.div key={idx} variants={itemAnim} whileHover={{ y: -3 }}
                    className="rounded-xl p-3 group cursor-pointer" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
                    <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 10, background: 'linear-gradient(135deg, rgba(168,85,247,0.08), rgba(236,72,153,0.04))', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, overflow: 'hidden' }}>
                      {item.cover ? <img src={item.cover} alt="" className="w-full h-full object-cover" /> : <Music size={22} style={{ color: 'rgba(255,255,255,0.08)' }} />}
                    </div>
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-body)' }}>{item.title}</p>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-label)' }}>{item.artist}</p>
                    <p className="text-[8px] mt-1" style={{ color: 'var(--text-dim)' }}>{timeAgo(item.playedAt)}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Download history */}
          {stats && stats.history.length > 0 && (
            <motion.div variants={itemAnim}>
              <div className="flex items-center gap-2 mb-3">
                <Download size={14} style={{ color: 'var(--text-dim)' }} />
                <h3 className="text-xs font-semibold tracking-wider" style={{ color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Descargas recientes</h3>
              </div>
              <div className="space-y-1.5">
                {stats.history.slice(0, 5).map((item, idx) => (
                  <motion.div key={idx} variants={itemAnim}
                    className="flex items-center gap-3 rounded-xl px-4 py-2.5" style={{ background: 'var(--bg-card)', border: 'var(--border-card)' }}>
                    <CheckCircle size={12} color="#22c55e" />
                    <span className="text-xs flex-1 min-w-0 truncate" style={{ color: 'var(--text-body)' }}>{item.title}</span>
                    <span className="text-[10px] uppercase" style={{ color: 'var(--text-dim)' }}>{item.format} · {item.quality}</span>
                    <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(item.downloadedAt)}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}
    </motion.div>
  );
};
