import { useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, RotateCcw, X } from 'lucide-react';
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
  onClearInactive: () => void;
  onMoveDownload: (id: string, delta: number) => void;
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
  shonen: '⚡',
  ghost: '☻',
  samurai: '侍',
  kawaii: '♡',
  manga: '漫',
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
  onClearInactive,
  onMoveDownload,
}: ThemeQueueProps) {
  const [resaltado, setResaltado] = useState<string | null>(null);
  const filasRef = useRef<Record<string, HTMLLIElement | null>>({});
  useEffect(() => {
    const enfocar = (evento: Event) => {
      const id = (evento as CustomEvent<string>).detail;
      setResaltado(id);
      filasRef.current[id]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      window.setTimeout(() => setResaltado(null), 2500);
    };
    window.addEventListener('sakura-enfocar-descarga', enfocar);
    return () => window.removeEventListener('sakura-enfocar-descarga', enfocar);
  }, []);

  const activas = downloads.filter(
    (d) =>
      !d.status.startsWith('completado') && !d.status.includes('error') && d.status !== 'cancelado',
  ).length;
  const terminadas = downloads.filter((d) => d.status.startsWith('completado')).length;
  const conError = downloads.filter((d) => d.status.includes('error')).length;
  const [filtro, setFiltro] = useState<
    'todas' | 'activas' | 'terminadas' | 'errores' | 'canceladas'
  >('todas');
  const visibles = downloads.filter((item) => {
    if (filtro === 'activas')
      return (
        !item.status.startsWith('completado') &&
        !item.status.includes('error') &&
        item.status !== 'cancelado'
      );
    if (filtro === 'terminadas') return item.status.startsWith('completado');
    if (filtro === 'errores') return item.status.includes('error');
    if (filtro === 'canceladas') return item.status === 'cancelado';
    return true;
  });
  const selectorFiltro = (
    <div className="tqueue-filtros">
      <label htmlFor="tqueue-filtro">Filtrar</label>
      <select
        id="tqueue-filtro"
        value={filtro}
        onChange={(evento) => setFiltro(evento.target.value as typeof filtro)}
      >
        <option value="todas">Todas</option>
        <option value="activas">En curso ({activas})</option>
        <option value="terminadas">Terminadas ({terminadas})</option>
        <option value="errores">Con error ({conError})</option>
        <option value="canceladas">
          Canceladas ({downloads.filter((d) => d.status === 'cancelado').length})
        </option>
      </select>
    </div>
  );

  if (theme === 'manga') {
    return (
      <div className="manga-queue">
        <header className="manga-queue-cab">
          <span className="manga-queue-glifo" aria-hidden="true">
            列
          </span>
          <div>
            <small>CAPÍTULO · COLA DE DESCARGA</small>
            <h1>La Cola</h1>
          </div>
          <div className="manga-queue-stats">
            <span>{activas} EN CURSO</span>
            <span>{terminadas} LISTAS</span>
            {conError > 0 && <span>{conError} ERROR</span>}
          </div>
        </header>

        {restoredNotice && (
          <div className="manga-queue-notice">
            <span>{restoredNotice}</span>
            <button type="button" onClick={onClearNotice}>
              Entendido
            </button>
          </div>
        )}

        {downloads.length > 0 && (
          <div className="manga-queue-acciones">
            {activas > 0 && (
              <button type="button" onClick={onCancelAll}>
                Cancelar todo
              </button>
            )}
            <button type="button" onClick={onClearInactive}>
              Limpiar canceladas y errores
            </button>
            <button type="button" onClick={onClearFinished}>
              Limpiar terminadas
            </button>
          </div>
        )}

        {visibles.length === 0 ? (
          <div className="manga-queue-vacio">
            <span aria-hidden="true">…</span>
            <h2>ESTA PÁGINA ESTÁ EN BLANCO</h2>
            <p>Buscá canciones o pegá un enlace para llenar la cola.</p>
            <button type="button" onClick={onGoSearch}>
              Buscar música →
            </button>
          </div>
        ) : (
          <>
            {selectorFiltro}
            <ol className="manga-queue-lista">
              {downloads.map((item, i) => {
                const done = item.status.startsWith('completado');
                const error = item.status.includes('error');
                const cancelled = item.status === 'cancelado';
                return (
                  <li
                    key={item.id}
                    className={`manga-queue-pagina ${done ? 'is-done' : ''} ${error ? 'is-error' : ''} ${resaltado === item.id ? 'is-resaltada' : ''}`}
                  >
                    <span className="manga-queue-num">{String(i + 1).padStart(2, '0')}</span>
                    {item.thumbnail ? (
                      <img className="manga-queue-thumb" src={item.thumbnail} alt="" />
                    ) : (
                      <span className="manga-queue-thumb" aria-hidden="true">
                        ♪
                      </span>
                    )}
                    <div className="manga-queue-copy">
                      <strong>{item.title}</strong>
                      <small>
                        {item.artist} · {item.format}
                      </small>
                      <div className="manga-queue-barra">
                        <i style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }} />
                      </div>
                      <span className="manga-queue-meta">
                        {item.progress.toFixed(0)}%
                        {item.speed && item.speed !== '--' ? ` · ${item.speed}` : ''}
                        {item.eta && item.eta !== '--' && item.eta !== '00:00'
                          ? ` · ETA ${item.eta}`
                          : ''}
                      </span>
                    </div>
                    <span className="manga-queue-estado">{item.status}</span>
                    <div className="manga-queue-item-acc">
                      <button
                        type="button"
                        onClick={() => onMoveDownload(item.id, -1)}
                        aria-label="Subir prioridad"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveDownload(item.id, 1)}
                        aria-label="Bajar prioridad"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
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
          </>
        )}
      </div>
    );
  }

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

      {visibles.length === 0 ? (
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
        <>
          {selectorFiltro}
          <ol className="tqueue-lista">
            {visibles.map((item, i) => {
              const done = item.status.startsWith('completado');
              const error = item.status.includes('error');
              const cancelled = item.status === 'cancelado';
              return (
                <li
                  key={item.id}
                  className={`tqueue-item ${done ? 'is-done' : ''} ${error ? 'is-error' : ''} ${resaltado === item.id ? 'is-resaltada' : ''}`}
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
                    <button
                      type="button"
                      onClick={() => onMoveDownload(item.id, -1)}
                      aria-label="Subir prioridad"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMoveDownload(item.id, 1)}
                      aria-label="Bajar prioridad"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
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
        </>
      )}
    </div>
  );
}
