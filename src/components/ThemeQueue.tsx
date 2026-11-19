import { RotateCcw, X } from 'lucide-react';
import type { DownloadItem, ThemeMode } from '../types';

interface ThemeQueueProps {
  theme: ThemeMode;
  downloads: DownloadItem[];
  restoredNotice: string | null;
  onClearNotice: () => void;
  onGoSearch: () => void;
  onGoLibrary?: () => void;
  onCancelAll: () => void;
  onCancel: (jobId: string) => void;
  onRetry: (item: DownloadItem) => void;
  onClearFinished: () => void;
}

const GLIFOS: Partial<Record<ThemeMode, string>> = {
  sumie: '墨',
  byobu: '屏',
  shoji: '障',
  origami: '折',
  swiss: '＋',
  sumiink: '墨',
  moonlit: '月',
  ledger: '帳',
};

/** Cola de descargas con composición propia por tema. */
export default function ThemeQueue({
  theme,
  downloads,
  restoredNotice,
  onClearNotice,
  onGoSearch,
  onCancelAll,
  onCancel,
  onRetry,
  onClearFinished,
}: ThemeQueueProps) {
  const activas = downloads.filter(
    (d) =>
      !d.status.startsWith('completado') && !d.status.includes('error') && d.status !== 'cancelado',
  ).length;
  const terminadas = downloads.filter((d) => d.status.startsWith('completado')).length;
  const conError = downloads.filter((d) => d.status.includes('error')).length;

  return (
    <div className={`tqueue tema-${theme}`}>
      <header className="tqueue-hero">
        <span className="tqueue-glifo" aria-hidden="true">
          {GLIFOS[theme] ?? '桜'}
        </span>
        <div className="tqueue-hero-copy">
          <p>COLA · MOTOR RUST</p>
          <h2>Cola de Descargas</h2>
          <span>yt-dlp + ffmpeg · hasta 2 descargas en paralelo</span>
        </div>
        <div className="tqueue-stats">
          <span>{activas} activas</span>
          <span>{terminadas} completadas</span>
          {conError > 0 && <span>{conError} con error</span>}
        </div>
      </header>

      {restoredNotice && (
        <div className="tqueue-notice">
          <span>{restoredNotice}</span>
          <button type="button" onClick={onClearNotice}>
            Entendido
          </button>
        </div>
      )}

      {downloads.length > 0 && (
        <div className="tqueue-actions">
          {activas > 0 && (
            <button type="button" onClick={onCancelAll} className="tqueue-danger">
              Cancelar todo
            </button>
          )}
          <button type="button" onClick={onClearFinished} className="tqueue-ghost">
            Limpiar terminadas
          </button>
        </div>
      )}

      {downloads.length === 0 ? (
        <div className="tqueue-empty">
          <span className="tqueue-empty-mark" aria-hidden="true">
            桜
          </span>
          <h3>No hay descargas activas</h3>
          <p>Buscá canciones en YouTube o pegá enlaces directos para llenar la cola.</p>
          <button type="button" onClick={onGoSearch}>
            Buscar música →
          </button>
        </div>
      ) : (
        <ol className="tqueue-lista">
          {downloads.map((item, i) => {
            const done = item.status.startsWith('completado');
            const error = item.status.includes('error');
            const cancelled = item.status === 'cancelado';
            return (
              <li
                key={item.id}
                className={`tqueue-item ${done ? 'is-done' : ''} ${error ? 'is-error' : ''}`}
              >
                <span className="tqueue-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="tqueue-thumb">
                  {item.thumbnail ? <img src={item.thumbnail} alt="" /> : <span>♪</span>}
                </div>
                <div className="tqueue-info">
                  <strong>{item.title}</strong>
                  <small>
                    {item.artist} · {item.format}
                  </small>
                  <div className="tqueue-bar">
                    <i style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }} />
                  </div>
                  <span className="tqueue-meta">
                    {item.progress.toFixed(0)}%{' '}
                    {item.speed && item.speed !== '--' ? ` · ${item.speed}` : ''}
                    {item.eta && item.eta !== '--' && item.eta !== '00:00'
                      ? ` · ETA ${item.eta}`
                      : ''}
                  </span>
                </div>
                <span className="tqueue-status">{item.status}</span>
                <div className="tqueue-item-acc">
                  {error && (
                    <button type="button" onClick={() => onRetry(item)} aria-label="Reintentar">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!done && !cancelled && (
                    <button
                      type="button"
                      onClick={() => onCancel(item.id)}
                      aria-label="Cancelar descarga"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
