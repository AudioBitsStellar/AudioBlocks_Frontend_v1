/**
 * #112: `useExploreFilters`. The real URL round-trip (searchParams in →
 * router.push out) is tested here with the next/navigation hooks mocked so
 * we can observe writes without starting a Next.js app.
 */

import { renderHook, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useExploreFilters } from '@/hooks/useExploreFilters';

const pushMock = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => '/explore',
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  pushMock.mockReset();
  searchParams = new URLSearchParams();
});

describe('useExploreFilters (#112)', () => {
  it('parses filters from URL query params', () => {
    searchParams = new URLSearchParams('genre=house&mood=chill&bpmMin=90&bpmMax=130');
    const { result } = renderHook(() => useExploreFilters());
    expect(result.current.filters).toMatchObject({
      genre: 'house',
      mood: 'chill',
      bpmMin: 90,
      bpmMax: 130,
    });
    expect(result.current.activeFilterCount).toBe(4);
  });

  it('writing a filter calls router.push with the new query string', () => {
    const { result } = renderHook(() => useExploreFilters());
    act(() => {
      result.current.updateFilters({ genre: 'techno' });
    });
    expect(pushMock).toHaveBeenCalledWith('/explore?genre=techno', { scroll: false });
  });

  it('setting a filter back to null removes it from the URL', () => {
    searchParams = new URLSearchParams('genre=techno&mood=dark');
    const { result } = renderHook(() => useExploreFilters());
    act(() => {
      result.current.updateFilters({ genre: null });
    });
    expect(pushMock).toHaveBeenCalledWith('/explore?mood=dark', { scroll: false });
  });

  it('clearFilters pushes the pathname with no query string', () => {
    searchParams = new URLSearchParams('genre=techno&mood=dark');
    const { result } = renderHook(() => useExploreFilters());
    act(() => {
      result.current.clearFilters();
    });
    expect(pushMock).toHaveBeenCalledWith('/explore', { scroll: false });
  });

  it('activeFilterCount counts only non-default values', () => {
    searchParams = new URLSearchParams('genre=house');
    const { result } = renderHook(() => useExploreFilters({ genre: 'house' }));
    expect(result.current.activeFilterCount).toBe(0);
  });
});
