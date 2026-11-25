import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { invoke, convertFileSrc } from './lib/puente';
import { Music2, GalleryVerticalEnd } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize } from '@tauri-apps/api/dpi';

import type {
  ScannedTrack,
  OnlineSearchResult,
  DownloadHistoryItem,
  PlayerStyle,
  ViewMode,
  AppTab,
} from './types';
import { useBatchEditor } from './hooks/useBatchEditor';
import { useMetadataEditor } from './hooks/useMetadataEditor';
import { useDownloadQueue } from './hooks/useDownloadQueue';
import { useOnlineSearch } from './hooks/useOnlineSearch';
import { useFolderExplorer } from './hooks/useFolderExplorer';
import { usePlayer } from './hooks/usePlayer';
import { useRemoteControl } from './hooks/useRemoteControl';
import { useThemeTransition } from './hooks/useThemeTransition';
import { useThemeSettings } from './hooks/useThemeSettings';
import { useLibraryState } from './hooks/useLibraryState';
import { useAppShortcuts } from './hooks/useAppShortcuts';
import { guardarTemaPersonalizado } from './themes/customThemes';
import { sonidoUI } from './lib/sonidos';
import { esEscritorio } from './lib/puente';
import { configurarNotificaciones, notificarDescarga } from './lib/notificaciones_nativas';

import PlayerBar from './components/PlayerBar';
import UndoToast from './components/UndoToast';
import ThemedLoader from './components/ThemedLoader';
import TrackContextMenu from './components/TrackContextMenu';
import RemoteStatus from './components/RemoteStatus';
import ActionToast from './components/ActionToast';
import ThemeSearch from './components/ThemeSearch';
import ThemeQueue from './components/ThemeQueue';
import ThemeLibrary from './components/ThemeLibrary';
import ThemeHome from './components/ThemeHome';
import ThemeNav from './components/ThemeNav';
import TitleBar from './components/TitleBar';

