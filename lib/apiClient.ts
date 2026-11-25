import Cookies from 'js-cookie';
import { recordApiFailure, recordApiSuccess } from './apiOutage';
import { API_CONFIG, AUTH, ERROR_MESSAGES, HTTP_STATUS, TELEMETRY } from './constants';
import { getValidatedEnv } from './env';
import {
  ApiError,
  AuthError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ServerError,
  errorFromResponse,
  isOffline,
  logApiErrorInDev,
  parseRetryAfter,
} from './errors';
import { generateRequestId } from './requestId';

const { NEXT_PUBLIC_API_URL } = getValidatedEnv();

// #106: the typed error classes moved to `lib/errors.ts` so they have a
// single home shared by the client, consumer hooks, and tests. Re-export
// from this module so existing `import { NetworkError } from '@/lib/apiClient'`
// call sites keep working without a mass-rename.
export { ApiError, AuthError, NetworkError, NotFoundError, RateLimitError, ServerError };

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let refreshPromise: Promise<string> | null = null;

/**
 * Clears the locally stored session: removes the access and refresh cookies
 * and notifies the server-side session endpoint, e.g. on logout or after a
 * failed token refresh.
 */
export function clearSession() {
  Cookies.remove(AUTH.COOKIE_NAME);
  Cookies.remove(AUTH.REFRESH_COOKIE_NAME);
  void fetch('/api/session', { method: 'DELETE' });
}

/**
 * Exchanges the current refresh cookie for a new access token. Concurrent
 * callers share a single in-flight request via `refreshPromise`.
 *
 * @returns The newly issued access token.
 */
