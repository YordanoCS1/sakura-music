import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Heart, Volume2, Maximize2, Minimize2, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayback } from '../contexts/PlaybackContext';

interface Song { id: string; title: string; artist: string; cover?: string; duration: number; path: string; }

interface ZenPlayerProps {
  currentSong?: Song | null; isPlaying?: boolean; onPlayPause?: () => void; onNext?: () => void; onPrevious?: () => void; onSeek?: (time: number) => void; currentTime?: number; queue?: Song[];
}

export const ZenPlayer: React.FC<ZenPlayerProps> = ({ currentSong, isPlaying = false, onPlayPause, onNext, onPrevious, onSeek, currentTime: externalTime, queue = [] }) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [volume, setVolume] = useState(70);
  const [showVolume, setShowVolume] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const nextAudioRef = useRef<HTMLAudioElement | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const prevSongRef = useRef<string | null>(null);
  const nextSongRef = useRef<string | null>(null);
  const onNextRef = useRef(onNext);
  onNextRef.current = onNext;
  const ctx = usePlayback();

  useEffect(() => { ctx.setCurrentSong(currentSong || null); }, [currentSong]);
  useEffect(() => { ctx.setIsPlaying(isPlaying); }, [isPlaying]);
  useEffect(() => { ctx.setDuration(duration); }, [duration]);
  useEffect(() => { ctx.setCurrentTime(currentTime); }, [currentTime]);

  useEffect(() => {
    if (!audioRef.current) { audioRef.current = new Audio(); audioRef.current.preload = 'auto'; }
    if (!nextAudioRef.current) { nextAudioRef.current = new Audio(); nextAudioRef.current.preload = 'auto'; }
    const audio = audioRef.current;
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => { if (onNextRef.current) onNextRef.current(); };
    audio.addEventListener('timeupdate', onTimeUpdate); audio.addEventListener('durationchange', onDurationChange); audio.addEventListener('ended', onEnded);
    return () => { audio.removeEventListener('timeupdate', onTimeUpdate); audio.removeEventListener('durationchange', onDurationChange); audio.removeEventListener('ended', onEnded); };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (currentSong.path !== prevSongRef.current) { audio.src = currentSong.path; audio.load(); prevSongRef.current = currentSong.path; setCurrentTime(0); }
  }, [currentSong]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (isPlaying && audio.paused) audio.play().catch(() => {});
    else if (!isPlaying && !audio.paused) audio.pause();
  }, [isPlaying, currentSong]);

  useEffect(() => { const audio = audioRef.current; if (audio) audio.volume = volume / 100; }, [volume]);

  // Preload next song for gapless playback
  useEffect(() => {
    const next = nextAudioRef.current;
    if (!next || !currentSong || queue.length === 0) return;
    const idx = queue.findIndex(t => t.path === currentSong.path);
    const nextTrack = idx >= 0 && idx < queue.length - 1 ? queue[idx + 1] : queue[0];
    if (nextTrack && nextTrack.path !== nextSongRef.current) {
      next.src = nextTrack.path;
      next.load();
      nextSongRef.current = nextTrack.path;
    }
  }, [currentSong, queue]);

  const fmt = (s: number): string => { if (!s || isNaN(s)) return '0:00'; const m = Math.floor(s / 60), sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, '0')}`; };
  const sd = currentSong?.duration || duration;
  const progress = sd ? (currentTime / sd) * 100 : 0;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !sd) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const seekTime = pct * sd;
    if (audioRef.current) audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
    if (onSeek) onSeek(seekTime);
  };

  const idle = !currentSong;

  return (
    <motion.div initial={false} className={`fixed bottom-0 left-0 right-0 z-50 ${isExpanded ? 'h-auto' : ''}`}
      style={{ background: 'var(--player-bg, oklch(0.06 0.01 270 / 0.88))', backdropFilter: 'blur(24px)', borderTop: 'var(--player-border, 1px solid oklch(1 0 0 / 0.04))' }}>
      {!idle && (
        <div className="relative h-0.5 group cursor-pointer" ref={progressRef} onClick={handleSeek}
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="h-full transition-all duration-150 relative" style={{ width: '100%', transform: `scaleX(${progress / 100})`, transformOrigin: 'left', background: 'linear-gradient(90deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))' }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" style={{ boxShadow: '0 0 10px oklch(var(--zen-sakura-base) / 0.6)' }} />
          </div>
        </div>
      )}
      <div className="max-w-full mx-auto px-5" style={idle ? { padding: '10px 20px' } : {}}>
        {idle ? null : (
          <>
            <div className="flex items-center gap-3 py-2.5">
              <motion.div whileHover={{ scale: 1.04 }} onClick={() => setIsExpanded(!isExpanded)}
                style={{ width: 38, height: 38, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
                {currentSong.cover ? <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
                  : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={16} style={{ color: 'var(--text-dim)' }} /></div>}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-semibold truncate" style={{ color: 'rgba(255,255,255,0.85)' }}>{currentSong.title}</h3>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-label)' }}>{currentSong.artist}</p>
              </div>

              <div className="flex items-center gap-0.5">
                <motion.button whileTap={{ scale: 0.88 }} onClick={onPrevious} className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--text-label)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-body)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-label)'}>
                  <SkipBack size={15} />
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={onPlayPause}
                  style={{ width: 32, height: 32, borderRadius: '50%', background: 'oklch(var(--zen-sakura-base))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 12px oklch(var(--zen-sakura-base) / 0.3)' }}>
                  {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                </motion.button>
                <motion.button whileTap={{ scale: 0.88 }} onClick={onNext} className="p-1.5 rounded-lg transition-all"
                  style={{ color: 'var(--text-label)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-body)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-label)'}>
                  <SkipForward size={15} />
                </motion.button>
              </div>

              <div className="flex items-center gap-0.5">
                <motion.button whileTap={{ scale: 0.88 }} onClick={() => setIsLiked(!isLiked)}
                  className="p-1.5 rounded-lg transition-all" style={{ color: isLiked ? 'oklch(var(--zen-sakura-base))' : 'var(--text-dim)' }}>
                  <Heart size={14} fill={isLiked ? 'oklch(var(--zen-sakura-base))' : 'none'} />
                </motion.button>
                <div className="relative">
                  <button onClick={() => setShowVolume(!showVolume)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-dim)' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--text-nav)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                    <Volume2 size={14} />
                  </button>
                  {showVolume && <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 rounded-lg" style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <input type="range" min="0" max="100" value={volume} onChange={e => setVolume(parseInt(e.target.value))}
                      className="w-16 h-1" style={{ accentColor: 'oklch(var(--zen-sakura-base))' }} />
                  </motion.div>}
                </div>
                <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-dim)' }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--text-nav)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}>
                  {isExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isExpanded && <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex gap-5 pb-3 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 100, height: 100, borderRadius: 12, overflow: 'hidden', flexShrink: 0, border: 'var(--border-card)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                    {currentSong.cover ? <img src={currentSong.cover} alt="" className="w-full h-full object-cover" />
                      : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Music size={28} style={{ color: 'var(--text-dim)' }} /></div>}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>{currentSong.title}</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{currentSong.artist}</p>
                    <div className="flex items-center gap-3 mt-3">
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-label)' }}>{fmt(currentTime)}</span>
                      <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--bg-hover)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: '100%', transform: `scaleX(${progress / 100})`, transformOrigin: 'left', background: 'linear-gradient(90deg, oklch(var(--zen-sakura-light)), oklch(var(--zen-sakura-base)))' }} />
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-label)' }}>{fmt(sd)}</span>
                    </div>
                  </div>
                </div>
              </motion.div>}
            </AnimatePresence>
          </>
        )}
      </div>
    </motion.div>
  );
};
