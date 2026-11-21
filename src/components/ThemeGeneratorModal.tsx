import { useState } from 'react';
import { Check, Copy, Palette, X } from 'lucide-react';
import type { Arquetipo, TemaPersonalizado } from '../themes/customThemes';

interface ThemeGeneratorModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onAplicar: (tema: TemaPersonalizado) => void;
}

const ARQUETIPOS: { id: Arquetipo; nombre: string }[] = [
  { id: 'shoji', nombre: 'Shoji · biombo' },
  { id: 'origami', nombre: 'Origami · plegado' },
  { id: 'swiss', nombre: 'Swiss · retícula' },
  { id: 'sumiink', nombre: 'Sumi Ink · rollos' },
  { id: 'moonlit', nombre: 'Moonlit · noche' },
  { id: 'ledger', nombre: 'Ledger · libro mayor' },
  { id: 'sumie', nombre: 'Sumi-e · pergamino' },
  { id: 'byobu', nombre: 'Byōbu · pantalla' },
  { id: 'shonen', nombre: 'Shōnen · manga' },
  { id: 'manga', nombre: 'Manga · viñetas' },
  { id: 'ghost', nombre: 'Fantasmas · etéreo' },
  { id: 'samurai', nombre: 'Samurái · lacado' },
  { id: 'kawaii', nombre: 'Kawaii · pastel' },
];

function canal(hex: string, indice: number) {
  const valor = hex.replace('#', '').slice(indice * 2, indice * 2 + 2);
  return parseInt(valor, 16);
}

function idSeguro(texto: string) {
  return (
    texto
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúñ]+/g, '-')
      .replace(/^-|-$/g, '') || 'mi-tema'
  );
}

