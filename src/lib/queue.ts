// Conversión entre el ítem de UI y la foto persistida en download_queue.json.
// Mismo contrato que el backend (src-tauri/src/queue.rs).

import type { DownloadItem } from '../types';

/// Foto persistida en download_queue.json (mismo contrato que el backend).
export interface PersistedDownload {
  id: string;
  title: string;
  artist: string;
  url: string;
  format: string;
  output_dir: string | null;
  status: string;
  created_at: number;
  file_path: string | null;
}

export function toPersisted(item: DownloadItem): PersistedDownload {
  return {
    id: item.id,
    title: item.title,
    artist: item.artist,
    url: item.url,
    format: item.format,
    output_dir: item.outputDir ?? null,
    status: item.status,
    created_at: item.createdAt,
    file_path: item.filePath ?? null,
  };
}

export function fromPersisted(saved: PersistedDownload): DownloadItem {
  return {
    id: saved.id,
    title: saved.title,
    artist: saved.artist,
    url: saved.url,
    progress: saved.status === 'completado' ? 100 : 0,
    speed: '--',
    eta: '--',
    status: saved.status,
    format: saved.format,
    size: '—',
    // Las miniaturas no se persisten: vuelven en null (ADR 0011).
    thumbnail: null,
    outputDir: saved.output_dir,
    filePath: saved.file_path,
    createdAt: saved.created_at,
  };
}
