import { useState, type CSSProperties } from 'react';
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
  Download,
  Activity,
  Wand2,
  Wifi,
  Database,
  Link2,
} from 'lucide-react';
import type { AppInfo, PlayerStyle, ThemeOption } from '../types';
import { GLIFOS, PREVIEWS, SWATCHES } from '../themes/themeMeta';
import ThemeGallery from './ThemeGallery';
import ToolsPanel from './ToolsPanel';
import SystemPanel from './SystemPanel';

interface SettingsTabProps {
  theme: string;
  temas: ThemeOption[];
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
  remoteEnabled: boolean;
  remoteIp: string;
  onToggleRemote: () => void;
  onAbrirGenerador: () => void;
  onBorrarTema: (id: string) => void;
  temasPersonalizadosIds: string[];
  onImportarTema: (json: string) => void;
  onGuardarTema: (tema: import('../themes/customThemes').TemaPersonalizado) => void;
}

type Seccion = 'tema' | 'player' | 'efectos' | 'archivos' | 'sistema';

/** Ajustes con navegación lateral y jerarquía editorial. */
export default function SettingsTab(props: SettingsTabProps) {
  const {
    theme,
    temas,
    onSetTheme,
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
    remoteEnabled,
    remoteIp,
    onToggleRemote,
    onAbrirGenerador,
    onBorrarTema,
    temasPersonalizadosIds,
    onImportarTema,
  } = props;

  const [seccion, setSeccion] = useState<Seccion>('tema');
  const [jsonTema, setJsonTema] = useState('');
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);

  const nombreTema = temas.find((t) => t.id === theme)?.nombre ?? 'Sakura';
  const [bg, acento, suave] = PREVIEWS[theme] ?? PREVIEWS.space!;

  const nav: { id: Seccion; label: string; icono: typeof Palette }[] = [
    { id: 'tema', label: 'Apariencia', icono: Palette },
    { id: 'player', label: 'Reproductor', icono: Music2 },
    { id: 'efectos', label: 'Efectos', icono: Sparkles },
    { id: 'archivos', label: 'Archivos', icono: FolderOpen },
    { id: 'sistema', label: 'Sistema', icono: Cpu },
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

  const Tarjeta = ({
    n,
    titulo,
    desc,
    icono: Icono,
    children,
    ancha,
  }: {
    n: string;
    titulo: string;
    desc: string;
    icono: typeof Palette;
    children: React.ReactNode;
    ancha?: boolean;
  }) => (
    <section className={`set-card ${ancha ? 'set-card-wide' : ''}`}>
      <header className="set-card-head">
        <span className="set-card-num">{n}</span>
        <span className="set-card-icon">
          <Icono className="w-4 h-4" />
        </span>
        <div className="set-card-tit">
          <h3>{titulo}</h3>
          <p>{desc}</p>
        </div>
      </header>
      <div className="set-card-body">{children}</div>
    </section>
  );

  const temasJSX = (
    <div className="set-themes">
      {temas.map((opcion) => {
        const activo = opcion.id === theme;
        const personalizado = temasPersonalizadosIds.includes(opcion.id);
        const [f, a, s] = PREVIEWS[opcion.id] ?? PREVIEWS.space!;
        return (
          <div key={opcion.id} className="set-theme-wrap">
            <button
              type="button"
              onClick={() => onSetTheme(opcion.id)}
              aria-pressed={activo}
              className={`set-theme ${activo ? 'is-active' : ''}`}
              style={{ '--pv-bg': f, '--pv-accent': a, '--pv-soft': s } as CSSProperties}
            >
              <span className="set-theme-preview">
                <i />
                <i />
                <i />
                <b>{GLIFOS[opcion.id] ?? '桜'}</b>
              </span>
              <span className="set-theme-info">
                <span
                  className="set-theme-swatch"
                  style={{ background: SWATCHES[opcion.id] ?? '#888' }}
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
  );

  const contenido: Record<Seccion, React.ReactNode> = {
    tema: (
      <>
        <section
          className="set-hero-preview"
          style={{ '--pv-bg': bg, '--pv-accent': acento, '--pv-text': suave } as CSSProperties}
        >
          <div className="set-hero-info">
            <span className="set-hero-kicker">TEMA ACTIVO · VISTA PREVIA</span>
            <strong>{nombreTema}</strong>
            <span className="set-hero-desc">{temas.find((t) => t.id === theme)?.descripcion}</span>
            <span className="set-hero-barras">
              {[bg, acento, suave].map((c, i) => (
                <i key={i} style={{ background: c }} />
              ))}
            </span>
          </div>
          <div className="set-hero-mock" aria-hidden="true">
            <div className="set-mock-bar">
              <span className="set-mock-glifo">{GLIFOS[theme] ?? '桜'}</span>
              <span className="set-mock-brand">SAKURA</span>
              <span className="set-mock-dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="set-mock-body">
              <div className="set-mock-side">
                <i />
                <i />
                <i />
                <i />
              </div>
              <div className="set-mock-main">
                <span className="set-mock-line lg" />
                <span className="set-mock-line md" />
                <div className="set-mock-cards">
                  <i />
                  <i />
                  <i />
                </div>
              </div>
            </div>
          </div>
        </section>
        <Tarjeta
          n="01"
          titulo="Biblioteca de temas"
          desc="Elegí la apariencia de la app"
          icono={Palette}
          ancha
        >
          <div className="set-actions">
            <button type="button" onClick={() => setGaleriaAbierta(true)} className={accentBadge}>
              <Palette className="w-3.5 h-3.5" /> Abrir galería de temas
            </button>
          </div>
          {temasJSX}
          <p className="set-note">El cambio se aplica al instante y se guarda.</p>
        </Tarjeta>
        <Tarjeta
          n="02"
          titulo="Generador de temas"
          desc="Creá uno nuevo con tu paleta"
          icono={Wand2}
          ancha
        >
          <div className="set-actions">
            <button type="button" onClick={onAbrirGenerador} className={accentBadge}>
              <Palette className="w-3.5 h-3.5" /> Abrir generador
            </button>
          </div>
          <textarea
            className="set-json"
            value={jsonTema}
            onChange={(e) => setJsonTema(e.target.value)}
            placeholder="…o pegá acá el JSON de un tema"
            spellCheck={false}
          />
          <div className="set-actions">
            <button
              type="button"
              onClick={() => onImportarTema(jsonTema)}
              disabled={!jsonTema.trim()}
            >
              <Link2 className="w-3.5 h-3.5" /> Importar JSON
            </button>
          </div>
        </Tarjeta>
      </>
    ),
    player: (
      <Tarjeta
        n="03"
        titulo="Estilo del reproductor"
        desc="Cómo se muestra la barra de reproducción"
        icono={Music2}
        ancha
      >
        <div className="set-segmented">
          {(
            [
              { id: 'floating', label: 'Cápsula flotante', icono: Sparkles },
              { id: 'fixed', label: 'Barra fija', icono: Layers },
              { id: 'mini', label: 'Mini', icono: Minimize2 },
            ] as const
          ).map(({ id, label, icono: Icono }) => (
            <button
              key={id}
              type="button"
              onClick={() => onSetPlayerStyle(id)}
              aria-pressed={playerStyle === id}
              className={playerStyle === id ? 'is-active' : ''}
            >
              <Icono className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <p className="set-note">
          El mini reproductor reduce la ventana y la mantiene siempre encima.
        </p>
      </Tarjeta>
    ),
    efectos: (
      <Tarjeta
        n="04"
        titulo="Efectos de cristal"
        desc="Opacidad, desenfoque y atmósfera"
        icono={Sliders}
        ancha
      >
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
              {coverGlowActive ? 'Sincronizado con la carátula' : 'Auras de color en las esquinas'}
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
            <small>Partículas cayendo con la brisa</small>
          </div>
          <Interruptor
            activo={ambientParticles}
            alCambiar={() => onSetAmbientParticles(!ambientParticles)}
            etiqueta="Partículas atmosféricas"
          />
        </div>
      </Tarjeta>
    ),
    archivos: (
      <>
        <Tarjeta
          n="05"
          titulo="Carpeta de descargas"
          desc="Destino de las nuevas canciones"
          icono={FolderOpen}
          ancha
        >
          <div className="set-path">
            {downloadFolder || currentFolder || 'Carpeta Música predeterminada'}
          </div>
          {downloadFolderError && <p className="set-error">{downloadFolderError}</p>}
          <div className="set-actions">
            <button type="button" onClick={onChooseDownloadFolder} className={accentBadge}>
              <FolderOpen className="w-3.5 h-3.5" /> Elegir carpeta
            </button>
            {downloadFolder && (
              <button type="button" onClick={onResetDownloadFolder}>
                Usar destino automático
              </button>
            )}
          </div>
        </Tarjeta>
        <Tarjeta
          n="06"
          titulo="Herramientas de descarga"
          desc="yt-dlp y FFmpeg"
          icono={Download}
          ancha
        >
          <ToolsPanel />
        </Tarjeta>
      </>
    ),
    sistema: (
      <>
        <Tarjeta
          n="07"
          titulo="Control remoto"
          desc="Manejá la reproducción desde el celular"
          icono={Wifi}
          ancha
        >
          <div className="set-toggle-row">
            <div>
              <strong>Servidor local</strong>
              <small>{remoteEnabled ? `Activo en http://${remoteIp}:17342` : 'Desactivado'}</small>
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
              Entrá a <b>http://{remoteIp}:17342</b> desde el celular en la misma red.
            </p>
          )}
        </Tarjeta>
        <Tarjeta n="08" titulo="Motor nativo" desc="Tauri 2 + Rust" icono={Cpu} ancha>
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
        </Tarjeta>
        <Tarjeta
          n="09"
          titulo="Caché de biblioteca"
          desc="Índices locales de canciones y carátulas"
          icono={Database}
          ancha
        >
          <div className="set-actions">
            <button type="button" onClick={onClearCache} className="set-btn-danger">
              <Trash2 className="w-3.5 h-3.5" /> Limpiar caché
            </button>
          </div>
        </Tarjeta>
        <Tarjeta
          n="10"
          titulo="Salud de la base de datos"
          desc="Verificación, compactado y registros"
          icono={Activity}
          ancha
        >
          <SystemPanel />
        </Tarjeta>
      </>
    ),
  };

  if (galeriaAbierta) {
    return (
      <ThemeGallery
        theme={theme}
        temas={temas}
        onSetTheme={onSetTheme}
        onClose={() => setGaleriaAbierta(false)}
      />
    );
  }

  return (
    <div className="settings-view">
      <aside className="settings-nav">
        <div className="settings-nav-brand">
          <span className="settings-nav-glifo">{GLIFOS[theme] ?? '桜'}</span>
          <div>
            <strong>Ajustes</strong>
            <small>{nombreTema}</small>
          </div>
        </div>
        <nav>
          {nav.map(({ id, label, icono: Icono }) => (
            <button
              key={id}
              type="button"
              className={seccion === id ? 'is-active' : ''}
              onClick={() => setSeccion(id)}
            >
              <Icono className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="settings-nav-foot">SAKURA MUSIC · v2.0</div>
      </aside>

      <div className="settings-main">
        <header className="settings-topbar">
          <div>
            <span className="settings-kicker">PREFERENCIAS</span>
            <h2>{nav.find((n) => n.id === seccion)?.label}</h2>
          </div>
          <span className="settings-tema-chip">
            <i style={{ background: acento }} />
            {nombreTema}
          </span>
        </header>
        <div className="settings-content" key={seccion}>
          {contenido[seccion]}
        </div>
      </div>
    </div>
  );
}
