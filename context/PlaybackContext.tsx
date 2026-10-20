'use client';

import {
  createContext,
  use,
  useContext,
  useReducer,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  ReactNode,
} from 'react';
import {
  createSleepTimer,
  sleepFadeFactor,
  type SleepTimer,
  type SleepTimerOption,
} from '@/lib/sleepTimer';
import { isTrackAvailable, shuffleTracks } from '@/lib/tracks';

export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url?: string;
  duration?: number;
  available?: boolean;
  flagged?: boolean;
  status?: string;
  /** Integrated loudness in LUFS, measured by the backend (#582). Missing for older songs. */
  loudness?: number;
  /** True peak in dBTP, measured by the backend (#582). */
  truePeakDb?: number;
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

/** Clamp crossfade duration to the supported 0–5 second range. */
export function clampCrossfadeDuration(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.min(5, Math.max(0, seconds));
}

export type PlaybackState = {
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
  /**
   * Crossfade overlap between tracks in seconds (0–5).
   * 0 disables crossfade (hard cut).
   */
  crossfadeDuration: number;
  /** True while two audio elements are overlapping during a crossfade. */
  isCrossfading: boolean;
  /**
   * Loudness normalization across tracks (#328). When enabled, playback is
   * routed through a compressor so quiet and loud tracks sound consistent.
   */
  normalizeAudio: boolean;
  /**
   * Gapless playback (#329). When enabled, the next track is preloaded while
   * the current one plays so track changes have no audible gap.
   */
  gapless: boolean;
  /** Sleep timer (#589). Kept in memory only, so it survives route changes but not reloads. */
  sleepTimer: SleepTimer | null;
  /** Volume multiplier while a sleep timer fades out (1 = no fade). */
  sleepFade: number;
};

type PlaybackAction =
  | { type: 'PLAY_TRACKS'; tracks: Track[]; shuffle: boolean }
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
  | { type: 'CLEAR_HISTORY' }
  // Crossfade (#115)
  | { type: 'SET_CROSSFADE_DURATION'; duration: number }
  | { type: 'SET_CROSSFADING'; isCrossfading: boolean }
  // Audio normalization (#328)
  | { type: 'SET_NORMALIZE_AUDIO'; enabled: boolean }
  // Gapless playback (#329)
  | { type: 'SET_GAPPLESS'; enabled: boolean }
  // Sleep timer (#589)
  | { type: 'SET_SLEEP_TIMER'; timer: SleepTimer }
  | { type: 'CLEAR_SLEEP_TIMER' }
  | { type: 'SET_SLEEP_FADE'; factor: number }
  | { type: 'SLEEP_EXPIRED' };

export type PlaybackContextValue = PlaybackState & {
  playTrack: (track: Track) => void;
  playTracks: (tracks: Track[], shuffle?: boolean) => void;
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
  // Crossfade (#115)
  /** Set crossfade duration in seconds (clamped to 0–5). 0 disables. */
  setCrossfadeDuration: (duration: number) => void;
  setCrossfading: (isCrossfading: boolean) => void;
  // Audio normalization (#328)
  /** Toggle loudness normalization across tracks. */
  setNormalizeAudio: (enabled: boolean) => void;
  // Gapless playback (#329)
  /** Toggle seamless (gapless) transitions between tracks. */
  setGapless: (enabled: boolean) => void;
  // Sleep timer (#589)
  /** Start a sleep timer, replacing any active one. */
  setSleepTimer: (option: SleepTimerOption) => void;
  cancelSleepTimer: () => void;
  /** Pause playback because the sleep timer ended. Clears the timer. */
  expireSleepTimer: () => void;
};

/**
 * Every action function exposed by the provider. These have a stable identity
 * for the lifetime of the provider, so components that only call actions never
 * re-render when playback state changes.
 */
export type PlaybackActions = {
  [K in keyof PlaybackContextValue as PlaybackContextValue[K] extends (...args: never[]) => unknown
    ? K
    : never]: PlaybackContextValue[K];
};

/** The player starts with the demo playlist only when demo data is enabled; otherwise it starts empty. */
const defaultPlaylist: Track[] = demoOr(demoPlaylist, []);

