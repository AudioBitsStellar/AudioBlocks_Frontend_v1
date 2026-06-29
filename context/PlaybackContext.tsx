'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';

export type Track = {
  id: string;
  title: string;
  artist: string;
  cover: string;
  url?: string;
};

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
  | { type: 'CLEAR_RECENTLY_PLAYED' };

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
};

function reducer(state: PlaybackState, action: PlaybackAction): PlaybackState {
  switch (action.type) {
    case 'PLAY':
      return { ...state, isPlaying: true, trackError: null };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'NEXT': {
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
        // Move to front if already exists
        updated = [action.track, ...state.recentlyPlayed.filter((_, i) => i !== existingIndex)];
      } else {
        // Add to front, keep only last 10
        updated = [action.track, ...state.recentlyPlayed].slice(0, 10);
      }
      return { ...state, recentlyPlayed: updated };
    }
    case 'CLEAR_RECENTLY_PLAYED':
      return { ...state, recentlyPlayed: [] };
    default:
      return state;
  }
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value: PlaybackContextValue = {
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
  };

  return <PlaybackContext.Provider value={value}>{children}</PlaybackContext.Provider>;
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error('usePlayback must be used inside PlaybackProvider');
  return ctx;
}
