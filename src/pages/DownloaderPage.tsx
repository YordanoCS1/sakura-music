import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Music, Video, CheckSquare, Square, Search, User, Disc, Check, Activity, Link } from 'lucide-react';
import { Skeleton, SkeletonLine, SkeletonTable } from '../components/Skeleton';
import { invoke, listen, confirm, musicDir } from '../bridge';
import toast from 'react-hot-toast';

interface VideoInfo {
  id: string; title: string; uploader: string; duration: number; thumbnail: string; url: string;
  is_playlist?: boolean; entries?: PlaylistEntry[];
}
interface PlaylistEntry {
  id: string; title: string; url: string; duration: number; thumbnail: string; uploader: string;
}
type QueueStatus = 'queued' | 'downloading' | 'completed' | 'error';

interface ActiveDownload {
  id: string; title: string; progress: number; speed: string; eta: string;
}
interface QueueItem {
  id: string; title: string; url: string; format: string; quality: string;
  codec?: string;
  downloadPath: string; cookieBrowser: string; embedCover: boolean;
  artist?: string; album?: string; organize: boolean;
  isPlaylist?: boolean; playlistName?: string;
  status: QueueStatus; progress: number; speed: string; eta: string; errorMessage?: string;
}

const MAX_CONCURRENT = 3;

const QUALITY_AUDIO = [
  { key: 'audio_m4a', emoji: '🎧', label: 'M4A Original', sub: 'Calidad original' },
  { key: 'audio_mp3_320', emoji: '🔥', label: 'MP3 320kbps', sub: 'Máxima calidad MP3' },
  { key: 'audio_mp3_128', emoji: '📻', label: 'MP3 128kbps', sub: 'Archivo ligero' },
];
const QUALITY_VIDEO = [
  { key: 'video_2160', emoji: '🎬', label: '4K (2160p)' },
  { key: 'video_1080', emoji: '📺', label: 'Full HD (1080p)' },
  { key: 'video_720', emoji: '🖥️', label: 'HD (720p)' },
  { key: 'video_480', emoji: '📱', label: 'SD (480p)' },
  { key: 'video_360', emoji: '⚡', label: 'Rápido (360p)' },
  { key: 'video_best', emoji: '⭐', label: 'Máxima Disponible' },
];

const getHighResThumbnail = (url: string) => {
  if (!url) return '';
  if (url.includes('ytimg.com/vi/') && url.includes('hqdefault.jpg')) return url.replace('hqdefault.jpg', 'maxresdefault.jpg');
  if (url.includes('mzstatic.com') || url.includes('is1-ssl.mzstatic.com')) return url.replace(/\b\d+x\d+bb\b/g, '1000x1000bb');
  return url;
};

function isValidUrl(str: string): boolean {
  try { const u = new URL(str.trim()); return u.protocol === 'http:' || u.protocol === 'https:'; } catch { return false; }
}
function isSupportedSite(url: string): boolean {
  const supported = ['youtube.com', 'youtu.be', 'music.youtube.com', 'soundcloud.com', 'on.soundcloud.com', 'vimeo.com', 'dailymotion.com', 'bandcamp.com', 'twitch.tv', 'twitter.com', 'x.com', 'instagram.com', 'facebook.com', 'fb.watch', 'tiktok.com', 'deezer.com', 'spotify.com', 'open.spotify.com'];
  try { const hostname = new URL(url.trim()).hostname.replace('www.', ''); return supported.some(s => hostname === s || hostname.endsWith('.' + s)); } catch { return false; }
}

