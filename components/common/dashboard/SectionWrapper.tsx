'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import Slider from 'react-slick';
import { useSectionData } from '@/hooks/useSectionData';
import { getCarouselSettings } from './carouselSettings';

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
  renderItem: (item: T, index: number) => React.ReactNode;
  searchQuery?: string;
  activeGenre?: string;
  searchFields?: (item: T) => string[];
  genreField?: (item: T) => string;
  carousel?: boolean;
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
  carouselSettings,
  skeleton,
}: SectionWrapperProps<T>) {
  const { data, isLoading, isError, isEmpty } = useSectionData<T>({ queryKey, fetchFn });

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
        <p className="py-8 text-center text-sm text-red-400">
          Failed to load {title.toLowerCase()}. Please try again later.
        </p>
      ) : isEmpty ? (
        renderEmpty(searchQuery)
      ) : carousel ? (
        <div className="relative py-4 overflow-hidden">
          <Slider
            {...(carouselSettings ?? getCarouselSettings())}
            aria-label={`${title} carousel`}
            aria-roledescription="carousel"
          >
            {filtered.map((item, index) => (
              <div key={item.id} className="px-4">
                {renderItem(item, index)}
              </div>
            ))}
          </Slider>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4">
          {filtered.map((item, index) => (
            <div key={item.id} className="px-4">
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
