import { Disc3, Headphones, Library, ListMusic, Play, Search, SlidersHorizontal, Volume2 } from 'lucide-react';

const concepts = [
  {
    id: 'editorial',
    name: 'Editorial Hi-Fi',
    direction: 'Claro · tipográfico · de revista musical',
    note: 'Fondo marfil, tipografía protagonista y portadas tratadas como una colección editorial.',
  },
  {
    id: 'brutalist',
    name: 'Brutalista',
    direction: 'Crudo · geométrico · alto contraste',
    note: 'Bloques duros, líneas gruesas y acento lima; sin blur, brillos ni tarjetas redondeadas.',
  },
  {
    id: 'studio',
    name: 'Consola de estudio',
    direction: 'Hardware · técnico · táctil',
    note: 'Paneles de equipo de audio, medidores y controles inspirados en una consola física.',
  },
  {
    id: 'shanshui',
    name: 'Shanshui · 山水',
    direction: 'Paisaje chino · tinta · jade',
    note: 'Montañas de tinta, niebla, bambú y acentos de sello bermellón; una calma distinta a Sakura/Wuxia.',
  },
  {
    id: 'artdeco',
    name: 'Art déco · Jazz Club',
    direction: 'Elegante · geométrico · nocturno',
    note: 'Verde botella, oro cepillado y arcos inspirados en un club de jazz clásico.',
  },
  {
    id: 'rainforest',
    name: 'Selva tropical',
    direction: 'Exuberante · botánico · envolvente',
    note: 'Capas de hojas, luz filtrada y verdes profundos; una atmósfera de naturaleza viva.',
  },
  {
    id: 'cosmic',
    name: 'Archivo cósmico',
    direction: 'Espacial · inmersivo · atmosférico',
    note: 'Negro estelar, órbitas finas y portadas como cuerpos celestes; sobrio, no cyberpunk.',
  },
] as const;

function EditorialPreview() {
  return (
    <div className="concept-preview concept-editorial">
      <div className="concept-editorial-rail">
        <span className="concept-editorial-logo">S.</span>
        <span>DISCOVER</span>
        <Library />
        <Search />
        <ListMusic />
      </div>
      <div className="concept-editorial-main">
        <div className="concept-editorial-top"><span>YOUR MUSIC JOURNAL</span><span>VOL. 01 — 2026</span></div>
        <div className="concept-editorial-heading">
          <div><small>PERSONAL LIBRARY</small><h4>Listen<br />closely.</h4></div>
          <div className="concept-editorial-cover"><span>SAKURA<br />AFTER HOURS</span></div>
        </div>
        <div className="concept-editorial-track"><span>01</span><b>Blue in Green</b><span>Miles Davis</span><span>05:37</span></div>
        <div className="concept-editorial-player"><Play /><span /><small>02:18</small></div>
      </div>
    </div>
  );
}

function BrutalistPreview() {
  return (
    <div className="concept-preview concept-brutalist">
      <div className="concept-brutalist-top"><b>SAKURA//FM</b><span>● LIVE LOCAL</span><span>01:24:08</span></div>
      <div className="concept-brutalist-body">
        <div className="concept-brutalist-nav"><span>01 / LIBRARY</span><span>02 / SEARCH</span><span>03 / QUEUE</span></div>
        <div className="concept-brutalist-feature">
          <div><small>NOW PLAYING</small><strong>NO<br />SKIPS.</strong><span>YOUR MUSIC. YOUR RULES.</span></div>
          <div className="concept-brutalist-art"><span>NOISE<br />IS A<br />CHOICE</span></div>
        </div>
        <div className="concept-brutalist-footer"><Play /><b>Genesis</b><span>Justice</span><div className="concept-brutalist-meter" /><span>03:42</span></div>
      </div>
    </div>
  );
}

function StudioPreview() {
  return (
    <div className="concept-preview concept-studio">
      <div className="concept-studio-top"><span><Disc3 /> SAKURA AUDIO SYSTEMS</span><small>INPUT: LOCAL LIBRARY <i /></small></div>
      <div className="concept-studio-layout">
        <div className="concept-studio-art"><div><span>ANALOG<br />DREAMS</span></div><small>MONITOR A · FLAC 24 BIT</small></div>
        <div className="concept-studio-mixer">
          <span className="concept-studio-label">CHANNEL STRIP / 01</span>
          <b>Midnight City</b><small>M83 · Hurry Up, We're Dreaming</small>
          <div className="concept-studio-wave"><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
          <div className="concept-studio-controls"><span><SlidersHorizontal /> EQ</span><span><Headphones /> MONITOR</span><span><Volume2 /> 72%</span></div>
          <div className="concept-studio-transport"><span>02:14</span><button><Play /></button><span>04:03</span></div>
        </div>
      </div>
      <div className="concept-studio-bottom"><span>44.1 kHz</span><span>STEREO</span><span>OUTPUT 01</span><span>CPU 08%</span></div>
    </div>
  );
}

