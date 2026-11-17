import { Disc3, Heart, Home, Library, ListMusic, Minus, Music2, Pause, Play, Plus, Search, Settings, SkipBack, SkipForward, X } from 'lucide-react';

type SakuraDesignId = 'glass' | 'wave' | 'kyoto' | 'neon';

const designs: { id: SakuraDesignId; name: string; direction: string; note: string; pros: string }[] = [
  {
    id: 'glass',
    name: 'Sakura Glass',
    direction: 'Claro + header de álbum + lista',
    note: 'Aspecto Apple Music / Spotify: una barra superior centrada, un gran header de biblioteca con portada protagonista y, debajo, la lista de canciones. Blanco marfil y rosa.',
    pros: 'Familiar y limpio',
  },
  {
    id: 'wave',
    name: 'Sakura Wave',
    direction: 'Barra flotante + grid de vinilos',
    note: 'Temática musical: tarjetas de álbum tipo vinilo con ranuras, una barra de reproductor ancha y flotante con ecualizador, y portadas que giran al reproducir.',
    pros: 'Musical y divertido',
  },
  {
    id: 'kyoto',
    name: 'Sakura Kyoto',
    direction: 'Panel lateral marfil + listado horizontal',
    note: 'Estampado japonés zen: un panel lateral de madera clara con navegación vertical, portadas alineadas en filas horizontales como discos, y acentos de pétalo.',
    pros: 'Identidad japonesa marcada',
  },
  {
    id: 'neon',
    name: 'Sakura Neon',
    direction: 'Oscuro de cristal + filas neon',
    note: 'Nocturno dramático: panel lateral de cristal oscuro, lista de canciones en filas con glow rosa al hover, y un reproductor fijo con brillo neón.',
    pros: 'Alto contraste',
  },
];

function DiscThumb({ hue }: { hue: string }) {
  return <span className="mk-thumb" style={{ background: hue }} />;
}

/* =========================================================
   1) SAKURA GLASS — header de álbum + lista (Apple/Spotify)
   ========================================================= */
function GlassPreview() {
  return (
    <div className="mk sd-glass">
      <div className="mk-titlebar"><Mark /><span className="mk-tbname">Sakura Music</span><span className="mk-tbspacer" /><TB />{tbBtns()}</div>
      <div className="mk-topnav center"><NavPill label="Inicio" active /><NavPill label="Biblioteca" /><NavPill label="Buscar" /><NavPill label="Ajustes" /></div>
      <div className="mk-albumhead">
        <div className="mk-bigcover" style={{ background: 'linear-gradient(135deg,#f9a8d4,#b5126a)' }}><Disc3 /></div>
        <div className="mk-acopy">
          <small>ÁLBUM</small>
          <b>In a Silent Way</b>
          <span>Miles Davis · 1969 · Jazz</span>
          <span className="mk-metarow">18 canciones · 1h 04m</span>
          <div className="mk-actions"><span className="mk-playbtn"><Play />Reproducir</span><span className="mk-ghost"><Plus />Guardar</span></div>
        </div>
      </div>
      <div className="mk-list">
        <Row n="01" t="Shhh / Peaceful" a="Miles Davis" d="18:33" hue="linear-gradient(135deg,#f9a8d4,#d63384)" active />
        <Row n="02" t="In a Silent Way" a="Miles Davis" d="19:10" hue="linear-gradient(135deg,#fbcfe8,#a21caf)" />
        <Row n="03" t="It's About That Time" a="Miles Davis" d="11:27" hue="linear-gradient(135deg,#fda4af,#be123c)" />
      </div>
    </div>
  );
}

/* =========================================================
   2) SAKURA WAVE — barra flotante + grid de vinilos
   ========================================================= */
function WavePreview() {
  return (
    <div className="mk sd-wave">
      <div className="mk-titlebar"><Mark /><span className="mk-tbname">Sakura Music</span><span className="mk-tbspacer" /><TB />{tbBtns()}</div>
      <div className="mk-wavetop">
        <span className="mk-logo">桜</span>
        <span className="mk-wsearch"><Search /><i>Buscar…</i></span>
      </div>
      <div className="mk-vinyls">
        <Vinyl t="Blue in Green" a="Miles Davis" g="linear-gradient(135deg,#f9a8d4,#d63384)" spin />
        <Vinyl t="Midnight City" a="M83" g="linear-gradient(135deg,#22d3ee,#0ea5e9)" />
        <Vinyl t="Nude" a="Radiohead" g="linear-gradient(135deg,#f59e0b,#ef4444)" />
        <Vinyl t="Intro" a="The xx" g="linear-gradient(135deg,#a78bfa,#7c3aed)" />
        <Vinyl t="Genesis" a="Justice" g="linear-gradient(135deg,#fb7185,#be123c)" />
        <Vinyl t="Soul Love" a="Bowie" g="linear-gradient(135deg,#34d399,#0d9488)" />
      </div>
      <div className="mk-waveplayer">
        <VinylSmall g="linear-gradient(135deg,#f9a8d4,#d63384)" spin />
        <div className="mk-wpcopy"><b>Blue in Green</b><small>Miles Davis</small></div>
        <span className="mk-pbtn"><SkipBack /></span>
        <span className="mk-pbtn mk-play"><Pause /></span>
        <span className="mk-pbtn"><SkipForward /></span>
        <Eq />
        <div className="mk-wseek"><i style={{ width: '55%' }} /></div>
      </div>
    </div>
  );
}

