import { AlertCircle, ImagePlus, Layers, Loader2, Music2, Save, Trash2, X } from 'lucide-react';
import { useFocusTrap } from '../hooks/useFocusTrap';
import type { ThemeMode } from '../types';

interface BatchModalProps {
  theme: ThemeMode;
  open: boolean;
  selectedCount: number;
  isSaving: boolean;
  feedback: string | null;
  batchArtist: string;
  batchAlbum: string;
  batchAlbumArtist: string;
  batchYear: string;
  batchGenre: string;
  batchCoverPath: string | null;
  batchCoverPreviewUrl: string | null;
  batchRemoveCover: boolean;
  applyArtist: boolean;
  applyAlbum: boolean;
  applyAlbumArtist: boolean;
  applyYear: boolean;
  applyGenre: boolean;
  applyCover: boolean;
  onClose: () => void;
  onSave: (e: React.FormEvent) => void;
  onPickCover: () => void;
  onBatchArtistChange: (v: string) => void;
  onBatchAlbumChange: (v: string) => void;
  onBatchAlbumArtistChange: (v: string) => void;
  onBatchYearChange: (v: string) => void;
  onBatchGenreChange: (v: string) => void;
  onApplyArtistChange: (v: boolean) => void;
  onApplyAlbumChange: (v: boolean) => void;
  onApplyAlbumArtistChange: (v: boolean) => void;
  onApplyYearChange: (v: boolean) => void;
  onApplyGenreChange: (v: boolean) => void;
  onApplyCoverChange: (v: boolean) => void;
  onSetCoverPath: (v: string | null) => void;
  onSetCoverPreview: (v: string | null) => void;
  onSetRemoveCover: (v: boolean) => void;
}

