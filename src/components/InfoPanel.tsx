import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Music, Clock, HardDrive, FileAudio, FolderOpen, Trash2, Edit3, Mic, Album, Calendar, Headphones, Disc } from 'lucide-react';
import { invoke, showInFolder, trashItem, confirm } from '../bridge';
import toast from 'react-hot-toast';

interface FileItem { path: string; name: string; size: number; is_audio: boolean; }
interface Metadata {
  title: string | null; artist: string | null; album: string | null; year: string | null;
  track: string | null; genre: string | null; duration: number | null; bitrate: number | null;
  sampleRate: number | null; codec: string | null; cover: string | null; lyrics: string | null;
}
interface InfoPanelProps { file: FileItem; onClose: () => void; onEdit: () => void; onPlay?: () => void; }

export const InfoPanel: React.FC<InfoPanelProps> = ({ file, onClose, onEdit, onPlay }) => {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadMetadata(); }, [file.path]);

  const loadMetadata = async () => {
    setLoading(true);
    try { setMetadata(await invoke<Metadata>('get_file_metadata', { filePath: file.path })); }
    catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (await confirm(`¿Eliminar "${file.name}"? Se moverá a la papelera.`)) {
      await trashItem(file.path);
      toast.success('Archivo eliminado');
      onClose();
    }
  };

  const fmtDur = (s: number | null) => {
    if (!s) return '--:--';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = Math.floor(s % 60);
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  };

  const fmtSize = (b: number) => {
    if (!b) return '0 B';
    const units = ['B','KB','MB','GB'];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
  };

  const Row = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) => (
    <div className="flex items-center justify-between py-2.5 border-b last:border-0" style={{ borderColor: 'oklch(1 0 0 / 0.06)' }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{icon}{label}</div>
      <span className="text-xs font-medium truncate ml-4 max-w-[200px]">{value || '—'}</span>
    </div>
  );

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="fixed right-0 top-0 bottom-0 w-[420px] z-50 shadow-2xl overflow-y-auto flex flex-col"
      style={{ background: 'oklch(var(--zen-bg-card))', borderLeft: '1px solid oklch(1 0 0 / 0.1)' }}>
      
      <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b" style={{ background: 'oklch(var(--zen-bg-card))', borderColor: 'oklch(1 0 0 / 0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'oklch(var(--zen-sakura-base) / 0.15)' }}>
            <Disc size={16} style={{ color: 'var(--accent-primary)' }} />
          </div>
          <h2 className="text-base font-semibold">Información</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"><X size={18} /></button>
      </div>

      <div className="flex-1 p-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 rounded-full spin" style={{ borderColor: 'var(--border-color)', borderTopColor: 'var(--accent-primary)' }} />
          </div>
        ) : metadata ? (
          <div className="space-y-5">
            {/* Cover */}
            <div className="flex justify-center">
              {metadata.cover ? (
                <img src={metadata.cover} alt="" className="w-44 h-44 rounded-2xl shadow-xl object-cover" />
              ) : (
                <div className="w-44 h-44 rounded-2xl flex items-center justify-center" style={{ background: 'oklch(var(--zen-sakura-base) / 0.08)' }}>
                  <Music size={48} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}
            </div>

            {/* Title */}
            <div className="text-center">
              <h3 className="text-lg font-bold">{metadata.title || file.name.replace(/\.[^/.]+$/, '')}</h3>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>{metadata.artist || 'Artista desconocido'}</p>
              {metadata.album && <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{metadata.album}</p>}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {onPlay && (
                <button onClick={onPlay} className="zen-button-primary flex-1 flex items-center justify-center gap-2 text-sm py-2.5">
                  <Headphones size={16} /> Reproducir
                </button>
              )}
              <button onClick={onEdit} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: 'oklch(var(--zen-sakura-base) / 0.15)', color: 'var(--accent-primary)' }}>
                <Edit3 size={16} /> Editar
              </button>
              <button onClick={() => showInFolder(file.path)} className="px-3 py-2.5 rounded-xl transition-colors" style={{ border: '1px solid oklch(1 0 0 / 0.1)' }}>
                <FolderOpen size={16} />
              </button>
              <button onClick={handleDelete} className="px-3 py-2.5 rounded-xl transition-colors hover:bg-red-500/20 hover:text-red-500" style={{ border: '1px solid oklch(1 0 0 / 0.1)' }}>
                <Trash2 size={16} />
              </button>
            </div>

            {/* Technical Info */}
            <div className="rounded-xl p-4" style={{ background: 'oklch(0 0 0 / 0.03)', border: '1px solid oklch(1 0 0 / 0.06)' }}>
              <h4 className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                <HardDrive size={13} /> Información técnica
              </h4>
              <Row icon={<Clock size={13} />} label="Duración" value={fmtDur(metadata.duration)} />
              <Row icon={<FileAudio size={13} />} label="Formato" value={metadata.codec?.toUpperCase() || null} />
              <Row icon={<Headphones size={13} />} label="Bitrate" value={metadata.bitrate ? `${metadata.bitrate} kbps` : null} />
              <Row icon={<HardDrive size={13} />} label="Tamaño" value={fmtSize(file.size)} />
              {metadata.sampleRate && <Row icon={<Mic size={13} />} label="Sample Rate" value={`${metadata.sampleRate} Hz`} />}
              {metadata.track && <Row icon={<Album size={13} />} label="Pista" value={metadata.track} />}
              {metadata.year && <Row icon={<Calendar size={13} />} label="Año" value={metadata.year} />}
              {metadata.genre && <Row icon={<Music size={13} />} label="Género" value={metadata.genre} />}
            </div>

            {/* Lyrics */}
            {metadata.lyrics && (
              <div className="rounded-xl p-4" style={{ background: 'oklch(0 0 0 / 0.03)', border: '1px solid oklch(1 0 0 / 0.06)' }}>
                <h4 className="text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                  <Music size={13} /> Letras
                </h4>
                <p className="text-xs whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {metadata.lyrics.length > 300 ? `${metadata.lyrics.slice(0, 300)}...` : metadata.lyrics}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20">
            <Music size={40} className="mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No se pudieron cargar los metadatos</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};