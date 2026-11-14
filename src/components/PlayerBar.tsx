import { useEffect, useRef, useState } from 'react';
import { Disc3, Heart, Music2, Pause, Pencil, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import type { PlayerStyle, ScannedTrack } from '../types';

interface PlayerBarProps {
  playerStyle: PlayerStyle;
  isWWM: boolean;
  accentText: string;
  tagText: string;
  playButtonGradient: string;
  glowColor: string;
  seekAccent: string;
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
  onOpenEdit: (track: ScannedTrack) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
}

export default function PlayerBar({
  playerStyle,
  isWWM,
  accentText,
  tagText,
  playButtonGradient,
  glowColor,
  seekAccent,
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
  onOpenEdit,
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
  const coverColorRef = useRef<HTMLImageElement | null>(null);

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

  return (
    <div className={`player-dock ${
      playerStyle === 'floating'
        ? "absolute bottom-4 left-72 right-8 z-30 transition-all duration-300"
        : "absolute bottom-0 left-64 right-0 z-30 transition-all duration-300"
    }`}>
      <div className={`player-bar-inner ${
        playerStyle === 'floating'
          ? `glass-surface rounded-2xl p-3.5 flex items-center justify-between gap-6 shadow-2xl border ${isWWM ? 'border-emerald-500/20 shadow-emerald-950/40' : 'border-white/10 shadow-accent-950/30'}`
          : `glass-surface p-3.5 flex items-center justify-between gap-6 shadow-2xl border-t ${isWWM ? 'border-emerald-500/30 bg-[#07160f]/90' : 'border-white/10 bg-[#12071a]/90'}`
      }`}>
        <div className="player-vinyl" aria-hidden="true"><span /></div>

        {/* Información de Pista Actual */}
        <div className="flex items-center gap-3.5 min-w-[220px] max-w-xs">
          {activeTrack ? (
            <>
              <button
                type="button"
                onClick={() => setExpanded(true)}
                title="Ver ahora reproduciendo"
                aria-label="Abrir vista grande de la canción"
                className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md border border-white/10 cursor-pointer transition-transform hover:scale-105 focus:outline-none group">
                {activeTrack.cover_url ? (
                  <img
                    ref={coverColorRef}
                    src={getCoverSrc(activeTrack.cover_url)}
                    alt={activeTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-900/40 flex items-center justify-center">
                    <Music2 className={`w-5 h-5 ${accentText}`} />
                  </div>
                )}
              </button>
              <div className="min-w-0 flex-1 max-w-[200px] sm:max-w-xs overflow-hidden">
                {activeTrack.title.length > 25 ? (
                  <div className="marquee-container" title={activeTrack.title}>
                    <div className="marquee-content animate">
                      <span className="text-xs font-bold text-white pr-6">{activeTrack.title}</span>
                      <span className="text-xs font-bold text-white/50 pr-6">·</span>
                      <span className="text-xs font-bold text-white pr-6">{activeTrack.title}</span>
                    </div>
                  </div>
                ) : (
                  <h4 className="text-xs font-bold text-white truncate" title={activeTrack.title}>
                    {activeTrack.title}
                  </h4>
                )}
                <p className="text-[11px] text-gray-400 truncate" title={activeTrack.artist}>
                  {activeTrack.artist}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`text-[9px] ${tagText} font-mono uppercase font-semibold`}>
                    {activeTrack.format} Lossless
                  </span>
                  {activeTrack.year && (
                    <span className="text-[9px] text-gray-500 font-mono">· {activeTrack.year}</span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-gray-500 flex items-center gap-2">
              <Disc3 className="w-4 h-4" />
              <span>Sin pista seleccionada</span>
            </div>
          )}
        </div>

        {/* Controles de Reproducción y Scrubber Real */}
        <div className={`player-center flex-1 max-w-lg flex flex-col items-center gap-1.5 ${isPlaying ? 'is-playing' : ''}`}>
          <div className="flex items-center gap-4">

            {/* Shuffle */}
            <button
              onClick={onToggleShuffle}
              className={`p-1 transition-colors ${isShuffle ? accentText : 'text-gray-500 hover:text-white'}`}
              title="Reproducción aleatoria">
              <Shuffle className="w-3.5 h-3.5" />
            </button>

            {/* Anterior */}
            <button
              onClick={onPrevious}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Canción anterior">
              <SkipBack className="w-4 h-4" />
            </button>

            {/* Play / Pausa */}
            <button
              onClick={onTogglePlay}
              className={`w-9 h-9 rounded-full bg-gradient-to-tr ${playButtonGradient} hover:opacity-95 text-white flex items-center justify-center shadow-lg ${glowColor} transition-transform active:scale-95`}>
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Siguiente */}
            <button
              onClick={onNext}
              className="text-gray-400 hover:text-white transition-colors p-1"
              title="Siguiente canción">
              <SkipForward className="w-4 h-4" />
            </button>

            {/* Repetir */}
            <button
              onClick={onCycleRepeat}
              className={`p-1 transition-colors ${repeatMode !== 'off' ? accentText : 'text-gray-500 hover:text-white'}`}
              title={`Modo de repetición: ${repeatMode}`}>
              {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
            </button>
            <div className="player-visualizer" aria-hidden="true">
              {Array.from({ length: 10 }, (_, index) => <span key={index} />)}
            </div>
          </div>

          {/* Barra de progreso real e interactiva */}
          <div className="w-full flex items-center gap-2.5 text-[10px] font-mono text-gray-400">
            <span className="w-8 text-right">{formatTime(currentTime)}</span>

            <div className="flex-1 flex items-center relative">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className={`w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer ${seekAccent} focus:outline-none`}
              />
            </div>

            <span className="w-8">{formatTime(duration || (activeTrack?.duration ?? 0))}</span>
          </div>
        </div>

        {/* Acciones Adicionales y Control de Volumen Real */}
        <div className="flex items-center gap-3 min-w-[200px] justify-end text-gray-400">

          {/* Botón Editar en el Player */}
          {activeTrack && (
            <button
              onClick={() => onOpenEdit(activeTrack)}
              className="hover:text-cyan-400 transition-colors"
              title="Editar metadatos">
              <Pencil className="w-4 h-4" />
            </button>
          )}

          {/* Botón Favorito en el Player */}
          {activeTrack && (
            <button
              onClick={(e) => onToggleFavorite(activeTrack.id, e)}
              className={`hover:${accentText} transition-colors`}
              title="Favorito">
              <Heart className={`w-4 h-4 ${favorites.includes(activeTrack.id) ? `${accentText} fill-current` : ''}`} />
            </button>
          )}

          {/* Silencio / Volumen */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={onToggleMute}
              className="hover:text-white transition-colors p-0.5">
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-gray-400 hover:text-white" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const newVol = parseFloat(e.target.value);
                onVolumeChange(newVol);
              }}
              className="w-20 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-accent-500 focus:outline-none"
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

          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="np-close"
            aria-label="Cerrar vista inmersiva">
            ×
          </button>

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
              <button onClick={onTogglePlay} className="np-play">
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <button onClick={onNext} className="np-ctl" title="Siguiente"><SkipForward /></button>
              <button onClick={onCycleRepeat} className={`np-ctl ${repeatMode !== 'off' ? 'is-on' : ''}`} title={`Repetición: ${repeatMode}`}>
                {repeatMode === 'one' ? <Repeat1 /> : <Repeat />}
              </button>
            </div>

            <div className="np-seek">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={handleSeek}
                className="np-seekbar"
              />
              <span>{formatTime(duration || (activeTrack?.duration ?? 0))}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
