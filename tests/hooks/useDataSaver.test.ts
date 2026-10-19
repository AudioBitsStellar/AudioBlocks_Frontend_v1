import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDataSaver } from '@/hooks/useDataSaver';
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe('data saver', () => {
  it('respects browser saveData and observes connection changes', () => {
    const connection = Object.assign(new EventTarget(), { saveData: true });
    Object.defineProperty(navigator, 'connection', { configurable: true, value: connection });
    const { result, unmount } = renderHook(() => useDataSaver());
    expect(result.current).toBe(true);
    act(() => {
      connection.saveData = false;
      connection.dispatchEvent(new Event('change'));
    });
    expect(result.current).toBe(false);
    unmount();
    delete (navigator as Navigator & { connection?: unknown }).connection;
  });
  it('combines browser and application preferences', () => {
    localStorage.setItem('audioblocks_data_saver', 'true');
    const { result } = renderHook(() => useDataSaver());
    expect(result.current).toBe(true);
    act(() => {
      localStorage.setItem('audioblocks_data_saver', 'false');
      window.dispatchEvent(new Event('audioblocks:data-saver'));
    });
    expect(result.current).toBe(false);
  });
});