/* =========================================================
   3) SAKURA KYOTO — panel lateral marfil + filas de discos
   ========================================================= */
function KyotoPreview() {
  return (
    <div className="mk sd-kyoto">
      <div className="mk-titlebar"><Mark /><span className="mk-tbname">Sakura Music</span><span className="mk-tbspacer" /><TB />{tbBtns()}</div>
      <div className="mk-kyotobody">
        <div className="mk-kpanel">
          <span className="mk-klogo">桜</span>
          <span className="mk-kitem is-active"><Home />Inicio</span>
          <span className="mk-kitem"><Library />Colección</span>
          <span className="mk-kitem"><Search />Buscar</span>
          <span className="mk-kitem"><Settings />Ajustes</span>
          <span className="mk-kspacer" />
          <span className="mk-kcard"><Heart /> Favoritas</span>
        </div>
        <div className="mk-kcontent">
          <div className="mk-khead">
            <div><small>BIENVENIDO</small><b>Colección Sakura</b></div>
            <span className="mk-kchip">1248 pistas</span>
          </div>
          <div className="mk-krow">
            <DiscThumb hue="linear-gradient(135deg,#f9a8d4,#d63384)" />
            <div className="mk-krcopy"><b>Blue in Green</b><small>Miles Davis</small></div>
            <span className="mk-kplay">{'▶'}</span>
          </div>
          <div className="mk-krow">
            <DiscThumb hue="linear-gradient(135deg,#fda4af,#be123c)" />
            <div className="mk-krcopy"><b>Midnight City</b><small>M83</small></div>
            <span className="mk-kplay">{'▶'}</span>
          </div>
          <div className="mk-krow">
            <DiscThumb hue="linear-gradient(135deg,#fbcfe8,#a21caf)" />
            <div className="mk-krcopy"><b>Nude</b><small>Radiohead</small></div>
            <span className="mk-kplay">{'▶'}</span>
          </div>
        </div>
      </div>
      <div className="mk-kplayer">
        <DiscThumb hue="linear-gradient(135deg,#f9a8d4,#d63384)" />
        <div className="mk-kpcopy"><b>Blue in Green</b><small>Miles Davis</small></div>
        <span className="mk-pbtn"><SkipBack /></span>
        <span className="mk-pbtn mk-play"><Play /></span>
        <span className="mk-pbtn"><SkipForward /></span>
      </div>
    </div>
  );
}

/* =========================================================
   4) SAKURA NEON — panel oscuro de cristal + filas neon
   ========================================================= */
function NeonPreview() {
  return (
    <div className="mk sd-neon">
      <div className="mk-titlebar"><Mark /><span className="mk-tbname">Sakura Music</span><span className="mk-tbspacer" /><TB />{tbBtns()}</div>
      <div className="mk-neonbody">
        <div className="mk-npanel">
          <span className="mk-nlogo">桜</span>
          <NeonIcon Icon={Home} active />
          <NeonIcon Icon={Library} />
          <NeonIcon Icon={Search} />
          <NeonIcon Icon={Settings} />
          <span className="mk-nspacer" />
          <span className="mk-nchip">♡</span>
        </div>
        <div className="mk-nmain">
          <div className="mk-nhead">
            <b>Biblioteca</b>
            <span className="mk-nfilters"><i className="is-on">Todo</i><i>FLAC</i><i>Favoritas</i></span>
          </div>
          <NeonRow t="Blue in Green" a="Miles Davis" d="5:37" hue="linear-gradient(135deg,#f9a8d4,#d63384)" active />
          <NeonRow t="Midnight City" a="M83" d="4:03" hue="linear-gradient(135deg,#22d3ee,#0ea5e9)" />
          <NeonRow t="Nude" a="Radiohead" d="4:15" hue="linear-gradient(135deg,#a78bfa,#7c3aed)" />
          <NeonRow t="Intro" a="The xx" d="2:07" hue="linear-gradient(135deg,#f59e0b,#ef4444)" />
        </div>
      </div>
      <div className="mk-neonplayer">
        <DiscThumb hue="linear-gradient(135deg,#f9a8d4,#d63384)" />
        <div className="mk-npcopy"><b>Blue in Green</b><small>Miles Davis</small></div>
        <span className="mk-pbtn"><SkipBack /></span>
        <span className="mk-pbtn mk-play"><Pause /></span>
        <span className="mk-pbtn"><SkipForward /></span>
        <div className="mk-nseek"><i style={{ width: '48%' }} /></div>
      </div>
    </div>
  );
}

