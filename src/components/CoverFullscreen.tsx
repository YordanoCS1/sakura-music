import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Disc3,
  Download,
  FolderOpen,
  Eye,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  ListMusic,
  Music2,
  Sparkles,
  X,
} from 'lucide-react';
import { invoke, open } from '../lib/puente';
import type { ScannedTrack } from '../types';

interface LineaLetra {
  time: number;
  text: string;
}

interface CoverFullscreenProps {
  track: ScannedTrack;
  tracks: ScannedTrack[];
  portada: string | null;
  onClose: () => void;
  onSelectTrack: (track: ScannedTrack) => void;
  onAviso: (mensaje: string, accion?: { etiqueta: string; onClick: () => void }) => void;
  esFav: boolean;
  onToggleFavorite: () => void;
  tema: string;
  carpetaExportacion: string;
  onCarpetaExportacion: (ruta: string) => void;
}

const COLORES: Record<string, [string, string, string]> = {
  space: ['#15181a', '#f0a23c', '#f4efe6'],
  sumie: ['#f6f1e6', '#2f2b26', '#1c1a17'],
  sumiink: ['#0a0a09', '#d94a35', '#f0eee8'],
  byobu: ['#1a1210', '#d4af37', '#f5ead8'],
  shoji: ['#f3ebd9', '#a8442f', '#2c241a'],
  origami: ['#fff5fa', '#e0568f', '#5a2f48'],
  swiss: ['#ffffff', '#111111', '#111111'],
  moonlit: ['#0b1324', '#8fb6e8', '#e6effb'],
  ledger: ['#f5eedb', '#a33a2a', '#2b2419'],
  shonen: ['#fff6e8', '#ff6b1a', '#16120c'],
  ghost: ['#070d12', '#4ff0e0', '#eafcff'],
  samurai: ['#17120e', '#c9a961', '#f0e7d7'],
  kawaii: ['#150820', '#ff2e88', '#fff4ff'],
  manga: ['#fdfcf8', '#d62828', '#0d0d0d'],
};

function Decoracion() {
  return (
    <div className="cover-full-deco" aria-hidden="true">
      <span />
      <span />
      <span />
      <span />
      <span />
    </div>
  );
}

const formatoTamano = (bytes: number) =>
  bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;

