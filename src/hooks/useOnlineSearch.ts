// Búsqueda en línea (YouTube), playlists y descargas de enlace directo.
// Copia exacta de lo que vivía en App.tsx.

import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { OnlineSearchResult, PlaylistInfo } from '../types';

export type ActiveTab = 'home' | 'search' | 'library' | 'queue' | 'settings';

interface UseOnlineSearchDeps {
  triggerDownload: (title: string, artist: string, url: string, thumbnail?: string | null, customFolder?: string) => void | Promise<void>;
  currentFolder: string | null;
  defaultMusicDir: string | null;
  setActiveTab: (tab: ActiveTab) => void;
}

export function useOnlineSearch({
  triggerDownload,
  currentFolder,
  defaultMusicDir,
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
    setIsResolvingPlaylist(true);
    setPlaylistSearchError(null);
    setPlaylistInfo(null);
    try {
      const info = await invoke<PlaylistInfo>('resolve_playlist', { url: url.trim() });
      setPlaylistInfo(info);
      setSelectedPlaylistItems(new Set(info.items.map(it => it.id)));
    } catch (err) {
      console.error("Error al resolver playlist:", err);
      setPlaylistSearchError(`Error al consultar playlist: ${String(err)}`);
    } finally {
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

    const baseFolder = currentFolder || defaultMusicDir || '.';
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

    setIsSearchingOnline(true);
    setOnlineSearchError(null);
    setPlaylistInfo(null);
    try {
      const results = await invoke<OnlineSearchResult[]>('search_online', { query });
      setOnlineResults(results);
      if (results.length === 0) {
        setOnlineSearchError('No se encontraron resultados para la búsqueda.');
      }
    } catch (err) {
      console.error("Error al buscar en línea:", err);
      setOnlineSearchError(`Error al buscar en YouTube: ${String(err)}`);
    } finally {
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
