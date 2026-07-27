'use client';

import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, ReactNode } from 'react';

export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url?: string;
};

// ── Queue types (#116) ────────────────────────────────────────────────────

export type QueuePosition = 'next' | 'last';

// ── History types (#117) ──────────────────────────────────────────────────

export interface PlaybackEvent {
  trackId: string;
  timestamp: number;
  durationPlayed: number;
}

// ── State ─────────────────────────────────────────────────────────────────

type PlaybackState = {
  playlist: Track[];
  currentIndex: number;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  shuffle: boolean;
  repeat: boolean;
  trackError: string | null;
  recentlyPlayed: Track[];
  autoplayBlocked: boolean;
  /** Queue: tracks waiting to play, separate from the main playlist. */
  queue: Track[];
  /** Ordered playback history with timestamps. */
  history: PlaybackEvent[];
};

type PlaybackAction =
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'SET_INDEX'; index: number }
  | { type: 'SET_VOLUME'; volume: number }
  | { type: 'TOGGLE_MUTE' }
  | { type: 'TOGGLE_SHUFFLE' }
  | { type: 'TOGGLE_REPEAT' }
  | { type: 'PLAY_TRACK'; track: Track }
  | { type: 'ENQUEUE_TRACK'; track: Track }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'DISMISS_ERROR' }
  | { type: 'ADD_TO_RECENTLY_PLAYED'; track: Track }
  | { type: 'CLEAR_RECENTLY_PLAYED' }
  | { type: 'SET_AUTOPLAY_BLOCKED'; blocked: boolean }
  | { type: 'RESUME_AUDIO' }
  // Queue actions (#116)
  | { type: 'ADD_TO_QUEUE'; track: Track; position: QueuePosition }
  | { type: 'REMOVE_FROM_QUEUE'; index: number }
  | { type: 'REORDER_QUEUE'; fromIndex: number; toIndex: number }
  | { type: 'CLEAR_QUEUE' }
  | { type: 'ADVANCE_QUEUE' }
  // History actions (#117)
  | { type: 'RECORD_PLAY'; event: PlaybackEvent }
  | { type: 'CLEAR_HISTORY' };

export type PlaybackContextValue = PlaybackState & {
  playTrack: (track: Track) => void;
  enqueueTrack: (track: Track) => void;
  play: () => void;
  pause: () => void;
  next: () => void;
  prev: () => void;
  setCurrentIndex: (index: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  setError: (error: string) => void;
  dismissError: () => void;
  addToRecentlyPlayed: (track: Track) => void;
  clearRecentlyPlayed: () => void;
  autoplayBlocked: boolean;
  setAutoplayBlocked: (blocked: boolean) => void;
  resumeAudio: () => void;
  // Queue (#116)
  addToQueue: (track: Track, position?: QueuePosition) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  /** Advance to the next queue item, or the next playlist track if queue is empty. */
  advanceQueue: () => void;
  // History (#117)
  recordPlay: (trackId: string, durationPlayed: number) => void;
  clearHistory: () => void;
  /** Return the last `n` unique tracks from history. */
  getRecentlyPlayed: (n?: number) => PlaybackEvent[];
};

const defaultPlaylist: Track[] = [
  {
    id: 'track-1',
    title: 'Relax and Unwind',
    artist: 'Rozé',
    cover: '/AFRO.jpg',
  },
  {
    id: 'track-2',
    title: 'Vibe Mix',
    artist: 'Yemi Sax',
    cover: '/AFRO.jpg',
  },
  {
    id: 'track-3',
    title: 'Cool Session',
    artist: 'Dunsin',
    cover: '/AFRO.jpg',
  },
];

const HISTORY_MAX = 200;

// ── localStorage helpers ──────────────────────────────────────────────────

const QUEUE_STORAGE_KEY = 'audioblocks_queue';
const HISTORY_STORAGE_KEY = 'audioblocks_history';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — silently ignore.
  }
}

// ── Initial state ─────────────────────────────────────────────────────────

const initialState: PlaybackState = {
  playlist: defaultPlaylist,
  currentIndex: 0,
  isPlaying: false,
  volume: 1,
  isMuted: false,
  shuffle: false,
  repeat: false,
  trackError: null,
  recentlyPlayed: [],
  autoplayBlocked: false,
  queue: [],
  history: [],
};

// ── Reducer ───────────────────────────────────────────────────────────────

function reducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true, trackError: null };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'NEXT': {
      // If queue has items, advance from queue first (#116).
      if (state.queue.length > 0) {
        const [next, ...rest] = state.queue;
        const existing = state.playlist.findIndex((t) => t.id === next.id);
        if (existing >= 0) {
          return { ...state, queue: rest, currentIndex: existing, isPlaying: true, trackError: null };
        }
        return {
          ...state,
          queue: rest,
          playlist: [...state.playlist, next],
          currentIndex: state.playlist.length,
          isPlaying: true,
          trackError: null,
        };
      }
      const nextIndex = state.shuffle
        ? Math.floor(Math.random() * state.playlist.length)
        : (state.currentIndex + 1) % state.playlist.length;
      return { ...state, currentIndex: nextIndex, isPlaying: true, trackError: null };
    }
    case 'PREV': {
      const prevIndex =
        state.currentIndex === 0 ? state.playlist.length - 1 : state.currentIndex - 1;
      return { ...state, currentIndex: prevIndex, isPlaying: true, trackError: null };
    }
    case 'SET_INDEX':
      return { ...state, currentIndex: action.index, isPlaying: true, trackError: null };
    case 'SET_VOLUME':
      return { ...state, volume: action.volume, isMuted: false };
    case 'TOGGLE_MUTE':
      return { ...state, isMuted: !state.isMuted };
    case 'TOGGLE_SHUFFLE':
      return { ...state, shuffle: !state.shuffle };
    case 'TOGGLE_REPEAT':
      return { ...state, repeat: !state.repeat };
    case 'PLAY_TRACK': {
      const existing = state.playlist.findIndex((t) => t.id === action.track.id);
      if (existing >= 0) {
        return { ...state, currentIndex: existing, isPlaying: true, trackError: null };
      }
      return {
        ...state,
        playlist: [...state.playlist, action.track],
        currentIndex: state.playlist.length,
        isPlaying: true,
        trackError: null,
      };
    }
    case 'ENQUEUE_TRACK':
      return { ...state, playlist: [...state.playlist, action.track] };
    case 'SET_ERROR':
      return { ...state, trackError: action.error, isPlaying: false };
    case 'DISMISS_ERROR':
      return { ...state, trackError: null };
    case 'ADD_TO_RECENTLY_PLAYED': {
      const existingIndex = state.recentlyPlayed.findIndex((t) => t.id === action.track.id);
      let updated;
      if (existingIndex >= 0) {
        updated = [action.track, ...state.recentlyPlayed.filter((_, i) => i !== existingIndex)];
      } else {
        updated = [action.track, ...state.recentlyPlayed].slice(0, 10);
      }
      return { ...state, recentlyPlayed: updated };
    }
    case 'CLEAR_RECENTLY_PLAYED':
      return { ...state, recentlyPlayed: [] };
    case 'SET_AUTOPLAY_BLOCKED':
      return { ...state, autoplayBlocked: action.blocked };
    case 'RESUME_AUDIO':
      return { ...state, autoplayBlocked: false };

    // ── Queue (#116) ────────────────────────────────────────────────────

    case 'ADD_TO_QUEUE': {
      if (action.position === 'next') {
        return { ...state, queue: [action.track, ...state.queue] };
      }
      return { ...state, queue: [...state.queue, action.track] };
    }
    case 'REMOVE_FROM_QUEUE': {
      const q = [...state.queue];
      q.splice(action.index, 1);
      return { ...state, queue: q };
    }
    case 'REORDER_QUEUE': {
      const q = [...state.queue];
      const [moved] = q.splice(action.fromIndex, 1);
      q.splice(action.toIndex, 0, moved);
      return { ...state, queue: q };
    }
    case 'CLEAR_QUEUE':
      return { ...state, queue: [] };
    case 'ADVANCE_QUEUE': {
      if (state.queue.length > 0) {
        const [next, ...rest] = state.queue;
        const existing = state.playlist.findIndex((t) => t.id === next.id);
        if (existing >= 0) {
          return { ...state, queue: rest, currentIndex: existing, isPlaying: true, trackError: null };
        }
        return {
          ...state,
          queue: rest,
          playlist: [...state.playlist, next],
          currentIndex: state.playlist.length,
          isPlaying: true,
          trackError: null,
        };
      }
      // No queue — advance in playlist.
      const nextIdx = state.shuffle
        ? Math.floor(Math.random() * state.playlist.length)
        : (state.currentIndex + 1) % state.playlist.length;
      return { ...state, currentIndex: nextIdx, isPlaying: true, trackError: null };
    }

    // ── History (#117) ──────────────────────────────────────────────────

    case 'RECORD_PLAY': {
      // Merge consecutive plays of the same track.
      const prev = state.history[0];
      if (prev && prev.trackId === action.event.trackId) {
        const merged: PlaybackEvent = {
          ...prev,
          durationPlayed: prev.durationPlayed + action.event.durationPlayed,
          timestamp: action.event.timestamp,
        };
        return { ...state, history: [merged, ...state.history.slice(1)] };
      }
      const history = [action.event, ...state.history].slice(0, HISTORY_MAX);
      return { ...state, history };
    }
    case 'CLEAR_HISTORY':
      return { ...state, history: [] };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  // Hydrate queue and history from localStorage on mount.
  const hydratedState: PlaybackState = {
    ...initialState,
    queue: loadFromStorage<Track[]>(QUEUE_STORAGE_KEY, []),
    history: loadFromStorage<PlaybackEvent[]>(HISTORY_STORAGE_KEY, []),
  };

  const [state, dispatch] = useReducer(reducer, hydratedState);

  // Persist queue and history to localStorage on change.
  useEffect(() => {
    saveToStorage(QUEUE_STORAGE_KEY, state.queue);
  }, [state.queue]);

  useEffect(() => {
    saveToStorage(HISTORY_STORAGE_KEY, state.history);
  }, [state.history]);

  const setAutoplayBlocked = useCallback((blocked: boolean) => dispatch({ type: 'SET_AUTOPLAY_BLOCKED', blocked }), []);
  const resumeAudio = useCallback(() => dispatch({ type: 'RESUME_AUDIO' }), []);

  // Queue actions (#116)
  const addToQueue = useCallback((track: Track, position: QueuePosition = 'last') => {
    dispatch({ type: 'ADD_TO_QUEUE', track, position });
  }, []);
  const removeFromQueue = useCallback((index: number) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', index });
  }, []);
  const reorderQueue = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER_QUEUE', fromIndex, toIndex });
  }, []);
  const clearQueue = useCallback(() => dispatch({ type: 'CLEAR_QUEUE' }), []);
  const advanceQueue = useCallback(() => dispatch({ type: 'ADVANCE_QUEUE' }), []);

  // History actions (#117)
  const recordPlay = useCallback((trackId: string, durationPlayed: number) => {
    dispatch({ type: 'RECORD_PLAY', event: { trackId, timestamp: Date.now(), durationPlayed } });
  }, []);
  const clearHistory = useCallback(() => dispatch({ type: 'CLEAR_HISTORY' }), []);
  const getRecentlyPlayed = useCallback(
    (n = 20) => {
      const seen = new Set<string>();
      const result: PlaybackEvent[] = [];
      for (const ev of state.history) {
        if (seen.has(ev.trackId)) continue;
        seen.add(ev.trackId);
        result.push(ev);
        if (result.length >= n) break;
      }
      return result;
    },
    [state.history],
  );

  const value = useMemo<PlaybackContextValue>(() => ({
    ...state,
    play: () => dispatch({ type: 'PLAY' }),
    pause: () => dispatch({ type: 'PAUSE' }),
    next: () => dispatch({ type: 'NEXT' }),
    prev: () => dispatch({ type: 'PREV' }),
    setCurrentIndex: (index) => dispatch({ type: 'SET_INDEX', index }),
    setVolume: (volume) => dispatch({ type: 'SET_VOLUME', volume }),
    toggleMute: () => dispatch({ type: 'TOGGLE_MUTE' }),
    toggleShuffle: () => dispatch({ type: 'TOGGLE_SHUFFLE' }),
    toggleRepeat: () => dispatch({ type: 'TOGGLE_REPEAT' }),
    playTrack: (track) => dispatch({ type: 'PLAY_TRACK', track }),
    enqueueTrack: (track) => dispatch({ type: 'ENQUEUE_TRACK', track }),
    setError: (error) => dispatch({ type: 'SET_ERROR', error }),
    dismissError: () => dispatch({ type: 'DISMISS_ERROR' }),
    addToRecentlyPlayed: (track) => dispatch({ type: 'ADD_TO_RECENTLY_PLAYED', track }),
    clearRecentlyPlayed: () => dispatch({ type: 'CLEAR_RECENTLY_PLAYED' }),
    autoplayBlocked: state.autoplayBlocked,
    setAutoplayBlocked,
    resumeAudio,
    // Queue
    addToQueue,
    removeFromQueue,
    reorderQueue,
    clearQueue,
    advanceQueue,
    // History
    recordPlay,
    clearHistory,
    getRecentlyPlayed,
  }), [state, setAutoplayBlocked, resumeAudio, addToQueue, removeFromQueue, reorderQueue, clearQueue, advanceQueue, recordPlay, clearHistory, getRecentlyPlayed]);

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used inside PlaybackProvider');
  return ctx;
}