/* ---------- subcomponentes compartidos ---------- */
function Mark() {
  return <span className="mk-mark">桜</span>;
}
function TB() {
  return <span />;
}
function tbBtns() {
  return (
    <>
      <span className="mk-tb"><Minus /></span>
      <span className="mk-tb"><ListMusic /></span>
      <span className="mk-tb mk-tbclose"><X /></span>
    </>
  );
}
function NavPill({ label, active }: { label: string; active?: boolean }) {
  return <span className={`mk-np ${active ? 'is-active' : ''}`}>{label}</span>;
}
function Row({ n, t, a, d, hue, active }: { n: string; t: string; a: string; d: string; hue: string; active?: boolean }) {
  return (
    <div className={`mk-row ${active ? 'is-active' : ''}`}>
      <span className="mk-rn">{active ? <span className="mk-eq" /> : n}</span>
      <DiscThumb hue={hue} />
      <span className="mk-rcopy"><b>{t}</b><small>{a}</small></span>
      <span className="mk-rdur">{d}</span>
      <span className="mk-rheart"><Heart /></span>
    </div>
  );
}
function Vinyl({ t, a, g, spin }: { t: string; a: string; g: string; spin?: boolean }) {
  return (
    <div className={`mk-vinyl ${spin ? 'is-spin' : ''}`}>
      <div className="mk-vcover" style={{ background: g }}><Music2 /></div>
      <b>{t}</b>
      <small>{a}</small>
    </div>
  );
}
function VinylSmall({ g, spin }: { g: string; spin?: boolean }) {
  return <div className={`mk-vsmall ${spin ? 'is-spin' : ''}`} style={{ background: g }}><Music2 /></div>;
}
function Eq() {
  return <span className="mk-eqbar"><i /><i /><i /><i /></span>;
}
function NeonIcon({ Icon, active }: { Icon: typeof Home; active?: boolean }) {
  return <span className={`mk-nicon ${active ? 'is-active' : ''}`}><Icon /></span>;
}
function NeonRow({ t, a, d, hue, active }: { t: string; a: string; d: string; hue: string; active?: boolean }) {
  return (
    <div className={`mk-nrow ${active ? 'is-active' : ''}`}>
      <DiscThumb hue={hue} />
      <span className="mk-nrcopy"><b>{t}</b><small>{a}</small></span>
      <span className="mk-nrdur">{d}</span>
      <span className="mk-nplay"><Play /></span>
    </div>
  );
}

const previewMap: Record<SakuraDesignId, () => React.JSX.Element> = {
  glass: GlassPreview,
  wave: WavePreview,
  kyoto: KyotoPreview,
  neon: NeonPreview,
};

export default function SakuraDesignGallery() {
  return (
    <section className="lbg-gallery" aria-labelledby="sd-title">
      <div className="lbg-heading">
        <div>
          <span className="lbg-eyebrow">REDISEÑO SAKURA · MAQUETAS</span>
          <h3 id="sd-title">Cuatro temáticas distintas de rediseño</h3>
          <p>Cada propuesta usa un layout, navegación y estilo visual propios. Elige la temática que prefieras para implementarla en la app.</p>
        </div>
        <span className="lbg-count">01 — 04</span>
      </div>
      <div className="lbg-grid">
        {designs.map((d, i) => {
          const Preview = previewMap[d.id];
          return (
            <article className="lbg-card" key={d.id}>
              <Preview />
              <div className="lbg-copy">
                <span className="lbg-direction">{d.direction}</span>
                <h4>{String(i + 1).padStart(2, '0')} · {d.name}</h4>
                <p>{d.note}</p>
                <small className="lbg-pros">✓ {d.pros}</small>
              </div>
            </article>
          );
        })}
      </div>
      <p className="lbg-footer">Elige una temática (o una mezcla de elementos) y la implemento en el tema real de la app.</p>
    </section>
  );
}