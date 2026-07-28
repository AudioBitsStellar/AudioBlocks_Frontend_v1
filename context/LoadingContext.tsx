'use client';

import {
  createContext,
  useContext,
  useCallback,
  useReducer,
  useMemo,
  ReactNode,
} from 'react';

// ── Types ─────────────────────────────────────────────────────────────────────

// Each loading key maps to a count so nested/concurrent callers for the same
// key don't cancel each other out when one of them finishes.
type LoadingState = Record<string, number>;

type LoadingAction =
  | { type: 'START'; key: string }
  | { type: 'STOP'; key: string }
  | { type: 'CLEAR'; key: string }
  | { type: 'CLEAR_ALL' };

export interface LoadingContextValue {
  /** True if the named operation has at least one active caller. */
  isLoading: (key: string) => boolean;
  /** True if any operation is currently loading. */
  isAnyLoading: () => boolean;
  /** Mark an operation as in-progress. */
  startLoading: (key: string) => void;
  /** Mark one caller for the operation as done. */
  stopLoading: (key: string) => void;
  /** Force-clear all callers for the named operation. */
  clearLoading: (key: string) => void;
  /** Force-clear every operation. */
  clearAll: () => void;
  /**
   * Wrap an async function so the named key is automatically started before
   * the call and stopped (even on error) when it resolves/rejects.
   */
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  /** Snapshot of the raw state — useful for debugging or dev-tools. */
  loadingState: Readonly<LoadingState>;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

function reducer(state: LoadingState, action: LoadingAction): LoadingState {
  switch (action.type) {
    case 'START':
      return { ...state, [action.key]: (state[action.key] ?? 0) + 1 };
    case 'STOP': {
      const current = state[action.key] ?? 0;
      if (current <= 1) {
        const { [action.key]: _, ...rest } = state;
        return rest;
      }
      return { ...state, [action.key]: current - 1 };
    }
    case 'CLEAR': {
      const { [action.key]: _, ...rest } = state;
      return rest;
    }
    case 'CLEAR_ALL':
      return {};
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

const LoadingContext = createContext<LoadingContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingState, dispatch] = useReducer(reducer, {});

  const startLoading = useCallback((key: string) => {
    dispatch({ type: 'START', key });
  }, []);

  const stopLoading = useCallback((key: string) => {
    dispatch({ type: 'STOP', key });
  }, []);

  const clearLoading = useCallback((key: string) => {
    dispatch({ type: 'CLEAR', key });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  const isLoading = useCallback(
    (key: string) => (loadingState[key] ?? 0) > 0,
    [loadingState],
  );

  const isAnyLoading = useCallback(
    () => Object.values(loadingState).some((count) => count > 0),
    [loadingState],
  );

  const withLoading = useCallback(
    async <T,>(key: string, fn: () => Promise<T>): Promise<T> => {
      dispatch({ type: 'START', key });
      try {
        return await fn();
      } finally {
        dispatch({ type: 'STOP', key });
      }
    },
    [],
  );

  const value = useMemo<LoadingContextValue>(
    () => ({
      isLoading,
      isAnyLoading,
      startLoading,
      stopLoading,
      clearLoading,
      clearAll,
      withLoading,
      loadingState,
    }),
    [isLoading, isAnyLoading, startLoading, stopLoading, clearLoading, clearAll, withLoading, loadingState],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used inside LoadingProvider');
  return ctx;
}
