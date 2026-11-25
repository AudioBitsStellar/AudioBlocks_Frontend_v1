/**
 * #106: API error class hierarchy used by `lib/apiClient` and consumer hooks.
 *
 * Every error carries a `status` (HTTP status when known, `0` for network
 * failures) and a `retryable` flag so callers can decide whether to retry
 * without parsing the error name. Rate-limit errors additionally expose the
 * parsed `Retry-After` value as milliseconds; auth errors flag the redirect
 * flow so hooks can trigger logout + sign-in without string-matching
 * messages.
 *
 * The hierarchy is additive: existing callers that catch `NetworkError`,
 * `AuthError`, `NotFoundError`, or `ApiError` from `lib/apiClient` keep
 * working - those classes are re-exported from this module so there is
 * exactly one source of truth.
 */

/** Non-2xx or no-response outcome from the API client, with a typed shape. */
export abstract class ApiClientError extends Error {
  /** HTTP status code. `0` for errors that never reached the server. */
  abstract readonly status: number;
  /** `true` when a retry has a reasonable chance of succeeding. */
  abstract readonly retryable: boolean;
  /** Correlation id echoed back by the backend, if any (#837). */
  requestId?: string;

  constructor(message: string, requestId?: string) {
    super(message);
    this.name = this.constructor.name;
    this.requestId = requestId;
  }
}

/** The request never reached the API (offline, DNS failure, CORS, timeout). */
export class NetworkError extends ApiClientError {
  readonly status = 0;
  readonly retryable = true;
  /** `true` when `navigator.onLine` reports the device is offline. */
  readonly offline: boolean;

  constructor(message = 'Network request failed', requestId?: string, offline = false) {
    super(message, requestId);
    this.offline = offline;
  }
}

/** The API rejected the request with 401. Consumers should trigger the auth flow. */
export class AuthError extends ApiClientError {
  readonly status = 401;
  readonly retryable = false;
  /** Always `true` for this error type; a hint to code that catches it. */
  readonly shouldRedirect = true;

  constructor(message = 'Session expired', requestId?: string) {
    super(message, requestId);
  }
}

/** 404 - the resource does not exist. Not retryable. */
export class NotFoundError extends ApiClientError {
  readonly status = 404;
  readonly retryable = false;

  constructor(message = 'Resource not found', requestId?: string) {
    super(message, requestId);
  }
}

/**
 * 429 - rate limit. The `Retry-After` header (seconds or HTTP-date) is parsed
 * into `retryAfterMs`; unparseable headers fall back to `null`.
 */
export class RateLimitError extends ApiClientError {
  readonly status = 429;
  readonly retryable = true;
  /** Milliseconds the caller should wait before retrying, or `null` if unknown. */
  readonly retryAfterMs: number | null;

  constructor(message = 'Rate limited', requestId?: string, retryAfterMs: number | null = null) {
    super(message, requestId);
    this.retryAfterMs = retryAfterMs;
  }
}

/** 5xx - server failure. Retryable in principle. */
export class ServerError extends ApiClientError {
  readonly status: number;
  readonly retryable = true;

  constructor(message: string, status: number, requestId?: string) {
    super(message, requestId);
    this.status = status;
  }
}

/**
 * A non-2xx response that does not match any specific category above. Kept
 * for back-compat with existing call sites that catch `ApiError` expecting a
 * status code; new code should prefer the specific subclasses.
 */
export class ApiError extends ApiClientError {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, requestId?: string) {
    super(message, requestId);
    this.status = status;
    this.retryable = status >= 500;
  }
}

/**
 * Parses an HTTP `Retry-After` header value into milliseconds. The header is
 * either an integer "seconds to wait" or an HTTP-date; everything else
 * returns `null` so the caller can pick its own fallback. Negative deltas
 * (from a date in the past) clamp to `0`.
 */
export function parseRetryAfter(header: string | null, now: Date = new Date()): number | null {
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed === '') return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.round(seconds * 1000);
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, parsed - now.getTime());
}

/**
 * Builds the right `ApiClientError` subclass for an unsuccessful `Response`.
 * The calling code already read `response.ok === false`; this helper picks
 * the type and copies the `Retry-After` header for 429s.
 */
export function errorFromResponse(response: Response, requestId?: string): ApiClientError {
  const status = response.status;
  if (status === 401) return new AuthError(undefined, requestId);
  if (status === 404) return new NotFoundError(undefined, requestId);
  if (status === 429) {
    return new RateLimitError(
      'Rate limited',
      requestId,
      parseRetryAfter(response.headers.get('Retry-After'))
    );
  }
  if (status >= 500) return new ServerError(`HTTP ${status}`, status, requestId);
  return new ApiError(`HTTP error! status: ${status}`, status, requestId);
}

/**
 * Best-effort offline detection. Returns `false` in SSR/Node environments
 * where `navigator` is undefined so a server-side request failure is never
 * misreported as "device offline".
 */
export function isOffline(): boolean {
  if (typeof navigator === 'undefined') return false;
  return navigator.onLine === false;
}

/** In development, errors go to the console so the dev tools surface them. */
export function logApiErrorInDev(error: unknown): void {
  if (typeof process === 'undefined' || process.env.NODE_ENV === 'production') return;
  // eslint-disable-next-line no-console
  console.error('[apiClient]', error);
}
