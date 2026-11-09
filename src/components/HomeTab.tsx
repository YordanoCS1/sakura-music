import { Play, Sparkles, Music2 } from 'lucide-react';
import type { ScannedTrack, DownloadItem } from '../types';

interface HomeTabProps {
  tracks: ScannedTrack[];
  favorites: string[];
  downloads: DownloadItem[];
  getCoverSrc: (coverUrl: string | null) => string;
  onPlayFirst: () => void;
  onPlayTrack: (track: ScannedTrack) => void;
  onGoLibrary: () => void;
}

export default function HomeTab({
  tracks,
  favorites,
  downloads,
  getCoverSrc,
  onPlayFirst,
  onPlayTrack,
  onGoLibrary,
}: HomeTabProps) {
  return (
    <div className="space-y-6 mb-24">
      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-card p-8 border border-white/10 bg-gradient-to-r from-accent-900/20 via-purple-900/20 to-transparent">
        <div className="max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-300 text-[11px] font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Experiencia Hi-Res Hi-Fi</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight mb-2">
            Sakura Music 2.0
          </h2>
          <p className="text-xs text-gray-300 mb-6 leading-relaxed">
            Reproducción sin pérdida impulsada por el núcleo de Rust, procesamiento multihilo y aceleración por GPU.
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={onPlayFirst}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 to-accent-400 text-white text-xs font-bold shadow-lg shadow-accent-500/25 hover:brightness-110 active:scale-95 transition-all">
              <Play className="w-4 h-4 fill-current" />
              <span>{tracks.length > 0 ? 'Reproducir Aleatorio' : 'Escanear Biblioteca'}</span>
            </button>
            <button
              onClick={onGoLibrary}
              className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all">
              Ver Biblioteca ({tracks.length})
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-[11px] text-gray-400 mb-1">Total Canciones</div>
          <div className="text-xl font-bold text-white font-mono">{tracks.length}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-[11px] text-gray-400 mb-1">Pistas FLAC Lossless</div>
          <div className="text-xl font-bold text-accent-400 font-mono">
            {tracks.filter(t => t.format.toUpperCase().includes('FLAC')).length}
          </div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-[11px] text-gray-400 mb-1">Favoritas</div>
          <div className="text-xl font-bold text-rose-400 font-mono">{favorites.length}</div>
        </div>
        <div className="glass-card p-4 rounded-2xl border border-white/5">
          <div className="text-[11px] text-gray-400 mb-1">Descargas en Cola</div>
          <div className="text-xl font-bold text-amber-400 font-mono">{downloads.length}</div>
        </div>
      </div>

      {/* Pistas Destacadas */}
      <div>
        <h3 className="text-sm font-bold text-white mb-3">Canciones Recientes</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {tracks.slice(0, 6).map(track => (
            <div
              key={track.id}
              onClick={() => onPlayTrack(track)}
              className="flex items-center gap-3 p-2.5 rounded-xl glass-card hover:bg-white/5 cursor-pointer border border-white/5">
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                {track.cover_url ? (
                  <img src={getCoverSrc(track.cover_url)} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-purple-900/30">
                    <Music2 className="w-4 h-4 text-accent-400" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{track.title}</div>
                <div className="text-[10px] text-gray-400 truncate">{track.artist}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