/** Generador de temas embebido: paleta + arquetipo → CSS en vivo. */
export default function ThemeGeneratorModal({
  abierto,
  onCerrar,
  onAplicar,
}: ThemeGeneratorModalProps) {
  const [nombre, setNombre] = useState('Mi tema');
  const [base, setBase] = useState<Arquetipo>('shoji');
  const [fondo, setFondo] = useState('#f3ebd9');
  const [superficie, setSuperficie] = useState('#faf5e9');
  const [texto, setTexto] = useState('#2c241a');
  const [suave, setSuave] = useState('#6f604a');
  const [acento, setAcento] = useState('#a8442f');
  const [linea, setLinea] = useState('#c9b28a');
  const [radio, setRadio] = useState(8);
  const [copiado, setCopiado] = useState(false);

  if (!abierto) return null;

  const claro = (canal(fondo, 0) + canal(fondo, 1) + canal(fondo, 2)) / 3 > 128;
  const onAccent = claro ? '#ffffff' : '#0b0b12';
  const id = idSeguro(nombre);

  const css = `/* Tema ${id} · generado en Sakura */
.app-shell[data-skin='${id}'] {
  --m3-surface:${fondo}; --m3-surface-card:${superficie}; --m3-on-surface:${texto};
  --m3-on-surface-muted:${suave}; --m3-primary:${acento};
  --space-text:${texto}; --space-muted:${suave}; --space-border:${linea};
  --tema-accent:${acento}; --tema-accent-soft:${acento}17;
  --tema-texto:${texto}; --tema-texto-suave:${suave}; --tema-linea:${linea};
  background:${fondo} !important; color:${texto} !important;
}
.app-shell[data-skin='${id}'] .titlebar,
.app-shell[data-skin='${id}'] .zen-topnav { background:${superficie} !important; color:${texto} !important; }
.app-shell[data-skin='${id}'] .glass-card { background:${superficie} !important; border-color:${linea} !important; border-radius:${radio}px !important; }
.app-shell[data-skin='${id}'] .theme-library-nav button.is-active { background:${acento} !important; color:${onAccent} !important; }
.app-shell[data-skin='${id}'] .theme-row-actions button:hover { color:${acento} !important; }
.app-shell[data-skin='${id}'] { --set-panel-base:${superficie}; --set-radio-base:${radio}px; --set-on-accent-base:${onAccent}; }
.app-shell[data-skin='${id}'] .lt-view-select { display:none !important; }`;

  const aplicar = () => {
    onAplicar({
      id,
      nombre: nombre.trim() || 'Mi tema',
      descripcion: `Basado en ${base}`,
      base,
      css,
    });
    onCerrar();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(css);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1400);
    } catch {
      /* portapapeles no disponible */
    }
  };

  const color = (etiqueta: string, valor: string, alCambiar: (v: string) => void) => (
    <label className="tg-campo">
      <span>{etiqueta}</span>
      <input type="color" value={valor} onChange={(e) => alCambiar(e.target.value)} />
    </label>
  );

  return (
    <div className="tg-backdrop" role="presentation" onClick={onCerrar}>
      <div
        className="tg-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Generador de temas"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="tg-head">
          <div className="tg-head-icon">
            <Palette className="w-4 h-4" />
          </div>
          <div>
            <h2>Generador de temas</h2>
            <p>Cambiá la paleta y la estructura completa en tiempo real</p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar generador">
            <X className="w-4 h-4" />
          </button>
        </header>

        <div className="tg-cuerpo">
          <div className="tg-controles">
            <label className="tg-campo">
              <span>Nombre del tema</span>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            </label>
            <label className="tg-campo">
              <span>Arquetipo de diseño</span>
              <select value={base} onChange={(e) => setBase(e.target.value as Arquetipo)}>
                {ARQUETIPOS.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                  </option>
                ))}
              </select>
            </label>
            <div className="tg-colores">
              {color('Fondo', fondo, setFondo)}
              {color('Superficie', superficie, setSuperficie)}
              {color('Texto', texto, setTexto)}
              {color('Texto suave', suave, setSuave)}
              {color('Acento', acento, setAcento)}
              {color('Bordes', linea, setLinea)}
            </div>
            <label className="tg-campo">
              <span>Radio: {radio}px</span>
              <input
                type="range"
                min={0}
                max={28}
                value={radio}
                onChange={(e) => setRadio(Number(e.target.value))}
              />
            </label>
            <div className="tg-acciones">
              <button type="button" onClick={copiar}>
                {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiado ? 'Copiado' : 'Copiar CSS'}
              </button>
              <button type="button" className="tg-aplicar" onClick={aplicar}>
                Aplicar tema
              </button>
            </div>
          </div>

          <div className="tg-vista">
            <div
              className="tg-preview"
              style={{
                background: fondo,
                color: texto,
                borderColor: linea,
                borderRadius: radio,
              }}
            >
              <div
                className="tg-preview-bar"
                style={{ background: superficie, borderColor: linea }}
              >
                <b>{id}</b>
                <span style={{ color: acento }}>SAKURA</span>
              </div>
              <div className="tg-preview-body">
                <span className="tg-preview-kicker" style={{ color: acento }}>
                  ARQUETIPO {base.toUpperCase()}
                </span>
                <h3>Su música, a su manera</h3>
                <p style={{ color: suave }}>
                  Esta es la paleta. El arquetipo elige la estructura de Home, biblioteca y el
                  resto.
                </p>
                <span className="tg-preview-btn" style={{ background: acento, color: onAccent }}>
                  Abrir biblioteca →
                </span>
                {[1, 2, 3].map((n) => (
                  <div key={n} className="tg-preview-row" style={{ borderColor: linea }}>
                    <b style={{ color: acento }}>0{n}</b>
                    <span>Pista de ejemplo {n}</span>
                    <small style={{ color: suave }}>3:20</small>
                  </div>
                ))}
              </div>
            </div>
            <textarea className="tg-css" value={css} readOnly spellCheck={false} />
          </div>
        </div>
      </div>
    </div>
  );
}
