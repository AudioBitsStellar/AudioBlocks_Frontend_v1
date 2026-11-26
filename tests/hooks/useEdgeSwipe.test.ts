import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useEdgeSwipe } from '@/hooks/useEdgeSwipe';

describe('useEdgeSwipe', () => {
  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1000);
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

  it('triggers onSwipeFromRightEdge when swiping left from the right edge zone', () => {
    const onSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onSwipeFromRightEdge: onSwipe }));

    act(() => {
      // Start at 990 (within 24px of innerWidth 1000)
      document.dispatchEvent(createTouchEvent('touchstart', { clientX: 990, clientY: 200 }));
      // Move horizontally to 920 (dx = -70, dy = 5)
      document.dispatchEvent(createTouchEvent('touchmove', { clientX: 920, clientY: 205 }));
      // End swipe
      document.dispatchEvent(createTouchEvent('touchend', { clientX: 920, clientY: 205 }));
    });

    expect(onSwipe).toHaveBeenCalledTimes(1);
  });

  it('does NOT trigger callback when swipe starts from the middle', () => {
    const onSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onSwipeFromRightEdge: onSwipe }));

    act(() => {
      // Start in the middle at 500 (not within 24px of edge)
      document.dispatchEvent(createTouchEvent('touchstart', { clientX: 500, clientY: 200 }));
      document.dispatchEvent(createTouchEvent('touchmove', { clientX: 400, clientY: 205 }));
      document.dispatchEvent(createTouchEvent('touchend', { clientX: 400, clientY: 205 }));
    });

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('does NOT trigger callback when swipe is predominantly vertical', () => {
    const onSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onSwipeFromRightEdge: onSwipe }));

    act(() => {
      // Start at edge
      document.dispatchEvent(createTouchEvent('touchstart', { clientX: 990, clientY: 200 }));
      // Move mostly vertically (dx = -15, dy = 80)
      document.dispatchEvent(createTouchEvent('touchmove', { clientX: 975, clientY: 280 }));
      document.dispatchEvent(createTouchEvent('touchend', { clientX: 975, clientY: 280 }));
    });

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('does NOT trigger callback when swipe distance is below threshold', () => {
    const onSwipe = vi.fn();
    renderHook(() => useEdgeSwipe({ onSwipeFromRightEdge: onSwipe }));

    act(() => {
      document.dispatchEvent(createTouchEvent('touchstart', { clientX: 990, clientY: 200 }));
      // Move only 20px (threshold is 40px)
      document.dispatchEvent(createTouchEvent('touchmove', { clientX: 970, clientY: 200 }));
      document.dispatchEvent(createTouchEvent('touchend', { clientX: 970, clientY: 200 }));
    });

    expect(onSwipe).not.toHaveBeenCalled();
  });

  it('removes event listeners on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener');
    const { unmount } = renderHook(() => useEdgeSwipe({ onSwipeFromRightEdge: vi.fn() }));

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchmove', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('touchend', expect.any(Function));
  });
});
