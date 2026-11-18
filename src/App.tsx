import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open } from '@tauri-apps/plugin-dialog';
import { Search, Heart, Sparkles, X, AudioLines, Music2 } from 'lucide-react';

import type {
  ScannedTrack,
  OnlineSearchResult,
  DownloaderStatus,
  AppInfo,
  ThemeMode,
  ThemeOption,
  PlayerStyle,
  ViewMode,
  AppTab,
} from './types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';
import ZenTopNav from './components/ZenTopNav';
import { useBatchEditor } from './hooks/useBatchEditor';
import { useMetadataEditor } from './hooks/useMetadataEditor';
import QueueTab from './components/QueueTab';
import HomeTab from './components/HomeTab';
import SettingsTab from './components/SettingsTab';
import PlayerBar from './components/PlayerBar';
import SearchTab from './components/SearchTab';
import LibraryTab from './components/LibraryTab';
import ThemeLibrary from './components/ThemeLibrary';
import ThemeHome from './components/ThemeHome';
import LibraryToolbar from './components/LibraryToolbar';
import MetadataModal from './components/MetadataModal';
import TitleBar from './components/TitleBar';
import BatchModal from './components/BatchModal';
import DeleteTracksDialog from './components/DeleteTracksDialog';
import { useDownloadQueue } from './hooks/useDownloadQueue';
import { useOnlineSearch } from './hooks/useOnlineSearch';
import { useFolderExplorer } from './hooks/useFolderExplorer';
import { usePlayer } from './hooks/usePlayer';

