/**
 * Per-request correlation id (#837 — OBS-05).
 *
 * Generated client-side for every outgoing API call so the same id can be
 * sent to the backend (as the `X-Request-Id` header, see `lib/apiClient.ts`)
 * and shown back to the user in error states, letting support correlate a
 * reported issue with the backend's own logs for that request.
 */
export function generateRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID (older browsers/runtimes).
  return `rid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
