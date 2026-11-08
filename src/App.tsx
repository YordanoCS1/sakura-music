import { useState, useEffect, useRef, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { convertFileSrc } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { listen } from '@tauri-apps/api/event';
import { 
  Home, 
  Search, 
  Library, 
  DownloadCloud, 
  Settings, 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Cpu,
  FolderOpen,
  RotateCw,
  Heart,
  Music2,
  Disc3,
  Shuffle,
  Repeat,
  Repeat1,
  LayoutGrid,
  List,
  Sparkles,
  Loader2,
  ArrowDownToLine,
  AlertCircle,
  Pencil,
  ImagePlus,
  Save,
  X,
  Trash2,
  Globe,
  Undo2,
  Check,
  Tags,
  CheckSquare,
  Square,
  Layers,
  ListMusic,
  FolderCheck,
  Palette,
  Sliders,
  Wind
} from 'lucide-react';

export interface ScannedTrack {
  id: string;
  path: string;
  title: string;
  artist: string;
  album: string;
  album_artist?: string | null;
  track_number?: number | null;
  duration: number;
  duration_str: string;
  format: string;
  cover_url: string | null;
  year: number | null;
  genre: string | null;
  file_size: number;
}

export interface PlaylistInfo {
  title: string;
  uploader: string;
  track_count: number;
  items: OnlineSearchResult[];
}

export interface CatalogCandidate {
  source: 'itunes' | 'deezer';
  title: string;
  artist: string;
  album: string;
  album_artist?: string;
  year?: string;
  genre?: string;
  track_number?: string;
  cover_url?: string;
}

export interface OnlineSearchResult {
  id: string;
  title: string;
  uploader: string;
  duration: string;
  thumbnail: string | null;
  url: string;
}

export interface DownloaderStatus {
  ytdlp_available: boolean;
  ffmpeg_available: boolean;
  ytdlp_path: string | null;
  ffmpeg_path: string | null;
}

export interface DownloadProgressEvent {
  id: string;
  progress: number;
  speed: string;
  eta: string;
  status: string;
  file_path: string | null;
}

interface AppInfo {
  engine: string;
  rust_version: string;
  memory_usage: string;
  tracks_loaded: number;
}

export interface DownloadItem {
  id: string;
  title: string;
  artist: string;
  url: string;
  progress: number;
  speed: string;
  eta: string;
  status: string;
  format: string;
  size: string;
  thumbnail?: string | null;
}

type ThemeMode = 'sakura' | 'cyber' | 'amber' | 'emerald';
export type ThemeWorld = 'sakura_zen' | 'where_winds_meet';
export type PlayerStyle = 'floating' | 'fixed';
type ViewMode = 'grid' | 'table';

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'queue' | 'settings'>('library');
  const [theme, setTheme] = useState<ThemeMode>('sakura');
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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
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
  const [onlineQuery, setOnlineQuery] = useState('');
  const [onlineResults, setOnlineResults] = useState<OnlineSearchResult[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineSearchError, setOnlineSearchError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [downloadFormat, setDownloadFormat] = useState('FLAC');

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

    // Escuchar eventos en vivo emitidos desde Tokio / Rust
    const unlistenPromise = listen<DownloadProgressEvent>('download-progress', (event) => {
      const payload = event.payload;
      setDownloads(prev => {
        return prev.map(item => {
          if (item.id === payload.id) {
            return {
              ...item,
              progress: payload.progress,
              speed: payload.speed,
              eta: payload.eta,
              status: payload.status,
            };
          }
          return item;
        });
      });

      // Si terminó de descargar y convertir, re-escanear para actualizar biblioteca en vivo
      if (payload.status === 'completado') {
        const folder = localStorage.getItem('sakura_current_folder');
        if (folder) {
          invoke<ScannedTrack[]>('scan_library', { folderPath: folder })
            .then(scanned => setTracks(scanned))
            .catch(e => console.error("Error al auto-actualizar biblioteca:", e));
        }
      }
    });

    return () => {
      unlistenPromise.then(unlisten => unlisten());
    };
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

  // Pista siguiente
  const handleNextTrack = () => {
    if (filteredTracks.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * filteredTracks.length);
      handlePlayTrack(filteredTracks[randomIndex]);
      return;
    }
    const currentIndex = filteredTracks.findIndex(t => t.id === activeTrack?.id);
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
    } else if (repeatMode === 'all' || repeatMode === 'off') {
      handleNextTrack();
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

  const handleDownloadSelectedPlaylist = async () => {
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

  // Iniciar descarga asíncrona real en segundo plano
  const triggerDownload = async (title: string, artist: string, url: string, thumbnail?: string | null, customFolder?: string) => {
    const jobId = `dl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newJob: DownloadItem = {
      id: jobId,
      title,
      artist,
      url,
      progress: 0,
      speed: 'Conectando...',
      eta: '--:--',
      status: 'en cola',
      format: downloadFormat,
      size: 'Calculando...',
      thumbnail,
    };

    setDownloads(prev => [newJob, ...prev]);

    const destFolder = customFolder || currentFolder || defaultMusicDir || '.';
    try {
      await invoke('start_download', {
        jobId,
        url,
        format: downloadFormat,
        outputDir: destFolder,
      });
    } catch (err) {
      console.error("Error al iniciar descarga:", err);
      setDownloads(prev => prev.map(d => d.id === jobId ? { ...d, status: `error: ${String(err)}` } : d));
    }
  };

  // Selección múltiple y Batch Editor
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchArtist, setBatchArtist] = useState('');
  const [applyBatchArtist, setApplyBatchArtist] = useState(false);
  const [batchAlbum, setBatchAlbum] = useState('');
  const [applyBatchAlbum, setApplyBatchAlbum] = useState(false);
  const [batchAlbumArtist, setBatchAlbumArtist] = useState('');
  const [applyBatchAlbumArtist, setApplyBatchAlbumArtist] = useState(false);
  const [batchYear, setBatchYear] = useState('');
  const [applyBatchYear, setApplyBatchYear] = useState(false);
  const [batchGenre, setBatchGenre] = useState('');
  const [applyBatchGenre, setApplyBatchGenre] = useState(false);
  const [batchCoverPath, setBatchCoverPath] = useState<string | null>(null);
  const [batchCoverPreviewUrl, setBatchCoverPreviewUrl] = useState<string | null>(null);
  const [applyBatchCover, setApplyBatchCover] = useState(false);
  const [batchRemoveCover, setBatchRemoveCover] = useState(false);
  const [isSavingBatch, setIsSavingBatch] = useState(false);
  const [batchFeedback, setBatchFeedback] = useState<string | null>(null);

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

  const openBatchModal = () => {
    if (selectedTrackIds.size === 0) return;
    const selected = tracks.filter(t => selectedTrackIds.has(t.id));
    if (selected.length === 0) return;

    const first = selected[0];
    const commonArtist = selected.every(t => t.artist === first.artist) ? first.artist : '';
    const commonAlbum = selected.every(t => t.album === first.album) ? first.album : '';
    const commonAlbumArtist = selected.every(t => (t.album_artist || t.artist) === (first.album_artist || first.artist)) 
      ? (first.album_artist || first.artist) : '';
    const commonYear = selected.every(t => t.year === first.year && t.year !== null) ? String(first.year) : '';
    const commonGenre = selected.every(t => t.genre === first.genre && t.genre !== null) ? (first.genre || '') : '';

    setBatchArtist(commonArtist);
    setApplyBatchArtist(!!commonArtist);
    setBatchAlbum(commonAlbum);
    setApplyBatchAlbum(!!commonAlbum);
    setBatchAlbumArtist(commonAlbumArtist);
    setApplyBatchAlbumArtist(!!commonAlbumArtist);
    setBatchYear(commonYear);
    setApplyBatchYear(!!commonYear);
    setBatchGenre(commonGenre);
    setApplyBatchGenre(!!commonGenre);
    setBatchCoverPath(null);
    setBatchCoverPreviewUrl(null);
    setApplyBatchCover(false);
    setBatchRemoveCover(false);
    setBatchFeedback(null);
    setIsBatchModalOpen(true);
  };

  const pickBatchCoverImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Imágenes',
          extensions: ['jpg', 'jpeg', 'png', 'webp']
        }]
      });
      if (selected && typeof selected === 'string') {
        setBatchCoverPath(selected);
        setBatchCoverPreviewUrl(convertFileSrc(selected));
        setApplyBatchCover(true);
        setBatchRemoveCover(false);
      }
    } catch (e) {
      console.error("Error al seleccionar imagen para lote:", e);
    }
  };

  const handleSaveBatchMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedTracks = tracks.filter(t => selectedTrackIds.has(t.id));
    if (selectedTracks.length === 0) return;

    setIsSavingBatch(true);
    setBatchFeedback(null);

    try {
      const paths = selectedTracks.map(t => t.path);
      const yearNum = (applyBatchYear && batchYear.trim()) ? parseInt(batchYear.trim(), 10) : null;

      const updatedTracks = await invoke<ScannedTrack[]>('update_batch_metadata', {
        paths,
        artist: applyBatchArtist ? (batchArtist.trim() || null) : null,
        album: applyBatchAlbum ? (batchAlbum.trim() || null) : null,
        albumArtist: applyBatchAlbumArtist ? (batchAlbumArtist.trim() || null) : null,
        year: applyBatchYear && !isNaN(yearNum || NaN) ? yearNum : null,
        genre: applyBatchGenre ? (batchGenre.trim() || null) : null,
        coverPath: applyBatchCover ? (batchRemoveCover ? null : batchCoverPath) : null,
        removeCover: applyBatchCover ? batchRemoveCover : false,
      });

      // Actualizar biblioteca local
      const updatedMap = new Map(updatedTracks.map(t => [t.id, t]));
      setTracks(prev => prev.map(t => updatedMap.get(t.id) || t));

      setBatchFeedback(`✓ ¡${updatedTracks.length} canciones actualizadas exitosamente!`);
      setTimeout(() => {
        setIsBatchModalOpen(false);
        setIsSavingBatch(false);
        setBatchFeedback(null);
        clearTrackSelection();
      }, 1200);
    } catch (err) {
      console.error("Error en batch metadata:", err);
      setBatchFeedback(`Error al guardar lote: ${String(err)}`);
      setIsSavingBatch(false);
    }
  };

  // Estado y funciones del Editor de Metadatos Pro & Catálogo
  const [editingTrack, setEditingTrack] = useState<ScannedTrack | null>(null);
  const [editTab, setEditTab] = useState<'tags' | 'catalog'>('tags');
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editAlbum, setEditAlbum] = useState('');
  const [editAlbumArtist, setEditAlbumArtist] = useState('');
  const [editTrackNumber, setEditTrackNumber] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editGenre, setEditGenre] = useState('');
  const [editCoverPath, setEditCoverPath] = useState<string | null>(null);
  const [editCoverPreviewUrl, setEditCoverPreviewUrl] = useState<string | null>(null);
  const [removeCover, setRemoveCover] = useState(false);
  const [isSavingMetadata, setIsSavingMetadata] = useState(false);
  const [metadataFeedback, setMetadataFeedback] = useState<string | null>(null);

  // Catálogo Online (Apple Music / iTunes / Deezer)
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogSource, setCatalogSource] = useState<'itunes' | 'deezer'>('itunes');
  const [catalogResults, setCatalogResults] = useState<CatalogCandidate[]>([]);
  const [isSearchingCatalog, setIsSearchingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const openEditModal = (track: ScannedTrack, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingTrack(track);
    setEditTab('tags');
    setEditTitle(track.title);
    setEditArtist(track.artist);
    setEditAlbum(track.album);
    setEditAlbumArtist(track.album_artist || track.artist);
    setEditTrackNumber(track.track_number ? track.track_number.toString() : '');
    setEditYear(track.year ? track.year.toString() : '');
    setEditGenre(track.genre || '');
    setEditCoverPath(null);
    setEditCoverPreviewUrl(null);
    setRemoveCover(false);
    setMetadataFeedback(null);
    
    // Sugerencia de búsqueda de catálogo basada en artista y título
    const cleanArtist = track.artist !== "Artista Desconocido" && track.artist !== "Desconocido" ? track.artist : "";
    const cleanTitle = track.title;
    const suggestedQuery = `${cleanArtist} ${cleanTitle}`.trim();
    setCatalogQuery(suggestedQuery);
    setCatalogResults([]);
    setCatalogError(null);
  };

  const resetField = (field: 'title' | 'artist' | 'album' | 'album_artist' | 'track_number' | 'year' | 'genre') => {
    if (!editingTrack) return;
    switch (field) {
      case 'title': setEditTitle(editingTrack.title); break;
      case 'artist': setEditArtist(editingTrack.artist); break;
      case 'album': setEditAlbum(editingTrack.album); break;
      case 'album_artist': setEditAlbumArtist(editingTrack.album_artist || editingTrack.artist); break;
      case 'track_number': setEditTrackNumber(editingTrack.track_number ? editingTrack.track_number.toString() : ''); break;
      case 'year': setEditYear(editingTrack.year ? editingTrack.year.toString() : ''); break;
      case 'genre': setEditGenre(editingTrack.genre || ''); break;
    }
  };

  const resetAllFields = () => {
    if (!editingTrack) return;
    setEditTitle(editingTrack.title);
    setEditArtist(editingTrack.artist);
    setEditAlbum(editingTrack.album);
    setEditAlbumArtist(editingTrack.album_artist || editingTrack.artist);
    setEditTrackNumber(editingTrack.track_number ? editingTrack.track_number.toString() : '');
    setEditYear(editingTrack.year ? editingTrack.year.toString() : '');
    setEditGenre(editingTrack.genre || '');
    setEditCoverPath(null);
    setEditCoverPreviewUrl(null);
    setRemoveCover(false);
  };

  const pickNewCoverImage = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Imágenes',
          extensions: ['jpg', 'jpeg', 'png', 'webp']
        }]
      });
      if (selected && typeof selected === 'string') {
        setEditCoverPath(selected);
        setEditCoverPreviewUrl(convertFileSrc(selected));
        setRemoveCover(false);
      }
    } catch (e) {
      console.error("Error al seleccionar imagen:", e);
    }
  };

  // Buscar en el catálogo público (Apple Music / iTunes API)
  const searchCatalog = async (customQuery?: string) => {
    const q = (customQuery !== undefined ? customQuery : catalogQuery).trim();
    if (!q) return;
    setIsSearchingCatalog(true);
    setCatalogError(null);
    try {
      if (catalogSource === 'itunes') {
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=song&limit=16`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();
        const items = data.results || [];
        const candidates: CatalogCandidate[] = items.map((it: any) => {
          const rawCover = it.artworkUrl100 || '';
          // Pedir versión de alta resolución (600x600 o 1000x1000)
          const hdCover = rawCover.replace('/100x100bb', '/600x600bb');
          const relYear = it.releaseDate ? it.releaseDate.substring(0, 4) : '';
          return {
            source: 'itunes',
            title: it.trackName || '',
            artist: it.artistName || '',
            album: it.collectionName || '',
            album_artist: it.artistName || '',
            year: relYear,
            genre: it.primaryGenreName || '',
            track_number: it.trackNumber ? it.trackNumber.toString() : '',
            cover_url: hdCover,
          };
        });
        setCatalogResults(candidates);
        if (candidates.length === 0) {
          setCatalogError("No se encontraron coincidencias en Apple Music / iTunes.");
        }
      } else {
        // Fallback o Deezer
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&entity=musicTrack&limit=16`;
        const res = await fetch(url);
        const data = await res.json();
        const items = data.results || [];
        const candidates: CatalogCandidate[] = items.map((it: any) => ({
          source: 'deezer',
          title: it.trackName || '',
          artist: it.artistName || '',
          album: it.collectionName || '',
          album_artist: it.artistName || '',
          year: it.releaseDate ? it.releaseDate.substring(0, 4) : '',
          genre: it.primaryGenreName || '',
          track_number: it.trackNumber ? it.trackNumber.toString() : '',
          cover_url: (it.artworkUrl100 || '').replace('/100x100bb', '/600x600bb'),
        }));
        setCatalogResults(candidates);
      }
    } catch (err) {
      console.error("Error al buscar en catálogo:", err);
      setCatalogError(`Error al conectar con el catálogo: ${String(err)}`);
    } finally {
      setIsSearchingCatalog(false);
    }
  };

  // Aplicar datos de un candidato del catálogo
  const applyCandidate = async (candidate: CatalogCandidate, applyCoverOnly: boolean = false) => {
    if (!applyCoverOnly) {
      if (candidate.title) setEditTitle(candidate.title);
      if (candidate.artist) setEditArtist(candidate.artist);
      if (candidate.album) setEditAlbum(candidate.album);
      if (candidate.album_artist) setEditAlbumArtist(candidate.album_artist);
      if (candidate.year) setEditYear(candidate.year);
      if (candidate.genre) setEditGenre(candidate.genre);
      if (candidate.track_number) setEditTrackNumber(candidate.track_number);
    }

    // Si tiene portada, descargar y guardar en archivo temporal en Rust
    if (candidate.cover_url) {
      try {
        setEditCoverPreviewUrl(candidate.cover_url);
        const res = await fetch(candidate.cover_url);
        const buffer = await res.arrayBuffer();
        const bytes = Array.from(new Uint8Array(buffer));
        const tempPath = await invoke<string>('save_temp_cover', { bytes });
        setEditCoverPath(tempPath);
        setRemoveCover(false);
      } catch (err) {
        console.warn("No se pudo descargar la portada HD del catálogo:", err);
      }
    }

    setEditTab('tags');
    setMetadataFeedback(applyCoverOnly 
      ? "✓ Portada de alta resolución importada con éxito." 
      : "✓ ¡Metadatos importados desde el catálogo oficial!");
    setTimeout(() => setMetadataFeedback(null), 3000);
  };

  // Pegar imagen del portapapeles
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          const buffer = await file.arrayBuffer();
          const bytes = Array.from(new Uint8Array(buffer));
          const tempPath = await invoke<string>('save_temp_cover', { bytes });
          setEditCoverPath(tempPath);
          setEditCoverPreviewUrl(URL.createObjectURL(file));
          setRemoveCover(false);
          setMetadataFeedback("✓ Imagen pegada desde el portapapeles.");
          setTimeout(() => setMetadataFeedback(null), 2500);
          break;
        }
      }
    }
  };

  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTrack) return;
    setIsSavingMetadata(true);
    setMetadataFeedback(null);

    try {
      const yearNum = editYear.trim() ? parseInt(editYear.trim(), 10) : null;
      const trackNum = editTrackNumber.trim() ? parseInt(editTrackNumber.trim(), 10) : null;
      
      const updated = await invoke<ScannedTrack>('update_track_metadata', {
        path: editingTrack.path,
        title: editTitle.trim(),
        artist: editArtist.trim(),
        album: editAlbum.trim(),
        albumArtist: editAlbumArtist.trim() || null,
        trackNumber: isNaN(trackNum || NaN) ? null : trackNum,
        year: isNaN(yearNum || NaN) ? null : yearNum,
        genre: editGenre.trim() || null,
        coverPath: removeCover ? null : editCoverPath,
        removeCover: removeCover,
      });

      // Actualizar pistas locales en memoria
      setTracks(prev => prev.map(t => t.id === updated.id ? updated : t));
      if (activeTrack?.id === updated.id) {
        setActiveTrack(updated);
      }

      setMetadataFeedback("✓ ¡Metadatos guardados con éxito en el archivo!");
      setTimeout(() => {
        setEditingTrack(null);
        setMetadataFeedback(null);
      }, 700);
    } catch (err) {
      console.error("Error al actualizar metadatos:", err);
      setMetadataFeedback(`Error al guardar: ${String(err)}`);
    } finally {
      setIsSavingMetadata(false);
    }
  };

  // Filtrado de canciones en memoria instantáneo (<1ms para miles de canciones)
  const filteredTracks = useMemo(() => {
    return tracks.filter(track => {
      const matchesQuery = 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.album.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesQuery) return false;

      if (filterChip === 'flac') return track.format.toUpperCase().includes('FLAC');
      if (filterChip === 'favorites') return favorites.includes(track.id);
      return true;
    });
  }, [tracks, searchQuery, filterChip, favorites]);

  // Configuración de temas dinámicos
  const themeGlows: Record<ThemeMode, { glow1: string; glow2: string; accent: string; badge: string; border: string }> = {
    sakura: {
      glow1: 'bg-pink-600/30',
      glow2: 'bg-purple-700/20',
      accent: 'from-pink-500 to-rose-400',
      badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
      border: 'border-pink-500/40',
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
    name: 'Where Winds Meet',
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
    sidebarTitle: 'Where Winds Meet',
    sidebarSubtitle: 'Wuxia · Jianghu Nature',
    logoIcon: '🎋',
  } : {
    id: 'sakura_zen',
    name: 'Sakura Zen',
    icon: '🌸',
    bgClass: 'bg-[#0a060e]',
    ambientGlow1: currentTheme.glow1,
    ambientGlow2: currentTheme.glow2,
    accentGradient: currentTheme.accent,
    accentText: 'text-pink-400',
    accentTextHover: 'hover:text-pink-300',
    accentBadge: currentTheme.badge,
    activeTabBg: 'bg-white/10 text-white shadow-sm border border-white/10',
    cardBorderHover: 'hover:border-pink-500/40',
    playButtonGradient: currentTheme.accent,
    seekAccent: 'accent-pink-500',
    tagText: 'text-pink-300',
    glowColor: 'shadow-pink-500/25',
    sidebarTitle: 'Sakura Music',
    sidebarSubtitle: 'Tauri 2 · Rust Core',
    logoIcon: '🌸',
  };

  return (
    <div 
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

      {/* Resplandor ambiental de fondo (Acelerado por GPU) */}
      {ambientGlow && (
        <>
          <div className={`absolute -top-32 -left-32 w-96 h-96 ${worldStyle.ambientGlow1} rounded-full blur-[110px] pointer-events-none transition-all duration-700 animate-pulse`}></div>
          <div className={`absolute -bottom-32 -right-32 w-96 h-96 ${worldStyle.ambientGlow2} rounded-full blur-[120px] pointer-events-none transition-all duration-700`}></div>
        </>
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
            <span className={`text-[10px] ${isWWM ? 'text-emerald-300/90' : 'text-pink-300/90'} font-medium tracking-wider uppercase`}>{worldStyle.sidebarSubtitle}</span>
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
              <span className={`ml-auto w-2 h-2 rounded-full ${isWWM ? 'bg-emerald-400' : 'bg-pink-400'} animate-ping`}></span>
            )}
          </button>

          <button 
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              activeTab === 'settings' 
                ? `${worldStyle.activeTabBg} font-semibold` 
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}>
            <Settings className={`w-4 h-4 ${isWWM ? 'text-emerald-400' : 'text-pink-400'}`} />
            <span>Ajustes</span>
          </button>
        </nav>

        {/* Conmutador rápido de Universo Zen / Wuxia */}
        <div className="mt-5 pt-3.5 border-t border-white/5">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2 px-1">
            <span>Mundo Visual:</span>
            <span className={`text-[10px] font-semibold ${isWWM ? 'text-emerald-300' : 'text-pink-300'}`}>
              {worldStyle.name}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-white/5 border border-white/5">
            <button
              onClick={() => handleSetThemeWorld('sakura_zen')}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                themeWorld === 'sakura_zen'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-400 text-white shadow-md'
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
              <span>Jianghu</span>
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
          <div className="flex items-center gap-2 text-[11px] text-pink-300 font-semibold mb-1">
            <Cpu className="w-3.5 h-3.5 text-pink-400" />
            <span>{appInfo?.engine ?? 'Tauri 2.0 + Rust Engine'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400">
            <span>Memoria:</span>
            <span className="text-white font-mono">{appInfo?.memory_usage ?? '~22 MB'}</span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-400 mt-1">
            <span>Compilador:</span>
            <span className="text-white font-mono">{appInfo?.rust_version ?? 'rustc 1.99.1'}</span>
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
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all"
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
              <Heart className="w-3 h-3 fill-current text-pink-400" />
              Favoritas ({favorites.length})
            </button>
          </div>
        </header>

        {/* Mensaje de escaneo / notificaciones */}
        {scanMessage && (
          <div className="bg-pink-500/10 border-b border-pink-500/20 px-6 py-2 flex items-center justify-between text-xs text-pink-300">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-pink-400 animate-spin" />
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
            <div>
              {/* Barra de herramientas de biblioteca */}
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                    <span>Biblioteca Local de Música</span>
                    {isScanning && <span className="text-[11px] font-normal text-pink-400 animate-pulse">Escaneando...</span>}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {currentFolder ? (
                      <span className="font-mono text-gray-300 truncate max-w-md inline-block">Carpeta: {currentFolder}</span>
                    ) : (
                      'Indexada en paralelo con Rayon + Lofty de Rust'
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={handleOpenFolderDialog}
                    disabled={isScanning}
                    className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 transition-all active:scale-95 disabled:opacity-50">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Seleccionar Carpeta</span>
                  </button>

                  {currentFolder && (
                    <button 
                      onClick={() => scanFolder(currentFolder)}
                      disabled={isScanning}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 transition-all active:scale-95 disabled:opacity-50"
                      title="Volver a escanear carpeta actual">
                      <RotateCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    </button>
                  )}

                  <div className="flex items-center p-0.5 rounded-xl bg-white/5 border border-white/5 ml-1">
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="Vista Cuadrícula">
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}
                      title="Vista Lista">
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de Selección Múltiple y Batch Editor */}
              {selectedTrackIds.size > 0 && (
                <div className="flex items-center justify-between p-3.5 mb-5 rounded-2xl bg-gradient-to-r from-pink-900/40 via-purple-900/40 to-pink-900/20 border border-pink-500/30 shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">
                        {selectedTrackIds.size} de {filteredTracks.length} canciones seleccionadas
                      </p>
                      <p className="text-[11px] text-pink-200/70">
                        Edición en lote: aplica álbum, artista, año, género o portada compartida
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button 
                      onClick={selectAllFilteredTracks}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-xs font-semibold border border-white/10 transition-all">
                      Seleccionar Todas
                    </button>
                    <button 
                      onClick={clearTrackSelection}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-gray-200 text-xs transition-all">
                      Deseleccionar
                    </button>
                    <button 
                      onClick={openBatchModal}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-pink-500/25 active:scale-95 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Editar en Lote ({selectedTrackIds.size})</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Estado vacío si no hay canciones */}
              {tracks.length === 0 && !isScanning && (
                <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border border-white/5 my-6">
                  <div className="w-16 h-16 rounded-3xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-3xl mb-4">
                    🌸
                  </div>
                  <h3 className="text-base font-bold text-white mb-1">Tu biblioteca aún está vacía</h3>
                  <p className="text-xs text-gray-400 max-w-sm mb-6">
                    Selecciona una carpeta en tu disco para que el motor en Rust extraiga títulos, artistas, carátulas y formatos de audio en milisegundos.
                  </p>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleOpenFolderDialog}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-xs font-bold shadow-xl shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all">
                      <FolderOpen className="w-4 h-4" />
                      <span>Escanear Carpeta de Música</span>
                    </button>
                    {defaultMusicDir && (
                      <button 
                        onClick={() => scanFolder(defaultMusicDir)}
                        className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all">
                        Escanear Música de Windows
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* VISTA CUADRÍCULA (GRID) */}
              {viewMode === 'grid' && tracks.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-24">
                  {filteredTracks.map((track) => {
                    const isCurrent = activeTrack?.id === track.id;
                    const isFav = favorites.includes(track.id);
                    const isSelected = selectedTrackIds.has(track.id);

                    return (
                      <div 
                        key={track.id}
                        onClick={() => handlePlayTrack(track)}
                        className={`group relative flex items-center gap-3.5 p-3 rounded-2xl glass-card transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'ring-2 ring-pink-500 bg-pink-500/15 shadow-lg'
                            : isCurrent 
                              ? 'ring-1 ring-pink-500/60 bg-white/10 shadow-lg' 
                              : 'hover:bg-white/5 hover:border-white/10'
                        }`}>
                        
                        {/* Checkbox de selección rápida para lote */}
                        <button
                          onClick={(e) => toggleSelectTrack(track.id, e)}
                          className={`absolute top-2.5 left-2.5 z-10 p-1 rounded-lg backdrop-blur-md transition-all ${
                            isSelected 
                              ? 'bg-pink-500 text-white shadow-md' 
                              : 'bg-black/60 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100'
                          }`}
                          title={isSelected ? "Deseleccionar" : "Seleccionar para edición en lote"}>
                          {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                        </button>

                        {/* Portada con fallback elegante */}
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md">
                          {track.cover_url ? (
                            <img 
                              src={getCoverSrc(track.cover_url)} 
                              alt={track.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-purple-900/40 to-pink-900/40 flex items-center justify-center">
                              <Music2 className="w-6 h-6 text-pink-400/80" />
                            </div>
                          )}
                          <div className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity ${isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            {isCurrent && isPlaying ? (
                              <Pause className="w-5 h-5 text-pink-400 fill-current" />
                            ) : (
                              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-xs font-semibold truncate transition-colors ${isCurrent ? 'text-pink-300' : 'text-white group-hover:text-pink-200'}`}>
                            {track.title}
                          </h3>
                          <p className="text-[11px] text-gray-400 truncate">
                            {track.artist} {track.album ? `· ${track.album}` : ''}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/10 text-pink-300 font-mono font-medium">
                              {track.format}
                            </span>
                            {track.year && (
                              <span className="text-[10px] text-gray-500 font-mono">
                                {track.year}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Duración, Editar y Favorito */}
                        <div className="flex flex-col items-end gap-1 text-[11px] text-gray-400 font-mono pr-1">
                          <span>{track.duration_str}</span>
                          <div className="flex items-center gap-0.5">
                            <button 
                              onClick={(e) => openEditModal(track, e)}
                              className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                              title="Editar metadatos">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => toggleFavorite(track.id, e)}
                              className="text-gray-500 hover:text-pink-400 transition-colors p-1"
                              title={isFav ? "Quitar de favoritas" : "Marcar como favorita"}>
                              <Heart className={`w-3.5 h-3.5 ${isFav ? 'text-pink-400 fill-current' : ''}`} />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              )}

              {/* VISTA TABLA (LIST) */}
              {viewMode === 'table' && tracks.length > 0 && (
                <div className="glass-card rounded-2xl overflow-hidden border border-white/5 mb-24">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-white/5 text-[11px] uppercase tracking-wider text-gray-400 border-b border-white/5">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <button 
                            onClick={selectedTrackIds.size === filteredTracks.length ? clearTrackSelection : selectAllFilteredTracks}
                            className="text-gray-400 hover:text-white transition-colors"
                            title={selectedTrackIds.size === filteredTracks.length ? "Deseleccionar todas" : "Seleccionar todas"}>
                            {selectedTrackIds.size > 0 && selectedTrackIds.size === filteredTracks.length ? (
                              <CheckSquare className="w-3.5 h-3.5 text-pink-400" />
                            ) : (
                              <Square className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </th>
                        <th className="py-2.5 px-4 w-12 text-center">#</th>
                        <th className="py-2.5 px-4">Título</th>
                        <th className="py-2.5 px-4">Artista</th>
                        <th className="py-2.5 px-4">Álbum</th>
                        <th className="py-2.5 px-4 w-20 text-center">Formato</th>
                        <th className="py-2.5 px-4 w-20 text-right">Duración</th>
                        <th className="py-2.5 px-4 w-20 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredTracks.map((track, idx) => {
                        const isCurrent = activeTrack?.id === track.id;
                        const isSelected = selectedTrackIds.has(track.id);
                        return (
                          <tr 
                            key={track.id}
                            onClick={() => handlePlayTrack(track)}
                            className={`cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-pink-500/20 text-pink-200'
                                : isCurrent 
                                  ? 'bg-pink-500/10 text-pink-300' 
                                  : 'hover:bg-white/5 text-gray-300'
                            }`}>
                            <td className="py-2 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <button 
                                onClick={(e) => toggleSelectTrack(track.id, e)}
                                className={`p-1 rounded-md transition-colors ${
                                  isSelected ? 'text-pink-400' : 'text-gray-600 hover:text-gray-400'
                                }`}>
                                {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="py-2 px-4 text-center text-gray-500 font-mono">
                              {isCurrent && isPlaying ? '▶' : idx + 1}
                            </td>
                            <td className="py-2 px-4 font-semibold text-white truncate max-w-xs">
                              {track.title}
                            </td>
                            <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                              {track.artist}
                            </td>
                            <td className="py-2 px-4 truncate max-w-[160px] text-gray-400">
                              {track.album}
                            </td>
                            <td className="py-2 px-4 text-center font-mono text-[10px] text-pink-300">
                              {track.format}
                            </td>
                            <td className="py-2 px-4 text-right font-mono text-gray-400">
                              {track.duration_str}
                            </td>
                            <td className="py-2 px-4 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); openEditModal(track, e); }}
                                  className="text-gray-500 hover:text-cyan-400 transition-colors p-1"
                                  title="Editar metadatos">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={(e) => toggleFavorite(track.id, e)}
                                  className="text-gray-500 hover:text-pink-400 transition-colors p-1"
                                  title={favorites.includes(track.id) ? "Quitar de favoritas" : "Marcar como favorita"}>
                                  <Heart className={`w-3.5 h-3.5 ${favorites.includes(track.id) ? 'text-pink-400 fill-current' : ''}`} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* TAB: INICIO (HOME) */}
          {activeTab === 'home' && (
            <div className="space-y-6 mb-24">
              
              {/* Hero Banner */}
              <div className="relative rounded-3xl overflow-hidden glass-card p-8 border border-white/10 bg-gradient-to-r from-pink-900/20 via-purple-900/20 to-transparent">
                <div className="max-w-xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-[11px] font-semibold mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Experiencia Hi-Res Hi-Fi</span>
                  </div>
                  <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                    Sakura Music 2.0
                  </h2>
                  <p className="text-xs text-gray-300 mb-6 leading-relaxed">
                    Reproducción sin pérdida impulsada por el núcleo de Rust, procesamiento multihilo y aceleración por GPU.
                  </p>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => {
                        if (tracks.length > 0) handlePlayTrack(tracks[0]);
                        else handleOpenFolderDialog();
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-95 transition-all">
                      <Play className="w-4 h-4 fill-current" />
                      <span>{tracks.length > 0 ? 'Reproducir Aleatorio' : 'Escanear Biblioteca'}</span>
                    </button>
                    <button 
                      onClick={() => setActiveTab('library')}
                      className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all">
                      Ver Biblioteca ({tracks.length})
                    </button>
                  </div>
                </div>
              </div>

              {/* Estadísticas Rápidas */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                  <div className="text-[11px] text-gray-400 mb-1">Total Canciones</div>
                  <div className="text-xl font-bold text-white font-mono">{tracks.length}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                  <div className="text-[11px] text-gray-400 mb-1">Pistas FLAC Lossless</div>
                  <div className="text-xl font-bold text-pink-400 font-mono">
                    {tracks.filter(t => t.format.toUpperCase().includes('FLAC')).length}
                  </div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                  <div className="text-[11px] text-gray-400 mb-1">Favoritas</div>
                  <div className="text-xl font-bold text-rose-400 font-mono">{favorites.length}</div>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                  <div className="text-[11px] text-gray-400 mb-1">Descargas en Cola</div>
                  <div className="text-xl font-bold text-amber-400 font-mono">{downloads.length}</div>
                </div>
              </div>

              {/* Pistas Destacadas */}
              <div>
                <h3 className="text-sm font-bold text-white mb-3">Canciones Recientes</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {tracks.slice(0, 6).map(track => (
                    <div 
                      key={track.id}
                      onClick={() => handlePlayTrack(track)}
                      className="flex items-center gap-3 p-2.5 rounded-xl glass-card hover:bg-white/5 cursor-pointer border border-white/5">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                        {track.cover_url ? (
                          <img src={getCoverSrc(track.cover_url)} alt={track.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-purple-900/30">
                            <Music2 className="w-4 h-4 text-pink-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{track.title}</div>
                        <div className="text-[10px] text-gray-400 truncate">{track.artist}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB: BUSCAR Y DESCARGAR */}
          {activeTab === 'search' && (
            <div className="space-y-6 max-w-3xl mb-24">
              
              {/* Encabezado y Estado de Herramientas */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-base font-bold text-white mb-1">Buscador y Descargas de Música</h2>
                  <p className="text-xs text-gray-400">
                    Búsqueda instantánea en YouTube o descarga por enlace directo en FLAC / MP3 320k.
                  </p>
                </div>

                {/* Badges de estado de herramientas */}
                <div className="flex items-center gap-2">
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
                    toolsStatus?.ytdlp_available 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${toolsStatus?.ytdlp_available ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                    <span>yt-dlp: {toolsStatus?.ytdlp_available ? 'Listo' : 'No encontrado'}</span>
                  </div>

                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border ${
                    toolsStatus?.ffmpeg_available 
                      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${toolsStatus?.ffmpeg_available ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                    <span>ffmpeg: {toolsStatus?.ffmpeg_available ? 'Listo' : 'No encontrado'}</span>
                  </div>
                </div>
              </div>

              {/* Barra de Búsqueda y Opciones */}
              <div className="glass-card p-5 rounded-3xl border border-white/10 space-y-4">
                <form onSubmit={handleOnlineSearch}>
                  <label className="text-[11px] text-gray-400 font-medium block mb-2">
                    Escribe el nombre de la canción/artista o pega un enlace de video o Playlist / Álbum de YouTube:
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input 
                        type="text" 
                        value={onlineQuery}
                        onChange={(e) => setOnlineQuery(e.target.value)}
                        placeholder="Ej: LiSA Gurenge, YOASOBI Idol, o https://youtube.com/playlist?list=..."
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/30"
                      />
                      <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSearchingOnline || isResolvingPlaylist || !onlineQuery.trim()}
                      className="px-5 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2">
                      {isSearchingOnline || isResolvingPlaylist ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{isResolvingPlaylist ? 'Cargando Lista...' : 'Buscando...'}</span>
                        </>
                      ) : (
                        <span>
                          {onlineQuery.includes('list=') || onlineQuery.includes('playlist') || onlineQuery.includes('/album/')
                            ? 'Cargar Playlist'
                            : onlineQuery.startsWith('http') 
                              ? 'Descargar Enlace' 
                              : 'Buscar'}
                        </span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Formato deseado */}
                <div className="flex items-center gap-4 text-xs text-gray-300 pt-1">
                  <span className="text-[11px] text-gray-400">Calidad de audio:</span>
                  <div className="flex gap-2">
                    {[
                      { id: 'OPUS', label: 'Opus (Original 129 kbps)' },
                      { id: 'M4A', label: 'm4a · AAC (192 kbps)' },
                      { id: 'MP3', label: 'mp3 (320 kbps)' },
                      { id: 'FLAC', label: 'FLAC (Sin pérdida)' }
                    ].map(fmt => (
                      <button 
                        key={fmt.id}
                        type="button"
                        onClick={() => setDownloadFormat(fmt.id)}
                        className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                          downloadFormat === fmt.id 
                            ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40 font-semibold shadow-sm' 
                            : 'bg-white/5 text-gray-400 hover:text-white'
                        }`}>
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Mensaje de error si la búsqueda falla */}
              {onlineSearchError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{onlineSearchError}</span>
                </div>
              )}

              {/* Mensaje de error si falla la resolución de playlist */}
              {playlistSearchError && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{playlistSearchError}</span>
                </div>
              )}

              {/* Estado de carga de playlist */}
              {isResolvingPlaylist && (
                <div className="flex flex-col items-center justify-center p-8 rounded-3xl glass-card border border-pink-500/20 text-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-pink-400 animate-spin mb-3" />
                  <h4 className="text-sm font-bold text-white mb-1">Extrayendo pistas de la Playlist / Álbum...</h4>
                  <p className="text-xs text-gray-400">Consultando los metadatos de todos los videos de la lista con yt-dlp</p>
                </div>
              )}

              {/* Panel de Álbum / Playlist Completa */}
              {playlistInfo && (
                <div className="glass-card rounded-3xl border border-pink-500/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-3">
                  {/* Header de la playlist */}
                  <div className="p-6 bg-gradient-to-r from-pink-900/40 via-purple-900/30 to-pink-900/20 border-b border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-300 flex-shrink-0 shadow-lg">
                          <ListMusic className="w-7 h-7" />
                        </div>
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-[10px] font-semibold mb-1">
                            <span>Álbum / Playlist Completa</span>
                          </div>
                          <h3 className="text-lg font-black text-white tracking-tight">
                            {playlistInfo.title}
                          </h3>
                          <p className="text-xs text-gray-300">
                            Canal: <span className="font-semibold text-white">{playlistInfo.uploader || 'YouTube'}</span> · {playlistInfo.track_count} pistas totales
                          </p>
                        </div>
                      </div>

                      <button 
                        onClick={() => setPlaylistInfo(null)}
                        className="self-start sm:self-center p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-colors"
                        title="Cerrar vista de playlist">
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Acciones y carpeta */}
                    <div className="flex items-center justify-between flex-wrap gap-3 mt-5 pt-4 border-t border-white/10">
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 select-none">
                        <input 
                          type="checkbox" 
                          checked={createAlbumFolder} 
                          onChange={(e) => setCreateAlbumFolder(e.target.checked)}
                          className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0 focus:ring-offset-0"
                        />
                        <FolderCheck className="w-4 h-4 text-pink-400" />
                        <span>Organizar en subcarpeta dedicada</span>
                      </label>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={selectedPlaylistItems.size === playlistInfo.items.length ? clearAllPlaylistItems : selectAllPlaylistItems}
                          className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold border border-white/10 transition-all">
                          {selectedPlaylistItems.size === playlistInfo.items.length ? 'Deseleccionar Todas' : 'Seleccionar Todas'}
                        </button>

                        <button 
                          onClick={handleDownloadSelectedPlaylist}
                          disabled={selectedPlaylistItems.size === 0}
                          className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-400 text-white text-xs font-bold shadow-lg shadow-pink-500/25 hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all">
                          <ArrowDownToLine className="w-4 h-4" />
                          <span>Descargar {selectedPlaylistItems.size} Canciones</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Lista de canciones de la playlist */}
                  <div className="max-h-96 overflow-y-auto custom-scroll divide-y divide-white/5 p-2">
                    {playlistInfo.items.map((it, idx) => {
                      const isSelected = selectedPlaylistItems.has(it.id);
                      return (
                        <div 
                          key={it.id}
                          onClick={() => toggleSelectPlaylistItem(it.id)}
                          className={`flex items-center justify-between gap-3 p-2.5 rounded-xl transition-colors cursor-pointer ${
                            isSelected ? 'bg-pink-500/10' : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                          }`}>
                          <div className="flex items-center gap-3 min-w-0">
                            <button 
                              onClick={(e) => { e.stopPropagation(); toggleSelectPlaylistItem(it.id); }}
                              className={`p-1 rounded transition-colors ${isSelected ? 'text-pink-400' : 'text-gray-500'}`}>
                              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                            </button>
                            
                            <span className="w-6 text-center font-mono text-[11px] text-gray-500">
                              {idx + 1}
                            </span>

                            <div className="w-12 h-9 rounded-lg overflow-hidden bg-white/5 flex-shrink-0">
                              {it.thumbnail ? (
                                <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-purple-900/20">
                                  <Music2 className="w-3.5 h-3.5 text-pink-400" />
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                {it.title}
                              </h4>
                              <p className="text-[10px] text-gray-400 truncate">
                                {it.uploader}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11px] font-mono text-gray-400">{it.duration}</span>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerDownload(it.title, it.uploader, it.url, it.thumbnail);
                              }}
                              className="p-1.5 rounded-lg bg-white/5 hover:bg-pink-500/20 text-gray-400 hover:text-pink-300 transition-colors"
                              title="Descargar solo esta pista">
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Resultados de Búsqueda Online en Vivo */}
              {onlineResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Resultados en YouTube ({onlineResults.length})
                  </h3>
                  
                  <div className="space-y-2.5">
                    {onlineResults.map((item) => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between gap-4 p-3.5 rounded-2xl glass-card hover:bg-white/5 border border-white/5 transition-all group">
                        
                        {/* Miniatura */}
                        <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md">
                          {item.thumbnail ? (
                            <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          ) : (
                            <div className="w-full h-full bg-purple-900/30 flex items-center justify-center">
                              <Music2 className="w-4 h-4 text-pink-400" />
                            </div>
                          )}
                        </div>

                        {/* Título y canal */}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-pink-300 transition-colors">
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span className="truncate">{item.uploader}</span>
                            <span>•</span>
                            <span className="font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.duration}</span>
                          </div>
                        </div>

                        {/* Botón de Descarga */}
                        <button 
                          onClick={() => triggerDownload(item.title, item.uploader, item.url, item.thumbnail)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md shadow-pink-500/20 active:scale-95 transition-all">
                          <ArrowDownToLine className="w-3.5 h-3.5" />
                          <span>Descargar</span>
                        </button>

                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tendencias Sakura / Sugerencias */}
              {onlineResults.length === 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Tendencias Populares</h3>
                  <div className="space-y-2">
                    {[
                      { title: 'LiSA - Gurenge (紅蓮華)', genre: 'Demon Slayer OP', duration: '3:58' },
                      { title: 'YOASOBI - Idol (アイドル)', genre: 'Oshi no Ko OP', duration: '3:33' },
                      { title: 'Kenshi Yonezu - KICK BACK', genre: 'Chainsaw Man OP', duration: '3:13' },
                      { title: 'Ado - Usseewa (うっせぇわ)', genre: 'J-Pop / Rock', duration: '3:24' }
                    ].map((sug, i) => (
                      <div 
                        key={i} 
                        className="flex items-center justify-between p-3 rounded-2xl glass-card hover:bg-white/5 border border-white/5">
                        <div>
                          <div className="text-xs font-semibold text-white">{sug.title}</div>
                          <div className="text-[10px] text-gray-400">{sug.genre} · {sug.duration}</div>
                        </div>
                        <button 
                          onClick={() => {
                            setOnlineQuery(sug.title);
                            invoke<OnlineSearchResult[]>('search_online', { query: sug.title })
                              .then(res => setOnlineResults(res))
                              .catch(err => console.error(err));
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-pink-300 hover:text-white text-[11px] font-medium border border-white/5 transition-colors">
                          Buscar esta canción
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB: COLA DE DESCARGAS */}
          {activeTab === 'queue' && (
            <div className="space-y-4 max-w-3xl mb-24">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">Cola de Descargas</h2>
                  <p className="text-xs text-gray-400">Procesamiento multihilo asíncrono con Tokio + yt-dlp + ffmpeg</p>
                </div>
                {downloads.length > 0 && (
                  <button 
                    onClick={() => setDownloads([])}
                    className="text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 transition-colors">
                    Limpiar historial
                  </button>
                )}
              </div>

              {/* Estado vacío si no hay descargas */}
              {downloads.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-center glass-card rounded-3xl border border-white/5 my-4">
                  <DownloadCloud className="w-12 h-12 text-gray-500 mb-3" />
                  <h3 className="text-sm font-bold text-white mb-1">No hay descargas activas</h3>
                  <p className="text-xs text-gray-400 max-w-xs mb-4">
                    Ve a la pestaña Buscar y Descargar para buscar canciones en YouTube o pegar enlaces directos.
                  </p>
                  <button 
                    onClick={() => setActiveTab('search')}
                    className="px-4 py-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-lg shadow-pink-500/20 active:scale-95 transition-all">
                    Buscar Música
                  </button>
                </div>
              )}

              {/* Lista de Trabajos de Descarga */}
              <div className="space-y-3">
                {downloads.map((item) => {
                  const isDone = item.status === 'completado';
                  const isErr = item.status.includes('error');

                  return (
                    <div key={item.id} className="p-4 rounded-2xl glass-card border border-white/5 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-white truncate">{item.title}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                            <span className="truncate">{item.artist}</span>
                            <span>•</span>
                            <span className="font-mono text-pink-300">{item.format}</span>
                            {item.speed && item.speed !== '--' && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-cyan-300">{item.speed}</span>
                              </>
                            )}
                            {item.eta && item.eta !== '--' && item.eta !== '00:00' && (
                              <>
                                <span>•</span>
                                <span className="font-mono text-amber-300">ETA: {item.eta}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Badge de estado */}
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-semibold ${
                            isDone 
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                              : isErr 
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                          }`}>
                            {item.status}
                          </span>

                          {isDone && (
                            <button 
                              onClick={() => setActiveTab('library')}
                              className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[10px] font-semibold transition-colors">
                              Ver en Biblioteca
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Barra de progreso interactiva */}
                      <div className="space-y-1">
                        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              isDone ? 'bg-emerald-400' : isErr ? 'bg-rose-500' : 'bg-gradient-to-r from-pink-500 to-rose-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}>
                          </div>
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                          <span>{item.progress.toFixed(0)}%</span>
                          <span>{isDone ? 'Guardada en Biblioteca' : item.status}</span>
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TAB: AJUSTES */}
          {activeTab === 'settings' && (
            <div className="space-y-6 max-w-xl mb-24">
              <div>
                <h2 className="text-base font-bold text-white mb-1">Ajustes de Sakura Music</h2>
                <p className="text-xs text-gray-400">Personalización visual, diseño de interfaz y motor nativo</p>
              </div>

              {/* SECCIÓN: UNIVERSO VISUAL & ESTILO GLOBAL */}
              <div className="glass-card p-6 rounded-3xl border border-white/10 space-y-5">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-2xl bg-gradient-to-tr ${worldStyle.accentGradient} flex items-center justify-center text-white shadow-lg flex-shrink-0`}>
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Universo y Diseño Visual</h3>
                    <p className="text-xs text-gray-400">Elige la atmósfera cultural y estructural de la aplicación</p>
                  </div>
                </div>

                {/* Tarjetas interactivas de mundos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  
                  {/* Tarjeta 1: Sakura Zen */}
                  <div 
                    onClick={() => handleSetThemeWorld('sakura_zen')}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      themeWorld === 'sakura_zen'
                        ? 'border-pink-500 ring-2 ring-pink-500/50 bg-gradient-to-br from-pink-950/40 via-purple-950/30 to-black/60 shadow-xl'
                        : 'border-white/5 bg-white/[0.02] hover:border-pink-500/30 hover:bg-white/[0.04]'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🌸</span>
                      {themeWorld === 'sakura_zen' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500 text-white shadow-sm">
                          Activo
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Sakura Zen</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                      Estética japonesa, flor de cerezo, tonos violetas nocturnos, seda blanca y dock flotante.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-pink-500"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-purple-500"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-rose-300"></div>
                      <span className="text-[9px] text-gray-500 font-mono ml-1">Kioto Zen</span>
                    </div>
                  </div>

                  {/* Tarjeta 2: Where Winds Meet */}
                  <div 
                    onClick={() => handleSetThemeWorld('where_winds_meet')}
                    className={`relative p-4 rounded-2xl cursor-pointer transition-all border ${
                      themeWorld === 'where_winds_meet'
                        ? 'border-emerald-500 ring-2 ring-emerald-500/50 bg-gradient-to-br from-emerald-950/50 via-teal-950/40 to-black/60 shadow-xl'
                        : 'border-white/5 bg-white/[0.02] hover:border-emerald-500/30 hover:bg-white/[0.04]'
                    }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-2xl">🎋</span>
                      {themeWorld === 'where_winds_meet' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                          Activo
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white mb-1">Where Winds Meet</h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                      Wuxia ancestral, bosque de bambú brumoso, jade imperial y cálidas linternas de ámbar.
                    </p>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3.5 h-3.5 rounded-full bg-emerald-500"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-teal-400"></div>
                      <div className="w-3.5 h-3.5 rounded-full bg-amber-400"></div>
                      <span className="text-[9px] text-emerald-400 font-mono ml-1 flex items-center gap-1">
                        <Wind className="w-3 h-3" />
                        <span>Jianghu Nature</span>
                      </span>
                    </div>
                  </div>

                </div>

                {/* Estilo del Reproductor */}
                <div className="pt-3 border-t border-white/5">
                  <label className="text-xs font-semibold text-gray-300 block mb-2.5">
                    Diseño del Reproductor:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSetPlayerStyle('floating')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        playerStyle === 'floating'
                          ? `${worldStyle.accentBadge} shadow-md`
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Cápsula Flotante (Dock)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPlayerStyle('fixed')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        playerStyle === 'fixed'
                          ? `${worldStyle.accentBadge} shadow-md`
                          : 'bg-white/5 text-gray-400 border-white/10 hover:text-white'
                      }`}>
                      <Layers className="w-3.5 h-3.5" />
                      <span>Barra Fija Continua</span>
                    </button>
                  </div>
                </div>

                {/* Controles de Vidrio (Glassmorphism Sliders) */}
                <div className="pt-3 border-t border-white/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-gray-300">Ajuste de Efectos de Cristal</h4>
                      <p className="text-[10px] text-gray-500">Personaliza la opacidad y el desenfoque en tiempo real</p>
                    </div>
                    <Sliders className="w-4 h-4 text-gray-500" />
                  </div>

                  {/* Slider Opacidad */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 text-[11px]">Opacidad del Vidrio:</span>
                      <span className="text-white font-mono text-[11px]">{glassOpacity}%</span>
                    </div>
                    <input 
                      type="range"
                      min={15}
                      max={95}
                      value={glassOpacity}
                      onChange={(e) => handleSetGlassOpacity(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Slider Blur */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 text-[11px]">Desenfoque (Backdrop Blur):</span>
                      <span className="text-white font-mono text-[11px]">{glassBlur}px</span>
                    </div>
                    <input 
                      type="range"
                      min={0}
                      max={32}
                      value={glassBlur}
                      onChange={(e) => handleSetGlassBlur(parseInt(e.target.value, 10))}
                      className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Toggle Resplandor Ambiental */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <span className="text-xs font-semibold text-gray-300 block">Resplandor Ambiental Fluido</span>
                      <span className="text-[10px] text-gray-500">Auras de color en las esquinas aceleradas por GPU</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSetAmbientGlow(!ambientGlow)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                        ambientGlow ? (isWWM ? 'bg-emerald-500' : 'bg-pink-500') : 'bg-white/10'
                      }`}>
                      <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        ambientGlow ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>

              </div>

              {/* Tarjeta de Especificaciones Técnicas */}
              <div className="glass-card p-5 rounded-2xl border border-white/5 space-y-3">
                <h3 className="text-xs font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-pink-400" />
                  <span>Motor Nativo Tauri 2 + Rust</span>
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400">Versión del Compilador:</span>
                    <span className="text-white font-mono">{appInfo?.rust_version ?? 'rustc 1.99.1'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400">Consumo de Memoria Base:</span>
                    <span className="text-emerald-400 font-mono font-semibold">{appInfo?.memory_usage ?? '~22 MB'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400">Escaneo Multihilo:</span>
                    <span className="text-pink-300 font-mono">Rayon Parallel Engine (Activo)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-gray-400">Decodificador de Tags Hi-Res:</span>
                    <span className="text-cyan-300 font-mono">Lofty 0.21 (Lossless FLAC/ALAC/ID3v2)</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-gray-400">Carpeta Activa:</span>
                    <span className="text-gray-300 font-mono text-[11px] truncate max-w-[200px]">{currentFolder ?? 'Ninguna'}</span>
                  </div>
                </div>
              </div>

              {/* Botón para reiniciar caché */}
              <div className="glass-card p-5 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Caché de Biblioteca</h4>
                  <p className="text-[11px] text-gray-400">Borra los índices locales de canciones y carátulas</p>
                </div>
                <button 
                  onClick={async () => {
                    await invoke('clear_library_cache').catch(() => {});
                    localStorage.removeItem('sakura_library_cache');
                    setTracks([]);
                    setActiveTrack(null);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-semibold transition-colors">
                  Limpiar Caché
                </button>
              </div>

            </div>
          )}

        </div>

        {/* ========================================================= */}
        {/* REPRODUCTOR TEMÁTICO (DOCK FLOTANTE / BARRA FIJA)         */}
        {/* ========================================================= */}
        <div className={
          playerStyle === 'floating'
            ? "absolute bottom-4 left-72 right-8 z-30 transition-all duration-300"
            : "absolute bottom-0 left-64 right-0 z-30 transition-all duration-300"
        }>
          <div className={
            playerStyle === 'floating'
              ? `glass-surface rounded-2xl p-3.5 flex items-center justify-between gap-6 shadow-2xl border ${isWWM ? 'border-emerald-500/20 shadow-emerald-950/40' : 'border-white/10 shadow-pink-950/30'}`
              : `glass-surface p-3.5 flex items-center justify-between gap-6 shadow-2xl border-t ${isWWM ? 'border-emerald-500/30 bg-[#07160f]/90' : 'border-white/10 bg-[#12071a]/90'}`
          }>
            
            {/* Información de Pista Actual */}
            <div className="flex items-center gap-3.5 min-w-[220px] max-w-xs">
              {activeTrack ? (
                <>
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 shadow-md border border-white/10">
                    {activeTrack.cover_url ? (
                      <img 
                        src={getCoverSrc(activeTrack.cover_url)} 
                        alt={activeTrack.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-purple-900/40 flex items-center justify-center">
                        <Music2 className={`w-5 h-5 ${worldStyle.accentText}`} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{activeTrack.title}</h4>
                    <p className="text-[11px] text-gray-400 truncate">{activeTrack.artist}</p>
                    <span className={`text-[9px] ${worldStyle.tagText} font-mono uppercase`}>{activeTrack.format} Lossless Direct</span>
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Disc3 className="w-4 h-4" />
                  <span>Sin pista seleccionada</span>
                </div>
              )}
            </div>

            {/* Controles de Reproducción y Scrubber Real */}
            <div className="flex-1 max-w-lg flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-4">
                
                {/* Shuffle */}
                <button 
                  onClick={() => setIsShuffle(!isShuffle)}
                  className={`p-1 transition-colors ${isShuffle ? worldStyle.accentText : 'text-gray-500 hover:text-white'}`}
                  title="Reproducción aleatoria">
                  <Shuffle className="w-3.5 h-3.5" />
                </button>

                {/* Anterior */}
                <button 
                  onClick={handlePreviousTrack}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Canción anterior">
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Play / Pausa */}
                <button 
                  onClick={togglePlay}
                  className={`w-9 h-9 rounded-full bg-gradient-to-tr ${worldStyle.playButtonGradient} hover:opacity-95 text-white flex items-center justify-center shadow-lg ${worldStyle.glowColor} transition-transform active:scale-95`}>
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>

                {/* Siguiente */}
                <button 
                  onClick={handleNextTrack}
                  className="text-gray-400 hover:text-white transition-colors p-1"
                  title="Siguiente canción">
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Repetir */}
                <button 
                  onClick={() => {
                    if (repeatMode === 'off') setRepeatMode('all');
                    else if (repeatMode === 'all') setRepeatMode('one');
                    else setRepeatMode('off');
                  }}
                  className={`p-1 transition-colors ${repeatMode !== 'off' ? worldStyle.accentText : 'text-gray-500 hover:text-white'}`}
                  title={`Modo de repetición: ${repeatMode}`}>
                  {repeatMode === 'one' ? <Repeat1 className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Barra de progreso real e interactiva */}
              <div className="w-full flex items-center gap-2.5 text-[10px] font-mono text-gray-400">
                <span className="w-8 text-right">{formatTime(currentTime)}</span>
                
                <div className="flex-1 flex items-center relative">
                  <input 
                    type="range"
                    min={0}
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className={`w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer ${worldStyle.seekAccent} focus:outline-none`}
                  />
                </div>

                <span className="w-8">{formatTime(duration || (activeTrack?.duration ?? 0))}</span>
              </div>
            </div>

            {/* Acciones Adicionales y Control de Volumen Real */}
            <div className="flex items-center gap-3 min-w-[200px] justify-end text-gray-400">
              
              {/* Botón Editar en el Player */}
              {activeTrack && (
                <button 
                  onClick={(e) => openEditModal(activeTrack, e)}
                  className="hover:text-cyan-400 transition-colors"
                  title="Editar metadatos">
                  <Pencil className="w-4 h-4" />
                </button>
              )}

              {/* Botón Favorito en el Player */}
              {activeTrack && (
                <button 
                  onClick={(e) => toggleFavorite(activeTrack.id, e)}
                  className={`hover:${worldStyle.accentText} transition-colors`}
                  title="Favorito">
                  <Heart className={`w-4 h-4 ${favorites.includes(activeTrack.id) ? `${worldStyle.accentText} fill-current` : ''}`} />
                </button>
              )}

              {/* Silencio / Volumen */}
              <div className="flex items-center gap-2 ml-2">
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="hover:text-white transition-colors p-0.5">
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-gray-400 hover:text-white" />
                  )}
                </button>
                <input 
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={isMuted ? 0 : volume}
                  onChange={(e) => {
                    const newVol = parseFloat(e.target.value);
                    setVolume(newVol);
                    if (isMuted) setIsMuted(false);
                  }}
                  className="w-20 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-pink-500 focus:outline-none"
                  title={`Volumen: ${Math.round((isMuted ? 0 : volume) * 100)}%`}
                />
              </div>

            </div>

          </div>
        </div>

      {/* ── MODAL EDITOR DE METADATOS PRO & CATÁLOGO ── */}
      {editingTrack && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => setEditingTrack(null)}
          onPaste={handlePaste}>
          <div 
            className="glass-card rounded-3xl border border-white/10 w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            
            {/* Header con tabs de navegación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03] gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 flex-shrink-0">
                  <Tags className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Editor de Metadatos & Catálogo
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {editingTrack.format}
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-400 truncate max-w-md font-mono" title={editingTrack.path}>
                    {editingTrack.path.split('\\').pop() || editingTrack.path.split('/').pop()}
                  </p>
                </div>
              </div>

              {/* Selector de Pestañas (Pill Switcher) */}
              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => setEditTab('tags')}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      editTab === 'tags' 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}>
                    <Pencil className="w-3.5 h-3.5" />
                    <span>Etiquetas & Portada</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditTab('catalog');
                      if (catalogResults.length === 0 && !isSearchingCatalog) {
                        searchCatalog();
                      }
                    }}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      editTab === 'catalog' 
                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md' 
                        : 'text-gray-400 hover:text-white'
                    }`}>
                    <Globe className="w-3.5 h-3.5" />
                    <span>Buscador Catálogo</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  </button>
                </div>

                <button 
                  onClick={() => setEditingTrack(null)}
                  className="p-2 rounded-xl hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  title="Cerrar (Esc)">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Barra técnica de especificaciones de audio */}
            <div className="px-6 py-2 bg-black/30 border-b border-white/5 flex items-center justify-between text-[11px] text-gray-400 font-mono">
              <div className="flex items-center gap-4">
                <span>Duración: <strong className="text-gray-200">{editingTrack.duration_str}</strong></span>
                <span>Tamaño: <strong className="text-gray-200">{(editingTrack.file_size / (1024 * 1024)).toFixed(2)} MB</strong></span>
                {editingTrack.year && <span>Año original: <strong className="text-gray-200">{editingTrack.year}</strong></span>}
                {editingTrack.track_number && <span>Pista original: <strong className="text-gray-200">#{editingTrack.track_number}</strong></span>}
              </div>
              <div className="text-[10px] text-gray-500 hidden sm:block">
                Presiona <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-gray-300">Ctrl+V</kbd> para pegar portada
              </div>
            </div>

            {/* PESTAÑA 1: ETIQUETAS & PORTADA */}
            {editTab === 'tags' && (
              <form onSubmit={handleSaveMetadata} className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  
                  {/* Columna Izquierda: Portada Interactiva (4 cols) */}
                  <div className="md:col-span-4 flex flex-col items-center gap-3">
                    <div className="w-full aspect-square max-w-[240px] rounded-2xl overflow-hidden relative group border border-white/15 bg-black/40 shadow-2xl flex items-center justify-center">
                      {removeCover ? (
                        <div className="flex flex-col items-center justify-center text-rose-400 p-4 text-center">
                          <Trash2 className="w-10 h-10 mb-2 opacity-80" />
                          <span className="text-xs font-bold">Portada eliminada</span>
                          <span className="text-[10px] text-gray-400 mt-1">Se borrarán los frames de portada al guardar</span>
                        </div>
                      ) : editCoverPreviewUrl ? (
                        <img 
                          src={editCoverPreviewUrl} 
                          className="w-full h-full object-cover" 
                          alt="Nueva portada seleccionada" 
                        />
                      ) : editCoverPath ? (
                        <img 
                          src={convertFileSrc(editCoverPath)} 
                          className="w-full h-full object-cover" 
                          alt="Portada elegida" 
                        />
                      ) : getCoverSrc(editingTrack.cover_url) ? (
                        <img 
                          src={getCoverSrc(editingTrack.cover_url)} 
                          className="w-full h-full object-cover" 
                          alt="Portada actual" 
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-600 p-4 text-center">
                          <Music2 className="w-14 h-14 mb-2 opacity-50" />
                          <span className="text-xs text-gray-400">Sin carátula incrustada</span>
                        </div>
                      )}

                      {/* Badge sobre la portada */}
                      <div className="absolute top-2 left-2 pointer-events-none">
                        {removeCover ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/80 backdrop-blur-md text-white text-[9px] font-bold">
                            Para eliminar
                          </span>
                        ) : editCoverPreviewUrl || editCoverPath ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/80 backdrop-blur-md text-white text-[9px] font-bold">
                            Nueva portada lista
                          </span>
                        ) : getCoverSrc(editingTrack.cover_url) ? (
                          <span className="px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-gray-300 text-[9px]">
                            Original
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Botones de acción de la portada */}
                    <div className="w-full max-w-[240px] space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={pickNewCoverImage}
                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                          title="Seleccionar archivo JPG, PNG o WEBP">
                          <ImagePlus className="w-3.5 h-3.5 text-pink-400" />
                          <span>Cargar...</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEditTab('catalog');
                            if (catalogResults.length === 0) searchCatalog();
                          }}
                          className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-cyan-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
                          title="Buscar carátula HD en Apple Music">
                          <Globe className="w-3.5 h-3.5" />
                          <span>Buscar HD</span>
                        </button>
                      </div>

                      <div className="flex gap-2">
                        {!removeCover && (getCoverSrc(editingTrack.cover_url) || editCoverPath || editCoverPreviewUrl) && (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveCover(true);
                              setEditCoverPath(null);
                              setEditCoverPreviewUrl(null);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[11px] font-medium transition-colors border border-rose-500/20 flex items-center justify-center gap-1.5">
                            <Trash2 className="w-3 h-3" />
                            <span>Quitar carátula</span>
                          </button>
                        )}

                        {(removeCover || editCoverPath || editCoverPreviewUrl) && (
                          <button
                            type="button"
                            onClick={() => {
                              setRemoveCover(false);
                              setEditCoverPath(null);
                              setEditCoverPreviewUrl(null);
                            }}
                            className="flex-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-[11px] font-medium transition-colors border border-white/10 flex items-center justify-center gap-1">
                            <Undo2 className="w-3 h-3" />
                            <span>Restaurar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Campos de Texto (8 cols) */}
                  <div className="md:col-span-8 space-y-4">
                    
                    {/* Sección: Información Principal */}
                    <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-pink-400">
                          Información Principal
                        </span>
                      </div>

                      {/* Título */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-medium text-gray-400 uppercase">Título de la canción</label>
                          {editTitle !== editingTrack.title && (
                            <button 
                              type="button" 
                              onClick={() => resetField('title')}
                              className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                              <Undo2 className="w-2.5 h-2.5" /> Revertir
                            </button>
                          )}
                        </div>
                        <input 
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors"
                          placeholder="Título del tema"
                        />
                      </div>

                      {/* Artista y Artista del Álbum */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Artista</label>
                            {editArtist !== editingTrack.artist && (
                              <button 
                                type="button" 
                                onClick={() => resetField('artist')}
                                className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                                <Undo2 className="w-2.5 h-2.5" /> Revertir
                              </button>
                            )}
                          </div>
                          <input 
                            type="text"
                            value={editArtist}
                            onChange={(e) => setEditArtist(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors"
                            placeholder="Nombre del artista"
                          />
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Artista del Álbum</label>
                            {editAlbumArtist !== (editingTrack.album_artist || editingTrack.artist) && (
                              <button 
                                type="button" 
                                onClick={() => resetField('album_artist')}
                                className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                                <Undo2 className="w-2.5 h-2.5" /> Revertir
                              </button>
                            )}
                          </div>
                          <input 
                            type="text"
                            value={editAlbumArtist}
                            onChange={(e) => setEditAlbumArtist(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors"
                            placeholder="Artista del álbum"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección: Álbum y Pista */}
                    <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                        Álbum & Posición
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-8">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Álbum</label>
                            {editAlbum !== editingTrack.album && (
                              <button 
                                type="button" 
                                onClick={() => resetField('album')}
                                className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                                <Undo2 className="w-2.5 h-2.5" /> Revertir
                              </button>
                            )}
                          </div>
                          <input 
                            type="text"
                            value={editAlbum}
                            onChange={(e) => setEditAlbum(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors"
                            placeholder="Nombre del álbum"
                          />
                        </div>

                        <div className="sm:col-span-4">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Pista Nº</label>
                            {editTrackNumber !== (editingTrack.track_number ? editingTrack.track_number.toString() : '') && (
                              <button 
                                type="button" 
                                onClick={() => resetField('track_number')}
                                className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                                <Undo2 className="w-2.5 h-2.5" /> Revertir
                              </button>
                            )}
                          </div>
                          <input 
                            type="text"
                            value={editTrackNumber}
                            onChange={(e) => setEditTrackNumber(e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={4}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors font-mono"
                            placeholder="Ej. 1"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sección: Año & Género con Sugerencias Rápidas */}
                    <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">
                        Año & Género Musical
                      </span>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                        <div className="sm:col-span-4">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Año</label>
                            {editYear !== (editingTrack.year ? editingTrack.year.toString() : '') && (
                              <button 
                                type="button" 
                                onClick={() => resetField('year')}
                                className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                                <Undo2 className="w-2.5 h-2.5" /> Revertir
                              </button>
                            )}
                          </div>
                          <input 
                            type="text"
                            value={editYear}
                            onChange={(e) => setEditYear(e.target.value.replace(/[^0-9]/g, ''))}
                            maxLength={4}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors font-mono"
                            placeholder="2024"
                          />
                        </div>

                        <div className="sm:col-span-8">
                          <div className="flex justify-between items-center mb-1">
                            <label className="text-[10px] font-medium text-gray-400 uppercase">Género</label>
                            {editGenre !== (editingTrack.genre || '') && (
                              <button 
                                type="button" 
                                onClick={() => resetField('genre')}
                                className="text-[10px] text-pink-400 hover:underline flex items-center gap-1">
                                <Undo2 className="w-2.5 h-2.5" /> Revertir
                              </button>
                            )}
                          </div>
                          <input 
                            type="text"
                            value={editGenre}
                            onChange={(e) => setEditGenre(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors"
                            placeholder="Pop, Rock, Anime, etc."
                          />
                        </div>
                      </div>

                      {/* Píldoras de sugerencias rápidas de géneros */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {['J-Pop', 'Anime', 'Rock', 'Pop', 'Lo-Fi', 'Electrónica', 'Hip-Hop', 'Metal', 'Vocaloid', 'Jazz', 'Clásica'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setEditGenre(g)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                              editGenre.toLowerCase() === g.toLowerCase()
                                ? 'bg-pink-500 text-white'
                                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
                            }`}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>

                {/* Feedback */}
                {metadataFeedback && (
                  <div className={`text-xs px-4 py-3 rounded-2xl flex items-center gap-2 ${
                    metadataFeedback.startsWith('✓') 
                      ? 'bg-green-500/10 text-green-300 border border-green-500/20' 
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}>
                    {metadataFeedback.startsWith('✓') ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{metadataFeedback}</span>
                  </div>
                )}
              </form>
            )}

            {/* PESTAÑA 2: BUSCADOR EN CATÁLOGO ONLINE (APPLE MUSIC / ITUNES) */}
            {editTab === 'catalog' && (
              <div className="p-6 overflow-y-auto space-y-4 flex-1">
                
                {/* Barra de Búsqueda de Catálogo */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                      type="text"
                      value={catalogQuery}
                      onChange={(e) => setCatalogQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && searchCatalog()}
                      placeholder="Buscar por artista y título (ej. LiSA Gurenge)..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-white text-xs focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/30 outline-none transition-colors"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={catalogSource}
                      onChange={(e) => setCatalogSource(e.target.value as any)}
                      className="px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-200 text-xs outline-none cursor-pointer">
                      <option value="itunes" className="bg-gray-900 text-white">Apple Music (iTunes)</option>
                      <option value="deezer" className="bg-gray-900 text-white">Catálogo Global</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => searchCatalog()}
                      disabled={isSearchingCatalog || !catalogQuery.trim()}
                      className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-bold shadow-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 flex-shrink-0">
                      {isSearchingCatalog ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Explicación y atajo */}
                <p className="text-[11px] text-gray-400">
                  Busca canciones en el catálogo oficial de Apple Music para autocompletar automáticamente el título, artista, álbum, año, género, número de pista y carátula en alta definición.
                </p>

                {/* Mensaje de error de catálogo */}
                {catalogError && (
                  <div className="text-xs px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{catalogError}</span>
                  </div>
                )}

                {/* Lista de Resultados de Catálogo */}
                {catalogResults.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      Resultados encontrados ({catalogResults.length})
                    </span>

                    <div className="grid grid-cols-1 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
                      {catalogResults.map((item, idx) => (
                        <div 
                          key={idx}
                          className="p-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-pink-500/30 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                          
                          <div className="flex items-center gap-3 min-w-0">
                            {item.cover_url ? (
                              <img 
                                src={item.cover_url} 
                                className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-white/10 shadow-md group-hover:scale-105 transition-transform" 
                                alt={item.title} 
                              />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                                <Music2 className="w-5 h-5 text-gray-500" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-white truncate group-hover:text-pink-300 transition-colors">
                                {item.title}
                              </h4>
                              <p className="text-[11px] text-gray-300 truncate">
                                {item.artist} <span className="text-gray-500">•</span> {item.album}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono mt-0.5">
                                {item.year && <span>{item.year}</span>}
                                {item.genre && <span>• {item.genre}</span>}
                                {item.track_number && <span>• Pista #{item.track_number}</span>}
                              </div>
                            </div>
                          </div>

                          {/* Botones de Importación */}
                          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                            {item.cover_url && (
                              <button
                                type="button"
                                onClick={() => applyCandidate(item, true)}
                                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-cyan-300 text-xs font-medium border border-white/10 transition-colors flex items-center gap-1.5"
                                title="Importar solamente la carátula en alta resolución">
                                <ImagePlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Solo portada</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => applyCandidate(item, false)}
                              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Aplicar todo</span>
                            </button>
                          </div>

                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer / Barra de Acciones */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetAllFields}
                  className="px-3 py-2 rounded-xl text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1.5">
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Restablecer valores originales</span>
                </button>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button 
                  type="button"
                  onClick={() => setEditingTrack(null)}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs font-semibold transition-colors">
                  Cancelar
                </button>

                <button 
                  type="button"
                  onClick={handleSaveMetadata}
                  disabled={isSavingMetadata}
                  className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white text-xs font-bold shadow-xl hover:shadow-pink-500/25 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSavingMetadata ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando en archivo...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

{/* ========================================================= */}
      {/* MODAL: EDITOR DE METADATOS EN LOTE (BATCH EDITOR)         */}
      {/* ========================================================= */}
      {isBatchModalOpen && (
        <div 
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
          onClick={() => !isSavingBatch && setIsBatchModalOpen(false)}>
          <div 
            className="glass-card rounded-3xl border border-white/10 w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 flex-shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Edición de Metadatos en Lote</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                      {selectedTrackIds.size} pistas
                    </span>
                  </h3>
                  <p className="text-xs text-gray-400">
                    Marca los campos que deseas modificar. Los desmarcados se mantendrán intactos.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => !isSavingBatch && setIsBatchModalOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Campos editables */}
            <div className="p-6 overflow-y-auto custom-scroll space-y-4 text-xs">
              
              {/* Notificación de feedback */}
              {batchFeedback && (
                <div className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
                  batchFeedback.startsWith('✓') 
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}>
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{batchFeedback}</span>
                </div>
              )}

              {/* Artista */}
              <div className={`p-3.5 rounded-2xl border transition-all ${applyBatchArtist ? 'bg-white/5 border-pink-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 font-medium text-gray-300 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={applyBatchArtist}
                      onChange={(e) => setApplyBatchArtist(e.target.checked)}
                      className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                    />
                    <span>Artista</span>
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">{applyBatchArtist ? 'Se aplicará' : 'Sin cambios'}</span>
                </div>
                <input 
                  type="text"
                  value={batchArtist}
                  disabled={!applyBatchArtist}
                  onChange={(e) => setBatchArtist(e.target.value)}
                  placeholder="Ej: LiSA, Aimer, Queen"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 disabled:opacity-40"
                />
              </div>

              {/* Álbum */}
              <div className={`p-3.5 rounded-2xl border transition-all ${applyBatchAlbum ? 'bg-white/5 border-pink-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 font-medium text-gray-300 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={applyBatchAlbum}
                      onChange={(e) => setApplyBatchAlbum(e.target.checked)}
                      className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                    />
                    <span>Álbum</span>
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">{applyBatchAlbum ? 'Se aplicará' : 'Sin cambios'}</span>
                </div>
                <input 
                  type="text"
                  value={batchAlbum}
                  disabled={!applyBatchAlbum}
                  onChange={(e) => setBatchAlbum(e.target.value)}
                  placeholder="Ej: THE BOOK, Greatest Hits"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 disabled:opacity-40"
                />
              </div>

              {/* Artista del Álbum */}
              <div className={`p-3.5 rounded-2xl border transition-all ${applyBatchAlbumArtist ? 'bg-white/5 border-pink-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 font-medium text-gray-300 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={applyBatchAlbumArtist}
                      onChange={(e) => setApplyBatchAlbumArtist(e.target.checked)}
                      className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                    />
                    <span>Artista del Álbum</span>
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">{applyBatchAlbumArtist ? 'Se aplicará' : 'Sin cambios'}</span>
                </div>
                <input 
                  type="text"
                  value={batchAlbumArtist}
                  disabled={!applyBatchAlbumArtist}
                  onChange={(e) => setBatchAlbumArtist(e.target.value)}
                  placeholder="Ej: Varios Artistas, Banda Sonora"
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 disabled:opacity-40"
                />
              </div>

              {/* Año y Género en 2 columnas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Año */}
                <div className={`p-3.5 rounded-2xl border transition-all ${applyBatchYear ? 'bg-white/5 border-pink-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 font-medium text-gray-300 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={applyBatchYear}
                        onChange={(e) => setApplyBatchYear(e.target.checked)}
                        className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                      />
                      <span>Año</span>
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">{applyBatchYear ? 'Se aplicará' : 'Sin cambios'}</span>
                  </div>
                  <input 
                    type="number"
                    value={batchYear}
                    disabled={!applyBatchYear}
                    onChange={(e) => setBatchYear(e.target.value)}
                    placeholder="Ej: 2024"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 disabled:opacity-40"
                  />
                </div>

                {/* Género */}
                <div className={`p-3.5 rounded-2xl border transition-all ${applyBatchGenre ? 'bg-white/5 border-pink-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 font-medium text-gray-300 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={applyBatchGenre}
                        onChange={(e) => setApplyBatchGenre(e.target.checked)}
                        className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                      />
                      <span>Género</span>
                    </label>
                    <span className="text-[10px] text-gray-500 font-mono">{applyBatchGenre ? 'Se aplicará' : 'Sin cambios'}</span>
                  </div>
                  <input 
                    type="text"
                    value={batchGenre}
                    disabled={!applyBatchGenre}
                    onChange={(e) => setBatchGenre(e.target.value)}
                    placeholder="Ej: J-Pop, Rock, Anison"
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-pink-500 disabled:opacity-40"
                  />
                </div>
              </div>

              {/* Carátula en Lote */}
              <div className={`p-4 rounded-2xl border transition-all ${applyBatchCover ? 'bg-white/5 border-pink-500/40' : 'bg-white/[0.02] border-white/5 opacity-80'}`}>
                <div className="flex items-center justify-between mb-3">
                  <label className="flex items-center gap-2 font-medium text-gray-300 cursor-pointer select-none">
                    <input 
                      type="checkbox"
                      checked={applyBatchCover}
                      onChange={(e) => setApplyBatchCover(e.target.checked)}
                      className="rounded bg-white/10 border-white/20 text-pink-500 focus:ring-0"
                    />
                    <span>Portada / Carátula Compartida</span>
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono">{applyBatchCover ? 'Se aplicará' : 'Sin cambios'}</span>
                </div>

                {applyBatchCover && (
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-white/5 border border-white/10 flex-shrink-0 flex items-center justify-center">
                      {batchRemoveCover ? (
                        <div className="flex flex-col items-center justify-center text-center p-1 text-[10px] text-rose-400">
                          <Trash2 className="w-5 h-5 mb-1" />
                          <span>Se eliminará</span>
                        </div>
                      ) : batchCoverPreviewUrl ? (
                        <img src={batchCoverPreviewUrl} alt="Portada nueva" className="w-full h-full object-cover" />
                      ) : (
                        <Music2 className="w-6 h-6 text-gray-600" />
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={pickBatchCoverImage}
                          className="px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white text-xs font-semibold shadow-md shadow-pink-500/20 transition-all flex items-center gap-1.5">
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>Seleccionar Imagen...</span>
                        </button>

                        <button 
                          type="button"
                          onClick={() => {
                            setBatchRemoveCover(!batchRemoveCover);
                            if (!batchRemoveCover) {
                              setBatchCoverPath(null);
                              setBatchCoverPreviewUrl(null);
                            }
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs transition-colors border ${
                            batchRemoveCover 
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold' 
                              : 'bg-white/5 text-gray-400 hover:text-white border-white/10'
                          }`}>
                          {batchRemoveCover ? '✓ Quitar Carátulas' : 'Quitar Carátulas'}
                        </button>
                      </div>
                      <p className="text-[10px] text-gray-400">
                        {batchRemoveCover 
                          ? 'Se removerán las portadas de todas las canciones seleccionadas.' 
                          : batchCoverPath 
                            ? 'La imagen seleccionada se incrustará en todas las pistas del lote.' 
                            : 'Elige una imagen JPEG o PNG de tu equipo.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
              <span className="text-[11px] text-gray-400">
                Se modificarán sólo los campos con casilla marcada
              </span>

              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => !isSavingBatch && setIsBatchModalOpen(false)}
                  disabled={isSavingBatch}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 text-xs font-semibold transition-colors disabled:opacity-50">
                  Cancelar
                </button>

                <button 
                  type="button"
                  onClick={handleSaveBatchMetadata}
                  disabled={isSavingBatch || (!applyBatchArtist && !applyBatchAlbum && !applyBatchAlbumArtist && !applyBatchYear && !applyBatchGenre && !applyBatchCover)}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 text-white text-xs font-bold shadow-xl hover:shadow-pink-500/25 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSavingBatch ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando en {selectedTrackIds.size} archivos...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Aplicar a {selectedTrackIds.size} Canciones</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      </main>

    </div>
  );
}