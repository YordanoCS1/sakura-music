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
  Smartphone,
  Copy,
  FileArchive,
  Power,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { invoke, open } from '../lib/puente';
import { ACCIONES, type AccionAtajo } from '../lib/atajos';
import { esIpRedLocal, urlControlRemoto } from '../lib/red';
import type { AppInfo, DownloadHistoryItem, PlayerStyle, ThemeOption } from '../types';
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
  remotePin: string;
  onToggleRemote: () => void;
  concurrencia: number;
  onSetConcurrencia: (n: number) => void;
  historialDescargas: DownloadHistoryItem[];
  onClearHistorial: () => void;
  skipStartupScan: boolean;
  onSetSkipStartupScan: (valor: boolean) => void;
  onAbrirGenerador: () => void;
  onBorrarTema: (id: string) => void;
  temasPersonalizadosIds: string[];
  onImportarTema: (json: string) => void;
  onExportado?: (mensaje: string) => void;
  atajos: Record<AccionAtajo, string>;
  escuchandoAtajo: AccionAtajo | null;
  onEscucharAtajo: (accion: AccionAtajo) => void;
  carpetaExportacion: string;
  onSetCarpetaExportacion: (ruta: string) => void;
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
    remotePin,
    onToggleRemote,
    concurrencia,
    onSetConcurrencia,
    historialDescargas,
    onClearHistorial,
    skipStartupScan,
    onSetSkipStartupScan,
    onAbrirGenerador,
    onBorrarTema,
    temasPersonalizadosIds,
    onImportarTema,
    onExportado,
    atajos,
    escuchandoAtajo,
    onEscucharAtajo,
    carpetaExportacion,
    onSetCarpetaExportacion,
  } = props;

  const [seccion, setSeccion] = useState<Seccion>('tema');
  const [jsonTema, setJsonTema] = useState('');
  const [galeriaAbierta, setGaleriaAbierta] = useState(false);
  const [ipManual, setIpManual] = useState('');
  const [urlCopiada, setUrlCopiada] = useState(false);

  const nombreTema = temas.find((t) => t.id === theme)?.nombre ?? 'Sakura';
  const [bg, acento, suave] = PREVIEWS[theme] ?? PREVIEWS.space!;

  // La IP detectada puede caer en 127.0.0.1; el campo manual permite corregirla.
  const ipRemota = ipManual.trim() || remoteIp;
  const urlRemota = urlControlRemoto(ipRemota, remotePin);
  const qrDisponible = esIpRedLocal(ipRemota) && remotePin.length === 6;

  const exportar = async () => {
    const destino = await open({ directory: true });
    if (typeof destino !== 'string') return;
    try {
      const preferencias = JSON.stringify({
        tema: localStorage.getItem('sakura_theme'),
        player_style: localStorage.getItem('sakura_player_style'),
        temas_personalizados: localStorage.getItem('sakura_temas_personalizados'),
        atajos: localStorage.getItem('sakura_atajos'),
      });
      const ruta = await invoke<string>('exportar_biblioteca', {
        ruta: destino.endsWith('.zip') ? destino : `${destino}.zip`,
        preferencias,
      });
      onExportado?.(`Backup creado: ${ruta}`);
    } catch (error) {
      onExportado?.(`No se pudo exportar: ${String(error)}`);
    }
  };

  const importar = async () => {
    const origen = await open({
      directory: false,
      filters: [{ name: 'Backup', extensions: ['zip'] }],
    });
    if (typeof origen !== 'string') return;
    try {
      const mensaje = await invoke<string>('importar_biblioteca', { ruta: origen });
      onExportado?.(mensaje);
    } catch (error) {
      onExportado?.(`No se pudo importar: ${String(error)}`);
    }
  };

  const copiarUrlRemota = async () => {
    try {
      await navigator.clipboard.writeText(urlRemota);
      setUrlCopiada(true);
      window.setTimeout(() => setUrlCopiada(false), 1400);
    } catch {
      // El portapapeles puede no estar disponible; la URL sigue visible.
    }
  };

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
          desc="Seleccione la apariencia de la app"
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
          desc="Creá uno nuevo con su paleta"
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
            placeholder="…o pegue aquí el JSON de un tema"
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
              { id: 'off', label: 'Desactivado', icono: Power },
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
          El mini reproductor reduce la ventana y la mantiene siempre encima. Con <b>Desactivado</b>{' '}
          la barra se oculta y la música se pausa; el reproductor sigue accesible desde el panel
          «Ahora suena».
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
        <Tarjeta
          n="09d"
          titulo="Carpeta de exportación"
          desc="Dónde se guardan las tarjetas PNG exportadas"
          icono={FolderOpen}
          ancha
        >
          <div className="set-actions">
            <button
              type="button"
              onClick={async () => {
                const destino = await open({ directory: true });
                if (typeof destino === 'string') onSetCarpetaExportacion(destino);
              }}
            >
              <FolderOpen className="w-3.5 h-3.5" /> Elegir carpeta
            </button>
            {carpetaExportacion && (
              <>
                <button
                  type="button"
                  onClick={() => void invoke('abrir_carpeta', { ruta: carpetaExportacion })}
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Abrir carpeta actual
                </button>
                <button type="button" onClick={() => onSetCarpetaExportacion('')}>
                  <Trash2 className="w-3.5 h-3.5" /> Restablecer
                </button>
              </>
            )}
          </div>
          <p className="set-note" style={{ marginTop: 8 }}>
            {carpetaExportacion ||
              'Si no la elegís, se usa Descargas (o la carpeta de datos de la app).'}
          </p>
        </Tarjeta>
      </>
    ),
    sistema: (
      <>
        <Tarjeta
          n="07"
          titulo="Control remoto"
          desc="Controle la reproducción desde el teléfono móvil"
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
            <div className="set-remoto">
              <div className="set-remoto-fila">
                <div className="set-remoto-qr">
                  {qrDisponible ? (
                    <QRCodeSVG
                      value={urlRemota}
                      size={124}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#14121b"
                      title="QR del control remoto"
                    />
                  ) : (
                    <div className="set-remoto-sin-qr">
                      <Smartphone className="w-5 h-5" />
                      <span>
                        {esIpRedLocal(ipRemota)
                          ? 'Esperando el PIN del servidor…'
                          : 'Escriba la IP de la PC para generar el código.'}
                      </span>
                    </div>
                  )}
                </div>
                <div className="set-remoto-info">
                  <p className="set-note">
                    Escanee el código con el celular, en la <b>misma red Wi-Fi</b>, o abra:
                  </p>
                  <code className="set-remoto-url">{urlRemota}</code>
                  {remotePin && (
                    <p className="set-remoto-pin">
                      PIN:{' '}
                      <b>
                        {remotePin.slice(0, 3)} {remotePin.slice(3)}
                      </b>
                      <small>Si escanea el QR, no hace falta escribirlo.</small>
                    </p>
                  )}
                  <div className="set-remoto-controles">
                    <input
                      className="set-ip"
                      value={ipManual}
                      onChange={(evento) => setIpManual(evento.target.value)}
                      placeholder={remoteIp || '192.168.1.23'}
                      aria-label="IP de la PC en la red local"
                      spellCheck={false}
                    />
                    <button
                      type="button"
                      className="set-copiar"
                      onClick={() => void copiarUrlRemota()}
                      aria-label="Copiar URL del control remoto"
                    >
                      {urlCopiada ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {urlCopiada ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
              {ipManual && !esIpRedLocal(ipManual.trim()) && (
                <p className="set-note set-remoto-aviso">
                  Use una IP privada (por ejemplo 192.168.1.23).
                </p>
              )}
            </div>
          )}
        </Tarjeta>
        <Tarjeta
          n="07b"
          titulo="Descargas en paralelo"
          desc="Cuántas canciones se bajan a la vez"
          icono={Download}
          ancha
        >
          <div className="set-actions">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={`set-opcion ${concurrencia === n ? 'is-active' : ''}`}
                aria-pressed={concurrencia === n}
                onClick={() => onSetConcurrencia(n)}
              >
                {n} {n === 1 ? 'descarga' : 'descargas'}
              </button>
            ))}
          </div>
          <p className="set-note">
            Más descargas simultáneas son más rápidas, pero pueden saturar la conexión.
          </p>
        </Tarjeta>
        <Tarjeta
          n="07c"
          titulo="Historial de descargas"
          desc="Lo que ya bajaste, aunque limpies la cola"
          icono={Download}
          ancha
        >
          {historialDescargas.length === 0 ? (
            <p className="set-note">Todavía no hay descargas terminadas.</p>
          ) : (
            <div className="set-historial">
              {historialDescargas.slice(0, 12).map((item) => (
                <div key={item.id} className="set-historial-item">
                  <strong>{item.title}</strong>
                  <small>
                    {item.artist} · {item.format}
                  </small>
                </div>
              ))}
            </div>
          )}
          {historialDescargas.length > 0 && (
            <div className="set-actions">
              <button type="button" onClick={onClearHistorial} className="set-btn-danger">
                <Trash2 className="w-3.5 h-3.5" /> Limpiar historial
              </button>
            </div>
          )}
        </Tarjeta>
        <Tarjeta
          n="07d"
          titulo="Arranque rápido"
          desc="Omitir el reescaneo al abrir la app"
          icono={Cpu}
          ancha
        >
          <div className="set-toggle-row">
            <div>
              <strong>No reescanear al iniciar</strong>
              <small>
                Ahorra tiempo con bibliotecas grandes. Si cambiaste archivos con la app cerrada, usá
                el botón <b>Actualizar biblioteca</b>.
              </small>
            </div>
            <button
              type="button"
              className="set-switch"
              aria-pressed={skipStartupScan}
              aria-label="Omitir reescaneo al iniciar"
              onClick={() => onSetSkipStartupScan(!skipStartupScan)}
            >
              <span />
            </button>
          </div>
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
          n="09b"
          titulo="Biblioteca portátil"
          desc="Exporte o importe la biblioteca completa en un archivo"
          icono={FileArchive}
          ancha
        >
          <div className="set-actions">
            <button type="button" onClick={() => void exportar()}>
              <Download className="w-3.5 h-3.5" /> Exportar backup
            </button>
            <button type="button" onClick={() => void importar()}>
              <FolderOpen className="w-3.5 h-3.5" /> Importar backup
            </button>
          </div>
          <p className="set-note" style={{ marginTop: 8 }}>
            Incluye la base SQLite, las carátulas y sus preferencias. El backup no se sube a ningún
            servidor.
          </p>
        </Tarjeta>
        <Tarjeta
          n="09c"
          titulo="Atajos de teclado"
          desc="Haga clic en una tecla para reasignarla"
          icono={Link2}
          ancha
        >
          <div>
            {ACCIONES.map((accion: { id: AccionAtajo; etiqueta: string }) => (
              <div className="atajo-fila" key={accion.id}>
                <span>{accion.etiqueta}</span>
                <button
                  type="button"
                  className={`atajo-tecla ${escuchandoAtajo === accion.id ? 'is-escuchando' : ''}`}
                  onClick={() => onEscucharAtajo(accion.id)}
                  aria-label={`Reasignar ${accion.etiqueta}`}
                >
                  {escuchandoAtajo === accion.id ? 'Presione una tecla…' : atajos[accion.id]}
                </button>
              </div>
            ))}
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
