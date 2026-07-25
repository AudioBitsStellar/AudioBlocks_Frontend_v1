import Cookies from 'js-cookie';
import { getValidatedEnv } from './env';

const { NEXT_PUBLIC_API_URL } = getValidatedEnv();

export class NetworkError extends Error {
  constructor(message: string = 'Network Error') {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'AuthError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string = 'Not Found') {
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

async function fetchWithRetry(url: string, options: FetchOptions = {}, retries = 3, attempt = 1): Promise<Response> {
  const { timeout = 15000, ...fetchOptions } = options;

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
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          Cookies.remove('audioblocks_jwt');
        }
        throw new AuthError();
      }
      if (response.status === 404) {
        throw new NotFoundError();
      }
      if (response.status === 429 && attempt <= retries) {
        const retryAfter = response.headers.get('Retry-After');
        const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : 1000 * Math.pow(2, attempt);
        await delay(delayMs);
        return fetchWithRetry(url, options, retries, attempt + 1);
      }
      if (response.status >= 500 && attempt <= retries) {
        const delayMs = 1000 * Math.pow(2, attempt);
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
      throw new Error('Timeout');
    }
    
    if (error instanceof TypeError && attempt <= retries) {
      const delayMs = 1000 * Math.pow(2, attempt);
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
  const token = Cookies.get('audioblocks_jwt');
  
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
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
