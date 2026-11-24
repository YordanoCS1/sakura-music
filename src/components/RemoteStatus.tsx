import { useEffect, useState } from 'react';
import { Pause, Play, Radio } from 'lucide-react';
import { accionRemota } from '../lib/puente';

interface Estado {
  title: string;
  artist: string;
  playing: boolean;
  position: number;
  duration: number;
}

/** En el celular muestra qué se está reproduciendo en la computadora. */
export default function RemoteStatus() {
  const [estado, setEstado] = useState<Estado | null>(null);

  useEffect(() => {
    let activo = true;
    const consultar = async () => {
      try {
        const respuesta = await fetch('/api/status');
        if (respuesta.ok && activo) setEstado((await respuesta.json()) as Estado);
      } catch {
        // La PC puede estar ocupada; el próximo intento lo recupera.
      }
    };
    void consultar();
    const temporizador = window.setInterval(() => void consultar(), 2000);
    return () => {
      activo = false;
      window.clearInterval(temporizador);
    };
  }, []);

  if (!estado) return null;

  const progreso = estado.duration ? Math.min(100, (estado.position / estado.duration) * 100) : 0;

  return (
    <div className="remote-status" role="status" aria-label="Reproduciendo en la computadora">
      <div className="remote-status-cab">
        <Radio className="w-3.5 h-3.5" />
        <small>Sonando en la PC</small>
        <button
          type="button"
          onClick={() => void accionRemota('playpause')}
          aria-label="Reproducir o pausar"
        >
          {estado.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      </div>
      <strong>{estado.title || 'Sin pista'}</strong>
      <small>{estado.artist || '—'}</small>
      <div className="remote-status-barra">
        <i style={{ width: `${progreso}%` }} />
      </div>
    </div>
  );
}
