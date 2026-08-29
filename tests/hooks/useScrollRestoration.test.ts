import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

const mockSessionStorage: Record<string, string> = {};

beforeEach(() => {
  mockSessionStorage['audioblocks_scroll_positions'] = JSON.stringify({ '/test': 500 });
  vi.stubGlobal('sessionStorage', {
    getItem: vi.fn((key: string) => mockSessionStorage[key] ?? null),
    setItem: vi.fn((key: string, val: string) => {
      mockSessionStorage[key] = val;
    }),
    removeItem: vi.fn((key: string) => {
      delete mockSessionStorage[key];
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

vi.mock('next/navigation', () => ({
  usePathname: () => '/test',
}));

describe('useScrollRestoration', () => {
  it('renders without error', () => {
    expect(() => renderHook(() => useScrollRestoration())).not.toThrow();
  });

  it('clear removes the stored position', () => {
    const { result } = renderHook(() => useScrollRestoration());
    result.current.clear();
    const positions = JSON.parse(mockSessionStorage['audioblocks_scroll_positions'] || '{}');
    expect(positions['/test']).toBeUndefined();
  });

  it('save stores current scroll position', () => {
    const { result } = renderHook(() => useScrollRestoration());
    result.current.save();
    const positions = JSON.parse(mockSessionStorage['audioblocks_scroll_positions'] || '{}');
    expect(positions['/test']).toBe(0);
  });

  it('clears the saved position on a fresh (non-back) navigation', () => {
    // No popstate fired, so this is a fresh navigation — the stored position
    // must not be restored and must be cleared.
    const { result } = renderHook(() => useScrollRestoration());
    const positions = JSON.parse(mockSessionStorage['audioblocks_scroll_positions'] || '{}');
    expect(positions['/test']).toBeUndefined();
    expect(result.current).toBeDefined();
  });
});
