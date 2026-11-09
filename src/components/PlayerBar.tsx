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
  currentTime: number;
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
  currentTime,
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
  return (
    <div className={
      playerStyle === 'floating'
        ? "absolute bottom-4 left-72 right-8 z-30 transition-all duration-300"
        : "absolute bottom-0 left-64 right-0 z-30 transition-all duration-300"
    }>
      <div className={
        playerStyle === 'floating'
          ? `glass-surface rounded-2xl p-3.5 flex items-center justify-between gap-6 shadow-2xl border ${isWWM ? 'border-emerald-500/20 shadow-emerald-950/40' : 'border-white/10 shadow-accent-950/30'}`
          : `glass-surface p-3.5 flex items-center justify-between gap-6 shadow-2xl border-t ${isWWM ? 'border-emerald-500/30 bg-[#07160f]/90' : 'border-white/10 bg-[#12071a]/90'}`
      }>

        {/* Información de Pista Actual */}
        <div className="flex items-center gap-3.5 min-w-[220px] max-w-xs">
          {activeTrack ? (
            <>
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md border border-white/10">
                {activeTrack.cover_url ? (
                  <img
                    src={getCoverSrc(activeTrack.cover_url)}
                    alt={activeTrack.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-purple-900/40 flex items-center justify-center">
                    <Music2 className={`w-5 h-5 ${accentText}`} />
                  </div>
                )}
              </div>
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
        <div className="flex-1 max-w-lg flex flex-col items-center gap-1.5">
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
                onChange={onSeek}
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
    </div>
  );
}
