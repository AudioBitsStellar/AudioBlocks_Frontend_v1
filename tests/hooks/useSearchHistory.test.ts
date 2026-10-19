import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { SEARCH_HISTORY_STORAGE_KEY, useSearchHistory } from '@/hooks/useSearchHistory';

const STORAGE_KEY = SEARCH_HISTORY_STORAGE_KEY;

describe('useSearchHistory', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with an empty history', () => {
    const { result } = renderHook(() => useSearchHistory());
    expect(result.current.suggestions).toEqual([]);
  });

  it('adds a search to the front of the history and persists it', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.addSearch('jazz'));

    expect(result.current.suggestions).toHaveLength(1);
    expect(result.current.suggestions[0].query).toBe('jazz');
    expect(typeof result.current.suggestions[0].timestamp).toBe('number');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')[0].query).toBe('jazz');
  });

  it('trims whitespace from queries', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.addSearch('  lofi  '));

    expect(result.current.suggestions[0].query).toBe('lofi');
  });

  it('ignores empty or whitespace-only queries', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.addSearch(''));
    act(() => result.current.addSearch('   '));

    expect(result.current.suggestions).toEqual([]);
  });

  it('moves a repeated query to the top instead of duplicating it', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.addSearch('jazz'));
    act(() => result.current.addSearch('rock'));
    act(() => result.current.addSearch('jazz'));

    expect(result.current.suggestions.map((s) => s.query)).toEqual(['jazz', 'rock']);
  });

  it('keeps at most 20 entries, dropping the oldest', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => {
      for (let i = 0; i < 25; i++) {
        result.current.addSearch(`query-${i}`);
      }
    });

    expect(result.current.suggestions).toHaveLength(20);
    expect(result.current.suggestions[0].query).toBe('query-24');
    expect(result.current.suggestions[19].query).toBe('query-5');
  });

  it('clearHistory empties the history', () => {
    const { result } = renderHook(() => useSearchHistory());

    act(() => result.current.addSearch('jazz'));
    act(() => result.current.clearHistory());

    expect(result.current.suggestions).toEqual([]);
  });

  it('restores history saved by a previous session', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ query: 'saved', timestamp: 1 }]));

    const { result } = renderHook(() => useSearchHistory());

    expect(result.current.suggestions).toEqual([{ query: 'saved', timestamp: 1 }]);
  });

  it('migrates the legacy key once without assigning it to a signed-in user', () => {
    const legacy = [{ query: 'old search', timestamp: 1 }];
    localStorage.setItem('search-history', JSON.stringify(legacy));

    const { result } = renderHook(() => useSearchHistory('user-a'));

    expect(result.current.suggestions).toEqual([]);
    expect(localStorage.getItem('search-history')).toBeNull();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(legacy);
  });

  it('keeps each account history separate on the same browser', () => {
    const userA = renderHook(() => useSearchHistory('user-a'));
    act(() => userA.result.current.addSearch('private search'));
    userA.unmount();

    const userB = renderHook(() => useSearchHistory('user-b'));
    expect(userB.result.current.suggestions).toEqual([]);
    userB.unmount();

    const returningUserA = renderHook(() => useSearchHistory('user-a'));
    expect(returningUserA.result.current.suggestions.map((entry) => entry.query)).toEqual([
      'private search',
    ]);
  });

  it('removes one query and persists the remaining entries', () => {
    const { result } = renderHook(() => useSearchHistory());
    act(() => {
      result.current.addSearch('jazz');
      result.current.addSearch('rock');
    });

    act(() => result.current.removeSearch('jazz'));

    expect(result.current.suggestions.map((entry) => entry.query)).toEqual(['rock']);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      result.current.suggestions[0],
    ]);
  });
});
