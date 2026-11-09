import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { 
  Home, 
  Search, 
  Library, 
  DownloadCloud, 
  Settings, 
  Cpu,
  Heart,
  Sparkles,
} from 'lucide-react';

import type {
  ScannedTrack,
  OnlineSearchResult,
  DownloaderStatus,
  AppInfo,
  ThemeMode,
  ThemeWorld,
  PlayerStyle,
  ViewMode,
} from './types';
import { useBatchEditor } from './hooks/useBatchEditor';
import { useMetadataEditor } from './hooks/useMetadataEditor';
import QueueTab from './components/QueueTab';
import HomeTab from './components/HomeTab';
import SettingsTab from './components/SettingsTab';
import PlayerBar from './components/PlayerBar';
import SearchTab from './components/SearchTab';
import LibraryTab from './components/LibraryTab';
import MetadataModal from './components/MetadataModal';
import BatchModal from './components/BatchModal';
import { useDownloadQueue } from './hooks/useDownloadQueue';
import { useOnlineSearch } from './hooks/useOnlineSearch';
import { useFolderExplorer } from './hooks/useFolderExplorer';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'queue' | 'settings'>('library');
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('sakura_theme') as ThemeMode) || 'sakura';
  });
  const [themeWorld, setThemeWorld] = useState<ThemeWorld>(() => {
    return (localStorage.getItem('sakura_theme_world') as ThemeWorld) || 'sakura_zen';
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

  const handleSetThemeWorld = (w: ThemeWorld) => {
    setThemeWorld(w);
    localStorage.setItem('sakura_theme_world', w);
  };
  const handleSetPlayerStyle = (s: PlayerStyle) => {
    setPlayerStyle(s);
    localStorage.setItem('sakura_player_style', s);
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

  // Persistir el tema elegido (los mundos ya se guardan en su handler).
  useEffect(() => {
    localStorage.setItem('sakura_theme', theme);
  }, [theme]);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('sakura_view_mode') as ViewMode | null;
    if (saved && (saved === 'folders' || saved === 'grid' || saved === 'table' || saved === 'albums')) {
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [filterChip, setFilterChip] = useState<'all' | 'flac' | 'recent' | 'favorites'>('all');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [defaultMusicDir, setDefaultMusicDir] = useState<string | null>(null);

  // Estado del motor de descargas
  const [toolsStatus, setToolsStatus] = useState<DownloaderStatus | null>(null);
  // Cola de descargas (estado + restauración + eventos). Vive en useDownloadQueue.ts;
  // La búsqueda online vive en useOnlineSearch.ts.
  const rescanAfterDownload = useCallback(() => {
    const folder = localStorage.getItem('sakura_current_folder');
    if (folder) {
      invoke<ScannedTrack[]>('scan_library', { folderPath: folder })
        .then(scanned => setTracks(scanned))
        .catch(e => console.error("Error al auto-actualizar biblioteca:", e));
    }
  }, []);

  const {
    downloads, setDownloads,
    downloadFormat, setDownloadFormat,
    restoredNotice, setRestoredNotice,
    triggerDownload,
    cancelDownload,
    cancelAllDownloads,
    retryDownload,
  } = useDownloadQueue({
    currentFolder,
    defaultMusicDir,
    rescanAfterDownload,
  });

  const {
    onlineQuery, setOnlineQuery,
    onlineResults, setOnlineResults,
    isSearchingOnline,
    onlineSearchError,
    playlistInfo, setPlaylistInfo,
    isResolvingPlaylist,
    playlistSearchError,
    selectedPlaylistItems,
    createAlbumFolder, setCreateAlbumFolder,
    toggleSelectPlaylistItem,
    selectAllPlaylistItems,
    clearAllPlaylistItems,
    handleDownloadSelectedPlaylist,
    handleOnlineSearch,
  } = useOnlineSearch({
    triggerDownload,
    currentFolder,
    defaultMusicDir,
    setActiveTab,
  });


  // Referencia al elemento nativo de audio y al Blob URL activo
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);

  // Helper para resolver portadas (locales o base64) de forma óptima
  const getCoverSrc = (coverUrl: string | null) => {
    if (!coverUrl) return '';
    if (coverUrl.startsWith('data:') || coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) {
      return coverUrl;
    }
    return convertFileSrc(coverUrl);
  };

  // Extractor de color dominante para Resplandor Ambiental Dinámico (Dynamic Cover Glow)
  const [coverGlowColors, setCoverGlowColors] = useState<{ color1: string; color2: string } | null>(null);

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

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        let maxSat = 0;
        let vibrantR = 244, vibrantG = 63, vibrantB = 130;

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
      } catch (err) {
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
    try {
      // Liberar cualquier residuo de caché en localStorage
      localStorage.removeItem('sakura_library_cache');
      const savedFavs = localStorage.getItem('sakura_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      const savedFolder = localStorage.getItem('sakura_current_folder');
      if (savedFolder) setCurrentFolder(savedFolder);
    } catch (e) {
      console.warn("No se pudieron cargar datos en caché:", e);
    }

    // Verificar estado de herramientas nativas (yt-dlp y ffmpeg)
    invoke<DownloaderStatus>('check_downloader_tools')
      .then(status => setToolsStatus(status))
      .catch(err => console.error("Error al verificar herramientas:", err));

    // Cargar biblioteca desde la caché persistente en disco de Rust (sin límites de navegador)
    invoke<ScannedTrack[]>('get_cached_library')
      .then(cached => {
        if (cached && cached.length > 0) {
          setTracks(cached);
          setActiveTrack(cached[0]);
        }
      })
      .catch(err => console.error("Error al cargar biblioteca en caché:", err));

    // Solicitar info de Rust
    invoke<AppInfo>('get_app_info', { tracksCount: tracks.length })
      .then(info => setAppInfo(info))
      .catch(err => console.error("Error al invocar get_app_info:", err));

    // Detectar carpeta de música predeterminada del usuario
    invoke<string | null>('get_default_music_dir')
      .then(dir => {
        if (dir) setDefaultMusicDir(dir);
      })
      .catch(err => console.error("Error al obtener directorio de música:", err));
  }, []);


  // Sincronizar conteo en appInfo
  useEffect(() => {
    if (appInfo) {
      setAppInfo(prev => prev ? { ...prev, tracks_loaded: tracks.length } : null);
    }
  }, [tracks.length]);

  // Sincronizar volumen del reproductor
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

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
      console.error("Error al escanear la biblioteca:", err);
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
      console.error("Error al abrir diálogo de selección:", err);
    }
  };

  // Reproducir una canción específica
  // IMPORTANTE: Se carga vía Blob URL en memoria para que Windows NUNCA bloquee el archivo en disco,
  // permitiendo editar metadatos o carátulas en tiempo real incluso mientras suena la música.
  const handlePlayTrack = async (track: ScannedTrack) => {
    setActiveTrack(track);
    if (!audioRef.current) return;

    try {
      // Liberar Blob URL anterior de memoria
      if (currentBlobUrlRef.current) {
        URL.revokeObjectURL(currentBlobUrlRef.current);
        currentBlobUrlRef.current = null;
      }

      const assetUrl = convertFileSrc(track.path);
      const res = await fetch(assetUrl);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      currentBlobUrlRef.current = blobUrl;

      audioRef.current.src = blobUrl;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.error("Error al reproducir audio:", err);
      setIsPlaying(false);
    }
  };

  // Alternar Play/Pausa
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (!activeTrack && tracks.length > 0) {
      handlePlayTrack(tracks[0]);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Error al reanudar:", err));
    }
  };

  // Pista siguiente. `auto` distingue el avance automático (respeta el final
  // de la lista cuando la repetición está apagada) del clic manual.
  const handleNextTrack = (auto = false) => {
    if (filteredTracks.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length);
      handlePlayTrack(filteredTracks[randomIndex]);
      return;
    }
    const currentIndex = filteredTracks.findIndex(t => t.id === activeTrack?.id);
    if (currentIndex < 0) {
      handlePlayTrack(filteredTracks[0]);
      return;
    }
    const isLast = currentIndex === filteredTracks.length - 1;
    if (isLast && auto && repeatMode === 'off') {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    const nextIndex = (currentIndex + 1) % filteredTracks.length;
    handlePlayTrack(filteredTracks[nextIndex]);
  };

  // Pista anterior
  const handlePreviousTrack = () => {
    if (filteredTracks.length === 0) return;
    if (currentTime > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    const currentIndex = filteredTracks.findIndex(t => t.id === activeTrack?.id);
    const prevIndex = (currentIndex - 1 + filteredTracks.length) % filteredTracks.length;
    handlePlayTrack(filteredTracks[prevIndex]);
  };

  // Al finalizar una canción
  const handleSongEnded = () => {
    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
    } else if (repeatMode === 'all') {
      handleNextTrack(true);
    } else {
      // Repetición apagada: avanzar solo si queda algo en la lista.
      const currentIndex = filteredTracks.findIndex(t => t.id === activeTrack?.id);
      if (currentIndex >= 0 && currentIndex < filteredTracks.length - 1) {
        handleNextTrack(true);
      } else {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.currentTime = 0;
      }
    }
  };

  // Control del Scrubber / Progreso
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(e.target.value);
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  // Alternar favorito
  const toggleFavorite = (trackId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId];
      localStorage.setItem('sakura_favorites', JSON.stringify(next));
      return next;
    });
  };

  // Playlist / Álbum de YouTube



  // Selección múltiple y Batch Editor
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  // (estado y lógica del editor de metadatos: ver src/hooks/useBatchEditor.ts
  // y src/hooks/useMetadataEditor.ts)
  const toggleSelectTrack = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTrackIds(prev => {
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
    setSelectedTrackIds(new Set(filteredTracks.map(t => t.id)));
  };

  const clearTrackSelection = () => {
    setSelectedTrackIds(new Set());
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
    tracks,
    setTracks,
    activeTrack,
    setActiveTrack,
  });

  const {
    isBatchModalOpen, setIsBatchModalOpen,
    batchArtist, setBatchArtist,
    applyBatchArtist, setApplyBatchArtist,
    batchAlbum, setBatchAlbum,
    applyBatchAlbum, setApplyBatchAlbum,
    batchAlbumArtist, setBatchAlbumArtist,
    applyBatchAlbumArtist, setApplyBatchAlbumArtist,
    batchYear, setBatchYear,
    applyBatchYear, setApplyBatchYear,
    batchGenre, setBatchGenre,
    applyBatchGenre, setApplyBatchGenre,
    batchCoverPath, setBatchCoverPath,
    batchCoverPreviewUrl, setBatchCoverPreviewUrl,
    applyBatchCover, setApplyBatchCover,
    batchRemoveCover, setBatchRemoveCover,
    isSavingBatch,
    batchFeedback,
    openBatchModal,
    pickBatchCoverImage,
    handleSaveBatchMetadata,
  } = batch;

  const {
    editingTrack, setEditingTrack,
    editTab, setEditTab,
    editTitle, setEditTitle,
    editArtist, setEditArtist,
    editAlbum, setEditAlbum,
    editAlbumArtist, setEditAlbumArtist,
    editTrackNumber, setEditTrackNumber,
    editYear, setEditYear,
    editGenre, setEditGenre,
    editCoverPath, setEditCoverPath,
    editCoverPreviewUrl, setEditCoverPreviewUrl,
    removeCover, setRemoveCover,
    isSavingMetadata,
    metadataFeedback,
    catalogQuery, setCatalogQuery,
    catalogSource, setCatalogSource,
    catalogResults,
    isSearchingCatalog,
    catalogError,
    openEditModal,
    resetField,
    resetAllFields,
    pickNewCoverImage,
    searchCatalog,
    applyCandidate,
    handlePaste,
    handleSaveMetadata,
  } = meta;

  // (handlers del lote viven en useBatchEditor.ts)



  // Base común de carpetas para el Explorador
  // Explorador, filtrado y álbumes. Vive en useFolderExplorer.ts;
  // acá se destructura con los nombres originales para no tocar call sites.
  const {
    currentFolderNav, setCurrentFolderNav,
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

  // Configuración de temas dinámicos
  const themeGlows: Record<ThemeMode, { glow1: string; glow2: string; accent: string; badge: string; border: string }> = {
    sakura: {
      glow1: 'bg-accent-600/30',
      glow2: 'bg-purple-700/20',
      accent: 'from-accent-500 to-accent-400',
      badge: 'bg-accent-500/20 text-accent-300 border-accent-500/30',
      border: 'border-accent-500/40',
    },
    cyber: {
      glow1: 'bg-cyan-500/30',
      glow2: 'bg-blue-600/20',
      accent: 'from-cyan-400 to-blue-500',
      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      border: 'border-cyan-500/40',
    },
    amber: {
      glow1: 'bg-amber-500/30',
      glow2: 'bg-orange-600/20',
      accent: 'from-amber-400 to-orange-500',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      border: 'border-amber-500/40',
    },
    emerald: {
      glow1: 'bg-emerald-500/30',
      glow2: 'bg-teal-600/20',
      accent: 'from-emerald-400 to-teal-500',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      border: 'border-emerald-500/40',
    },
  };

  const currentTheme = themeGlows[theme];
  const isWWM = themeWorld === 'where_winds_meet';
  const worldStyle = isWWM ? {
    id: 'where_winds_meet',
    name: 'Wuxia Jianghu',
    icon: '🎋',
    bgClass: 'bg-[#040e09]',
    ambientGlow1: 'bg-emerald-600/25',
    ambientGlow2: 'bg-amber-600/20',
    accentGradient: 'from-emerald-500 via-teal-500 to-amber-500',
    accentText: 'text-emerald-400',
    accentTextHover: 'hover:text-emerald-300',
    accentBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    activeTabBg: 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30',
    cardBorderHover: 'hover:border-amber-500/40',
    playButtonGradient: 'from-emerald-500 to-teal-400',
    seekAccent: 'accent-emerald-400',
    tagText: 'text-emerald-300',
    glowColor: 'shadow-emerald-500/25',
    sidebarTitle: 'Wuxia Jianghu',
    sidebarSubtitle: 'Sendero Jianghu & Bambú',
    logoIcon: '🎋',
  } : {
    id: 'sakura_zen',
    name: 'Sakura Zen',
    icon: '🌸',
    bgClass: 'bg-[#0a060e]',
    ambientGlow1: currentTheme.glow1,
    ambientGlow2: currentTheme.glow2,
    accentGradient: currentTheme.accent,
    accentText: 'text-accent-400',
    accentTextHover: 'hover:text-accent-300',
    accentBadge: currentTheme.badge,
    activeTabBg: 'bg-white/10 text-white shadow-sm border border-white/10',
    cardBorderHover: 'hover:border-accent-500/40',
    playButtonGradient: currentTheme.accent,
    seekAccent: 'accent-accent-500',
    tagText: 'text-accent-300',
    glowColor: 'shadow-accent-500/25',
    sidebarTitle: 'Sakura Music',
    sidebarSubtitle: 'Tauri 2 · Rust Core',
    logoIcon: '🌸',
  };

  return (
    <div 
      data-theme={theme}
      data-world={themeWorld}
      className={`relative w-screen h-screen flex overflow-hidden ${worldStyle.bgClass} font-sans text-gray-100 select-none ${isWWM ? 'theme-where-winds-meet' : ''}`}
      style={{
        '--glass-opacity': `${glassOpacity / 100}`,
        '--glass-blur': `${glassBlur}px`,
      } as React.CSSProperties}>
      
      {/* Elemento de Audio Nativo HTML5 */}
      <audio
        ref={audioRef}
        onTimeUpdate={() => {
          if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
        }}
        onLoadedMetadata={() => {
          if (audioRef.current) setDuration(audioRef.current.duration);
        }}
        onEnded={handleSongEnded}
        onError={(e) => console.error("Error nativo del elemento audio:", e)}
      />

      {/* Resplandor ambiental de fondo dinámico (Acelerado por GPU) */}
      {ambientGlow && (
        <>
          {coverGlowColors ? (
            <>
              <div 
                className="absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full blur-[130px] pointer-events-none transition-all duration-1000 animate-pulse"
                style={{ backgroundColor: coverGlowColors.color1 }}
              />
              <div 
                className="absolute -bottom-32 -right-32 w-[34rem] h-[34rem] rounded-full blur-[140px] pointer-events-none transition-all duration-1000"
                style={{ backgroundColor: coverGlowColors.color2 }}
              />
              <div 
                className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[22rem] rounded-full blur-[150px] pointer-events-none opacity-40 transition-all duration-1000"
                style={{ backgroundColor: coverGlowColors.color1 }}
              />
            </>
          ) : (
            <>
              <div className={`absolute -top-32 -left-32 w-96 h-96 ${worldStyle.ambientGlow1} rounded-full blur-[110px] pointer-events-none transition-all duration-700 animate-pulse`}></div>
              <div className={`absolute -bottom-32 -right-32 w-96 h-96 ${worldStyle.ambientGlow2} rounded-full blur-[120px] pointer-events-none transition-all duration-700`}></div>
            </>
          )}
        </>
      )}

      {/* Capa de Partículas Atmosféricas (Pétalos de Sakura / Chispas & Bruma Jianghu) */}
      {ambientParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
          {isWWM ? (
            // Partículas Jianghu: Chispas doradas de linterna y bruma ascendente
            <>
              {[...Array(12)].map((_, i) => (
                <div
                  key={`spark-${i}`}
                  className="absolute rounded-full pointer-events-none"
                  style={{
                    left: `${(i * 8.3 + 4) % 96}%`,
                    bottom: '-20px',
                    width: `${(i % 3) * 2 + 3}px`,
                    height: `${(i % 3) * 2 + 3}px`,
                    backgroundColor: i % 2 === 0 ? '#fbbf24' : '#34d399',
                    boxShadow: i % 2 === 0 ? '0 0 10px #fbbf24' : '0 0 10px #34d399',
                    animation: `spark-rise ${12 + (i % 6) * 2}s linear infinite`,
                    animationDelay: `${(i * 1.3) % 8}s`,
                    opacity: 0.65,
                  }}
                />
              ))}
            </>
          ) : (
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
                  }}>
                  <svg 
                    width={`${12 + (i % 4) * 2}`} 
                    height={`${12 + (i % 4) * 2}`} 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    className="opacity-60 drop-shadow-[0_2px_4px_rgba(244,63,130,0.3)]"
                    style={{ transform: `rotate(${i * 30}deg)` }}>
                    <path 
                      d="M12 2C9 6 4 10 4 15C4 18.5 7.5 21 12 21C16.5 21 20 18.5 20 15C20 10 15 6 12 2Z" 
                      fill={i % 2 === 0 ? "#f472b6" : "#fb7185"} 
                      opacity="0.8" 
                    />
                  </svg>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SIDEBAR NATIVO CON EFECTO VIDRIO                           */}
      {/* ========================================================= */}
      <aside className="w-64 glass-surface flex flex-col p-4 z-20 border-r border-white/5 flex-shrink-0">
        
        {/* Logotipo Sakura / Jianghu */}
        <div className="flex items-center gap-3 px-3 py-2 mb-6">
          <div className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${worldStyle.accentGradient} flex items-center justify-center text-white font-bold text-lg shadow-lg ${worldStyle.glowColor} transform hover:scale-105 transition-transform`}>
            {worldStyle.logoIcon}
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white">{worldStyle.sidebarTitle}</h1>
            <span className={`text-[10px] ${isWWM ? 'text-emerald-300/90' : 'text-accent-300/90'} font-medium tracking-wider uppercase`}>{worldStyle.sidebarSubtitle}</span>
          </div>
        </div>

        {/* Menú de Navegación */}
        <nav className="space-y-1">
          <button 
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'home' 
                ? `${worldStyle.activeTabBg} font-semibold` 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Home className={`w-4 h-4 ${worldStyle.accentText}`} />
            <span>Inicio</span>
          </button>

          <button 
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'library' 
                ? `${worldStyle.activeTabBg} font-semibold` 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Library className={`w-4 h-4 ${isWWM ? 'text-teal-400' : 'text-purple-400'}`} />
            <span>Biblioteca</span>
            <span className="ml-auto text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-gray-300 font-mono">
              {tracks.length}
            </span>
          </button>

          <button 
            onClick={() => setActiveTab('search')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'search' 
                ? `${worldStyle.activeTabBg} font-semibold` 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Search className={`w-4 h-4 ${isWWM ? 'text-amber-400' : 'text-cyan-400'}`} />
            <span>Buscar y Descargar</span>
          </button>

          <button 
            onClick={() => setActiveTab('queue')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'queue' 
                ? `${worldStyle.activeTabBg} font-semibold` 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <DownloadCloud className={`w-4 h-4 ${isWWM ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>Cola de Descargas</span>
            {downloads.some(d => d.status === 'descargando') && (
              <span className={`ml-auto w-2 h-2 rounded-full ${isWWM ? 'bg-emerald-400' : 'bg-accent-400'} animate-ping`}></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'settings' 
                ? `${worldStyle.activeTabBg} font-semibold` 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Settings className={`w-4 h-4 ${isWWM ? 'text-emerald-400' : 'text-accent-400'}`} />
            <span>Ajustes</span>
          </button>
        </nav>

        {/* Conmutador rápido de Universo Zen / Wuxia */}
        <div className="mt-5 pt-3.5 border-t border-white/5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 px-1">
            <span>Mundo Visual:</span>
            <span className={`text-[10px] font-semibold ${isWWM ? 'text-emerald-300' : 'text-accent-300'}`}>
              {worldStyle.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
            <button
              onClick={() => handleSetThemeWorld('sakura_zen')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                themeWorld === 'sakura_zen'
                  ? 'bg-gradient-to-r from-accent-500 to-accent-400 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}>
              <span>🌸</span>
              <span>Sakura</span>
            </button>
            <button
              onClick={() => handleSetThemeWorld('where_winds_meet')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                themeWorld === 'where_winds_meet'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : 'text-gray-400 hover:text-white'
              }`}>
              <span>🎋</span>
              <span>Wuxia</span>
            </button>
          </div>
        </div>

        {/* Selector de temas dinámicos */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 px-1">
            <span>Tema visual:</span>
            <span className="capitalize text-xs font-medium text-white">{theme}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
            <button 
              onClick={() => setTheme('sakura')} 
              className={`h-6 rounded-lg bg-gradient-to-tr from-pink-500 to-rose-400 transition-transform ${theme === 'sakura' ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`} 
              title="Sakura Blossom"
            />
            <button 
              onClick={() => setTheme('cyber')} 
              className={`h-6 rounded-lg bg-gradient-to-tr from-cyan-400 to-blue-500 transition-transform ${theme === 'cyber' ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`} 
              title="Cyber Neon"
            />
            <button 
              onClick={() => setTheme('amber')} 
              className={`h-6 rounded-lg bg-gradient-to-tr from-amber-400 to-orange-500 transition-transform ${theme === 'amber' ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`} 
              title="Sunset Amber"
            />
            <button 
              onClick={() => setTheme('emerald')} 
              className={`h-6 rounded-lg bg-gradient-to-tr from-emerald-400 to-teal-500 transition-transform ${theme === 'emerald' ? 'ring-2 ring-white scale-105' : 'opacity-70 hover:opacity-100'}`} 
              title="Forest Emerald"
            />
          </div>
        </div>

        {/* Tarjeta de estado de Rust */}
        <div className="mt-auto p-3.5 rounded-2xl bg-white/5 border border-white/5">
          <div className="flex items-center gap-2 text-[11px] text-accent-300 font-semibold mb-1">
            <Cpu className="w-3.5 h-3.5 text-accent-400" />
            <span>{appInfo?.engine ?? 'Tauri 2.0 + Rust Engine'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Memoria:</span>
            <span className="text-white font-mono">{appInfo?.memory_usage ?? '—'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
            <span>Compilador:</span>
            <span className="text-white font-mono">{appInfo?.rust_version ?? 'rustc'}</span>
          </div>
        </div>

      </aside>

      {/* ========================================================= */}
      {/* ÁREA PRINCIPAL CON VISTA DINÁMICA                        */}
      {/* ========================================================= */}
      <main className="flex-1 flex flex-col overflow-hidden z-10">
        
        {/* Barra superior de búsqueda y acciones */}
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 glass-card">
          <div className="relative w-96">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar título, artista o álbum en milisegundos..."
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-accent-500 focus:ring-2 focus:ring-accent-500/20 transition-all"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-2.5 text-gray-400" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-[10px] bg-white/10 hover:bg-white/20 text-gray-300 px-1.5 py-0.5 rounded-full">
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => setFilterChip('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterChip === 'all' ? currentTheme.badge : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              Todo ({tracks.length})
            </button>
            <button 
              onClick={() => setFilterChip('flac')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterChip === 'flac' ? currentTheme.badge : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              FLAC
            </button>
            <button 
              onClick={() => setFilterChip('favorites')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                filterChip === 'favorites' ? currentTheme.badge : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}>
              <Heart className="w-3 h-3 fill-current text-accent-400" />
              Favoritas ({favorites.length})
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
        <div className="flex-1 overflow-y-auto p-6 custom-scroll">

          {/* TAB: BIBLIOTECA */}
          {activeTab === 'library' && (
            <LibraryTab
              tracks={tracks}
              filteredTracks={filteredTracks}
              favorites={favorites}
              currentFolder={currentFolder}
              defaultMusicDir={defaultMusicDir}
              isScanning={isScanning}
              isPlaying={isPlaying}
              isWWM={isWWM}
              activeTrack={activeTrack}
              viewMode={viewMode}
              selectedTrackIds={selectedTrackIds}
              currentFolderNav={currentFolderNav}
              folderExplorerData={folderExplorerData}
              albumGroups={albumGroups}
              selectedAlbum={selectedAlbum}
              getCoverSrc={getCoverSrc}
              formatTotalTime={formatTotalTime}
              onSetViewMode={handleSetViewMode}
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
              onOpenBatchModal={openBatchModal}
              onSetFolderNav={setCurrentFolderNav}
              onSetExpandedAlbumKey={setExpandedAlbumKey}
              onPlayAlbum={handlePlayAlbum}
              onSelectAlbumTracks={handleSelectAlbumTracks}
            />
          )}

          {/* TAB: INICIO (HOME) */}
          {activeTab === 'home' && (
            <HomeTab
              tracks={tracks}
              favorites={favorites}
              downloads={downloads}
              getCoverSrc={getCoverSrc}
              onPlayFirst={() => {
                if (tracks.length > 0) handlePlayTrack(tracks[0]);
                else handleOpenFolderDialog();
              }}
              onPlayTrack={handlePlayTrack}
              onGoLibrary={() => setActiveTab('library')}
            />
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
              createAlbumFolder={createAlbumFolder}
              selectedPlaylistItems={selectedPlaylistItems}
              onQueryChange={setOnlineQuery}
              onSearchSubmit={handleOnlineSearch}
              onFormatChange={setDownloadFormat}
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
                  .then(res => setOnlineResults(res))
                  .catch(err => console.error(err));
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
              onClearFinished={() => setDownloads(prev => prev.filter(d => !d.status.startsWith('completado') && !d.status.includes('error') && d.status !== 'cancelado'))}
            />
          )}

          {/* TAB: AJUSTES */}
          {activeTab === 'settings' && (
            <SettingsTab
              accentGradient={worldStyle.accentGradient}
              accentBadge={worldStyle.accentBadge}
              themeWorld={themeWorld}
              isWWM={isWWM}
              coverGlowActive={!!coverGlowColors}
              playerStyle={playerStyle}
              glassOpacity={glassOpacity}
              glassBlur={glassBlur}
              ambientGlow={ambientGlow}
              ambientParticles={ambientParticles}
              appInfo={appInfo}
              currentFolder={currentFolder}
              onSetThemeWorld={handleSetThemeWorld}
              onSetPlayerStyle={handleSetPlayerStyle}
              onSetGlassOpacity={handleSetGlassOpacity}
              onSetGlassBlur={handleSetGlassBlur}
              onSetAmbientGlow={handleSetAmbientGlow}
              onSetAmbientParticles={handleSetAmbientParticles}
              onClearCache={async () => {
                await invoke('clear_library_cache').catch(() => {});
                localStorage.removeItem('sakura_library_cache');
                setTracks([]);
                setActiveTrack(null);
              }}
            />
          )}

        </div>

        {/* ========================================================= */}
        {/* REPRODUCTOR TEMÁTICO (DOCK FLOTANTE / BARRA FIJA)         */}
        {/* ========================================================= */}
        <PlayerBar
          playerStyle={playerStyle}
          isWWM={isWWM}
          accentText={worldStyle.accentText}
          tagText={worldStyle.tagText}
          playButtonGradient={worldStyle.playButtonGradient}
          glowColor={worldStyle.glowColor}
          seekAccent={worldStyle.seekAccent}
          activeTrack={activeTrack}
          favorites={favorites}
          isPlaying={isPlaying}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          getCoverSrc={getCoverSrc}
          formatTime={formatTime}
          onTogglePlay={togglePlay}
          onNext={() => handleNextTrack()}
          onPrevious={handlePreviousTrack}
          onSeek={handleSeek}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          onCycleRepeat={() => {
            if (repeatMode === 'off') setRepeatMode('all');
            else if (repeatMode === 'all') setRepeatMode('one');
            else setRepeatMode('off');
          }}
          onToggleMute={() => setIsMuted(!isMuted)}
          onVolumeChange={(newVol: number) => {
            setVolume(newVol);
            if (isMuted) setIsMuted(false);
          }}
          onOpenEdit={(track: ScannedTrack) => openEditModal(track)}
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
          getCoverSrc={getCoverSrc}
          onClose={() => setEditingTrack(null)}
          onPaste={handlePaste}
          onSetEditTab={setEditTab}
          onSearchCatalog={() => searchCatalog()}
          onApplyCandidate={applyCandidate}
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
  );
}