export default function BatchModal({
  theme,
  open,
  selectedCount,
  isSaving,
  feedback,
  batchArtist,
  batchAlbum,
  batchAlbumArtist,
  batchYear,
  batchGenre,
  batchCoverPath,
  batchCoverPreviewUrl,
  batchRemoveCover,
  applyArtist,
  applyAlbum,
  applyAlbumArtist,
  applyYear,
  applyGenre,
  applyCover,
  onClose,
  onSave,
  onPickCover,
  onBatchArtistChange,
  onBatchAlbumChange,
  onBatchAlbumArtistChange,
  onBatchYearChange,
  onBatchGenreChange,
  onApplyArtistChange,
  onApplyAlbumChange,
  onApplyAlbumArtistChange,
  onApplyYearChange,
  onApplyGenreChange,
  onApplyCoverChange,
  onSetCoverPath,
  onSetCoverPreview,
  onSetRemoveCover,
}: BatchModalProps) {
  const dialogRef = useFocusTrap<HTMLDivElement>(open);
  if (!open) return null;
  return (
    <div
      className={`theme-modal-backdrop modal-batch tema-${theme} fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6`}
      onClick={() => !isSaving && onClose()}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Edición en lote"
        className={`glass-card theme-modal modal-batch tema-${theme} rounded-3xl border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-base`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-accent-500/20 to-purple-500/20 border border-accent-500/30 flex items-center justify-center text-accent-400 flex-shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Edición de Metadatos en Lote</span>
                <span className="text-2xs font-mono px-2 py-0.5 rounded-full bg-accent-500/20 text-accent-300 border border-accent-500/30">
                  {selectedCount} pistas
                </span>
              </h3>
              <p className="text-xs text-ink-400">
                Marca los campos que deseas modificar. Los desmarcados se mantendrán intactos.
              </p>
            </div>
          </div>

          <button
            onClick={() => !isSaving && onClose()}
            className="p-2 rounded-xl text-ink-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido / Campos editables */}
        <div className="p-6 overflow-y-auto custom-scroll space-y-4 text-xs">
          {/* Notificación de estado */}
          {feedback && (
            <div
              className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
                feedback.startsWith('✓')
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{feedback}</span>
            </div>
          )}

          {/* Artista */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${applyArtist ? 'bg-white/5 border-accent-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-medium text-ink-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyArtist}
                  onChange={(e) => onApplyArtistChange(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0"
                />
                <span>Artista</span>
              </label>
              <span className="text-2xs text-ink-500 font-mono">
                {applyArtist ? 'Se aplicará' : 'Sin cambios'}
              </span>
            </div>
            <input
              type="text"
              value={batchArtist}
              disabled={!applyArtist}
              onChange={(e) => onBatchArtistChange(e.target.value)}
              placeholder="Ej: LiSA, Aimer, Queen"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-ink-600 focus:outline-none focus:border-accent-500 disabled:opacity-40"
            />
          </div>

          {/* Álbum */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${applyAlbum ? 'bg-white/5 border-accent-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-medium text-ink-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyAlbum}
                  onChange={(e) => onApplyAlbumChange(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0"
                />
                <span>Álbum</span>
              </label>
              <span className="text-2xs text-ink-500 font-mono">
                {applyAlbum ? 'Se aplicará' : 'Sin cambios'}
              </span>
            </div>
            <input
              type="text"
              value={batchAlbum}
              disabled={!applyAlbum}
              onChange={(e) => onBatchAlbumChange(e.target.value)}
              placeholder="Ej: THE BOOK, Greatest Hits"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-ink-600 focus:outline-none focus:border-accent-500 disabled:opacity-40"
            />
          </div>

          {/* Artista del Álbum */}
          <div
            className={`p-3.5 rounded-2xl border transition-all ${applyAlbumArtist ? 'bg-white/5 border-accent-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 font-medium text-ink-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyAlbumArtist}
                  onChange={(e) => onApplyAlbumArtistChange(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0"
                />
                <span>Artista del Álbum</span>
              </label>
              <span className="text-2xs text-ink-500 font-mono">
                {applyAlbumArtist ? 'Se aplicará' : 'Sin cambios'}
              </span>
            </div>
            <input
              type="text"
              value={batchAlbumArtist}
              disabled={!applyAlbumArtist}
              onChange={(e) => onBatchAlbumArtistChange(e.target.value)}
              placeholder="Ej: Varios Artistas, Banda Sonora"
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-ink-600 focus:outline-none focus:border-accent-500 disabled:opacity-40"
            />
          </div>

          {/* Año y Género en 2 columnas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Año */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${applyYear ? 'bg-white/5 border-accent-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 font-medium text-ink-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyYear}
                    onChange={(e) => onApplyYearChange(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0"
                  />
                  <span>Año</span>
                </label>
                <span className="text-2xs text-ink-500 font-mono">
                  {applyYear ? 'Se aplicará' : 'Sin cambios'}
                </span>
              </div>
              <input
                type="number"
                value={batchYear}
                disabled={!applyYear}
                onChange={(e) => onBatchYearChange(e.target.value)}
                placeholder="Ej: 2024"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-ink-600 focus:outline-none focus:border-accent-500 disabled:opacity-40"
              />
            </div>

            {/* Género */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${applyGenre ? 'bg-white/5 border-accent-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-2 font-medium text-ink-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={applyGenre}
                    onChange={(e) => onApplyGenreChange(e.target.checked)}
                    className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0"
                  />
                  <span>Género</span>
                </label>
                <span className="text-2xs text-ink-500 font-mono">
                  {applyGenre ? 'Se aplicará' : 'Sin cambios'}
                </span>
              </div>
              <input
                type="text"
                value={batchGenre}
                disabled={!applyGenre}
                onChange={(e) => onBatchGenreChange(e.target.value)}
                placeholder="Ej: J-Pop, Rock, Anison"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-ink-600 focus:outline-none focus:border-accent-500 disabled:opacity-40"
              />
            </div>
          </div>

          {/* Carátula en Lote */}
          <div
            className={`p-4 rounded-2xl border transition-all ${applyCover ? 'bg-white/5 border-accent-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}
          >
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-2 font-medium text-ink-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={applyCover}
                  onChange={(e) => onApplyCoverChange(e.target.checked)}
                  className="rounded bg-white/10 border-white/20 text-accent-500 focus:ring-0"
                />
                <span>Portada / Carátula Compartida</span>
              </label>
              <span className="text-2xs text-ink-500 font-mono">
                {applyCover ? 'Se aplicará' : 'Sin cambios'}
              </span>
            </div>

            {applyCover && (
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                  {batchRemoveCover ? (
                    <div className="flex flex-col items-center justify-center text-center p-1 text-2xs text-rose-400">
                      <Trash2 className="w-5 h-5 mb-1" />
                      <span>Se eliminará</span>
                    </div>
                  ) : batchCoverPreviewUrl ? (
                    <img
                      src={batchCoverPreviewUrl}
                      alt="Portada nueva"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Music2 className="w-6 h-6 text-ink-600" />
                  )}
                </div>

                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onPickCover}
                      className="px-3.5 py-1.5 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold shadow-md shadow-accent-500/20 transition-all flex items-center gap-1.5"
                    >
                      <ImagePlus className="w-3.5 h-3.5" />
                      <span>Seleccionar Imagen...</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onSetRemoveCover(!batchRemoveCover);
                        if (!batchRemoveCover) {
                          onSetCoverPath(null);
                          onSetCoverPreview(null);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                        batchRemoveCover
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                          : 'bg-white/5 text-ink-400 hover:text-white border-white/10'
                      }`}
                    >
                      {batchRemoveCover ? '✓ Quitar Carátulas' : 'Quitar Carátulas'}
                    </button>
                  </div>
                  <p className="text-2xs text-ink-400">
                    {batchRemoveCover
                      ? 'Se removerán las portadas de todas las canciones seleccionadas.'
                      : batchCoverPath
                        ? 'La imagen seleccionada se incrustará en todas las pistas del lote.'
                        : 'Seleccione una imagen JPEG o PNG de su equipo.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pie */}
        <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
          <span className="text-xs text-ink-400">
            Se modificarán sólo los campos con casilla marcada
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => !isSaving && onClose()}
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-ink-300 hover:bg-white/10 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={onSave}
              disabled={
                isSaving ||
                (!applyArtist &&
                  !applyAlbum &&
                  !applyAlbumArtist &&
                  !applyYear &&
                  !applyGenre &&
                  !applyCover)
              }
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-accent-500 via-accent-600 to-purple-600 text-white text-xs font-bold shadow-xl hover:shadow-accent-500/25 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando en {selectedCount} archivos...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Aplicar a {selectedCount} Canciones</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
