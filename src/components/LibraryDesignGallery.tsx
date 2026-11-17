import {
  Clock,
  Disc3,
  FolderOpen,
  Heart,
  List,
  Pause,
  Play,
  Plus,
  Search,
  SkipBack,
  SkipForward,
  Volume2,
} from 'lucide-react';

type DesignId =
  'albumfocus' | 'gridcovers' | 'denselist' | 'folderexplorer' | 'splitlist' | 'compactcards';

const designs: { id: DesignId; name: string; direction: string; note: string; pros: string }[] = [
  {
    id: 'albumfocus',
    name: 'Álbum centrado',
    direction: 'Encabezado grande + lista · estilo Apple/Spotify',
    note: 'Al elegir un álbum, un header inmersivo con portada grande, título, artista, año y duración total, con la lista de canciones debajo.',
    pros: 'Muy inmersivo · la portada protagonista',
  },
  {
    id: 'gridcovers',
    name: 'Cuadrícula de portadas',
    direction: 'Grid de tarjetas blancas M3 · play al hover',
    note: 'La cuadrícula como vista principal: tarjetas elevadas con portada, título y artista; el botón de play aparece al pasar el ratón.',
    pros: 'Simple y moderna · explora visualmente',
  },
  {
    id: 'denselist',
    name: 'Lista densa',
    direction: 'Tabla de columnas con datos técnicos',
    note: 'Lista con columnas ordenables: título, artista, álbum, formato, bitrate, duración y tamaño. Resalta la pista en reproducción.',
    pros: 'Máxima información para colecciones grandes',
  },
  {
    id: 'folderexplorer',
    name: 'Explorador por carpetas',
    direction: 'Breadcrumb + subcarpetas y canciones',
    note: 'Navega por tu disco con una ruta (breadcrumb) arriba y una cuadrícula de subcarpetas con miniaturas, mostrando las canciones de cada nivel.',
    pros: 'Ordena por ubicación real del archivo',
  },
  {
    id: 'splitlist',
    name: 'Lista dividida',
    direction: 'Portada grande a la izquierda + lista a la derecha',
    note: 'Layout de dos paneles: a la izquierda la portada del álbum/tema destacado con sus datos, a la derecha la lista completa de la colección.',
    pros: 'Combina contexto y densidad en una vista',
  },
  {
    id: 'compactcards',
    name: 'Tarjetas compactas',
    direction: 'Filas con mini-portada · máxima densidad',
    note: 'Filas finas con mini-portada, título, artista y duración; muy compactas para ver muchas pistas a la vez, con selección para edición en lote.',
    pros: 'Densa y eficiente como Winamp/foobar',
  },
];

function DiscThumb({ hue }: { hue: string }) {
  return <span className="lb-thumb" style={{ background: hue }} />;
}

/* ---------- Álbum centrado ---------- */
function AlbumFocus() {
  return (
    <div className="lb-preview lb-albumfocus">
      <div className="lb-topbar">
        <Search />
        <span>Biblioteca</span>
        <span className="lb-chip">Todo</span>
      </div>
      <div className="lb-albumhead">
        <div
          className="lb-bigcover"
          style={{ background: 'linear-gradient(135deg,#f6a8c8,#9d174d)' }}
        >
          <Disc3 />
        </div>
        <div className="lb-albumcopy">
          <small>ÁLBUM</small>
          <h4>In a Silent Way</h4>
          <span>Miles Davis · 1969 · Jazz</span>
          <span className="lb-metarow">18 canciones · 1h 04m</span>
          <div className="lb-actions">
            <button className="lb-playbtn">
              <Play />
              Reproducir
            </button>
            <button className="lb-ghostbtn">
              <Plus />
              Guardar
            </button>
          </div>
        </div>
      </div>
      <div className="lb-tracklist">
        <Track
          num="01"
          title="Shhh / Peaceful"
          artist="Miles Davis"
          dur="18:33"
          active
          hue="#ec4899"
        />
        <Track num="02" title="In a Silent Way" artist="Miles Davis" dur="19:10" hue="#db2777" />
        <Track
          num="03"
          title="It's About That Time"
          artist="Miles Davis"
          dur="11:27"
          hue="#be185d"
        />
      </div>
    </div>
  );
}

