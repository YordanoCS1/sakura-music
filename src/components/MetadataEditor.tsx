import React, { useState, useEffect, useRef } from 'react';
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

function fmt(sec: number | null): string {
  if (!sec) return '--:--';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function fileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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

  const coverUrl = coverSource?.type === 'file' ? coverSource.dataUrl
    : coverSource?.type === 'url' ? coverSource.url : meta.cover;

  useEffect(() => { setCoverError(false); }, [coverUrl, coverSource]);
  useEffect(() => { loadMetadata(); }, [file.path]);

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '10px 13px', borderRadius: 8, fontSize: '0.82rem', outline: 'none',
    background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.textPrimary,
    transition: 'border 0.2s, box-shadow 0.2s', fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  };

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

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 50, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
        background: T.overlay, backdropFilter: 'blur(8px) saturate(1.2)',
      }}
      onClick={onClose}
    >
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 38, height: 38, borderRadius: '50%',
            border: `3px solid ${T.spinnerTrack}`, borderTopColor: T.accent,
            animation: 'spin 0.7s linear infinite',
          }} />
          <span style={{ fontSize: '0.8rem', color: T.textSecondary, fontWeight: 500 }}>
            Cargando metadatos...
          </span>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 14 }}
          transition={{ type: 'spring', damping: 26, stiffness: 300, mass: 0.9 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: '100%', maxWidth: 920, maxHeight: '92vh', borderRadius: 20,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            background: T.containerBg,
            border: `1px solid ${T.containerBorder}`,
            boxShadow: `0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px ${T.borderDim}`,
          }}
        >
          {/* HEADER */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 22px', borderBottom: `1px solid ${T.headerBorder}`,
            flexShrink: 0, background: T.headerBg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: T.accentDim, display: 'flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0,
              }}>
                <Tag size={16} color={T.accent} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{
                  fontSize: '0.88rem', fontWeight: 700, color: T.textPrimary,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  Editor de metadatos
                </span>
                <span style={{
                  fontSize: '0.63rem', color: T.textMuted,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontFamily: 'monospace',
                }}>
                  {file.name.replace(/\.[^/.]+$/, '')}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {queueMode && (
                <>
                  <button onClick={onPrevious} title="Anterior"
                    style={{
                      width: 30, height: 30, borderRadius: 7, border: 'none',
                      background: 'transparent', color: T.textSecondary, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.textPrimary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; }}
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 600, color: T.textMuted,
                    minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums',
                    background: T.surface, padding: '3px 5px', borderRadius: 5,
                  }}>
                    {currentIndex}/{totalCount}
                  </span>
                  <button onClick={onNext} title="Siguiente"
                    style={{
                      width: 30, height: 30, borderRadius: 7, border: 'none',
                      background: 'transparent', color: T.textSecondary, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.textPrimary; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; }}
                  >
                    <ArrowRight size={14} />
                  </button>
                  <div style={{ width: 1, height: 22, background: T.borderDim, margin: '0 10px' }} />
                </>
              )}
              <button onClick={onClose} title="Cerrar"
                style={{
                  width: 30, height: 30, borderRadius: 7, border: 'none',
                  background: 'transparent', color: T.textSecondary, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = '#f87171'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* BODY - two column */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* LEFT SIDEBAR */}
            <div style={{
              width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 14,
              padding: '18px 16px', borderRight: `1px solid ${T.sidebarBorder}`,
              background: T.sidebarBg, overflowY: 'auto',
            }}>
              {/* Cover */}
              <div style={{
                width: '100%', aspectRatio: '1/1', borderRadius: 14, overflow: 'hidden',
                background: T.coverBg, border: `1px solid ${T.borderDim}`,
                position: 'relative', boxShadow: `0 6px 24px rgba(0,0,0,0.35), inset 0 1px 0 ${T.borderDim}`,
              }}>
                {coverUrl && !coverError ? (
                  <img src={coverUrl} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={() => setCoverError(true)}
                  />
                ) : (
                  <div style={{
                    width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    <Music2 size={44} color={T.textMuted} opacity={0.4} />
                    <span style={{ fontSize: '0.6rem', color: T.textMuted, opacity: 0.5 }}>
                      Sin portada
                    </span>
                  </div>
                )}
              </div>
              {/* Cover controls */}
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={searchCovers} title="Buscar portada en iTunes"
                  style={{
                    flex: 1, padding: '7px 0', borderRadius: 7, border: 'none',
                    background: T.accentDim, color: T.accent, cursor: 'pointer',
                    fontSize: '0.6rem', fontWeight: 700, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: 5,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = `${T.accent}28`}
                  onMouseLeave={e => e.currentTarget.style.background = T.accentDim}
                >
                  <Sparkles size={10} /> iTunes
                </button>
                <button onClick={async () => {
                  try {
                    const r = await invoke<{ path: string; dataUrl: string } | null>('dialog:openImage');
                    if (r) setCoverSource({ type: 'file', path: r.path, dataUrl: r.dataUrl });
                  } catch {}
                }} title="Subir imagen"
                  style={{
                    padding: '7px 10px', borderRadius: 7, border: `1px solid ${T.borderDim}`,
                    background: 'transparent', color: T.textSecondary, cursor: 'pointer',
                    fontSize: '0.6rem', fontWeight: 600, display: 'flex', alignItems: 'center',
                    gap: 4, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Upload size={10} /> Subir
                </button>
                {coverUrl && (
                  <button onClick={() => { setCoverSource(null); setMeta(m => ({ ...m, cover: null })); }}
                    title="Quitar portada"
                    style={{
                      padding: '7px 8px', borderRadius: 7, border: `1px solid ${T.borderDim}`,
                      background: 'transparent', color: T.textMuted, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = '#f87171'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textMuted; }}
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
              {/* Cover search results */}
              <AnimatePresence>
                {showCoverSearch && (
                  <motion.div {...fadeSlide} transition={{ duration: 0.15 }}
                    style={{
                      background: T.surface, border: `1px solid ${T.borderDim}`,
                      borderRadius: 10, padding: 10,
                    }}
                  >
                    <div style={{
                      fontSize: '0.58rem', fontWeight: 700, color: T.textMuted,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5,
                    }}>
                      <Image size={10} /> Portadas {coverResults.length > 0 && `(${coverResults.length})`}
                    </div>
                    {searchingCover ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.accent,
                          animation: 'spin 0.7s linear infinite',
                        }} />
                      </div>
                    ) : coverResults.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                        {coverResults.slice(0, 9).map((c, i) => (
                          <button key={i} onClick={() => setCoverSource({ type: 'url', url: c.url })}
                            style={{
                              aspectRatio: '1', borderRadius: 6, overflow: 'hidden', cursor: 'pointer',
                              padding: 0,
                              border: coverSource?.type === 'url' && coverSource.url === c.url
                                ? `2px solid ${T.accent}` : '2px solid transparent',
                              background: T.coverBg,
                              outline: 'none',
                              transition: 'border 0.12s, transform 0.12s',
                              transform: coverSource?.type === 'url' && coverSource.url === c.url ? 'scale(0.95)' : 'scale(1)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                            onMouseLeave={e => {
                              const isSelected = coverSource?.type === 'url' && coverSource.url === c.url;
                              e.currentTarget.style.transform = isSelected ? 'scale(0.95)' : 'scale(1)';
                            }}
                          >
                            <img src={c.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.7rem', color: T.textMuted, textAlign: 'center', padding: '6px 0' }}>
                        Sin resultados
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 'auto' }}>
                {meta.duration != null && statRow(<Clock size={12} />, 'Duración', fmt(meta.duration))}
                {meta.bitrate != null && statRow(<Headphones size={12} />, 'Bitrate', `${meta.bitrate} kbps`)}
                {meta.codec && statRow(<Disc3 size={12} />, 'Formato', meta.codec.toUpperCase())}
                {meta.sampleRate != null && statRow(<Waves size={12} />, 'Sample', `${Math.round(meta.sampleRate / 1000)} kHz`)}
                {fileStat?.size != null && fileStat.size > 0 && statRow(<HardDrive size={12} />, 'Tamaño', fileSize(fileStat.size))}
              </div>
            </div>

            {/* RIGHT CONTENT */}
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}>
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '20px 24px',
                display: 'flex', flexDirection: 'column', gap: 22,
              }}>
                {/* METADATA FIELDS */}
                <div style={{
                  background: T.surface, border: `1px solid ${T.borderDim}`,
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: T.accentDim,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <PenLine size={13} color={T.accent} />
                    </div>
                    <div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, color: T.textPrimary,
                      }}>Metadatos</span>
                      <span style={{
                        fontSize: '0.6rem', color: T.textMuted, marginLeft: 8,
                      }}>Información de la canción</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Título', icon: <Music size={12} />, val: meta.title || '', key: 'title', placeholder: 'Título de la canción' },
                        { label: 'Artista', icon: <User size={12} />, val: meta.artist || '', key: 'artist', placeholder: 'Nombre del artista' },
                        { label: 'Álbum', icon: <DiscAlbum size={12} />, val: meta.album || '', key: 'album', placeholder: 'Nombre del álbum' },
                      ].map((f, i) => (
                        <div key={f.key}>
                          <div style={{
                            fontSize: '0.62rem', fontWeight: 600, color: T.textSecondary,
                            marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            <span style={{ opacity: 0.6 }}>{f.icon}</span>
                            {f.label}
                          </div>
                          <div style={{ position: 'relative' }}>
                            <input type="text" value={f.val} placeholder={f.placeholder}
                              onChange={e => setMeta(m => ({ ...m, [f.key]: e.target.value }))}
                              style={inputBase}
                              onFocus={e => { e.currentTarget.style.borderColor = T.inputFocusBorder; e.currentTarget.style.boxShadow = T.inputFocusShadow; }}
                              onBlur={e => { e.currentTarget.style.borderColor = T.inputBorder; e.currentTarget.style.boxShadow = 'none'; }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
                      {[
                        { label: 'Año', icon: <Calendar size={12} />, val: meta.year || '', key: 'year', placeholder: '2024' },
                        { label: 'Pista', icon: <Hash size={12} />, val: meta.track || '', key: 'track', placeholder: '1' },
                        { label: 'Género', icon: <Guitar size={12} />, val: meta.genre || '', key: 'genre', placeholder: 'Pop' },
                        { label: 'Compositor', icon: <Mic2 size={12} />, val: meta.composer || '', key: 'composer', placeholder: 'Compositor' },
                      ].map(f => (
                        <div key={f.key}>
                          <div style={{
                            fontSize: '0.62rem', fontWeight: 600, color: T.textSecondary,
                            marginBottom: 5, display: 'flex', alignItems: 'center', gap: 5,
                          }}>
                            <span style={{ opacity: 0.6 }}>{f.icon}</span>
                            {f.label}
                          </div>
                          <input type="text" value={f.val} placeholder={f.placeholder}
                            onChange={e => setMeta(m => ({ ...m, [f.key]: e.target.value }))}
                            style={inputBase}
                            onFocus={e => { e.currentTarget.style.borderColor = T.inputFocusBorder; e.currentTarget.style.boxShadow = T.inputFocusShadow; }}
                            onBlur={e => { e.currentTarget.style.borderColor = T.inputBorder; e.currentTarget.style.boxShadow = 'none'; }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* iTUNES AUTOCOMPLETE */}
                <div style={{
                  background: T.surface, border: `1px solid ${T.borderDim}`,
                  borderRadius: 14, padding: '18px 20px',
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14,
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: 8, background: T.accentDim,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Globe size={13} color={T.accent} />
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: T.textPrimary }}>
                        Autocompletar desde iTunes
                      </span>
                      <span style={{ fontSize: '0.6rem', color: T.textMuted, marginLeft: 8 }}>
                        Busca y rellena automáticamente
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <Search size={13} style={{
                        position: 'absolute', left: 11, top: '50%',
                        transform: 'translateY(-50%)', color: T.textMuted,
                        pointerEvents: 'none', opacity: 0.7,
                      }} />
                      <input type="text" value={songQuery} onChange={e => setSongQuery(e.target.value)}
                        placeholder="Buscar por canción, artista o álbum..."
                        style={{
                          width: '100%', padding: '9px 10px 9px 34px', borderRadius: 8,
                          fontSize: '0.8rem', outline: 'none', fontFamily: 'inherit',
                          background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                          color: T.textPrimary, transition: 'border 0.2s, box-shadow 0.2s',
                          boxSizing: 'border-box' as const,
                        }}
                        onFocus={e => { e.currentTarget.style.borderColor = T.inputFocusBorder; e.currentTarget.style.boxShadow = T.inputFocusShadow; }}
                        onBlur={e => { e.currentTarget.style.borderColor = T.inputBorder; e.currentTarget.style.boxShadow = 'none'; }}
                        onKeyDown={e => e.key === 'Enter' && searchSongs()} />
                    </div>
                    <button onClick={searchSongs} disabled={searchingSongs}
                      style={{
                        padding: '9px 20px', borderRadius: 8, border: 'none',
                        background: T.accent, color: '#fff', cursor: 'pointer',
                        fontSize: '0.75rem', fontWeight: 700, display: 'flex',
                        alignItems: 'center', gap: 6, transition: 'all 0.15s',
                        opacity: searchingSongs ? 0.6 : 1, whiteSpace: 'nowrap',
                        fontFamily: 'inherit',
                      }}
                      onMouseEnter={e => { if (!searchingSongs) e.currentTarget.style.boxShadow = `0 0 14px ${T.accent}40`; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      {searchingSongs ? (
                        <div style={{
                          width: 12, height: 12, borderRadius: '50%',
                          border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                          animation: 'spin 0.7s linear infinite',
                        }} />
                      ) : <Search size={13} />}
                      Buscar
                    </button>
                  </div>
                  <AnimatePresence>
                    {searchingSongs && (
                      <motion.div {...fadeSlide} style={{ display: 'flex', justifyContent: 'center', padding: 18 }}>
                        <div style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.accent,
                          animation: 'spin 0.7s linear infinite',
                        }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {!searchingSongs && songResults.length > 0 && (
                    <div style={{
                      marginTop: 10, maxHeight: 180, overflowY: 'auto',
                      display: 'flex', flexDirection: 'column', gap: 2,
                      borderRadius: 10, border: `1px solid ${T.borderDim}`,
                      padding: 6, background: T.sidebarBg,
                    }}>
                      {songResults.map(song => {
                        const isSelected = selectedSongId === song.trackId;
                        return (
                          <button key={song.trackId} onClick={() => applySong(song)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 10,
                              padding: '8px 10px', borderRadius: 7, textAlign: 'left',
                              border: 'none', background: isSelected ? T.accentDim : 'transparent',
                              cursor: 'pointer', transition: 'background 0.1s', width: '100%',
                              fontFamily: 'inherit',
                            }}
                            onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = T.surfaceHover; }}
                            onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent'; }}
                          >
                            <div style={{
                              width: 34, height: 34, borderRadius: 6, overflow: 'hidden',
                              flexShrink: 0, background: T.coverBg, display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                            }}>
                              {song.cover
                                ? <img src={song.cover} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <Music size={13} color={T.textMuted} />}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                fontSize: '0.78rem', fontWeight: 600, color: T.textPrimary,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {song.title || 'Sin título'}
                              </div>
                              <div style={{
                                fontSize: '0.63rem', color: T.textMuted,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {song.artist}{song.album ? ` · ${song.album}` : ''}{song.year ? ` · ${song.year}` : ''}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {song.duration ? (
                                <span style={{
                                  fontSize: '0.6rem', color: T.textMuted,
                                  fontVariantNumeric: 'tabular-nums',
                                }}>
                                  {fmt(song.duration)}
                                </span>
                              ) : null}
                              {isSelected && <Check size={14} color={T.accent} />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* LYRICS */}
                <div style={{
                  background: T.surface, border: `1px solid ${T.borderDim}`,
                  borderRadius: 14, padding: '18px 20px',
                  display: 'flex', flexDirection: 'column', flex: 1,
                }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
                    justifyContent: 'space-between',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8, background: T.accentDim,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        <FileText size={13} color={T.accent} />
                      </div>
                      <div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: T.textPrimary }}>
                          Letras
                        </span>
                        <span style={{ fontSize: '0.6rem', color: T.textMuted, marginLeft: 8 }}>
                          {lrcMode ? 'Sincronizadas — editando timestamps' : 'Edita o busca automáticamente'}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {lrcMode && playback.isPlaying && playback.currentSong?.path === file.path && (
                        <span style={{
                          fontSize: '0.6rem', color: T.accent, fontWeight: 600,
                          display: 'flex', alignItems: 'center', gap: 4,
                          padding: '3px 8px', borderRadius: 5, background: T.accentDim,
                        }}>
                          <Play size={9} fill={T.accent} /> Preview
                        </span>
                      )}
                      <button onClick={() => {
                        if (lrcMode) {
                          setMeta({ ...meta, lyrics: buildLRC({ lines: lrcLines, meta: lrcMeta }) });
                        } else if (meta.lyrics && isLRC(meta.lyrics)) {
                          const parsed = parseLRC(meta.lyrics);
                          setLrcLines(parsed.lines);
                          setLrcMeta(parsed.meta);
                        }
                        setLrcMode(!lrcMode);
                      }}
                        style={{
                          fontSize: '0.55rem', fontWeight: 700, padding: '4px 10px', borderRadius: 6,
                          border: `1px solid ${lrcMode ? T.accent : T.borderDim}`,
                          background: lrcMode ? T.accentDim : 'transparent',
                          color: lrcMode ? T.accent : T.textMuted, cursor: 'pointer',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { if (!lrcMode) { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; }}}
                        onMouseLeave={e => { if (!lrcMode) { e.currentTarget.style.borderColor = T.borderDim; e.currentTarget.style.color = T.textMuted; }}}
                      >
                        {lrcMode ? 'Texto plano' : 'Sincronizado'}
                      </button>
                      <button onClick={searchLyrics} disabled={searchingLyrics}
                        style={{
                          fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: 5,
                          padding: '5px 14px', borderRadius: 7,
                          border: `1px solid ${T.borderDim}`, background: 'transparent',
                          color: T.textSecondary, cursor: 'pointer', fontWeight: 600,
                          transition: 'all 0.15s', fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.accent; e.currentTarget.style.borderColor = `${T.accent}44`; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; e.currentTarget.style.borderColor = T.borderDim; }}
                      >
                        {searchingLyrics ? (
                          <div style={{
                            width: 10, height: 10, borderRadius: '50%',
                            border: `2px solid ${T.spinnerTrack}`, borderTopColor: T.accent,
                            animation: 'spin 0.7s linear infinite',
                          }} />
                        ) : <Search size={10} />}
                        Buscar
                      </button>
                    </div>
                  </div>
                  {lrcMode ? (
                    <div ref={lyricsRef} style={{
                      flex: 1, overflowY: 'auto', background: T.inputBg,
                      border: `1px solid ${T.inputBorder}`, borderRadius: 9, padding: '6px 8px',
                    }}>
                      {lrcLines.length === 0 && (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          padding: 20, color: T.textMuted, fontSize: '0.75rem', opacity: 0.6,
                        }}>
                          Sin líneas — escribe timestamps manualmente o pega letras con formato LRC
                        </div>
                      )}
                      {lrcLines.map((line, idx) => {
                        const isActive = idx === currentLine;
                        return (
                          <div key={idx} data-active={isActive ? 'true' : 'false'}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px',
                              borderRadius: 6, marginBottom: 2,
                              background: isActive ? T.accentDim : 'transparent',
                              border: isActive ? `1px solid ${T.accent}44` : '1px solid transparent',
                              transition: 'all 0.12s',
                            }}
                          >
                            <input type="text"
                              value={`[${String(Math.floor(line.time / 60)).padStart(2, '0')}:${String(Math.floor(line.time % 60)).padStart(2, '0')}.${String(Math.round((line.time - Math.floor(line.time)) * 100)).padStart(2, '0')}]`}
                              onChange={e => {
                                const match = e.target.value.match(/\[(\d{2}):(\d{2})\.?(\d{0,2})?\]/);
                                if (match) {
                                  const newTime = parseInt(match[1]) * 60 + parseInt(match[2]) + (parseInt(match[3] || '0') / 100);
                                  const newLines = [...lrcLines];
                                  newLines[idx] = { ...newLines[idx], time: newTime };
                                  newLines.sort((a, b) => a.time - b.time);
                                  setLrcLines(newLines);
                                }
                              }}
                              placeholder="[00:00.00]"
                              style={{
                                width: 72, flexShrink: 0, padding: '3px 5px', borderRadius: 4,
                                fontSize: '0.65rem', fontFamily: 'monospace', outline: 'none',
                                border: 'none', background: isActive ? `${T.accent}15` : T.inputBg,
                                color: isActive ? T.accent : T.textSecondary, textAlign: 'center',
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            />
                            <input type="text" value={line.text}
                              onChange={e => {
                                const newLines = [...lrcLines];
                                newLines[idx] = { ...newLines[idx], text: e.target.value };
                                setLrcLines(newLines);
                              }}
                              placeholder="Escribe la letra aquí..."
                              style={{
                                flex: 1, padding: '3px 6px', borderRadius: 4,
                                fontSize: '0.78rem', outline: 'none', border: 'none',
                                background: 'transparent', color: isActive ? T.textPrimary : T.textSecondary,
                                fontFamily: 'inherit',
                              }}
                            />
                            <button onClick={() => {
                              setLrcLines(lrcLines.filter((_, i) => i !== idx));
                            }}
                              style={{
                                width: 20, height: 20, borderRadius: 4, border: 'none',
                                background: 'transparent', color: T.textMuted, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                opacity: 0.4, transition: 'opacity 0.1s', flexShrink: 0, padding: 0,
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#f87171'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = T.textMuted; }}
                            >
                              <MinusCircle size={12} />
                            </button>
                          </div>
                        );
                      })}
                      <button onClick={() => {
                        setLrcLines([...lrcLines, { time: 0, text: '' }]);
                      }}
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                          width: '100%', padding: '6px 0', marginTop: 4,
                          borderRadius: 6, border: `1px dashed ${T.borderDim}`,
                          background: 'transparent', color: T.textMuted, cursor: 'pointer',
                          fontSize: '0.65rem', fontWeight: 600, transition: 'all 0.12s',
                          fontFamily: 'inherit',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.color = T.accent; e.currentTarget.style.background = T.accentDim; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = T.borderDim; e.currentTarget.style.color = T.textMuted; e.currentTarget.style.background = 'transparent'; }}
                      >
                        <Plus size={11} /> Añadir línea
                      </button>
                    </div>
                  ) : (
                    <textarea value={meta.lyrics || ''} onChange={e => setMeta({ ...meta, lyrics: e.target.value })}
                      rows={6} placeholder="Escribe o pega las letras aquí..."
                      style={{
                        width: '100%', padding: '12px 14px', borderRadius: 9,
                        fontSize: '0.8rem', outline: 'none', resize: 'vertical',
                        lineHeight: '1.8', fontFamily: 'inherit',
                        background: T.inputBg, border: `1px solid ${T.inputBorder}`,
                        color: T.textPrimary, transition: 'border 0.2s, box-shadow 0.2s',
                        minHeight: 90, flex: 1, boxSizing: 'border-box' as const,
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = T.inputFocusBorder; e.currentTarget.style.boxShadow = T.inputFocusShadow; }}
                      onBlur={e => { e.currentTarget.style.borderColor = T.inputBorder; e.currentTarget.style.boxShadow = 'none'; }} />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 22px', borderTop: `1px solid ${T.borderMid}`,
            flexShrink: 0, background: T.headerBg,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {meta.artist && meta.title ? (
                <span style={{ fontSize: '0.72rem', color: T.textMuted }}>
                  <span style={{ color: T.textSecondary, fontWeight: 600 }}>{meta.artist}</span>
                  <span style={{ color: T.textMuted }}> — </span>
                  <span style={{ color: T.textSecondary, fontWeight: 600 }}>{meta.title}</span>
                </span>
              ) : (
                <span style={{ fontSize: '0.72rem', color: T.textMuted }}>{file.name}</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: `1px solid ${T.borderDim}`,
                  background: 'transparent', color: T.textSecondary, cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.textPrimary; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textSecondary; }}
              >
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{
                  padding: '8px 24px', borderRadius: 8, border: 'none',
                  background: T.accentGradient, color: '#fff', cursor: 'pointer',
                  fontSize: '0.78rem', fontWeight: 700, display: 'flex',
                  alignItems: 'center', gap: 8, transition: 'all 0.2s',
                  opacity: saving ? 0.6 : 1,
                  boxShadow: `0 2px 12px ${T.accent}30`,
                  fontFamily: 'inherit',
                }}
                onMouseEnter={e => {
                  if (!saving) {
                    e.currentTarget.style.boxShadow = `0 4px 22px ${T.accent}50`;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={e => {
                  if (!saving) {
                    e.currentTarget.style.boxShadow = `0 2px 12px ${T.accent}30`;
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {saving ? (
                  <div style={{
                    width: 13, height: 13, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                  }} />
                ) : <Save size={14} />}
                Guardar cambios
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
