'use client';

import { useState } from 'react';
import { FiSearch } from 'react-icons/fi';
import Artists from '@/components/common/dashboard/Artists';
import CategorySection from '@/components/common/dashboard/CategorySection';
import Collections from '@/components/common/dashboard/Collections';
import EventSection from '@/components/common/dashboard/EventSection';
import Merch from '@/components/common/dashboard/Merch';
import RecentlyPlayed from '@/components/common/dashboard/RecentlyPlayed';

const genreFilters = ['All', 'Pop', 'Contemporary', 'Rock', 'Afro', 'Jazz'];

const ExplorePage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('All');

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <p className="text-xs font-medium text-left text-white mb-1">Explore</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-transparent border border-border-dark rounded-full px-4 py-2 w-full sm:max-w-xs">
            <FiSearch className="text-on-muted text-lg shrink-0" aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search collections, artists..."
              aria-label="Search explore page"
              className="ml-3 w-full bg-transparent outline-none text-sm text-gray-200 placeholder:text-on-muted"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {genreFilters.map((genre) => (
              <button
                key={genre}
                aria-pressed={activeGenre === genre}
                className={`px-4 py-1 font-medium cursor-pointer text-sm rounded-2xl border ${
                  activeGenre === genre ? 'bg-brand text-white border-brand' : 'bg-surface-input text-on-muted border-border-dark'
                }`}
                onClick={() => setActiveGenre(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      <RecentlyPlayed />

      <CategorySection />

      <Collections searchQuery={searchQuery} activeGenre={activeGenre} />

      <EventSection />

      <Artists searchQuery={searchQuery} activeGenre={activeGenre} />

      <Merch />
    </div>
  );
};

export default ExplorePage;
