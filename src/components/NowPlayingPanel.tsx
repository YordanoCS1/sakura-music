import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { invoke } from '@tauri-apps/api/core';
import {
  Disc3,
  FileMusic,
  Heart,
  ListMusic,
  Loader2,
  Mic2,
  Music2,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Search,
  Shuffle,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react';
import type { LyricLine, LyricsSearchResult, ScannedTrack, ThemeMode } from '../types';
import ThemedLoader from './ThemedLoader';

interface NowPlayingPanelProps {
  theme: ThemeMode;
  activeTrack: ScannedTrack | null;
  tracks: ScannedTrack[];
  favorites: string[];
  isPlaying: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  currentTime: number;
  duration: number;
  dominantColor: [number, number, number];
  getCoverSrc: (cover: string | null) => string;
  formatTime: (secs: number) => string;
  onClose: () => void;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleShuffle: () => void;
  onCycleRepeat: () => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onPlayTrack: (track: ScannedTrack) => void;
}

type Vista = 'detalles' | 'letras' | 'album' | 'artista';

const GLIFOS: Partial<Record<ThemeMode, string>> = {
  space: '◎',
  sumie: '墨',
  byobu: '屏',
  shoji: '障',
  origami: '折',
  swiss: '＋',
  sumiink: '墨',
  moonlit: '月',
  ledger: '帳',
  shonen: '⚡',
  ghost: '☻',
  samurai: '侍',
  kawaii: '♡',
  manga: '漫',
};

/** Panel "Ahora suena" ampliado, con identidad visual por tema. */
export default function NowPlayingPanel(props: NowPlayingPanelProps) {
  const {
    theme,
    activeTrack,
    tracks,
    favorites,
    isPlaying,
    isShuffle,
    repeatMode,
    currentTime,
    duration,
    dominantColor,
    getCoverSrc,
    formatTime,
    onClose,
    onTogglePlay,
    onNext,
    onPrevious,
    onSeek,
    onToggleShuffle,
    onCycleRepeat,
    onToggleFavorite,
    onPlayTrack,
  } = props;

  const [vista, setVista] = useState<Vista>('detalles');
  const [letras, setLetras] = useState<LyricLine[]>([]);
  const [cargandoLetras, setCargandoLetras] = useState(false);
  const [mostrarBuscador, setMostrarBuscador] = useState(false);
  const [consultaLetras, setConsultaLetras] = useState('');
  const [resultadosLetras, setResultadosLetras] = useState<LyricsSearchResult[]>([]);
  const [buscandoLetras, setBuscandoLetras] = useState(false);
  const [mensajeLetras, setMensajeLetras] = useState('');
  const letrasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  }, [onClose]);

  const delAlbum = useMemo(
    () => tracks.filter((t) => activeTrack && t.album === activeTrack.album),
    [tracks, activeTrack],
  );
  const delArtista = useMemo(
    () => tracks.filter((t) => activeTrack && t.artist === activeTrack.artist),
    [tracks, activeTrack],
  );

  const esFav = activeTrack ? favorites.includes(activeTrack.id) : false;
  const [r, g, b] = dominantColor;

  const pestañas: { id: Vista; label: string; icono: typeof Disc3 }[] = [
    { id: 'detalles', label: 'Detalles', icono: Disc3 },
    { id: 'letras', label: 'Letras', icono: FileMusic },
    { id: 'album', label: 'Álbum', icono: ListMusic },
    { id: 'artista', label: 'Artista', icono: Mic2 },
  ];

  const lista = (items: ScannedTrack[]) => (
    <div className="np-lista">
      {items.length === 0 && <p className="np-vacio">Sin pistas para mostrar.</p>}
      {items.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`np-lista-item ${activeTrack?.id === t.id ? 'is-active' : ''}`}
          onClick={() => onPlayTrack(t)}
        >
          <span className="np-lista-cover">
            {t.cover_url ? (
              <img src={getCoverSrc(t.cover_url)} alt="" />
            ) : (
              <Music2 className="w-3.5 h-3.5" />
            )}
          </span>
          <span className="np-lista-copy">
            <strong>{t.title}</strong>
            <small>
              {t.artist} · {t.duration_str}
            </small>
          </span>
          {t.track_number && (
            <span className="np-lista-num">{String(t.track_number).padStart(2, '0')}</span>
          )}
        </button>
      ))}
    </div>
  );

  // Las letras se cargan del `.lrc` que esté al lado del archivo de audio.
  const cargarLetrasLocal = useCallback(async () => {
    if (!activeTrack?.path) return;
    setCargandoLetras(true);
    try {
      const lineas = await invoke<LyricLine[]>('read_lyrics', { path: activeTrack.path });
      setLetras(lineas ?? []);
    } catch {
      setLetras([]);
    } finally {
      setCargandoLetras(false);
    }
  }, [activeTrack?.path]);

  useEffect(() => {
    if (vista !== 'letras') return;
    void cargarLetrasLocal();
  }, [vista, cargarLetrasLocal]);

  // Autoscroll suave a la línea que suena.
  useEffect(() => {
    if (vista !== 'letras' || !letrasRef.current) return;
    letrasRef.current.querySelector('.is-current')?.scrollIntoView({
      block: 'center',
      behavior: 'smooth',
    });
  }, [currentTime, vista, letras]);

  const buscarLetras = async () => {
    if (!activeTrack) return;
    setBuscandoLetras(true);
    setMensajeLetras('');
    try {
      const resultados = await invoke<LyricsSearchResult[]>('search_lyrics', {
        query: consultaLetras || activeTrack.title,
        artist: activeTrack.artist || null,
        album: activeTrack.album || null,
        duration: activeTrack.duration || null,
      });
      setResultadosLetras(resultados ?? []);
      if ((resultados ?? []).length === 0)
        setMensajeLetras('No encontramos letras para esa canción.');
    } catch (error) {
      setMensajeLetras(`No se pudo buscar letras: ${String(error)}`);
    } finally {
      setBuscandoLetras(false);
    }
  };

  const aplicarLetras = async (resultado: LyricsSearchResult) => {
    if (!activeTrack) return;
    // Si no hay versión sincronizada, convertimos la letra plana a LRC para
    // que el parser la muestre igual (todo en el segundo 0).
    const lrc = (resultado.synced_lyrics || resultado.plain_lyrics || '')
      .split('\n')
      .filter((linea) => linea.trim())
      .map((linea) => (/^\s*\[\d{2}:/.test(linea) ? linea : `[00:00.00]${linea.trim()}`))
      .join('\n');
    if (!lrc) {
      setMensajeLetras('Ese resultado no trae letras.');
      return;
    }
    try {
      await invoke('save_track_lyrics', { path: activeTrack.path, lrc });
      setResultadosLetras([]);
      setMostrarBuscador(false);
      setMensajeLetras(`Letras de “${resultado.title}” guardadas al lado de la pista.`);
      await cargarLetrasLocal();
    } catch (error) {
      setMensajeLetras(`No se pudieron guardar las letras: ${String(error)}`);
    }
  };

  const quitarLetras = async () => {
    if (!activeTrack) return;
    try {
      await invoke('delete_track_lyrics', { path: activeTrack.path });
      setLetras([]);
      setMensajeLetras('Se quitó el archivo .lrc de esta pista.');
    } catch (error) {
      setMensajeLetras(`No se pudieron quitar las letras: ${String(error)}`);
    }
  };

  // Última línea cuyo timestamp ya pasó (con un pequeño margen de tolerancia).
  const lineaActiva = letras.reduce<number>(
    (actual, linea, indice) => (linea.time <= currentTime + 0.25 ? indice : actual),
    -1,
  );

  return createPortal(
    <div
      className={`np-panel tema-${theme}`}
      role="dialog"
      aria-modal="true"
      aria-label="Ahora reproduciendo"
      onClick={onClose}
      style={{ '--np-r': r, '--np-g': g, '--np-b': b } as React.CSSProperties}
    >
      <div className="np-panel-inner" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="np-panel-close" onClick={onClose} aria-label="Cerrar">
          <X className="w-4 h-4" />
        </button>

        <div className="np-panel-head">
          <span className="np-panel-glifo" aria-hidden="true">
            {GLIFOS[theme] ?? '桜'}
          </span>
          <div>
            <span className="np-panel-kicker">AHORA REPRODUCIENDO</span>
            <h2>{activeTrack?.title ?? 'Sin pista'}</h2>
            <p>
              {activeTrack?.artist ?? '—'}
              {activeTrack?.album ? ` · ${activeTrack.album}` : ''}
            </p>
          </div>
        </div>

        <div className="np-panel-body">
          <aside className="np-panel-art-col">
            <div className={`np-panel-art np-panel-art-vinilo ${isPlaying ? 'is-girando' : ''}`}>
              {activeTrack?.cover_url ? (
                <img src={getCoverSrc(activeTrack.cover_url)} alt={activeTrack.title} />
              ) : (
                <div className="np-panel-art-fallback">
                  <Music2 className="w-16 h-16" />
                </div>
              )}
            </div>
            <div className="np-panel-controls">
              <button
                type="button"
                onClick={onToggleShuffle}
                className={`np-panel-ctl ${isShuffle ? 'is-on' : ''}`}
                aria-label="Aleatorio"
              >
                <Shuffle />
              </button>
              <button
                type="button"
                onClick={onPrevious}
                className="np-panel-ctl"
                aria-label="Anterior"
              >
                <SkipBack />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="np-panel-play"
                aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <button
                type="button"
                onClick={onNext}
                className="np-panel-ctl"
                aria-label="Siguiente"
              >
                <SkipForward />
              </button>
              <button
                type="button"
                onClick={onCycleRepeat}
                className={`np-panel-ctl ${repeatMode !== 'off' ? 'is-on' : ''}`}
                aria-label={`Repetición ${repeatMode}`}
              >
                {repeatMode === 'one' ? <Repeat1 /> : <Repeat />}
              </button>
            </div>
            <div className="np-panel-seek">
              <span>{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={onSeek}
                className="np-panel-range"
                aria-label="Progreso"
              />
              <span>{formatTime(duration || activeTrack?.duration || 0)}</span>
            </div>
          </aside>

          <section className="np-panel-info-col">
            <div className="np-panel-tabs" role="tablist">
              {pestañas.map(({ id, label, icono: Icono }) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={vista === id}
                  className={vista === id ? 'is-active' : ''}
                  onClick={() => setVista(id)}
                >
                  <Icono className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="np-panel-content" key={vista}>
              {vista === 'detalles' && (
                <div className="np-detalles">
                  {activeTrack && (
                    <button
                      type="button"
                      onClick={(e) => onToggleFavorite(activeTrack.id, e)}
                      className={`np-fav ${esFav ? 'is-fav' : ''}`}
                    >
                      <Heart className="w-4 h-4" fill={esFav ? 'currentColor' : 'none'} />
                      {esFav ? 'En favoritas' : 'Añadir a favoritas'}
                    </button>
                  )}
                  <dl className="np-specs">
                    <div>
                      <dt>Álbum</dt>
                      <dd>{activeTrack?.album || '—'}</dd>
                    </div>
                    <div>
                      <dt>Artista del álbum</dt>
                      <dd>{activeTrack?.album_artist || activeTrack?.artist || '—'}</dd>
                    </div>
                    <div>
                      <dt>Año</dt>
                      <dd>{activeTrack?.year ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Género</dt>
                      <dd>{activeTrack?.genre || '—'}</dd>
                    </div>
                    <div>
                      <dt>Pista</dt>
                      <dd>{activeTrack?.track_number ? `Nº ${activeTrack.track_number}` : '—'}</dd>
                    </div>
                    <div>
                      <dt>Formato</dt>
                      <dd>{activeTrack?.format || '—'}</dd>
                    </div>
                    <div>
                      <dt>Bitrate</dt>
                      <dd>
                        {activeTrack?.bitrate_kbps ? `${activeTrack.bitrate_kbps} kbps` : '—'}
                      </dd>
                    </div>
                    <div>
                      <dt>Duración</dt>
                      <dd>{activeTrack?.duration_str || '—'}</dd>
                    </div>
                    <div>
                      <dt>Tamaño</dt>
                      <dd>
                        {activeTrack
                          ? `${(activeTrack.file_size / (1024 * 1024)).toFixed(1)} MB`
                          : '—'}
                      </dd>
                    </div>
                  </dl>
                  <div className="np-ruta">
                    <small>RUTA DEL ARCHIVO</small>
                    <code>{activeTrack?.path || '—'}</code>
                  </div>
                </div>
              )}
              {vista === 'letras' && (
                <div className="np-letras-wrap">
                  <div className="np-letras-buscar">
                    <button
                      type="button"
                      className="np-letras-toggle"
                      onClick={() => {
                        setMostrarBuscador((valor) => !valor);
                        if (!mostrarBuscador && !consultaLetras && activeTrack) {
                          setConsultaLetras(`${activeTrack.title} ${activeTrack.artist}`.trim());
                        }
                      }}
                    >
                      <Search className="w-3.5 h-3.5" /> Buscar letras online
                    </button>
                    {letras.length > 0 && (
                      <button
                        type="button"
                        className="np-letras-quitar"
                        onClick={() => void quitarLetras()}
                      >
                        Quitar .lrc
                      </button>
                    )}
                  </div>

                  {mostrarBuscador && (
                    <div className="np-letras-form">
                      <input
                        value={consultaLetras}
                        onChange={(evento) => setConsultaLetras(evento.target.value)}
                        onKeyDown={(evento) => {
                          if (evento.key === 'Enter') void buscarLetras();
                        }}
                        placeholder="Canción y artista…"
                        aria-label="Buscar letras online"
                      />
                      <button
                        type="button"
                        onClick={() => void buscarLetras()}
                        disabled={buscandoLetras}
                      >
                        {buscandoLetras ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Search className="w-3.5 h-3.5" />
                        )}
                        Buscar
                      </button>
                    </div>
                  )}

                  {mensajeLetras && <p className="np-letra-nota">{mensajeLetras}</p>}

                  {resultadosLetras.length > 0 && (
                    <div className="np-letras-resultados">
                      {resultadosLetras.map((resultado) => (
                        <button
                          key={resultado.id}
                          type="button"
                          className="np-letras-resultado"
                          onClick={() => void aplicarLetras(resultado)}
                        >
                          <span>
                            <strong>{resultado.title}</strong>
                            <small>
                              {resultado.artist}
                              {resultado.album ? ` · ${resultado.album}` : ''}
                            </small>
                          </span>
                          <em>{resultado.synced_lyrics ? 'SINC' : 'PLANA'}</em>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="np-letras" ref={letrasRef}>
                    {cargandoLetras && (
                      <p className="np-letra-nota">
                        <ThemedLoader theme={theme} pequeno etiqueta="Buscando letras…" />
                      </p>
                    )}
                    {!cargandoLetras && letras.length === 0 && (
                      <>
                        <div className="np-letra-line is-current">♪</div>
                        <p className="np-letra-nota">
                          Buscá letras online o poné{' '}
                          <code>{activeTrack?.title ?? 'cancion'}.lrc</code> en la carpeta de la
                          pista.
                        </p>
                      </>
                    )}
                    {letras.map((linea, indice) => (
                      <p
                        key={`${linea.time}-${indice}`}
                        className={`np-letra-linea ${indice === lineaActiva ? 'is-current' : ''}`}
                      >
                        {linea.text || '♪'}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {vista === 'album' && (
                <div className="np-seccion">
                  <div className="np-seccion-head">
                    <ListMusic className="w-4 h-4" />
                    <strong>{activeTrack?.album || 'Álbum'}</strong>
                    <small>{delAlbum.length} pistas</small>
                  </div>
                  {lista(delAlbum)}
                </div>
              )}
              {vista === 'artista' && (
                <div className="np-seccion">
                  <div className="np-seccion-head">
                    <Mic2 className="w-4 h-4" />
                    <strong>{activeTrack?.artist || 'Artista'}</strong>
                    <small>{delArtista.length} pistas</small>
                  </div>
                  {lista(delArtista)}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>,
    document.body,
  );
}