function ShanshuiPreview() {
  return (
    <div className="concept-preview concept-shanshui">
      <div className="concept-shanshui-top"><span>山水 · SOUND JOURNAL</span><span>清听 / 01</span></div>
      <div className="concept-shanshui-scene" aria-hidden="true">
        <div className="concept-shanshui-moon" />
        <svg viewBox="0 0 360 150" preserveAspectRatio="xMidYMax slice">
          <path d="M0 130 76 48l32 42 57-74 69 92 42-46 84 68Z" fill="#728477" opacity=".22" />
          <path d="m0 142 58-54 32 30 55-69 76 84 54-57 85 60Z" fill="#596e61" opacity=".38" />
          <path d="m0 151 66-34 34 14 49-52 62 49 57-30 92 51Z" fill="#394f44" opacity=".75" />
          <path d="M0 134c45-12 75-8 110 0s72 9 111 0 86-12 139 1v15H0Z" fill="#a9b5a0" opacity=".5" />
          <path d="M225 138c15-19 18-34 28-49m-18 17 11-2m-5 12 13-1m-28 3-10-7m34-15 9-9" fill="none" stroke="#394b3f" strokeWidth="2" />
        </svg>
        <div className="concept-shanshui-bamboo"><i /><i /><i /><i /></div>
        <span className="concept-shanshui-stamp">聽</span>
      </div>
      <div className="concept-shanshui-track"><span>今夜山中</span><b>Mountain at Dusk</b><span>03:18 ━━━━━●━━ 05:42</span></div>
    </div>
  );
}

function ArtDecoPreview() {
  return (
    <div className="concept-preview concept-artdeco">
      <div className="concept-artdeco-header"><span><Disc3 /> THE LISTENING ROOM</span><span>EST. 1928 · OPEN LATE</span></div>
      <div className="concept-artdeco-stage">
        <div className="concept-artdeco-rays"><i /><i /><i /><i /><i /></div>
        <div className="concept-artdeco-arch">
          <div className="concept-artdeco-sun"><span>SAKURA</span></div>
          <div className="concept-artdeco-copy"><small>TONIGHT'S SELECTION</small><b>Velvet<br />Sessions</b><span>JAZZ · SOUL · AFTER HOURS</span></div>
          <div className="concept-artdeco-record"><Disc3 /></div>
        </div>
        <span className="concept-artdeco-side-label">SIDE A — 33⅓ RPM</span>
      </div>
      <div className="concept-artdeco-player"><Play /><b>In a Sentimental Mood</b><span>Duke Ellington</span><i /><small>04:16</small></div>
    </div>
  );
}

function RainforestPreview() {
  return (
    <div className="concept-preview concept-rainforest">
      <div className="concept-rainforest-header"><span>FIELD NOTES / SOUND</span><span>CANOPY · 04</span></div>
      <div className="concept-rainforest-scene">
        <div className="concept-rainforest-sun" />
        <div className="concept-rainforest-leaves leaves-back"><i /><i /><i /><i /></div>
        <div className="concept-rainforest-hills"><i /><i /></div>
        <div className="concept-rainforest-leaves leaves-front"><i /><i /><i /><i /><i /></div>
        <div className="concept-rainforest-copy"><small>LISTEN AMONG THE</small><b>Living<br />green.</b></div>
      </div>
      <div className="concept-rainforest-player"><Play /><b>Emerald Canopy</b><span>Ambient collection</span><i /><small>04:12</small></div>
    </div>
  );
}

function CosmicPreview() {
  return (
    <div className="concept-preview concept-cosmic">
      <div className="concept-cosmic-top"><span>ORBITAL / PERSONAL AUDIO</span><span>LIBRARY · 08:42 PM</span></div>
      <div className="concept-cosmic-universe">
        <div className="concept-cosmic-orbit orbit-one" />
        <div className="concept-cosmic-orbit orbit-two" />
        <div className="concept-cosmic-planet"><span>03</span></div>
        <div className="concept-cosmic-label"><small>NOW IN ROTATION</small><b>Weightless</b><span>Marconi Union</span></div>
        <span className="concept-cosmic-star star-one" />
        <span className="concept-cosmic-star star-two" />
        <span className="concept-cosmic-star star-three" />
        <span className="concept-cosmic-star star-four" />
      </div>
      <div className="concept-cosmic-bottom"><span>02:08</span><i /><Play /><span>08:09</span></div>
    </div>
  );
}

export default function DesignConceptGallery() {
  return (
    <section className="design-concept-gallery" aria-labelledby="design-concepts-title">
      <div className="design-concept-heading">
        <div>
          <span className="design-concept-eyebrow">NUEVAS DIRECCIONES</span>
          <h3 id="design-concepts-title">Siete conceptos, siete identidades</h3>
          <p>Maquetas de referencia. No cambian el tema ni tus preferencias actuales.</p>
        </div>
        <span className="design-concept-count">01 — 07</span>
      </div>
      <div className="design-concept-grid">
        {concepts.map((concept, index) => (
          <article className={`design-concept-card concept-card-${concept.id}`} key={concept.id}>
            {index === 0 && <EditorialPreview />}
            {index === 1 && <BrutalistPreview />}
            {index === 2 && <StudioPreview />}
            {index === 3 && <ShanshuiPreview />}
            {index === 4 && <ArtDecoPreview />}
            {index === 5 && <RainforestPreview />}
            {index === 6 && <CosmicPreview />}
            <div className="design-concept-copy">
              <span>{concept.direction}</span>
              <h4>{concept.name}</h4>
              <p>{concept.note}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="design-concept-footer">Son propuestas de estructura y estilo; se pueden combinar o ajustar antes de convertir una en tema completo.</p>
    </section>
  );
}
