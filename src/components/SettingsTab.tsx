import {
  Palette,
  Sparkles,
  Layers,
  Sliders,
  Cpu,
  FolderOpen,
  Minimize2,
  Check,
  Music2,
} from 'lucide-react';
import type { AppInfo, PlayerStyle, ThemeMode, ThemeOption } from '../types';
import ToolsPanel from './ToolsPanel';

const SWATCHES: Record<ThemeMode, string> = {
  space: 'bg-rose-400',
  sumie: 'bg-[#b23a2b]',
  byobu: 'bg-[#8c3b2e]',
  shoji: 'bg-[#a8442f]',
  origami: 'bg-[#d9547f]',
  swiss: 'bg-neutral-800',
  sumiink: 'bg-neutral-100',
  moonlit: 'bg-sky-300',
  ledger: 'bg-[#a33a2a]',
  yoru: 'bg-amber-400',
  hanabi: 'bg-cyan-400',
  aizuri: 'bg-sky-400',
};

const GLIFOS: Partial<Record<ThemeMode, string>> = {
  space: '桜',
  sumie: '墨',
  byobu: '屏',
  shoji: '障',
  origami: '折',
  swiss: '＋',
  sumiink: '墨',
  moonlit: '月',
  ledger: '帳',
  yoru: '夜',
  hanabi: '花',
  aizuri: '藍',
};

