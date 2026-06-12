import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Save, Search, Music, ArrowLeft, ArrowRight, Sparkles, Check, Disc3,
  Headphones, Clock, Image, FileText, PenLine, HardDrive, Waves, ListMusic,
  FileAudio, Upload, Trash2, Globe, Tag, DiscAlbum, Mic2, User, Calendar,
  Hash, Guitar, Music2, Plus, MinusCircle, Play,
} from 'lucide-react';
import { invoke } from '../bridge';
import toast from 'react-hot-toast';
import type { LibraryLayout } from './library/LayoutTypes';
import { usePlayback } from '../contexts/PlaybackContext';
import { formatDuration, formatSize } from '../utils/format';
import { parseLRC, buildLRC, isLRC, getCurrentLineIndex } from '../utils/lrc';
import type { LRCLine } from '../utils/lrc';

interface FileItem { path: string; name: string; }
interface Metadata {
  title: string | null; artist: string | null; album: string | null; year: string | null;
  track: string | null; genre: string | null; lyrics: string | null; cover: string | null; duration: number | null;
  bitrate?: number | null; sampleRate?: number | null; codec?: string | null; composer?: string | null; comment?: string | null;
  trackCount?: number | null;
}
interface CoverResult { url: string; title: string; artist: string; album: string; }
interface SongResult {
  trackId: number; title: string | null; artist: string | null; album: string | null;
  year: string | null; track: string | null; trackCount: number | null;
  genre: string | null; cover: string | null; duration: number | null;
}
interface Props {
  file: FileItem; onClose: () => void; onSave?: () => void; queueMode?: boolean;
  onNext?: () => void; onPrevious?: () => void; currentIndex?: number; totalCount?: number;
  libraryLayout?: LibraryLayout;
}

type CoverSource = { type: 'file'; path: string; dataUrl: string } | { type: 'url'; url: string } | null;

interface ThemeColors {
  overlay: string; containerBg: string; containerBorder: string; containerShadow: string;
  headerBg: string; headerBorder: string; sidebarBg: string; sidebarBorder: string;
  accent: string; accentDim: string; accentGradient: string;
  surface: string; surfaceHover: string; borderDim: string; borderMid: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  inputBg: string; inputBorder: string; inputFocusBorder: string; inputFocusShadow: string;
  coverBg: string; spinnerTrack: string; spinnerTop: string;
}

