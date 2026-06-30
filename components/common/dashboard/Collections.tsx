'use client';
import Image from 'next/image';
import Slider from 'react-slick';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useSectionData } from '@/hooks/useSectionData';
import { getCarouselSettings } from './carouselSettings';
import { collectionsData } from './data';

function fetchCollections() {
  return new Promise<typeof collectionsData>((resolve) => {
    setTimeout(() => resolve(collectionsData), 200);
  });
}

const Skeleton = () => (
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

type Props = {
  searchQuery?: string;
  activeGenre?: string;
};

const Collections = ({ searchQuery = '', activeGenre = 'All' }: Props) => {
  const { data, isLoading, isError, isEmpty } = useSectionData({
    queryKey: ['dashboard-collections', searchQuery, activeGenre],
    fetchFn: fetchCollections,
  });

  const filtered = data.filter((item) => {
    const matchesSearch = !searchQuery ||
      item.song.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.artist.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <section>
      <div className="flex justify-between items-center pb-6 border-b">
        <h1 className="text-2xl font-semibold text-on-muted font-poppins leading-tight tracking-tight">
          Collections
        </h1>
        <Link
          href="/dashboard/all-collections"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
        >
          <ArrowUpRight className="w-5 h-5" />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-400">
          Failed to load collections. Please try again later.
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-muted">
          {searchQuery ? 'No collections match your search.' : 'No collections available yet.'}
        </p>
      ) : (
        <div className="relative py-4 overflow-hidden">
          <Slider {...getCarouselSettings()} aria-roledescription="carousel" aria-label="Collections carousel">
            {filtered.map((item, index) => (
              <div key={index} className="px-4">
                <div className="w-full h-40 rounded-lg overflow-hidden mx-auto">
                  <Image
                    src={item.image}
                    alt={item.song}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/tech.jpg'; }}
                  />
                </div>
                <div className="py-2 text-center md:text-left text-white">
                  <p className="text-sm font-bold">{item.song}</p>
                  <p className="text-xs text-on-muted font-normal">{item.artist}</p>
                  <p className="text-sm font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      )}
    </section>
  );
};

export default Collections;