export async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    const refreshToken = Cookies.get(AUTH.REFRESH_COOKIE_NAME);
    const response = await fetch(`${NEXT_PUBLIC_API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(refreshToken ? { refreshToken } : {}),
    });
    if (!response.ok) throw new AuthError('Session expired');
    const payload = await response.json();
    const token = payload?.user?.token ?? payload?.accessToken ?? payload?.token;
    const nextRefreshToken = payload?.user?.refreshToken ?? payload?.refreshToken;
    if (!token) throw new AuthError('Token refresh returned no access token');
    Cookies.set(AUTH.COOKIE_NAME, token, AUTH.COOKIE_OPTIONS);
    if (nextRefreshToken)
      Cookies.set(AUTH.REFRESH_COOKIE_NAME, nextRefreshToken, AUTH.COOKIE_OPTIONS);
    const sessionResponse = await fetch('/api/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!sessionResponse.ok) {
      throw new AuthError('Refreshed token could not establish a verified session');
    }
    return token;
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

async function fetchWithRetry(
  url: string,
  options: FetchOptions = {},
  retries = API_CONFIG.DEFAULT_RETRIES,
  attempt = 1
): Promise<Response> {
  const { timeout = API_CONFIG.DEFAULT_TIMEOUT, ...fetchOptions } = options;
  // #837 — read back the id `request()` already put on the headers, so every
  // error thrown below (including on retries) can carry it for display.
  const requestId = new Headers(options.headers).get(TELEMETRY.REQUEST_ID_HEADER) ?? undefined;

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  if (options.signal) {
    options.signal.addEventListener('abort', () => {
      controller.abort();
    });
  }

  const finalOptions: RequestInit = {
    ...fetchOptions,
    signal: controller.signal,
  };

  try {
    const response = await fetch(url, finalOptions);
    clearTimeout(id);
    // #816 — a server error means the API is struggling. Any other status means it answered.
    if (response.status >= HTTP_STATUS.SERVER_ERROR) recordApiFailure();
    else recordApiSuccess();

    if (!response.ok) {
      // #106: 429 retries internally while attempts remain; once exhausted
      // the typed `RateLimitError` carries the parsed Retry-After in ms so
      // callers do not have to reach into the response.
      if (response.status === HTTP_STATUS.RATE_LIMIT && attempt <= retries) {
        const retryAfterMs =
          parseRetryAfter(response.headers.get('Retry-After')) ??
          API_CONFIG.RETRY_DELAYS.RATE_LIMIT_FALLBACK;
        await delay(retryAfterMs);
        return fetchWithRetry(url, options, retries, attempt + 1);
      }
      if (response.status >= HTTP_STATUS.SERVER_ERROR && attempt <= retries) {
        const delayMs = API_CONFIG.RETRY_DELAYS.BASE_BACKOFF * Math.pow(2, attempt);
        await delay(delayMs);
        return fetchWithRetry(url, options, retries, attempt + 1);
      }

      const err = errorFromResponse(response, requestId);
      logApiErrorInDev(err);
      throw err;
    }

    return response;
  } catch (error: unknown) {
    clearTimeout(id);
    if (error instanceof Error && error.name === 'AbortError') {
      if (options.signal?.aborted) {
        throw error;
      }
      const timeoutErr = Object.assign(new Error(ERROR_MESSAGES.TIMEOUT), { requestId });
      logApiErrorInDev(timeoutErr);
      throw timeoutErr;
    }

    // #816 — a TypeError from fetch means no response arrived (network failure).
    if (error instanceof TypeError) recordApiFailure();

    if (error instanceof TypeError && attempt <= retries) {
      const delayMs = API_CONFIG.RETRY_DELAYS.BASE_BACKOFF * Math.pow(2, attempt);
      await delay(delayMs);
      return fetchWithRetry(url, options, retries, attempt + 1);
    }

    if (error instanceof TypeError) {
      // #106: tag the error with `offline` when `navigator.onLine` reports
      // the device is disconnected; the UI can then show "you are offline"
      // instead of a generic retry message.
      const netErr = new NetworkError(error.message, requestId, isOffline());
      logApiErrorInDev(netErr);
      throw netErr;
    }

    throw error;
  }
}

async function request(endpoint: string, options: FetchOptions = {}, hasRetriedAuth = false) {
  const base = endpoint.startsWith('/api/')
    ? NEXT_PUBLIC_API_URL.replace(/\/api\/?$/, '')
    : NEXT_PUBLIC_API_URL;
  const url = `${base}${endpoint}`;
  const token = Cookies.get(AUTH.COOKIE_NAME);

  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set(AUTH.TOKEN_HEADER, `${AUTH.TOKEN_PREFIX} ${token}`);
  }
  // #837 — every request gets its own correlation id, sent to the backend and
  // echoed back on thrown errors so it can be shown in error states.
  const requestId = generateRequestId();
  headers.set(TELEMETRY.REQUEST_ID_HEADER, requestId);

  let response: Response;
  try {
    response = await fetchWithRetry(url, { ...options, headers });
  } catch (error) {
    if (error instanceof AuthError && !hasRetriedAuth && endpoint !== '/api/auth/refresh') {
      try {
        const refreshedToken = await refreshAccessToken();
        headers.set(AUTH.TOKEN_HEADER, `${AUTH.TOKEN_PREFIX} ${refreshedToken}`);
        return request(endpoint, { ...options, headers }, true);
      } catch {
        clearSession();
        throw new AuthError('Session expired', error.requestId);
      }
    }
    throw error;
  }

  const data = await response.json().catch(() => null);
  return { data, status: response.status, headers: response.headers, requestId };
}

/**
 * Authenticated HTTP client for communicating with the AudioBlocks API.
 *
 * Each method applies the configured API base URL, adds the authentication
 * token from the browser cookie when available, and retries transient failures.
 */
const apiClient = {
  /**
   * Sends a GET request to an API endpoint.
   *
   * @param url - API endpoint path relative to the configured base URL.
   * @param config - Optional request and retry configuration.
   * @returns The parsed response data, status code, and response headers.
   */
  get: (url: string, config?: FetchOptions) => request(url, { ...config, method: 'GET' }),

  /**
   * Sends a POST request to an API endpoint.
   *
   * @param url - API endpoint path relative to the configured base URL.
   * @param data - Optional JSON-serializable request body.
   * @param config - Optional request and retry configuration.
   * @returns The parsed response data, status code, and response headers.
   */
  post: (url: string, data?: unknown, config?: FetchOptions) =>
    request(url, { ...config, method: 'POST', body: JSON.stringify(data) }),

  /**
   * Sends a PUT request to an API endpoint.
   *
   * @param url - API endpoint path relative to the configured base URL.
   * @param data - Optional JSON-serializable request body.
   * @param config - Optional request and retry configuration.
   * @returns The parsed response data, status code, and response headers.
   */
  put: (url: string, data?: unknown, config?: FetchOptions) =>
    request(url, { ...config, method: 'PUT', body: JSON.stringify(data) }),

  /**
   * Sends a DELETE request to an API endpoint.
   *
   * @param url - API endpoint path relative to the configured base URL.
   * @param config - Optional request and retry configuration.
   * @returns The parsed response data, status code, and response headers.
   */
  delete: (url: string, config?: FetchOptions) => request(url, { ...config, method: 'DELETE' }),
};

export default apiClient;