const SettingsTab = lazy(() => import('./components/SettingsTab'));
const PlaylistsPanel = lazy(() => import('./components/PlaylistsPanel'));
const StatsTab = lazy(() => import('./components/StatsTab'));
const CoverFullscreen = lazy(() => import('./components/CoverFullscreen'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const ThemeGeneratorModal = lazy(() => import('./components/ThemeGeneratorModal'));
const MetadataModal = lazy(() => import('./components/MetadataModal'));
const BatchModal = lazy(() => import('./components/BatchModal'));
const DeleteTracksDialog = lazy(() => import('./components/DeleteTracksDialog'));

function formatTime(secs: number) {
  if (isNaN(secs) || secs < 0) return '0:00';
  const mins = Math.floor(secs / 60);
  const remainder = Math.floor(secs % 60);
  return `${mins}:${remainder.toString().padStart(2, '0')}`;
}

export default function App() {
  const [activeTab, setActiveTabRaw] = useState<AppTab>('library');
  const [paletaAbierta, setPaletaAbierta] = useState(false);
  const [portadaFull, setPortadaFull] = useState(false);
  const [generadorAbierto, setGeneradorAbierto] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [menuPista, setMenuPista] = useState<{ track: ScannedTrack; x: number; y: number } | null>(
    null,
  );
  const [historialDescargas, setHistorialDescargas] = useState<DownloadHistoryItem[]>([]);
  const [concurrencia, setConcurrencia] = useState(() => {
    const guardado = Number(localStorage.getItem('sakura_download_concurrency') ?? 2);
    return Number.isFinite(guardado) ? Math.min(4, Math.max(1, guardado)) : 2;
  });
  const [avisoAccion, setAvisoAccion] = useState<{
    mensaje: string;
    accion?: { etiqueta: string; onClick: () => void };
  } | null>(null);
  const [playerStyle, setPlayerStyle] = useState<PlayerStyle>(
    () => (localStorage.getItem('sakura_player_style') as PlayerStyle) || 'floating',
  );

  const libraryScrollRef = useRef<HTMLDivElement>(null);
  const playbackQueueRef = useRef<ScannedTrack[]>([]);

  // Las portadas en línea (data: o http) se usan tal cual; las locales pasan
  // por convertFileSrc para que el protocolo asset: de Tauri pueda leerlas.
  const getCoverSrc = useCallback((coverUrl: string | null) => {
    if (!coverUrl) return '';
    if (
      coverUrl.startsWith('data:') ||
      coverUrl.startsWith('http://') ||
      coverUrl.startsWith('https://')
    ) {
      return coverUrl;
    }
    return convertFileSrc(coverUrl);
  }, []);

  // Estado temporal de pista activa para el glow del tema (se sincroniza abajo con useLibraryState).
  const [activeTrackForGlow, setActiveTrackForGlow] = useState<ScannedTrack | null>(null);

  const {
    setCustomThemes,
    todosLosTemas,
    customThemes,
    theme,
    temaBase,
    nombreTema,
    handleSetTheme,
    importarTema,
    borrarTema,
    carpetaExportacion,
    guardarCarpetaExportacion,
    glassOpacity,
    handleSetGlassOpacity,
    glassBlur,
    handleSetGlassBlur,
    ambientGlow,
    handleSetAmbientGlow,
    ambientParticles,
    handleSetAmbientParticles,
    coverGlowColors,
    worldStyle,
  } = useThemeSettings(activeTrackForGlow, getCoverSrc);

  const {
    tracks,
    setTracks,
    activeTrack,
    setActiveTrack,
    appInfo,
    toolsStatus,
    favorites,
    toggleFavorite,
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
    clearTrackSelection,
    confirmDeleteSelectedTracks,
  } = useLibraryState(temaBase);

  useEffect(() => {
    setActiveTrackForGlow(activeTrack);
  }, [activeTrack]);

  const setActiveTab = useThemeTransition(temaBase, (tab) => {
    sonidoUI(temaBase, 'click');
    setActiveTabRaw(tab);
  });

  const presentarPista = (track: ScannedTrack) => {
    sonidoUI(temaBase, 'confirm');
    setActiveTrack(track);
    setPortadaFull(true);
  };

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
    playNext,
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
    desactivado: playerStyle === 'off',
  });

  const handleSetPlayerStyle = useCallback(
    async (s: PlayerStyle) => {
      setPlayerStyle(s);
      localStorage.setItem('sakura_player_style', s);
      if (s === 'off' && isPlaying && audioRef.current) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
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
    },
    [audioRef, isPlaying, setIsPlaying],
  );

  const { atajos, escuchandoAtajo, setEscuchandoAtajo } = useAppShortcuts({
    activeTrack,
    playerStyle,
    setActiveTab,
    setPaletaAbierta,
    setPortadaFull,
    handleNextTrack,
    handlePreviousTrack,
    togglePlay,
    toggleFavorite,
    handleSetPlayerStyle,
    onShortcutSaved: (combinacion) =>
      setAvisoAccion({ mensaje: `Atajo guardado: ${combinacion}`, accion: undefined }),
  });

  const controlRemoto = useRemoteControl({
    audioRef,
    activeTrack,
    isPlaying,
    duration,
    togglePlay,
    handlePlayTrack,
    handleNextTrack,
    handlePreviousTrack,
    handleVolumeChange,
  });

  useEffect(() => {
    invoke<DownloadHistoryItem[]>('list_download_history')
      .then((historial) => setHistorialDescargas(historial ?? []))
      .catch((error) => console.error('No se pudo cargar el historial:', error));
  }, []);

  useEffect(() => {
    invoke('set_download_concurrency', { max: concurrencia }).catch((error) =>
      console.error('No se pudo ajustar la concurrencia:', error),
    );
  }, [concurrencia]);

  useEffect(() => {
    void configurarNotificaciones(() => setActiveTab('library'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab !== 'library') {
      setMenuPista(null);
      return;
    }
    const alHacerClicDerecho = (evento: MouseEvent) => {
      const destino = evento.target as HTMLElement;
      const nodo = destino.closest<HTMLElement>('[data-track-id]');
      if (!nodo) return;
      evento.preventDefault();
      const pista = tracks.find((item) => item.id === nodo.dataset.trackId);
      if (!pista) return;
      setMenuPista({ track: pista, x: evento.clientX, y: evento.clientY });
    };
    document.addEventListener('contextmenu', alHacerClicDerecho);
    return () => document.removeEventListener('contextmenu', alHacerClicDerecho);
  }, [activeTab, tracks]);

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
    moveDownload,
  } = useDownloadQueue({
    currentFolder,
    defaultMusicDir,
    downloadFolder,
    rescanAfterDownload,
    onAviso: (mensaje) => {
      setScanMessage(mensaje);
      window.setTimeout(() => setScanMessage(null), 4500);
    },
    onDescargaCompletada: (titulo) => {
      void notificarDescarga(
        titulo,
        '',
        tracks.find((pista) => pista.title === titulo)?.cover_url ?? null,
      );
      sonidoUI(temaBase, 'confirm');
      setAvisoAccion({
        mensaje: `${titulo} descargada. Ya está en la biblioteca.`,
        accion: { etiqueta: 'Ver biblioteca', onClick: () => setActiveTab('library') },
      });
    },
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

  const [resultadosFts, setResultadosFts] = useState<ScannedTrack[] | null>(null);
  useEffect(() => {
    const consulta = searchQuery.trim();
    if (!consulta) {
      setResultadosFts(null);
      return;
    }
    let cancelada = false;
    const temporizador = setTimeout(() => {
      invoke<ScannedTrack[]>('search_library_fts', { query: consulta, limit: 300 })
        .then((resultados) => {
          if (!cancelada) setResultadosFts(resultados);
        })
        .catch((error) => {
          console.error('Búsqueda FTS no disponible, se usa el filtro local:', error);
          if (!cancelada) setResultadosFts(null);
        });
    }, 120);
    return () => {
      cancelada = true;
      clearTimeout(temporizador);
    };
  }, [searchQuery]);

  const usoFts = resultadosFts !== null && resultadosFts.length > 0;
  const tracksParaExplorador = usoFts ? resultadosFts! : tracks;
  const consultaParaExplorador = usoFts ? '' : searchQuery;
  const viewMode: ViewMode = 'folders';

  const {
    currentFolderNav,
    setCurrentFolderNav,
    folderExplorerData,
    filteredTracks,
    handleNavigateIntoFolder,
    handleNavigateToBreadcrumb,
    handleNavigateUp,
  } = useFolderExplorer({
    tracks: tracksParaExplorador,
    currentFolder,
    searchQuery: consultaParaExplorador,
    filterChip: 'all',
    favorites,
    viewMode,
    setSelectedTrackIds,
    handlePlayTrack,
  });
  playbackQueueRef.current = filteredTracks;

  const stopDeletedActivePlayback = () => {
    audioRef.current?.pause();
    if (audioRef.current) {
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
    setIsPlaying(false);
    setActiveTrack(null);
  };

  return (
    <div
      data-theme="space"
      data-skin={theme}
      className={`app-shell relative w-screen h-screen flex flex-col overflow-hidden ${worldStyle.bgClass} font-sans text-ink-100 select-none`}
      style={
        {
          '--glass-opacity': `${glassOpacity / 100}`,
          '--glass-blur': `${glassBlur}px`,
        } as React.CSSProperties
      }
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleSongEnded}
        onError={(e) => console.error('Error nativo del elemento audio:', e)}
      />

      {coverGlowColors && (
        <div
          className="cover-glow-layer pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={
            {
              '--glow-1': coverGlowColors.color1,
              '--glow-2': coverGlowColors.color2,
              '--glow-angle': `${coverGlowColors.angulo ?? 0}deg`,
            } as React.CSSProperties
          }
        />
      )}
      {ambientGlow && !coverGlowColors && (
        <>
          <div
            className={`absolute -top-32 -left-32 w-96 h-96 ${worldStyle.ambientGlow1} rounded-full blur-[110px] pointer-events-none transition-all duration-slow animate-pulse`}
          />
          <div
            className={`absolute -bottom-32 -right-32 w-96 h-96 ${worldStyle.ambientGlow2} rounded-full blur-[120px] pointer-events-none transition-all duration-slow`}
          />
        </>
      )}

      {ambientParticles && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none">
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
        </div>
      )}

      <TitleBar nombreTema={nombreTema} temaId={theme} />

      <div className="app-rail-row flex flex-1 min-h-0 overflow-hidden app-rail-column">
        <ThemeNav
          theme={temaBase}
          activeTab={activeTab}
          onNavigate={setActiveTab}
          trackCount={tracks.length}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <main
          className="flex-1 flex flex-col overflow-hidden z-10"
          role="tabpanel"
          id="theme-panel"
          data-panel={activeTab}
          data-transition={temaBase}
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={-1}
        >
          {scanMessage && (
            <div className="bg-accent-500/10 border-b border-accent-500/20 px-6 py-2 flex items-center justify-between text-xs text-accent-300">
              <div className="flex items-center gap-2">
                <ThemedLoader theme={temaBase} pequeno etiqueta={scanMessage} />
              </div>
            </div>
          )}

          <div
            ref={libraryScrollRef}
            className={`main-scroll-region flex-1 overflow-y-auto p-6 custom-scroll ${
              activeTab === 'library' && filteredTracks.length > 60 ? 'biblioteca-muy-grande' : ''
            }`}
          >
            {activeTab === 'library' && (
              <ThemeLibrary
                theme={temaBase}
                tracks={filteredTracks}
                favorites={favorites}
                activeTrack={activeTrack}
                isPlaying={isPlaying}
                getCoverSrc={getCoverSrc}
                currentFolderNav={currentFolderNav}
                folderExplorerData={folderExplorerData}
                onPlayTrack={handlePlayTrack}
                onPresentTrack={presentarPista}
                onToggleFavorite={toggleFavorite}
                onOpenFolderDialog={handleOpenFolderDialog}
                onScanFolder={scanFolder}
                onNavigateUp={handleNavigateUp}
                onNavigateToBreadcrumb={handleNavigateToBreadcrumb}
                onNavigateIntoFolder={handleNavigateIntoFolder}
                onShowAll={() => setCurrentFolderNav([])}
                onOpenEdit={meta.openEditModal}
                onRequestDelete={(track) => setPendingDeleteTracks([track])}
                onOpenBatch={() => batch.openBatchModal(tracks)}
              />
            )}

            {activeTab === 'home' && (
              <ThemeHome
                theme={temaBase}
                trackCount={tracks.length}
                tracks={tracks}
                getCoverSrc={getCoverSrc}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'search' && (
              <ThemeSearch
                theme={temaBase}
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

            {activeTab === 'queue' && (
              <ThemeQueue
                theme={temaBase}
                downloads={downloads}
                restoredNotice={restoredNotice}
                onClearNotice={() => setRestoredNotice(null)}
                onGoSearch={() => setActiveTab('search')}
                onGoLibrary={() => setActiveTab('library')}
                onCancelAll={cancelAllDownloads}
                onCancel={cancelDownload}
                onRetry={retryDownload}
                onMoveDownload={moveDownload}
                onClearFinished={() =>
                  setDownloads((prev) => prev.filter((d) => !d.status.startsWith('completado')))
                }
                onClearInactive={() => {
                  const cantidad = downloads.filter(
                    (d) => d.status.includes('error') || d.status === 'cancelado',
                  ).length;
                  if (
                    cantidad === 0 ||
                    !window.confirm(
                      `¿Quitar ${cantidad} descargas canceladas o con error de la cola?`,
                    )
                  ) {
                    return;
                  }
                  setDownloads((prev) =>
                    prev.filter((d) => !d.status.includes('error') && d.status !== 'cancelado'),
                  );
                }}
              />
            )}

            {activeTab === 'playlists' && (
              <div className="main-scroll-region flex-1 overflow-y-auto p-6 custom-scroll">
                <Suspense fallback={null}>
                  <PlaylistsPanel
                    theme={temaBase}
                    tracks={tracks}
                    activeTrack={activeTrack}
                    getCoverSrc={getCoverSrc}
                    onPlayTrack={handlePlayTrack}
                  />
                </Suspense>
              </div>
            )}

            {activeTab === 'stats' && (
              <div className="main-scroll-region flex-1 overflow-y-auto p-6 custom-scroll">
                <Suspense fallback={null}>
                  <StatsTab theme={temaBase} tracks={tracks} getCoverSrc={getCoverSrc} />
                </Suspense>
              </div>
            )}

            {activeTab === 'settings' && (
              <Suspense fallback={null}>
                <SettingsTab
                  theme={temaBase}
                  temas={todosLosTemas}
                  onImportarTema={importarTema}
                  onExportado={(mensaje) => setAvisoAccion({ mensaje, accion: undefined })}
                  atajos={atajos}
                  escuchandoAtajo={escuchandoAtajo}
                  onEscucharAtajo={setEscuchandoAtajo}
                  carpetaExportacion={carpetaExportacion}
                  onSetCarpetaExportacion={guardarCarpetaExportacion}
                  onAbrirGenerador={() => setGeneradorAbierto(true)}
                  onGuardarTema={(tema) => {
                    setCustomThemes(guardarTemaPersonalizado(tema));
                    handleSetTheme(tema.id);
                  }}
                  onBorrarTema={borrarTema}
                  temasPersonalizadosIds={customThemes.map((tema) => tema.id)}
                  remoteEnabled={controlRemoto.enabled}
                  remoteIp={controlRemoto.ip}
                  remotePin={controlRemoto.pin}
                  onToggleRemote={controlRemoto.alternar}
                  concurrencia={concurrencia}
                  skipStartupScan={localStorage.getItem('sakura_skip_startup_scan') === 'true'}
                  onSetSkipStartupScan={(valor) =>
                    localStorage.setItem('sakura_skip_startup_scan', String(valor))
                  }
                  historialDescargas={historialDescargas}
                  onClearHistorial={async () => {
                    try {
                      await invoke('clear_download_history');
                      setHistorialDescargas([]);
                    } catch (error) {
                      console.error('No se pudo limpiar el historial:', error);
                    }
                  }}
                  onSetConcurrencia={(n) => {
                    const valor = Math.min(4, Math.max(1, n));
                    localStorage.setItem('sakura_download_concurrency', String(valor));
                    setConcurrencia(valor);
                  }}
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
              </Suspense>
            )}
          </div>

          {paletaAbierta && (
            <Suspense fallback={null}>
              <CommandPalette
                theme={temaBase}
                tracks={tracks}
                temas={todosLosTemas}
                isPlaying={isPlaying}
                onClose={() => setPaletaAbierta(false)}
                onNavigate={setActiveTab}
                onSetTheme={handleSetTheme}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={togglePlay}
                onNext={() => handleNextTrack()}
                onPrevious={handlePreviousTrack}
              />
            </Suspense>
          )}

          {!esEscritorio() && <RemoteStatus />}

          {portadaFull && activeTrack && (
            <Suspense fallback={null}>
              <CoverFullscreen
                track={activeTrack}
                tracks={tracks}
                onSelectTrack={(pista) => {
                  sonidoUI(temaBase, 'click');
                  setActiveTrack(pista);
                }}
                portada={activeTrack.cover_url ? getCoverSrc(activeTrack.cover_url) : null}
                esFav={favorites.includes(activeTrack.id)}
                onToggleFavorite={() =>
                  toggleFavorite(activeTrack.id, { stopPropagation() {} } as React.MouseEvent)
                }
                tema={temaBase}
                carpetaExportacion={carpetaExportacion}
                onCarpetaExportacion={guardarCarpetaExportacion}
                onAviso={(mensaje, accion) => setAvisoAccion({ mensaje, accion })}
                onClose={() => setPortadaFull(false)}
              />
            </Suspense>
          )}

          {avisoAccion && (
            <ActionToast
              mensaje={avisoAccion.mensaje}
              accion={avisoAccion.accion}
              onDismiss={() => setAvisoAccion(null)}
            />
          )}

          {menuPista && (
            <TrackContextMenu
              x={menuPista.x}
              y={menuPista.y}
              theme={temaBase}
              track={menuPista.track}
              esFav={favorites.includes(menuPista.track.id)}
              isPlaying={activeTrack?.id === menuPista.track.id && isPlaying}
              onClose={() => setMenuPista(null)}
              onPlay={() => {
                sonidoUI(temaBase, 'click');
                void handlePlayTrack(menuPista.track);
              }}
              onPlayNext={() => {
                sonidoUI(temaBase, 'confirm');
                playNext(menuPista.track);
                setScanMessage(`${menuPista.track.title} se reproducirá después.`);
                window.setTimeout(() => setScanMessage(null), 3500);
              }}
              onToggleFavorite={() =>
                toggleFavorite(menuPista.track.id, { stopPropagation() {} } as React.MouseEvent)
              }
              onEdit={() => meta.openEditModal(menuPista.track)}
              onDelete={() => setPendingDeleteTracks([menuPista.track])}
              onAviso={(mensaje) => {
                setScanMessage(mensaje);
                window.setTimeout(() => setScanMessage(null), 4000);
              }}
            />
          )}

          {borradoDeshacible && (
            <UndoToast
              count={borradoDeshacible.count}
              onDismiss={() => setBorradoDeshacible(null)}
              onUndo={async () => {
                const actual = borradoDeshacible;
                setBorradoDeshacible(null);
                try {
                  for (const token of actual.tokens) {
                    await invoke('restore_deleted_track', { token });
                  }
                  const restauradas = await invoke<ScannedTrack[]>('get_cached_library');
                  setTracks(restauradas);
                  setScanMessage(
                    `${actual.count} ${actual.count === 1 ? 'pista restaurada' : 'pistas restauradas'}.`,
                  );
                  window.setTimeout(() => setScanMessage(null), 4000);
                } catch (error) {
                  console.error('No se pudo deshacer el borrado:', error);
                  setScanMessage('No se pudo deshacer el borrado; vea la papelera en Sistema.');
                }
              }}
            />
          )}

          {playerStyle !== 'off' ? (
            <PlayerBar
              theme={temaBase}
              tracks={tracks}
              onPlayTrackFromPanel={handlePlayTrack}
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
              onOpenFullscreen={() => setPortadaFull(true)}
            />
          ) : (
            <div className="player-off-actions">
              <button
                type="button"
                className="player-off-btn"
                onClick={() => void handleSetPlayerStyle('floating')}
                title="Volver a activar el reproductor"
                aria-label="Activar reproductor"
              >
                <Music2 className="w-3.5 h-3.5" /> Reproductor desactivado · activar
              </button>
              {activeTrack && (
                <button
                  type="button"
                  className="player-off-btn is-present"
                  onClick={() => setPortadaFull(true)}
                  title="Presentar la canción"
                  aria-label="Presentar canción"
                >
                  <GalleryVerticalEnd className="w-3.5 h-3.5" /> Presentar canción
                </button>
              )}
            </div>
          )}

          {meta.editingTrack && (
            <Suspense fallback={null}>
              <MetadataModal
                theme={temaBase}
                editingTrack={meta.editingTrack}
                editTab={meta.editTab}
                editTitle={meta.editTitle}
                editArtist={meta.editArtist}
                editAlbum={meta.editAlbum}
                editAlbumArtist={meta.editAlbumArtist}
                editTrackNumber={meta.editTrackNumber}
                editYear={meta.editYear}
                editGenre={meta.editGenre}
                editCoverPath={meta.editCoverPath}
                editCoverPreviewUrl={meta.editCoverPreviewUrl}
                removeCover={meta.removeCover}
                isSavingMetadata={meta.isSavingMetadata}
                metadataFeedback={meta.metadataFeedback}
                catalogQuery={meta.catalogQuery}
                catalogSource={meta.catalogSource}
                catalogResults={meta.catalogResults}
                isSearchingCatalog={meta.isSearchingCatalog}
                catalogError={meta.catalogError}
                catalogMode={meta.catalogMode}
                catalogAlbums={meta.catalogAlbums}
                openedAlbum={meta.openedAlbum}
                catalogAlbumTracks={meta.catalogAlbumTracks}
                isOpeningAlbum={meta.isOpeningAlbum}
                getCoverSrc={getCoverSrc}
                onClose={() => meta.setEditingTrack(null)}
                onPaste={meta.handlePaste}
                onSetEditTab={meta.setEditTab}
                onSearchCatalog={() => meta.searchCatalog()}
                onApplyCandidate={meta.applyCandidate}
                onOpenAlbum={meta.openAlbum}
                onApplyAlbumTrack={meta.applyAlbumTrack}
                albumLink={meta.albumLink}
                onSetAlbumLink={meta.setAlbumLink}
                onOpenAlbumByLink={meta.openAlbumByLink}
                songLink={meta.songLink}
                onSetSongLink={meta.setSongLink}
                isOpeningSong={meta.isOpeningSong}
                onOpenSongByLink={meta.openSongByLink}
                onSetCatalogMode={meta.setCatalogMode}
                onPickCover={meta.pickNewCoverImage}
                onResetField={meta.resetField}
                onResetAll={meta.resetAllFields}
                onSave={meta.handleSaveMetadata}
                onEditTitleChange={meta.setEditTitle}
                onEditArtistChange={meta.setEditArtist}
                onEditAlbumChange={meta.setEditAlbum}
                onEditAlbumArtistChange={meta.setEditAlbumArtist}
                onEditTrackNumberChange={meta.setEditTrackNumber}
                onEditYearChange={meta.setEditYear}
                onEditGenreChange={meta.setEditGenre}
                onSetCoverPath={meta.setEditCoverPath}
                onSetCoverPreview={meta.setEditCoverPreviewUrl}
                onSetRemoveCover={meta.setRemoveCover}
                onCatalogQueryChange={meta.setCatalogQuery}
                onCatalogSourceChange={(v) => meta.setCatalogSource(v)}
              />
            </Suspense>
          )}

          {pendingDeleteTracks.length > 0 && (
            <Suspense fallback={null}>
              <DeleteTracksDialog
                theme={temaBase}
                tracks={pendingDeleteTracks}
                isDeleting={isDeletingTracks}
                onCancel={() => {
                  if (!isDeletingTracks) setPendingDeleteTracks([]);
                }}
                onConfirm={() => confirmDeleteSelectedTracks(stopDeletedActivePlayback)}
              />
            </Suspense>
          )}

          {batch.isBatchModalOpen && (
            <Suspense fallback={null}>
              <BatchModal
                theme={temaBase}
                open={batch.isBatchModalOpen}
                selectedCount={batch.batchTargets.length || selectedTrackIds.size}
                isSaving={batch.isSavingBatch}
                feedback={batch.batchFeedback}
                batchArtist={batch.batchArtist}
                batchAlbum={batch.batchAlbum}
                batchAlbumArtist={batch.batchAlbumArtist}
                batchYear={batch.batchYear}
                batchGenre={batch.batchGenre}
                batchCoverPath={batch.batchCoverPath}
                batchCoverPreviewUrl={batch.batchCoverPreviewUrl}
                batchRemoveCover={batch.batchRemoveCover}
                applyArtist={batch.applyBatchArtist}
                applyAlbum={batch.applyBatchAlbum}
                applyAlbumArtist={batch.applyBatchAlbumArtist}
                applyYear={batch.applyBatchYear}
                applyGenre={batch.applyBatchGenre}
                applyCover={batch.applyBatchCover}
                onClose={() => batch.setIsBatchModalOpen(false)}
                onSave={batch.handleSaveBatchMetadata}
                onPickCover={batch.pickBatchCoverImage}
                onBatchArtistChange={batch.setBatchArtist}
                onBatchAlbumChange={batch.setBatchAlbum}
                onBatchAlbumArtistChange={batch.setBatchAlbumArtist}
                onBatchYearChange={batch.setBatchYear}
                onBatchGenreChange={batch.setBatchGenre}
                onApplyArtistChange={batch.setApplyBatchArtist}
                onApplyAlbumChange={batch.setApplyBatchAlbum}
                onApplyAlbumArtistChange={batch.setApplyBatchAlbumArtist}
                onApplyYearChange={batch.setApplyBatchYear}
                onApplyGenreChange={batch.setApplyBatchGenre}
                onApplyCoverChange={batch.setApplyBatchCover}
                onSetCoverPath={batch.setBatchCoverPath}
                onSetCoverPreview={batch.setBatchCoverPreviewUrl}
                onSetRemoveCover={batch.setBatchRemoveCover}
              />
            </Suspense>
          )}
        </main>

        {generadorAbierto && (
          <Suspense fallback={null}>
            <ThemeGeneratorModal
              abierto={generadorAbierto}
              onCerrar={() => setGeneradorAbierto(false)}
              onAplicar={(tema) => {
                setCustomThemes(guardarTemaPersonalizado(tema));
                handleSetTheme(tema.id);
              }}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
