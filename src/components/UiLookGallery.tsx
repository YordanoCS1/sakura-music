import type * as React from 'react';
import {
  Disc3,
  DownloadCloud,
  Heart,
  Home,
  Library,
  Music2,
  Pause,
  Play,
  Search,
  Settings,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';

type LookId =
  | 'glasspro'
  | 'splitdark'
  | 'compactpro'
  | 'immersive'
  | 'minimalist'
  | 'vibrant';

interface Look {
  id: LookId;
  name: string;
  direction: string;
  note: string;
  pros: string;
}

const looks: Look[] = [
  {
    id: 'glasspro',
    name: 'Glass Pro',
    direction: 'Evolución del actual · refinado · reproductor inmersivo',
    note: 'Mantiene la identidad de vidrio pero con un Now Playing amplio, métricas reales y mejor jerarquía. Es el camino de menor riesgo.',
    pros: 'Familiar para usuarios actuales · mínimo riesgo',
  },
  {
    id: 'splitdark',
    name: 'Split Dark',
    direction: 'Tres paneles · detalle lateral · muy Spotify',
    note: 'Sidebar fina + lista de canciones + panel de detalle/álbum a la derecha. La portada y la cola próxima siempre visibles.',
    pros: 'Mejor exploración de colecciones grandes',
  },
  {
    id: 'compactpro',
    name: 'Compact Pro',
    direction: 'Densidad alta · datos técnicos · estilo foobar2000',
    note: 'Filas finas con bitrate, tamaño y sample rate a la vista. Pensado para audiófilos que gestionan bibliotecas enormes.',
    pros: 'Máxima eficiencia para colecciones gigantes',
  },
  {
    id: 'immersive',
    name: 'Immersive',
    direction: 'Portada protagonista · glow de color dominante',
    note: 'El álbum actual ocupa el escenario con un resplandor teñido del color de su portada. Muy enfocado en la escucha.',
    pros: 'Efecto "wow" · celebra el arte de la portada',
  },
  {
    id: 'minimalist',
    name: 'Minimal Light',
    direction: 'Claro · limpio · tipográfico · muy editorial',
    note: 'Superficie marfil, mucho aire, tipografía protagonista. Rompe con el oscuro actual y conecta con el tema Editorial.',
    pros: 'Distintivo · reduce fatiga visual',
  },
  {
    id: 'vibrant',
    name: 'Vibrant Bloom',
    direction: 'Color vivo · tarjetas en bloques · divertido',
    note: 'Acentos saturados por bloque, tarjetas de colores y movimiento amable. Energía joven y cercana a una app de streaming.',
    pros: 'Moderno y memorable para nuevas audiencias',
  },
];

function TrackRow({
  num,
  title,
  artist,
  dur,
  active,
  mini = false,
}: {
  num: string;
  title: string;
  artist: string;
  dur: string;
  active?: boolean;
  mini?: boolean;
}) {
  return (
    <div className={`ulook-row ${mini ? 'ulook-row-mini' : ''} ${active ? 'is-active' : ''}`}>
      <span className="ulook-row-num">{active ? <span className="ulook-eq" /> : num}</span>
      <span className="ulook-row-cover" />
      <span className="ulook-row-copy">
        <b>{title}</b>
        <small>{artist}</small>
      </span>
      <span className="ulook-row-meta">{dur}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOOK 1 · GLASS PRO — ventana con home arriba y reproductor abajo   */
/* ------------------------------------------------------------------ */
function GlassProPreview() {
  return (
    <div className="ulook-preview ulook-glasspro">
      <div className="ulook-sidebar">
        <div className="ulook-brand"><i />Sakura</div>
        <div className="ulook-nav">
          <span className="is-on"><Home /> Inicio</span>
          <span><Library /> Biblioteca</span>
          <span><Search /> Buscar</span>
          <span><DownloadCloud /> Cola</span>
          <span><Settings /> Ajustes</span>
        </div>
        <div className="ulook-spacer" />
        <div className="ulook-sys"><small>Tauri + Rust</small><small>2.4 GB en uso</small></div>
      </div>
      <div className="ulook-main">
        <div className="ulook-hero">
          <div>
            <small>EXPERIENCIA HI-RES</small>
            <h4>Sakura Music</h4>
            <p>Reproducción sin pérdida, multihilo y acelerada por GPU.</p>
            <button>▶ Reproducir Aleatorio</button>
          </div>
          <div className="ulook-hero-art" />
        </div>
        <div className="ulook-stats">
          <div><small>Canciones</small><b>1 248</b></div>
          <div><small>Álbumes</small><b>96</b></div>
          <div><small>Artistas</small><b>31</b></div>
          <div><small>Escucha total</small><b>4 d 12 h</b></div>
        </div>
        <div className="ulook-cards">
          <div className="ulook-card"><div className="ulook-thumb" /><div><b>Blue in Green</b><small>Miles Davis</small></div></div>
          <div className="ulook-card"><div className="ulook-thumb" /><div><b>Midnight City</b><small>M83</small></div></div>
          <div className="ulook-card"><div className="ulook-thumb" /><div><b>Nude</b><small>Radiohead</small></div></div>
        </div>
      </div>
      <div className="ulook-player">
        <div className="ulook-player-art" />
        <div className="ulook-player-copy"><b>Blue in Green</b><small>Miles Davis</small></div>
        <div className="ulook-player-ctrl"><SkipBack /><span className="ulook-play"><Pause /></span><SkipForward /></div>
        <div className="ulook-player-bar"><i style={{ width: '38%' }} /></div>
        <Volume2 className="ulook-vol" />
        <Heart className="ulook-heart" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOOK 2 · SPLIT DARK — tres paneles                                  */
/* ------------------------------------------------------------------ */
function SplitDarkPreview() {
  return (
    <div className="ulook-preview ulook-splitdark">
      <div className="ulook-rail">
        <div className="ulook-rail-logo"><Disc3 /></div>
        <span className="is-on"><Home /></span>
        <span><Library /></span>
        <span><Search /></span>
        <span><DownloadCloud /></span>
        <div className="ulook-spacer" />
        <span><Settings /></span>
      </div>
      <div className="ulook-list">
        <div className="ulook-list-head"><b>Colección</b><small>1 248 canciones</small></div>
        <TrackRow num="01" title="Blue in Green" artist="Miles Davis" dur="5:37" active mini />
        <TrackRow num="02" title="Midnight City" artist="M83" dur="4:03" mini />
        <TrackRow num="03" title="Nude" artist="Radiohead" dur="4:15" mini />
        <TrackRow num="04" title="Soul Love" artist="David Bowie" dur="3:45" mini />
        <TrackRow num="05" title="Intro" artist="The xx" dur="2:07" mini />
      </div>
      <div className="ulook-detail">
        <div className="ulook-detail-art"><Music2 /></div>
        <small>ÁLBUM · IN A SILENT WAY</small>
        <b>In a<br />Silent Way</b>
        <span>Miles Davis</span>
        <span className="ulook-detail-tags">Jazz · 1969 · FLAC</span>
        <button>Reproducir álbum</button>
        <div className="ulook-queue">
          <small>PRÓXIMO EN COLA</small>
          <span>1 · It's About That Time</span>
          <span>2 · In a Silent Way</span>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOOK 3 · COMPACT PRO — tabla densa con datos técnicos               */
/* ------------------------------------------------------------------ */
function CompactProPreview() {
  return (
    <div className="ulook-preview ulook-compactpro">
      <div className="ulook-compact-top">
        <span className="is-on">Inicio</span><span>Biblioteca</span><span>Buscar</span><span>Cola</span>
        <div className="ulook-compact-search"><Search /><i>Buscar en la biblioteca…</i></div>
      </div>
      <div className="ulook-compact-head">
        <b>#</b><b>Título</b><b>Artista</b><b>Álbum</b><b>Fmt</b><b>Bitrate</b><b>Duración</b>
      </div>
      <div className="ulook-compact-rows">
        <div className="ulook-crow is-on"><span>01</span><span><i />Blue in Green</span><span>Miles Davis</span><span>In a Silent Way</span><em>FLAC</em><em>24/96</em><span>5:37</span></div>
        <div className="ulook-crow"><span>02</span><span><i />Midnight City</span><span>M83</span><span>Hurry Up, We're Dreaming</span><em>FLAC</em><em>24/96</em><span>4:03</span></div>
        <div className="ulook-crow"><span>03</span><span><i />Nude</span><span>Radiohead</span><span>In Rainbows</span><em>MP3</em><em>320k</em><span>4:15</span></div>
        <div className="ulook-crow"><span>04</span><span><i />Soul Love</span><span>David Bowie</span><span>The Rise and Fall…</span><em>MP3</em><em>320k</em><span>3:45</span></div>
      </div>
      <div className="ulook-compact-foot">
        <span>1 248 pistas · 2 396 MB</span><span>72 FLAC lossless</span>
        <div><SkipBack /><span className="ulook-play"><Play /></span><SkipForward /><i style={{ width: '55%' }} /></div>
        <span>02:14 / 05:37</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOOK 4 · IMMERSIVE — portada protagonista con glow                  */
/* ------------------------------------------------------------------ */
function ImmersivePreview() {
  return (
    <div className="ulook-preview ulook-immersive">
      <div className="ulook-imm-orb" />
      <div className="ulook-imm-top">
        <span className="is-on">Inicio</span><span>Biblioteca</span><span>Buscar</span><span>Cola</span>
      </div>
      <div className="ulook-imm-stage">
        <div className="ulook-imm-art" />
        <div className="ulook-imm-copy">
          <small>REPRODUCIENDO · ÁLBUM</small>
          <b>Blue in Green</b>
          <span>Miles Davis · In a Silent Way</span>
          <div className="ulook-imm-bar"><i style={{ width: '44%' }} /></div>
          <div className="ulook-imm-ctrl">
            <SkipBack /><Heart /><span className="ulook-play"><Pause /></span><SkipForward /><Volume2 />
          </div>
        </div>
      </div>
      <div className="ulook-imm-chips">
        <span>🎧 Ahora en tu oído</span><span>❤ 24 favoritas</span><span>FLAC lossless</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOOK 5 · MINIMAL LIGHT — editorial claro                            */
/* ------------------------------------------------------------------ */
function MinimalPreview() {
  return (
    <div className="ulook-preview ulook-minimal">
      <div className="ulook-min-rail">
        <span className="ulook-min-logo">S.</span>
        <b className="is-on">Inicio</b>
        <b>Biblioteca</b>
        <b>Buscar</b>
        <b>Cola</b>
        <b>Ajustes</b>
      </div>
      <div className="ulook-min-main">
        <div className="ulook-min-hero">
          <div>
            <small>TU COLECCIÓN · VOL. 01</small>
            <h4>Escuchar<br />de cerca.</h4>
            <p>1 248 canciones · 96 álbumes · 31 artistas</p>
          </div>
          <div className="ulook-min-art">SAKURA<br />AFTER<br />HOURS</div>
        </div>
        <div className="ulook-min-track">
          <span>01</span><b>Blue in Green</b><span>Miles Davis</span><span>5:37</span>
        </div>
        <div className="ulook-min-track is-on">
          <span>02</span><b>Midnight City</b><span>M83</span><span>4:03</span>
        </div>
        <div className="ulook-min-track">
          <span>03</span><b>Nude</b><span>Radiohead</span><span>4:15</span>
        </div>
        <div className="ulook-min-player"><Play /><b>Midnight City</b><span>M83</span><i style={{ width: '40%' }} /><small>1:38</small></div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* LOOK 6 · VIBRANT BLOOM — tarjetas de color                          */
/* ------------------------------------------------------------------ */
function VibrantPreview() {
  return (
    <div className="ulook-preview ulook-vibrant">
      <div className="ulook-vib-side">
        <span className="ulook-vib-brand">🌸 Sakura</span>
        <span className="is-on">Inicio</span>
        <span>Biblioteca</span>
        <span>Buscar</span>
        <span>Cola</span>
        <span>Ajustes</span>
      </div>
      <div className="ulook-vib-main">
        <div className="ulook-vib-hero">
          <div><small>BIENVENIDO DE VUELTA</small><h4>Tu música,<br />tu momento.</h4><button>Reproducir Aleatorio</button></div>
          <div className="ulook-vib-art">🌸</div>
        </div>
        <div className="ulook-vib-label">Hoy para ti</div>
        <div className="ulook-vib-cards">
          <div className="ulook-vib-card c1"><Music2 /><b>Blue in Green</b><small>Miles Davis</small></div>
          <div className="ulook-vib-card c2"><Music2 /><b>Midnight City</b><small>M83</small></div>
          <div className="ulook-vib-card c3"><Music2 /><b>Nude</b><small>Radiohead</small></div>
        </div>
        <div className="ulook-vib-player">
          <div className="ulook-vib-pth" />
          <div><b>Blue in Green</b><small>Miles Davis</small></div>
          <SkipBack /><span className="ulook-play"><Pause /></span><SkipForward />
          <div className="ulook-vib-pbar"><i style={{ width: '38%' }} /></div>
        </div>
      </div>
    </div>
  );
}

const previewMap: Record<LookId, () => React.JSX.Element> = {
  glasspro: GlassProPreview,
  splitdark: SplitDarkPreview,
  compactpro: CompactProPreview,
  immersive: ImmersivePreview,
  minimalist: MinimalPreview,
  vibrant: VibrantPreview,
};

export default function UiLookGallery() {
  return (
    <section className="ulook-gallery" aria-labelledby="ulook-title">
      <div className="ulook-heading">
        <div>
          <span className="ulook-eyebrow">MAQUETAS UI / UX · ELIGE UN LOOK</span>
          <h3 id="ulook-title">Seis looks para Inicio, Biblioteca y Reproductor</h3>
          <p>
            Propuestas de estructura y estilo para toda la ventana. Son maquetas de referencia: no cambian el tema
            actual, sirven para comparar y elegir la dirección antes de construir.
          </p>
        </div>
        <span className="ulook-count">01 — 06</span>
      </div>

      <div className="ulook-grid">
        {looks.map((look, index) => {
          const Preview = previewMap[look.id];
          return (
            <article className={`ulook-card ulook-card-${look.id}`} key={look.id}>
              <Preview />
              <div className="ulook-copy">
                <span className="ulook-direction">{look.direction}</span>
                <h4>{String(index + 1).padStart(2, '0')} · {look.name}</h4>
                <p>{look.note}</p>
                <small className="ulook-pros">✓ {look.pros}</small>
              </div>
            </article>
          );
        })}
      </div>

      <p className="ulook-footer">
        Cada tarjeta muestra el inicio, la biblioteca y el reproductor en un mismo estilo para compararlos lado a lado.
        Elige el que más te guste y lo convertimos en la dirección de la app.
      </p>
    </section>
  );
}