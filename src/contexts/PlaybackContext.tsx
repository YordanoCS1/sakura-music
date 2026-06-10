import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export interface Song {
  id: string; title: string; artist: string; cover?: string; duration: number; path: string;
}

interface PlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  currentSong: Song | null;
  setCurrentTime: (t: number) => void;
  setDuration: (d: number) => void;
  setIsPlaying: (v: boolean) => void;
  setCurrentSong: (s: Song | null) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const PlaybackContext = createContext<PlaybackState | null>(null);

export function PlaybackProvider({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <PlaybackContext.Provider value={{
      currentTime, duration, isPlaying, currentSong,
      setCurrentTime, setDuration, setIsPlaying, setCurrentSong, audioRef,
    }}>
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackState {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used within PlaybackProvider');
  return ctx;
}
