/**
 * API outage detection and handling (#816).
 *
 * Detects when the backend API becomes unavailable and signals the UI to show
 * cached content and a dismissible retry banner instead of error states.
 *
 * The outage state is tracked globally so all parts of the app can respond consistently.
 */

type OutageListener = (isOutage: boolean) => void;

let isCurrentlyOutage = false;
const outageListeners = new Set<OutageListener>();
let consecutiveFailures = 0;
const FAILURES_BEFORE_OUTAGE = 3;
const RESET_TIMEOUT_MS = 30000; // Reset consecutive failures after 30s without errors

let resetTimer: NodeJS.Timeout | null = null;

function resetConsecutiveFailures() {
  consecutiveFailures = 0;
  if (resetTimer) {
    clearTimeout(resetTimer);
    resetTimer = null;
  }
}

function scheduleFailureReset() {
  if (resetTimer) {
    clearTimeout(resetTimer);
  }
  resetTimer = setTimeout(resetConsecutiveFailures, RESET_TIMEOUT_MS);
}

/**
 * Record an API error. After enough consecutive errors, marks the API as down.
 */
export function recordApiError(error: unknown) {
  consecutiveFailures++;
  scheduleFailureReset();

  // Only switch to outage mode after multiple consecutive failures
  if (consecutiveFailures >= FAILURES_BEFORE_OUTAGE && !isCurrentlyOutage) {
    setOutageState(true);
  }
}

/**
 * Record a successful API request. Resets the failure counter.
 */
export function recordApiSuccess() {
  if (consecutiveFailures > 0 || isCurrentlyOutage) {
    consecutiveFailures = 0;
    if (resetTimer) {
      clearTimeout(resetTimer);
      resetTimer = null;
    }

    if (isCurrentlyOutage) {
      setOutageState(false);
    }
  }
}

/**
 * Set the outage state and notify all listeners.
 */
export function setOutageState(outage: boolean) {
  if (outage === isCurrentlyOutage) return;

  isCurrentlyOutage = outage;
  outageListeners.forEach((listener) => listener(outage));
}

/**
 * Check if the API is currently detected as down.
 */
export function isApiOutage(): boolean {
  return isCurrentlyOutage;
}

/**
 * Subscribe to outage state changes.
 */
export function subscribeToOutageState(listener: OutageListener): () => void {
  outageListeners.add(listener);
  return () => {
    outageListeners.delete(listener);
  };
}
