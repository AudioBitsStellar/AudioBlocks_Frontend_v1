'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, LoaderCircle } from 'lucide-react';
import Slider from 'react-slick';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { useSectionData } from '@/hooks/useSectionData';
import { getCarouselSettings } from './carouselSettings';

const INFINITE_SCROLL_BATCH_SIZE = 8;
const VISIBLE_COUNTS_STORAGE_KEY = 'audioblocks_explore_visible_counts';

function getSavedVisibleCount(key: string): number {
  if (typeof window === 'undefined') return INFINITE_SCROLL_BATCH_SIZE;

  try {
    const savedCounts = JSON.parse(
      window.sessionStorage.getItem(VISIBLE_COUNTS_STORAGE_KEY) ?? '{}'
    ) as Record<string, unknown>;
    const savedCount = savedCounts[key];
    return typeof savedCount === 'number' &&
      Number.isSafeInteger(savedCount) &&
      savedCount >= INFINITE_SCROLL_BATCH_SIZE
      ? savedCount
      : INFINITE_SCROLL_BATCH_SIZE;
  } catch {
    return INFINITE_SCROLL_BATCH_SIZE;
  }
}

function saveVisibleCount(key: string, count: number) {
  if (typeof window === 'undefined') return;

  try {
    const savedCounts = JSON.parse(
      window.sessionStorage.getItem(VISIBLE_COUNTS_STORAGE_KEY) ?? '{}'
    ) as Record<string, unknown>;
    window.sessionStorage.setItem(
      VISIBLE_COUNTS_STORAGE_KEY,
      JSON.stringify({ ...savedCounts, [key]: count })
    );
  } catch {
    // Session storage may be unavailable or full.
  }
}

const DEFAULT_SKELETON = (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="animate-pulse">
        <div className="w-full h-40 rounded-lg bg-gray-800" />
        <div className="py-2 space-y-1">
          <div className="h-4 w-3/4 bg-gray-800 rounded" />
          <div className="h-3 w-1/2 bg-gray-800 rounded" />
        </div>
      </div>
    ))}
  </div>
);

interface SectionWrapperProps<T> {
  title: string;
  viewAllHref?: string;
  queryKey: readonly string[];
  fetchFn: () => Promise<T[]>;
  renderEmpty: (searchQuery?: string) => React.ReactNode;
  renderItem: (item: T) => React.ReactNode;
  searchQuery?: string;
  activeGenre?: string;
  searchFields?: (item: T) => string[];
  genreField?: (item: T) => string;
  carousel?: boolean;
  infiniteScroll?: boolean;
  carouselSettings?: Record<string, unknown>;
  skeleton?: React.ReactNode;
}

export function SectionWrapper<T extends { id: string }>({
  title,
  viewAllHref,
  queryKey,
  fetchFn,
  renderEmpty,
  renderItem,
  searchQuery = '',
  activeGenre = 'All',
  searchFields,
  genreField,
  carousel = true,
  infiniteScroll = false,
  carouselSettings,
  skeleton,
}: SectionWrapperProps<T>) {
  const { data, isLoading, isError, isEmpty, refetch } = useSectionData<T>({ queryKey, fetchFn });
  const visibleCountKey = JSON.stringify(queryKey);
  const [visibleCount, setVisibleCount] = useState(INFINITE_SCROLL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingTimerRef = useRef<number | null>(null);

  const filtered = useMemo(
    () =>
      data.filter((item) => {
        const matchesSearch =
          !searchQuery ||
          searchFields?.(item).some((f) => f.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesGenre =
          activeGenre === 'All' ||
          !genreField?.(item) ||
          genreField(item).toLowerCase().includes(activeGenre.toLowerCase());
        return matchesSearch && matchesGenre;
      }),
    [data, searchQuery, activeGenre, searchFields, genreField]
  );

  useEffect(() => {
    if (!infiniteScroll) return;
    setVisibleCount(getSavedVisibleCount(visibleCountKey));
  }, [infiniteScroll, visibleCountKey]);

  useEffect(() => {
    if (!infiniteScroll) return;
    saveVisibleCount(visibleCountKey, visibleCount);
  }, [infiniteScroll, visibleCountKey, visibleCount]);

  useEffect(
    () => () => {
      if (loadingTimerRef.current !== null) {
        window.clearTimeout(loadingTimerRef.current);
      }
    },
    []
  );

  const loadMore = useCallback(() => {
    if (isLoadingMore || visibleCount >= filtered.length) return;

    setIsLoadingMore(true);
    return new Promise<void>((resolve) => {
      loadingTimerRef.current = window.setTimeout(() => {
        setVisibleCount((current) =>
          Math.min(current + INFINITE_SCROLL_BATCH_SIZE, filtered.length)
        );
        setIsLoadingMore(false);
        loadingTimerRef.current = null;
        resolve();
      }, 200);
    });
  }, [filtered.length, isLoadingMore, visibleCount]);

  const { sentinelRef } = useInfiniteScroll({
    onLoadMore: loadMore,
    hasMore: visibleCount < filtered.length,
    isLoading: isLoadingMore,
    enabled: infiniteScroll && !isLoading && !isError,
  });

  const visibleItems = infiniteScroll ? filtered.slice(0, visibleCount) : filtered;

  return (
    <section>
      <div className="flex justify-between items-center pb-6 border-b">
        <h2 className="text-2xl font-semibold text-on-muted font-poppins leading-tight tracking-tight">
          {title}
        </h2>
        {viewAllHref && (
          <Link
            aria-label={`View all ${title}`}
            className="bg-[#1E181D] hover:bg-[#885FA8] text-muted hover:text-[#1E181D] rounded-full p-3"
            href={viewAllHref}
          >
            <ArrowUpRight className="w-5 h-5" />
          </Link>
        )}
      </div>

      {isLoading ? (
        (skeleton ?? DEFAULT_SKELETON)
      ) : isError ? (
        <div className="py-8 text-center">
          <p className="text-sm text-red-400">Failed to load {title.toLowerCase()}.</p>
          {infiniteScroll && (
            <button
              className="mt-3 rounded-full border border-border-dark px-4 py-2 text-sm text-white hover:bg-surface-hover"
              type="button"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          )}
        </div>
      ) : isEmpty ? (
        renderEmpty(searchQuery)
      ) : carousel ? (
        <div className="relative py-4 overflow-hidden">
          <Slider
            {...(carouselSettings ?? getCarouselSettings())}
            aria-label={`${title} carousel`}
            aria-roledescription="carousel"
          >
            {visibleItems.map((item) => (
              <div key={item.id} className="px-4">
                {renderItem(item)}
              </div>
            ))}
          </Slider>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          {visibleItems.map((item) => (
            <div key={item.id} className="px-4">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}

      {infiniteScroll && !isLoading && !isError && !isEmpty && (
        <div aria-live="polite" className="flex min-h-12 flex-col items-center justify-center py-3">
          {isLoadingMore ? (
            <span className="flex items-center gap-2 text-sm text-on-muted">
              <LoaderCircle aria-hidden="true" className="animate-spin" size={18} />
              Loading more {title.toLowerCase()}...
            </span>
          ) : visibleCount < filtered.length ? (
            <div ref={sentinelRef} aria-hidden="true" className="h-4 w-full" />
          ) : (
            <p className="text-sm text-on-muted">You&apos;ve reached the end.</p>
          )}
        </div>
      )}
    </section>
  );
}