const themes: Record<string, ThemeColors> = {
  default: {
    overlay: 'rgba(0,0,0,0.6)', containerBg: '#12121c', containerBorder: 'rgba(255,255,255,0.07)', containerShadow: '0 30px 80px rgba(0,0,0,0.65)',
    headerBg: 'rgba(255,255,255,0.02)', headerBorder: 'rgba(255,255,255,0.1)', sidebarBg: '#0e0e18', sidebarBorder: 'rgba(255,255,255,0.07)',
    accent: '#a855f7', accentDim: 'rgba(168,85,247,0.15)', accentGradient: 'linear-gradient(135deg, #a855f7, #9333ea)',
    surface: 'rgba(255,255,255,0.04)', surfaceHover: 'rgba(255,255,255,0.07)', borderDim: 'rgba(255,255,255,0.07)', borderMid: 'rgba(255,255,255,0.1)',
    textPrimary: '#eeeef8', textSecondary: 'rgba(255,255,255,0.55)', textMuted: 'rgba(255,255,255,0.35)',
    inputBg: 'rgba(0,0,0,0.3)', inputBorder: 'rgba(255,255,255,0.07)', inputFocusBorder: '#a855f755', inputFocusShadow: '0 0 0 3px rgba(168,85,247,0.06)',
    coverBg: '#0a0a14', spinnerTrack: 'rgba(255,255,255,0.06)', spinnerTop: '#a855f7',
  },
  glass: {
    overlay: 'rgba(20,5,15,0.55)', containerBg: 'rgba(25,10,20,0.85)', containerBorder: 'rgba(255,120,160,0.12)', containerShadow: '0 30px 80px rgba(0,0,0,0.5)',
    headerBg: 'rgba(255,180,200,0.04)', headerBorder: 'rgba(255,120,160,0.1)', sidebarBg: 'rgba(20,8,15,0.5)', sidebarBorder: 'rgba(255,120,160,0.08)',
    accent: '#f472b6', accentDim: 'rgba(244,114,182,0.15)', accentGradient: 'linear-gradient(135deg, #f472b6, #ec4899)',
    surface: 'rgba(255,180,200,0.04)', surfaceHover: 'rgba(255,180,200,0.08)', borderDim: 'rgba(255,180,200,0.08)', borderMid: 'rgba(255,180,200,0.12)',
    textPrimary: '#fce7f3', textSecondary: 'rgba(252,231,243,0.55)', textMuted: 'rgba(252,231,243,0.35)',
    inputBg: 'rgba(0,0,0,0.35)', inputBorder: 'rgba(255,180,200,0.08)', inputFocusBorder: '#f472b655', inputFocusShadow: '0 0 0 3px rgba(244,114,182,0.08)',
    coverBg: 'rgba(20,8,15,0.6)', spinnerTrack: 'rgba(255,255,255,0.06)', spinnerTop: '#f472b6',
  },
  'list-minimal': {
    overlay: 'rgba(0,0,0,0.3)', containerBg: '#fafafe', containerBorder: 'rgba(0,0,0,0.06)', containerShadow: '0 20px 60px rgba(0,0,0,0.12)',
    headerBg: 'rgba(0,0,0,0.02)', headerBorder: 'rgba(0,0,0,0.06)', sidebarBg: 'rgba(0,0,0,0.02)', sidebarBorder: 'rgba(0,0,0,0.06)',
    accent: '#f472b6', accentDim: 'rgba(244,114,182,0.08)', accentGradient: 'linear-gradient(135deg, #f472b6, #e04090)',
    surface: 'rgba(0,0,0,0.03)', surfaceHover: 'rgba(0,0,0,0.05)', borderDim: 'rgba(0,0,0,0.06)', borderMid: 'rgba(0,0,0,0.08)',
    textPrimary: '#1a1a2e', textSecondary: 'rgba(26,26,46,0.5)', textMuted: 'rgba(26,26,46,0.3)',
    inputBg: 'rgba(0,0,0,0.04)', inputBorder: 'rgba(0,0,0,0.08)', inputFocusBorder: '#f472b655', inputFocusShadow: '0 0 0 3px rgba(244,114,182,0.06)',
    coverBg: 'rgba(0,0,0,0.04)', spinnerTrack: 'rgba(0,0,0,0.06)', spinnerTop: '#f472b6',
  },
  masonry: {
    overlay: 'rgba(15,5,30,0.55)', containerBg: 'rgba(20,8,35,0.92)', containerBorder: 'rgba(168,85,247,0.12)', containerShadow: '0 30px 80px rgba(0,0,0,0.5)',
    headerBg: 'rgba(168,85,247,0.04)', headerBorder: 'rgba(168,85,247,0.1)', sidebarBg: 'rgba(10,4,20,0.5)', sidebarBorder: 'rgba(168,85,247,0.08)',
    accent: '#a855f7', accentDim: 'rgba(168,85,247,0.15)', accentGradient: 'linear-gradient(135deg, #a855f7, #ec4899)',
    surface: 'rgba(168,85,247,0.04)', surfaceHover: 'rgba(168,85,247,0.08)', borderDim: 'rgba(168,85,247,0.08)', borderMid: 'rgba(168,85,247,0.12)',
    textPrimary: '#f0e8ff', textSecondary: 'rgba(240,232,255,0.5)', textMuted: 'rgba(240,232,255,0.3)',
    inputBg: 'rgba(0,0,0,0.35)', inputBorder: 'rgba(168,85,247,0.08)', inputFocusBorder: '#a855f755', inputFocusShadow: '0 0 0 3px rgba(168,85,247,0.08)',
    coverBg: 'rgba(10,4,20,0.6)', spinnerTrack: 'rgba(255,255,255,0.06)', spinnerTop: '#a855f7',
  },
  split: {
    overlay: 'rgba(5,0,15,0.65)', containerBg: '#0d0a1a', containerBorder: 'rgba(236,72,153,0.12)', containerShadow: '0 30px 80px rgba(0,0,0,0.6)',
    headerBg: 'rgba(236,72,153,0.04)', headerBorder: 'rgba(236,72,153,0.1)', sidebarBg: 'rgba(5,2,12,0.6)', sidebarBorder: 'rgba(236,72,153,0.08)',
    accent: '#ec4899', accentDim: 'rgba(236,72,153,0.12)', accentGradient: 'linear-gradient(135deg, #ec4899, #db2777)',
    surface: 'rgba(236,72,153,0.03)', surfaceHover: 'rgba(236,72,153,0.06)', borderDim: 'rgba(236,72,153,0.08)', borderMid: 'rgba(236,72,153,0.12)',
    textPrimary: '#f0e8f8', textSecondary: 'rgba(240,232,248,0.5)', textMuted: 'rgba(240,232,248,0.3)',
    inputBg: 'rgba(0,0,0,0.4)', inputBorder: 'rgba(236,72,153,0.08)', inputFocusBorder: '#ec489955', inputFocusShadow: '0 0 0 3px rgba(236,72,153,0.06)',
    coverBg: 'rgba(5,2,12,0.6)', spinnerTrack: 'rgba(255,255,255,0.06)', spinnerTop: '#ec4899',
  },
  sakura: {
    overlay: 'rgba(30,10,20,0.35)', containerBg: '#fefafc', containerBorder: 'rgba(244,114,182,0.08)', containerShadow: '0 20px 60px rgba(244,114,182,0.08)',
    headerBg: 'rgba(244,114,182,0.03)', headerBorder: 'rgba(244,114,182,0.08)', sidebarBg: 'rgba(244,114,182,0.03)', sidebarBorder: 'rgba(244,114,182,0.08)',
    accent: '#f472b6', accentDim: 'rgba(244,114,182,0.08)', accentGradient: 'linear-gradient(135deg, #f9a8d4, #f472b6)',
    surface: 'rgba(244,114,182,0.03)', surfaceHover: 'rgba(244,114,182,0.06)', borderDim: 'rgba(244,114,182,0.08)', borderMid: 'rgba(244,114,182,0.12)',
    textPrimary: '#2d1b24', textSecondary: 'rgba(45,27,36,0.55)', textMuted: 'rgba(45,27,36,0.35)',
    inputBg: 'rgba(244,114,182,0.04)', inputBorder: 'rgba(244,114,182,0.1)', inputFocusBorder: '#f472b655', inputFocusShadow: '0 0 0 3px rgba(244,114,182,0.06)',
    coverBg: 'rgba(244,114,182,0.04)', spinnerTrack: 'rgba(0,0,0,0.04)', spinnerTop: '#f472b6',
  },
};