const PremiumInput = ({ label, value, onChange, icon, placeholder = '' }: { label: string; value: string; onChange: (val: string) => void; icon?: React.ReactNode; placeholder?: string }) => (
  <div style={{ position: 'relative', width: '100%' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
      {icon && <span style={{ color: 'oklch(var(--zen-sakura-base))', opacity: 0.7 }}>{icon}</span>}
      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>{label}</span>
    </div>
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '12px 14px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '0.85rem', fontWeight: 600, outline: 'none', transition: 'all 0.2s' }}
      onFocus={e => { e.currentTarget.style.borderColor = 'oklch(var(--zen-sakura-base))'; e.currentTarget.style.background = 'rgba(0,0,0,0.3)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.background = 'rgba(0,0,0,0.2)'; }} />
  </div>
);

const itemAnim = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } };

export const DownloaderPage: React.FC = () => {
  const [url, setUrl] = useState('');
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [mediaType, setMediaType] = useState<'video' | 'audio'>('audio');
  const [quality, setQuality] = useState('audio_mp3_320');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [organize, setOrganize] = useState(true);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [activeDownloads, setActiveDownloads] = useState<ActiveDownload[]>([]);
  const [downloadPath, setDownloadPath] = useState('');
  const [downloadQueue, setDownloadQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef<QueueItem[]>([]);
  const processingRef = useRef(false);
  const [dragOver, setDragOver] = useState(false);
  const [codecPref, setCodecPref] = useState(() => localStorage.getItem('codecPreference') || 'auto');

  const normalizeQualityKey = (q: string, mt: string): string => {
    const legacyVideo: Record<string, string> = { '4K': 'video_2160', '1080p': 'video_1080', '720p': 'video_720' };
    const legacyAudio: Record<string, string> = { '320': 'audio_mp3_320', '256': 'audio_mp3_320', '192': 'audio_mp3_128' };
    if (mt === 'video') return legacyVideo[q] || q;
    return legacyAudio[q] || q;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const text = e.dataTransfer.getData('text');
    if (text && isValidUrl(text)) { setUrl(text); setTimeout(() => analyzeUrlWithRef(text), 0); }
    else toast.error('Arrastra un enlace válido');
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(false); }, []);

  useEffect(() => {
    loadSettings();
    const unsubProgress = listen('download-progress', (data: ActiveDownload) => {
      setActiveDownloads(prev => prev.map(d => d.id === data.id ? { ...d, progress: data.progress, speed: data.speed, eta: data.eta } : d));
      setDownloadQueue(prev => prev.map(d => d.id === data.id ? { ...d, progress: data.progress, speed: data.speed, eta: data.eta } : d));
    });
    const unsubCompleted = listen('download-completed', (data: { id: string; title: string }) => {
      setActiveDownloads(prev => prev.filter(d => d.id !== data.id));
      setDownloadQueue(prev => prev.map(d => d.id === data.id ? { ...d, status: 'completed', progress: 100 } : d));
      const qItem = queueRef.current.find(d => d.id === data.id);
      if (qItem) { qItem.status = 'completed'; qItem.progress = 100; }
      invoke('add_download_history', { title: data.title || qItem?.title || 'Archivo', url: qItem?.url || '', format: qItem?.format || '', quality: qItem?.quality || '' }).catch(() => {});
      toast.success(`${data.title} descargado correctamente`);
      processQueue();
    });
    const unsubError = listen('download-error', (data: { id: string; message: string }) => {
      setActiveDownloads(prev => prev.filter(d => d.id !== data.id));
      setDownloadQueue(prev => prev.map(d => d.id === data.id ? { ...d, status: 'error', errorMessage: data.message } : d));
      const qItem = queueRef.current.find(d => d.id === data.id);
      if (qItem) { qItem.status = 'error'; qItem.errorMessage = data.message; }
      toast.error(`Error: ${data.message}`);
      processQueue();
    });
    const handleUrlReady = (e: CustomEvent) => {
      const newUrl = e.detail; setUrl(newUrl);
      setTimeout(() => analyzeUrlWithRef(newUrl), 0);
    };
    window.addEventListener('url-ready', handleUrlReady as EventListener);
    return () => { unsubProgress(); unsubCompleted(); unsubError(); window.removeEventListener('url-ready', handleUrlReady as EventListener); };
  }, []);

  const loadSettings = () => {
    const path = localStorage.getItem('downloadPath') || `${musicDir}/Sakura Music`;
    setDownloadPath(path);
    const storedFormat = localStorage.getItem('defaultFormat');
    const mt = storedFormat === 'video' ? 'video' : 'audio';
    setMediaType(mt);
    const storedQuality = localStorage.getItem('defaultQuality');
    setQuality(normalizeQualityKey(storedQuality || (mt === 'video' ? 'video_best' : 'audio_mp3_320'), mt));
    setOrganize(localStorage.getItem('organizeAutomatically') !== 'false');
    const savedCodec = localStorage.getItem('codecPreference');
    if (savedCodec) setCodecPref(savedCodec);
  };

  const validateUrl = (targetUrl: string): string | null => {
    const u = targetUrl.trim();
    if (!u) { toast.error('Ingresa una URL'); return null; }
    if (!isValidUrl(u)) { toast.error('URL inválida'); return null; }
    if (!isSupportedSite(u)) { toast.error('URL no soportada'); return null; }
    return u;
  };

  const analyzeUrlWithRef = async (targetUrl: string) => {
    const u = validateUrl(targetUrl); if (!u) return;
    setLoading(true);
    try {
      const cookieBrowser = localStorage.getItem('cookieBrowser') || 'none';
      const info = await invoke<VideoInfo>('get_video_info', { url: u, cookieBrowser });
      setVideoInfo(info); setTitle(info.title); setArtist(info.uploader); setAlbum('');
      if (info.is_playlist && info.entries) setSelectedEntries(new Set(info.entries.map(e => e.id)));
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Error al analizar la URL'); setVideoInfo(null); }
    finally { setLoading(false); }
  };

  const analyzeUrl = async () => {
    const u = validateUrl(url); if (!u) return;
    setLoading(true);
    try {
      const cookieBrowser = localStorage.getItem('cookieBrowser') || 'none';
      const info = await invoke<VideoInfo>('get_video_info', { url: u, cookieBrowser });
      setVideoInfo(info); setTitle(info.title); setArtist(info.uploader); setAlbum('');
      if (info.is_playlist && info.entries) setSelectedEntries(new Set(info.entries.map(e => e.id)));
    } catch (error: unknown) { toast.error(error instanceof Error ? error.message : 'Error al analizar la URL'); setVideoInfo(null); }
    finally { setLoading(false); }
  };

  const getFormatFromQuality = (q: string): string => {
    if (q.startsWith('video_')) return 'video';
    if (q === 'audio_m4a') return 'm4a';
    return 'mp3';
  };
  const getKbpsFromQuality = (q: string): string => {
    if (q === 'audio_mp3_128') return '128';
    if (q === 'audio_mp3_320') return '320';
    return '320';
  };

  const handleDownload = async () => {
    if (!videoInfo) return;
    const cookieBrowser = localStorage.getItem('cookieBrowser') || 'none';
    const embedCover = localStorage.getItem('embedCover') !== 'false';
    const embedMetadata = localStorage.getItem('embedMetadata') !== 'false';
    const downloadId = Date.now().toString();
    const fmt = getFormatFromQuality(quality);
    const q = getKbpsFromQuality(quality);
    setActiveDownloads(prev => [...prev, { id: downloadId, title: title || videoInfo.title, progress: 0, speed: '0 KB/s', eta: '--:--' }]);
    invoke('download_media', { id: downloadId, args: { url: videoInfo.url, format: fmt, quality: quality, codec: mediaType === 'video' ? codecPref : undefined, title: embedMetadata ? title : undefined, artist: embedMetadata ? artist : undefined, album: embedMetadata ? album : undefined, downloadPath, cookieBrowser, organize, embedCover } })
      .catch(() => setActiveDownloads(prev => prev.filter(d => d.id !== downloadId)));
  };

  const handleDownloadPlaylist = async () => {
    if (!videoInfo?.entries) return;
    const selected = videoInfo.entries.filter(e => selectedEntries.has(e.id));
    if (selected.length === 0) { toast.error('Selecciona al menos un elemento'); return; }
    const confirmed = await confirm(`Descargar ${selected.length} canciones?\n\nSe descargarán hasta ${MAX_CONCURRENT} a la vez.`);
    if (!confirmed) return;
    const cookieBrowser = localStorage.getItem('cookieBrowser') || 'none';
    const embedCover = localStorage.getItem('embedCover') !== 'false';
    const fmt = getFormatFromQuality(quality);
    const q = getKbpsFromQuality(quality);
    toast.success(`${selected.length} canciones agregadas a la cola`, { id: 'playlist-add' });
    addToQueue(selected.map(e => ({
      title: e.title, url: e.url, format: fmt, quality: quality,
      codec: mediaType === 'video' ? codecPref : undefined,
      downloadPath, cookieBrowser, embedCover, organize, artist, album,
      isPlaylist: true, playlistName: videoInfo.title,
    })));
    setVideoInfo(null); setUrl('');
  };

  const toggleSelectAll = () => {
    if (!videoInfo?.entries) return;
    if (selectedEntries.size === videoInfo.entries.length) setSelectedEntries(new Set());
    else setSelectedEntries(new Set(videoInfo.entries.map(e => e.id)));
  };

  const processQueue = useCallback(() => {
    const queue = queueRef.current;
    const active = queue.filter(q => q.status === 'downloading').length;
    if (active >= MAX_CONCURRENT) return;
    const next = queue.find(q => q.status === 'queued');
    if (!next) return;
    setDownloadQueue(prev => prev.map(q => q.id === next.id ? { ...q, status: 'downloading' as QueueStatus } : q));
    next.status = 'downloading';
    invoke('download_media', {
      id: next.id, args: {
        url: next.url, format: next.format, quality: next.quality,
        codec: next.format === 'video' ? (next as any).codec || codecPref : undefined,
        title: next.artist ? next.title : undefined,
        artist: next.artist || undefined,
        album: next.album || undefined,
        downloadPath: next.downloadPath, cookieBrowser: next.cookieBrowser,
        organize: next.organize, embedCover: next.embedCover,
        isPlaylist: next.isPlaylist, playlistName: next.playlistName,
      }
    }).catch(() => {});
    setTimeout(() => processQueue(), 100);
  }, []);

  const addToQueue = useCallback((items: Omit<QueueItem, 'id' | 'status' | 'progress' | 'speed' | 'eta'>[]) => {
    const newItems: QueueItem[] = items.map(item => ({
      ...item,
      id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
      status: 'queued' as QueueStatus,
      progress: 0, speed: '0 KB/s', eta: '--:--',
    }));
    queueRef.current = [...queueRef.current, ...newItems];
    setDownloadQueue(prev => [...prev, ...newItems]);
    setTimeout(() => processQueue(), 50);
  }, [processQueue]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} style={{ position: 'relative', minHeight: '100%' }}>
      {dragOver && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 100, borderRadius: 16, border: '2px dashed oklch(var(--zen-sakura-base))', background: 'oklch(var(--zen-sakura-base) / 0.06)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <Link size={40} color="oklch(var(--zen-sakura-base))" />
          <span style={{ fontSize: '1rem', fontWeight: 700, color: 'oklch(var(--zen-sakura-base))' }}>Suelta el enlace aquí</span>
        </div>
      )}
    <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }} className="space-y-5">
      {/* Empty state */}
      {!videoInfo && !loading && (
        <motion.div variants={itemAnim} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 16, padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 56, height: 56, background: 'var(--bg-primary)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', border: 'var(--border-card)' }}>
              <Download color="oklch(var(--zen-sakura-base))" size={28} />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-heading)', marginBottom: 8 }}>Centro de Descargas</h2>
            <p style={{ color: 'var(--text-label)', fontSize: '0.85rem' }}>Pega un enlace para extraer y descargar contenido multimedia</p>
          </div>

          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Link size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input placeholder="Pega el enlace aquí..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && analyzeUrl()}
                style={{ width: '100%', height: 44, paddingLeft: 40, paddingRight: 12, borderRadius: 10, fontSize: '0.85rem', outline: 'none', background: 'var(--bg-input)', border: 'var(--border-card)', color: 'var(--text-body)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'oklch(var(--zen-sakura-base))'; e.currentTarget.style.boxShadow = '0 0 0 3px oklch(var(--zen-sakura-base) / 0.1)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)'; e.currentTarget.style.boxShadow = 'none'; }} />
            </div>
            <button onClick={analyzeUrl} disabled={!url || loading}
              style={{ padding: '0 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', opacity: (!url || loading) ? 0.5 : 1, transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 8 }}>
              {loading ? <div className="w-4 h-4 rounded-full border-2 spin" style={{ borderColor: 'var(--text-label)', borderTopColor: 'white' }} /> : <Search size={15} />}
              {loading ? 'Analizando...' : 'Analizar'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Formato</span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'oklch(var(--zen-sakura-base))' }}>{quality.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {([{ key: 'video' as const, icon: Video, label: 'Video' }, { key: 'audio' as const, icon: Music, label: 'Audio' }]).map(item => (
                <button key={item.key} onClick={() => { setMediaType(item.key); setQuality(item.key === 'video' ? 'video_best' : 'audio_mp3_320'); }}
                  style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: mediaType === item.key ? '1.5px solid oklch(var(--zen-sakura-base))' : 'var(--border-card)', background: mediaType === item.key ? 'oklch(var(--zen-sakura-base) / 0.08)' : 'transparent', color: mediaType === item.key ? 'oklch(var(--zen-sakura-base))' : 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, transition: 'all 0.12s' }}>
                  <item.icon size={14} /> {item.label}
                </button>
              ))}
            </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {(mediaType === 'video' ? QUALITY_VIDEO : QUALITY_AUDIO).map(preset => (
                <button key={preset.key} onClick={() => setQuality(preset.key)}
                  style={{ padding: '12px 6px', borderRadius: 8, border: quality === preset.key ? '1.5px solid oklch(var(--zen-sakura-base))' : 'var(--border-card)', background: quality === preset.key ? 'oklch(var(--zen-sakura-base) / 0.06)' : 'transparent', cursor: 'pointer', transition: 'all 0.12s', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.2rem', marginBottom: 2 }}>{preset.emoji}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: quality === preset.key ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)' }}>{preset.label}</div>
                  {'sub' in preset && <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 1 }}>{(preset as { key: string; emoji: string; label: string; sub?: string }).sub}</div>}
                </button>
              ))}
            </div>
            {mediaType === 'video' && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', marginBottom: 6 }}>CÓDEC</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[{ key: 'auto', label: 'Auto' }, { key: 'av1', label: 'AV1' }, { key: 'vp9', label: 'VP9' }, { key: 'h264', label: 'H.264' }].map(c => (
                    <button key={c.key} onClick={() => { setCodecPref(c.key); localStorage.setItem('codecPreference', c.key); }}
                      style={{ flex: 1, padding: '8px 0', borderRadius: 6, border: codecPref === c.key ? '1.5px solid oklch(var(--zen-sakura-base))' : 'var(--border-card)', background: codecPref === c.key ? 'oklch(var(--zen-sakura-base) / 0.06)' : 'transparent', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, color: codecPref === c.key ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', transition: 'all 0.12s' }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Analyzing skeleton */}
      {loading && (
        <motion.div variants={itemAnim} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 16, padding: 24 }}>
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(280px, 1fr) 1fr', alignItems: 'start' }}>
            <Skeleton width="100%" height={200} borderRadius={12} />
            <div className="space-y-3">
              <Skeleton width="40%" height={14} borderRadius={4} />
              <Skeleton width="80%" height={22} borderRadius={4} />
              <Skeleton width="50%" height={14} borderRadius={4} />
              <Skeleton width="100%" height={40} borderRadius={10} style={{ marginTop: 12 }} />
              <Skeleton width="100%" height={40} borderRadius={10} />
              <Skeleton width="100%" height={40} borderRadius={10} />
            </div>
          </div>
        </motion.div>
      )}

      {/* Video info ready */}
      {videoInfo && !loading && (
        <motion.div variants={itemAnim} style={{ background: 'var(--bg-card)', border: 'var(--border-card)', borderRadius: 16, padding: 24 }}>
          {videoInfo.is_playlist ? (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '260px 1fr' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ borderRadius: 12, overflow: 'hidden', border: 'var(--border-card)' }}>
                  <img src={videoInfo.thumbnail} alt="" className="w-full aspect-square object-cover" />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>{videoInfo.title}</h2>
                  <p style={{ fontSize: '0.8rem', marginTop: 2, color: 'var(--text-dim)' }}>{videoInfo.entries?.length || 0} elementos</p>
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button onClick={handleDownloadPlaylist} disabled={selectedEntries.size === 0}
                    style={{ padding: '10px 0', borderRadius: 8, border: 'none', background: selectedEntries.size === 0 ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))', color: selectedEntries.size === 0 ? 'var(--text-dim)' : 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Download size={15} /> Descargar {selectedEntries.size > 0 ? `(${selectedEntries.size})` : ''}
                  </button>
                  <button onClick={() => { setVideoInfo(null); setUrl(''); }}
                    style={{ padding: '8px 0', borderRadius: 8, border: 'var(--border-card)', background: 'transparent', color: 'var(--text-label)', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, background: 'rgba(0,0,0,0.1)', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Lista de reproducción ({videoInfo.entries?.length || 0})</span>
                  <button onClick={toggleSelectAll} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, background: selectedEntries.size === (videoInfo.entries?.length || 0) ? 'rgba(239,68,68,0.15)' : 'oklch(var(--zen-sakura-base) / 0.15)', color: selectedEntries.size === (videoInfo.entries?.length || 0) ? '#f87171' : 'oklch(var(--zen-sakura-base))', border: 'none', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>
                    {selectedEntries.size === (videoInfo.entries?.length || 0) ? <Square size={11} /> : <CheckSquare size={11} />}
                    {selectedEntries.size === (videoInfo.entries?.length || 0) ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                </div>
                <div style={{ maxHeight: 360, overflowY: 'auto', paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {videoInfo.entries?.map((entry, idx) => {
                    const isSelected = selectedEntries.has(entry.id);
                    return (
                      <div key={entry.id + idx} onClick={() => { const s = new Set(selectedEntries); s.has(entry.id) ? s.delete(entry.id) : s.add(entry.id); setSelectedEntries(s); }}
                        style={{ padding: '8px 12px', borderRadius: 8, background: isSelected ? 'oklch(var(--zen-sakura-base) / 0.06)' : 'transparent', border: `1px solid ${isSelected ? 'oklch(var(--zen-sakura-base) / 0.15)' : 'transparent'}`, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', transition: 'all 0.12s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: isSelected ? 'oklch(var(--zen-sakura-base))' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSelected ? 'transparent' : 'var(--bg-hover)'}` }}>
                          {isSelected && <Check size={10} strokeWidth={3} color="white" />}
                        </div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-dim)', width: 16, flexShrink: 0 }}>{idx + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--text-input)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.title}</p>
                        </div>
                        {entry.duration && <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', flexShrink: 0 }}>{formatDuration(entry.duration)}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(280px, 1fr) 1fr', alignItems: 'start' }}>
              <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: 'var(--border-card)' }}>
                <img src={getHighResThumbnail(videoInfo.thumbnail)} alt="" className="w-full aspect-video object-cover block" />
                <div style={{ position: 'absolute', bottom: 10, left: 10, padding: '4px 12px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: 'oklch(var(--zen-sakura-base))', color: 'white', backdropFilter: 'blur(8px)' }}>
                  {quality.includes('video') ? 'VIDEO' : 'AUDIO'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Activity size={12} color="oklch(var(--zen-sakura-base))" />
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'oklch(var(--zen-sakura-base))' }}>Metadatos</span>
                  </div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)', lineHeight: 1.2 }}>{videoInfo.title}</h2>
                  <p style={{ fontSize: '0.8rem', marginTop: 4, color: 'var(--text-label)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={12} /> {videoInfo.uploader || 'Desconocido'}
                  </p>
                </div>
                <div style={{ padding: 16, borderRadius: 10, background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <PremiumInput label="TÍTULO" value={title} onChange={setTitle} icon={<Music size={12} />} />
                    <PremiumInput label="ARTISTA" value={artist} onChange={setArtist} icon={<User size={12} />} />
                    <PremiumInput label="ÁLBUM" value={album} onChange={setAlbum} icon={<Disc size={12} />} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                    <div onClick={() => setOrganize(!organize)} style={{ width: 16, height: 16, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', background: organize ? 'oklch(var(--zen-sakura-base))' : 'var(--bg-input)', border: `1px solid ${organize ? 'transparent' : 'var(--bg-hover)'}`, cursor: 'pointer', transition: 'all 0.12s' }}>
                      {organize && <Check size={9} strokeWidth={3} color="white" />}
                    </div>
                    <span style={{ fontSize: '0.7rem', fontWeight: 500, color: 'var(--text-label)' }}>Organizar en Artista/Álbum</span>
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'oklch(var(--zen-sakura-base))' }}>{quality.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <button onClick={handleDownload} style={{ flex: 1.5, padding: '12px 0', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))', color: 'white', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px oklch(var(--zen-sakura-base) / 0.2)' }}>
                    <Download size={16} /> DESCARGAR
                  </button>
                  <button onClick={() => { setVideoInfo(null); setUrl(''); }} style={{ padding: '0 16px', borderRadius: 8, border: 'var(--border-card)', background: 'transparent', color: 'var(--text-label)', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                    CANCELAR
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Active downloads / queue */}
      <AnimatePresence>
        {(activeDownloads.length > 0 || downloadQueue.length > 0) && (
          <motion.div variants={itemAnim} initial="hidden" animate="show" className="space-y-2">
            <h3 style={{ fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)' }}>
              <Download size={12} /> Descargas
              <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-dim)' }}>
                · {downloadQueue.filter(q => q.status === 'downloading').length} descargando
                {downloadQueue.filter(q => q.status === 'queued').length > 0 && ` · ${downloadQueue.filter(q => q.status === 'queued').length} en cola`}
                {downloadQueue.filter(q => q.status === 'completed').length > 0 && ` · ${downloadQueue.filter(q => q.status === 'completed').length} completadas`}
              </span>
            </h3>
            {downloadQueue.map((item) => (
              <motion.div key={item.id} layout
                style={{ padding: '10px 14px', borderRadius: 8, background: item.status === 'error' ? 'rgba(239,68,68,0.06)' : 'var(--bg-card)', border: item.status === 'error' ? '1px solid rgba(239,68,68,0.15)' : 'var(--border-card)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, color: item.status === 'completed' ? 'var(--text-dim)' : item.status === 'error' ? '#f87171' : 'var(--text-input)' }}>
                    {item.status === 'queued' && <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, fontWeight: 700, background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>COLA</span>}
                    {item.status === 'downloading' && <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: 4, fontWeight: 700, background: 'oklch(var(--zen-sakura-base) / 0.12)', color: 'oklch(var(--zen-sakura-base))' }}>DL</span>}
                    {item.status === 'completed' && <span style={{ fontSize: '0.7rem', color: '#22c55e' }}>✓</span>}
                    {item.status === 'error' && <span style={{ fontSize: '0.7rem', color: '#f87171' }}>✗</span>}
                    {item.title}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    {item.status === 'queued' ? 'esperando...' : item.status === 'completed' ? 'completado' : item.status === 'error' ? item.errorMessage || 'error' : `${item.speed} · ${item.eta}`}
                  </span>
                </div>
                {(item.status === 'downloading' || item.status === 'queued') && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.04)' }}>
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: '100%', transform: `scaleX(${item.progress / 100})`, transformOrigin: 'left', background: item.status === 'queued' ? 'rgba(255,255,255,0.06)' : 'linear-gradient(90deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))' }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontFamily: 'monospace', color: 'var(--text-label)' }}>{Math.round(item.progress)}%</span>
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </div>
  );
};
