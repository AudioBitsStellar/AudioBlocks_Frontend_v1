import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useLocalStorage } from '@/hooks/useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('returns defaultValue when no stored value exists', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 42));
    expect(result.current[0]).toBe(42);
  });

  it('reads an existing value from localStorage', () => {
    localStorage.setItem('existing', JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => useLocalStorage('existing', {}));
    expect(result.current[0]).toEqual({ a: 1 });
  });

  it('writes to localStorage when setValue is called', () => {
    const { result } = renderHook(() => useLocalStorage('write-key', 'init'));

    act(() => result.current[1]('hello'));

    expect(result.current[0]).toBe('hello');
    expect(localStorage.getItem('write-key')).toBe('"hello"');
  });

  it('removes the key from localStorage when set to null', () => {
    localStorage.setItem('rm-key', '"val"');
    const { result } = renderHook(() => useLocalStorage('rm-key', 'default'));

    act(() => result.current[1](null));

    expect(result.current[0]).toBe('default');
    expect(localStorage.getItem('rm-key')).toBeNull();
  });

  it('uses custom serializer/deserializer', () => {
    const serialize = (v: number) => String(v);
    const deserialize = (s: string) => Number(s) * 2;

    localStorage.setItem('custom', '10');
    const { result } = renderHook(() =>
      useLocalStorage('custom', 0, { serialize, deserialize }),
    );

    expect(result.current[0]).toBe(20);

    act(() => result.current[1](5));
    expect(localStorage.getItem('custom')).toBe('5');
  });

  it('falls back to default on corrupt JSON', () => {
    localStorage.setItem('corrupt', '{not json');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = renderHook(() => useLocalStorage('corrupt', 'fallback'));

    expect(result.current[0]).toBe('fallback');
    consoleSpy.mockRestore();
  });
});
