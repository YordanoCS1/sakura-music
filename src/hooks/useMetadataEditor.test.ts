// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
  convertFileSrc: (ruta: string) => ruta,
}));
vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn() }));

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(4) }));

import type { ScannedTrack } from '../types';
import { useMetadataEditor } from './useMetadataEditor';

const pista: ScannedTrack = {
  id: 't1',
  path: 'C:\\Music\\pista.flac',
  title: 'Título original',
  artist: 'Artista original',
  album: 'Álbum original',
  album_artist: null,
  track_number: 3,
  duration: 200,
  duration_str: '3:20',
  format: 'FLAC',
  bitrate_kbps: null,
  cover_url: null,
  year: 2020,
  genre: 'Rock',
  file_size: 1000,
};

function renderEditor() {
  return renderHook(() =>
    useMetadataEditor({
      setTracks: vi.fn(),
      activeTrack: pista,
      setActiveTrack: vi.fn(),
    }),
  );
}

describe('useMetadataEditor', () => {
  beforeEach(() => {
    invoke.mockReset();
    invoke.mockResolvedValue(null);
  });

  it('pre-llena el formulario con la pista en edición', () => {
    const { result } = renderEditor();
    act(() => result.current.openEditModal(pista));
    expect(result.current.editTitle).toBe('Título original');
    expect(result.current.editArtist).toBe('Artista original');
    expect(result.current.editTrackNumber).toBe('3');
    expect(result.current.editTab).toBe('tags');
  });

  it('revierte un campo y todos los campos', () => {
    const { result } = renderEditor();
    act(() => result.current.openEditModal(pista));
    act(() => result.current.setEditTitle('Otro título'));
    act(() => result.current.resetField('title'));
    expect(result.current.editTitle).toBe('Título original');

    act(() => result.current.setEditArtist('Otro artista'));
    act(() => result.current.resetAllFields());
    expect(result.current.editArtist).toBe('Artista original');
  });

  it('importa la pista correcta desde un enlace de canción', async () => {
    invoke.mockImplementation(async (comando: string) => {
      if (comando === 'open_catalog_album') {
        return [
          { id: '1440833068', title: 'Primera', artist: 'A', album: 'Álbum', cover_url: null },
          { id: '1440833069', title: 'Segunda', artist: 'B', album: 'Álbum', cover_url: null },
        ];
      }
      return null;
    });

    const { result } = renderEditor();
    await act(async () => {
      await result.current.openSongByLink(
        'https://music.apple.com/jp/album/ejemplo/1440833068?i=1440833069',
      );
    });

    expect(invoke).toHaveBeenCalledWith('open_catalog_album', {
      source: 'itunes',
      id: '1440833068',
      country: 'jp',
    });
    expect(result.current.editTitle).toBe('Segunda');
    expect(result.current.editArtist).toBe('B');
    await waitFor(() => expect(result.current.isOpeningSong).toBe(false));
  });

  it('rechaza un enlace sin ID de álbum', async () => {
    const { result } = renderEditor();
    await act(async () => {
      await result.current.openSongByLink('https://music.apple.com/us/album/ejemplo');
    });
    expect(invoke).not.toHaveBeenCalled();
    expect(result.current.catalogError).toContain('No se pudo extraer el ID');
  });
});
