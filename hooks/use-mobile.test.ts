import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

function mockMatchMedia(matches: boolean) {
  const listeners: Array<() => void> = [];
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches,
    addEventListener: (_: string, cb: () => void) => listeners.push(cb),
    removeEventListener: vi.fn(),
  }));
  return { fire: () => listeners.forEach((cb) => cb()) };
}

describe('useIsMobile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns true when viewport is below the mobile breakpoint', () => {
    mockMatchMedia(true);
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 500 });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false when viewport is at or above the mobile breakpoint', () => {
    mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it('updates when the media query change event fires', () => {
    const { fire } = mockMatchMedia(false);
    Object.defineProperty(window, 'innerWidth', { writable: true, value: 1200 });

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    Object.defineProperty(window, 'innerWidth', { writable: true, value: 400 });
    act(() => fire());

    expect(result.current).toBe(true);
  });
});
