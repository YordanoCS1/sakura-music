import { Disc3, Heart, Pause, Play, Sparkles, TrendingUp } from 'lucide-react';

type CId = 'mosaicwall' | 'timeline' | 'board' | 'spines' | 'editorial' | 'orbital';

const concepts: { id: CId; name: string; direction: string; note: string }[] = [
  {
    id: 'mosaicwall',
    name: 'Pared de portadas',
    direction: 'Collage de portadas a escala variable',
    note: 'La colección es una pared de portadas de distintos tamaños. La que suena se ilumina con un ecualizador animado. Es exploración puramente visual.',
  },
  {
    id: 'timeline',
    name: 'Línea de tiempo',
    direction: 'Discos ordenados por década',
    note: 'Los álbumes se ordenan en una línea de tiempo horizontal por año de lanzamiento. Deslizas por las décadas y ves la evolución de tu colección.',
  },
  {
    id: 'board',
    name: 'Tablero de columnas',
    direction: 'Columnas por estado de la colección',
    note: 'Columnas paralelas: Favoritos, Recientes, Lossless y Álbumes. Cada bloque tiene su propio mini-visualizador. Un dashboard vivo de tu música.',
  },
  {
    id: 'spines',
    name: 'Estantería de vinilos',
    direction: 'Discos vistos de canto (spines)',
    note: 'Como una tienda de discos: los álbumes se ven por el lomo. Al seleccionar uno, se voltea y muestra la portada. Muy táctil y nostálgico-moderno.',
  },
  {
    id: 'editorial',
    name: 'Portafolio editorial',
    direction: 'Revista tipográfica con láminas',
    note: 'La biblioteca como una revista: tipografía grande, portadas tratadas como láminas numeradas, jerarquía editorial fuerte y mucho aire.',
  },
  {
    id: 'orbital',
    name: 'Órbita de álbumes',
    direction: 'Anillo giratorio de discos',
    note: 'Los álbumes orbitan en un anillo circular que giras con la rueda. El disco central es el destacado. Una forma distintiva de navegar la colección.',
  },
];

/* ---------- 1 Pared de portadas ---------- */
function MosaicWall() {
  return (
    <div className="lbc lbc-mosaic">
      <div className="lbc-bar">
        <span className="lbc-logo">
          <Disc3 />
        </span>
        <span className="lbc-title">Pared</span>
        <span className="lbc-chip">1 248</span>
      </div>
      <div className="lbc-mosaic">
        <div className="lm l1" style={{ background: '#7c3aed' }}>
          <span className="lm-eq" />
        </div>
        <div className="lm l2" style={{ background: '#ec4899' }} />
        <div className="lm l3" style={{ background: '#06b6d4' }} />
        <div className="lm l4" style={{ background: '#f59e0b' }} />
        <div className="lm l5" style={{ background: '#22c55e' }} />
        <div className="lm l6" style={{ background: '#6366f1' }} />
        <div className="lm l7" style={{ background: '#f43f5e' }} />
        <div className="lm l8" style={{ background: '#14b8a6' }} />
        <div className="lm l9" style={{ background: '#a855f7' }} />
        <div className="lm l10" style={{ background: '#f97316' }} />
        <div className="lm l11" style={{ background: '#0ea5e9' }} />
        <div className="lm l12" style={{ background: '#8b5cf6' }} />
      </div>
    </div>
  );
}

/* ---------- 2 Línea de tiempo ---------- */
function Timeline() {
  return (
    <div className="lbc lbc-timeline">
      <div className="lbc-bar">
        <span className="lbc-logo">
          <Disc3 />
        </span>
        <span className="lbc-title">Décadas</span>
        <span className="lbc-chip">1950 — 2024</span>
      </div>
      <div className="lbc-tl-line">
        <span style={{ left: '0%' }}>1950</span>
        <span style={{ left: '28%' }}>1970</span>
        <span style={{ left: '55%' }}>1990</span>
        <span style={{ left: '80%' }}>2010</span>
      </div>
      <div className="lbc-tl-track">
        <div className="lbc-tlcard y60" style={{ top: '4px', background: '#d97706' }}>
          <small>1959</small>
          <b>Kind of Blue</b>
        </div>
        <div className="lbc-tlcard y60" style={{ top: '26px', background: '#b45309' }}>
          <small>1969</small>
          <b>In a Silent Way</b>
        </div>
        <div className="lbc-tlcard y70" style={{ top: '2px', background: '#dc2626' }}>
          <small>1974</small>
          <b>Dark Side</b>
        </div>
        <div className="lbc-tlcard y80" style={{ top: '30px', background: '#7c3aed' }}>
          <small>1983</small>
          <b>Thriller</b>
        </div>
        <div className="lbc-tlcard y90" style={{ top: '8px', background: '#0891b2' }}>
          <small>1997</small>
          <b>OK Computer</b>
        </div>
        <div className="lbc-tlcard y00" style={{ top: '28px', background: '#059669' }}>
          <small>2008</small>
          <b>In Rainbows</b>
        </div>
        <div className="lbc-tlcard y10 active" style={{ top: '2px', background: '#db2777' }}>
          <small>2011</small>
          <b>Random Access</b>
          <span className="lbc-eq" />
        </div>
        <div className="lbc-tlcard y20" style={{ top: '26px', background: '#4f46e5' }}>
          <small>2021</small>
          <b>Donda</b>
        </div>
      </div>
    </div>
  );
}

