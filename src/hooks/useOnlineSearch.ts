// Búsqueda en línea (YouTube), playlists y descargas de enlace directo.
// Copia exacta de lo que vivía en App.tsx.

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { OnlineSearchResult, PlaylistInfo } from '../types';

type ActiveTab = 'home' | 'search' | 'library' | 'queue' | 'settings';

interface OnlineSearchEvent {
  request_id: string;
  result: OnlineSearchResult;
}

interface PlaylistItemEvent {
  request_id: string;
  title: string;
  uploader: string;
  item: OnlineSearchResult;
}

function createRequestId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

interface UseOnlineSearchDeps {
  triggerDownload: (title: string, artist: string, url: string, thumbnail?: string | null, customFolder?: string) => void | Promise<void>;
  currentFolder: string | null;
  defaultMusicDir: string | null;
  downloadFolder: string | null;
  setActiveTab: (tab: ActiveTab) => void;
}

export function useOnlineSearch({
  triggerDownload,
  currentFolder,
  defaultMusicDir,
  downloadFolder,
  setActiveTab,
}: UseOnlineSearchDeps) {
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<OnlineSearchResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState<string | null>(null);

  const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
  const [isResolvingPlaylist, setIsResolvingPlaylist] = useState(false);
  const [playlistSearchError, setPlaylistSearchError] = useState<string | null>(null);
  const [selectedPlaylistItems, setSelectedPlaylistItems] = useState<Set<string>>(new Set());
  const [createAlbumFolder, setCreateAlbumFolder] = useState(true);

  const handleResolvePlaylist = async (url: string) => {
    if (!url.trim()) return;
    const requestId = createRequestId('playlist');
    setIsResolvingPlaylist(true);
    setPlaylistSearchError(null);
    setPlaylistInfo(null);
    setSelectedPlaylistItems(new Set());
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<PlaylistItemEvent>('playlist-item', ({ payload }) => {
        if (payload.request_id !== requestId) return;
        setPlaylistInfo(current => {
          const currentItems = current?.items ?? [];
          if (currentItems.some(item => item.id === payload.item.id)) return current;
          const items = [...currentItems, payload.item];
          return {
            title: payload.title || current?.title || 'Playlist / Álbum',
            uploader: payload.uploader || current?.uploader || '',
            track_count: items.length,
            items,
          };
        });
        setSelectedPlaylistItems(current => new Set(current).add(payload.item.id));
      });
      const info = await invoke<PlaylistInfo>('resolve_playlist', {
        url: url.trim(),
        requestId,
      });
      setPlaylistInfo(info);
      setSelectedPlaylistItems(new Set(info.items.map(it => it.id)));
    } catch (err) {
      console.error("Error al resolver playlist:", err);
      setPlaylistSearchError(`Error al consultar playlist: ${String(err)}`);
    } finally {
      unlisten?.();
      setIsResolvingPlaylist(false);
    }
  };

  const toggleSelectPlaylistItem = (id: string) => {
    setSelectedPlaylistItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllPlaylistItems = () => {
    if (playlistInfo) {
      setSelectedPlaylistItems(new Set(playlistInfo.items.map(it => it.id)));
    }
  };

  const clearAllPlaylistItems = () => {
    setSelectedPlaylistItems(new Set());
  };

  const handleDownloadSelectedPlaylist = () => {
    if (!playlistInfo || selectedPlaylistItems.size === 0) return;

    const baseFolder = downloadFolder || currentFolder || defaultMusicDir || '.';
    const sanitizeFolderName = (name: string) => name.replace(/[<>:"/\\|?*]/g, '_').trim();
    const targetFolder = createAlbumFolder
      ? `${baseFolder}\\${sanitizeFolderName(playlistInfo.title)}`
      : baseFolder;

    const itemsToDownload = playlistInfo.items.filter(it => selectedPlaylistItems.has(it.id));

    for (const item of itemsToDownload) {
      triggerDownload(item.title, item.uploader, item.url, item.thumbnail, targetFolder);
    }

    setActiveTab('queue');
  };

  // Búsqueda en línea en YouTube / Soundcloud mediante yt-dlp
  const handleOnlineSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = onlineQuery.trim();
    if (!query) return;

    // Si es enlace directo de playlist / álbum
    if ((query.startsWith('http://') || query.startsWith('https://')) &&
        (query.includes('list=') || query.includes('playlist') || query.includes('/album/'))) {
      await handleResolvePlaylist(query);
      return;
    }

    // Si es enlace directo a un video único (http://...), iniciar descarga directa
    if (query.startsWith('http://') || query.startsWith('https://')) {
      triggerDownload('Enlace Web', 'Procesando metadatos...', query, null);
      setOnlineQuery('');
      return;
    }

    const requestId = createRequestId('search');
    setIsSearchingOnline(true);
    setOnlineSearchError(null);
    setOnlineResults([]);
    setPlaylistInfo(null);
    let unlisten: (() => void) | undefined;
    try {
      unlisten = await listen<OnlineSearchEvent>('online-search-result', ({ payload }) => {
        if (payload.request_id !== requestId) return;
        setOnlineResults(current => (
          current.some(result => result.id === payload.result.id)
            ? current
            : [...current, payload.result]
        ));
      });
      const results = await invoke<OnlineSearchResult[]>('search_online', {
        query,
        requestId,
      });
      setOnlineResults(results);
      if (results.length === 0) {
        setOnlineSearchError('No se encontraron resultados para la búsqueda.');
      }
    } catch (err) {
      console.error("Error al buscar en línea:", err);
      setOnlineSearchError(`Error al buscar en YouTube: ${String(err)}`);
    } finally {
      unlisten?.();
      setIsSearchingOnline(false);
    }
  };

  return {
    onlineQuery, setOnlineQuery,
    onlineResults, setOnlineResults,
    isSearchingOnline, setIsSearchingOnline,
    onlineSearchError, setOnlineSearchError,
    playlistInfo, setPlaylistInfo,
    isResolvingPlaylist, setIsResolvingPlaylist,
    playlistSearchError, setPlaylistSearchError,
    selectedPlaylistItems, setSelectedPlaylistItems,
    createAlbumFolder, setCreateAlbumFolder,
    handleResolvePlaylist,
    toggleSelectPlaylistItem,
    selectAllPlaylistItems,
    clearAllPlaylistItems,
    handleDownloadSelectedPlaylist,
    handleOnlineSearch,
  };
}
