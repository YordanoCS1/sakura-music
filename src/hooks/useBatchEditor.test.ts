// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
  convertFileSrc: (ruta: string) => ruta,
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

import type { ScannedTrack } from '../types';
import { useBatchEditor } from './useBatchEditor';

function track(id: string, artist: string, album: string): ScannedTrack {
  return {
    id,
    path: `C:\\Music\\${id}.flac`,
    title: `Pista ${id}`,
    artist,
    album,
    album_artist: null,
    track_number: 1,
    duration: 200,
    duration_str: '3:20',
    format: 'FLAC',
    bitrate_kbps: null,
    cover_url: null,
    year: 2024,
    genre: 'Jazz',
    file_size: 1000,
  };
}

const pistas = [
  track('1', 'LiSA', 'Demon'),
  track('2', 'LiSA', 'Demon'),
  track('3', 'YOASOBI', 'Oshi'),
];

function renderBatch(seleccionadas: string[] = ['1', '2']) {
  return renderHook(() =>
    useBatchEditor({
      tracks: pistas,
      selectedTrackIds: new Set(seleccionadas),
      setTracks: vi.fn(),
      clearTrackSelection: vi.fn(),
    }),
  );
}

describe('useBatchEditor', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue({ updated: [], errors: [] });
  });

  it('pre-llena los campos comunes de la selección', () => {
    const { result } = renderBatch();
    act(() => result.current.openBatchModal());
    expect(result.current.isBatchModalOpen).toBe(true);
    expect(result.current.batchArtist).toBe('LiSA');
    expect(result.current.batchAlbum).toBe('Demon');
    expect(result.current.applyBatchArtist).toBe(true);
  });

  it('deja vacíos los campos cuando la selección no coincide', () => {
    const { result } = renderBatch(['1', '3']);
    act(() => result.current.openBatchModal());
    expect(result.current.batchArtist).toBe('');
    expect(result.current.applyBatchArtist).toBe(false);
  });

  it('acepta pistas explícitas de las vistas propias', () => {
    const { result } = renderBatch([]);
    act(() => result.current.openBatchModal([pistas[2]]));
    expect(result.current.batchTargets.map((t) => t.id)).toEqual(['3']);
    expect(result.current.batchArtist).toBe('YOASOBI');
  });

  it('guarda sólo los campos marcados y las pistas destino', async () => {
    const { result } = renderBatch();
    act(() => result.current.openBatchModal());
    act(() => result.current.setBatchYear('2025'));
    act(() => result.current.setApplyBatchYear(true));

    await act(async () => {
      await result.current.handleSaveBatchMetadata({ preventDefault: vi.fn() } as never);
    });

    expect(invoke).toHaveBeenCalledWith(
      'update_batch_metadata',
      expect.objectContaining({
        paths: [pistas[0].path, pistas[1].path],
        artist: 'LiSA',
        album: 'Demon',
        year: 2025,
      }),
    );
  });

  it('informa los errores parciales del guardado', async () => {
    invoke.mockResolvedValue({ updated: [], errors: ['pista bloqueada'] });
    const { result } = renderBatch();
    act(() => result.current.openBatchModal());

    await act(async () => {
      await result.current.handleSaveBatchMetadata({ preventDefault: vi.fn() } as never);
    });

    await waitFor(() => expect(result.current.batchFeedback).toContain('1 fallaron'));
  });
});
