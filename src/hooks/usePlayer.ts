import { useCallback, useEffect, useRef, useState } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';
import type { ScannedTrack } from '../types';

interface UsePlayerDeps {
  tracks: ScannedTrack[];
  activeTrack: ScannedTrack | null;
  setActiveTrack: React.Dispatch<React.SetStateAction<ScannedTrack | null>>;
  playbackQueueRef: React.MutableRefObject<ScannedTrack[]>;
}

export function usePlayer({
  tracks,
  activeTrack,
  setActiveTrack,
  playbackQueueRef,
}: UsePlayerDeps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const currentTimeRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentBlobUrlRef = useRef<string | null>(null);
  const playNextRef = useRef<ScannedTrack[]>([]);

  // El audio se reproduce desde un Blob URL en vez de desde el archivo:
  // así el protocolo asset: de Tauri libera el handle y Windows permite
  // renombrar o reescribir la pista mientras suena.
  const releaseCurrentBlobUrl = useCallback(() => {
    if (currentBlobUrlRef.current) {
      URL.revokeObjectURL(currentBlobUrlRef.current);
      currentBlobUrlRef.current = null;
    }
  }, []);

  useEffect(() => releaseCurrentBlobUrl, [releaseCurrentBlobUrl]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handlePlayTrack = async (track: ScannedTrack) => {
    setActiveTrack(track);
    if (!audioRef.current) return;

    try {
      releaseCurrentBlobUrl();
      const response = await fetch(convertFileSrc(track.path));
      if (!response.ok) {
        throw new Error(`No se pudo cargar el audio (${response.status})`);
      }

      // Copiar el audio en memoria y liberar la URL anterior evita
      // acumular blobs al cambiar de pista.
      const blobUrl = URL.createObjectURL(await response.blob());
      currentBlobUrlRef.current = blobUrl;
      audioRef.current.src = blobUrl;
      await audioRef.current.play();
      setIsPlaying(true);
    } catch (error) {
      console.error('Error al reproducir audio:', error);
      setIsPlaying(false);
    }
  };

  /// Pista elegida con "Reproducir después": va al frente de la automática.
  const playNext = useCallback((track: ScannedTrack) => {
    playNextRef.current = [track, ...playNextRef.current.filter((t) => t.id !== track.id)];
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (!activeTrack && tracks.length > 0) {
      void handlePlayTrack(tracks[0]);
      return;
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((error) => console.error('Error al reanudar:', error));
    }
  };

  const handleNextTrack = (auto = false) => {
    const siguiente = playNextRef.current.shift();
    if (siguiente) {
      void handlePlayTrack(siguiente);
      return;
    }
    const queue = playbackQueueRef.current;
    if (queue.length === 0) return;
    if (isShuffle) {
      const randomIndex = Math.floor(Math.random() * queue.length);
      void handlePlayTrack(queue[randomIndex]);
      return;
    }
    const currentIndex = queue.findIndex((track) => track.id === activeTrack?.id);
    if (currentIndex < 0) {
      void handlePlayTrack(queue[0]);
      return;
    }
    const isLast = currentIndex === queue.length - 1;
    if (isLast && auto && repeatMode === 'off') {
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    void handlePlayTrack(queue[(currentIndex + 1) % queue.length]);
  };

  const handlePreviousTrack = () => {
    const queue = playbackQueueRef.current;
    if (queue.length === 0) return;
    if (currentTimeRef.current > 3) {
      if (audioRef.current) audioRef.current.currentTime = 0;
      return;
    }
    const currentIndex = queue.findIndex((track) => track.id === activeTrack?.id);
    const previousIndex = (currentIndex - 1 + queue.length) % queue.length;
    void handlePlayTrack(queue[previousIndex]);
  };

  const handleSongEnded = () => {
    if (repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      void audioRef.current.play();
    } else if (repeatMode === 'all') {
      handleNextTrack(true);
    } else {
      const queue = playbackQueueRef.current;
      const currentIndex = queue.findIndex((track) => track.id === activeTrack?.id);
      if (currentIndex >= 0 && currentIndex < queue.length - 1) {
        handleNextTrack(true);
      } else {
        setIsPlaying(false);
        if (audioRef.current) audioRef.current.currentTime = 0;
      }
    }
  };

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const targetTime = parseFloat(event.target.value);
    currentTimeRef.current = targetTime;
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) currentTimeRef.current = audioRef.current.currentTime;
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (isMuted) setIsMuted(false);
  };

  const cycleRepeatMode = () => {
    setRepeatMode((mode) => (mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off'));
  };

  return {
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
    toggleShuffle: () => setIsShuffle((value) => !value),
    toggleMute: () => setIsMuted((value) => !value),
    cycleRepeatMode,
  };
}