/* ---------- 3 Tablero de columnas ---------- */
function Board() {
  return (
    <div className="lbc lbc-board">
      <div className="lbc-bar">
        <span className="lbc-logo">
          <Disc3 />
        </span>
        <span className="lbc-title">Tablero</span>
        <span className="lbc-chip">4 vistas</span>
      </div>
      <div className="lbc-cols">
        <div className="lbc-col">
          <div className="lbc-colhead">
            <Heart />
            Favoritos
          </div>
          <BItem t="Blue in Green" a="Miles Davis" c="#ec4899" />
          <BItem t="Nude" a="Radiohead" c="#7c3aed" />
        </div>
        <div className="lbc-col">
          <div className="lbc-colhead">
            <TrendingUp />
            Recientes
          </div>
          <BItem t="Midnight City" a="M83" c="#06b6d4" />
          <BItem t="Genesis" a="Justice" c="#f97316" />
        </div>
        <div className="lbc-col">
          <div className="lbc-colhead">
            <Sparkles />
            Lossless
          </div>
          <BItem t="In a Silent Way" a="Miles Davis" c="#db2777" />
          <BItem t="Bitches Brew" a="Miles Davis" c="#be185d" />
        </div>
      </div>
      <div className="lbc-boardfoot">
        <span className="lbc-eq" />
        <span>Blue in Green · 02:14</span>
      </div>
    </div>
  );
}
function BItem({ t, a, c }: { t: string; a: string; c: string }) {
  return (
    <div className="lbc-bitm">
      <span className="lbc-bitm-thumb" style={{ background: c }} />
      <b>{t}</b>
      <small>{a}</small>
    </div>
  );
}

/* ---------- 4 Estantería de vinilos ---------- */
function Spines() {
  return (
    <div className="lbc lbc-spines">
      <div className="lbc-bar">
        <span className="lbc-logo">
          <Disc3 />
        </span>
        <span className="lbc-title">Estantería</span>
        <span className="lbc-chip">36 discos</span>
      </div>
      <div className="lbc-shelf">
        <div
          className="lbc-spine s1 active"
          style={{ background: 'linear-gradient(180deg,#7c3aed,#4c1d95)' }}
        >
          <span>Kind of Blue</span>
        </div>
        <div
          className="lbc-spine s2"
          style={{ background: 'linear-gradient(180deg,#ec4899,#9d174d)' }}
        >
          <span>In a Silent Way</span>
        </div>
        <div
          className="lbc-spine s3"
          style={{ background: 'linear-gradient(180deg,#06b6d4,#0e7490)' }}
        >
          <span>Midnight</span>
        </div>
        <div
          className="lbc-spine s4"
          style={{ background: 'linear-gradient(180deg,#f59e0b,#b45309)' }}
        >
          <span>Thriller</span>
        </div>
        <div
          className="lbc-spine s5"
          style={{ background: 'linear-gradient(180deg,#22c55e,#15803d)' }}
        >
          <span>In Rainbows</span>
        </div>
        <div
          className="lbc-spine s6"
          style={{ background: 'linear-gradient(180deg,#6366f1,#3730a3)' }}
        >
          <span>Donda</span>
        </div>
        <div
          className="lbc-spine s7"
          style={{ background: 'linear-gradient(180deg,#f43f5e,#be123c)' }}
        >
          <span>Dark Side</span>
        </div>
      </div>
      <div className="lbc-shelf-front">
        <div
          className="lbc-frontcover"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}
        >
          <Disc3 />
        </div>
        <div className="lbc-frontcopy">
          <small>EN REPRODUCCIÓN</small>
          <b>Kind of Blue</b>
          <span>Miles Davis · 1959</span>
        </div>
        <div className="lbc-frontplay">
          <Pause />
        </div>
      </div>
    </div>
  );
}

