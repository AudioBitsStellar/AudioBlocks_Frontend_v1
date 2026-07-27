import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExploreFilters } from '@/hooks/useExploreFilters';

const pushMock = vi.fn();
let currentSearch = '';

vi.mock('next/navigation', () => ({
  usePathname: () => '/explore',
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

beforeEach(() => {
  pushMock.mockClear();
  currentSearch = '';
});

describe('useExploreFilters', () => {
  it('returns default filters when the URL has no params', () => {
    const { result } = renderHook(() => useExploreFilters());
    expect(result.current.filters).toEqual({
      genre: null,
      mood: null,
      durationMin: null,
      durationMax: null,
      bpmMin: null,
      bpmMax: null,
    });
    expect(result.current.activeFilterCount).toBe(0);
  });

  it('parses filters from the URL query string', () => {
    currentSearch = 'genre=afrobeats&bpmMin=90&bpmMax=140';
    const { result } = renderHook(() => useExploreFilters());

    expect(result.current.filters.genre).toBe('afrobeats');
    expect(result.current.filters.bpmMin).toBe(90);
    expect(result.current.filters.bpmMax).toBe(140);
    expect(result.current.activeFilterCount).toBe(3);
  });

  it('pushes updated query params when a filter changes', () => {
    const { result } = renderHook(() => useExploreFilters());

    act(() => result.current.updateFilters({ genre: 'jazz' }));

    expect(pushMock).toHaveBeenCalledWith('/explore?genre=jazz', { scroll: false });
  });

  it('removes a param from the URL when reset to its default', () => {
    currentSearch = 'genre=jazz&mood=chill';
    const { result } = renderHook(() => useExploreFilters());

    act(() => result.current.updateFilters({ genre: null }));

    expect(pushMock).toHaveBeenCalledWith('/explore?mood=chill', { scroll: false });
  });

  it('clearFilters navigates back to the bare pathname', () => {
    currentSearch = 'genre=jazz';
    const { result } = renderHook(() => useExploreFilters());

    act(() => result.current.clearFilters());

    expect(pushMock).toHaveBeenCalledWith('/explore', { scroll: false });
  });

  it('honors per-consumer default filters without counting them as active', () => {
    currentSearch = 'genre=afrobeats';
    const { result } = renderHook(() => useExploreFilters({ genre: 'afrobeats' }));

    expect(result.current.filters.genre).toBe('afrobeats');
    expect(result.current.activeFilterCount).toBe(0);
  });
});
