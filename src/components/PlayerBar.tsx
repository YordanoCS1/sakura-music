import { useEffect, useState } from 'react';
import { Disc3, Heart, Music2, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { PlayerStyle, ScannedTrack } from '../types';

interface PlayerBarProps {
  playerStyle: PlayerStyle;
  activeTrack: ScannedTrack | null;
  favorites: string[];
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  audioRef: React.RefObject<HTMLAudioElement | null>;
  duration: number;
  volume: number;
  isMuted: boolean;
  getCoverSrc: (coverUrl: string | null) => string;
  formatTime: (secs: number) => string;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleMute: () => void;
  onVolumeChange: (v: number) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

export default function PlayerBar({
  playerStyle,
  activeTrack,
  favorites,
  isPlaying,
  isShuffle,
  repeatMode,
  audioRef,
  duration,
  volume,
  isMuted,
  getCoverSrc,
  formatTime,
  onTogglePlay,
  onNext,
  onPrevious,
  onSeek,
  onToggleShuffle,
  onCycleRepeat,
  onToggleMute,
  onVolumeChange,
  onToggleFavorite,
}: PlayerBarProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const updateTime = () => setCurrentTime(audio.currentTime);
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('seeked', updateTime);
    audio.addEventListener('loadedmetadata', updateTime);
    audio.addEventListener('durationchange', updateTime);
    updateTime();
    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('seeked', updateTime);
      audio.removeEventListener('loadedmetadata', updateTime);
      audio.removeEventListener('durationchange', updateTime);
    };
  }, [audioRef]);

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentTime(Number(event.currentTarget.value));
    onSeek(event);
  };

  const [expanded, setExpanded] = useState(false);
  const [dominantColor, setDominantColor] = useState<string>('180, 26, 90');

  useEffect(() => {
    if (!activeTrack?.cover_url) { setDominantColor('180, 26, 90'); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 48;
      canvas.height = 48;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 48, 48);
      try {
        const data = ctx.getImageData(0, 0, 48, 48).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] < 125) continue;
          r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        if (n) { r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n); setDominantColor(`${r}, ${g}, ${b}`); }
      } catch { /* cross-origin ignorado */ }
    };
    img.src = getCoverSrc(activeTrack.cover_url);
  }, [activeTrack?.cover_url]);

  const fav = activeTrack ? favorites.includes(activeTrack.id) : false;
  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`player-dock ${
      playerStyle === 'floating'
        ? "npr-dock-floating"
        : "npr-dock-fixed"
    }`}>
      <div className="npr-shell">
        {/* ── IZQUIERDA: portada + info ── */}
        <div className="npr-track">
          {activeTrack ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="npr-cover"
                title="Ver ahora reproduciendo">
                {activeTrack.cover_url ? (
                  <img src={getCoverSrc(activeTrack.cover_url)} alt={activeTrack.title} />
                ) : (
                  <div className="npr-cover-fallback"><Music2 className="w-6 h-6" /></div>
                )}
                <span className="npr-cover-glow" />
              </button>
              <div className="npr-meta">
                <div className="npr-title" title={activeTrack.title}>{activeTrack.title}</div>
                <div className="npr-artist" title={activeTrack.artist}>{activeTrack.artist}</div>
                <div className="npr-tags">
                  <span className="npr-fmt">{activeTrack.format}</span>
                  {activeTrack.year && <span className="npr-year">· {activeTrack.year}</span>}
                </div>
              </div>
              <button
                onClick={(e) => activeTrack && onToggleFavorite(activeTrack.id, e)}
                className={`npr-fav ${fav ? 'is-fav' : ''}`}
                title="Favorito">
                <Heart className="w-4 h-4" fill={fav ? 'currentColor' : 'none'} />
              </button>
            </>
          ) : (
            <div className="npr-empty">
              <Disc3 className="w-5 h-5" />
              <span>Sin pista seleccionada</span>
            </div>
          )}
        </div>

        {/* ── CENTRO: controles + progreso ── */}
        <div className="npr-center">
          <div className="npr-controls">
            <button onClick={onToggleShuffle} className={`npr-ctl ${isShuffle ? 'is-on' : ''}`} title="Aleatorio"><Shuffle /></button>
            <button onClick={onPrevious} className="npr-ctl" title="Anterior"><SkipBack /></button>
            <button onClick={onTogglePlay} className="npr-play" title={isPlaying ? 'Pausar' : 'Reproducir'}>
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>
            <button onClick={onNext} className="npr-ctl" title="Siguiente"><SkipForward /></button>
            <button onClick={onCycleRepeat} className={`npr-ctl ${repeatMode !== 'off' ? 'is-on' : ''}`} title={`Repetición: ${repeatMode}`}>
              {repeatMode === 'one' ? <Repeat1 /> : <Repeat />}
            </button>
          </div>
          <div className="npr-progress">
            <span className="npr-time">{formatTime(currentTime)}</span>
            <div className="npr-seek-wrap">
              <div className="npr-seek-fill" style={{ width: `${pct}%` }} />
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="npr-seek"
                aria-label="Progreso"
              />
            </div>
            <span className="npr-time">{formatTime(duration || (activeTrack?.duration ?? 0))}</span>
          </div>
        </div>

        {/* ── DERECHA: volumen ── */}
        <div className="npr-right">
          <button onClick={onToggleMute} className="npr-vol-btn" title="Silenciar">
            {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="npr-vol-wrap">
            <div className="npr-vol-fill" style={{ width: `${(isMuted ? 0 : volume) * 100}%` }} />
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="npr-vol"
              aria-label="Volumen"
              title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
            />
          </div>
        </div>
      </div>

      {expanded && (
        <div
          className="player-nowplaying"
          onClick={() => setExpanded(false)}
          style={{ background: `linear-gradient(160deg, rgba(${dominantColor}, 0.94), rgba(28, 12, 20, 0.97))` }}>
          <div className="np-sheen" aria-hidden="true" />
          <button type="button" onClick={() => setExpanded(false)} className="np-close" aria-label="Cerrar vista inmersiva">×</button>
          <div className="np-stage">
            <div className="np-art">
              {activeTrack?.cover_url ? (
                <img src={getCoverSrc(activeTrack.cover_url)} alt={activeTrack?.title ?? ''} />
              ) : (
                <div className="np-art-fallback"><Music2 /></div>
              )}
            </div>
            <div className="np-copy">
              <small>AHORA REPRODUCIENDO</small>
              <h2>{activeTrack?.title ?? 'Sin pista'}</h2>
              <p>{activeTrack?.artist ?? ''}{activeTrack?.album ? ` · ${activeTrack.album}` : ''}</p>
            </div>
            <div className="np-controls">
              <button onClick={onToggleShuffle} className={`np-ctl ${isShuffle ? 'is-on' : ''}`} title="Aleatorio"><Shuffle /></button>
              <button onClick={onPrevious} className="np-ctl" title="Anterior"><SkipBack /></button>
              <button onClick={onTogglePlay} className="np-play">{isPlaying ? <Pause /> : <Play />}</button>
              <button onClick={onNext} className="np-ctl" title="Siguiente"><SkipForward /></button>
              <button onClick={onCycleRepeat} className={`np-ctl ${repeatMode !== 'off' ? 'is-on' : ''}`} title={`Repetición: ${repeatMode}`}>
                {repeatMode === 'one' ? <Repeat1 /> : <Repeat />}
              </button>
            </div>
            <div className="np-seek">
              <span>{formatTime(currentTime)}</span>
              <input type="range" min={0} max={duration || 100} value={currentTime} onChange={handleSeek} className="np-seekbar" />
              <span>{formatTime(duration || (activeTrack?.duration ?? 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}