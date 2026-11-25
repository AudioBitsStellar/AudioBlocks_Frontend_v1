/**
 * #118: `useLocalStorage` contract. The hook ships with SSR-safe
 * initialisation, cross-tab sync via the `storage` event, and `null`-removes
 * semantics; these tests pin the shape so a refactor cannot regress it.
 */

import { renderHook, act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useLocalStorage } from '@/hooks/useLocalStorage';

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe('useLocalStorage (#118)', () => {
  it('returns the default value on first render (SSR-safe shape)', () => {
    const { result } = renderHook(() => useLocalStorage<string>('key', 'fallback'));
    const [value] = result.current;
    expect(value).toBe('fallback');
  });

  it('writes the new value through to localStorage and updates state', () => {
    const { result } = renderHook(() => useLocalStorage<number>('count', 0));
    act(() => {
      result.current[1](7);
    });
    expect(result.current[0]).toBe(7);
    expect(JSON.parse(window.localStorage.getItem('count') ?? 'null')).toBe(7);
  });

  it('hydrates from an existing stored value after mount', async () => {
    window.localStorage.setItem('user', JSON.stringify({ id: 1, name: 'ada' }));
    const { result, rerender } = renderHook(() =>
      useLocalStorage<{ id: number; name: string } | null>('user', null)
    );
    // First render: default.
    expect(result.current[0]).toBeNull();
    // Rerender flushes the mount effect; hydration applies the stored value.
    rerender();
    expect(result.current[0]).toEqual({ id: 1, name: 'ada' });
  });

  it('setValue(null) removes the key from storage', () => {
    window.localStorage.setItem('clearable', JSON.stringify('x'));
    const { result } = renderHook(() => useLocalStorage<string>('clearable', ''));
    act(() => {
      result.current[1](null);
    });
    expect(window.localStorage.getItem('clearable')).toBeNull();
  });

  it('cross-tab storage event updates the value', () => {
    const { result } = renderHook(() => useLocalStorage<string>('shared', 'a'));
    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', { key: 'shared', newValue: JSON.stringify('b') })
      );
    });
    expect(result.current[0]).toBe('b');
  });

  it('supports a custom serializer / deserializer', () => {
    const { result } = renderHook(() =>
      useLocalStorage<Date>('t', new Date(0), {
        serialize: (v) => v.toISOString(),
        deserialize: (raw) => new Date(raw),
      })
    );
    act(() => {
      result.current[1](new Date('2026-11-24T00:00:00Z'));
    });
    expect(window.localStorage.getItem('t')).toBe('2026-11-24T00:00:00.000Z');
  });
});
