import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useInfiniteScroll, type UseInfiniteScrollOptions } from '@/hooks/useInfiniteScroll';

/** Minimal IntersectionObserver that records its lifecycle and lets tests fire entries. */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn(() => []);

  constructor(
    private readonly callback: IntersectionObserverCallback,
    public readonly options?: IntersectionObserverInit
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  trigger(isIntersecting = true) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver
    );
  }
}

const observers = () => FakeIntersectionObserver.instances;
const live = () => observers().filter((o) => o.disconnect.mock.calls.length === 0);
const latest = () => observers().at(-1)!;

const baseOptions = (over: Partial<UseInfiniteScrollOptions> = {}): UseInfiniteScrollOptions => ({
  onLoadMore: vi.fn(),
  hasMore: true,
  ...over,
});

/** Renders the hook and attaches a sentinel element, as a component's ref would. */
function setup(initial: UseInfiniteScrollOptions) {
  const hook = renderHook((props: UseInfiniteScrollOptions) => useInfiniteScroll(props), {
    initialProps: initial,
  });
  const sentinel = document.createElement('div');
  act(() => hook.result.current.sentinelRef(sentinel));
  return { ...hook, sentinel };
}

beforeEach(() => {
  FakeIntersectionObserver.instances = [];
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useInfiniteScroll', () => {
  it('observes the sentinel once it is attached', () => {
    const { sentinel } = setup(baseOptions());

    expect(observers()).toHaveLength(1);
    expect(latest().observe.mock.calls[0][0]).toBe(sentinel);
  });

  it('does not observe before a sentinel exists', () => {
    renderHook(() => useInfiniteScroll(baseOptions()));

    expect(observers()).toHaveLength(0);
  });

  it('loads more when the sentinel intersects and hasMore && !isLoading && enabled', () => {
    const onLoadMore = vi.fn();
    setup(baseOptions({ onLoadMore }));

    act(() => latest().trigger());

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('ignores entries that are not intersecting', () => {
    const onLoadMore = vi.fn();
    setup(baseOptions({ onLoadMore }));

    act(() => latest().trigger(false));

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it.each([
    ['isLoading', { isLoading: true }],
    ['there is no next page', { hasMore: false }],
    ['it is disabled', { enabled: false }],
  ])('does not observe or load while %s', (_label, over) => {
    const onLoadMore = vi.fn();
    setup(baseOptions({ onLoadMore, ...over }));

    expect(observers()).toHaveLength(0);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('stops observing when loading starts and resumes when it ends', () => {
    const onLoadMore = vi.fn();
    const { rerender } = setup(baseOptions({ onLoadMore }));
    const first = latest();

    rerender(baseOptions({ onLoadMore, isLoading: true }));
    expect(first.disconnect).toHaveBeenCalled();
    expect(live()).toHaveLength(0);

    rerender(baseOptions({ onLoadMore, isLoading: false }));
    expect(live()).toHaveLength(1);
    act(() => latest().trigger());
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('stops observing when hasMore turns false or the hook is disabled', () => {
    const { rerender } = setup(baseOptions());

    rerender(baseOptions({ hasMore: false }));
    expect(live()).toHaveLength(0);

    rerender(baseOptions({ hasMore: true }));
    expect(live()).toHaveLength(1);

    rerender(baseOptions({ enabled: false }));
    expect(live()).toHaveLength(0);
  });

  it('fires once per intersection, not on every re-render', () => {
    const onLoadMore = vi.fn(() => new Promise<void>(() => {})); // never settles
    const { rerender } = setup(baseOptions({ onLoadMore }));

    act(() => latest().trigger());
    rerender(baseOptions({ onLoadMore }));
    rerender(baseOptions({ onLoadMore }));

    expect(observers()).toHaveLength(1);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not start a second request while one is still pending', () => {
    const onLoadMore = vi.fn(() => new Promise<void>(() => {}));
    setup(baseOptions({ onLoadMore }));

    act(() => latest().trigger());
    act(() => latest().trigger());

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('allows another request once the pending one resolves', async () => {
    let resolve!: () => void;
    const onLoadMore = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        })
    );
    setup(baseOptions({ onLoadMore }));

    act(() => latest().trigger());
    await act(async () => {
      resolve();
    });
    act(() => latest().trigger());

    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('allows another request after the pending one rejects', async () => {
    const onLoadMore = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue(undefined);
    setup(baseOptions({ onLoadMore }));

    act(() => latest().trigger());
    await act(async () => {
      await Promise.resolve();
    });
    act(() => latest().trigger());

    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('recovers when onLoadMore throws synchronously', () => {
    const onLoadMore = vi
      .fn<() => void>()
      .mockImplementationOnce(() => {
        throw new Error('boom');
      })
      .mockImplementation(() => {});
    setup(baseOptions({ onLoadMore }));

    expect(() => act(() => latest().trigger())).not.toThrow();
    act(() => latest().trigger());

    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('always calls the latest onLoadMore without recreating the observer', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = setup(baseOptions({ onLoadMore: first }));

    rerender(baseOptions({ onLoadMore: second }));
    act(() => latest().trigger());

    expect(observers()).toHaveLength(1);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('disconnects on unmount', () => {
    const { unmount } = setup(baseOptions());
    const observer = latest();

    unmount();

    expect(observer.disconnect).toHaveBeenCalled();
  });

  it('disconnects the old observer and observes the new node when the node changes', () => {
    const { result, sentinel } = setup(baseOptions());
    const first = latest();
    const next = document.createElement('div');

    act(() => result.current.sentinelRef(next));

    expect(first.disconnect).toHaveBeenCalled();
    expect(observers()).toHaveLength(2);
    expect(latest().observe.mock.calls[0][0]).toBe(next);
    expect(first.observe.mock.calls[0][0]).toBe(sentinel);
  });

  it('disconnects when the sentinel is removed', () => {
    const { result } = setup(baseOptions());

    act(() => result.current.sentinelRef(null));

    expect(live()).toHaveLength(0);
  });

  it('keeps a stable sentinelRef across renders', () => {
    const { result, rerender } = setup(baseOptions());
    const ref = result.current.sentinelRef;

    rerender(baseOptions({ hasMore: false }));

    expect(result.current.sentinelRef).toBe(ref);
  });

  it('passes the default rootMargin and threshold to the observer', () => {
    setup(baseOptions());

    expect(latest().options).toEqual({ rootMargin: '0px 0px 200px 0px', threshold: 0 });
  });

  it('passes a custom rootMargin and threshold through', () => {
    setup(baseOptions({ rootMargin: '0px 0px 500px 0px', threshold: 0.5 }));

    expect(latest().options).toEqual({ rootMargin: '0px 0px 500px 0px', threshold: 0.5 });
  });

  it('recreates the observer when rootMargin changes', () => {
    const { rerender } = setup(baseOptions({ rootMargin: '10px' }));
    const first = latest();

    rerender(baseOptions({ rootMargin: '20px' }));

    expect(first.disconnect).toHaveBeenCalled();
    expect(latest().options?.rootMargin).toBe('20px');
  });

  it('does not crash without IntersectionObserver and never loads', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    const onLoadMore = vi.fn();

    expect(() => setup(baseOptions({ onLoadMore }))).not.toThrow();
    expect(onLoadMore).not.toHaveBeenCalled();
  });
});
