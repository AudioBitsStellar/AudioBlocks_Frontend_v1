'use client';

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useReducer,
  useMemo,
  useRef,
  ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';

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

  /** #126: alias for `startLoading(name)` matching the issue's documented API. */
  register: (name: string) => void;

  /** #126: alias for `clearLoading(name)` matching the issue's documented API. */
  clear: (name: string) => void;

  /** #126: names of every operation that is currently loading. For debug tooling. */
  activeNames: string[];

  /**
   * #126: names of operations that passed the 10 s timeout threshold without
   * being cleared. Consumers (the global loading bar) can show an error
   * fallback for these while keeping the rest of the loading state intact.
   */
  timedOut: string[];
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
/** #126: ms before a still-active named loading state is reported as timed-out. */
const LOADING_TIMEOUT_MS = 10_000;

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [loadingState, dispatch] = useReducer(reducer, {});
  // Track when each key first became active so the 10 s fallback is measured
  // from the first `register`, not from the most recent increment.
  const startedAtRef = useRef<Record<string, number>>({});
  const [timedOut, setTimedOut] = useReducer(
    (_: string[], next: string[]) => next,
    [] as string[]
  );

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

  // #126: clear every active loading state when the route changes. Stale keys
  // from a prior page would otherwise keep the global bar visible after the
  // navigation that caused them already unmounted the component that set them.
  // `usePathname` only re-runs on client navigations; the first value is the
  // initial path, so the first effect is a no-op.
  const pathname = usePathname();
  const previousPathRef = useRef<string | null>(null);
  useEffect(() => {
    if (previousPathRef.current !== null && previousPathRef.current !== pathname) {
      startedAtRef.current = {};
      setTimedOut([]);
      dispatch({ type: 'CLEAR_ALL' });
    }
    previousPathRef.current = pathname;
  }, [pathname]);

  // #126: keep the per-key start timestamps in sync with the active loading
  // state. A key that appears for the first time records `now`; a key that
  // drops to zero (fully stopped or cleared) is removed. Running after every
  // state change keeps the timeout watcher below from leaking entries.
  useEffect(() => {
    const started = startedAtRef.current;
    const now = Date.now();
    for (const key of Object.keys(loadingState)) {
      if (started[key] === undefined) started[key] = now;
    }
    for (const key of Object.keys(started)) {
      if ((loadingState[key] ?? 0) <= 0) delete started[key];
    }
    // Any previously timed-out keys that no longer exist drop out of the list.
    setTimedOut(timedOut.filter((name) => (loadingState[name] ?? 0) > 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingState]);

  // #126: 10 s timeout fallback. A single interval watches all active keys
  // and tags any that have outlived the threshold. The UI reads `timedOut` to
  // render an error fallback for them while leaving the underlying state
  // alone; the caller still has to clear.
  useEffect(() => {
    if (Object.keys(loadingState).length === 0) {
      if (timedOut.length > 0) setTimedOut([]);
      return;
    }
    const id = setInterval(() => {
      const now = Date.now();
      const stale = Object.keys(startedAtRef.current).filter(
        (name) => now - startedAtRef.current[name] >= LOADING_TIMEOUT_MS
      );
      // Only update when the set actually changes; identical arrays stay
      // reference-equal so dependents do not re-render on every tick.
      const changed =
        stale.length !== timedOut.length || stale.some((n) => !timedOut.includes(n));
      if (changed) setTimedOut(stale);
    }, 500);
    return () => clearInterval(id);
  }, [loadingState, timedOut]);

  const activeNames = useMemo(
    () => Object.keys(loadingState).filter((key) => (loadingState[key] ?? 0) > 0),
    [loadingState]
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
      // #126
      register: startLoading,
      clear: clearLoading,
      activeNames,
      timedOut,
    }),
    [
      isLoading,
      isAnyLoading,
      startLoading,
      stopLoading,
      clearLoading,
      clearAll,
      withLoading,
      loadingState,
      activeNames,
      timedOut,
    ],
  );

  return <LoadingContext.Provider value={value}>{children}</LoadingContext.Provider>;
}

/**
 * #126: global loading bar. Render once in the root layout; it shows a single
 * indeterminate bar across the top while any named loading state is active,
 * and switches to an error fallback for operations that have been active for
 * more than 10 seconds. A debug panel listing the active names is rendered
 * when `debug` is true (opt-in: the panel is otherwise never visible so it
 * never leaks named loading keys into production UI).
 */
export function GlobalLoadingBar({ debug = false }: { debug?: boolean } = {}) {
  const ctx = useContext(LoadingContext);
  // Rendering outside a provider should not crash the whole layout: the bar
  // just goes silent. The provider check in `useLoading` still fires for
  // code that explicitly calls the hook.
  if (!ctx) return null;
  if (ctx.activeNames.length === 0) return null;

  const hasTimedOut = ctx.timedOut.length > 0;
  return (
    <div
      aria-live="polite"
      className={
        'fixed inset-x-0 top-0 z-[60] h-1 ' +
        (hasTimedOut
          ? 'bg-red-600/80'
          : 'bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse')
      }
      data-loading-bar
      data-timed-out={hasTimedOut ? 'true' : 'false'}
      role="status"
    >
      <span className="sr-only">
        {hasTimedOut
          ? `Loading timed out for: ${ctx.timedOut.join(', ')}`
          : `Loading: ${ctx.activeNames.join(', ')}`}
      </span>
      {debug && (
        <div className="fixed top-2 right-2 bg-black/80 text-white text-xs rounded px-2 py-1 pointer-events-auto">
          <div className="font-semibold">Active loading ({ctx.activeNames.length})</div>
          <ul>
            {ctx.activeNames.map((name) => (
              <li
                key={name}
                className={ctx.timedOut.includes(name) ? 'text-red-300' : 'text-gray-200'}
              >
                {name}
                {ctx.timedOut.includes(name) ? ' (timed out)' : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
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