const duracion = (segundos: number) => {
  const m = Math.floor(segundos / 60);
  const s = Math.floor(segundos % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

/** Presentación autocontenida: carátula, álbum, letras y exportación. */
export default function CoverFullscreen({
  track,
  tracks,
  portada,
  onClose,
  onSelectTrack,
  onAviso,
  esFav,
  onToggleFavorite,
  tema,
  carpetaExportacion,
  onCarpetaExportacion,
}: CoverFullscreenProps) {
  const [letras, setLetras] = useState<LineaLetra[]>([]);
  const [lineaActual, setLineaActual] = useState(0);
  const [soloArte, setSoloArte] = useState(false);
  const [exportando, setExportando] = useState(false);
  const letrasRef = useRef<HTMLDivElement>(null);

  const albumTracks = useMemo(() => {
    const mismoAlbum = tracks.filter(
      (t) =>
        t.album &&
        t.album === track.album &&
        (!track.album_artist || t.album_artist === track.album_artist),
    );
    return mismoAlbum.length > 1
      ? [...mismoAlbum].sort((a, b) => (a.track_number ?? 0) - (b.track_number ?? 0))
      : [track];
  }, [tracks, track]);

  const indice = Math.max(
    0,
    albumTracks.findIndex((t) => t.id === track.id),
  );
  const totalAlbum = albumTracks.reduce((suma, t) => suma + t.duration, 0);
  const [fondo, acento, texto] = COLORES[tema] ?? COLORES.space;

  const mover = (paso: number) => {
    const siguiente = albumTracks[indice + paso];
    if (siguiente) {
      setLineaActual(0);
      onSelectTrack(siguiente);
    }
  };

  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        onClose();
        return;
      }
      if (evento.metaKey || evento.ctrlKey || evento.altKey) return;
      switch (evento.key.toLowerCase()) {
        case 'arrowright':
          evento.preventDefault();
          mover(1);
          break;
        case 'arrowleft':
          evento.preventDefault();
          mover(-1);
          break;
        case 'f':
          onToggleFavorite();
          break;
        case 'l':
          setLetras((valor) => (valor.length ? [] : letras));
          break;
        case 'a':
          setSoloArte((valor) => !valor);
          break;
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  });

  useEffect(() => {
    let activo = true;
    invoke<LineaLetra[]>('read_lyrics', { path: track.path })
      .then((lineas) => {
        if (activo) setLetras(lineas ?? []);
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [track.path]);

  useEffect(() => {
    const nodo = letrasRef.current?.querySelector('.is-current');
    nodo?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [lineaActual]);

  const elegirCarpeta = async () => {
    const destino = await open({ directory: true });
    if (typeof destino === 'string') {
      onCarpetaExportacion(destino);
      onAviso(`Carpeta de exportación: ${destino}`);
    }
  };

  const exportar = async () => {
    setExportando(true);
    onAviso('Generando tarjeta…');
    try {
      const W = 1200;
      const H = 1560;
      const lienzo = document.createElement('canvas');
      lienzo.width = W;
      lienzo.height = H;
      const ctx = lienzo.getContext('2d');
      if (!ctx) return;

      const redondear = (x: number, y: number, w: number, h: number, r: number) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
      };
      const palabra = (valor: string, max: number) => {
        let corte = valor;
        while (ctx.measureText(corte).width > max && corte.length > 3) {
          corte = corte.slice(0, -2) + '…';
        }
        return corte;
      };

      // Fondo con luz de tema.
      const fondoLineal = ctx.createLinearGradient(0, 0, W, H);
      fondoLineal.addColorStop(0, fondo);
      fondoLineal.addColorStop(0.6, fondo);
      fondoLineal.addColorStop(1, acento);
      ctx.fillStyle = fondoLineal;
      ctx.fillRect(0, 0, W, H);
      const brillo = ctx.createRadialGradient(180, 140, 10, 180, 140, 900);
      brillo.addColorStop(0, `${acento}66`);
      brillo.addColorStop(1, 'transparent');
      ctx.fillStyle = brillo;
      ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `${acento}44`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(W - 90, 120, 220, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(W - 90, 120, 300, 0, Math.PI * 2);
      ctx.stroke();

      // Carátula: se lee como data URL para no contaminar el canvas.
      const fuente = track.cover_url
        ? await invoke<string>('leer_imagen_base64', { ruta: track.cover_url }).catch(() => null)
        : null;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,.45)';
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 24;
      redondear(90, 100, 1020, 1020, 44);
      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.fill();
      ctx.restore();
      ctx.save();
      redondear(90, 100, 1020, 1020, 44);
      ctx.clip();
      if (fuente) {
        await new Promise<void>((resolver) => {
          const imagen = new Image();
          imagen.onload = () => {
            ctx.drawImage(imagen, 90, 100, 1020, 1020);
            resolver();
          };
          imagen.onerror = () => resolver();
          imagen.src = fuente;
        });
      } else {
        ctx.fillStyle = 'rgba(255,255,255,.06)';
        ctx.fillRect(90, 100, 1020, 1020);
        ctx.fillStyle = texto;
        ctx.globalAlpha = 0.35;
        ctx.font = '260px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('♪', 600, 760);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      }
      ctx.strokeStyle = 'rgba(255,255,255,.45)';
      ctx.lineWidth = 4;
      ctx.strokeRect(90, 100, 1020, 1020);
      ctx.restore();

      // Texto editorial.
      const x = 90;
      let y = 1210;
      ctx.fillStyle = acento;
      ctx.font = '600 24px monospace';
      ctx.fillText('SAKURA MUSIC  ·  PRESENTACIÓN', x, y);

      y += 70;
      ctx.fillStyle = texto;
      ctx.font = 'bold 62px system-ui';
      ctx.fillText(palabra(track.title, W - 180), x, y);
      if (ctx.measureText(track.title).width > W - 180 && track.title.length > 24) {
        y += 66;
        ctx.fillText(palabra(track.title.slice(Math.floor(track.title.length / 2)), W - 180), x, y);
      }

      y += 58;
      ctx.fillStyle = texto;
      ctx.globalAlpha = 0.85;
      ctx.font = '34px system-ui';
      ctx.fillText(palabra(track.artist || 'Artista desconocido', W - 180), x, y);

      y += 46;
      ctx.globalAlpha = 0.6;
      ctx.font = '26px system-ui';
      ctx.fillText(palabra(track.album || 'Sin álbum', W - 180), x, y);
      ctx.globalAlpha = 1;

      // Chips de metadatos.
      y += 48;
      const chips = [
        track.year?.toString() ?? '—',
        track.genre || '—',
        track.format,
        track.duration_str,
      ];
      let chipX = x;
      ctx.font = '22px monospace';
      for (const chip of chips) {
        const ancho = ctx.measureText(chip).width + 36;
        if (chipX + ancho > W - 90) break;
        redondear(chipX, y - 30, ancho, 46, 23);
        ctx.fillStyle = `${acento}33`;
        ctx.fill();
        ctx.fillStyle = texto;
        ctx.globalAlpha = 0.9;
        ctx.fillText(chip, chipX + 18, y);
        ctx.globalAlpha = 1;
        chipX += ancho + 12;
      }

      // Pie.
      ctx.strokeStyle = 'rgba(255,255,255,.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, H - 70);
      ctx.lineTo(W - x, H - 70);
      ctx.stroke();
      ctx.fillStyle = texto;
      ctx.globalAlpha = 0.65;
      ctx.font = '20px monospace';
      ctx.fillText(`TEMA · ${tema.toUpperCase()}`, x, H - 32);
      ctx.textAlign = 'right';
      ctx.fillText(new Date().toLocaleDateString(), W - x, H - 32);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;

      const nombre = `${track.artist} - ${track.title}.png`;
      const respuesta = await invoke<string>('guardar_imagen', {
        nombre,
        datos: lienzo.toDataURL('image/png'),
        carpeta_elegida: carpetaExportacion || undefined,
      });
      const [ruta, , origen = 'Descargas'] = respuesta.split('|');
      onAviso(`Tarjeta guardada en ${origen}: ${ruta}`, {
        etiqueta: 'Abrir imagen',
        onClick: () => {
          void invoke('abrir_archivo', { ruta })
            .then(() => onAviso('Imagen abierta.'))
            .catch((error: unknown) => onAviso(`No se pudo abrir la imagen: ${String(error)}`));
        },
      });
    } catch (error) {
      onAviso(`No se pudo guardar la tarjeta: ${String(error)}`);
    } finally {
      setExportando(false);
    }
  };

  return createPortal(
    <div
      className="cover-full"
      data-skin={tema}
      role="dialog"
      aria-label={`Presentación de ${track.title}`}
    >
      <Decoracion />
      <div className="cover-full-barra">
        <button type="button" onClick={onClose} aria-label="Salir" title="Salir (Esc)">
          <X className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => void elegirCarpeta()}
          aria-label="Elegir carpeta de exportación"
          title="Elegir carpeta de exportación"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setSoloArte((valor) => !valor)}
          aria-label={soloArte ? 'Mostrar detalles' : 'Solo arte'}
          title="Solo arte (A)"
          className={soloArte ? 'is-activo' : ''}
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => void exportar()}
          disabled={exportando}
          aria-label="Exportar tarjeta"
          title="Exportar tarjeta PNG"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      <div className={`cover-full-inner ${soloArte ? 'is-solo-arte' : ''}`}>
        <div className="cover-full-escena" key={track.id}>
          <div className="cover-full-arte">
            <div className="cover-full-halo" aria-hidden="true" />
            {portada ? (
              <img className="cover-full-art" src={portada} alt={`Portada de ${track.album}`} />
            ) : (
              <div className="cover-full-art cover-full-art-vacio">
                <Music2 className="w-16 h-16" />
              </div>
            )}
            <div className="cover-full-sello">
              <Sparkles className="w-3 h-3" /> Sakura Music
            </div>
          </div>

          {!soloArte && (
            <div className="cover-full-copy">
              <small className="cover-full-kicker">
                {albumTracks.length > 1
                  ? `${indice + 1} / ${albumTracks.length} · Álbum`
                  : 'Ahora en cartelera'}
              </small>
              <h1>{track.title}</h1>
              <h2>{track.artist}</h2>

              <div className="cover-full-card">
                <div className="cover-full-card-head">
                  <span>Ficha del álbum</span>
                  <button
                    type="button"
                    className={esFav ? 'is-fav' : ''}
                    onClick={onToggleFavorite}
                    aria-label={esFav ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                    title="Favorito (F)"
                  >
                    {esFav ? '♥' : '♡'}
                  </button>
                </div>
                <dl>
                  <div>
                    <dt>
                      <Disc3 className="w-3.5 h-3.5" /> Álbum
                    </dt>
                    <dd>{track.album || '—'}</dd>
                  </div>
                  <div>
                    <dt>
                      <ListMusic className="w-3.5 h-3.5" /> Pistas
                    </dt>
                    <dd>
                      {albumTracks.length} · {duracion(totalAlbum)}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <Calendar className="w-3.5 h-3.5" /> Año
                    </dt>
                    <dd>{track.year ?? '—'}</dd>
                  </div>
                  <div>
                    <dt>
                      <Music2 className="w-3.5 h-3.5" /> Género
                    </dt>
                    <dd>{track.genre || '—'}</dd>
                  </div>
                  <div>
                    <dt>
                      <Gauge className="w-3.5 h-3.5" /> Formato
                    </dt>
                    <dd>
                      {track.format}
                      {track.bitrate_kbps ? ` · ${track.bitrate_kbps} kbps` : ''}
                    </dd>
                  </div>
                  <div>
                    <dt>
                      <HardDrive className="w-3.5 h-3.5" /> Tamaño
                    </dt>
                    <dd>
                      {formatoTamano(track.file_size)} · {track.duration_str}
                    </dd>
                  </div>
                </dl>

                {albumTracks.length > 1 && (
                  <ol className="cover-full-pistas">
                    {albumTracks.map((pista, i) => (
                      <li key={pista.id}>
                        <button
                          type="button"
                          className={pista.id === track.id ? 'is-activa' : ''}
                          onClick={() => {
                            setLineaActual(0);
                            onSelectTrack(pista);
                          }}
                        >
                          <span>{String(i + 1).padStart(2, '0')}</span>
                          <strong>{pista.title}</strong>
                          <small>{pista.duration_str}</small>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </div>

              {letras.length > 0 && (
                <div className="cover-full-lyrics" ref={letrasRef} aria-live="off">
                  {letras.map((linea, i) => (
                    <p
                      key={i}
                      className={i === lineaActual ? 'is-current' : ''}
                      onClick={() => setLineaActual(i)}
                    >
                      {linea.text}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {albumTracks.length > 1 && !soloArte && (
        <div className="cover-full-carrusel" aria-label="Pistas del álbum">
          {albumTracks.map((pista, i) => (
            <button
              key={pista.id}
              type="button"
              className={pista.id === track.id ? 'is-activa' : ''}
              onClick={() => {
                setLineaActual(0);
                onSelectTrack(pista);
              }}
              title={`${i + 1}. ${pista.title}`}
              aria-label={`Ver ${pista.title}`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <small>{i + 1}</small>
            </button>
          ))}
        </div>
      )}

      <div className="cover-full-ayuda">
        ← → pistas · F favorito · L letras · A solo arte · Esc salir
      </div>
    </div>,
    document.body,
  );
}
