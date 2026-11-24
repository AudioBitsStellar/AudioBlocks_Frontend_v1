'use client';

import Image from 'next/image';
import Link from 'next/link';
import type { SearchResult } from '@/lib/exploreService';

export const MIN_QUERY_LENGTH = 3;
export const RESULT_GROUPS: SearchResult['type'][] = ['track', 'artist', 'collection'];

export interface ResultGroup {
  type: SearchResult['type'];
  offset: number;
  items: SearchResult[];
}

export function groupResults(results: SearchResult[]): {
  groups: ResultGroup[];
  ordered: SearchResult[];
} {
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

interface SearchOverlayResultsProps {
  groups: ResultGroup[];
  ordered: SearchResult[];
  selectedIndex: number;
  loading: boolean;
  error: Error | null;
  trimmedQuery: string;
  minQueryLength: number;
  onSelect: (title: string) => void;
  onHoverIndex: (index: number) => void;
  optionClass: (index: number) => string;
}

export function SearchOverlayResults({
  groups,
  ordered,
  selectedIndex,
  loading,
  error,
  trimmedQuery,
  minQueryLength,
  onSelect,
  onHoverIndex,
  optionClass,
}: SearchOverlayResultsProps) {
  if (!trimmedQuery) return null;

  return (
    <>
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
                  tabIndex={0}
                  onClick={() => onSelect(result.title)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSelect(result.title);
                  }}
                  onMouseEnter={() => onHoverIndex(index)}
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
                    <div className="text-white font-medium text-sm truncate">{result.title}</div>
                    <div className="text-gray-400 text-xs truncate">{result.subtitle}</div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {ordered.length === 0 && error && !loading && (
          <div className="px-4 py-8 text-center text-red-400 text-sm" role="alert">
            Search is unavailable right now. Please try again.
          </div>
        )}
        {ordered.length === 0 && !error && (loading || trimmedQuery.length >= minQueryLength) && (
          <div className="px-4 py-8 text-center text-gray-500 text-sm">
            {loading ? 'Searching...' : `No results found for "${trimmedQuery}"`}
          </div>
        )}
      </div>

      {/* #569: quick results are a preview; the full page paginates, filters and is shareable. */}
      <div className="border-t border-gray-800 px-4 py-3">
        <Link
          className="text-sm font-medium text-white hover:underline"
          href={`/search?q=${encodeURIComponent(trimmedQuery)}`}
          onClick={() => onSelect(trimmedQuery)}
        >
          See all results for &quot;{trimmedQuery}&quot;
        </Link>
      </div>
    </>
  );
}
