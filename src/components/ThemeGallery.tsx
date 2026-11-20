import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Grid2X2, X } from 'lucide-react';
import type { ThemeOption } from '../types';
import { GLIFOS, PREVIEWS, TEMAS_PROPIOS } from '../themes/themeMeta';

interface ThemeGalleryProps {
  theme: string;
  temas: ThemeOption[];
  onSetTheme: (id: string) => void;
  onClose: () => void;
}

/** Vista museo: todas las apariencias con miniatura, preview y aplicación. */
export default function ThemeGallery({ theme, temas, onSetTheme, onClose }: ThemeGalleryProps) {
  const [vista, setVista] = useState(theme);
  const [filtro, setFiltro] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const alTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') onClose();
      if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
        const visible = filtradas();
        const actual = visible.findIndex((t) => t.id === vista);
        if (actual === -1) return;
        const delta = evento.key === 'ArrowRight' ? 1 : -1;
        setVista(visible[(actual + delta + visible.length) % visible.length]!.id);
      }
    };
    window.addEventListener('keydown', alTeclar);
    return () => window.removeEventListener('keydown', alTeclar);
  });

  const filtradas = () =>
    temas.filter((tema) =>
      `${tema.nombre} ${tema.descripcion} ${tema.id}`
        .toLowerCase()
        .includes(filtro.trim().toLowerCase()),
    );

  const activo = temas.find((tema) => tema.id === vista) ?? temas[0];
  const [fondo, acento, suave] = PREVIEWS[vista] ?? ['#fff', '#111', '#888'];
  const esPropio = TEMAS_PROPIOS.has(vista);
  // Elegimos la tinta del preview según la claridad del fondo para que el
  // texto del mockup siempre cumpla contraste, incluso en temos pastel.
  const claro = (() => {
    const hex = fondo.replace('#', '');
    if (hex.length < 6) return true;
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45;
  })();
  const tintaPreview = claro ? '#141018' : '#f4eef6';

  return createPortal(
    <div
      className="galeria-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Galería de temas"
      onClick={onClose}
    >
      <div className="galeria" onClick={(evento) => evento.stopPropagation()}>
        <header className="galeria-cab">
          <span className="galeria-marca" aria-hidden="true">
            <Grid2X2 className="w-5 h-5" />
          </span>
          <div>
            <p>APARIENCIA · MUSEO</p>
            <h1>Galería de temas</h1>
            <small>
              {temas.length} apariencias · {TEMAS_PROPIOS.size} con identidad propia
            </small>
          </div>
          <button
            type="button"
            className="galeria-cerrar"
            onClick={onClose}
            aria-label="Cerrar galería"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="galeria-cuerpo">
          <div className="galeria-izquierda">
            <label className="galeria-buscar">
              <input
                value={filtro}
                onChange={(evento) => setFiltro(evento.target.value)}
                placeholder="Filtrar temas…"
                aria-label="Filtrar temas"
              />
            </label>
            <div className="galeria-grid" ref={gridRef}>
              {filtradas().map((tema) => {
                const [bg, accent] = PREVIEWS[tema.id] ?? ['#fff', '#111'];
                return (
                  <button
                    key={tema.id}
                    type="button"
                    className={`galeria-tema ${vista === tema.id ? 'is-vista' : ''} ${theme === tema.id ? 'is-activo' : ''}`}
                    onMouseEnter={() => setVista(tema.id)}
                    onFocus={() => setVista(tema.id)}
                    onClick={() => {
                      onSetTheme(tema.id);
                      onClose();
                    }}
                  >
                    <span className="galeria-miniatura" style={{ background: bg }}>
                      <i style={{ background: accent }} />
                      <i style={{ background: bg, borderColor: accent }} />
                      <b style={{ color: accent }}>{GLIFOS[tema.id] ?? '桜'}</b>
                    </span>
                    <strong>{tema.nombre}</strong>
                    <small>{TEMAS_PROPIOS.has(tema.id) ? 'PROPIO' : 'GENÉRICO'}</small>
                    {theme === tema.id && (
                      <span className="galeria-check" aria-label="Tema actual">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <aside
            className={`galeria-preview tema-${vista}`}
            style={
              {
                '--gal-fondo': fondo,
                '--gal-acento': acento,
                '--gal-suave': suave,
                color: tintaPreview,
              } as React.CSSProperties
            }
          >
            <span className="galeria-preview-kicker">
              VISTA PREVIA · {esPropio ? 'ESTRUCTURA PROPIA' : 'DISEÑO CLÁSICO'}
            </span>
            <h2>{activo?.nombre ?? vista}</h2>
            <p>{activo?.descripcion}</p>
            <div className="galeria-mock">
              <div className="galeria-mock-nav">
                <b>{GLIFOS[vista] ?? '桜'}</b>
                <span />
                <span />
                <span />
              </div>
              <div className="galeria-mock-cuerpo">
                <div className="galeria-mock-tarjeta">
                  <i />
                  <i />
                </div>
                <div className="galeria-mock-tarjeta" />
                <div className="galeria-mock-tarjeta" />
              </div>
              <div className="galeria-mock-player">
                <i /> <span />
              </div>
            </div>
            <button
              type="button"
              className="galeria-aplicar"
              onClick={() => {
                onSetTheme(vista);
                onClose();
              }}
            >
              {theme === vista ? 'Tema actual' : `Aplicar ${activo?.nombre ?? vista}`}
            </button>
            <span className="galeria-atajos">← → navegar · ↵ aplicar · esc cerrar</span>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
