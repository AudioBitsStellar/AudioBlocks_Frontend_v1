import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';

describe('usePullToRefresh', () => {
  beforeEach(() => {
    vi.stubGlobal('scrollY', 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const createTouchEvent = (
    type: string,
    touch: { clientX: number; clientY: number }
  ): TouchEvent => {
    return new TouchEvent(type, {
      bubbles: true,
      cancelable: true,
      touches: type === 'touchend' ? [] : [touch as Touch],
      changedTouches: [touch as Touch],
    });
  };

  it('triggers onRefresh when pulled down past threshold at scrollY === 0', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    await act(async () => {
      window.dispatchEvent(createTouchEvent('touchstart', { clientX: 200, clientY: 50 }));
      window.dispatchEvent(createTouchEvent('touchmove', { clientX: 200, clientY: 150 })); // deltaY = 100 > 80
      expect(result.current.pullDistance).toBe(100);
      expect(result.current.progress).toBe(1);
      expect(result.current.thresholdReached).toBe(true);

      window.dispatchEvent(createTouchEvent('touchend', { clientX: 200, clientY: 150 }));
    });

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger onRefresh when page is scrolled down (scrollY >= 10)', async () => {
    vi.stubGlobal('scrollY', 50);
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    await act(async () => {
      window.dispatchEvent(createTouchEvent('touchstart', { clientX: 200, clientY: 50 }));
      window.dispatchEvent(createTouchEvent('touchmove', { clientX: 200, clientY: 150 }));
      window.dispatchEvent(createTouchEvent('touchend', { clientX: 200, clientY: 150 }));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance).toBe(0);
  });

  it('does NOT trigger onRefresh when pull distance is less than threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    await act(async () => {
      window.dispatchEvent(createTouchEvent('touchstart', { clientX: 200, clientY: 50 }));
      window.dispatchEvent(createTouchEvent('touchmove', { clientX: 200, clientY: 90 })); // deltaY = 40 < 80
      expect(result.current.pullDistance).toBe(40);
      expect(result.current.progress).toBe(0.5);
      expect(result.current.thresholdReached).toBe(false);

      window.dispatchEvent(createTouchEvent('touchend', { clientX: 200, clientY: 90 }));
    });

    expect(onRefresh).not.toHaveBeenCalled();
    expect(result.current.pullDistance).toBe(0);
  });

  it('cancels tracking when moving horizontally rather than vertically', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => usePullToRefresh({ onRefresh, threshold: 80 }));

    await act(async () => {
      window.dispatchEvent(createTouchEvent('touchstart', { clientX: 200, clientY: 50 }));
      // Move sideways: deltaX = 100, deltaY = 20
      window.dispatchEvent(createTouchEvent('touchmove', { clientX: 300, clientY: 70 }));
    });

    expect(result.current.pullDistance).toBe(0);
  });

  it('removes window event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => usePullToRefresh({ onRefresh: vi.fn() }));

    unmount();
    expect(removeSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('touchcancel', expect.any(Function));
  });
});