const TEMAS_DISPONIBLES: ThemeOption[] = [
  { id: 'space', nombre: 'M3 Zen', descripcion: 'Marfil y rosa sakura' },
  { id: 'sumie', nombre: 'Sumi-e', descripcion: 'Pergamino flotante y tinta' },
  { id: 'byobu', nombre: 'Byōbu', descripcion: 'Pantalla dividida de tinta' },
  { id: 'yoru', nombre: 'Yoru', descripcion: 'Noche cálida y ámbar' },
  { id: 'hanabi', nombre: 'Hanabi', descripcion: 'Neón cian y magenta' },
  { id: 'aizuri', nombre: 'Aizuri', descripcion: 'Índigo teñido y cian' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('library');
  const libraryScrollRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const guardado = localStorage.getItem('sakura_theme') as ThemeMode | null;
    return guardado && TEMAS_DISPONIBLES.some((t) => t.id === guardado) ? guardado : 'space';
  });
  const [playerStyle, setPlayerStyle] = useState<PlayerStyle>(() => {
    return (localStorage.getItem('sakura_player_style') as PlayerStyle) || 'floating';
  });
  const [glassOpacity, setGlassOpacity] = useState<number>(() => {
    const saved = localStorage.getItem('sakura_glass_opacity');
    return saved ? parseInt(saved, 10) : 65;
  });
  const [glassBlur, setGlassBlur] = useState<number>(() => {
    const saved = localStorage.getItem('sakura_glass_blur');
    return saved ? parseInt(saved, 10) : 20;
  });
  const [ambientGlow, setAmbientGlow] = useState<boolean>(() => {
    const saved = localStorage.getItem('sakura_ambient_glow');
    return saved !== null ? saved === 'true' : true;
  });

  // En mini modo la ventana se reduce y queda siempre encima; al salir
  // volvemos al tamaño normal. En el navegador (tests) simplemente se omite.
  const handleSetPlayerStyle = async (s: PlayerStyle) => {
    setPlayerStyle(s);
    localStorage.setItem('sakura_player_style', s);
    try {
      const win = getCurrentWindow();
      if (s === 'mini') {
        await win.setAlwaysOnTop(true);
        await win.setSize(new LogicalSize(400, 132));
      } else {
        await win.setSize(new LogicalSize(1200, 760));
        await win.setAlwaysOnTop(false);
      }
    } catch (error) {
      console.warn('No se pudo ajustar la ventana:', error);
    }
  };
  const handleSetGlassOpacity = (val: number) => {
    setGlassOpacity(val);
    localStorage.setItem('sakura_glass_opacity', String(val));
  };
  const handleSetGlassBlur = (val: number) => {
    setGlassBlur(val);
    localStorage.setItem('sakura_glass_blur', String(val));
  };
  const handleSetAmbientGlow = (val: boolean) => {
    setAmbientGlow(val);
    localStorage.setItem('sakura_ambient_glow', String(val));
  };
  const [ambientParticles, setAmbientParticles] = useState<boolean>(() => {
    const saved = localStorage.getItem('sakura_ambient_particles');
    return saved !== null ? saved === 'true' : true;
  });
  const handleSetAmbientParticles = (val: boolean) => {
    setAmbientParticles(val);
    localStorage.setItem('sakura_ambient_particles', String(val));
  };

  // Guardamos el tema activo para conservar la preferencia entre sesiones.
  useEffect(() => {
    localStorage.setItem('sakura_theme', theme);
  }, [theme]);

  const handleSetTheme = (siguiente: ThemeMode) => {
    setTheme(siguiente);
    localStorage.setItem('sakura_theme', siguiente);
  };
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('sakura_view_mode') as ViewMode | null;
    if (
      saved &&
      (saved === 'folders' ||
        saved === 'grid' ||
        saved === 'table' ||
        saved === 'albums' ||
        saved === 'mosaic')
    ) {
      return saved;
    }
    return 'folders';
  });
  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('sakura_view_mode', mode);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<ScannedTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<ScannedTrack | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [filterChip, setFilterChip] = useState<'all' | 'flac' | 'recent' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeletingTracks, setIsDeletingTracks] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [defaultMusicDir, setDefaultMusicDir] = useState<string | null>(null);
  const [downloadFolder, setDownloadFolder] = useState<string | null>(() =>
    localStorage.getItem('sakura_download_folder'),
  );
  const [downloadFolderError, setDownloadFolderError] = useState<string | null>(null);
  const handleChooseDownloadFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar carpeta de descargas',
        ...(downloadFolder ? { defaultPath: downloadFolder } : {}),
      });
      if (typeof selected === 'string') {
        setDownloadFolder(selected);
        localStorage.setItem('sakura_download_folder', selected);
        setDownloadFolderError(null);
      }
    } catch (error) {
      console.error('Error al seleccionar la carpeta de descargas:', error);
      setDownloadFolderError(`No se pudo seleccionar la carpeta: ${String(error)}`);
    }
  };
  const handleResetDownloadFolder = () => {
    setDownloadFolder(null);
    localStorage.removeItem('sakura_download_folder');
    setDownloadFolderError(null);
  };
  const playbackQueueRef = useRef<ScannedTrack[]>([]);
  const {
    audioRef,
    isPlaying,
    setIsPlaying,
    duration,
    volume,
    isMuted,
    isShuffle,
    repeatMode,
    handlePlayTrack,
    togglePlay,
    handleNextTrack,
    handlePreviousTrack,
    handleSongEnded,
    handleSeek,
    handleTimeUpdate,
    handleLoadedMetadata,
    handleVolumeChange,
    toggleShuffle,
    toggleMute,
    cycleRepeatMode,
  } = usePlayer({
    tracks,
    activeTrack,
    setActiveTrack,
    playbackQueueRef,
  });

  // Estado del motor de descargas
  const [toolsStatus, setToolsStatus] = useState<DownloaderStatus | null>(null);
  // Cola de descargas (estado + restauración + eventos). Vive en useDownloadQueue.ts;
  // La búsqueda por Internet vive en useOnlineSearch.ts.
  const rescanAfterDownload = useCallback(() => {
    const folder = localStorage.getItem('sakura_current_folder');
    if (folder) {
      invoke<ScannedTrack[]>('scan_library', { folderPath: folder })
        .then((scanned) => setTracks(scanned))
        .catch((e) => console.error('Error al auto-actualizar biblioteca:', e));
    }
  }, []);

  useEffect(() => {
    let active = true;
    let unlisten: (() => void) | undefined;
    listen<string>('library-changed', ({ payload }) => {
      const folder = localStorage.getItem('sakura_current_folder');
      if (!folder || folder !== payload) return;
      invoke<ScannedTrack[]>('scan_library', { folderPath: folder })
        .then(setTracks)
        .catch((error) => console.error('Error al actualizar biblioteca tras un cambio:', error));
    })
      .then((stopListening) => {
        if (active) unlisten = stopListening;
        else stopListening();
      })
      .catch((error) => console.error('No se pudo escuchar cambios de biblioteca:', error));

    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  const {
    downloads,
    setDownloads,
    downloadFormat,
    setDownloadFormat,
    restoredNotice,
    setRestoredNotice,
    triggerDownload,
    cancelDownload,
    cancelAllDownloads,
    retryDownload,
  } = useDownloadQueue({
    currentFolder,
    defaultMusicDir,
    downloadFolder,
    rescanAfterDownload,
  });

  const {
    onlineQuery,
    setOnlineQuery,
    onlineResults,
    setOnlineResults,
    isSearchingOnline,
    onlineSearchError,
    playlistInfo,
    setPlaylistInfo,
    isResolvingPlaylist,
    playlistSearchError,
    selectedPlaylistItems,
    createAlbumFolder,
    setCreateAlbumFolder,
    toggleSelectPlaylistItem,
    selectAllPlaylistItems,
    clearAllPlaylistItems,
    handleDownloadSelectedPlaylist,
    handleOnlineSearch,
  } = useOnlineSearch({
    triggerDownload,
    currentFolder,
    defaultMusicDir,
    downloadFolder,
    setActiveTab,
  });

  // Las portadas en línea (data: o http) se usan tal cual; las locales pasan
  // por convertFileSrc para que el protocolo asset: de Tauri pueda leerlas.
  const getCoverSrc = (coverUrl: string | null) => {
    if (!coverUrl) return '';
    if (
      coverUrl.startsWith('data:') ||
      coverUrl.startsWith('http://') ||
      coverUrl.startsWith('https://')
    ) {
      return coverUrl;
    }
    return convertFileSrc(coverUrl);
  };

  // Extrae el color dominante de la portada para teñir el resplandor del reproductor.
  const [coverGlowColors, setCoverGlowColors] = useState<{ color1: string; color2: string } | null>(
    null,
  );

  useEffect(() => {
    if (!activeTrack?.cover_url) {
      setCoverGlowColors(null);
      return;
    }

    let isMounted = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = getCoverSrc(activeTrack.cover_url);

    img.onload = () => {
      if (!isMounted) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, 16, 16);
        const data = ctx.getImageData(0, 0, 16, 16).data;

        let rSum = 0,
          gSum = 0,
          bSum = 0,
          count = 0;
        let maxSat = 0;
        let vibrantR = 244,
          vibrantG = 63,
          vibrantB = 130;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;

          if (max > 40 && min < 225 && sat > maxSat) {
            maxSat = sat;
            vibrantR = r;
            vibrantG = g;
            vibrantB = b;
          }

          rSum += r;
          gSum += g;
          bSum += b;
          count++;
        }

        if (count > 0) {
          const avgR = Math.round(rSum / count);
          const avgG = Math.round(gSum / count);
          const avgB = Math.round(bSum / count);

          setCoverGlowColors({
            color1: `rgba(${vibrantR}, ${vibrantG}, ${vibrantB}, 0.28)`,
            color2: `rgba(${avgR}, ${avgG}, ${avgB}, 0.20)`,
          });
        }
      } catch {
        setCoverGlowColors(null);
      }
    };

    img.onerror = () => {
      if (isMounted) setCoverGlowColors(null);
    };

    return () => {
      isMounted = false;
    };
  }, [activeTrack?.id, activeTrack?.cover_url]);

  // Inicialización: cargar favoritos, pistas previas y solicitar info del sistema
  useEffect(() => {
    let savedFolder: string | null = null;
    try {
      // Liberar cualquier residuo de caché en localStorage
      localStorage.removeItem('sakura_library_cache');
      const savedFavs = localStorage.getItem('sakura_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      savedFolder = localStorage.getItem('sakura_current_folder');
      if (savedFolder) setCurrentFolder(savedFolder);
    } catch (e) {
      console.warn('No se pudieron cargar datos en caché:', e);
    }

    // Verificar estado de herramientas nativas (yt-dlp y ffmpeg)
    invoke<DownloaderStatus>('check_downloader_tools')
      .then((status) => setToolsStatus(status))
      .catch((err) => console.error('Error al verificar herramientas:', err));

    // Cargar biblioteca desde la caché persistente en disco de Rust (sin límites de navegador)
    invoke<ScannedTrack[]>('get_cached_library')
      .then(async (cached) => {
        if (cached && cached.length > 0) {
          setTracks(cached);
          setActiveTrack(cached[0]);
        }
        if (savedFolder) {
          const refreshed = await invoke<ScannedTrack[]>('scan_library', {
            folderPath: savedFolder,
          });
          setTracks(refreshed);
          setActiveTrack((current) =>
            current
              ? (refreshed.find((track) => track.id === current.id) ?? current)
              : (refreshed[0] ?? null),
          );
        }
      })
      .catch((err) => console.error('Error al cargar o actualizar biblioteca:', err));

    // Solicitar info de Rust
    invoke<AppInfo>('get_app_info', { tracksCount: tracks.length })
      .then((info) => setAppInfo(info))
      .catch((err) => console.error('Error al invocar get_app_info:', err));

    // Detectar carpeta de música predeterminada del usuario
    invoke<string | null>('get_default_music_dir')
      .then((dir) => {
        if (dir) setDefaultMusicDir(dir);
      })
      .catch((err) => console.error('Error al obtener directorio de música:', err));
    // Se consulta una sola vez al arrancar; el directorio del sistema no cambia en caliente.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sincronizar conteo en appInfo
  useEffect(() => {
    setAppInfo((prev) => (prev ? { ...prev, tracks_loaded: tracks.length } : null));
  }, [tracks.length]);

  // Formatear segundos en mm:ss
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder.toString().padStart(2, '0')}`;
  };

  // Función principal para escanear una carpeta dada
  const scanFolder = async (folderPath: string) => {
    setIsScanning(true);
    setScanMessage(`Escaneando biblioteca con motor paralelo Rust: ${folderPath}`);
    try {
      const scanned = await invoke<ScannedTrack[]>('scan_library', { folderPath });
      setTracks(scanned);
      setCurrentFolder(folderPath);
      localStorage.setItem('sakura_current_folder', folderPath);

      if (scanned.length > 0 && !activeTrack) {
        setActiveTrack(scanned[0]);
      }
      setScanMessage(`✓ ¡Listo! ${scanned.length} canciones indexadas en milisegundos.`);
      setTimeout(() => setScanMessage(null), 4000);
    } catch (err) {
      console.error('Error al escanear la biblioteca:', err);
      setScanMessage(`Error al escanear: ${String(err)}`);
    } finally {
      setIsScanning(false);
    }
  };

  // Diálogo nativo para seleccionar carpeta
  const handleOpenFolderDialog = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar Carpeta con tu Música',
      });
      if (selected && typeof selected === 'string') {
        scanFolder(selected);
      }
    } catch (err) {
      console.error('Error al abrir diálogo de selección:', err);
    }
  };

  // Alternar favorito
  const toggleFavorite = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId];
      localStorage.setItem('sakura_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Selección múltiple y Batch Editor
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [pendingDeleteTracks, setPendingDeleteTracks] = useState<ScannedTrack[]>([]);
  // (estado y lógica del editor de metadatos: ver src/hooks/useBatchEditor.ts
  // y src/hooks/useMetadataEditor.ts)
  const toggleSelectTrack = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  };

  const selectAllFilteredTracks = () => {
    setSelectedTrackIds(new Set(filteredTracks.map((t) => t.id)));
  };

  const clearTrackSelection = () => {
    setSelectedTrackIds(new Set());
  };

  const requestDeleteSelectedTracks = () => {
    const selectedTracks = tracks.filter((track) => selectedTrackIds.has(track.id));
    if (selectedTracks.length === 0 || isDeletingTracks || isScanning) return;
    setPendingDeleteTracks(selectedTracks);
  };

  const confirmDeleteSelectedTracks = async () => {
    const selectedTracks = pendingDeleteTracks;
    if (selectedTracks.length === 0 || isDeletingTracks || isScanning) return;
    setIsDeletingTracks(true);
    const deletedIds = new Set<string>();
    const failures: { title: string; error: unknown }[] = [];
    try {
      for (const track of selectedTracks) {
        try {
          await invoke<boolean>('delete_library_track', { path: track.path });
          deletedIds.add(track.id);
        } catch (error) {
          failures.push({ title: track.title, error });
          console.error(`No se pudo eliminar "${track.title}" (${track.path}):`, error);
        }
      }

      if (deletedIds.size > 0) {
        setTracks((current) => current.filter((track) => !deletedIds.has(track.id)));
        setSelectedTrackIds(
          (current) => new Set([...current].filter((trackId) => !deletedIds.has(trackId))),
        );
        setFavorites((current) => {
          const next = current.filter((trackId) => !deletedIds.has(trackId));
          localStorage.setItem('sakura_favorites', JSON.stringify(next));
          return next;
        });

        if (activeTrack && deletedIds.has(activeTrack.id)) {
          audioRef.current?.pause();
          if (audioRef.current) {
            audioRef.current.removeAttribute('src');
            audioRef.current.load();
          }
          setIsPlaying(false);
          setActiveTrack(null);
        }
      }

      if (failures.length > 0) {
        const firstFailure = failures[0];
        setScanMessage(
          `Se eliminaron ${deletedIds.size}; ${failures.length} no se pudieron eliminar. ` +
            `Error en "${firstFailure.title}": ${String(firstFailure.error)}`,
        );
      } else {
        setScanMessage(
          `Se ${deletedIds.size === 1 ? 'eliminó' : 'eliminaron'} ${deletedIds.size} ` +
            `${deletedIds.size === 1 ? 'canción' : 'canciones'} del disco.`,
        );
      }
      setTimeout(() => setScanMessage(null), 6000);
    } finally {
      setIsDeletingTracks(false);
      setPendingDeleteTracks([]);
    }
  };

  // Estado y lógica de edición (lote + individual). Vive en hooks propios;
  // acá solo se pasa lo necesario.
  const batch = useBatchEditor({
    tracks,
    selectedTrackIds,
    setTracks,
    clearTrackSelection,
  });
  const meta = useMetadataEditor({
    setTracks,
    activeTrack,
    setActiveTrack,
  });

  const {
    isBatchModalOpen,
    setIsBatchModalOpen,
    batchArtist,
    setBatchArtist,
    applyBatchArtist,
    setApplyBatchArtist,
    batchAlbum,
    setBatchAlbum,
    applyBatchAlbum,
    setApplyBatchAlbum,
    batchAlbumArtist,
    setBatchAlbumArtist,
    applyBatchAlbumArtist,
    setApplyBatchAlbumArtist,
    batchYear,
    setBatchYear,
    applyBatchYear,
    setApplyBatchYear,
    batchGenre,
    setBatchGenre,
    applyBatchGenre,
    setApplyBatchGenre,
    batchCoverPath,
    setBatchCoverPath,
    batchCoverPreviewUrl,
    setBatchCoverPreviewUrl,
    applyBatchCover,
    setApplyBatchCover,
    batchRemoveCover,
    setBatchRemoveCover,
    isSavingBatch,
    batchFeedback,
    openBatchModal,
    pickBatchCoverImage,
    handleSaveBatchMetadata,
  } = batch;

  const {
    editingTrack,
    setEditingTrack,
    editTab,
    setEditTab,
    editTitle,
    setEditTitle,
    editArtist,
    setEditArtist,
    editAlbum,
    setEditAlbum,
    editAlbumArtist,
    setEditAlbumArtist,
    editTrackNumber,
    setEditTrackNumber,
    editYear,
    setEditYear,
    editGenre,
    setEditGenre,
    editCoverPath,
    setEditCoverPath,
    editCoverPreviewUrl,
    setEditCoverPreviewUrl,
    removeCover,
    setRemoveCover,
    isSavingMetadata,
    metadataFeedback,
    catalogQuery,
    setCatalogQuery,
    catalogSource,
    setCatalogSource,
    catalogMode,
    setCatalogMode,
    catalogResults,
    isSearchingCatalog,
    catalogError,
    catalogAlbums,
    openedAlbum,
    catalogAlbumTracks,
    isOpeningAlbum,
    albumLink,
    setAlbumLink,
    openEditModal,
    resetField,
    resetAllFields,
    pickNewCoverImage,
    searchCatalog,
    openAlbum,
    openAlbumByLink,
    applyCandidate,
    applyAlbumTrack,
    handlePaste,
    handleSaveMetadata,
  } = meta;

  // (handlers del lote viven en useBatchEditor.ts)

  // Base común de carpetas para el Explorador
  // Explorador, filtrado y álbumes. Vive en useFolderExplorer.ts;
  // Se destructura con los nombres de siempre para no modificar quienes lo consumen.
  const {
    currentFolderNav,
    setCurrentFolderNav,
    setExpandedAlbumKey,
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
  } = useFolderExplorer({
    tracks,
    currentFolder,
    searchQuery,
    filterChip,
    favorites,
    viewMode,
    setSelectedTrackIds,
    handlePlayTrack,
  });
  playbackQueueRef.current = filteredTracks;

  // Colores de acento del tema activo, usados en glows y badges del player.
  const themeGlows: Record<
    ThemeMode,
    { glow1: string; glow2: string; accent: string; badge: string }
  > = {
    space: {
      glow1: 'bg-purple-500/25',
      glow2: 'bg-indigo-700/20',
      accent: 'from-purple-500 to-indigo-500',
      badge: 'bg-purple-500/15 text-purple-100 border-purple-400/30',
    },
    sumie: {
      glow1: 'bg-red-800/15',
      glow2: 'bg-amber-100/40',
      accent: 'from-red-800 to-rose-700',
      badge: 'bg-red-800/10 text-red-900 border-red-800/30',
    },
    byobu: {
      glow1: 'bg-red-700/20',
      glow2: 'bg-stone-900/25',
      accent: 'from-red-700 to-stone-800',
      badge: 'bg-red-700/15 text-red-100 border-red-600/30',
    },
    yoru: {
      glow1: 'bg-amber-500/20',
      glow2: 'bg-orange-900/25',
      accent: 'from-amber-500 to-orange-700',
      badge: 'bg-amber-500/15 text-amber-100 border-amber-500/30',
    },
    hanabi: {
      glow1: 'bg-cyan-400/25',
      glow2: 'bg-fuchsia-600/20',
      accent: 'from-cyan-400 to-fuchsia-500',
      badge: 'bg-cyan-400/15 text-cyan-100 border-cyan-400/30',
    },
    aizuri: {
      glow1: 'bg-sky-400/20',
      glow2: 'bg-blue-900/25',
      accent: 'from-sky-400 to-blue-600',
      badge: 'bg-sky-400/15 text-sky-100 border-sky-400/30',
    },
  };

  const currentTheme = themeGlows[theme];
  const worldStyle = {
    bgClass: 'bg-[#fbf7f4]',
    ambientGlow1: currentTheme.glow1,
    ambientGlow2: currentTheme.glow2,
    accentGradient: currentTheme.accent,
    accentBadge: currentTheme.badge,
  };
  return (
    <div
      data-theme="space"
      data-skin={theme === 'space' ? undefined : theme}
      className={`app-shell relative w-screen h-screen flex flex-col overflow-hidden ${worldStyle.bgClass} font-sans text-ink-100 select-none`}
      style={
        {
          '--glass-opacity': `${glassOpacity / 100}`,
          '--glass-blur': `${glassBlur}px`,
        } as React.CSSProperties
      }
    >
      {/* Elemento de Audio Nativo HTML5 */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleSongEnded}
        onError={(e) => console.error('Error nativo del elemento audio:', e)}
      />

      {/* Resplandor ambiental de fondo dinámico (Acelerado por GPU) */}
      {ambientGlow && (
        <>
          {coverGlowColors ? (
            <>
              <div
                className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-[130px] pointer-events-none transition-all duration-slow animate-pulse"
                style={{ backgroundColor: coverGlowColors.color1 }}
              />
              <div
                className="absolute -bottom-32 -right-32 w-[34rem] h-[34rem] rounded-full blur-[140px] pointer-events-none transition-all duration-slow"
                style={{ backgroundColor: coverGlowColors.color2 }}
              />
              <div
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[22rem] rounded-full blur-[150px] pointer-events-none opacity-40 transition-all duration-slow"
                style={{ backgroundColor: coverGlowColors.color1 }}
              />
            </>
          ) : (
            <>
              <div
                className={`absolute -top-32 -left-32 w-96 h-96 ${worldStyle.ambientGlow1} rounded-full blur-[110px] pointer-events-none transition-all duration-slow animate-pulse`}
              ></div>
              <div
                className={`absolute -bottom-32 -right-32 w-96 h-96 ${worldStyle.ambientGlow2} rounded-full blur-[120px] pointer-events-none transition-all duration-slow`}
              ></div>
            </>
          )}
        </>
      )}

      {/* Capa de Partículas Atmosféricas (Pétalos de Sakura) */}
      {ambientParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
          {
            // Partículas Sakura: Pétalos de flor de cerezo cayendo con la brisa
            <>
              {[...Array(12)].map((_, i) => (
                <div
                  key={`petal-${i}`}
                  className="absolute pointer-events-none"
                  style={{
                    left: `${(i * 8.5 + 2) % 96}%`,
                    top: '-25px',
                    animation: `petal-fall ${14 + (i % 5) * 2.5}s ease-in-out infinite`,
                    animationDelay: `${(i * 1.6) % 10}s`,
                  }}
                >
                  <svg
                    width={`${12 + (i % 4) * 2}`}
                    height={`${12 + (i % 4) * 2}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    className="opacity-60 drop-shadow-[0_2px_4px_rgba(244,63,130,0.3)]"
                    style={{ transform: `rotate(${i * 30}deg)` }}
                  >
                    <path
                      d="M12 2C9 6 4 10 4 15C4 18.5 7.5 21 12 21C16.5 21 20 18.5 20 15C20 10 15 6 12 2Z"
                      fill={i % 2 === 0 ? '#f472b6' : '#fb7185'}
                      opacity="0.8"
                    />
                  </svg>
                </div>
              ))}
            </>
          }
        </div>
      )}

      {/* Barra de título personalizada de la ventana (sin decoración nativa) */}
      <TitleBar />

      {/* Fila principal: nav + contenido */}
      <div className="app-rail-row flex flex-1 min-h-0 overflow-hidden">
        {/* Navegación superior (M3 Zen) */}
        <ZenTopNav
          activeTab={activeTab}
          onNavigate={setActiveTab}
          trackCount={tracks.length}
          downloads={downloads}
        />

        {/* ========================================================= */}
        {/* ÁREA PRINCIPAL CON VISTA DINÁMICA                        */}
        {/* ========================================================= */}
        <main
          className="flex-1 flex flex-col overflow-hidden z-10"
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={-1}
        >
          {/* Barra superior moderna (búsqueda + filtros + contexto) */}
          <header className="gh-header">
            <div className="gh-context">
              <span className="gh-context-dot" />
              <span className="gh-context-label">
                {activeTab === 'home'
                  ? 'Inicio'
                  : activeTab === 'library'
                    ? 'Biblioteca'
                    : activeTab === 'search'
                      ? 'Buscar'
                      : activeTab === 'queue'
                        ? 'Cola'
                        : 'Ajustes'}
              </span>
            </div>

            <div className="gh-search">
              <Search className="gh-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en tu música..."
                className="gh-search-input"
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="gh-search-clear"
                  aria-label="Limpiar búsqueda"
                  title="Limpiar búsqueda"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="gh-search-kbd">⌘ K</span>
              )}
            </div>

            <div className="gh-filters">
              <button
                onClick={() => setFilterChip('all')}
                aria-pressed={filterChip === 'all'}
                className={`gh-chip ${filterChip === 'all' ? 'is-active' : ''}`}
              >
                <Music2 className="w-3.5 h-3.5" />
                <span>Todo</span>
                <span className="gh-chip-num">{tracks.length}</span>
              </button>
              <button
                onClick={() => setFilterChip('flac')}
                aria-pressed={filterChip === 'flac'}
                className={`gh-chip ${filterChip === 'flac' ? 'is-active' : ''}`}
              >
                <AudioLines className="w-3.5 h-3.5" />
                <span>FLAC</span>
              </button>
              <button
                onClick={() => setFilterChip('favorites')}
                aria-pressed={filterChip === 'favorites'}
                className={`gh-chip ${filterChip === 'favorites' ? 'is-active' : ''}`}
              >
                <Heart
                  className="w-3.5 h-3.5"
                  fill={filterChip === 'favorites' ? 'currentColor' : 'none'}
                />
                <span>Favoritas</span>
                <span className="gh-chip-num">{favorites.length}</span>
              </button>
            </div>
          </header>

          {/* Mensaje de escaneo / notificaciones */}
          {scanMessage && (
            <div className="bg-accent-500/10 border-b border-accent-500/20 px-6 py-2 flex items-center justify-between text-xs text-accent-300">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent-400 animate-spin" />
                <span>{scanMessage}</span>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* VISTAS DE PESTAÑAS (TABS)                                 */}
          {/* ========================================================= */}
          {activeTab === 'library' && (
            <LibraryToolbar
              currentFolder={currentFolder}
              isScanning={isScanning}
              viewMode={viewMode}
              selectedCount={selectedTrackIds.size}
              filteredCount={filteredTracks.length}
              isDeleting={isDeletingTracks}
              onOpenFolderDialog={handleOpenFolderDialog}
              onScanFolder={scanFolder}
              onSetViewMode={handleSetViewMode}
              onClearExpandedAlbum={() => setExpandedAlbumKey(null)}
              onSelectAllFiltered={selectAllFilteredTracks}
              onClearSelection={clearTrackSelection}
              onOpenBatchModal={openBatchModal}
              onDeleteSelected={requestDeleteSelectedTracks}
            />
          )}
          <div
            ref={libraryScrollRef}
            className="main-scroll-region flex-1 overflow-y-auto p-6 custom-scroll"
          >
            {/* TAB: BIBLIOTECA */}
            {activeTab === 'library' && (theme === 'sumie' || theme === 'byobu') && (
              <ThemeLibrary
                theme={theme}
                tracks={filteredTracks}
                favorites={favorites}
                activeTrack={activeTrack}
                isPlaying={isPlaying}
                getCoverSrc={getCoverSrc}
                currentFolderNav={currentFolderNav}
                folderExplorerData={folderExplorerData}
                onPlayTrack={handlePlayTrack}
                onToggleFavorite={toggleFavorite}
                onOpenFolderDialog={handleOpenFolderDialog}
                onScanFolder={scanFolder}
                onNavigateUp={handleNavigateUp}
                onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
                onNavigateIntoFolder={handleNavigateIntoFolder}
                onShowAll={() => setCurrentFolderNav([])}
                onOpenEdit={openEditModal}
                onRequestDelete={(track) => setPendingDeleteTracks([track])}
              />
            )}
            {activeTab === 'library' && theme !== 'sumie' && theme !== 'byobu' && (
              <LibraryTab
                tracks={tracks}
                scrollElementRef={libraryScrollRef}
                filteredTracks={filteredTracks}
                favorites={favorites}
                defaultMusicDir={defaultMusicDir}
                isScanning={isScanning}
                isPlaying={isPlaying}
                activeTrack={activeTrack}
                viewMode={viewMode}
                selectedTrackIds={selectedTrackIds}
                currentFolderNav={currentFolderNav}
                folderExplorerData={folderExplorerData}
                albumGroups={albumGroups}
                selectedAlbum={selectedAlbum}
                getCoverSrc={getCoverSrc}
                formatTotalTime={formatTotalTime}
                onOpenFolderDialog={handleOpenFolderDialog}
                onScanFolder={scanFolder}
                onNavigateUp={handleNavigateUp}
                onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
                onNavigateIntoFolder={handleNavigateIntoFolder}
                onPlayFolderTracks={handlePlayFolderTracks}
                onSelectFolderTracks={handleSelectFolderTracks}
                onPlayTrack={handlePlayTrack}
                onOpenEdit={openEditModal}
                onToggleFavorite={toggleFavorite}
                onToggleSelectTrack={toggleSelectTrack}
                onSelectAllFiltered={selectAllFilteredTracks}
                onClearSelection={clearTrackSelection}
                onSetFolderNav={setCurrentFolderNav}
                onSetExpandedAlbumKey={setExpandedAlbumKey}
                onPlayAlbum={handlePlayAlbum}
                onSelectAlbumTracks={handleSelectAlbumTracks}
              />
            )}

            {/* TAB: INICIO (HOME) */}
            {activeTab === 'home' && (theme === 'sumie' || theme === 'byobu') && (
              <ThemeHome
                theme={theme}
                trackCount={tracks.length}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            {activeTab === 'home' && theme !== 'sumie' && theme !== 'byobu' && (
              <HomeTab trackCount={tracks.length} onNavigate={(tab) => setActiveTab(tab)} />
            )}

            {/* TAB: BUSCAR Y DESCARGAR */}
            {activeTab === 'search' && (
              <SearchTab
                toolsStatus={toolsStatus}
                onlineQuery={onlineQuery}
                onlineResults={onlineResults}
                isSearchingOnline={isSearchingOnline}
                onlineSearchError={onlineSearchError}
                playlistSearchError={playlistSearchError}
                isResolvingPlaylist={isResolvingPlaylist}
                playlistInfo={playlistInfo}
                downloadFormat={downloadFormat}
                downloads={downloads}
                createAlbumFolder={createAlbumFolder}
                selectedPlaylistItems={selectedPlaylistItems}
                onQueryChange={setOnlineQuery}
                onSearchSubmit={handleOnlineSearch}
                onFormatChange={setDownloadFormat}
                onGoQueue={() => setActiveTab('queue')}
                onCancelDownload={cancelDownload}
                onClosePlaylist={() => setPlaylistInfo(null)}
                onCreateFolderChange={setCreateAlbumFolder}
                onSelectAllPlaylist={selectAllPlaylistItems}
                onClearPlaylist={clearAllPlaylistItems}
                onDownloadSelectedPlaylist={handleDownloadSelectedPlaylist}
                onTogglePlaylistItem={toggleSelectPlaylistItem}
                onTriggerDownload={triggerDownload}
                onSuggestionSearch={(title) => {
                  setOnlineQuery(title);
                  invoke<OnlineSearchResult[]>('search_online', { query: title })
                    .then((res) => setOnlineResults(res))
                    .catch((err) => console.error(err));
                }}
              />
            )}

            {/* TAB: COLA DE DESCARGAS */}
            {activeTab === 'queue' && (
              <QueueTab
                downloads={downloads}
                restoredNotice={restoredNotice}
                onClearNotice={() => setRestoredNotice(null)}
                onGoSearch={() => setActiveTab('search')}
                onGoLibrary={() => setActiveTab('library')}
                onCancelAll={cancelAllDownloads}
                onCancel={cancelDownload}
                onRetry={retryDownload}
                onClearFinished={() =>
                  setDownloads((prev) =>
                    prev.filter(
                      (d) =>
                        !d.status.startsWith('completado') &&
                        !d.status.includes('error') &&
                        d.status !== 'cancelado',
                    ),
                  )
                }
              />
            )}

            {/* TAB: AJUSTES */}
            {activeTab === 'settings' && (
              <SettingsTab
                theme={theme}
                temas={TEMAS_DISPONIBLES}
                onSetTheme={handleSetTheme}
                accentGradient={worldStyle.accentGradient}
                accentBadge={worldStyle.accentBadge}
                coverGlowActive={!!coverGlowColors}
                playerStyle={playerStyle}
                glassOpacity={glassOpacity}
                glassBlur={glassBlur}
                ambientGlow={ambientGlow}
                ambientParticles={ambientParticles}
                appInfo={appInfo}
                currentFolder={currentFolder}
                downloadFolder={downloadFolder}
                downloadFolderError={downloadFolderError}
                onChooseDownloadFolder={handleChooseDownloadFolder}
                onResetDownloadFolder={handleResetDownloadFolder}
                onSetPlayerStyle={handleSetPlayerStyle}
                onSetGlassOpacity={handleSetGlassOpacity}
                onSetGlassBlur={handleSetGlassBlur}
                onSetAmbientGlow={handleSetAmbientGlow}
                onSetAmbientParticles={handleSetAmbientParticles}
                onClearCache={async () => {
                  try {
                    await invoke('clear_library_cache');
                    localStorage.removeItem('sakura_library_cache');
                    setTracks([]);
                    setActiveTrack(null);
                  } catch (error) {
                    console.error('Error al limpiar la caché de biblioteca:', error);
                    setScanMessage(`No se pudo limpiar la caché: ${String(error)}`);
                  }
                }}
              />
            )}
          </div>

          {/* ========================================================= */}
          {/* REPRODUCTOR TEMÁTICO (DOCK FLOTANTE / BARRA FIJA)         */}
          {/* ========================================================= */}
          <PlayerBar
            playerStyle={playerStyle}
            onSetPlayerStyle={handleSetPlayerStyle}
            activeTrack={activeTrack}
            favorites={favorites}
            isPlaying={isPlaying}
            isShuffle={isShuffle}
            repeatMode={repeatMode}
            audioRef={audioRef}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            getCoverSrc={getCoverSrc}
            formatTime={formatTime}
            onTogglePlay={togglePlay}
            onNext={() => handleNextTrack()}
            onPrevious={handlePreviousTrack}
            onSeek={handleSeek}
            onToggleShuffle={toggleShuffle}
            onCycleRepeat={cycleRepeatMode}
            onToggleMute={toggleMute}
            onVolumeChange={handleVolumeChange}
            onToggleFavorite={toggleFavorite}
          />

          {/* ── MODAL EDITOR DE METADATOS PRO & CATÁLOGO ── */}
          {editingTrack && (
            <MetadataModal
              editingTrack={editingTrack}
              editTab={editTab}
              editTitle={editTitle}
              editArtist={editArtist}
              editAlbum={editAlbum}
              editAlbumArtist={editAlbumArtist}
              editTrackNumber={editTrackNumber}
              editYear={editYear}
              editGenre={editGenre}
              editCoverPath={editCoverPath}
              editCoverPreviewUrl={editCoverPreviewUrl}
              removeCover={removeCover}
              isSavingMetadata={isSavingMetadata}
              metadataFeedback={metadataFeedback}
              catalogQuery={catalogQuery}
              catalogSource={catalogSource}
              catalogResults={catalogResults}
              isSearchingCatalog={isSearchingCatalog}
              catalogError={catalogError}
              catalogMode={catalogMode}
              catalogAlbums={catalogAlbums}
              openedAlbum={openedAlbum}
              catalogAlbumTracks={catalogAlbumTracks}
              isOpeningAlbum={isOpeningAlbum}
              getCoverSrc={getCoverSrc}
              onClose={() => setEditingTrack(null)}
              onPaste={handlePaste}
              onSetEditTab={setEditTab}
              onSearchCatalog={() => searchCatalog()}
              onApplyCandidate={applyCandidate}
              onOpenAlbum={openAlbum}
              onApplyAlbumTrack={applyAlbumTrack}
              albumLink={albumLink}
              onSetAlbumLink={setAlbumLink}
              onOpenAlbumByLink={openAlbumByLink}
              onSetCatalogMode={setCatalogMode}
              onPickCover={pickNewCoverImage}
              onResetField={resetField}
              onResetAll={resetAllFields}
              onSave={handleSaveMetadata}
              onEditTitleChange={setEditTitle}
              onEditArtistChange={setEditArtist}
              onEditAlbumChange={setEditAlbum}
              onEditAlbumArtistChange={setEditAlbumArtist}
              onEditTrackNumberChange={setEditTrackNumber}
              onEditYearChange={setEditYear}
              onEditGenreChange={setEditGenre}
              onSetCoverPath={setEditCoverPath}
              onSetCoverPreview={setEditCoverPreviewUrl}
              onSetRemoveCover={setRemoveCover}
              onCatalogQueryChange={setCatalogQuery}
              onCatalogSourceChange={(v) => setCatalogSource(v)}
            />
          )}

          <DeleteTracksDialog
            tracks={pendingDeleteTracks}
            isDeleting={isDeletingTracks}
            onCancel={() => {
              if (!isDeletingTracks) setPendingDeleteTracks([]);
            }}
            onConfirm={confirmDeleteSelectedTracks}
          />

          {/* ========================================================= */}
          {/* MODAL: EDITOR DE METADATOS EN LOTE (BATCH EDITOR)         */}
          {/* ========================================================= */}
          <BatchModal
            open={isBatchModalOpen}
            selectedCount={selectedTrackIds.size}
            isSaving={isSavingBatch}
            feedback={batchFeedback}
            batchArtist={batchArtist}
            batchAlbum={batchAlbum}
            batchAlbumArtist={batchAlbumArtist}
            batchYear={batchYear}
            batchGenre={batchGenre}
            batchCoverPath={batchCoverPath}
            batchCoverPreviewUrl={batchCoverPreviewUrl}
            batchRemoveCover={batchRemoveCover}
            applyArtist={applyBatchArtist}
            applyAlbum={applyBatchAlbum}
            applyAlbumArtist={applyBatchAlbumArtist}
            applyYear={applyBatchYear}
            applyGenre={applyBatchGenre}
            applyCover={applyBatchCover}
            onClose={() => setIsBatchModalOpen(false)}
            onSave={handleSaveBatchMetadata}
            onPickCover={pickBatchCoverImage}
            onBatchArtistChange={setBatchArtist}
            onBatchAlbumChange={setBatchAlbum}
            onBatchAlbumArtistChange={setBatchAlbumArtist}
            onBatchYearChange={setBatchYear}
            onBatchGenreChange={setBatchGenre}
            onApplyArtistChange={setApplyBatchArtist}
            onApplyAlbumChange={setApplyBatchAlbum}
            onApplyAlbumArtistChange={setApplyBatchAlbumArtist}
            onApplyYearChange={setApplyBatchYear}
            onApplyGenreChange={setApplyBatchGenre}
            onApplyCoverChange={setApplyBatchCover}
            onSetCoverPath={setBatchCoverPath}
            onSetCoverPreview={setBatchCoverPreviewUrl}
            onSetRemoveCover={setBatchRemoveCover}
          />
        </main>
      </div>
    </div>
  );
}
