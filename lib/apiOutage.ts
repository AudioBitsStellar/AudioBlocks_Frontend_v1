/**
 * API-outage detection (#816).
 *
 * `apiClient` reports the outcome of every HTTP attempt. A network failure, a
 * timeout or a 5xx response counts as a failed attempt. Any other response
 * shows the API is reachable. After `OUTAGE_FAILURE_THRESHOLD` failures in a
 * row the app enters outage mode, and `ApiOutageBanner` shows a notice. The
 * first reachable response leaves outage mode.
 *
 * This is module state with a subscribe/getSnapshot pair, so React components
 * can read it with `useSyncExternalStore`. The module has no imports, so
 * `apiClient` can depend on it without a cycle.
 */

/** Consecutive failed attempts before the app enters outage mode. */
export const OUTAGE_FAILURE_THRESHOLD = 2;

export interface ApiOutageState {
  /** Whether the API is currently treated as unreachable. */
  readonly active: boolean;
  /** Failed attempts in a row since the last reachable response. */
  readonly consecutiveFailures: number;
}

const CLEAR_STATE: ApiOutageState = { active: false, consecutiveFailures: 0 };

let state: ApiOutageState = CLEAR_STATE;
const listeners = new Set<() => void>();

function update(next: ApiOutageState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

/** Records a failed attempt: a network error, a timeout or a 5xx response. */
export function recordApiFailure(): void {
  const consecutiveFailures = state.consecutiveFailures + 1;
  update({
    active: state.active || consecutiveFailures >= OUTAGE_FAILURE_THRESHOLD,
    consecutiveFailures,
  });
}

/** Records a reachable response, which is any status below 500. */
export function recordApiSuccess(): void {
  if (!state.active && state.consecutiveFailures === 0) return;
  update(CLEAR_STATE);
}

/** Current outage state. The object only changes identity when the state changes. */
export function getApiOutageState(): ApiOutageState {
  return state;
}

/** Calls `listener` on every change. Returns the unsubscribe function. */
export function subscribeApiOutage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Clears the outage state. Intended for tests. */
export function resetApiOutageState(): void {
  if (!state.active && state.consecutiveFailures === 0) return;
  update(CLEAR_STATE);
}
