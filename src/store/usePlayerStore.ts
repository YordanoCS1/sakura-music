import { create } from 'zustand';
import type { Song } from '../contexts/PlaybackContext';

type RepeatMode = 'none' | 'one' | 'all';

interface PlayerState {
  currentSong: Song | null;
  queue: Song[];
  isPlaying: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  shuffledQueue: Song[];

  // Actions
  setCurrentSong: (song: Song | null) => void;
  setQueue: (songs: Song[], startFrom?: Song) => void;
  setIsPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  toggleRepeat: () => void;
  toggleShuffle: () => void;
  playNext: () => void;
  playPrevious: () => void;
  playAt: (index: number) => void;
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentSong: null,
  queue: [],
  isPlaying: false,
  repeatMode: 'none',
  isShuffled: false,
  shuffledQueue: [],

  setCurrentSong: (song) => set({ currentSong: song }),

  setQueue: (songs, startFrom) => {
    const { isShuffled } = get();
    const shuffled = isShuffled ? shuffleArray(songs) : [];
    set({
      queue: songs,
      shuffledQueue: shuffled,
      currentSong: startFrom ?? songs[0] ?? null,
      isPlaying: true,
    });
  },

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  togglePlay: () => set((s) => ({ isPlaying: !s.isPlaying })),

  toggleRepeat: () =>
    set((s) => ({
      repeatMode:
        s.repeatMode === 'none' ? 'all' : s.repeatMode === 'all' ? 'one' : 'none',
    })),

  toggleShuffle: () => {
    const { isShuffled, queue, currentSong } = get();
    const newShuffled = !isShuffled;
    const shuffled = newShuffled ? shuffleArray(queue) : [];
    // Keep current song at the front of shuffled queue
    if (newShuffled && currentSong) {
      const idx = shuffled.findIndex((s) => s.path === currentSong.path);
      if (idx > 0) {
        shuffled.splice(idx, 1);
        shuffled.unshift(currentSong);
      }
    }
    set({ isShuffled: newShuffled, shuffledQueue: shuffled });
  },

  playNext: () => {
    const { currentSong, queue, shuffledQueue, isShuffled, repeatMode, isPlaying } = get();
    if (!currentSong) return;
    const active = isShuffled && shuffledQueue.length > 0 ? shuffledQueue : queue;
    const idx = active.findIndex((t) => t.path === currentSong.path);
    let nextIdx = idx + 1;
    if (nextIdx >= active.length) {
      if (repeatMode === 'all') nextIdx = 0;
      else { set({ isPlaying: false }); return; }
    }
    set({ currentSong: active[nextIdx], isPlaying: true });
  },

  playPrevious: () => {
    const { currentSong, queue, shuffledQueue, isShuffled } = get();
    if (!currentSong) return;
    const active = isShuffled && shuffledQueue.length > 0 ? shuffledQueue : queue;
    const idx = active.findIndex((t) => t.path === currentSong.path);
    const prevIdx = idx <= 0 ? active.length - 1 : idx - 1;
    set({ currentSong: active[prevIdx], isPlaying: true });
  },

  playAt: (index) => {
    const { queue } = get();
    const song = queue[index];
    if (song) set({ currentSong: song, isPlaying: true });
  },
}));
