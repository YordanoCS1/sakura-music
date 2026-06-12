import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Youtube, Clock, User, Eye, Download, TrendingUp, Loader2, Check } from 'lucide-react';
import { invoke, musicDir } from '../bridge';
import toast from 'react-hot-toast';
import { formatDuration } from '../utils/format';

interface SearchResult {
  id: string; title: string; uploader: string; duration: number | null; thumbnail: string | null; url: string; view_count?: number; uploaded_date?: string;
}

const itemAnim = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export const SearchPage: React.FC<{ onNavigate?: (page: string) => void }> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [trending, setTrending] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

  useEffect(() => { loadTrending(); }, []);

  const loadTrending = async () => { try { setTrending(await invoke<SearchResult[]>('get_trending')); } catch {} };
  const handleSearch = async () => {
    if (!query.trim()) return; setLoading(true);
    try { setResults(await invoke<SearchResult[]>('search_youtube', { query, limit: 30 })); } catch { toast.error('Error al buscar'); } finally { setLoading(false); }
  };
  const handleKeyPress = (e: React.KeyboardEvent) => { if (e.key === 'Enter') handleSearch(); };
  const fmtViews = (v?: number) => v ? v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v}` : '';

  const handlePlaySong = (result: SearchResult) => {
    localStorage.setItem('pendingUrl', result.url); localStorage.setItem('pendingTitle', result.title);
    window.dispatchEvent(new CustomEvent('url-ready', { detail: result.url }));
    toast.success('URL lista para descargar');
  };

  const handleQuickDownload = async (result: SearchResult) => {
    setDownloadingId(result.id);
    try {
      const downloadPath = localStorage.getItem('downloadPath') || musicDir.replace(/\\/g, '/') + '/Sakura Music';
      const quality = localStorage.getItem('defaultQuality') || 'audio_mp3_320';
      const format = localStorage.getItem('defaultFormat') || 'mp3';
      const fmt = format === 'video' ? 'video_best' : quality;
      await invoke('queue_add', {
        title: result.title,
        url: result.url,
        format: fmt,
        quality: quality,
        download_path: downloadPath,
        thumbnail: result.thumbnail,
        cookie_browser: localStorage.getItem('cookieBrowser') || 'none',
        embed_cover: true
      });
      setDownloadedIds(prev => new Set(prev).add(result.id));
      toast.success(`"${result.title}" agregado a la cola`);
    } catch { toast.error('Error al iniciar descarga'); }
    finally { setDownloadingId(null); }
  };

  return (
    <div className="space-y-6">
      <motion.div variants={itemAnim} initial="hidden" animate="show">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-heading)' }}>Explorar</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-label)' }}>Busca música, videos y playlists para descargar</p>
      </motion.div>

      <motion.div variants={itemAnim} initial="hidden" animate="show" className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-dim)' }} />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleKeyPress}
            placeholder="Buscar canciones, artistas o videos..."
            style={{ width: '100%', padding: '10px 14px 10px 38px', borderRadius: 10, fontSize: '0.85rem', outline: 'none', background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.8)', transition: 'border 0.2s, box-shadow 0.2s' }}
            onFocus={e => { e.target.style.borderColor = 'oklch(var(--zen-sakura-base) / 0.4)'; e.target.style.boxShadow = '0 0 0 3px oklch(var(--zen-sakura-base) / 0.08)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--bg-hover)'; e.target.style.boxShadow = 'none'; }} autoFocus />
        </div>
        <button onClick={handleSearch} disabled={loading}
          style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: 'oklch(var(--zen-sakura-base))', color: 'white', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.15s', opacity: loading ? 0.6 : 1 }}>
          {loading ? <Loader2 size={15} className="spin" /> : <Search size={15} />}
          Buscar
        </button>
      </motion.div>

      {loading && <div className="flex items-center justify-center py-16"><Loader2 size={28} className="spin" style={{ color: 'oklch(var(--zen-sakura-base))' }} /></div>}

      {!loading && results.length > 0 && (
        <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }} className="space-y-1.5">
          <p className="text-xs mb-3" style={{ color: 'var(--text-dim)' }}>Resultados para "{query}"</p>
          {results.map((result, idx) => (
            <motion.div key={result.id} variants={itemAnim}
              onClick={() => setSelectedResult(result)}
              style={{ background: selectedResult?.id === result.id ? 'oklch(var(--zen-sakura-base) / 0.08)' : 'var(--bg-card)', border: selectedResult?.id === result.id ? '1px solid oklch(var(--zen-sakura-base) / 0.2)' : 'var(--border-card)', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
              className="hover:bg-white/[0.02]">
              <div className="flex gap-3 p-3">
                <div style={{ width: 120, flexShrink: 0 }}>
                  {result.thumbnail ? <img src={result.thumbnail} alt="" style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, objectFit: 'cover' }} />
                    : <div style={{ width: '100%', aspectRatio: '16/9', borderRadius: 8, background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Youtube size={18} style={{ color: 'rgba(255,255,255,0.1)' }} /></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold mb-1 line-clamp-2" style={{ color: 'rgba(255,255,255,0.8)' }}>{result.title}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: 'var(--text-label)' }}>
                    <span className="flex items-center gap-1"><User size={11} />{result.uploader}</span>
                    {result.duration && <span className="flex items-center gap-1"><Clock size={11} />{formatDuration(result.duration)}</span>}
                    {result.view_count && <span className="flex items-center gap-1"><Eye size={11} />{fmtViews(result.view_count)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignSelf: 'center', flexShrink: 0 }}>
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                    onClick={e => { e.stopPropagation(); handlePlaySong(result); }}
                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-body)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                    <Download size={11} /> URL
                  </motion.button>
                  <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
                    onClick={e => { e.stopPropagation(); handleQuickDownload(result); }} disabled={downloadingId === result.id}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: downloadedIds.has(result.id) ? '#22c55e' : 'oklch(var(--zen-sakura-base))', color: 'white', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4, opacity: downloadingId === result.id ? 0.6 : 1 }}>
                    {downloadingId === result.id ? <Loader2 size={11} className="spin" /> : downloadedIds.has(result.id) ? <Check size={11} /> : <Download size={11} />}
                    {downloadedIds.has(result.id) ? 'Listo' : 'Descargar'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-16">
          <div style={{ width: 52, height: 52, borderRadius: 14, margin: '0 auto 12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-card)' }}>
            <Search size={22} style={{ color: 'rgba(255,255,255,0.1)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-nav)' }}>Sin resultados</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Intenta con otros términos para "{query}"</p>
        </div>
      )}

      {!loading && results.length === 0 && !query && trending.length > 0 && (
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }} className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} style={{ color: 'var(--text-dim)' }} />
            <span className="text-xs font-semibold tracking-wider" style={{ color: 'var(--text-label)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Tendencias en YouTube</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {trending.slice(0, 8).map((result, idx) => (
              <motion.div key={result.id} variants={itemAnim} whileHover={{ y: -1 }}
                onClick={() => setSelectedResult(result)}
                style={{ background: selectedResult?.id === result.id ? 'oklch(var(--zen-sakura-base) / 0.08)' : 'var(--bg-card)', border: selectedResult?.id === result.id ? '1px solid oklch(var(--zen-sakura-base) / 0.2)' : 'var(--border-card)', borderRadius: 10, cursor: 'pointer', padding: 10, transition: 'all 0.15s' }}>
                <div className="flex gap-3">
                  {result.thumbnail ? <img src={result.thumbnail} alt="" style={{ width: 80, aspectRatio: '16/9', borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                    : <div style={{ width: 80, aspectRatio: '16/9', borderRadius: 6, background: 'rgba(255,255,255,0.03)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Youtube size={14} style={{ color: 'var(--bg-hover)' }} /></div>}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium line-clamp-2" style={{ color: 'var(--text-body)' }}>{result.title}</div>
                    <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{result.uploader}</div>
                    {result.duration && <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-dim)' }}>{formatDuration(result.duration)}</div>}
                  </div>
                </div>
                {selectedResult?.id === result.id && (
                  <div className="flex gap-2 mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <button
                      onClick={e => { e.stopPropagation(); handlePlaySong(result); }}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: 'var(--text-dim)', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    >
                      <Download size={11} /> Enviar a Descargas
                    </button>
                    <motion.button
                      onClick={e => { e.stopPropagation(); handleQuickDownload(result); }}
                      disabled={downloadingId === result.id}
                      style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: downloadedIds.has(result.id) ? '#22c55e' : 'oklch(var(--zen-sakura-base))', color: 'white', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: downloadingId === result.id ? 0.6 : 1 }}
                    >
                      {downloadingId === result.id ? <Loader2 size={11} className="spin" /> : downloadedIds.has(result.id) ? <Check size={11} /> : <Download size={11} />}
                      {downloadedIds.has(result.id) ? 'Listo' : 'Descargar'}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {!loading && results.length === 0 && !query && trending.length === 0 && (
        <div className="text-center py-20">
          <div style={{ width: 56, height: 56, borderRadius: 14, margin: '0 auto 12px', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'var(--border-card)' }}>
            <Youtube size={26} style={{ color: 'var(--text-dim)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-nav)' }}>Busca música en YouTube</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>Encuentra canciones y videos para descargar</p>
        </div>
      )}
    </div>
  );
};
