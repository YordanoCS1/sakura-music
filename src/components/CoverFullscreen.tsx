import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { ScannedTrack } from '../types';

interface CoverFullscreenProps {
  track: ScannedTrack;
  portada: string | null;
  letras: string[];
  lineaActual: number;
  onClose: () => void;
}

/** Modo presentación: portada protagonista + letras sincronizadas. */
export default function CoverFullscreen({
  track,
  portada,
  letras,
  lineaActual,
  onClose,
}: CoverFullscreenProps) {
  useEffect(() => {
    const tecla = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onClose]);

  return createPortal(
    <div className="cover-full" role="dialog" aria-label="Modo presentación">
      <button type="button" className="cover-full-close" onClick={onClose} aria-label="Salir">
        <X className="w-5 h-5" />
      </button>
      <div className="cover-full-inner">
        {portada && <img className="cover-full-art" src={portada} alt="" />}
        <div className="cover-full-copy">
          <small>Reproduciendo</small>
          <h1>{track.title}</h1>
          <h2>{track.artist}</h2>
          {letras.length > 0 && (
            <div className="cover-full-lyrics" aria-live="off">
              {letras.map((linea, i) => (
                <p key={i} className={i === lineaActual ? 'is-current' : ''}>
                  {linea}
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
