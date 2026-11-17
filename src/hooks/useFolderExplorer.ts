// Explorador por carpetas, filtrado, álbumes y selección de carpeta/álbum.
// Copia exacta de lo que vivía en App.tsx.

import { useMemo, useState } from 'react';
import type { AlbumGroup, FolderExplorerData, ScannedTrack, ViewMode } from '../types';

type FilterChip = 'all' | 'flac' | 'recent' | 'favorites';

interface UseFolderExplorerDeps {
  tracks: ScannedTrack[];
  currentFolder: string | null;
  searchQuery: string;
  filterChip: FilterChip;
  favorites: string[];
  viewMode: ViewMode;
  setSelectedTrackIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handlePlayTrack: (track: ScannedTrack) => void | Promise<void>;
}

export function useFolderExplorer({
  tracks,
  currentFolder,
  searchQuery,
  filterChip,
  favorites,
  viewMode,
  setSelectedTrackIds,
  handlePlayTrack,
}: UseFolderExplorerDeps) {
  const [currentFolderNav, setCurrentFolderNav] = useState<string[]>([]);
  const [expandedAlbumKey, setExpandedAlbumKey] = useState<string | null>(null);

  const baseFolderPath = useMemo(() => {
    if (currentFolder) return currentFolder.replace(/\\/g, '/').replace(/\/+$/, '');
    if (tracks.length === 0) return '';
    const splitPaths = tracks.map(t => t.path.replace(/\\/g, '/').split('/'));
    let common = splitPaths[0].slice(0, -1);
    for (let i = 1; i < splitPaths.length; i++) {
      const cur = splitPaths[i];
      let j = 0;
      while (j < common.length && j < cur.length - 1 && common[j] === cur[j]) {
        j++;
      }
      common = common.slice(0, j);
      if (common.length === 0) break;
    }
    return common.join('/');
  }, [currentFolder, tracks]);

  // Explorador por Carpetas Inteligente (Navegación jerárquica)
  const folderExplorerData: FolderExplorerData = useMemo(() => {
    const rootFolderName = currentFolder
      ? currentFolder.replace(/\\/g, '/').split('/').filter(Boolean).pop() || 'Biblioteca'
      : 'Biblioteca';

    if (tracks.length === 0) {
      return {
        subfolders: [],
        directTracks: [],
        allFolderTracks: [],
        currentPathStr: '',
        rootFolderName
      };
    }

    const currentPathStr = currentFolderNav.join('/');
    const subfolderMap = new Map<string, {
      name: string;
      relativePath: string;
      tracks: ScannedTrack[];
      subfolderNames: Set<string>;
      formats: Set<string>;
      sampleCoverUrl: string | null;
    }>();

    const directTracks: ScannedTrack[] = [];
    const allFolderTracks: ScannedTrack[] = [];
    const normBase = baseFolderPath;

    tracks.forEach((track) => {
      const normPath = track.path.replace(/\\/g, '/');
      let rel = normPath;
      if (normBase && normPath.startsWith(normBase)) {
        rel = normPath.slice(normBase.length).replace(/^\/+/, '');
      }
      const segments = rel.split('/');
      segments.pop(); // quitar nombre de archivo

      // Verificar si la pista pertenece a la carpeta actual de navegación
      const isInsideCurrent = currentFolderNav.every((seg, idx) => segments[idx] === seg);

      if (isInsideCurrent) {
        allFolderTracks.push(track);

        if (segments.length === currentFolderNav.length) {
          // Es una canción directa en este nivel
          directTracks.push(track);
        } else if (segments.length > currentFolderNav.length) {
          // Pertenece a una subcarpeta inmediata
          const subfolderName = segments[currentFolderNav.length];
          const subRelPath = [...currentFolderNav, subfolderName].join('/');

          if (!subfolderMap.has(subfolderName)) {
            subfolderMap.set(subfolderName, {
              name: subfolderName,
              relativePath: subRelPath,
              tracks: [],
              subfolderNames: new Set(),
              formats: new Set(),
              sampleCoverUrl: null,
            });
          }
          const sub = subfolderMap.get(subfolderName)!;
          sub.tracks.push(track);
          if (track.cover_url && !sub.sampleCoverUrl) {
            sub.sampleCoverUrl = track.cover_url;
          }
          if (track.format) {
            sub.formats.add(track.format);
          }
          if (segments.length > currentFolderNav.length + 1) {
            sub.subfolderNames.add(segments[currentFolderNav.length + 1]);
          }
        }
      }
    });

    const subfolders = Array.from(subfolderMap.values()).map(sub => ({
      name: sub.name,
      relativePath: sub.relativePath,
      trackCount: sub.tracks.length,
      subfolderCount: sub.subfolderNames.size,
      sampleCoverUrl: sub.sampleCoverUrl,
      formats: Array.from(sub.formats),
      tracks: sub.tracks,
    })).sort((a, b) => a.name.localeCompare(b.name));

    // Filtrar canciones directas por búsqueda si hay consulta activa
    const filteredDirectTracks = searchQuery.trim()
      ? directTracks.filter(t =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.artist.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : directTracks;

    return {
      subfolders,
      directTracks: filteredDirectTracks,
      allFolderTracks,
      currentPathStr,
      rootFolderName,
    };
  }, [tracks, baseFolderPath, currentFolderNav, searchQuery, currentFolder]);

  // Acciones de navegación por carpetas
  const handleNavigateIntoFolder = (folderName: string) => {
    setCurrentFolderNav(prev => [...prev, folderName]);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentFolderNav([]);
    } else {
      setCurrentFolderNav(prev => prev.slice(0, index + 1));
    }
  };

  const handleNavigateUp = () => {
    setCurrentFolderNav(prev => prev.slice(0, -1));
  };

  const handlePlayFolderTracks = (tracksToPlay: ScannedTrack[]) => {
    if (tracksToPlay.length > 0) {
      handlePlayTrack(tracksToPlay[0]);
    }
  };

  const handleSelectFolderTracks = (tracksToSelect: ScannedTrack[], e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const ids = tracksToSelect.map(t => t.id);
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      const allSelected = ids.every(id => next.has(id));
      if (allSelected) {
        ids.forEach(id => next.delete(id));
      } else {
        ids.forEach(id => next.add(id));
      }
      return next;
    });
  };

  // Filtrado de canciones en memoria instantáneo (<1ms para miles de canciones)
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      // Si hay navegación de carpeta activa en vistas Grid/Table/Albums, filtrar por esa carpeta
      if (currentFolderNav.length > 0 && viewMode !== 'folders') {
        const normPath = track.path.replace(/\\/g, '/');
        let rel = normPath;
        if (baseFolderPath && normPath.startsWith(baseFolderPath)) {
          rel = normPath.slice(baseFolderPath.length).replace(/^\/+/, '');
        }
        const segments = rel.split('/');
        segments.pop();
        const matchesFolder = currentFolderNav.every((seg, idx) => segments[idx] === seg);
        if (!matchesFolder) return false;
      }

      const matchesQuery =
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.album.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesQuery) return false;

      if (filterChip === 'flac') return track.format.toUpperCase().includes('FLAC');
      if (filterChip === 'favorites') return favorites.includes(track.id);
      return true;
    });
  }, [tracks, searchQuery, filterChip, favorites, currentFolderNav, baseFolderPath, viewMode]);

  // Agrupación de álbumes para Vista Estante (Album Shelf)
  const albumGroups = useMemo<AlbumGroup[]>(() => {
    const map = new Map<string, AlbumGroup>();
    filteredTracks.forEach((track) => {
      const albumName = (track.album && track.album.trim()) ? track.album.trim() : 'Sin álbum';
      const artistName = (track.album_artist && track.album_artist.trim())
        ? track.album_artist.trim()
        : (track.artist && track.artist.trim())
          ? track.artist.trim()
          : 'Sin artista';
      const key = `${albumName}:::${artistName}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          album: albumName,
          artist: artistName,
          year: track.year || null,
          cover_url: track.cover_url || null,
          tracks: [],
          totalDurationSec: 0,
          formats: [],
        });
      }
      const group = map.get(key)!;
      group.tracks.push(track);
      group.totalDurationSec += (track.duration || 0);
      if (!group.cover_url && track.cover_url) group.cover_url = track.cover_url;
      if (!group.year && track.year) group.year = track.year;
      if (track.format && !group.formats.includes(track.format)) {
        group.formats.push(track.format);
      }
    });

    // Ordenar pistas dentro de cada álbum por track_number o título
    map.forEach((group) => {
      group.tracks.sort((a, b) => {
        if (a.track_number && b.track_number) return a.track_number - b.track_number;
        if (a.track_number) return -1;
        if (b.track_number) return 1;
        return a.title.localeCompare(b.title);
      });
    });

    // Ordenar álbumes alfabéticamente
    return Array.from(map.values()).sort((a, b) => a.album.localeCompare(b.album));
  }, [filteredTracks]);

  const selectedAlbum = useMemo(() => {
    if (!expandedAlbumKey) return null;
    return albumGroups.find(g => g.key === expandedAlbumKey) || null;
  }, [albumGroups, expandedAlbumKey]);

  const formatTotalTime = (totalSecs: number) => {
    const hours = Math.floor(totalSecs / 3600);
    const minutes = Math.floor((totalSecs % 3600) / 60);
    const seconds = Math.floor(totalSecs % 60);
    if (hours > 0) {
      return `${hours} h ${minutes} min`;
    }
    return `${minutes} min ${seconds} s`;
  };

  const handlePlayAlbum = (group: AlbumGroup) => {
    if (group.tracks.length > 0) {
      handlePlayTrack(group.tracks[0]);
    }
  };

  const handleSelectAlbumTracks = (group: AlbumGroup, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTrackIds(prev => {
      const next = new Set(prev);
      const allSelected = group.tracks.every(t => next.has(t.id));
      if (allSelected) {
        group.tracks.forEach(t => next.delete(t.id));
      } else {
        group.tracks.forEach(t => next.add(t.id));
      }
      return next;
    });
  };

  return {
    currentFolderNav, setCurrentFolderNav,
    expandedAlbumKey, setExpandedAlbumKey,
    baseFolderPath,
    folderExplorerData,
    filteredTracks,
    albumGroups,
    selectedAlbum,
    formatTotalTime,
    handleNavigateIntoFolder,
    handleNavigateToBreadcrumb,
    handleNavigateUp,
    handlePlayFolderTracks,
    handleSelectFolderTracks,
    handlePlayAlbum,
    handleSelectAlbumTracks,
  };
}