/* ---------- 5 Editorial ---------- */
function Editorial() {
  return (
    <div className="lbc lbc-editorial">
      <div className="lbc-edbar">
        <span className="lbc-ed-logo">S.</span>
        <span className="lbc-ed-tag">YOUR MUSIC JOURNAL · VOL.01</span>
        <span className="lbc-ed-count">01 — 24</span>
      </div>
      <div className="lbc-edhead">
        <div>
          <small>THE COLLECTION</small>
          <h4>
            Listen
            <br />
            closely.
          </h4>
          <span>1 248 tracks · curated by you</span>
        </div>
        <div
          className="lbc-edplate"
          style={{ background: 'linear-gradient(135deg,#f9a8d4,#9d174d)' }}
        >
          IN A<br />
          SILENT
          <br />
          WAY
        </div>
      </div>
      <div className="lbc-edrow">
        <span>01</span>
        <b>Kind of Blue</b>
        <em>Miles Davis</em>
        <i>05:37</i>
      </div>
      <div className="lbc-edrow on">
        <span>02</span>
        <b>Midnight City</b>
        <em>M83</em>
        <i>04:03</i>
      </div>
      <div className="lbc-edrow">
        <span>03</span>
        <b>Nude</b>
        <em>Radiohead</em>
        <i>04:15</i>
      </div>
      <div className="lbc-edfoot">
        <Play />
        <span>Escuchar colección</span>
        <i style={{ width: '38%' }} />
      </div>
    </div>
  );
}

/* ---------- 6 Órbita ---------- */
function Orbital() {
  return (
    <div className="lbc lbc-orbital">
      <div className="lbc-bar">
        <span className="lbc-logo">
          <Disc3 />
        </span>
        <span className="lbc-title">Órbita</span>
        <span className="lbc-chip">1 248</span>
      </div>
      <div className="lbc-orbit">
        <div className="lbc-orbit-ring r1" />
        <div className="lbc-orbit-ring r2" />
        <div className="lbc-orbit-ring r3" />
        <div className="lbc-orbit-node n1" style={{ background: '#7c3aed' }} />
        <div className="lbc-orbit-node n2" style={{ background: '#06b6d4' }} />
        <div className="lbc-orbit-node n3" style={{ background: '#f59e0b' }} />
        <div className="lbc-orbit-node n4" style={{ background: '#22c55e' }} />
        <div className="lbc-orbit-node n5" style={{ background: '#ec4899' }} />
        <div className="lbc-orbit-center">
          <Disc3 />
        </div>
      </div>
      <div className="lbc-orbitfoot">
        <span>En órbita</span>
        <b>In a Silent Way</b>
        <span>Miles Davis</span>
      </div>
    </div>
  );
}

const map: Record<CId, () => React.JSX.Element> = {
  mosaicwall: MosaicWall,
  timeline: Timeline,
  board: Board,
  spines: Spines,
  editorial: Editorial,
  orbital: Orbital,
};

export default function LibraryConceptsGallery() {
  return (
    <section className="lbc-gallery" aria-labelledby="lbc-title">
      <div className="lbc-heading">
        <div>
          <span className="lbc-eyebrow">CONCEPTOS DE BIBLIOTECA</span>
          <h3 id="lbc-title">Seis diseños originales</h3>
          <p>
            Direcciones de biblioteca alejadas de los reproductores comunes. Elige una o combina
            elementos.
          </p>
        </div>
        <span className="lbc-count">01 — 06</span>
      </div>
      <div className="lbc-grid">
        {concepts.map((c, i) => {
          const P = map[c.id];
          return (
            <article className={`lbc-card lbc-card-${c.id}`} key={c.id}>
              <P />
              <div className="lbc-copy">
                <span className="lbc-direction">{c.direction}</span>
                <h4>
                  {String(i + 1).padStart(2, '0')} · {c.name}
                </h4>
                <p>{c.note}</p>
              </div>
            </article>
          );
        })}
      </div>
      <p className="lbc-footer">
        Dime cuál te gusta (o una mezcla) y lo implemento como la biblioteca real.
      </p>
    </section>
  );
}
