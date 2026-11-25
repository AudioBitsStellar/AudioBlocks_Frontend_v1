import { render, renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GlobalLoadingBar,
  LoadingProvider,
  useLoading,
} from '@/context/LoadingContext';

// #126: the provider now listens to the App Router pathname so loading
// states clear when the user navigates. Mock it so the suite can drive the
// pathname manually.
let mockPathname: string = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

beforeEach(() => {
  mockPathname = '/';
});

afterEach(() => {
  vi.useRealTimers();
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <LoadingProvider>{children}</LoadingProvider>
);

describe('LoadingContext', () => {
  it('throws when useLoading is used outside the provider', () => {
    expect(() => renderHook(() => useLoading())).toThrow(
      'useLoading must be used inside LoadingProvider',
    );
  });

  it('starts with nothing loading', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });
    expect(result.current.isAnyLoading()).toBe(false);
    expect(result.current.isLoading('fetch')).toBe(false);
    expect(result.current.loadingState).toEqual({});
  });

  it('startLoading and stopLoading toggle a key', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    act(() => result.current.startLoading('fetch'));
    expect(result.current.isLoading('fetch')).toBe(true);
    expect(result.current.isAnyLoading()).toBe(true);

    act(() => result.current.stopLoading('fetch'));
    expect(result.current.isLoading('fetch')).toBe(false);
    expect(result.current.loadingState).toEqual({});
  });

  it('counts concurrent callers so one stop does not cancel another', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    act(() => {
      result.current.startLoading('save');
      result.current.startLoading('save');
    });
    expect(result.current.loadingState.save).toBe(2);

    act(() => result.current.stopLoading('save'));
    expect(result.current.isLoading('save')).toBe(true);

    act(() => result.current.stopLoading('save'));
    expect(result.current.isLoading('save')).toBe(false);
  });

  it('stopLoading on a key that is not loading is a no-op', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    act(() => result.current.stopLoading('ghost'));
    expect(result.current.loadingState).toEqual({});
  });

  it('clearLoading force-clears every caller for one key', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    act(() => {
      result.current.startLoading('upload');
      result.current.startLoading('upload');
      result.current.startLoading('other');
    });

    act(() => result.current.clearLoading('upload'));

    expect(result.current.isLoading('upload')).toBe(false);
    expect(result.current.isLoading('other')).toBe(true);
  });

  it('clearAll resets every key', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    act(() => {
      result.current.startLoading('a');
      result.current.startLoading('b');
    });

    act(() => result.current.clearAll());

    expect(result.current.isAnyLoading()).toBe(false);
    expect(result.current.loadingState).toEqual({});
  });

  it('withLoading marks the key while the promise is pending and returns its value', async () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    let resolve!: (value: string) => void;
    const pending = new Promise<string>((r) => {
      resolve = r;
    });

    let promise!: Promise<string>;
    act(() => {
      promise = result.current.withLoading('load', () => pending);
    });
    expect(result.current.isLoading('load')).toBe(true);

    await act(async () => {
      resolve('payload');
      await promise;
    });

    expect(await promise).toBe('payload');
    expect(result.current.isLoading('load')).toBe(false);
  });

  it('withLoading stops the key even when the wrapped function rejects', async () => {
    const { result } = renderHook(() => useLoading(), { wrapper });

    await act(async () => {
      await expect(
        result.current.withLoading('fail', () => Promise.reject(new Error('boom'))),
      ).rejects.toThrow('boom');
    });

    expect(result.current.isLoading('fail')).toBe(false);
  });

  // ---- #126 additions ----

  it('register and clear mirror startLoading and clearLoading', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });
    act(() => result.current.register('fetch'));
    expect(result.current.isLoading('fetch')).toBe(true);
    act(() => result.current.clear('fetch'));
    expect(result.current.isLoading('fetch')).toBe(false);
  });

  it('activeNames lists every loading key', () => {
    const { result } = renderHook(() => useLoading(), { wrapper });
    act(() => {
      result.current.register('a');
      result.current.register('b');
    });
    expect([...result.current.activeNames].sort()).toEqual(['a', 'b']);
    act(() => result.current.clear('a'));
    expect(result.current.activeNames).toEqual(['b']);
  });

  it('marks keys as timedOut after 10 seconds of continuous loading', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLoading(), { wrapper });
    act(() => result.current.register('slow'));
    expect(result.current.timedOut).toEqual([]);

    act(() => {
      vi.advanceTimersByTime(10_500);
    });
    expect(result.current.timedOut).toEqual(['slow']);

    act(() => result.current.clear('slow'));
    expect(result.current.timedOut).toEqual([]);
  });

  it('clears every active loading state on route change', () => {
    const { result, rerender } = renderHook(() => useLoading(), { wrapper });
    act(() => {
      result.current.register('a');
      result.current.register('b');
    });
    expect(result.current.isAnyLoading()).toBe(true);
    // Simulate a client navigation: change the pathname and re-render.
    mockPathname = '/songs/42';
    rerender();
    expect(result.current.isAnyLoading()).toBe(false);
    expect(result.current.activeNames).toEqual([]);
  });

  it('GlobalLoadingBar renders only when a loading state is active', () => {
    const Harness = () => {
      const { register, clear } = useLoading();
      return (
        <>
          <button data-testid="start" onClick={() => register('bar')} />
          <button data-testid="stop" onClick={() => clear('bar')} />
          <GlobalLoadingBar />
        </>
      );
    };
    const { container, getByTestId } = render(
      <LoadingProvider>
        <Harness />
      </LoadingProvider>
    );
    expect(container.querySelector('[data-loading-bar]')).toBeNull();
    act(() => {
      (getByTestId('start') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-loading-bar]')).not.toBeNull();
    expect(container.querySelector('[data-loading-bar]')?.getAttribute('data-timed-out')).toBe(
      'false'
    );
    act(() => {
      (getByTestId('stop') as HTMLButtonElement).click();
    });
    expect(container.querySelector('[data-loading-bar]')).toBeNull();
  });
});
