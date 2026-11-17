import { Disc3, Heart, Pause, Pencil, Play } from 'lucide-react';
import type { AlbumGroup, ScannedTrack } from '../types';

type NovelView = 'cds' | 'tilt' | 'glow' | 'portadas';

interface NovelLibraryViewsProps {
  view: NovelView;
  tracks: ScannedTrack[];
  albumGroups: AlbumGroup[];
  activeTrack: ScannedTrack | null;
  isPlaying: boolean;
  favorites: string[];
  getCoverSrc: (coverUrl: string | null) => string;
  onPlayTrack: (track: ScannedTrack) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  onPlayAlbum: (group: AlbumGroup) => void;
  onOpenEdit: (track: ScannedTrack, e: React.MouseEvent) => void;
}

function Cover({ track, getCoverSrc, className }: { track: ScannedTrack; getCoverSrc: (c: string | null) => string; className?: string }) {
  return track.cover_url ? (
    <img src={getCoverSrc(track.cover_url)} alt={track.title} className={`w-full h-full object-cover ${className ?? ''}`} />
  ) : (
    <div className={`w-full h-full flex items-center justify-center nv-placeholder ${className ?? ''}`}>
      <Disc3 className="w-6 h-6 nv-disc-icon" />
    </div>
  );
}

function isActive(track: ScannedTrack, active: ScannedTrack | null, playing: boolean) {
  return playing && active?.id === track.id;
}

// Botón de editar metadatos reutilizable (span para poder anidarlo en tarjetas).
function EditBtn({ track, onOpenEdit, className }: { track: ScannedTrack; onOpenEdit: (t: ScannedTrack, e: React.MouseEvent) => void; className?: string }) {
  return (
    <span
      className={`nv-edit-btn ${className ?? ''}`}
      onClick={(e) => { e.stopPropagation(); onOpenEdit(track, e); }}
      title="Editar metadatos">
      <Pencil />
    </span>
  );
}

/* ==================== 1 · CDs (portadas circulares) ==================== */
function CdsView({ tracks, activeTrack, isPlaying, onPlayTrack, favorites, onToggleFavorite, getCoverSrc, onOpenEdit }: NovelLibraryViewsProps) {
  return (
    <div className="nv-cds-list p-4 space-y-2">
      {tracks.map(track => {
        const active = isActive(track, activeTrack, isPlaying);
        const fav = favorites.includes(track.id);
        return (
          <div
            key={track.id}
            onClick={() => onPlayTrack(track)}
            className={`nv-cds-row flex items-center gap-4 p-2.5 rounded-2xl cursor-pointer ${active ? 'is-active' : ''}`}>
            <div className={`nv-cd ${active ? 'is-spinning' : ''}`}>
              <Cover track={track} getCoverSrc={getCoverSrc} className="nv-cd-art" />
              <span className="nv-cd-hole" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold nv-text truncate">{track.title}</div>
              <div className="text-[11px] nv-muted truncate">{track.artist} · {track.album}</div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(track.id, e); }}
              className="nv-icon-btn">
              <Heart className={`w-3.5 h-3.5 ${fav ? 'nv-fav' : ''}`} fill={fav ? 'currentColor' : 'none'} />
            </button>
            <EditBtn track={track} onOpenEdit={onOpenEdit} />
            <span className="text-[10px] nv-muted font-mono">{track.duration_str}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ==================== 2 · TARJETAS 3D TILT ==================== */
function TiltView({ tracks, getCoverSrc, onPlayTrack, activeTrack, isPlaying, onOpenEdit }: NovelLibraryViewsProps) {
  return (
    <div className="nv-tilt-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 p-5">
      {tracks.map(track => {
        const active = isActive(track, activeTrack, isPlaying);
        return (
          <div key={track.id} className="nv-tilt-card cursor-pointer" onClick={() => onPlayTrack(track)}>
            <div className="nv-tilt-inner">
              <div className="nv-tilt-art relative rounded-2xl overflow-hidden">
                <Cover track={track} getCoverSrc={getCoverSrc} />
                <div className="nv-tilt-play"><Play className="w-4 h-4 fill-current" /></div>
                <EditBtn track={track} onOpenEdit={onOpenEdit} className="nv-edit-corner" />
                {active && <div className="absolute top-2 right-2 nv-playing-badge"><Pause className="w-3 h-3" /></div>}
              </div>
              <div className="mt-2.5">
                <div className="text-xs font-bold nv-text truncate">{track.title}</div>
                <div className="text-[10px] nv-muted truncate">{track.artist}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==================== 3 · PORTADAS CON LUZ ==================== */
function GlowView({ tracks, getCoverSrc, onPlayTrack, activeTrack, isPlaying, onOpenEdit }: NovelLibraryViewsProps) {
  return (
    <div className="nv-glow-grid grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-5">
      {tracks.map(track => {
        const active = isActive(track, activeTrack, isPlaying);
        return (
          <div key={track.id} className="nv-glow-card cursor-pointer" onClick={() => onPlayTrack(track)}>
            <div className="nv-glow-art rounded-2xl overflow-hidden">
              <Cover track={track} getCoverSrc={getCoverSrc} />
              <div className="nv-glow-shine" />
              <div className="nv-glow-overlay" />
              <EditBtn track={track} onOpenEdit={onOpenEdit} className="nv-edit-corner" />
              <span className="nv-glow-name">{track.title}</span>
              {active && <div className="absolute top-2 right-2 nv-playing-badge"><Pause className="w-3 h-3" /></div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ==================== 4 · PORTADAS (álbumes con borde luminoso) ==================== */
function PortadasView({ albumGroups, getCoverSrc, onPlayAlbum, activeTrack, isPlaying, onOpenEdit }: NovelLibraryViewsProps) {
  return (
    <div className="nv-stack-wrap p-5">
      <div className="flex items-center gap-2 mb-5">
        <h3 className="text-sm font-bold nv-text">Tus álbumes</h3>
        <span className="text-[10px] nv-muted">({albumGroups.length})</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
        {albumGroups.map(group => {
          const active = isPlaying && group.tracks.some(t => t.id === activeTrack?.id);
          return (
            <div
              key={group.key}
              onClick={() => onPlayAlbum(group)}
              className={`nv-stack-card cursor-pointer rounded-2xl overflow-hidden ${active ? 'is-active' : ''}`}>
              <div className="nv-stack-art aspect-square">
                {group.cover_url ? (
                  <img src={getCoverSrc(group.cover_url)} alt={group.album} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center nv-placeholder"><Disc3 className="w-8 h-8 nv-disc-icon" /></div>
                )}
                {group.tracks.length > 0 && <EditBtn track={group.tracks[0]} onOpenEdit={onOpenEdit} className="nv-edit-corner" />}
                <div className="nv-stack-play"><Play className="w-4 h-4 fill-current" /></div>
              </div>
              <div className="p-3">
                <div className="text-[11px] font-bold nv-text truncate">{group.album}</div>
                <div className="text-[9px] nv-muted truncate">{group.artist}</div>
              </div>
            </div>
          );
        })}
        {albumGroups.length === 0 && <div className="text-xs nv-muted py-10">No hay álbumes para mostrar.</div>}
      </div>
    </div>
  );
}

export default function NovelLibraryViews(props: NovelLibraryViewsProps) {
  switch (props.view) {
    case 'cds': return <CdsView {...props} />;
    case 'tilt': return <TiltView {...props} />;
    case 'glow': return <GlowView {...props} />;
    case 'portadas': return <PortadasView {...props} />;
    default: return null;
  }
}