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
    theme !== 'kawaii' &&
    theme !== 'manga' &&
    theme !== 'space'
  ) {
    return null;
  }

  const elegirImagen = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0];
    e.target.value = '';
    if (!archivo) return;
    if (!archivo.type.startsWith('image/')) {
      setError('Seleccione un archivo de imagen.');
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
          Su música dispuesta como un pergamino. Seleccione una carpeta y el recorrido comienza.
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
            <p>Deslizá los paneles y encontrá su música sin ruido.</p>
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
              <p>Lo esencial. Cuadrícula, tipografía y su colección. Nada más, nada menos.</p>
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
              Una sola pincelada basta. Su música en blanco y negro, sin adornos que la aparten.
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
          <h1>Escuche bajo la luna</h1>
          <p>Todo en calma, todo azul. Su música flotando en la noche.</p>
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
              Fechas, artistas, álbumes. Un libro mayor de su música, escrito a máquina y sellado en
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
        <div className="shonen-luz" aria-hidden="true" />
        <div className="shonen-panel">
          <span className="shonen-kicker">SHŌNEN · CAPÍTULO 01</span>
          <h1>
            ¡Dale <em>todo!</em>
          </h1>
          <p>
            Cada día es una pelea, cada canción una oportunidad de superarse. Póngase el uniforme y
            acceda al combate.
          </p>
          <div className="shonen-acciones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca →
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="shonen-dato">{trackCount} pistas · entrenamiento diario</p>
        </div>
        <div className="shonen-vigneta" aria-hidden="true">
          <span className="shonen-grito">AAAAAA!</span>
          <span className="shonen-silueta">⚡</span>
          <span className="shonen-lineas" />
        </div>
      </div>
    );
  }

  if (theme === 'ghost') {
    return (
      <div className="ghost-home">
        <span className="ghost-niebla s1" aria-hidden="true" />
        <span className="ghost-niebla s2" aria-hidden="true" />
        <span className="ghost-luna" aria-hidden="true" />
        <div className="ghost-figura" aria-hidden="true">
          <span>☻</span>
        </div>
        <div className="ghost-panel">
          <span className="ghost-kicker">GHOST · ECOS DEL PASADO</span>
          <h1>Lo que quedó sonando</h1>
          <p>
            Voces que vuelven entre niebla. Su biblioteca es un cementerio de buenos momentos
            esperando una nueva reproducción.
          </p>
          <div className="ghost-acciones">
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
        <div className="samurai-patio">
          <span className="samurai-sol" aria-hidden="true" />
          <span className="samurai-suelo" aria-hidden="true" />
          <div className="samurai-guerrero" aria-hidden="true">
            侍
          </div>
        </div>
        <div className="samurai-panel">
          <span className="samurai-kicker">侍 · CAMINO DEL GUERRERO</span>
          <h1>El sonido del acero</h1>
          <p>
            disciplina, silencio y un golpe preciso. Su biblioteca es un dojo donde cada canción es
            una forma que dominar.
          </p>
          <div className="samurai-acciones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              Buscar música
            </button>
          </div>
          <p className="samurai-dato">{trackCount} formas · lacado y oro</p>
        </div>
      </div>
    );
  }

  if (theme === 'space') {
    const canales = [
      { id: 'entrada', etiqueta: 'ENTRADA', valor: 'FUENTE' },
      { id: 'ganancia', etiqueta: 'GANANCIA', valor: '+6 dB' },
      { id: 'ecualizador', etiqueta: 'ECUALIZADOR', valor: 'PLANO' },
      { id: 'salida', etiqueta: 'SALIDA', valor: 'MASTER' },
    ];
    return (
      <div className="estudio-home space-home">
        <div className="estudio-rejilla" aria-hidden="true" />
        <section className="estudio-consola">
          <div className="estudio-cabecera">
            <span>EST · 01</span>
            <small>SAKURA MUSIC · ESTUDIO LOCAL</small>
          </div>
          <p className="estudio-kicker">MEZCLA · BIBLIOTECA · MASTER</p>
          <h1>
            EST<span>DIO</span>
          </h1>
          <p className="estudio-copy">
            Su biblioteca en la consola. Cada pista es un canal, cada álbum una sesión, y el máster
            suena como desee.
          </p>
          <div className="estudio-medidor" aria-hidden="true">
            {[72, 84, 58, 91, 66, 78, 48, 88, 62, 74, 55, 80].map((nivel, i) => (
              <i key={i} style={{ height: `${nivel}%` }} />
            ))}
          </div>
          <div className="estudio-acciones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              <Search className="w-4 h-4" /> Buscar música
            </button>
          </div>
          <p className="estudio-dato">
            {trackCount} CANALES LISTOS · 48 kHz · 24 BIT · SIN CONEXIÓN
          </p>
        </section>
        <aside className="estudio-panel">
          <div className="estudio-panel-head">
            <span>RACK · 01</span>
            <strong>CANALES</strong>
          </div>
          {canales.map((canal, i) => (
            <div key={canal.id} className="estudio-strip">
              <span className="estudio-strip-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="estudio-strip-nombre">{canal.etiqueta}</span>
              <span className="estudio-strip-fader" aria-hidden="true">
                <i style={{ top: `${12 + i * 14}%` }} />
              </span>
              <small>{canal.valor}</small>
            </div>
          ))}
          <div className="estudio-leds" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <i key={i} />
            ))}
          </div>
        </aside>
      </div>
    );
  }

  if (theme === 'manga') {
    const capitulos: { id: AppTab; label: string; numero: string }[] = [
      { id: 'home', label: 'Inicio', numero: '01' },
      { id: 'library', label: 'Biblioteca', numero: '02' },
      { id: 'search', label: 'Buscar', numero: '03' },
      { id: 'queue', label: 'Cola', numero: '04' },
      { id: 'playlists', label: 'Listas', numero: '05' },
      { id: 'settings', label: 'Ajustes', numero: '06' },
    ];
    return (
      <div className="manga-home">
        <div className="manga-lineas" aria-hidden="true" />
        <section className="manga-portada">
          <div className="manga-cabecera">
            <span>第 01 話</span>
            <small>SAKURA MUSIC · VOL. 01</small>
          </div>
          <div className="manga-titulo">
            <span className="manga-grito">¡TU MÚSICA!</span>
            <h1>
              CAPÍTULO
              <br />
              01
            </h1>
          </div>
          <div className="manga-globo" aria-hidden="true">
            ¿Listo para escuchar?
          </div>
          <span className="manga-sello" aria-hidden="true">
            開
          </span>
        </section>
        <section className="manga-panel">
          <p className="manga-kicker">CRÓNICA DE TU BIBLIOTECA</p>
          <h2>{trackCount} pistas en este número</h2>
          <p className="manga-copy">
            Cada canción es una viñeta, cada álbum un capítulo. Pase la página y continúe leyendo su
            colección.
          </p>
          <div className="manga-acciones">
            <button type="button" onClick={() => onNavigate('library')}>
              Abrir biblioteca <ArrowRight className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => onNavigate('search')}>
              <Search className="w-4 h-4" /> Buscar música
            </button>
          </div>
          <div className="manga-indice">
            {capitulos.map((capitulo) => (
              <button key={capitulo.id} type="button" onClick={() => onNavigate(capitulo.id)}>
                <span>{capitulo.numero}</span>
                {capitulo.label}
              </button>
            ))}
          </div>
        </section>
      </div>
    );
  }

  if (theme === 'kawaii') {
    return (
      <div className="kawaii-home">
        <div className="kawaii-nubes" aria-hidden="true">
          <span className="kawaii-nube s1" />
          <span className="kawaii-nube s2" />
          <span className="kawaii-arco" />
        </div>
        <div className="kawaii-panel">
          <div className="kawaii-cara-grande" aria-hidden="true">
            <span>♡</span>
          </div>
          <span className="kawaii-kicker">KAWAII · MÚSICA TIERNA</span>
          <h1>¡Escuche con una sonrisa!</h1>
          <p>
            Colores pastel, caritas felices y pura ternura. Su biblioteca es un parque donde cada
            canción es un amigo nuevo.
          </p>
          <div className="kawaii-acciones">
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
            <span>Portadas de su biblioteca</span>
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
          Dos paneles, uno de tinta y otro de contenido. Su música, dispuesta como un byōbu.
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