const HISTORY_MAX = 200;
/** How often the sleep timer checks the clock and updates the fade. */
const SLEEP_TICK_MS = 250;

// ── localStorage helpers ──────────────────────────────────────────────────

const QUEUE_STORAGE_KEY = 'audioblocks_queue';
const HISTORY_STORAGE_KEY = 'audioblocks_history';
const VOLUME_STORAGE_KEY = 'audioblocks_volume';
const MUTED_STORAGE_KEY = 'audioblocks_muted';
const RECENTLY_PLAYED_STORAGE_KEY = 'audioblocks_recently_played';
const NORMALIZE_AUDIO_STORAGE_KEY = 'audioblocks_normalize_audio';
const GAPPLESS_STORAGE_KEY = 'audioblocks_gapless';

/**
 * JSON from localStorage is untrusted: it can be modified by browser tools,
 * extensions, or scripts running on this origin. Reject dangerous property
 * names before the parsed value is used by application state.
 */
function containsUnsafeObjectKeys(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsUnsafeObjectKeys);

  if (value && typeof value === 'object') {
    return Object.entries(value).some(
      ([key, nestedValue]) =>
        key === '__proto__' ||
        key === 'prototype' ||
        key === 'constructor' ||
        containsUnsafeObjectKeys(nestedValue)
    );
  }

  return false;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    const parsed: unknown = JSON.parse(raw);
    return containsUnsafeObjectKeys(parsed) ? fallback : (parsed as T);
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
  crossfadeDuration: 0,
  isCrossfading: false,
  normalizeAudio: true,
  gapless: true,
  sleepTimer: null,
  sleepFade: 1,
};

// ── Reducer ───────────────────────────────────────────────────────────────

function reducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  // Guard every public queue entry point, including context-menu actions.
  if (
    'track' in action &&
    !isTrackAvailable(action.track) &&
    ['PLAY_TRACK', 'ENQUEUE_TRACK', 'ADD_TO_QUEUE'].includes(action.type)
  )
    return state;
  switch (action.type) {
    case 'PLAY_TRACKS': {
      const playable = action.tracks.filter(isTrackAvailable);
      const tracks = action.shuffle ? shuffleTracks(playable) : playable;
      if (!tracks.length) return state;
      return {
        ...state,
        playlist: tracks,
        currentIndex: 0,
        queue: tracks.slice(1),
        shuffle: false,
        isPlaying: true,
        trackError: null,
      };
    }
    case 'PLAY':
      return isTrackAvailable(state.playlist[state.currentIndex])
        ? { ...state, isPlaying: true, trackError: null }
        : state;
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'NEXT':
    case 'ADVANCE_QUEUE': {
      // If queue has items, advance from queue first (#116).
      const validQueue = state.queue.filter(isTrackAvailable);
      if (validQueue.length > 0) {
        const [next, ...rest] = validQueue;
        const existing = state.playlist.findIndex((t) => t.id === next.id);
        if (existing >= 0) {
          return {
            ...state,
            queue: rest,
            currentIndex: existing,
            isPlaying: true,
            trackError: null,
          };
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
      const indices = state.playlist.flatMap((track, index) =>
        isTrackAvailable(track) ? [index] : []
      );
      if (!indices.length) return { ...state, queue: [], isPlaying: false };
      const nextIndex = state.shuffle
        ? indices[Math.floor(Math.random() * indices.length)]
        : (indices.find((index) => index > state.currentIndex) ?? indices[0]);
      return { ...state, queue: [], currentIndex: nextIndex, isPlaying: true, trackError: null };
    }
    case 'PREV': {
      const indices = state.playlist.flatMap((track, index) =>
        isTrackAvailable(track) ? [index] : []
      );
      const prevIndex =
        indices.filter((index) => index < state.currentIndex).pop() ?? indices[indices.length - 1];
      return prevIndex === undefined
        ? { ...state, isPlaying: false }
        : { ...state, currentIndex: prevIndex, isPlaying: true, trackError: null };
    }
    case 'SET_INDEX':
      return isTrackAvailable(state.playlist[action.index])
        ? { ...state, currentIndex: action.index, isPlaying: true, trackError: null }
        : state;
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
        updated = [action.track, ...state.recentlyPlayed].slice(0, 20);
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

    // ── Crossfade (#115) ────────────────────────────────────────────────

    case 'SET_CROSSFADE_DURATION':
      return { ...state, crossfadeDuration: clampCrossfadeDuration(action.duration) };
    case 'SET_CROSSFADING':
      return { ...state, isCrossfading: action.isCrossfading };

    // ── Audio normalization (#328) ──────────────────────────────────────

    case 'SET_NORMALIZE_AUDIO':
      return { ...state, normalizeAudio: action.enabled };

    // ── Gapless playback (#329) ─────────────────────────────────────────

    case 'SET_GAPPLESS':
      return { ...state, gapless: action.enabled };

    // ── Sleep timer (#589) ──────────────────────────────────────────────

    case 'SET_SLEEP_TIMER':
      return { ...state, sleepTimer: action.timer, sleepFade: 1 };
    case 'CLEAR_SLEEP_TIMER':
      return state.sleepTimer === null && state.sleepFade === 1
        ? state
        : { ...state, sleepTimer: null, sleepFade: 1 };
    case 'SET_SLEEP_FADE':
      // Ticks arrive several times a second; skip identical values to avoid re-renders.
      return state.sleepFade === action.factor ? state : { ...state, sleepFade: action.factor };
    case 'SLEEP_EXPIRED':
      return { ...state, isPlaying: false, sleepTimer: null, sleepFade: 1 };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────

/** Full state plus actions. Prefer the narrower hooks below in new code. */
export const PlaybackContext = createContext<PlaybackContextValue | null>(null);
/** Reducer state only; changes on every state update. */
export const PlaybackStateContext = createContext<PlaybackState | null>(null);
/** Action functions only; the value never changes. */
export const PlaybackActionsContext = createContext<PlaybackActions | null>(null);

interface PlaybackStore {
  getState: () => PlaybackState;
  subscribe: (listener: () => void) => () => void;
  set: (next: PlaybackState) => void;
}

/** Holder for the latest state that `useSyncExternalStore` subscribers read from. Its identity never changes. */
const PlaybackStoreContext = createContext<PlaybackStore | null>(null);

function createPlaybackStore(initial: PlaybackState): PlaybackStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    getState: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      if (Object.is(next, current)) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const noopSubscribe = () => () => {};

export function PlaybackProvider({ children }: { children: ReactNode }) {
  // Hydrate queue, history, and volume from localStorage on mount (#121).
  const hydratedState: PlaybackState = {
    ...initialState,
    queue: loadFromStorage<Track[]>(QUEUE_STORAGE_KEY, []).filter(isTrackAvailable),
    history: loadFromStorage<PlaybackEvent[]>(HISTORY_STORAGE_KEY, []),
    recentlyPlayed: loadFromStorage<Track[]>(RECENTLY_PLAYED_STORAGE_KEY, []),
    // #121: restore volume and muted state from the device so the user's
    // preferred level survives page reloads and browser restarts.
    volume: loadFromStorage<number>(VOLUME_STORAGE_KEY, initialState.volume),
    isMuted: loadFromStorage<boolean>(MUTED_STORAGE_KEY, initialState.isMuted),
    normalizeAudio: loadFromStorage<boolean>(
      NORMALIZE_AUDIO_STORAGE_KEY,
      initialState.normalizeAudio
    ),
    gapless: loadFromStorage<boolean>(GAPPLESS_STORAGE_KEY, initialState.gapless),
  };

  const [state, dispatch] = useReducer(reducer, hydratedState);

  // Sleep timer (#589): check the clock while a timed sleep runs, and fade volume near the end.
  const sleepTimer = state.sleepTimer;
  useEffect(() => {
    if (sleepTimer?.kind !== 'duration') return;
    const tick = () => {
      const remaining = sleepTimer.endsAt - Date.now();
      if (remaining <= 0) dispatch({ type: 'SLEEP_EXPIRED' });
      else dispatch({ type: 'SET_SLEEP_FADE', factor: sleepFadeFactor(remaining) });
    };
    tick();
    const id = setInterval(tick, SLEEP_TICK_MS);
    return () => clearInterval(id);
  }, [sleepTimer]);

  // Persist queue, history, volume, and mute state to localStorage on change.
  useEffect(() => {
    saveToStorage(QUEUE_STORAGE_KEY, state.queue);
  }, [state.queue]);

  useEffect(() => {
    saveToStorage(HISTORY_STORAGE_KEY, state.history);
  }, [state.history]);

  useEffect(() => {
    saveToStorage(VOLUME_STORAGE_KEY, state.volume);
  }, [state.volume]);

  useEffect(() => {
    saveToStorage(MUTED_STORAGE_KEY, state.isMuted);
  }, [state.isMuted]);

  useEffect(() => {
    saveToStorage(RECENTLY_PLAYED_STORAGE_KEY, state.recentlyPlayed);
  }, [state.recentlyPlayed]);

  useEffect(() => {
    saveToStorage(NORMALIZE_AUDIO_STORAGE_KEY, state.normalizeAudio);
  }, [state.normalizeAudio]);

  useEffect(() => {
    saveToStorage(GAPPLESS_STORAGE_KEY, state.gapless);
  }, [state.gapless]);

  // Latest history for `getRecentlyPlayed`, so that action stays stable while
  // still reading current data.
  const historyRef = useRef(state.history);
  historyRef.current = state.history;

  // Crossfade (#115)
  const setCrossfadeDuration = useCallback((duration: number) => {
    dispatch({ type: 'SET_CROSSFADE_DURATION', duration });
  }, []);
  const setCrossfading = useCallback((isCrossfading: boolean) => {
    dispatch({ type: 'SET_CROSSFADING', isCrossfading });
  }, []);

  // Audio normalization (#328)
  const setNormalizeAudio = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_NORMALIZE_AUDIO', enabled });
  }, []);

  // Gapless playback (#329)
  const setGapless = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_GAPPLESS', enabled });
  }, []);

  // Sleep timer (#589)
  const setSleepTimer = useCallback((option: SleepTimerOption) => {
    dispatch({ type: 'SET_SLEEP_TIMER', timer: createSleepTimer(option, Date.now()) });
  }, []);
  const cancelSleepTimer = useCallback(() => dispatch({ type: 'CLEAR_SLEEP_TIMER' }), []);
  const expireSleepTimer = useCallback(() => dispatch({ type: 'SLEEP_EXPIRED' }), []);

  const value = useMemo<PlaybackContextValue>(
    () => ({
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
      playTracks: (tracks, shuffle = false) => dispatch({ type: 'PLAY_TRACKS', tracks, shuffle }),
      enqueueTrack: (track) => dispatch({ type: 'ENQUEUE_TRACK', track }),
      setError: (error) => dispatch({ type: 'SET_ERROR', error }),
      dismissError: () => dispatch({ type: 'DISMISS_ERROR' }),
      addToRecentlyPlayed: (track) => dispatch({ type: 'ADD_TO_RECENTLY_PLAYED', track }),
      clearRecentlyPlayed: () => dispatch({ type: 'CLEAR_RECENTLY_PLAYED' }),
      setAutoplayBlocked: (blocked) => dispatch({ type: 'SET_AUTOPLAY_BLOCKED', blocked }),
      resumeAudio: () => dispatch({ type: 'RESUME_AUDIO' }),
      // Queue (#116)
      addToQueue: (track, position = 'last') => dispatch({ type: 'ADD_TO_QUEUE', track, position }),
      removeFromQueue: (index) => dispatch({ type: 'REMOVE_FROM_QUEUE', index }),
      reorderQueue: (fromIndex, toIndex) => dispatch({ type: 'REORDER_QUEUE', fromIndex, toIndex }),
      clearQueue: () => dispatch({ type: 'CLEAR_QUEUE' }),
      advanceQueue: () => dispatch({ type: 'ADVANCE_QUEUE' }),
      // History (#117)
      recordPlay: (trackId, durationPlayed) =>
        dispatch({
          type: 'RECORD_PLAY',
          event: { trackId, timestamp: Date.now(), durationPlayed },
        }),
      clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
      getRecentlyPlayed: (n = 20) => {
        const seen = new Set<string>();
        const result: PlaybackEvent[] = [];
        for (const ev of historyRef.current) {
          if (seen.has(ev.trackId)) continue;
          seen.add(ev.trackId);
          result.push(ev);
          if (result.length >= n) break;
        }
        return result;
      },
      // Crossfade (#115)
      setCrossfadeDuration: (duration) => dispatch({ type: 'SET_CROSSFADE_DURATION', duration }),
      setCrossfading: (isCrossfading) => dispatch({ type: 'SET_CROSSFADING', isCrossfading }),
      // Audio normalization (#328)
      setNormalizeAudio: (enabled) => dispatch({ type: 'SET_NORMALIZE_AUDIO', enabled }),
      // Gapless playback (#329)
      setGapless,
      // Sleep timer (#589)
      setSleepTimer,
      cancelSleepTimer,
      expireSleepTimer,
    }),
    [
      state,
      addToRecentlyPlayed,
      setAutoplayBlocked,
      resumeAudio,
      addToQueue,
      removeFromQueue,
      reorderQueue,
      clearQueue,
      advanceQueue,
      recordPlay,
      clearHistory,
      getRecentlyPlayed,
      setCrossfadeDuration,
      setCrossfading,
      setNormalizeAudio,
      setGapless,
      setSleepTimer,
      cancelSleepTimer,
      expireSleepTimer,
    ]
  );

  // External store behind `usePlaybackSelector`. Subscribers re-render only when
  // their selected slice changes, not on every state update.
  const storeRef = useRef<PlaybackStore | null>(null);
  if (storeRef.current === null) storeRef.current = createPlaybackStore(state);
  const store = storeRef.current;
  useLayoutEffect(() => {
    store.set(state);
  }, [store, state]);

  // Backwards-compatible value for `usePlayback()`: state plus actions.
  const value = useMemo<PlaybackContextValue>(() => ({ ...state, ...actions }), [state, actions]);

  return (
    <PlaybackActionsContext.Provider value={actions}>
      <PlaybackStoreContext.Provider value={store}>
        <PlaybackStateContext.Provider value={state}>
          <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>
        </PlaybackStateContext.Provider>
      </PlaybackStoreContext.Provider>
    </PlaybackActionsContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used inside PlaybackProvider');
  return ctx;
}

