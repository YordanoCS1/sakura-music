// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ScannedTrack, ViewMode } from '../types';
import { useFolderExplorer } from './useFolderExplorer';

function track(id: string, path: string, cambios: Partial<ScannedTrack> = {}): ScannedTrack {
  return {
    id,
    path,
    title: `Pista ${id}`,
    artist: 'Artista',
    album: 'Álbum',
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
    ...cambios,
  };
}

const pistas = [
  track('1', 'C:\\Music\\Album1\\a.flac', { title: 'Gurenge', artist: 'LiSA', album: 'Demon' }),
  track('2', 'C:\\Music\\Album1\\b.flac', { title: 'Idol', artist: 'YOASOBI' }),
  track('3', 'C:\\Music\\Album2\\c.flac', { title: 'Otra', format: 'MP3' }),
];

function renderExplorador(cambios: Record<string, unknown> = {}) {
  return renderHook(() =>
    useFolderExplorer({
      tracks: pistas,
      currentFolder: 'C:\\Music',
      searchQuery: '',
      filterChip: 'all',
      favorites: [],
      viewMode: 'folders' as ViewMode,
      setSelectedTrackIds: vi.fn(),
      handlePlayTrack: vi.fn(),
      ...cambios,
    }),
  );
}

describe('useFolderExplorer', () => {
  it('filtra por texto en título, artista y álbum', () => {
    const { result } = renderExplorador({ searchQuery: 'guren' });
    expect(result.current.filteredTracks.map((t) => t.id)).toEqual(['1']);

    const porArtista = renderExplorador({ searchQuery: 'yoa' });
    expect(porArtista.result.current.filteredTracks.map((t) => t.id)).toEqual(['2']);
  });

  it('aplica los chips de formato y favoritos', () => {
    const porFormato = renderExplorador({ filterChip: 'flac' });
    expect(porFormato.result.current.filteredTracks.map((t) => t.id)).toEqual(['1', '2']);

    const porFavorito = renderExplorador({ favorites: ['3'], filterChip: 'favorites' });
    expect(porFavorito.result.current.filteredTracks.map((t) => t.id)).toEqual(['3']);
  });

  it('navega a una subcarpeta y expone sólo sus pistas', () => {
    const { result } = renderExplorador();
    expect(result.current.folderExplorerData.subfolders.map((c) => c.name).sort()).toEqual([
      'Album1',
      'Album2',
    ]);

    act(() => result.current.handleNavigateIntoFolder('Album1'));
    expect(result.current.currentFolderNav).toEqual(['Album1']);
    expect(result.current.folderExplorerData.directTracks.map((t) => t.id)).toEqual(['1', '2']);
  });

  it('vuelve al nivel anterior y limpia la navegación', () => {
    const { result } = renderExplorador();
    act(() => result.current.handleNavigateIntoFolder('Album2'));
    expect(result.current.currentFolderNav).toEqual(['Album2']);

    act(() => result.current.handleNavigateUp());
    expect(result.current.currentFolderNav).toEqual([]);
    expect(result.current.folderExplorerData.directTracks).toHaveLength(0);
  });

  it('formatea la duración total', () => {
    const { result } = renderExplorador();
    expect(result.current.formatTotalTime(125)).toBe('2 min 5 s');
  });
});
