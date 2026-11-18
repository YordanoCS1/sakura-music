import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, ImagePlus, Search, DownloadCloud, Settings, X } from 'lucide-react';
import type { AppTab, ScannedTrack, ThemeMode } from '../types';

interface ThemeHomeProps {
  theme: ThemeMode;
  trackCount: number;
  tracks: ScannedTrack[];
  getCoverSrc: (coverUrl: string | null) => string;
  onNavigate: (tab: AppTab) => void;
}

const CLAVE_IMAGEN = 'sakura_byobu_home_image';
const CLAVE_PORTADA = 'sakura_byobu_home_cover';
const LIMITE_BYTES = 1_500_000;

/** Portada de inicio propia de los temas orientalistas. */
export default function ThemeHome({
  theme,
  trackCount,
  tracks,
  getCoverSrc,
  onNavigate,
}: ThemeHomeProps) {
  const [imagen, setImagen] = useState<string | null>(() => localStorage.getItem(CLAVE_IMAGEN));
  const [portada, setPortada] = useState<string | null>(() => localStorage.getItem(CLAVE_PORTADA));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (
    theme !== 'sumie' &&
    theme !== 'byobu' &&
    theme !== 'shoji' &&
    theme !== 'origami' &&
    theme !== 'swiss' &&
    theme !== 'sumiink' &&
    theme !== 'moonlit' &&
    theme !== 'ledger'
  ) {
    return null;
  }

  const elegirImagen = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setError('Elegí un archivo de imagen.');
      return;
    }
    if (archivo.size > LIMITE_BYTES) {
      setError('La imagen debe pesar menos de 1,5 MB.');
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      const datos = String(lector.result);
      try {
        localStorage.setItem(CLAVE_IMAGEN, datos);
        localStorage.removeItem(CLAVE_PORTADA);
        setImagen(datos);
        setPortada(null);
        setError(null);
      } catch {
        setError('No se pudo guardar la imagen (muy grande para este navegador).');
      }
    };
    lector.readAsDataURL(archivo);
  };

  const usarPortada = (src: string) => {
    localStorage.setItem(CLAVE_PORTADA, src);
    localStorage.removeItem(CLAVE_IMAGEN);
    setPortada(src);
    setImagen(null);
    setError(null);
  };

  const quitarImagen = () => {
    localStorage.removeItem(CLAVE_IMAGEN);
    localStorage.removeItem(CLAVE_PORTADA);
    setImagen(null);
    setPortada(null);
    setError(null);
  };

  const fondo = imagen ?? portada;
  const cssUrl = (src: string) => `url("${src.replace(/"/g, '%22')}")`;
  const portadas = tracks.filter((t) => t.cover_url).slice(0, 8);

  if (theme === 'sumie') {
    return (
      <div className="sumie-home">
        <button
          type="button"
          className="sumie-home-enso"
          onClick={() => onNavigate('library')}
          aria-label="Abrir biblioteca"
          title="Abrir biblioteca"
        >
          <span>桜</span>
        </button>
        <p className="sumie-home-kicker">桜 · Estudio de tinta</p>
        <h1>Bienvenido a la tinta</h1>
        <p className="sumie-home-copy">
          Tu música dispuesta como un pergamino. Elegí una carpeta y el recorrido comienza.
        </p>
        <div className="sumie-home-actions">
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onNavigate('search')}>
            <Search className="w-4 h-4" /> Buscar música
          </button>
        </div>
        <p className="sumie-home-stat">{trackCount} piezas en la colección · 100% local</p>
      </div>
    );
  }

  if (theme === 'shoji') {
    return (
      <div className="shoji-home">
        <div className="shoji-panel">
          <span className="shoji-glifo">静</span>
          <h1>El espacio entre las cosas</h1>
          <p>Una interfaz de papel y madera. Cada canción tiene su lugar detrás de un panel.</p>
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca →
          </button>
        </div>
        <div className="shoji-panel">
          <span className="shoji-glifo">桜</span>
          <h1>Bienvenido</h1>
          <p>Desliza los paneles, abre la biblioteca y encuentra tu música sin ruido.</p>
          <p className="shoji-dato">{trackCount} piezas · 100% local</p>
        </div>
        <div className="shoji-panel">
          <span className="shoji-glifo">音</span>
          <h1>Tu colección</h1>
          <p>Elige una carpeta y comienza el recorrido.</p>
          <button type="button" onClick={() => onNavigate('search')}>
            Buscar música →
          </button>
        </div>
      </div>
    );
  }

  if (theme === 'origami') {
    return (
      <div className="origami-home">
        <div className="origami-triangulo" aria-hidden="true" />
        <div className="origami-copy">
          <p className="origami-kicker">ORIGAMI</p>
          <h1>Todo se pliega hacia la música</h1>
          <p>Una interfaz ligera, de papel doblado. Cada álbum es una figura esperando abrirse.</p>
          <div className="origami-botones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="origami-dato">{trackCount} piezas en la colección</p>
        </div>
      </div>
    );
  }

  if (theme === 'swiss') {
    return (
      <div className="swiss-home">
        <div className="swiss-numero">01</div>
        <div className="swiss-copy">
          <p className="swiss-kicker">SWISS · MINIMAL</p>
          <h1>Música sin ruido</h1>
          <p>Lo esencial. Cuadrícula, tipografía y tu colección. Nada más, nada menos.</p>
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca →
          </button>
          <p className="swiss-dato">{trackCount} piezas · 100% local</p>
        </div>
      </div>
    );
  }

  if (theme === 'sumiink') {
    return (
      <div className="sumiink-home">
        <div className="sumiink-trazo" aria-hidden="true" />
        <div className="sumiink-copy">
          <p className="sumiink-kicker">SUMI · INK</p>
          <h1>La tinta lo dice todo</h1>
          <p>Una sola pincelada basta. Tu música en blanco y negro, sin adornos que la aparten.</p>
          <div className="sumiink-botones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="sumiink-dato">{trackCount} piezas · blanco y negro</p>
        </div>
      </div>
    );
  }

  if (theme === 'moonlit') {
    return (
      <div className="moonlit-home">
        <div className="moonlit-disco" aria-hidden="true" />
        <p className="moonlit-kicker">MOONLIT · NOCHE</p>
        <h1>Escucha bajo la luna</h1>
        <p>Todo en calma, todo azul. Tu música flotando en la noche.</p>
        <div className="moonlit-botones">
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca
          </button>
          <button type="button" onClick={() => onNavigate('search')}>
            Buscar música
          </button>
        </div>
        <p className="moonlit-dato">{trackCount} piezas · 100% local</p>
      </div>
    );
  }

  if (theme === 'ledger') {
    return (
      <div className="ledger-home">
        <div className="ledger-diario">
          <p className="ledger-kicker">LEDGER · REGISTRO</p>
          <h1>Toda canción queda registrada</h1>
          <p>
            Fechas, artistas, álbumes. Un libro mayor de tu música, escrito a máquina y sellado en
            rojo.
          </p>
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca →
          </button>
        </div>
        <div className="ledger-timbre" aria-hidden="true">
          桜
        </div>
      </div>
    );
  }

  return (
    <div className="byobu-home">
      <aside
        className={`byobu-home-panel ${fondo ? 'tiene-imagen' : ''}`}
        style={
          fondo
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(10,8,7,.35), rgba(10,8,7,.93)), ${cssUrl(fondo)}`,
              }
            : undefined
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="byobu-home-input"
          onChange={elegirImagen}
          aria-label="Elegir imagen de portada"
        />
        <button
          type="button"
          className="byobu-home-sello"
          onClick={() => inputRef.current?.click()}
          aria-label="Cambiar imagen del inicio"
          title="Cambiar imagen"
        >
          桜
        </button>
        {fondo && (
          <button
            type="button"
            className="byobu-home-quitar"
            onClick={quitarImagen}
            aria-label="Quitar imagen"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          className="byobu-home-cambiar"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus className="w-3.5 h-3.5" /> Cambiar imagen
        </button>
        {portadas.length > 0 && (
          <div className="byobu-home-portadas">
            <span>Portadas de tu biblioteca</span>
            <div>
              {portadas.map((track) => (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => usarPortada(getCoverSrc(track.cover_url))}
                  title={`Usar portada de ${track.title}`}
                  aria-label={`Usar portada de ${track.title}`}
                >
                  <img src={getCoverSrc(track.cover_url)} alt="" />
                </button>
              ))}
            </div>
          </div>
        )}
        <span className="byobu-home-kanji" aria-hidden="true">
          蔵
        </span>
        <div className="byobu-home-panel-copy">
          <strong>Sakura</strong>
          <small>Estudio de tinta</small>
        </div>
        <div className="byobu-home-stat">
          <strong>{trackCount}</strong>
          <span>PIEZAS EN LA COLECCIÓN</span>
        </div>
        {error && (
          <p className="byobu-home-error" role="alert">
            {error}
          </p>
        )}
      </aside>
      <section className="byobu-home-content">
        <p className="byobu-home-kicker">蔵 · Inicio</p>
        <h1>Bienvenido a la tinta</h1>
        <p className="byobu-home-copy">
          Dos paneles, uno de tinta y otro de contenido. Tu música, dispuesta como un byōbu.
        </p>
        <div className="byobu-home-actions">
          <button type="button" onClick={() => onNavigate('library')}>
            Abrir biblioteca <ArrowRight className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => onNavigate('search')}>
            <Search className="w-4 h-4" /> Buscar música
          </button>
        </div>
        <div className="byobu-home-links">
          <button type="button" onClick={() => onNavigate('queue')}>
            <DownloadCloud className="w-4 h-4" /> Descargas
          </button>
          <button type="button" onClick={() => onNavigate('settings')}>
            <Settings className="w-4 h-4" /> Ajustes
          </button>
        </div>
      </section>
    </div>
  );
}
