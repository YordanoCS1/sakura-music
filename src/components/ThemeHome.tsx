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
    theme !== 'ledger' &&
    theme !== 'shonen' &&
    theme !== 'ghost' &&
    theme !== 'samurai' &&
    theme !== 'kawaii'
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
        <span className="shoji-riel" aria-hidden="true" />
        <div className="shoji-paneles">
          <section className="shoji-pano shoji-pano-kanji">
            <span className="shoji-pano-glifo">静</span>
            <span className="shoji-pano-sello">桜</span>
          </section>
          <section className="shoji-pano">
            <span className="shoji-pano-num">01 / BIENVENIDO</span>
            <h1>El espacio entre las cosas</h1>
            <p>Una interfaz de papel y madera. Cada canción tiene su lugar detrás de un panel.</p>
          </section>
          <section className="shoji-pano">
            <span className="shoji-pano-num">02 / COLECCIÓN</span>
            <div className="shoji-datos">
              <div>
                <strong>{trackCount}</strong>
                <small>piezas</small>
              </div>
              <div>
                <strong>100%</strong>
                <small>local</small>
              </div>
            </div>
            <p>Deslizá los paneles y encontrá tu música sin ruido.</p>
          </section>
          <section className="shoji-pano shoji-pano-cta">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca →
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música →
            </button>
          </section>
        </div>
        <span className="shoji-riel" aria-hidden="true" />
      </div>
    );
  }

  if (theme === 'origami') {
    return (
      <div className="origami-home">
        <div className="origami-figura" aria-hidden="true">
          <span className="origami-ala origami-ala-uno" />
          <span className="origami-ala origami-ala-dos" />
          <span className="origami-cuerpo" />
          <span className="origami-cola" />
        </div>
        <div className="origami-pasos">
          <span>PLEGADO 01 / 04</span>
          <span className="origami-linea" />
          <span>ORIGAMI</span>
        </div>
        <div className="origami-texto">
          <h1>Todo se pliega hacia la música</h1>
          <p>Una interfaz ligera, de papel doblado. Cada álbum es una figura esperando abrirse.</p>
          <div className="origami-acciones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="origami-nota">{trackCount} piezas en la colección</p>
        </div>
      </div>
    );
  }

  if (theme === 'swiss') {
    return (
      <div className="swiss-home">
        <div className="swiss-poster">
          <div className="swiss-poster-cab">
            <span>SAKURA / MUSIC LIBRARY</span>
            <span>NO. 01 — 2026</span>
          </div>
          <div className="swiss-poster-cuerpo">
            <div className="swiss-poster-num">01</div>
            <div className="swiss-poster-tipo">
              <span className="swiss-poster-kicker">SWISS · MINIMAL</span>
              <h1>
                Música
                <br />
                sin ruido
              </h1>
              <p>Lo esencial. Cuadrícula, tipografía y tu colección. Nada más, nada menos.</p>
            </div>
          </div>
          <div className="swiss-poster-pie">
            <div className="swiss-poster-stat">
              <strong>{trackCount}</strong>
              <span>PIEZAS</span>
            </div>
            <div className="swiss-poster-stat">
              <strong>100%</strong>
              <span>LOCAL</span>
            </div>
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca →
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (theme === 'sumiink') {
    return (
      <div className="sumiink-home">
        <div className="sumiink-pergamino">
          <span className="sumiink-rodillo sumiink-rodillo-arriba" aria-hidden="true" />
          <div className="sumiink-hoja">
            <span className="sumiink-kanji" aria-hidden="true">
              墨
            </span>
            <span className="sumiink-kicker">SUMI · INK</span>
            <h1>La tinta lo dice todo</h1>
            <p>
              Una sola pincelada basta. Tu música en blanco y negro, sin adornos que la aparten.
            </p>
            <span className="sumiink-pincelada" aria-hidden="true" />
            <div className="sumiink-acciones">
              <button type="button" onClick={() => onNavigate('library')}>
                Abrir biblioteca
              </button>
              <button type="button" onClick={() => onNavigate('search')}>
                Buscar música
              </button>
            </div>
            <p className="sumiink-dato">{trackCount} piezas · blanco y negro</p>
          </div>
          <span className="sumiink-rodillo sumiink-rodillo-abajo" aria-hidden="true" />
        </div>
      </div>
    );
  }

  if (theme === 'moonlit') {
    return (
      <div className="moonlit-home">
        <div className="moonlit-cielo-fondo" aria-hidden="true">
          <span className="moonlit-luna-grande" />
          <span className="moonlit-brillo s1" />
          <span className="moonlit-brillo s2" />
          <span className="moonlit-brillo s3" />
          <span className="moonlit-brillo s4" />
          <span className="moonlit-brillo s5" />
          <span className="moonlit-horizonte" />
          <span className="moonlit-reflejo" />
        </div>
        <div className="moonlit-contenido">
          <p className="moonlit-kicker">MOONLIT · NOCHE</p>
          <h1>Escucha bajo la luna</h1>
          <p>Todo en calma, todo azul. Tu música flotando en la noche.</p>
          <div className="moonlit-acciones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="moonlit-dato">{trackCount} piezas · 100% local</p>
        </div>
      </div>
    );
  }

  if (theme === 'ledger') {
    return (
      <div className="ledger-home">
        <div className="ledger-libro-home">
          <section className="ledger-pagina-home ledger-izq">
            <span className="ledger-cabecera">LIBRO MAYOR / 01</span>
            <h1>Toda canción queda registrada</h1>
            <p>
              Fechas, artistas, álbumes. Un libro mayor de tu música, escrito a máquina y sellado en
              rojo.
            </p>
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca →
            </button>
          </section>
          <section className="ledger-pagina-home ledger-der">
            <span className="ledger-cabecera">REGISTRO DE HOY</span>
            <div className="ledger-fila-home">
              <span>PIEZAS</span>
              <strong>{trackCount}</strong>
            </div>
            <div className="ledger-fila-home">
              <span>ESTADO</span>
              <strong>ACTIVO</strong>
            </div>
            <div className="ledger-fila-home">
              <span>UBICACIÓN</span>
              <strong>LOCAL</strong>
            </div>
            <span className="ledger-sello-home" aria-hidden="true">
              桜
            </span>
          </section>
        </div>
      </div>
    );
  }

  if (theme === 'shonen') {
    return (
      <div className="shonen-home">
        <div className="shonen-energia">⚡ SAKURA!</div>
        <div className="shonen-copy">
          <p>SHŌNEN · ESPÍRITU DE LUCHA</p>
          <h1>¡Dale todo!</h1>
          <p>Energía, determinación y ese grito que lo cambia todo. Tu música a mil por hora.</p>
          <div className="shonen-botones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="shonen-dato">{trackCount} pistas · modo batalla</p>
        </div>
      </div>
    );
  }

  if (theme === 'ghost') {
    return (
      <div className="ghost-home">
        <span className="ghost-brillo" aria-hidden="true" />
        <div className="ghost-espiritu" aria-hidden="true">
          ☻
        </div>
        <div className="ghost-copy">
          <p>GHOST · ESPÍRITUS SONOROS</p>
          <h1>Ecos del pasado</h1>
          <p>
            Cada canción es un fantasma que vuelve a sonar. Tu biblioteca habita entre niebla y luz.
          </p>
          <div className="ghost-botones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="ghost-dato">{trackCount} ecos · 100% local</p>
        </div>
      </div>
    );
  }

  if (theme === 'samurai') {
    return (
      <div className="samurai-home">
        <div className="samurai-katana" aria-hidden="true">
          侍
        </div>
        <div className="samurai-copy">
          <p>侍 · CAMINO DEL GUERRERO</p>
          <h1>Honor en cada nota</h1>
          <p>Armadura lacada, acero y silencio. Tu biblioteca como un dojo.</p>
          <div className="samurai-botones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="samurai-dato">{trackCount} pistas · disciplina</p>
        </div>
      </div>
    );
  }

  if (theme === 'kawaii') {
    return (
      <div className="kawaii-home">
        <div className="kawaii-cara" aria-hidden="true">
          (◕‿◕)
        </div>
        <div className="kawaii-copy">
          <p>♡ KAWAII · TODO TIERNO</p>
          <h1>¡Música monísima!</h1>
          <p>Colores pastel, caritas felices y pura ternura para tus oídos.</p>
          <div className="kawaii-botones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="kawaii-dato">{trackCount} amigos · pura ternura</p>
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
