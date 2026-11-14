// Cola de descargas: estado, restauración entre sesiones, progreso en vivo,
// cancelación y reintento. Copia exacta de lo que vivía en App.tsx.

import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { DownloadItem, DownloadProgressEvent } from '../types';
import type { PersistedDownload } from '../lib/queue';
import { toPersisted, fromPersisted } from '../lib/queue';

interface UseDownloadQueueDeps {
  currentFolder: string | null;
  defaultMusicDir: string | null;
  downloadFolder: string | null;
  rescanAfterDownload: () => void;
}

export function useDownloadQueue({
  currentFolder,
  defaultMusicDir,
  downloadFolder,
  rescanAfterDownload,
}: UseDownloadQueueDeps) {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [downloadFormat, setDownloadFormat] = useState('FLAC');
  const [restoredNotice, setRestoredNotice] = useState<string | null>(null);
  const queueRestoredRef = useRef(false);

  // Restaurar la cola de descargas de la sesión anterior.
  // Las que estaban en curso al cerrar volvieron como `interrumpida` desde
  // el backend: se relanzan con el mismo id, destino y formato.
  useEffect(() => {
    invoke<PersistedDownload[]>('get_download_queue')
      .then(saved => {
        const restored: DownloadItem[] = (saved || []).map(fromPersisted);
        setDownloads(restored);
        queueRestoredRef.current = true;
        const interrupted = restored.filter(d => d.status === 'interrumpida');
        if (restored.length > 0) {
          setRestoredNotice(
            interrupted.length > 0
              ? `Se restauraron ${restored.length} descargas; ${interrupted.length} se reanudarán solos.`
              : `Se restauraron ${restored.length} descargas de la sesión anterior.`
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
          }).catch(err => {
            console.error("Error al reanudar descarga:", err);
            setDownloads(prev => prev.map(d =>
              d.id === item.id ? { ...d, status: `error: ${String(err)}` } : d
            ));
          });
        }
      })
      .catch(err => {
        console.error("Error al restaurar la cola de descargas:", err);
        queueRestoredRef.current = true;
      });
  }, []);

  // Escuchar eventos en vivo emitidos desde el motor Rust
  useEffect(() => {
    const unlistenPromise = listen<DownloadProgressEvent>('download-progress', (event) => {
      const payload = event.payload;
      setDownloads(prev => {
        return prev.map(item => {
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
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
  }, [rescanAfterDownload]);

  // Persistir la cola tras cada cambio (una vez restaurada, para no pisar el
  // archivo con la lista vacía inicial).
  useEffect(() => {
    if (!queueRestoredRef.current) return;
    const snapshot = downloads.map(toPersisted);
    invoke('save_download_queue', { items: snapshot }).catch(err =>
      console.error("Error al guardar la cola de descargas:", err)
    );
  }, [downloads]);

  // Iniciar descarga asíncrona real en segundo plano
  const triggerDownload = async (title: string, artist: string, url: string, thumbnail?: string | null, customFolder?: string) => {
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

    setDownloads(prev => [newJob, ...prev]);
    try {
      await invoke('start_download', {
        jobId,
        url,
        format: downloadFormat,
        outputDir: destFolder,
      });
    } catch (err) {
      console.error("Error al iniciar descarga:", err);
      setDownloads(prev => prev.map(d => d.id === jobId ? { ...d, status: `error: ${String(err)}` } : d));
    }
  };

  // Cancelar una descarga puntual (en cola o en curso)
  const cancelDownload = async (jobId: string) => {
    try {
      await invoke('cancel_download', { jobId });
      setDownloads(prev => prev.map(d =>
        d.id === jobId && !d.status.startsWith('completado')
          ? { ...d, status: 'cancelado', speed: '--', eta: '--' }
          : d
      ));
    } catch (err) {
      console.error("Error al cancelar descarga:", err);
    }
  };

  // Cancelar todo lo pendiente y en curso
  const cancelAllDownloads = async () => {
    try {
      await invoke('cancel_all_downloads');
      setDownloads(prev => prev.map(d =>
        d.status.startsWith('completado') || d.status.includes('error')
          ? d
          : { ...d, status: 'cancelado', speed: '--', eta: '--' }
      ));
    } catch (err) {
      console.error("Error al cancelar descargas:", err);
    }
  };

  // Reintentar una descarga con los mismos datos (mismo destino si lo tenía)
  const retryDownload = (item: DownloadItem) => {
    triggerDownload(item.title, item.artist, item.url, item.thumbnail, item.outputDir ?? undefined);
  };

  return {
    downloads, setDownloads,
    downloadFormat, setDownloadFormat,
    restoredNotice, setRestoredNotice,
    triggerDownload,
    cancelDownload,
    cancelAllDownloads,
    retryDownload,
  };
}
