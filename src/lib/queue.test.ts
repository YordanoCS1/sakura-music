import { describe, expect, it } from 'vitest';
import type { DownloadItem } from '../types';
import { fromPersisted, toPersisted, type PersistedDownload } from './queue';

const item: DownloadItem = {
  id: 'job-1',
  title: 'Canción de prueba',
  artist: 'Artista',
  url: 'https://ejemplo.invalid/video',
  progress: 42,
  speed: '1,2 MB/s',
  eta: '00:05',
  status: 'descargando',
  format: 'opus',
  size: '8,4 MB',
  thumbnail: 'data:image/jpeg;base64,AAAA',
  outputDir: 'C:\\Música',
  filePath: 'C:\\Música\\Artista - Canción.opus',
  createdAt: 1760000000,
};

describe('toPersisted', () => {
  it('mapea los campos al contrato del backend', () => {
    expect(toPersisted(item)).toEqual({
      id: 'job-1',
      title: 'Canción de prueba',
      artist: 'Artista',
      url: 'https://ejemplo.invalid/video',
      format: 'opus',
      output_dir: 'C:\\Música',
      status: 'descargando',
      created_at: 1760000000,
      file_path: 'C:\\Música\\Artista - Canción.opus',
    });
  });

  it('convierte los opcionales ausentes en null', () => {
    const sinOpcionales: DownloadItem = {
      ...item,
      outputDir: undefined,
      filePath: undefined,
    };
    const guardado = toPersisted(sinOpcionales);

    expect(guardado.output_dir).toBeNull();
    expect(guardado.file_path).toBeNull();
  });
});

describe('fromPersisted', () => {
  const guardado: PersistedDownload = toPersisted(item);

  it('restaura la fila conservando id, destino y formato', () => {
    const restaurado = fromPersisted(guardado);

    expect(restaurado.id).toBe(guardado.id);
    expect(restaurado.outputDir).toBe(guardado.output_dir);
    expect(restaurado.filePath).toBe(guardado.file_path);
    expect(restaurado.format).toBe(guardado.format);
  });

  it('no restaura la miniatura porque no se persiste', () => {
    expect(fromPersisted(guardado).thumbnail).toBeNull();
  });

  it('marca el progreso al 100 solo para filas completadas', () => {
    expect(fromPersisted(guardado).progress).toBe(0);
    expect(fromPersisted({ ...guardado, status: 'completado' }).progress).toBe(100);
  });
});
