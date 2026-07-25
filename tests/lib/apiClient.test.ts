import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import apiClient, { NetworkError, AuthError, NotFoundError, ApiError } from '../../lib/apiClient';
import Cookies from 'js-cookie';

vi.mock('js-cookie');
vi.mock('../../lib/env', () => ({
  getValidatedEnv: () => ({ NEXT_PUBLIC_API_URL: 'http://localhost:3000' })
}));

describe('apiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('categorizes 401 as AuthError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 401,
      headers: new Headers(),
    } as any);

    await expect(apiClient.get('/test')).rejects.toThrow(AuthError);
    expect(Cookies.remove).toHaveBeenCalledWith('audioblocks_jwt');
  });

  it('categorizes 404 as NotFoundError', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
    } as any);

    await expect(apiClient.get('/test')).rejects.toThrow(NotFoundError);
  });

  it('categorizes network errors as NetworkError and retries', async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError('Failed to fetch'));

    const promise = apiClient.get('/test');
    promise.catch(() => {});
    promise.catch(() => {});
    
    // Fast-forward through retries
    for (let i = 0; i < 4; i++) {
      await vi.runAllTimersAsync();
    }
    
    await expect(promise).rejects.toThrow(NetworkError);
    expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('retries on 500 errors with exponential backoff', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers(),
    } as any);

    const promise = apiClient.get('/test');
    promise.catch(() => {});
    promise.catch(() => {});
    
    for (let i = 0; i < 4; i++) {
      await vi.runAllTimersAsync();
    }
    
    await expect(promise).rejects.toThrow(ApiError);
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it('retries on 429 respecting Retry-After', async () => {
    const headers = new Headers();
    headers.set('Retry-After', '2');
    
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      headers,
    } as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => ({ success: true })
    } as any);

    const promise = apiClient.get('/test');
    promise.catch(() => {});
    
    await vi.advanceTimersByTimeAsync(2000);
    
    const response = await promise;
    expect(response.data).toEqual({ success: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('respects abort controller', async () => {
    vi.mocked(fetch).mockImplementation((url, options: any) => new Promise((resolve, reject) => {
      if (options?.signal) {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        if (options.signal.aborted) {
          reject(new DOMException('Aborted', 'AbortError'));
        }
      }
    }));
    
    const controller = new AbortController();
    const promise = apiClient.get('/test', { signal: controller.signal });
    promise.catch(() => {});
    
    controller.abort();
    
    await expect(promise).rejects.toThrow();
  });

  it('timeouts after 15 seconds', async () => {
    vi.mocked(fetch).mockImplementation((url, options: any) => new Promise((resolve, reject) => {
      if (options?.signal) {
        options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }
    }));
    
    const promise = apiClient.get('/test');
    promise.catch(() => {});
    
    await vi.advanceTimersByTimeAsync(15000);
    
    await expect(promise).rejects.toThrow('Timeout');
  });
});