/* ---------- Cuadrícula de portadas ---------- */
function GridCovers() {
  return (
    <div className="lb-preview lb-gridcovers">
      <div className="lb-topbar">
        <Search />
        <span>Biblioteca</span>
        <span className="lb-chip">1248</span>
      </div>
      <div className="lb-grid">
        <CoverCard
          t="Blue in Green"
          a="Miles Davis"
          g="linear-gradient(135deg,#7c3aed,#ec4899)"
          active
        />
        <CoverCard t="Midnight City" a="M83" g="linear-gradient(135deg,#06b6d4,#3b82f6)" />
        <CoverCard t="Nude" a="Radiohead" g="linear-gradient(135deg,#f59e0b,#ef4444)" />
        <CoverCard t="Soul Love" a="David Bowie" g="linear-gradient(135deg,#22c55e,#14b8a6)" />
        <CoverCard t="Intro" a="The xx" g="linear-gradient(135deg,#6366f1,#a855f7)" />
        <CoverCard t="Genesis" a="Justice" g="linear-gradient(135deg,#f43f5e,#f97316)" />
      </div>
    </div>
  );
}

/* ---------- Lista densa ---------- */
function DenseList() {
  return (
    <div className="lb-preview lb-denselist">
      <div className="lb-topbar">
        <Search />
        <span>Biblioteca</span>
        <span className="lb-chip">Lista</span>
      </div>
      <div className="lb-thead">
        <span>#</span>
        <span>Título</span>
        <span>Artista</span>
        <span>Fmt</span>
        <span>Bitrate</span>
        <span>Dur</span>
      </div>
      <DenseRow
        num="1"
        title="Blue in Green"
        artist="Miles Davis"
        fmt="FLAC"
        br="24/96"
        dur="5:37"
        active
      />
      <DenseRow num="2" title="Midnight City" artist="M83" fmt="FLAC" br="24/96" dur="4:03" />
      <DenseRow num="3" title="Nude" artist="Radiohead" fmt="MP3" br="320k" dur="4:15" />
      <DenseRow num="4" title="Soul Love" artist="David Bowie" fmt="MP3" br="320k" dur="3:45" />
      <DenseRow num="5" title="Intro" artist="The xx" fmt="OPUS" br="OGG" dur="2:07" />
      <div className="lb-foobar">
        <SkipBack />
        <span className="lb-playpill">
          <Pause />
        </span>
        <SkipForward />
        <i style={{ width: '40%' }} />
        <Volume2 />
        <Clock />
        <span>02:14</span>
      </div>
    </div>
  );
}

/* ---------- Explorador por carpetas ---------- */
function FolderExplorer() {
  return (
    <div className="lb-preview lb-folder">
      <div className="lb-topbar">
        <Search />
        <span>Biblioteca</span>
        <span className="lb-chip">Carpetas</span>
      </div>
      <div className="lb-breadcrumb">
        <FolderOpen />
        Música <span>›</span> Jazz <span>›</span> <b>1969</b>
      </div>
      <div className="lb-folderfolders">
        <FolderCard name="Blue Note" n="24" />
        <FolderCard name="Columbia" n="18" />
        <FolderCard name="ECM" n="12" />
        <FolderCard name="Verve" n="15" />
      </div>
      <div className="lb-folderlabel">Canciones en 1969</div>
      <Track
        num="01"
        title="In a Silent Way"
        artist="Miles Davis"
        dur="19:10"
        active
        hue="#ec4899"
        mini
      />
      <Track num="02" title="Bitches Brew" artist="Miles Davis" dur="26:42" hue="#db2777" mini />
    </div>
  );
}

/* ---------- Lista dividida ---------- */
function SplitList() {
  return (
    <div className="lb-preview lb-splitlist">
      <div className="lb-topbar">
        <Search />
        <span>Biblioteca</span>
        <span className="lb-chip">1248</span>
      </div>
      <div className="lb-splitbody">
        <div className="lb-splitart">
          <div
            className="lb-sidecover"
            style={{ background: 'linear-gradient(135deg,#f6a8c8,#9d174d)' }}
          >
            <Disc3 />
          </div>
          <b>In a Silent Way</b>
          <small>Miles Davis</small>
          <em>FLAC · 24/96</em>
        </div>
        <div className="lb-splitlist">
          <div className="lb-listhead">
            <List /> <b>Colección</b>
            <small>1248 pistas</small>
          </div>
          <Track
            num="01"
            title="Blue in Green"
            artist="Miles Davis"
            dur="5:37"
            active
            hue="#ec4899"
            mini
          />
          <Track num="02" title="Midnight City" artist="M83" dur="4:03" hue="#db2777" mini />
          <Track num="03" title="Nude" artist="Radiohead" dur="4:15" hue="#be185d" mini />
          <Track num="04" title="Soul Love" artist="David Bowie" dur="3:45" hue="#9d174d" mini />
        </div>
      </div>
    </div>
  );
}