interface SettingsTabProps {
  theme: ThemeMode;
  temas: ThemeOption[];
  onSetTheme: (t: ThemeMode) => void;
  accentGradient: string;
  accentBadge: string;
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

/** Ajustes con identidad visual propia, adaptable a todos los temas. */
export default function SettingsTab({
  theme,
  temas,
  onSetTheme,
  accentGradient,
  accentBadge,
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
  const nombreTema = temas.find((t) => t.id === theme)?.nombre ?? 'Sakura';
  const estilos: { id: PlayerStyle; label: string; icono: typeof Sparkles }[] = [
    { id: 'floating', label: 'Cápsula flotante', icono: Sparkles },
    { id: 'fixed', label: 'Barra fija', icono: Layers },
    { id: 'mini', label: 'Mini', icono: Minimize2 },
  ];

  const Interruptor = ({
    activo,
    alCambiar,
    etiqueta,
  }: {
    activo: boolean;
    alCambiar: () => void;
    etiqueta: string;
  }) => (
    <button
      type="button"
      className="set-switch"
      aria-pressed={activo}
      aria-label={etiqueta}
      onClick={alCambiar}
    >
      <span />
    </button>
  );

  return (
    <div className="settings-view">
      <header className="settings-hero">
        <div className={`settings-hero-mark bg-gradient-to-tr ${accentGradient}`}>
          {GLIFOS[theme] ?? '桜'}
        </div>
        <div className="settings-hero-copy">
          <p className="settings-hero-kicker">PERSONALIZACIÓN</p>
          <h2>Ajustes de Sakura Music</h2>
          <p>Interfaz, efectos y motor nativo en un solo lugar.</p>
        </div>
        <div className="settings-hero-tema">
          <small>TEMA ACTIVO</small>
          <strong>{nombreTema}</strong>
        </div>
      </header>

      <div className="settings-grid">
        <section className="set-card set-card-tema">
          <div className="set-card-head">
            <span className="set-card-icon">
              <Palette className="w-4 h-4" />
            </span>
            <div>
              <h3>Diseño visual</h3>
              <p>Elegí el tema de la aplicación</p>
            </div>
          </div>
          <div className="set-themes">
            {temas.map((opcion) => {
              const activo = opcion.id === theme;
              return (
                <button
                  key={opcion.id}
                  type="button"
                  onClick={() => onSetTheme(opcion.id)}
                  aria-pressed={activo}
                  className={`set-theme ${activo ? 'is-active' : ''}`}
                >
                  <span className={`set-theme-swatch ${SWATCHES[opcion.id]}`} />
                  <span className="set-theme-copy">
                    <strong>{opcion.nombre}</strong>
                    <small>{opcion.descripcion}</small>
                  </span>
                  {activo && (
                    <span className="set-theme-check">
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="set-note">El cambio se aplica al instante y se guarda.</p>
        </section>

        <section className="set-card">
          <div className="set-card-head">
            <span className="set-card-icon">
              <Music2 className="w-4 h-4" />
            </span>
            <div>
              <h3>Reproductor</h3>
              <p>Cómo se muestra la barra de reproducción</p>
            </div>
          </div>
          <div className="set-segmented">
            {estilos.map(({ id, label, icono: Icono }) => (
              <button
                key={id}
                type="button"
                onClick={() => onSetPlayerStyle(id)}
                aria-pressed={playerStyle === id}
                className={playerStyle === id ? 'is-active' : ''}
              >
                <Icono className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <p className="set-note">
            El mini reproductor reduce la ventana y la mantiene siempre encima.
          </p>
        </section>

        <section className="set-card">
          <div className="set-card-head">
            <span className="set-card-icon">
              <Sliders className="w-4 h-4" />
            </span>
            <div>
              <h3>Efectos de cristal</h3>
              <p>Opacidad, desenfoque y atmósfera</p>
            </div>
          </div>
          <div className="set-slider">
            <div className="set-slider-head">
              <span>Opacidad del vidrio</span>
              <b>{glassOpacity}%</b>
            </div>
            <input
              type="range"
              min={15}
              max={95}
              value={glassOpacity}
              onChange={(e) => onSetGlassOpacity(parseInt(e.target.value, 10))}
              className="set-range"
            />
          </div>
          <div className="set-slider">
            <div className="set-slider-head">
              <span>Desenfoque de fondo</span>
              <b>{glassBlur}px</b>
            </div>
            <input
              type="range"
              min={0}
              max={32}
              value={glassBlur}
              onChange={(e) => onSetGlassBlur(parseInt(e.target.value, 10))}
              className="set-range"
            />
          </div>
          <div className="set-toggle-row">
            <div>
              <strong>Resplandor ambiental</strong>
              <small>
                {coverGlowActive
                  ? 'Sincronizado con la carátula activa'
                  : 'Auras de color en las esquinas'}
              </small>
            </div>
            <Interruptor
              activo={ambientGlow}
              alCambiar={() => onSetAmbientGlow(!ambientGlow)}
              etiqueta="Resplandor ambiental"
            />
          </div>
          <div className="set-toggle-row">
            <div>
              <strong>Pétalos de sakura</strong>
              <small>Partículas atmosféricas cayendo con la brisa</small>
            </div>
            <Interruptor
              activo={ambientParticles}
              alCambiar={() => onSetAmbientParticles(!ambientParticles)}
              etiqueta="Partículas atmosféricas"
            />
          </div>
        </section>

        <section className="set-card">
          <div className="set-card-head">
            <span className="set-card-icon">
              <FolderOpen className="w-4 h-4" />
            </span>
            <div>
              <h3>Carpeta de descargas</h3>
              <p>Destino de las nuevas canciones</p>
            </div>
          </div>
          <div className="set-path">
            {downloadFolder || currentFolder || 'Carpeta Música predeterminada'}
          </div>
          {downloadFolderError && <p className="set-error">{downloadFolderError}</p>}
          <div className="set-actions">
            <button type="button" onClick={onChooseDownloadFolder} className={accentBadge}>
              <FolderOpen className="w-3.5 h-3.5" /> Elegir carpeta
            </button>
            {downloadFolder && (
              <button type="button" onClick={onResetDownloadFolder} className="set-btn-secondary">
                Usar destino automático
              </button>
            )}
          </div>
        </section>

        <section className="set-card">
          <ToolsPanel />
        </section>

        <section className="set-card">
          <div className="set-card-head">
            <span className="set-card-icon">
              <Cpu className="w-4 h-4" />
            </span>
            <div>
              <h3>Motor Nativo Tauri 2 + Rust</h3>
              <p>Rendimiento y escaneo paralelo</p>
            </div>
          </div>
          <dl className="set-specs">
            <div>
              <dt>Compilador</dt>
              <dd>{appInfo?.rust_version ?? 'rustc'}</dd>
            </div>
            <div>
              <dt>Memoria base</dt>
              <dd>{appInfo?.memory_usage ?? '—'}</dd>
            </div>
            <div>
              <dt>Escaneo</dt>
              <dd>Rayon · multihilo</dd>
            </div>
            <div>
              <dt>Etiquetas</dt>
              <dd>Lofty · FLAC/ALAC/ID3v2</dd>
            </div>
            <div>
              <dt>Carpeta activa</dt>
              <dd>{currentFolder ?? 'Ninguna'}</dd>
            </div>
          </dl>
        </section>

        <section className="set-card set-card-cache">
          <div>
            <h3>Caché de biblioteca</h3>
            <p>Borra los índices locales de canciones y carátulas.</p>
          </div>
          <button type="button" onClick={onClearCache} className="set-btn-danger">
            Limpiar caché
          </button>
        </section>
      </div>
    </div>
  );
}
