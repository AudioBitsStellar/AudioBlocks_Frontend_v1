import Cookies from 'js-cookie';
import { getValidatedEnv } from './env';
import { API_CONFIG, AUTH, ERROR_MESSAGES, HTTP_STATUS } from './constants';

const { NEXT_PUBLIC_API_URL } = getValidatedEnv();

export class NetworkError extends Error {
  constructor(message: string = ERROR_MESSAGES.NETWORK) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string = ERROR_MESSAGES.UNAUTHORIZED) {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = ERROR_MESSAGES.NOT_FOUND) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, options: FetchOptions = {}, retries = API_CONFIG.DEFAULT_RETRIES, attempt = 1): Promise<Response> {
  const { timeout = API_CONFIG.DEFAULT_TIMEOUT, ...fetchOptions } = options;

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

    if (!response.ok) {
      if (response.status === HTTP_STATUS.UNAUTHORIZED) {
        if (typeof window !== 'undefined') {
          Cookies.remove(AUTH.COOKIE_NAME);
        }
        throw new AuthError();
      }
      if (response.status === HTTP_STATUS.NOT_FOUND) {
        throw new NotFoundError();
      }
      if (response.status === HTTP_STATUS.RATE_LIMIT && attempt <= retries) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : API_CONFIG.RETRY_DELAYS.RATE_LIMIT_FALLBACK;
        await delay(delayMs);
        return fetchWithRetry(url, options, retries, attempt + 1);
      }
      if (response.status >= HTTP_STATUS.SERVER_ERROR && attempt <= retries) {
        const delayMs = API_CONFIG.RETRY_DELAYS.BASE_BACKOFF * Math.pow(2, attempt);
        await delay(delayMs);
        return fetchWithRetry(url, options, retries, attempt + 1);
      }

      throw new ApiError(`HTTP error! status: ${response.status}`, response.status);
    }

    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      if (options.signal?.aborted) {
         throw error;
      }
      throw new Error(ERROR_MESSAGES.TIMEOUT);
    }
    
    if (error instanceof TypeError && attempt <= retries) {
      const delayMs = API_CONFIG.RETRY_DELAYS.BASE_BACKOFF * Math.pow(2, attempt);
      await delay(delayMs);
      return fetchWithRetry(url, options, retries, attempt + 1);
    }

    if (error instanceof TypeError) {
      throw new NetworkError(error.message);
    }
    
    throw error;
  }
}

async function request(endpoint: string, options: FetchOptions = {}) {
  const url = `${NEXT_PUBLIC_API_URL}${endpoint}`;
  const token = Cookies.get(AUTH.COOKIE_NAME);
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set(AUTH.TOKEN_HEADER, `${AUTH.TOKEN_PREFIX} ${token}`);
  }

  const response = await fetchWithRetry(url, { ...options, headers });
  
  const data = await response.json().catch(() => null);
  return { data, status: response.status, headers: response.headers };
}

const apiClient = {
  get: (url: string, config?: FetchOptions) => request(url, { ...config, method: 'GET' }),
  post: (url: string, data?: any, config?: FetchOptions) => request(url, { ...config, method: 'POST', body: JSON.stringify(data) }),
  put: (url: string, data?: any, config?: FetchOptions) => request(url, { ...config, method: 'PUT', body: JSON.stringify(data) }),
  delete: (url: string, config?: FetchOptions) => request(url, { ...config, method: 'DELETE' }),
};

export default apiClient;
