import { DownloadCloud, X, RotateCcw } from 'lucide-react';
import type { DownloadItem } from '../types';

interface QueueTabProps {
  downloads: DownloadItem[];
  restoredNotice: string | null;
  onClearNotice: () => void;
  onGoSearch: () => void;
  onGoLibrary: () => void;
  onCancelAll: () => void;
  onCancel: (jobId: string) => void;
  onRetry: (item: DownloadItem) => void;
  onClearFinished: () => void;
}

export default function QueueTab({
  downloads,
  restoredNotice,
  onClearNotice,
  onGoSearch,
  onGoLibrary,
  onCancelAll,
  onCancel,
  onRetry,
  onClearFinished,
}: QueueTabProps) {
  const activeCount = downloads.filter(
    (item) =>
      !item.status.startsWith('completado') &&
      !item.status.includes('error') &&
      item.status !== 'cancelado',
  ).length;
  const completedCount = downloads.filter((item) => item.status.startsWith('completado')).length;
  const errorCount = downloads.filter((item) => item.status.includes('error')).length;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 mb-24">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-base font-bold text-white">Cola de Descargas</h2>
          <p className="text-xs text-gray-400">
            Motor Rust + yt-dlp + ffmpeg · hasta 2 descargas en paralelo
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px]">
          <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-200">
            {activeCount} activas
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-200">
            {completedCount} completadas
          </span>
          {errorCount > 0 && (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-200">
              {errorCount} con error
            </span>
          )}
        </div>
        {downloads.length > 0 && (
          <div className="flex items-center gap-2">
            {downloads.some(
              (d) =>
                !d.status.startsWith('completado') &&
                !d.status.includes('error') &&
                d.status !== 'cancelado',
            ) && (
              <button
                onClick={onCancelAll}
                className="text-xs text-rose-300 hover:text-white px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 transition-colors"
              >
                Cancelar todo
              </button>
            )}
            <button
              onClick={onClearFinished}
              className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 transition-colors"
            >
              Limpiar terminadas
            </button>
          </div>
        )}
      </div>

      {/* Aviso de cola restaurada de la sesión anterior */}
      {restoredNotice && (
        <div className="p-3.5 rounded-2xl bg-accent-500/10 border border-accent-500/20 text-xs text-accent-300 flex items-center justify-between gap-3">
          <span>{restoredNotice}</span>
          <button
            onClick={onClearNotice}
            className="text-[11px] text-gray-400 hover:text-white underline transition-colors"
          >
            Entendido
          </button>
        </div>
      )}

      {/* Estado vacío si no hay descargas */}
      {downloads.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border border-white/5 my-4">
          <DownloadCloud className="w-12 h-12 text-gray-500 mb-3" />
          <h3 className="text-sm font-bold text-white mb-1">No hay descargas activas</h3>
          <p className="text-xs text-gray-400 max-w-xs mb-4">
            Ve a la pestaña Buscar y Descargar para buscar canciones en YouTube o pegar enlaces
            directos.
          </p>
          <button
            onClick={onGoSearch}
            className="px-4 py-2 rounded-xl bg-accent-600 hover:bg-accent-500 text-white text-xs font-semibold shadow-lg shadow-accent-500/20 active:scale-95 transition-all"
          >
            Buscar Música
          </button>
        </div>
      )}

      {/* Lista de Trabajos de Descarga */}
      <div className="space-y-3">
        {downloads.map((item) => {
          const isDone = item.status === 'completado';
          const isErr = item.status.includes('error');
          const isCancelled = item.status === 'cancelado';
          const isActive = !isDone && !isErr && !isCancelled;

          return (
            <div
              key={item.id}
              className="p-4 rounded-2xl glass-card border border-white/5 space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                    <span className="truncate">{item.artist}</span>
                    <span>•</span>
                    <span className="font-mono text-accent-300">{item.format}</span>
                    {item.speed && item.speed !== '--' && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-cyan-300">{item.speed}</span>
                      </>
                    )}
                    {item.eta && item.eta !== '--' && item.eta !== '00:00' && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-amber-300">ETA: {item.eta}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Etiqueta de estado */}
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${
                      isDone
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : isErr
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : isCancelled
                            ? 'bg-gray-500/20 text-gray-300 border border-gray-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                    }`}
                  >
                    {item.status}
                  </span>

                  {isActive && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                      title="Cancelar esta descarga"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {(isErr || isCancelled) && (
                    <button
                      onClick={() => onRetry(item)}
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-accent-500/20 text-gray-400 hover:text-accent-300 transition-colors"
                      title="Reintentar descarga"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isDone && (
                    <button
                      onClick={onGoLibrary}
                      className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold transition-colors"
                    >
                      Ver en Biblioteca
                    </button>
                  )}
                </div>
              </div>

              {/* Barra de progreso interactiva */}
              <div className="space-y-1">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isDone
                        ? 'bg-emerald-400'
                        : isErr
                          ? 'bg-rose-500'
                          : 'bg-gradient-to-r from-accent-500 to-accent-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                  <span>{item.progress.toFixed(0)}%</span>
                  <span>{isDone ? 'Guardada en Biblioteca' : item.status}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
