import { useState } from 'react';
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
  Trash2,
} from 'lucide-react';
import type { AppInfo, PlayerStyle, ThemeOption } from '../types';
import ToolsPanel from './ToolsPanel';

const SWATCHES: Partial<Record<string, string>> = {
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

const PREVIEWS: Partial<Record<string, [string, string, string]>> = {
  space: ['#fff7f4', '#f472b6', '#be185d'],
  sumie: ['#0c0c0c', '#e8e5dd', '#b23a2b'],
  byobu: ['#1a1210', '#8c3b2e', '#e8dcc8'],
  shoji: ['#f3ebd9', '#a8442f', '#c9b28a'],
  origami: ['#fff8fa', '#d9547f', '#f3c9d8'],
  swiss: ['#ffffff', '#111111', '#f2f2f0'],
  sumiink: ['#0c0c0c', '#e8e5dd', '#9a968c'],
  moonlit: ['#0b1324', '#8fb6e8', '#dfe8f7'],
  ledger: ['#f4eddc', '#a33a2a', '#c9b99a'],
  yoru: ['#1a1008', '#f59e0b', '#fbbf24'],
  hanabi: ['#0a0a1a', '#22d3ee', '#d946ef'],
  aizuri: ['#0b2340', '#38bdf8', '#1e3a8a'],
};

const GLIFOS: Partial<Record<string, string>> = {
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
  theme: string;
  temas: ThemeOption[];
  remoteEnabled: boolean;
  remoteIp: string;
  onToggleRemote: () => void;
  onImportarTema: (json: string) => void;
  onAbrirGenerador: () => void;
  onBorrarTema: (id: string) => void;
  temasPersonalizadosIds: string[];
  onSetTheme: (t: string) => void;
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
  remoteEnabled,
  remoteIp,
  onToggleRemote,
  onImportarTema,
  onAbrirGenerador,
  onBorrarTema,
  temasPersonalizadosIds,
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
  const [jsonTema, setJsonTema] = useState('');
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
          <span className="settings-hero-barras">
            {(PREVIEWS[theme] ?? PREVIEWS.space!).map((color, i) => (
              <i key={i} style={{ background: color }} />
            ))}
          </span>
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
              const personalizado = temasPersonalizadosIds.includes(opcion.id);
              const [fondo, acento, suave] = PREVIEWS[opcion.id] ?? PREVIEWS.space!;
              return (
                <div key={opcion.id} className="set-theme-wrap">
                  <button
                    type="button"
                    onClick={() => onSetTheme(opcion.id)}
                    aria-pressed={activo}
                    className={`set-theme ${activo ? 'is-active' : ''}`}
                    style={
                      {
                        '--pv-bg': fondo,
                        '--pv-accent': acento,
                        '--pv-soft': suave,
                      } as React.CSSProperties
                    }
                  >
                    <span className="set-theme-preview">
                      <i />
                      <i />
                      <i />
                      <b>{GLIFOS[opcion.id] ?? '桜'}</b>
                    </span>
                    <span className="set-theme-info">
                      <span
                        className={`set-theme-swatch ${SWATCHES[opcion.id] ?? 'bg-neutral-400'}`}
                      />
                      <span className="set-theme-copy">
                        <strong>{opcion.nombre}</strong>
                        <small>{opcion.descripcion}</small>
                      </span>
                      {activo && (
                        <span className="set-theme-check">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </span>
                  </button>
                  {personalizado && (
                    <button
                      type="button"
                      className="set-theme-delete"
                      onClick={() => onBorrarTema(opcion.id)}
                      aria-label={`Borrar tema ${opcion.nombre}`}
                      title={`Borrar ${opcion.nombre}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
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

        <section className="set-card set-card-tema">
          <div className="set-card-head">
            <span className="set-card-icon">
              <Palette className="w-4 h-4" />
            </span>
            <div>
              <h3>Importar un tema</h3>
              <p>Cambiá la estructura completa con un tema del generador</p>
            </div>
          </div>
          <textarea
            className="set-json"
            value={jsonTema}
            onChange={(e) => setJsonTema(e.target.value)}
            placeholder="Pegá acá el JSON del generador de temas"
            spellCheck={false}
          />
          <div className="set-actions">
            <button type="button" onClick={onAbrirGenerador} className={accentBadge}>
              <Palette className="w-3.5 h-3.5" /> Abrir generador
            </button>
            <button
              type="button"
              onClick={() => onImportarTema(jsonTema)}
              disabled={!jsonTema.trim()}
            >
              Importar JSON
            </button>
          </div>
          <p className="set-note">
            Generalo en <code>docs/herramientas/generador-temas.html</code> y elegí el arquetipo que
            quieras para Home y biblioteca.
          </p>
        </section>

        <section className="set-card">
          <div className="set-card-head">
            <span className="set-card-icon">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3>Control remoto</h3>
              <p>Manejá la reproducción desde el celular en la misma Wi-Fi</p>
            </div>
          </div>
          <div className="set-toggle-row">
            <div>
              <strong>Servidor local</strong>
              <small>
                {remoteEnabled
                  ? `Activo en http://${remoteIp}:17342`
                  : 'Desactivado · abrí la IP desde otro dispositivo'}
              </small>
            </div>
            <button
              type="button"
              className="set-switch"
              aria-pressed={remoteEnabled}
              aria-label="Activar control remoto"
              onClick={onToggleRemote}
            >
              <span />
            </button>
          </div>
          {remoteEnabled && (
            <p className="set-note">
              Entrá a <b>http://{remoteIp}:17342</b> desde el celular conectado a la misma red.
            </p>
          )}
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
