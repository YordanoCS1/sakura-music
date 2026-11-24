import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Disc3, Gauge, HardDrive, Music2, Sparkles, X } from 'lucide-react';
import { invoke } from '../lib/puente';
import type { ScannedTrack } from '../types';

interface LineaLetra {
  time: number;
  text: string;
}

interface CoverFullscreenProps {
  track: ScannedTrack;
  portada: string | null;
  onClose: () => void;
  esFav: boolean;
  onToggleFavorite: () => void;
  tema: string;
}

/** Decoración abstracta que cada tema interpreta a su manera. */
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

/** Presentación de la canción: carátula protagonista y ficha editorial rica. */
export default function CoverFullscreen({
  track,
  portada,
  onClose,
  esFav,
  onToggleFavorite,
  tema,
}: CoverFullscreenProps) {
  const [letras, setLetras] = useState<LineaLetra[]>([]);
  const [lineaActual, setLineaActual] = useState(-1);

  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);

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
    if (letras.length === 0) return;
    const temporizador = window.setInterval(() => {
      const posicion = Number(document.querySelector('audio')?.currentTime ?? 0);
      let indice = -1;
      for (let i = 0; i < letras.length; i++) {
        if (letras[i].time <= posicion) indice = i;
        else break;
      }
      setLineaActual(indice);
    }, 250);
    return () => window.clearInterval(temporizador);
  }, [letras]);

  return createPortal(
    <div
      className="cover-full"
      data-skin={tema}
      role="dialog"
      aria-label={`Presentación de ${track.title}`}
    >
      <Decoracion />
      <button type="button" className="cover-full-close" onClick={onClose} aria-label="Salir">
        <X className="w-5 h-5" />
      </button>

      <div className="cover-full-inner">
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

        <div className="cover-full-copy">
          <small className="cover-full-kicker">Ahora en cartelera</small>
          <h1>{track.title}</h1>
          <h2>{track.artist}</h2>

          <div className="cover-full-card">
            <div className="cover-full-card-head">
              <span>Ficha de la pista</span>
              <button
                type="button"
                className={esFav ? 'is-fav' : ''}
                onClick={onToggleFavorite}
                aria-label={esFav ? 'Quitar de favoritas' : 'Añadir a favoritas'}
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
          </div>

          {letras.length > 0 && (
            <div className="cover-full-lyrics" aria-live="off">
              {letras.map((linea, i) => (
                <p key={i} className={i === lineaActual ? 'is-current' : ''}>
                  {linea.text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
