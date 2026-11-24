// Cola de descargas: estado, restauración entre sesiones, progreso en vivo,
// cancelación y reintento. Persiste en download_queue.json vía comandos Tauri.

import { useEffect, useRef, useState } from 'react';
import { invoke } from '../lib/puente';
import { listen } from '../lib/puente';
import { notificarDescarga } from '../lib/notificaciones';
import type { DownloadItem, DownloadProgressEvent } from '../types';
import type { PersistedDownload } from '../lib/queue';
import { toPersisted, fromPersisted } from '../lib/queue';

interface UseDownloadQueueDeps {
  currentFolder: string | null;
  defaultMusicDir: string | null;
  downloadFolder: string | null;
  rescanAfterDownload: () => void;
  onAviso?: (mensaje: string) => void;
  onDescargaCompletada?: (titulo: string) => void;
}

const esActiva = (item: DownloadItem) =>
  item.status !== 'cancelado' &&
  !item.status.startsWith('completado') &&
  !item.status.includes('error');

function ordenarCola(items: DownloadItem[]): DownloadItem[] {
  return [...items].sort((a, b) => Number(esActiva(b)) - Number(esActiva(a)));
}

export function useDownloadQueue({
  currentFolder,
  defaultMusicDir,
  downloadFolder,
  rescanAfterDownload,
  onAviso,
  onDescargaCompletada,
}: UseDownloadQueueDeps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const downloadsRef = useRef<DownloadItem[]>([]);
  const [downloadFormat, setDownloadFormat] = useState('FLAC');
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const queueRestoredRef = useRef(false);

  // Restaurar la cola de descargas de la sesión anterior.
  // Las que estaban en curso al cerrar volvieron como `interrumpida` desde
  // la parte Rust: se relanzan con el mismo id, destino y formato.
  useEffect(() => {
    invoke<PersistedDownload[]>('get_download_queue')
      .then((saved) => {
        const restored: DownloadItem[] = (saved || []).map(fromPersisted);
        setDownloads(restored);
        queueRestoredRef.current = true;
        const interrupted = restored.filter((d) => d.status === 'interrumpida');
        if (restored.length > 0) {
          setRestoredNotice(
            interrupted.length > 0
              ? `Se restauraron ${restored.length} descargas; ${interrupted.length} se reanudarán solos.`
              : `Se restauraron ${restored.length} descargas de la sesión anterior.`,
          );
        }
        for (const item of interrupted) {
          const dest =
            item.outputDir ||
            downloadFolder ||
            currentFolder ||
            defaultMusicDir ||
            localStorage.getItem('sakura_current_folder') ||
            null;
          invoke('start_download', {
            jobId: item.id,
            url: item.url,
            format: item.format,
            ...(dest ? { outputDir: dest } : {}),
          }).catch((err) => {
            console.error('Error al reanudar descarga:', err);
            setDownloads((prev) =>
              prev.map((d) => (d.id === item.id ? { ...d, status: `error: ${String(err)}` } : d)),
            );
          });
        }
      })
      .catch((err) => {
        console.error('Error al restaurar la cola de descargas:', err);
        queueRestoredRef.current = true;
      });
    // La cola se restaura una sola vez al montar. Las carpetas se leen aquí para
    // decidir el destino de las filas interrumpidas; agregarlas como dependencias
    // provocaría otra restauración y descargas duplicadas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    downloadsRef.current = downloads;
  }, [downloads]);

  // Escuchar eventos en vivo emitidos desde el motor Rust
  useEffect(() => {
    const unlistenPromise = listen<DownloadProgressEvent>('download-progress', (event) => {
      const payload = event.payload;
      setDownloads((prev) => {
        return prev.map((item) => {
          if (item.id === payload.id) {
            return {
              ...item,
              progress: payload.progress,
              speed: payload.speed,
              eta: payload.eta,
              status: payload.status,
              ...(payload.file_path ? { filePath: payload.file_path } : {}),
            };
          }
          return item;
        });
      });

      // Si terminó de descargar y convertir, re-escanear para actualizar biblioteca en vivo
      if (payload.status === 'completado') {
        rescanAfterDownload();
        const terminada = downloadsRef.current.find((item) => item.id === payload.id);
        notificarDescarga(terminada?.title ?? 'Pista');
        onDescargaCompletada?.(terminada?.title ?? 'Pista');
      }
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, [rescanAfterDownload, onDescargaCompletada]);

  // Persistir la cola tras cada cambio (una vez restaurada, para no pisar el
  // archivo con la lista vacía inicial).
  useEffect(() => {
    if (!queueRestoredRef.current) return;
    const snapshot = downloads.map(toPersisted);
    invoke('save_download_queue', { items: snapshot }).catch((err) =>
      console.error('Error al guardar la cola de descargas:', err),
    );
  }, [downloads]);

  // Iniciar descarga asíncrona real en segundo plano
  const triggerDownload = async (
    title: string,
    artist: string,
    url: string,
    thumbnail?: string | null,
    customFolder?: string,
  ) => {
    const duplicada = downloadsRef.current.find(
      (item) =>
        item.url === url &&
        (item.outputDir ?? undefined) ===
          (customFolder || downloadFolder || currentFolder || defaultMusicDir || '.') &&
        item.format === downloadFormat &&
        item.status !== 'cancelado' &&
        !item.status.startsWith('completado') &&
        !item.status.includes('error'),
    );
    if (duplicada) {
      onAviso?.('Esa pista ya está en la cola con la misma carpeta y formato.');
      window.dispatchEvent(new CustomEvent('sakura-enfocar-descarga', { detail: duplicada.id }));
      return;
    }
    void import('../lib/notificaciones').then((m) => m.pedirPermisoNotificaciones());
    const jobId = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const destFolder = customFolder || downloadFolder || currentFolder || defaultMusicDir || '.';
    const newJob: DownloadItem = {
      id: jobId,
      title,
      artist,
      url,
      progress: 0,
      speed: 'Conectando...',
      eta: '--:--',
      status: 'en cola',
      format: downloadFormat,
      size: 'Calculando...',
      thumbnail,
      outputDir: destFolder,
      filePath: null,
      createdAt: Date.now(),
    };

    setDownloads((prev) => ordenarCola([newJob, ...prev]));
    try {
      await invoke('start_download', {
        jobId,
        url,
        format: downloadFormat,
        outputDir: destFolder,
        title,
        artist,
      });
    } catch (err) {
      console.error('Error al iniciar descarga:', err);
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === jobId ? { ...d, status: String(err).replace(/^error:\s*/i, '') } : d,
        ),
      );
    }
  };

  // Cancelar una descarga puntual (en cola o en curso)
  const cancelDownload = async (jobId: string) => {
    try {
      await invoke('cancel_download', { jobId });
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === jobId && !d.status.startsWith('completado')
            ? { ...d, status: 'cancelado', speed: '--', eta: '--' }
            : d,
        ),
      );
    } catch (err) {
      console.error('Error al cancelar descarga:', err);
    }
  };

  // Cancelar todo lo pendiente y en curso
  const cancelAllDownloads = async () => {
    try {
      await invoke('cancel_all_downloads');
      setDownloads((prev) =>
        prev.map((d) =>
          d.status.startsWith('completado') || d.status.includes('error')
            ? d
            : { ...d, status: 'cancelado', speed: '--', eta: '--' },
        ),
      );
    } catch (err) {
      console.error('Error al cancelar descargas:', err);
    }
  };

  // Mover una fila arriba/abajo para cambiar su prioridad visual.
  const moveDownload = (id: string, delta: number) => {
    setDownloads((prev) => {
      const indice = prev.findIndex((item) => item.id === id);
      const destino = indice + delta;
      if (indice === -1 || destino < 0 || destino >= prev.length) return prev;
      const copia = [...prev];
      [copia[indice], copia[destino]] = [copia[destino]!, copia[indice]!];
      return copia;
    });
  };

  // Reintentar una descarga con los mismos datos (mismo destino si lo tenía)
  const retryDownload = (item: DownloadItem) => {
    triggerDownload(item.title, item.artist, item.url, item.thumbnail, item.outputDir ?? undefined);
  };

  return {
    downloads,
    setDownloads,
    downloadFormat,
    setDownloadFormat,
    restoredNotice,
    setRestoredNotice,
    triggerDownload,
    cancelDownload,
    cancelAllDownloads,
    retryDownload,
    moveDownload,
  };
}