const fadeSlide = {
  initial: { opacity: 0, y: -6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export const MetadataEditor: React.FC<Props> = ({
  file, onClose, onSave, queueMode = false, onNext, onPrevious, currentIndex = 1, totalCount = 1, libraryLayout = 'default',
}) => {
  const T = themes[libraryLayout] || themes.default;
  const [meta, setMeta] = useState<Metadata>({
    title: null, artist: null, album: null, year: null, track: null, genre: null, lyrics: null, cover: null, duration: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [coverSource, setCoverSource] = useState<CoverSource>(null);
  const [coverError, setCoverError] = useState(false);
  const [showCoverSearch, setShowCoverSearch] = useState(false);
  const [coverResults, setCoverResults] = useState<CoverResult[]>([]);
  const [searchingCover, setSearchingCover] = useState(false);
  const [songQuery, setSongQuery] = useState('');
  const [songResults, setSongResults] = useState<SongResult[]>([]);
  const [searchingSongs, setSearchingSongs] = useState(false);
  const [selectedSongId, setSelectedSongId] = useState<number | null>(null);
  const [searchingLyrics, setSearchingLyrics] = useState(false);
  const [fileStat, setFileStat] = useState<{ size: number; modified: string } | null>(null);
  const [lrcMode, setLrcMode] = useState(false);
  const [lrcLines, setLrcLines] = useState<LRCLine[]>([]);
  const [lrcMeta, setLrcMeta] = useState<Record<string, string>>({});
  const lyricsRef = useRef<HTMLDivElement>(null);
  const playback = usePlayback();
  const [activeTab, setActiveTab] = useState<'info' | 'itunes' | 'lyrics'>('info');

  const coverUrl = coverSource?.type === 'file' ? coverSource.dataUrl
    : coverSource?.type === 'url' ? coverSource.url : meta.cover;

  useEffect(() => { setCoverError(false); }, [coverUrl, coverSource]);
  useEffect(() => { loadMetadata(); }, [file.path]);

  const inputBase: React.CSSProperties = useMemo(() => ({
    width: '100%', padding: '10px 13px', borderRadius: 8, fontSize: '0.82rem', outline: 'none',
    background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textPrimary,
    transition: 'border 0.2s, box-shadow 0.2s', fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }), [T.inputBg, T.inputBorder, T.textPrimary]);

  const loadMetadata = async () => {
    setLoading(true);
    try {
      const data = await invoke<Metadata>('get_file_metadata', { filePath: file.path });
      setMeta(data);
      setCoverSource(null);
      const name = file.name.replace(/\.[^/.]+$/, '');
      setSongQuery(data.title ? `${data.title}${data.artist ? ` ${data.artist}` : ''}` : name);
      try {
        const stat = await invoke<{ size: number; modified: string }>('get_file_stat', { filePath: file.path });
        setFileStat(stat);
      } catch {}
    } catch { toast.error('Error al cargar metadatos'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!loading && !meta.title && !meta.artist) {
      const t = setTimeout(() => searchSongs(), 400);
      return () => clearTimeout(t);
    }
  }, [loading]);

  // Auto-detect LRC lyrics
  useEffect(() => {
    if (meta.lyrics && isLRC(meta.lyrics)) {
      const parsed = parseLRC(meta.lyrics);
      setLrcLines(parsed.lines);
      setLrcMeta(parsed.meta);
      setLrcMode(true);
    } else {
      setLrcLines([]);
      setLrcMeta({});
      setLrcMode(false);
    }
  }, [meta.lyrics]);

  // Auto-scroll synced lyrics preview
  const currentLine = lrcMode ? getCurrentLineIndex(lrcLines, playback.currentTime) : -1;
  useEffect(() => {
    if (!lrcMode || currentLine < 0 || !lyricsRef.current) return;
    const container = lyricsRef.current;
    const active = container.querySelector('[data-active="true"]') as HTMLElement | null;
    if (active) active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [currentLine, lrcMode]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const finalLyrics = lrcMode ? buildLRC({ lines: lrcLines, meta: lrcMeta }) : meta.lyrics;
      let coverPath: string | null = null;
      if (coverSource?.type === 'file') coverPath = coverSource.path;
      else if (coverSource?.type === 'url') coverPath = await invoke<string | null>('download_cover_to_temp', { imageUrl: coverSource.url });
      else if (coverSource === null && coverUrl?.startsWith('data:')) coverPath = await invoke<string | null>('save_base64_to_temp', { dataUrl: coverUrl });
      await invoke('save_metadata', {
        filePath: file.path,
        metadata: { title: meta.title, artist: meta.artist, album: meta.album, year: meta.year, track: meta.track, genre: meta.genre, lyrics: finalLyrics, coverPath },
      });
      toast.success('Metadatos guardados correctamente');
      onSave?.();
      if (queueMode && onNext) onNext(); else onClose();
    } catch { toast.error('Error al guardar metadatos'); }
    finally { setSaving(false); }
  };

  const searchCovers = async () => {
    if (!meta.artist && !meta.title) { toast.error('Necesitas especificar artista y título'); return; }
    setSearchingCover(true); setShowCoverSearch(true);
    try { setCoverResults(await invoke<CoverResult[]>('fetch_itunes_cover', { artist: meta.artist, title: meta.title })); }
    catch { toast.error('Error al buscar portadas'); }
    finally { setSearchingCover(false); }
  };

  const searchSongs = async () => {
    const q = songQuery.trim();
    if (!q) { toast.error('Escribe el nombre de una canción'); return; }
    setSearchingSongs(true); setSelectedSongId(null);
    try {
      const r = await invoke<SongResult[]>('fetch_itunes_song', { query: q });
      setSongResults(r);
      if (r.length === 0) toast.error('Sin resultados en iTunes');
    } catch { toast.error('Error al buscar en iTunes'); }
    finally { setSearchingSongs(false); }
  };

  const applySong = (song: SongResult) => {
    setSelectedSongId(song.trackId);
    setMeta(p => ({ ...p, title: song.title || p.title, artist: song.artist || p.artist, album: song.album || p.album, year: song.year || p.year, track: song.track || p.track, genre: song.genre || p.genre, duration: song.duration || p.duration }));
    if (song.cover) setCoverSource({ type: 'url', url: song.cover });
    toast.success(`Metadatos de "${song.title}" aplicados`);
  };

  const searchLyrics = async () => {
    setSearchingLyrics(true);
    try {
      const r = await invoke<{ syncedLyrics: string | null; plainLyrics: string | null }>('fetch_lyrics', { title: meta.title, artist: meta.artist, album: meta.album, duration: meta.duration });
      if (r.plainLyrics || r.syncedLyrics) { setMeta({ ...meta, lyrics: r.syncedLyrics || r.plainLyrics }); toast.success('Letras encontradas'); }
      else toast.error('No se encontraron letras para esta canción');
    } catch { toast.error('Error al buscar letras'); }
    finally { setSearchingLyrics(false); }
  };

  const statRow = (icon: React.ReactNode, label: string, value: string) => (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px',
      borderRadius: 8, background: T.surface, border: `1px solid ${T.borderDim}`,
      transition: 'border 0.15s',
    }}>
      <span style={{ flexShrink: 0, opacity: 0.5 }}>{icon}</span>
      <span style={{
        fontSize: '0.58rem', fontWeight: 700, color: T.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: 46, flexShrink: 0,
      }}>{label}</span>
      <span style={{
        fontSize: '0.72rem', fontWeight: 600, color: T.textPrimary,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{value}</span>
    </div>
  );

  const modalContent = (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 30,
      }}
    >
      {/* Dynamic Blurred Background */}
      {coverUrl && !coverError && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 0.45 }} exit={{ opacity: 0 }}
          style={{
            position: 'absolute', inset: -80,
            backgroundImage: `url(${coverUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(70px) saturate(1.8)',
            zIndex: -2, pointerEvents: 'none',
          }}
        />
      )}
      <div style={{ position: 'absolute', inset: 0, background: T.overlay, backdropFilter: 'blur(20px)', zIndex: -1 }} onClick={onClose} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
           <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${T.spinnerTrack}`, borderTopColor: T.accent, animation: 'spin 0.7s linear infinite' }} />
           <span style={{ fontSize: '0.8rem', color: T.textSecondary, fontWeight: 500 }}>Cargando metadatos...</span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300, mass: 0.9 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 960, maxHeight: '90vh', borderRadius: 24,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: T.containerBg, border: `1px solid ${T.containerBorder}`,
            boxShadow: `0 40px 100px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)`,
            position: 'relative'
          }}
        >
          {/* HEADER CLOSE BTN */}
          <button onClick={onClose} style={{ position: 'absolute', top: 20, right: 20, width: 32, height: 32, borderRadius: '50%', background: T.surface, border: `1px solid ${T.borderDim}`, color: T.textSecondary, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = '#f87171'; }} onMouseLeave={e => { e.currentTarget.style.background = T.surface; e.currentTarget.style.color = T.textSecondary; }}>
             <X size={16} />
          </button>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* HERO SECTION */}
            <div style={{ padding: '40px 40px 30px', display: 'flex', gap: 30, alignItems: 'flex-start' }}>
               {/* COVER */}
               <div style={{ position: 'relative', width: 220, height: 220, borderRadius: 16, overflow: 'hidden', background: T.coverBg, border: `1px solid ${T.borderDim}`, boxShadow: '0 20px 40px rgba(0,0,0,0.4)', flexShrink: 0 }}
                    onMouseEnter={e => { const o = e.currentTarget.querySelector('.cover-overlay') as HTMLElement; if (o) o.style.opacity = '1'; }}
                    onMouseLeave={e => { const o = e.currentTarget.querySelector('.cover-overlay') as HTMLElement; if (o) o.style.opacity = '0'; }}>
                  {coverUrl && !coverError ? (
                    <img src={coverUrl} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={() => setCoverError(true)} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music2 size={60} color={T.textMuted} opacity={0.3} /></div>
                  )}
                  {/* OVERLAY ACTIONS */}
                  <div className="cover-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, opacity: 0, transition: 'opacity 0.2s' }}>
                     <button onClick={searchCovers} style={{ padding: '8px 16px', borderRadius: 8, background: T.accent, border: 'none', color: '#fff', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><Sparkles size={14}/> Buscar en iTunes</button>
                     <button onClick={async () => { const r = await invoke<{path:string, dataUrl:string}|null>('dialog:openImage'); if (r) setCoverSource({type:'file', path: r.path, dataUrl: r.dataUrl}); }} style={{ padding: '8px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}><Upload size={14}/> Subir Imagen</button>
                     {coverUrl && <button onClick={() => { setCoverSource(null); setMeta(m => ({ ...m, cover: null })); }} style={{ padding: '6px 12px', borderRadius: 8, background: 'transparent', color: '#fca5a5', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', border: 'none' }}><Trash2 size={12}/> Quitar</button>}
                  </div>
               </div>
               
               {/* GIANT INPUTS */}
               <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
                 <input value={meta.title || ''} onChange={e => setMeta({...meta, title: e.target.value})} placeholder="Título de la canción"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.textPrimary, fontSize: '2.4rem', fontWeight: 800, fontFamily: 'inherit', letterSpacing: '-0.02em', padding: '4px 8px', marginLeft: -8, borderRadius: 8, transition: 'background 0.2s' }}
                        onFocus={e => e.currentTarget.style.background = T.surfaceHover} onBlur={e => e.currentTarget.style.background = 'transparent'} />
                 <input value={meta.artist || ''} onChange={e => setMeta({...meta, artist: e.target.value})} placeholder="Artista"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.accent, fontSize: '1.4rem', fontWeight: 600, fontFamily: 'inherit', padding: '4px 8px', marginLeft: -8, borderRadius: 8, transition: 'background 0.2s' }}
                        onFocus={e => e.currentTarget.style.background = T.surfaceHover} onBlur={e => e.currentTarget.style.background = 'transparent'} />
                 <input value={meta.album || ''} onChange={e => setMeta({...meta, album: e.target.value})} placeholder="Álbum"
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: T.textSecondary, fontSize: '1.1rem', fontWeight: 500, fontFamily: 'inherit', padding: '4px 8px', marginLeft: -8, borderRadius: 8, transition: 'background 0.2s' }}
                        onFocus={e => e.currentTarget.style.background = T.surfaceHover} onBlur={e => e.currentTarget.style.background = 'transparent'} />
                 
                 {/* TOOLBAR */}
                 <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                    <button onClick={() => setShowCoverSearch(true)} style={{ padding: '8px 14px', borderRadius: 8, background: T.surface, border: `1px solid ${T.borderDim}`, color: T.textPrimary, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = T.surface}><Globe size={14}/> Buscar en iTunes</button>
                    <button onClick={() => setActiveTab(activeTab === 'lyrics' ? 'info' : 'lyrics')} style={{ padding: '8px 14px', borderRadius: 8, background: activeTab === 'lyrics' ? T.accentDim : T.surface, border: `1px solid ${activeTab === 'lyrics' ? T.accent : T.borderDim}`, color: activeTab === 'lyrics' ? T.accent : T.textPrimary, fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = activeTab === 'lyrics' ? T.accentDim : T.surfaceHover} onMouseLeave={e => e.currentTarget.style.background = activeTab === 'lyrics' ? T.accentDim : T.surface}><FileText size={14}/> {activeTab === 'lyrics' ? 'Cerrar Letras' : 'Editar Letras'}</button>
                 </div>
               </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div style={{ padding: '0 40px 40px', display: 'flex', flexDirection: 'column', gap: 30 }}>
               
               {activeTab === 'lyrics' ? (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                       <h4 style={{ margin: 0, fontSize: '1rem', color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={16}/> Letras</h4>
                       <button onClick={searchLyrics} disabled={searchingLyrics} style={{ padding: '6px 12px', borderRadius: 6, background: T.surface, border: `1px solid ${T.borderDim}`, color: T.textPrimary, fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', opacity: searchingLyrics ? 0.5 : 1 }}>
                          {searchingLyrics ? <div style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid transparent', borderTopColor: T.textPrimary, animation: 'spin 1s linear infinite' }} /> : <Search size={12} />}
                          Auto-completar
                       </button>
                     </div>
                     <div style={{ position: 'relative', height: 280, borderRadius: 12, border: `1px solid ${T.borderDim}`, background: T.inputBg, overflow: 'hidden' }}>
                       <textarea
                         value={meta.lyrics || ''}
                         onChange={e => setMeta({ ...meta, lyrics: e.target.value })}
                         placeholder="Pega las letras aquí..."
                         style={{ width: '100%', height: '100%', padding: 16, background: 'transparent', border: 'none', color: T.textPrimary, fontSize: '0.8rem', lineHeight: 1.6, outline: 'none', resize: 'none', fontFamily: 'monospace' }}
                       />
                     </div>
                  </motion.div>
               ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                       <div><label style={{ display: 'block', fontSize: '0.7rem', color: T.textMuted, marginBottom: 6, fontWeight: 600 }}>AÑO</label><input value={meta.year || ''} onChange={e => setMeta({...meta, year: e.target.value})} style={inputBase} /></div>
                       <div><label style={{ display: 'block', fontSize: '0.7rem', color: T.textMuted, marginBottom: 6, fontWeight: 600 }}>PISTA</label><input value={meta.track || ''} onChange={e => setMeta({...meta, track: e.target.value})} style={inputBase} /></div>
                       <div><label style={{ display: 'block', fontSize: '0.7rem', color: T.textMuted, marginBottom: 6, fontWeight: 600 }}>GÉNERO</label><input value={meta.genre || ''} onChange={e => setMeta({...meta, genre: e.target.value})} style={inputBase} /></div>
                    </div>
                    
                    <div style={{ background: T.surface, border: `1px solid ${T.borderDim}`, borderRadius: 12, padding: 16, display: 'flex', flexWrap: 'wrap', gap: 30 }}>
                       {fileStat?.size && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><HardDrive size={16} color={T.textMuted}/> <div><div style={{ fontSize: '0.65rem', color: T.textMuted }}>Tamaño</div><div style={{ fontSize: '0.8rem', color: T.textPrimary, fontWeight: 600 }}>{formatSize(fileStat.size)}</div></div></div>}
                       {meta.duration && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={16} color={T.textMuted}/> <div><div style={{ fontSize: '0.65rem', color: T.textMuted }}>Duración</div><div style={{ fontSize: '0.8rem', color: T.textPrimary, fontWeight: 600 }}>{formatDuration(meta.duration)}</div></div></div>}
                       {meta.bitrate && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Headphones size={16} color={T.textMuted}/> <div><div style={{ fontSize: '0.65rem', color: T.textMuted }}>Calidad</div><div style={{ fontSize: '0.8rem', color: T.textPrimary, fontWeight: 600 }}>{meta.bitrate} kbps</div></div></div>}
                       {meta.codec && <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Disc3 size={16} color={T.textMuted}/> <div><div style={{ fontSize: '0.65rem', color: T.textMuted }}>Formato</div><div style={{ fontSize: '0.8rem', color: T.textPrimary, fontWeight: 600 }}>{meta.codec.toUpperCase()}</div></div></div>}
                    </div>
                  </motion.div>
               )}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div style={{ padding: '16px 40px', background: T.headerBg, borderTop: `1px solid ${T.headerBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
             <div style={{ display: 'flex', gap: 8 }}>
                {queueMode && (
                   <>
                     <button onClick={onPrevious} style={{ padding: '8px 12px', borderRadius: 8, background: T.surface, border: `1px solid ${T.borderDim}`, color: T.textPrimary, cursor: 'pointer' }}><ArrowLeft size={16}/></button>
                     <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.textMuted, display: 'flex', alignItems: 'center', padding: '0 8px' }}>{currentIndex}/{totalCount}</span>
                     <button onClick={onNext} style={{ padding: '8px 12px', borderRadius: 8, background: T.surface, border: `1px solid ${T.borderDim}`, color: T.textPrimary, cursor: 'pointer' }}><ArrowRight size={16}/></button>
                   </>
                )}
             </div>
             <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 10, background: 'transparent', border: `1px solid ${T.borderDim}`, color: T.textPrimary, fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', borderRadius: 10, background: T.accent, border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                   {saving ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} /> : <Save size={16} />}
                   Guardar
                </button>
             </div>
          </div>
          
          {/* ITUNES MODAL OVERLAY */}
          <AnimatePresence>
            {showCoverSearch && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} style={{ background: T.containerBg, border: `1px solid ${T.containerBorder}`, borderRadius: 20, width: '100%', maxWidth: 700, maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
                     <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.headerBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', color: T.textPrimary, display: 'flex', alignItems: 'center', gap: 8 }}><Globe size={18} color={T.accent}/> Buscar en iTunes</h3>
                        <button onClick={() => setShowCoverSearch(false)} style={{ background: 'transparent', border: 'none', color: T.textSecondary, cursor: 'pointer' }}><X size={20}/></button>
                     </div>
                     <div style={{ padding: 24, flex: 1, overflowY: 'auto' }}>
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                           <input value={songQuery} onChange={e => setSongQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchSongs()} placeholder="Buscar canción, artista o álbum..." style={{ flex: 1, padding: '12px 16px', borderRadius: 10, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textPrimary, fontSize: '0.9rem', outline: 'none' }} />
                           <button onClick={searchSongs} disabled={searchingSongs} style={{ padding: '0 20px', borderRadius: 10, background: T.surface, border: `1px solid ${T.borderDim}`, color: T.textPrimary, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                             {searchingSongs ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.textPrimary, animation: 'spin 0.7s linear infinite' }} /> : <Search size={16} />}
                             Buscar
                           </button>
                        </div>
                        
                        {songResults.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                             {songResults.map(song => (
                               <div key={song.trackId} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 12, background: selectedSongId === song.trackId ? T.accentDim : T.surface, border: `1px solid ${selectedSongId === song.trackId ? T.accent : T.borderDim}`, cursor: 'pointer' }} onClick={() => applySong(song)}>
                                 <img src={song.cover || ''} alt="" style={{ width: 44, height: 44, borderRadius: 6, background: T.coverBg, objectFit: 'cover' }} />
                                 <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: T.textPrimary, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: T.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{song.artist} • {song.album}</div>
                                 </div>
                                 {selectedSongId === song.trackId && <Check size={20} color={T.accent} />}
                               </div>
                             ))}
                          </div>
                        )}
                     </div>
                  </motion.div>
               </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </motion.div>
  );

  return createPortal(modalContent, document.body);
};
