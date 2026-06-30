'use client';
import Image from 'next/image';
import Slider from 'react-slick';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { useSectionData } from '@/hooks/useSectionData';
import { getCarouselSettings } from './carouselSettings';
import { artistsData } from './data';

function fetchArtists() {
  return new Promise<typeof artistsData>((resolve) => {
    setTimeout(() => resolve(artistsData), 200);
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

const Artists = ({ searchQuery = '', activeGenre = 'All' }: Props) => {
  const { data, isLoading, isError, isEmpty } = useSectionData({
    queryKey: ['dashboard-artists', searchQuery, activeGenre],
    fetchFn: fetchArtists,
  });

  const filtered = data.filter((item) => {
    const matchesSearch = !searchQuery ||
      item.song.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.artist.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = activeGenre === 'All' ||
      item.description.toLowerCase().includes(activeGenre.toLowerCase());
    return matchesSearch && matchesGenre;
  });

  return (
    <section>
      <div className="flex justify-between items-center pb-6 border-b">
        <h1 className="text-2xl font-semibold text-on-muted font-poppins leading-tight tracking-tight">
          Artists
        </h1>
        <Link
          href="/dashboard/all-artists"
          className="bg-[#1E181D] hover:bg-[#885FA8] text-[#A3A3A3] hover:text-[#1E181D] rounded-full p-3"
        >
          <ArrowUpRight className="w-5 h-5" />
        </Link>
      </div>

      {isLoading ? (
        <Skeleton />
      ) : isError ? (
        <p className="py-8 text-center text-sm text-red-400">
          Failed to load artists. Please try again later.
        </p>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-on-muted">
          {searchQuery ? 'No artists match your search.' : 'No artists available yet.'}
        </p>
      ) : (
        <div className="relative py-4 overflow-hidden">
          <Slider {...getCarouselSettings()} aria-roledescription="carousel" aria-label="Artists carousel">
            {filtered.map((artist, index) => (
              <div key={index} className="px-4">
                <div className="w-full h-40 rounded-lg overflow-hidden mx-auto">
                  <Image
                    src={artist.image}
                    alt={artist.song}
                    width={150}
                    height={150}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/tech.jpg'; }}
                  />
                </div>
                <div className="py-2 text-center md:text-left text-white">
                  <p className="text-sm font-bold">{artist.song}</p>
                  <p className="text-xs text-on-muted font-normal">{artist.artist}</p>
                  <p className="text-sm font-medium">{artist.description}</p>
                </div>
              </div>
            ))}
          </Slider>
        </div>
      )}
    </section>
  );
};

export default Artists;
