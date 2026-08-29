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

/**
 * Loading state type mapping loading keys to count values.
 * Each loading key maps to a count so nested/concurrent callers for the same
 * key don't cancel each other out when one of them finishes.
 * @typedef {Record<string, number>} LoadingState
 */
type LoadingState = Record<string, number>;

/**
 * Loading action types for reducer state management.
 * @typedef {Object} LoadingAction
 * @property {'START'} type - Start loading action
 * @property {string} key - Loading key identifier
 * @property {'STOP'} type - Stop loading action  
 * @property {string} key - Loading key identifier
 * @property {'CLEAR'} type - Clear loading action
 * @property {string} key - Loading key identifier
 * @property {'CLEAR_ALL'} type - Clear all loading action
 */
type LoadingAction =
  | { type: 'START'; key: string }
  | { type: 'STOP'; key: string }
  | { type: 'CLEAR'; key: string }
  | { type: 'CLEAR_ALL' };

/**
 * Loading context value interface providing loading state management utilities.
 * @interface LoadingContextValue
 */
export interface LoadingContextValue {
  /** 
   * Check if a specific operation is currently loading.
   * @param {string} key - The loading key identifier
   * @returns {boolean} True if the named operation has at least one active caller
   */
  isLoading: (key: string) => boolean;
  
  /** 
   * Check if any operation is currently loading in the application.
   * @returns {boolean} True if any operation is currently loading
   */
  isAnyLoading: () => boolean;
  
  /** 
   * Mark an operation as in-progress.
   * @param {string} key - The loading key identifier
   * @returns {void}
   */
  startLoading: (key: string) => void;
  
  /** 
   * Mark one caller for the operation as done (decrements counter).
   * @param {string} key - The loading key identifier
   * @returns {void}
   */
  stopLoading: (key: string) => void;
  
  /** 
   * Force-clear all callers for the named operation.
   * @param {string} key - The loading key identifier
   * @returns {void}
   */
  clearLoading: (key: string) => void;
  
  /** 
   * Force-clear every operation in the loading state.
   * @returns {void}
   */
  clearAll: () => void;
  
  /**
   * Wrap an async function so the named key is automatically started before
   * the call and stopped (even on error) when it resolves/rejects.
   * @template T
   * @param {string} key - The loading key identifier
   * @param {() => Promise<T>} fn - Async function to wrap with loading state
   * @returns {Promise<T>} Result of the async function
   */
  withLoading: <T>(key: string, fn: () => Promise<T>) => Promise<T>;
  
  /** 
   * Snapshot of the raw loading state — useful for debugging or dev-tools.
   * @type {Readonly<LoadingState>}
   */
  loadingState: Readonly<LoadingState>;
}

// ── Reducer ───────────────────────────────────────────────────────────────────

/**
 * Reducer function for managing loading state.
 * Handles START, STOP, CLEAR, and CLEAR_ALL actions for loading operations.
 * @param {LoadingState} state - Current loading state
 * @param {LoadingAction} action - Action to process
 * @returns {LoadingState} Updated loading state
 */
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

/**
 * Loading context instance for managing loading state across the application.
 * @type {React.Context<LoadingContextValue | null>}
 */
const LoadingContext = createContext<LoadingContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * LoadingProvider component that wraps the application to provide loading state management.
 * This provider manages loading states for async operations across the application.
 * @component
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components to be wrapped with loading context
 * @returns {JSX.Element} Loading context provider
 */
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

/**
 * Hook to access the loading context.
 * Provides loading state management utilities including checking loading status,
 * starting/stopping loading operations, and wrapping async functions with loading state.
 * @returns {LoadingContextValue} Loading context value with loading management utilities
 * @throws {Error} If used outside of LoadingProvider component
 * @example
 * ```tsx
 * const { isLoading, startLoading, stopLoading } = useLoading();
 * 
 * const handleSubmit = async () => {
 *   startLoading('submitForm');
 *   try {
 *     await api.submit(data);
 *   } finally {
 *     stopLoading('submitForm');
 *   }
 * };
 * ```
 */
export function useLoading(): LoadingContextValue {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error('useLoading must be used inside LoadingProvider');
  return ctx;
}
