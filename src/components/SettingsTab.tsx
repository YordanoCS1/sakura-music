import { Palette, Sparkles, Layers, Sliders, Cpu, FolderOpen } from 'lucide-react';
import type { AppInfo, PlayerStyle } from '../types';

interface SettingsTabProps {
  accentGradient: string;
  accentBadge: string;
  isWWM: boolean;
  coverGlowActive: boolean;
  playerStyle: PlayerStyle;
  glassOpacity: number;
  glassBlur: number;
  ambientGlow: boolean;
  ambientParticles: boolean;
  appInfo: AppInfo | null;
  currentFolder: string | null;
  downloadFolder: string | null;
  downloadFolderError: string | null;
  onChooseDownloadFolder: () => void;
  onResetDownloadFolder: () => void;
  onSetPlayerStyle: (s: PlayerStyle) => void;
  onSetGlassOpacity: (v: number) => void;
  onSetGlassBlur: (v: number) => void;
  onSetAmbientGlow: (v: boolean) => void;
  onSetAmbientParticles: (v: boolean) => void;
  onClearCache: () => void;
}

export default function SettingsTab({
  accentGradient,
  accentBadge,
  isWWM,
  coverGlowActive,
  playerStyle,
  glassOpacity,
  glassBlur,
  ambientGlow,
  ambientParticles,
  appInfo,
  currentFolder,
  downloadFolder,
  downloadFolderError,
  onChooseDownloadFolder,
  onResetDownloadFolder,
  onSetPlayerStyle,
  onSetGlassOpacity,
  onSetGlassBlur,
  onSetAmbientGlow,
  onSetAmbientParticles,
  onClearCache,
}: SettingsTabProps) {
  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 mb-24">
      <div>
        <h2 className="text-base font-bold text-white mb-1">Ajustes de Sakura Music</h2>
        <p className="text-xs text-gray-400">Personalización visual, diseño de interfaz y motor nativo</p>
      </div>

      <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-white">Carpeta de descargas</h3>
          <p className="text-xs text-gray-400 mt-1">
            Las nuevas descargas se guardarán aquí. Si no eliges una carpeta, se usará la biblioteca actual o Música.
          </p>
        </div>
        <div className="rounded-xl bg-black/20 border border-white/5 px-3 py-2">
          <p className="text-[11px] text-gray-300 font-mono break-all">
            {downloadFolder || currentFolder || 'Carpeta Música predeterminada'}
          </p>
          {!downloadFolder && (
            <p className="text-[10px] text-gray-500 mt-1">Destino automático (no se fijó una carpeta)</p>
          )}
        </div>
        {downloadFolderError && (
          <p role="alert" className="text-xs text-rose-300">{downloadFolderError}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onChooseDownloadFolder}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${accentBadge}`}>
            <FolderOpen className="w-3.5 h-3.5" />
            Elegir carpeta
          </button>
          {downloadFolder && (
            <button
              type="button"
              onClick={onResetDownloadFolder}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs font-semibold transition-colors">
              Usar destino automático
            </button>
          )}
        </div>
      </div>

      {/* SECCIÓN: UNIVERSO VISUAL & ESTILO GLOBAL */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${accentGradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Diseño Visual</h3>
            <p className="text-xs text-gray-400">La aplicación usa el tema único M3 Zen · Material 3 con calma japonesa</p>
          </div>
        </div>

        {/* Info del tema M3 Zen */}
        <div className="relative p-4 rounded-2xl border border-accent-500/40 ring-2 ring-accent-500/30 bg-gradient-to-br from-accent-950/40 via-purple-950/30 to-black/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">🌸</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500 text-white shadow-sm">Activo</span>
          </div>
          <h4 className="text-xs font-bold text-white mb-1">M3 Zen · Sakura</h4>
          <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
            Superficies claras de Material 3, acento rosa sakura, calma zen y un reproductor inmersivo con la portada protagonista.
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-full bg-rose-500"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-pink-400"></div>
            <div className="w-3.5 h-3.5 rounded-full bg-rose-200"></div>
            <span className="text-[9px] text-gray-500 font-mono ml-1">Sakura Zen</span>
          </div>
        </div>

        {/* Estilo del Reproductor */}
        <div className="pt-3 border-t border-white/5">
          <label className="text-xs font-semibold text-gray-300 block mb-2.5">
            Diseño del Reproductor:
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onSetPlayerStyle('floating')}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                playerStyle === 'floating'
                  ? `${accentBadge} shadow-md`
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cápsula Flotante (Dock)</span>
            </button>
            <button
              type="button"
              onClick={() => onSetPlayerStyle('fixed')}
              className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                playerStyle === 'fixed'
                  ? `${accentBadge} shadow-md`
                  : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
              }`}>
              <Layers className="w-3.5 h-3.5" />
              <span>Barra Fija Continua</span>
            </button>
          </div>
        </div>

        {/* Controles de Vidrio (Glassmorphism Sliders) */}
        <div className="pt-3 border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-gray-300">Ajuste de Efectos de Cristal</h4>
              <p className="text-[10px] text-gray-500">Personaliza la opacidad y el desenfoque en tiempo real</p>
            </div>
            <Sliders className="w-4 h-4 text-gray-500" />
          </div>

          {/* Slider Opacidad */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 text-[11px]">Opacidad del Vidrio:</span>
              <span className="text-white font-mono text-[11px]">{glassOpacity}%</span>
            </div>
            <input
              type="range"
              min={15}
              max={95}
              value={glassOpacity}
              onChange={(e) => onSetGlassOpacity(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Slider Blur */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 text-[11px]">Desenfoque (Backdrop Blur):</span>
              <span className="text-white font-mono text-[11px]">{glassBlur}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={glassBlur}
              onChange={(e) => onSetGlassBlur(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
            />
          </div>

          {/* Toggle Resplandor Ambiental */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs font-semibold text-gray-300 block">Resplandor Ambiental Fluido (Dynamic Glow)</span>
              <span className="text-[10px] text-gray-500">
                {coverGlowActive ? "Sincronizado con los colores de la carátula activa" : "Auras de color en las esquinas aceleradas por GPU"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSetAmbientGlow(!ambientGlow)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                ambientGlow ? (isWWM ? 'bg-emerald-500' : 'bg-accent-500') : 'bg-white/10'
              }`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                ambientGlow ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Toggle Partículas Atmosféricas */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <div>
              <span className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
                <span>{isWWM ? '🎋' : '🌸'}</span>
                <span>Efectos Atmosféricos de Partículas</span>
              </span>
              <span className="text-[10px] text-gray-500">
                {isWWM
                  ? 'Chispas doradas de linterna y bruma ligera de Jianghu'
                  : 'Pétalos suaves de flor de cerezo cayendo con la brisa'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSetAmbientParticles(!ambientParticles)}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                ambientParticles ? (isWWM ? 'bg-emerald-500' : 'bg-accent-500') : 'bg-white/10'
              }`}>
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                ambientParticles ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>
        </div>

      </div>

      {/* Tarjeta de Especificaciones Técnicas */}
      <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
        <h3 className="text-xs font-bold text-white flex items-center gap-2">
          <Cpu className="w-4 h-4 text-accent-400" />
          <span>Motor Nativo Tauri 2 + Rust</span>
        </h3>

        <div className="space-y-2 text-xs">
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-gray-400">Versión del Compilador:</span>
            <span className="text-white font-mono">{appInfo?.rust_version ?? 'rustc'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-gray-400">Consumo de Memoria Base:</span>
            <span className="text-emerald-400 font-mono font-semibold">{appInfo?.memory_usage ?? '—'}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-gray-400">Escaneo Multihilo:</span>
            <span className="text-accent-300 font-mono">Rayon Parallel Engine (Activo)</span>
          </div>
          <div className="flex justify-between py-1 border-b border-white/5">
            <span className="text-gray-400">Decodificador de Tags Hi-Res:</span>
            <span className="text-cyan-300 font-mono">Lofty 0.21 (Lossless FLAC/ALAC/ID3v2)</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-gray-400">Carpeta Activa:</span>
            <span className="text-gray-300 font-mono text-[11px] truncate max-w-[200px]">{currentFolder ?? 'Ninguna'}</span>
          </div>
        </div>
      </div>

      {/* Botón para reiniciar caché */}
      <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-white">Caché de Biblioteca</h4>
          <p className="text-[11px] text-gray-400">Borra los índices locales de canciones y carátulas</p>
        </div>
        <button
          onClick={onClearCache}
          className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors">
          Limpiar Caché
        </button>
      </div>

    </div>
  );
}
