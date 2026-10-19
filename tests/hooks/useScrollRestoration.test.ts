import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MAX_SCROLL_ENTRIES, useScrollRestoration } from '@/hooks/useScrollRestoration';

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
    expect(positions['/test']).toMatchObject({ y: 0 });
  });
});

const STORAGE_KEY = 'audioblocks_scroll_positions';
const stored = () => JSON.parse(mockSessionStorage[STORAGE_KEY] || '{}');

describe('useScrollRestoration — bounded storage (#753)', () => {
  it('keeps at most MAX_SCROLL_ENTRIES positions after visiting 100 collections', () => {
    mockSessionStorage[STORAGE_KEY] = '{}';
    let id = 0;
    const { result, rerender } = renderHook(({ k }) => useScrollRestoration(k), {
      initialProps: { k: `collection-${id}` },
    });
    for (id = 0; id < 100; id += 1) {
      rerender({ k: `collection-${id}` });
      result.current.save();
    }

    const keys = Object.keys(stored());
    expect(MAX_SCROLL_ENTRIES).toBe(50);
    expect(keys).toHaveLength(50);
    // The oldest were dropped, the most recent kept.
    expect(keys).toContain('collection-99');
    expect(keys).toContain('collection-50');
    expect(keys).not.toContain('collection-49');
    expect(keys).not.toContain('collection-0');
  });

  it('treats a re-saved key as the most recent one', () => {
    mockSessionStorage[STORAGE_KEY] = '{}';
    let k = 'first';
    const { result, rerender } = renderHook(() => useScrollRestoration(k));
    result.current.save();
    for (let i = 0; i < 49; i += 1) {
      k = `other-${i}`;
      rerender();
      result.current.save();
    }
    k = 'first';
    rerender();
    result.current.save(); // touch it again
    k = 'newest';
    rerender();
    result.current.save(); // pushes one entry out, which must not be `first`

    const keys = Object.keys(stored());
    expect(keys).toHaveLength(50);
    expect(keys).toContain('first');
    expect(keys).not.toContain('other-0');
  });

  it.each([
    ['a string', '"500"'],
    ['null', 'null'],
    ['a negative number', '-20'],
    ['an object without y', '{"t":1}'],
    ['a nested object', '{"y":{"a":1}}'],
    ['an array', '[1]'],
  ])('ignores an invalid stored value (%s) without scrolling', (_label, json) => {
    mockSessionStorage[STORAGE_KEY] = `{"/test":${json}}`;
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 1;
    });

    expect(() => renderHook(() => useScrollRestoration())).not.toThrow();
    expect(scrollTo).not.toHaveBeenCalled();

    raf.mockRestore();
    scrollTo.mockRestore();
  });

  it('survives a corrupt or non-object payload', () => {
    for (const payload of ['not json', '[]', 'null', '42']) {
      mockSessionStorage[STORAGE_KEY] = payload;
      const { result, unmount } = renderHook(() => useScrollRestoration());
      expect(() => result.current.save()).not.toThrow();
      expect(Object.keys(stored())).toEqual(['/test']);
      unmount();
    }
  });

  it('drops invalid entries when saving but keeps valid ones, including the old numeric format', () => {
    mockSessionStorage[STORAGE_KEY] = JSON.stringify({ '/old': 300, '/bad': 'x', '/neg': -1 });
    const { result } = renderHook(() => useScrollRestoration());
    result.current.save();

    expect(Object.keys(stored()).sort()).toEqual(['/old', '/test']);
    expect(stored()['/old']).toMatchObject({ y: 300 });
  });

  it('still restores the saved position on back navigation (old and new formats)', () => {
    for (const value of [500, { y: 500, t: 1 }]) {
      mockSessionStorage[STORAGE_KEY] = JSON.stringify({ '/test': value });
      const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
      vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
        cb(0);
        return 1;
      });
      Object.defineProperty(document.documentElement, 'scrollHeight', {
        configurable: true,
        value: 5000,
      });

      renderHook(() => useScrollRestoration());

      expect(scrollTo).toHaveBeenCalledWith(0, 500);
      vi.restoreAllMocks();
    }
  });
});
