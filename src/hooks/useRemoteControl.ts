import { useEffect, useState } from 'react';
import { invoke } from '../lib/puente';
import { listen } from '../lib/puente';
import type { ScannedTrack } from '../types';

type RemoteCommand =
  | { action: 'play_pause' }
  | { action: 'pause' }
  | { action: 'next' }
  | { action: 'previous' }
  | { action: 'play_track'; track: ScannedTrack }
  | { action: 'set_volume'; value: number }
  | { action: 'seek'; seconds: number }
  | { action: 'invoke'; id: string; cmd: string; args: Record<string, unknown> };

interface UseRemoteControlDeps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  activeTrack: ScannedTrack | null;
  isPlaying: boolean;
  duration: number;
  togglePlay: () => void;
  handlePlayTrack: (track: ScannedTrack) => void;
  handleNextTrack: (automatico?: boolean) => void;
  handlePreviousTrack: () => void;
  handleVolumeChange: (valor: number) => void;
}

/** Puente entre el servidor HTTP de Rust y el reproductor de React. */
export function useRemoteControl({
  audioRef,
  activeTrack,
  isPlaying,
  duration,
  togglePlay,
  handlePlayTrack,
  handleNextTrack,
  handlePreviousTrack,
  handleVolumeChange,
}: UseRemoteControlDeps) {
  const [enabled, setEnabled] = useState(false);
  const [ip, setIp] = useState('127.0.0.1');
  const [pin, setPin] = useState('');

  useEffect(() => {
    invoke<boolean>('remote_is_enabled')
      .then((activo) => {
        setEnabled(activo);
        if (activo)
          void invoke<string>('remote_pin')
            .then(setPin)
            .catch(() => undefined);
      })
      .catch(() => undefined);
    invoke<string>('remote_local_ip')
      .then(setIp)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let cancelar: (() => void) | undefined;
    listen<RemoteCommand>('remote-command', ({ payload }) => {
      switch (payload.action) {
        case 'play_pause':
          togglePlay();
          break;
        case 'pause':
          if (isPlaying) togglePlay();
          break;
        case 'next':
          handleNextTrack();
          break;
        case 'previous':
          handlePreviousTrack();
          break;
        case 'play_track':
          handlePlayTrack(payload.track);
          break;
        case 'set_volume':
          handleVolumeChange(Math.min(1, Math.max(0, payload.value)));
          break;
        case 'seek':
          if (audioRef.current) audioRef.current.currentTime = payload.seconds;
          break;
        case 'invoke': {
          // El celular pide un comando: se ejecuta acá, con los State reales.
          void invoke<unknown>(payload.cmd, payload.args)
            .then((valor) =>
              invoke('remote_responder', {
                id: payload.id,
                resultado: { ok: true, valor: valor ?? null },
              }),
            )
            .catch((error: unknown) =>
              invoke('remote_responder', {
                id: payload.id,
                resultado: { ok: false, error: String(error) },
              }),
            )
            .catch(() => undefined);
          break;
        }
      }
    })
      .then((fn) => {
        cancelar = fn;
      })
      .catch(() => undefined);
    return () => cancelar?.();
  }, [
    audioRef,
    isPlaying,
    togglePlay,
    handlePlayTrack,
    handleNextTrack,
    handlePreviousTrack,
    handleVolumeChange,
  ]);

  // Publica el estado del reproductor para que el teléfono móvil vea la canción actual.
  useEffect(() => {
    const temporizador = setInterval(() => {
      invoke('remote_update_state', {
        title: activeTrack?.title ?? '',
        artist: activeTrack?.artist ?? '',
        playing: isPlaying,
        position: audioRef.current?.currentTime ?? 0,
        duration: duration || 0,
      }).catch(() => undefined);
    }, 1000);
    return () => clearInterval(temporizador);
  }, [activeTrack, isPlaying, duration, audioRef]);

  const alternar = async () => {
    try {
      const nuevo = await invoke<boolean>('remote_set_enabled', { activo: !enabled });
      setEnabled(nuevo);
      if (nuevo) {
        const nuevoPin = await invoke<string>('remote_pin');
        setPin(nuevoPin);
      } else {
        setPin('');
      }
    } catch {
      // El backend no está disponible (por ejemplo, en tests).
    }
  };

  return { enabled, ip, pin, alternar };
}
