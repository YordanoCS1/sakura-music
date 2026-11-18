import { useEffect, useRef } from 'react';
import { AlertTriangle, Loader2, Music2, Trash2, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ScannedTrack, ThemeMode } from '../types';

interface DeleteTracksDialogProps {
  theme: ThemeMode;
  tracks: ScannedTrack[];
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}

export default function DeleteTracksDialog({
  theme,
  tracks,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteTracksDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  // Ya ponemos el foco en "Cancelar"; acá sólo queremos que Tab no se escape.
  const dialogRef = useFocusTrap<HTMLElement>(tracks.length > 0, false);

  useEffect(() => {
    if (tracks.length === 0) return;

    cancelButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !isDeleting) onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [tracks.length, isDeleting, onCancel]);

  if (tracks.length === 0) return null;

  const isSingleTrack = tracks.length === 1;
  const visibleTracks = tracks.slice(0, 3);
  const hiddenCount = tracks.length - visibleTracks.length;

  return (
    <div
      className={`theme-modal-backdrop modal-delete tema-${theme} fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md animate-in fade-in duration-fast`}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) onCancel();
      }}
    >
      <section
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-tracks-title"
        aria-describedby="delete-tracks-description"
        className={`glass-card theme-modal modal-delete tema-${theme} w-full max-w-md overflow-hidden rounded-3xl border border-white/10 shadow-2xl animate-in zoom-in-95 duration-base`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex items-start gap-4 border-b border-white/10 bg-white/[0.03] px-6 py-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-400/25 bg-gradient-to-br from-rose-500/20 to-orange-500/10 text-rose-300 shadow-lg shadow-rose-950/20">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="mb-1 text-2xs font-bold uppercase tracking-[0.18em] text-rose-300/80">
              Acción permanente
            </p>
            <h2 id="delete-tracks-title" className="text-lg font-bold text-white">
              {isSingleTrack ? '¿Eliminar esta canción?' : `¿Eliminar ${tracks.length} canciones?`}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            aria-label="Cancelar eliminación"
            className="rounded-xl p-2 text-ink-400 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-4 px-6 py-5">
          <p id="delete-tracks-description" className="text-sm leading-relaxed text-ink-300">
            {isSingleTrack
              ? 'Se borrará este archivo de audio de tu disco, no solo de la biblioteca.'
              : `Se borrarán ${tracks.length} archivos de audio de tu disco, no solo de la biblioteca.`}
          </p>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-3">
            {visibleTracks.map((track) => (
              <div key={track.id} className="flex min-w-0 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-accent-300">
                  <Music2 className="h-4 w-4" />
                </span>
                <span
                  className="min-w-0 flex-1 truncate text-xs font-semibold text-ink-100"
                  title={track.title}
                >
                  {track.title}
                </span>
                <span className="shrink-0 rounded-md border border-white/10 px-1.5 py-0.5 text-2xs font-bold uppercase text-ink-400">
                  {track.format}
                </span>
              </div>
            ))}
            {hiddenCount > 0 && (
              <p className="pl-11 text-xs text-ink-400">
                y {hiddenCount} {hiddenCount === 1 ? 'canción más' : 'canciones más'}
              </p>
            )}
          </div>

          <div className="flex items-start gap-2.5 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-3.5 py-3 text-xs leading-relaxed text-amber-100/80">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
            <span>Esta acción no se puede deshacer. El archivo no irá a la Papelera.</span>
          </div>
        </div>

        <footer className="flex justify-end gap-2 border-t border-white/10 bg-white/[0.02] px-6 py-4">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void onConfirm()}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300/20 bg-gradient-to-r from-rose-600 to-rose-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-950/30 transition-all hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {isDeleting ? 'Eliminando…' : 'Eliminar permanentemente'}
          </button>
        </footer>
      </section>
    </div>
  );
}
