'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { SectionWrapper } from '@/components/common/dashboard/SectionWrapper';
import { QUERY_KEYS } from '@/lib/constants';
import { getExploreCollections } from '@/lib/exploreService';

type Props = {
  searchQuery?: string;
  activeGenre?: string;
};

const Collections = ({ searchQuery = '', activeGenre = 'All' }: Props) => {
  return (
    <SectionWrapper
      activeGenre={activeGenre}
      fetchFn={getExploreCollections}
      genreField={(item) => item.description}
      queryKey={QUERY_KEYS.EXPLORE_COLLECTIONS}
      renderEmpty={(query) => (
        <p className="py-8 text-center text-sm text-on-muted">
          {query ? 'No collections match your search.' : 'No collections available yet.'}
        </p>
      )}
      renderItem={(item, index) => (
        <>
          <div className="w-full h-40 rounded-lg overflow-hidden mx-auto">
            <img
              alt={item.song}
              className="w-full h-full object-cover"
              src={item.image}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/tech.jpg';
              }}
            />
          </div>
          <div className="py-2 text-center md:text-left text-white min-w-0">
            <p className="text-sm font-bold truncate">{item.song}</p>
            <p className="text-xs text-on-muted font-normal truncate">{item.artist}</p>
            <p className="text-sm font-medium truncate">{item.description}</p>
          </div>
        </>
      )}
      searchFields={(item) => [item.song, item.artist, item.description]}
      searchQuery={searchQuery}
      title="Collections"
      viewAllHref="/dashboard/all-collections"
    />
  );
};

export default Collections;
