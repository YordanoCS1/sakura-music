import { useCallback, useEffect, useState } from 'react';
import { invoke, listen, open } from '../lib/puente';
import { sonidoUI } from '../lib/sonidos';
import type { AppInfo, DownloaderStatus, ScannedTrack, ThemeMode } from '../types';

export function useLibraryState(temaBase: ThemeMode) {
  const [tracks, setTracks] = useState<ScannedTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<ScannedTrack | null>(null);
  const [appInfo, setAppInfo] = useState<AppInfo | null>(null);
  const [toolsStatus, setToolsStatus] = useState<DownloaderStatus | null>(null);
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
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [pendingDeleteTracks, setPendingDeleteTracks] = useState<ScannedTrack[]>([]);
  const [borradoDeshacible, setBorradoDeshacible] = useState<{
    tokens: string[];
    count: number;
  } | null>(null);

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

  // Escucha pistas recién descargadas y las agrega al instante sin reescanear.
  useEffect(() => {
    let activo = true;
    let parar: (() => void) | undefined;
    listen<ScannedTrack>('library-track-added', ({ payload }) => {
      setTracks((actuales) =>
        actuales.some((pista) => pista.id === payload.id) ? actuales : [payload, ...actuales],
      );
    })
      .then((stopListening) => {
        if (activo) parar = stopListening;
        else stopListening();
      })
      .catch((error) => console.error('No se pudo escuchar pistas descargadas:', error));
    return () => {
      activo = false;
      parar?.();
    };
  }, []);

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

  // Inicialización: favoritos, caché en SQLite, herramientas y directorio predeterminado.
  useEffect(() => {
    let savedFolder: string | null = null;
    try {
      localStorage.removeItem('sakura_library_cache');
      const savedFavs = localStorage.getItem('sakura_favorites');
      if (savedFavs) setFavorites(JSON.parse(savedFavs));
      savedFolder = localStorage.getItem('sakura_current_folder');
      if (savedFolder) setCurrentFolder(savedFolder);
    } catch (e) {
      console.warn('No se pudieron cargar datos en caché:', e);
    }

    invoke<DownloaderStatus>('check_downloader_tools')
      .then((status) => setToolsStatus(status))
      .catch((err) => console.error('Error al verificar herramientas:', err));

    invoke<ScannedTrack[]>('get_cached_library')
      .then(async (cached) => {
        if (cached && cached.length > 0) {
          setTracks(cached);
          setActiveTrack(cached[0]);
        }
        if (savedFolder) {
          const omitir =
            localStorage.getItem('sakura_skip_startup_scan') === 'true' &&
            !(await invoke<boolean>('library_scan_needed', { folder: savedFolder }));
          if (omitir) {
            await invoke('prepare_library_watch', { folderPath: savedFolder });
          } else {
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
        }
      })
      .catch((err) => console.error('Error al cargar o actualizar biblioteca:', err));

    invoke<AppInfo>('get_app_info', { tracksCount: 0 })
      .then((info) => setAppInfo(info))
      .catch((err) => console.error('Error al invocar get_app_info:', err));

    invoke<string | null>('get_default_music_dir')
      .then((dir) => {
        if (dir) setDefaultMusicDir(dir);
      })
      .catch((err) => console.error('Error al obtener directorio de música:', err));
  }, []);

  useEffect(() => {
    setAppInfo((prev) => (prev ? { ...prev, tracks_loaded: tracks.length } : null));
  }, [tracks.length]);

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

  const handleOpenFolderDialog = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Seleccionar carpeta con su música',
      });
      if (selected && typeof selected === 'string') {
        void scanFolder(selected);
      }
    } catch (err) {
      console.error('Error al abrir diálogo de selección:', err);
    }
  };

  const toggleFavorite = useCallback(
    (trackId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      sonidoUI(temaBase, 'confirm');
      setFavorites((prev) => {
        const next = prev.includes(trackId)
          ? prev.filter((id) => id !== trackId)
          : [...prev, trackId];
        localStorage.setItem('sakura_favorites', JSON.stringify(next));
        return next;
      });
    },
    [temaBase],
  );

  const toggleSelectTrack = (trackId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  };

  const clearTrackSelection = () => setSelectedTrackIds(new Set());

  const requestDeleteSelectedTracks = () => {
    const selectedTracks = tracks.filter((track) => selectedTrackIds.has(track.id));
    if (selectedTracks.length === 0 || isDeletingTracks || isScanning) return;
    setPendingDeleteTracks(selectedTracks);
  };

  const confirmDeleteSelectedTracks = async (onStopPlayback: () => void) => {
    const selectedTracks = pendingDeleteTracks;
    if (selectedTracks.length === 0 || isDeletingTracks || isScanning) return;
    setIsDeletingTracks(true);
    const deletedIds = new Set<string>();
    const tokens: string[] = [];
    const failures: { title: string; error: unknown }[] = [];
    try {
      for (const track of selectedTracks) {
        try {
          const token = await invoke<string>('delete_library_track', { path: track.path });
          tokens.push(token);
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
          onStopPlayback();
        }
      }

      if (tokens.length > 0) {
        setBorradoDeshacible({ tokens, count: tokens.length });
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

  return {
    tracks,
    setTracks,
    activeTrack,
    setActiveTrack,
    appInfo,
    toolsStatus,
    setToolsStatus,
    favorites,
    toggleFavorite,
    isScanning,
    isDeletingTracks,
    scanMessage,
    setScanMessage,
    currentFolder,
    defaultMusicDir,
    downloadFolder,
    downloadFolderError,
    handleChooseDownloadFolder,
    handleResetDownloadFolder,
    scanFolder,
    handleOpenFolderDialog,
    rescanAfterDownload,
    selectedTrackIds,
    setSelectedTrackIds,
    pendingDeleteTracks,
    setPendingDeleteTracks,
    borradoDeshacible,
    setBorradoDeshacible,
    toggleSelectTrack,
    clearTrackSelection,
    requestDeleteSelectedTracks,
    confirmDeleteSelectedTracks,
  };
}
