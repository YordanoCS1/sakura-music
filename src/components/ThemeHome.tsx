import { useRef, useState, type ChangeEvent } from 'react';
import { ArrowRight, ImagePlus, Search, DownloadCloud, Settings, X } from 'lucide-react';
import type { AppTab, ThemeMode } from '../types';

interface ThemeHomeProps {
  theme: ThemeMode;
  trackCount: number;
  onNavigate: (tab: AppTab) => void;
}

const CLAVE_IMAGEN = 'sakura_byobu_home_image';
const LIMITE_BYTES = 1_500_000;

/** Portada de inicio propia de los temas orientalistas. */
export default function ThemeHome({ theme, trackCount, onNavigate }: ThemeHomeProps) {
  const [imagen, setImagen] = useState<string | null>(() => localStorage.getItem(CLAVE_IMAGEN));
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (theme !== 'sumie' && theme !== 'byobu') return null;

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
        setImagen(datos);
        setError(null);
      } catch {
        setError('No se pudo guardar la imagen (muy grande para este navegador).');
      }
    };
    lector.readAsDataURL(archivo);
  };

  const quitarImagen = () => {
    localStorage.removeItem(CLAVE_IMAGEN);
    setImagen(null);
    setError(null);
  };

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

  return (
    <div className="byobu-home">
      <aside
        className={`byobu-home-panel ${imagen ? 'tiene-imagen' : ''}`}
        style={
          imagen
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(10,8,7,.35), rgba(10,8,7,.93)), url("${imagen}")`,
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
        {imagen && (
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