/**
 * Playback state only. Re-renders on every state change, so prefer
 * `usePlaybackSelector` when a component needs just one field.
 */
export function usePlaybackState(): PlaybackState {
  const state = useContext(PlaybackStateContext);
  if (state) return state;
  // A bare `PlaybackContext.Provider` (tests, harnesses) still works.
  const legacy = use(PlaybackContext);
  if (!legacy) throw new Error('usePlaybackState must be used inside PlaybackProvider');
  return legacy;
}

/**
 * Playback actions. The returned object and every function in it keep the same
 * identity for the lifetime of the provider, so using this hook never causes a
 * re-render on its own.
 */
export function usePlaybackActions(): PlaybackActions {
  const actions = useContext(PlaybackActionsContext);
  if (actions) return actions;
  const legacy = use(PlaybackContext);
  if (!legacy) throw new Error('usePlaybackActions must be used inside PlaybackProvider');
  return legacy;
}

/**
 * Subscribes to one slice of playback state, e.g. `usePlaybackSelector((s) => s.isPlaying)`.
 * The component re-renders only when the selected value changes (compared with
 * `Object.is`), so a selector must return an existing reference or a primitive,
 * not a freshly built object.
 */
export function usePlaybackSelector<T>(selector: (state: PlaybackState) => T): T {
  const store = useContext(PlaybackStoreContext);
  const legacy = store ? null : use(PlaybackContext);
  if (!store && !legacy)
    throw new Error('usePlaybackSelector must be used inside PlaybackProvider');
  return useSyncExternalStore(
    store ? store.subscribe : noopSubscribe,
    () => selector(store ? store.getState() : legacy!),
    () => selector(store ? store.getState() : legacy!)
  );
}