/* ---------- Tarjetas compactas ---------- */
function CompactCards() {
  return (
    <div className="lb-preview lb-compact">
      <div className="lb-topbar">
        <Search />
        <span>Biblioteca</span>
        <span className="lb-chip">1248</span>
      </div>
      <div className="lb-compactlist">
        <CompactRow title="Blue in Green" artist="Miles Davis" dur="5:37" hue="#ec4899" active />
        <CompactRow title="Midnight City" artist="M83" dur="4:03" hue="#db2777" />
        <CompactRow title="Nude" artist="Radiohead" dur="4:15" hue="#be185d" />
        <CompactRow title="Soul Love" artist="David Bowie" dur="3:45" hue="#9d174d" />
        <CompactRow title="Intro" artist="The xx" dur="2:07" hue="#701a75" />
        <CompactRow title="Genesis" artist="Justice" dur="3:42" hue="#be123c" />
      </div>
    </div>
  );
}

/* --- subcomponentes de maqueta --- */
function Track({
  num,
  title,
  artist,
  dur,
  active,
  mini,
  hue,
}: {
  num: string;
  title: string;
  artist: string;
  dur: string;
  active?: boolean;
  mini?: boolean;
  hue: string;
}) {
  return (
    <div className={`lb-track ${active ? 'is-active' : ''} ${mini ? 'lb-track-mini' : ''}`}>
      <span className="lb-tracknum">{active ? <span className="lb-eq" /> : num}</span>
      <DiscThumb hue={hue} />
      <span className="lb-trackcopy">
        <b>{title}</b>
        <small>{artist}</small>
      </span>
      <span className="lb-trackdur">{dur}</span>
      <span className="lb-trackheart">
        <Heart />
      </span>
    </div>
  );
}
function CoverCard({ t, a, g, active }: { t: string; a: string; g: string; active?: boolean }) {
  return (
    <div className={`lb-covercard ${active ? 'is-active' : ''}`}>
      <div className="lb-cover" style={{ background: g }}>
        <span className="lb-coverplay">{active ? <Pause /> : <Play />}</span>
      </div>
      <b>{t}</b>
      <small>{a}</small>
    </div>
  );
}
function DenseRow({
  num,
  title,
  artist,
  fmt,
  br,
  dur,
  active,
}: {
  num: string;
  title: string;
  artist: string;
  fmt: string;
  br: string;
  dur: string;
  active?: boolean;
}) {
  return (
    <div className={`lb-denserow ${active ? 'is-active' : ''}`}>
      <span>{num}</span>
      <span>
        <DiscThumb hue="#f1b6cd" />
        {title}
      </span>
      <span>{artist}</span>
      <em>{fmt}</em>
      <em>{br}</em>
      <span>{dur}</span>
    </div>
  );
}
function FolderCard({ name, n }: { name: string; n: string }) {
  return (
    <div className="lb-foldercard">
      <span className="lb-foldericon">
        <FolderOpen />
      </span>
      <b>{name}</b>
      <small>{n} canciones</small>
    </div>
  );
}
function CompactRow({
  title,
  artist,
  dur,
  hue,
  active,
}: {
  title: string;
  artist: string;
  dur: string;
  hue: string;
  active?: boolean;
}) {
  return (
    <div className={`lb-compactrow ${active ? 'is-active' : ''}`}>
      <DiscThumb hue={hue} />
      <b>{title}</b>
      <small>{artist}</small>
      <em>{dur}</em>
      <span className="lb-compactheart">{active ? <Pause /> : <Play />}</span>
    </div>
  );
}

const previewMap: Record<DesignId, () => React.JSX.Element> = {
  albumfocus: AlbumFocus,
  gridcovers: GridCovers,
  denselist: DenseList,
  folderexplorer: FolderExplorer,
  splitlist: SplitList,
  compactcards: CompactCards,
};

export default function LibraryDesignGallery() {
  return (
    <section className="lbg-gallery" aria-labelledby="lbg-title">
      <div className="lbg-heading">
        <div>
          <span className="lbg-eyebrow">NUEVOS DISEÑOS DE BIBLIOTECA</span>
          <h3 id="lbg-title">Seis propuestas para la biblioteca</h3>
          <p>
            Direcciones de layout en estilo M3 Zen. Son maquetas de referencia para elegir antes de
            construir.
          </p>
        </div>
        <span className="lbg-count">01 — 06</span>
      </div>
      <div className="lbg-grid">
        {designs.map((d, i) => {
          const Preview = previewMap[d.id];
          return (
            <article className={`lbg-card lbg-card-${d.id}`} key={d.id}>
              <Preview />
              <div className="lbg-copy">
                <span className="lbg-direction">{d.direction}</span>
                <h4>
                  {String(i + 1).padStart(2, '0')} · {d.name}
                </h4>
                <p>{d.note}</p>
                <small className="lbg-pros">✓ {d.pros}</small>
              </div>
            </article>
          );
        })}
      </div>
      <p className="lbg-footer">
        Elige uno (o una mezcla) y lo implemento como la biblioteca real en M3 Zen.
      </p>
    </section>
  );
}
