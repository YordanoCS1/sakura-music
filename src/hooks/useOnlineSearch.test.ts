// @vitest-environment jsdom
import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const invoke = vi.fn();
const listen = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invoke(...args),
}));
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listen(...args),
}));

import type { PlaylistInfo } from '../types';
import { useOnlineSearch } from './useOnlineSearch';

const playlist: PlaylistInfo = {
  title: 'Playlist: Rápido / Lento',
  uploader: 'Canal',
  track_count: 2,
  items: [
    {
      id: 'a',
      title: 'Uno',
      uploader: 'Canal',
      duration: '3:20',
      thumbnail: null,
      url: 'https://video/a',
    },
    {
      id: 'b',
      title: 'Dos',
      uploader: 'Canal',
      duration: '3:21',
      thumbnail: null,
      url: 'https://video/b',
    },
  ],
};

function renderBusqueda() {
  const triggerDownload = vi.fn();
  const setActiveTab = vi.fn();
  const hook = renderHook(() =>
    useOnlineSearch({
      triggerDownload,
      currentFolder: 'C:\\Música',
      defaultMusicDir: null,
      downloadFolder: null,
      setActiveTab,
    }),
  );
  return { ...hook, triggerDownload, setActiveTab };
}

describe('useOnlineSearch', () => {
  beforeEach(() => {
    invoke.mockReset();
    listen.mockReset();
    listen.mockResolvedValue(() => {});
    invoke.mockImplementation(async (comando: string) => {
      if (comando === 'resolve_playlist') return playlist;
      if (comando === 'search_online') return [];
      return null;
    });
  });

  it('resuelve una playlist cuando el enlace tiene list=', async () => {
    const { result } = renderBusqueda();
    act(() => result.current.setOnlineQuery('https://youtube.com/playlist?list=ABC'));
    await act(async () => result.current.handleOnlineSearch());

    expect(invoke).toHaveBeenCalledWith('resolve_playlist', expect.objectContaining({}));
    expect(invoke).not.toHaveBeenCalledWith('search_online', expect.anything());
    await waitFor(() => expect(result.current.playlistInfo?.items).toHaveLength(2));
  });

  it('descarga directamente un video suelto', async () => {
    const { result, triggerDownload } = renderBusqueda();
    act(() => result.current.setOnlineQuery('https://youtube.com/watch?v=abc'));
    await act(async () => result.current.handleOnlineSearch());

    expect(triggerDownload).toHaveBeenCalledWith(
      'Enlace Web',
      'Procesando metadatos...',
      'https://youtube.com/watch?v=abc',
      null,
    );
  });

  it('busca en el catálogo cuando no es un enlace', async () => {
    const { result } = renderBusqueda();
    act(() => result.current.setOnlineQuery('LiSA Gurenge'));
    await act(async () => result.current.handleOnlineSearch());

    expect(invoke).toHaveBeenCalledWith(
      'search_online',
      expect.objectContaining({ query: 'LiSA Gurenge' }),
    );
  });

  it('descarga las pistas seleccionadas en una subcarpeta sanitizada', async () => {
    const { result, triggerDownload, setActiveTab } = renderBusqueda();
    act(() => result.current.setOnlineQuery('https://youtube.com/playlist?list=ABC'));
    await act(async () => result.current.handleOnlineSearch());
    await waitFor(() => expect(result.current.playlistInfo).not.toBeNull());

    act(() => result.current.toggleSelectPlaylistItem('b'));
    act(() => result.current.handleDownloadSelectedPlaylist());

    expect(triggerDownload).toHaveBeenCalledTimes(1);
    expect(triggerDownload).toHaveBeenCalledWith(
      'Uno',
      'Canal',
      'https://video/a',
      null,
      'C:\\Música\\Playlist_ Rápido _ Lento',
    );
    expect(setActiveTab).toHaveBeenCalledWith('queue');
  });
});
