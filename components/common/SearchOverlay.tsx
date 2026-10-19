'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import Image from 'next/image';
import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { Clock, Loader2, Search, Trash2, X } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import type { SearchResult } from '@/lib/exploreService';

/** `useSearch` only queries once the trimmed input reaches this length. */
const MIN_QUERY_LENGTH = 3;
const RESULT_GROUPS: SearchResult['type'][] = ['track', 'artist', 'collection'];

interface ResultGroup {
  type: SearchResult['type'];
  /** Index of the group's first item in the flat keyboard-navigation order. */
  offset: number;
  items: SearchResult[];
}

/** Buckets results by type in one pass, in a fixed display order. */
function groupResults(results: SearchResult[]): { groups: ResultGroup[]; ordered: SearchResult[] } {
  const buckets = new Map<SearchResult['type'], SearchResult[]>(RESULT_GROUPS.map((t) => [t, []]));
  for (const result of results) buckets.get(result.type)?.push(result);

  const groups: ResultGroup[] = [];
  const ordered: SearchResult[] = [];
  for (const type of RESULT_GROUPS) {
    const items = buckets.get(type)!;
    if (items.length === 0) continue;
    groups.push({ type, offset: ordered.length, items });
    ordered.push(...items);
  }
  return { groups, ordered };
}

/**
 * Global search dialog (#600): Cmd/Ctrl+K toggles it, Escape closes it, arrow
 * keys move through results (or recent searches when the input is empty),
 * Enter selects, and focus returns to the previously focused element on close.
 */
export function SearchOverlay() {
  const { user } = useDynamicContext();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const { results, loading } = useSearch(query, 200);
  const { suggestions, addSearch, removeSearch, clearHistory } = useSearchHistory(user?.userId);

  const trimmedQuery = query.trim();
  const { groups, ordered } = useMemo(() => groupResults(results), [results]);
  // The options arrow keys move through: results while searching, recent searches otherwise.
  const optionCount = trimmedQuery ? ordered.length : suggestions.length;

  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((open) => {
          if (!open) previousFocusRef.current = document.activeElement as HTMLElement | null;
          return !open;
        });
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Focus, input reset and body scroll lock while open; focus restore on close.
  useEffect(() => {
    if (!isOpen) {
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
      return;
    }
    setQuery('');
    setSelectedIndex(-1);
    inputRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const submit = useCallback(
    (searchQuery: string) => {
      const value = searchQuery.trim();
      if (!value) return;
      addSearch(value);
      setIsOpen(false);
    },
    [addSearch]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      const dialog = e.currentTarget.closest('[role="dialog"]');
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }

    // Search commands belong to the searchbox. Let interactive controls in
    // history use their native Enter/arrow key behavior.
    if (e.target !== inputRef.current) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = trimmedQuery
        ? ordered[selectedIndex]?.title
        : suggestions[selectedIndex]?.query;
      submit(selected ?? query);
    }
  };

  if (!isOpen) return null;

  const optionClass = (index: number) =>
    `px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors ${
      index === selectedIndex ? 'bg-gray-800' : 'hover:bg-gray-800/50'
    }`;

  return (
    <div
      aria-label="Search overlay"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500 mr-3 shrink-0" />
          <input
            ref={inputRef}
            aria-label="Search Input"
            className="flex-1 bg-transparent border-none outline-none text-white text-lg placeholder:text-gray-500"
            placeholder="Search tracks, artists, collections..."
            role="searchbox"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(-1);
            }}
          />
          {loading && <Loader2 className="w-4 h-4 text-gray-400 animate-spin mr-2 shrink-0" />}
          <button
            aria-label="Close search overlay"
            className="p-1 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            type="button"
            onClick={() => setIsOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {trimmedQuery && (
          <div className="max-h-96 overflow-y-auto py-2" role="listbox">
            {groups.map(({ type, offset, items }) => (
              <div key={type} aria-label={`${type}s`} role="group">
                <h3 className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {type}s
                </h3>
                {items.map((result, i) => {
                  const index = offset + i;
                  return (
                    <div
                      key={result.id}
                      aria-selected={index === selectedIndex}
                      className={optionClass(index)}
                      role="option"
                      onClick={() => submit(result.title)}
                      onMouseEnter={() => setSelectedIndex(index)}
                    >
                      <div className="relative w-9 h-9 rounded overflow-hidden shrink-0 bg-gray-900">
                        <Image
                          fill
                          alt={result.title}
                          className="object-cover"
                          src={result.image || '/placeholder.svg'}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-medium text-sm truncate">
                          {result.title}
                        </div>
                        <div className="text-gray-400 text-xs truncate">{result.subtitle}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {ordered.length === 0 && (loading || trimmedQuery.length >= MIN_QUERY_LENGTH) && (
              <div className="px-4 py-8 text-center text-gray-500 text-sm">
                {loading ? 'Searching...' : `No results found for "${trimmedQuery}"`}
              </div>
            )}
          </div>
        )}

        {!trimmedQuery && suggestions.length > 0 && (
          <div className="max-h-96 overflow-y-auto py-2">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent Searches
              </span>
              <button
                aria-label="Clear search history"
                className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
                type="button"
                onClick={clearHistory}
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>
            {suggestions.map((entry, index) => (
              <div
                key={entry.query}
                aria-current={index === selectedIndex ? 'true' : undefined}
                className={`${optionClass(index)} cursor-default`}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <button
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  type="button"
                  onClick={() => submit(entry.query)}
                >
                  <Clock className="w-4 h-4 text-gray-500 shrink-0" />
                  <span className="text-gray-300 text-sm truncate">{entry.query}</span>
                </button>
                <button
                  aria-label={`Remove '${entry.query}' from history`}
                  className="rounded p-1 text-gray-500 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  type="button"
                  onClick={() => removeSearch(entry.query)}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-2 border-t border-gray-800 bg-[#0a0a0a] flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">↵</kbd>
              Select
            </span>
          </div>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded bg-gray-800 font-sans">esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  );
}

export default SearchOverlay;
