import { Heart, Music2, Pause, Play, Pencil } from 'lucide-react';
import type { AlbumGroup, ScannedTrack, ViewMode } from '../types';

interface LibraryShowcaseProps {
  mode: ViewMode;
  tracks: ScannedTrack[];
  albumGroups: AlbumGroup[];
  favorites: string[];
  activeTrack: ScannedTrack | null;
  isPlaying: boolean;
  getCoverSrc: (coverUrl: string | null) => string;
  onPlayTrack: (track: ScannedTrack) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onOpenEdit: (track: ScannedTrack, e: React.MouseEvent) => void;
}

function CoverImg({ track, getCoverSrc, cls }: { track: ScannedTrack; getCoverSrc: (u: string | null) => string; cls: string }) {
  return track.cover_url ? (
    <img src={getCoverSrc(track.cover_url)} alt={track.title} className={cls} loading="lazy" />
  ) : (
    <div className={`showcase-coverfallback ${cls}`}><Music2 /></div>
  );
}

/* ---------- 01 · PARED DE PORTADAS ---------- */
function MosaicView({ tracks, activeTrack, isPlaying, getCoverSrc, onPlayTrack }: LibraryShowcaseProps) {
  return (
    <div className="show-mosaic">
      {tracks.slice(0, 200).map((t, i) => {
        const size = i % 5 === 0 ? 'lg' : i % 3 === 0 ? 'md' : 'sm';
        const isActive = activeTrack?.id === t.id && isPlaying;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onPlayTrack(t)}
            className={`show-mos-tile show-mos-${size} ${isActive ? 'is-playing' : ''}`}
            title={`${t.title} · ${t.artist}`}>
            <CoverImg track={t} getCoverSrc={getCoverSrc} cls="show-mos-img" />
            <span className="show-mos-play">{isActive ? <Pause /> : <Play />}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- 02 · LÍNEA DE TIEMPO POR DÉCADAS ---------- */
function TimelineView({ albumGroups, activeTrack, onPlayTrack }: LibraryShowcaseProps) {
  const sorted = [...albumGroups].sort((a, b) => (a.year ?? 0) - (b.year ?? 0));
  return (
    <div className="show-timeline">
      <div className="show-tl-rule">
        <span>1950</span><span>1970</span><span>1990</span><span>2010</span><span>2025</span>
      </div>
      <div className="show-tl-track">
        {sorted.map(a => {
          const isActive = activeTrack && a.tracks.some(t => t.id === activeTrack.id);
          return (
            <button key={a.key} type="button" onClick={() => onPlayTrack(a.tracks[0])} className={`show-tl-card ${isActive ? 'is-playing' : ''}`} style={{ background: 'linear-gradient(135deg,#ec4899,#9d174d)' }}>
              <small>{a.year ?? '—'}</small>
              <b>{a.album || 'Sin álbum'}</b>
              {isActive && <span className="show-eq" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- 03 · ESTANTERÍA DE VINILOS ---------- */
function SpinesView({ albumGroups, activeTrack, onPlayTrack }: LibraryShowcaseProps) {
  return (
    <div className="show-spines">
      <div className="show-shelf">
        {albumGroups.map((a, i) => {
          const isActive = activeTrack && a.tracks.some(t => t.id === activeTrack.id);
          return (
            <button key={a.key} type="button" onClick={() => onPlayTrack(a.tracks[0])} className={`show-spine ${isActive ? 'is-playing' : ''}`} style={{ background: `linear-gradient(180deg, hsl(${(i * 47) % 360} 70% 45%), hsl(${(i * 47 + 40) % 360} 70% 30%))` }} title={a.album}>
              <span>{(a.album || '?').slice(0, 1)}</span>
            </button>
          );
        })}
      </div>
      <div className="show-shelf-labels">
        {albumGroups.slice(0, 6).map(a => (
          <small key={a.key} title={a.album}>{(a.album || '?').slice(0, 12)}</small>
        ))}
      </div>
    </div>
  );
}

/* ---------- 04 · TABLERO DE COLUMNAS ---------- */
function BoardView({ tracks, favorites, getCoverSrc, onPlayTrack }: LibraryShowcaseProps) {
  const fav = tracks.filter(t => favorites.includes(t.id));
  const loss = tracks.filter(t => t.format.toUpperCase().includes('FLAC'));
  const recent = tracks.slice(0, 12);
  const col = (items: ScannedTrack[], label: string, hue: string) => (
    <div className="show-board-col">
      <div className="show-board-colhead" style={{ color: hue }}><b>{label}</b><span>{items.length}</span></div>
      {items.slice(0, 5).map(t => (
        <button key={t.id} type="button" onClick={() => onPlayTrack(t)} className="show-board-item">
          <CoverImg track={t} getCoverSrc={getCoverSrc} cls="show-board-thumb" />
          <span className="show-board-copy"><b>{t.title}</b><small>{t.artist}</small></span>
        </button>
      ))}
    </div>
  );
  return (
    <div className="show-board">
      {col(fav, 'Favoritas', '#ec4899')}
      {col(recent, 'Recientes', '#06b6d4')}
      {col(loss, 'Lossless', '#22c55e')}
    </div>
  );
}

/* ---------- 05 · PORTAFOLIO EDITORIAL ---------- */
function EditorialView({ tracks, activeTrack, isPlaying, getCoverSrc, onPlayTrack, favorites, onToggleFavorite, onOpenEdit }: LibraryShowcaseProps) {
  return (
    <div className="show-editorial">
      <div className="show-ed-head">
        <div><small>TU COLECCIÓN · VOL.01</small><h3>Escuchar<br />de cerca.</h3><span>{tracks.length} pistas · {new Set(tracks.map(t => t.artist)).size} artistas</span></div>
        <div className="show-ed-plate">S A K U R A<br />M U S I C</div>
      </div>
      <div className="show-ed-list">
        {tracks.slice(0, 20).map((t, i) => {
          const isActive = activeTrack?.id === t.id && isPlaying;
          return (
            <div key={t.id} className={`show-ed-row ${isActive ? 'is-active' : ''}`}>
              <span className="show-ed-num">{String(i + 1).padStart(2, '0')}</span>
              <CoverImg track={t} getCoverSrc={getCoverSrc} cls="show-ed-thumb" />
              <button type="button" onClick={() => onPlayTrack(t)} className="show-ed-title"><b>{t.title}</b><em>{t.artist}</em></button>
              <span className="show-ed-meta">{t.album} · {t.format}</span>
              <span className="show-ed-dur">{t.duration_str}</span>
              <span className="show-ed-actions">
                <button onClick={(e) => onToggleFavorite(t.id, e)} title="Favorita"><Heart className={favorites.includes(t.id) ? 'is-fav' : ''} /></button>
                <button onClick={(e) => onOpenEdit(t, e)} title="Editar"><Pencil /></button>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const viewMap: Record<string, (p: LibraryShowcaseProps) => React.JSX.Element> = {
  mosaic: MosaicView,
  timeline: TimelineView,
  spines: SpinesView,
  board: BoardView,
  editorial: EditorialView,
};

// Datos de previsualización (solo cuando la biblioteca está vacía, para
// poder ver las vistas sin cargar música en el navegador).
const DEMO_TRACKS: ScannedTrack[] = Array.from({ length: 18 }, (_, i) => ({
  id: `demo-${i}`,
  path: '',
  title: ['Blue in Green', 'Midnight City', 'Nude', 'Soul Love', 'Intro', 'Genesis', 'Weightless', 'Teardrop', 'Breathe', 'Angel', 'River', 'Fade'][i % 12] + (i > 11 ? ` ${i}` : ''),
  artist: ['Miles Davis', 'M83', 'Radiohead', 'David Bowie', 'The xx', 'Justice', 'Marconi Union', 'Massive Attack', 'Pink Floyd', 'Daft Punk', 'Coldplay', 'Amber'][i % 12],
  album: ['In a Silent Way', 'Hurry Up, We\'re Dreaming', 'In Rainbows', 'The Rise and Fall', 'Coexist', 'Audio Video Disco', 'Weightless', 'Mezzanine', 'Dark Side', 'Random Access', 'Ghost Stories', 'La Femme'][i % 12],
  album_artist: null,
  track_number: i + 1,
  duration: 240 + i * 7,
  duration_str: `${Math.floor((240 + i * 7) / 60)}:${String((240 + i * 7) % 60).padStart(2, '0')}`,
  format: i % 2 === 0 ? 'FLAC' : 'MP3',
  bitrate_kbps: i % 2 === 0 ? 1411 : 320,
  cover_url: null,
  year: 1959 + (i % 6) * 12,
  genre: null,
  file_size: 30_000_000,
}));
const DEMO_ALBUMS: AlbumGroup[] = Array.from({ length: 9 }, (_, i) => ({
  key: `demo-a${i}`,
  album: DEMO_TRACKS[i * 2].album,
  artist: DEMO_TRACKS[i * 2].artist,
  year: DEMO_TRACKS[i * 2].year,
  cover_url: null,
  tracks: DEMO_TRACKS.slice(i * 2, i * 2 + 2),
  totalDurationSec: 480,
  formats: ['FLAC'],
}));

export default function LibraryShowcase(props: LibraryShowcaseProps) {
  const Comp = viewMap[props.mode];
  if (!Comp) return null;
  const useDemo = props.tracks.length === 0;
  const p = useDemo
    ? { ...props, tracks: DEMO_TRACKS, albumGroups: DEMO_ALBUMS, favorites: ['demo-0'], activeTrack: DEMO_TRACKS[0], isPlaying: true }
    : props;
  return <div className="library-showcase">{Comp(p)}</div>;
}