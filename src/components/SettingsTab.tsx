import { Palette, Wind, Sparkles, Layers, Sliders, Cpu } from 'lucide-react';
import type { AppInfo, PlayerStyle, ThemeWorld } from '../types';

interface SettingsTabProps {
  accentGradient: string;
  accentBadge: string;
  themeWorld: ThemeWorld;
  isWWM: boolean;
  coverGlowActive: boolean;
  playerStyle: PlayerStyle;
  glassOpacity: number;
  glassBlur: number;
  ambientGlow: boolean;
  ambientParticles: boolean;
  appInfo: AppInfo | null;
  currentFolder: string | null;
  onSetThemeWorld: (w: ThemeWorld) => void;
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
  themeWorld,
  isWWM,
  coverGlowActive,
  playerStyle,
  glassOpacity,
  glassBlur,
  ambientGlow,
  ambientParticles,
  appInfo,
  currentFolder,
  onSetThemeWorld,
  onSetPlayerStyle,
  onSetGlassOpacity,
  onSetGlassBlur,
  onSetAmbientGlow,
  onSetAmbientParticles,
  onClearCache,
}: SettingsTabProps) {
  return (
    <div className="space-y-6 max-w-xl mb-24">
      <div>
        <h2 className="text-base font-bold text-white mb-1">Ajustes de Sakura Music</h2>
        <p className="text-xs text-gray-400">Personalización visual, diseño de interfaz y motor nativo</p>
      </div>

      {/* SECCIÓN: UNIVERSO VISUAL & ESTILO GLOBAL */}
      <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-5">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${accentGradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Universo y Diseño Visual</h3>
            <p className="text-xs text-gray-400">Elige la atmósfera cultural y estructural de la aplicación</p>
          </div>
        </div>

        {/* Tarjetas interactivas de mundos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">

          {/* Tarjeta 1: Sakura Zen */}
          <div
            onClick={() => onSetThemeWorld('sakura_zen')}
            className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
              themeWorld === 'sakura_zen'
                ? 'border-accent-500 ring-2 ring-accent-500/50 bg-gradient-to-br from-accent-950/40 via-purple-950/30 to-black/60 shadow-xl'
                : 'border-white/5 bg-white/[0.02] hover:border-accent-500/30 hover:bg-white/[0.04]'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🌸</span>
              {themeWorld === 'sakura_zen' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent-500 text-white shadow-sm">
                  Activo
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Sakura Zen</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              Estética japonesa, flor de cerezo, tonos violetas nocturnos, seda blanca y dock flotante.
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-accent-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-purple-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-rose-300"></div>
              <span className="text-[9px] text-gray-500 font-mono ml-1">Kioto Zen</span>
            </div>
          </div>

          {/* Tarjeta 2: Wuxia Jianghu */}
          <div
            onClick={() => onSetThemeWorld('where_winds_meet')}
            className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
              themeWorld === 'where_winds_meet'
                ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-gradient-to-br from-emerald-950/50 via-teal-950/40 to-black/60 shadow-xl'
                : 'border-white/5 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-white/[0.04]'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">🎋</span>
              {themeWorld === 'where_winds_meet' && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                  Activo
                </span>
              )}
            </div>
            <h4 className="text-xs font-bold text-white mb-1">Wuxia (武侠 · Jianghu)</h4>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              Estética tradicional china Wuxia: bosque de bambú brumoso, jade imperial, linternas cálidas de ámbar y libertad marcial.
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-teal-400"></div>
              <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
              <span className="text-[9px] text-emerald-400 font-mono ml-1 flex items-center gap-1">
                <Wind className="w-3 h-3" />
                <span>Jianghu Nature</span>
              </span>
            </div>
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
