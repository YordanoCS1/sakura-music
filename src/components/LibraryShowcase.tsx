import { Music2, Pause, Play } from 'lucide-react';
import type { ScannedTrack } from '../types';

interface LibraryShowcaseProps {
  mode: 'mosaic';
  tracks: ScannedTrack[];
  activeTrack: ScannedTrack | null;
  isPlaying: boolean;
  getCoverSrc: (coverUrl: string | null) => string;
  onPlayTrack: (track: ScannedTrack) => void;
}

function MosaicView({ tracks, activeTrack, isPlaying, getCoverSrc, onPlayTrack }: LibraryShowcaseProps) {
  return (
    <div className="show-mosaic">
      {tracks.map((t, i) => {
        const size = i % 5 === 0 ? 'lg' : i % 3 === 0 ? 'md' : 'sm';
        const isActive = activeTrack?.id === t.id && isPlaying;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onPlayTrack(t)}
            className={`show-mos-tile show-mos-${size} ${isActive ? 'is-playing' : ''}`}
            title={`${t.title} · ${t.artist}`}>
            {t.cover_url ? (
              <img src={getCoverSrc(t.cover_url)} alt={t.title} className="show-mos-img" loading="lazy" />
            ) : (
              <div className="show-mos-fallback"><Music2 /></div>
            )}
            <span className="show-mos-caption">
              <span className="show-mos-caption-title">{t.title}</span>
              <span className="show-mos-caption-artist">{t.artist}</span>
            </span>
            <span className="show-mos-play">{isActive ? <Pause /> : <Play />}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function LibraryShowcase(props: LibraryShowcaseProps) {
  if (props.mode !== 'mosaic') return null;
  return <div className="library-showcase"><MosaicView {...props} /></div>;
}