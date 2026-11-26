'use client';

import { Suspense, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Artists from '@/components/common/dashboard/Artists';
import CategorySection from '@/components/common/dashboard/CategorySection';
import Collections from '@/components/common/dashboard/Collections';
import EventSection from '@/components/common/dashboard/EventSection';
import Merch from '@/components/common/dashboard/Merch';
import PersonalizationRow from '@/components/common/dashboard/PersonalizationRow';
import { RecentlyPlayed } from '@/components/common/RecentlyPlayed';
import DataErrorBoundary from '@/components/common/DataErrorBoundary';
import { PullToRefreshIndicator } from '@/components/common/PullToRefreshIndicator';
import { ProfileCompletion } from '@/components/dashboard/ProfileCompletion';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import { useExploreFilters } from '@/hooks/useExploreFilters';
import { isFeatureEnabled } from '@/lib/featureFlags';

const genreFilters = ['All', 'Pop', 'Contemporary', 'Rock', 'Afro', 'Jazz'];

function ExploreContent() {
  useScrollRestoration('dashboard');
  const { filters, updateFilters } = useExploreFilters();
  const activeGenre = filters.genre || 'All';
  const [localSearch, setLocalSearch] = useState(filters.q || '');

  // Keep local search in sync if URL query changes (e.g. back navigation)
  useEffect(() => {
    setLocalSearch(filters.q || '');
  }, [filters.q]);

  // Debounce search update to URL (300ms) with replace to avoid history spam (#684)
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localSearch.trim();
      const currentQ = filters.q || '';
      if (trimmed !== currentQ) {
        updateFilters({ q: trimmed || null }, { replace: true });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, filters.q, updateFilters]);

  const handleGenreChange = (genre: string) => {
    updateFilters({ genre: genre === 'All' ? null : genre });
  };

  const queryClient = useQueryClient();
  // #637: sections whose backend endpoints are not live yet.
  const eventsEnabled = isFeatureEnabled('events');
  const merchEnabled = isFeatureEnabled('merch');
  const pullToRefresh = usePullToRefresh({
    onRefresh: () => queryClient.refetchQueries({ type: 'active' }),
  });

  return (
    <div>
      <PullToRefreshIndicator {...pullToRefresh} />
      <ProfileCompletion />

      <div className="flex flex-col gap-4 mb-6">
        <p className="text-xs font-medium text-left text-white mb-1">Explore</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center bg-transparent border border-border-dark rounded-full px-4 py-2 w-full sm:max-w-xs">
            <Search aria-hidden="true" className="text-on-muted text-lg shrink-0" />
            <input
              aria-label="Search explore page"
              className="ml-3 w-full bg-transparent outline-none text-sm text-gray-200 placeholder:text-on-muted"
              placeholder="Search collections, artists..."
              type="search"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {genreFilters.map((genre) => (
              <button
                key={genre}
                aria-pressed={activeGenre === genre}
                className={`px-4 py-1 font-medium cursor-pointer text-sm rounded-2xl border transition ${
                  activeGenre === genre
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface-input text-on-muted border-border-dark hover:text-white'
                }`}
                onClick={() => handleGenreChange(genre)}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/*
        Each section is isolated by a DataErrorBoundary so one failing section
        renders an inline retry UI instead of blanking the whole page. See
        docs/ERROR_BOUNDARIES.md for applying this to Collection/Community/Playlist.
      */}
      <DataErrorBoundary name="Recently Played">
        <RecentlyPlayed variant="dashboard" />
      </DataErrorBoundary>

      <DataErrorBoundary name="For You">
        <PersonalizationRow />
      </DataErrorBoundary>

      <DataErrorBoundary name="Categories">
        <CategorySection activeGenre={activeGenre} />
      </DataErrorBoundary>

      <DataErrorBoundary name="Collections">
        <Collections activeGenre={activeGenre} searchQuery={localSearch} />
      </DataErrorBoundary>

      {eventsEnabled && (
        <DataErrorBoundary name="Events">
          <EventSection />
        </DataErrorBoundary>
      )}

      <DataErrorBoundary name="Artists">
        <Artists activeGenre={activeGenre} searchQuery={localSearch} />
      </DataErrorBoundary>

      {merchEnabled && (
        <DataErrorBoundary name="Merch">
          <Merch />
        </DataErrorBoundary>
      )}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-on-muted">Loading explore...</div>}>
      <ExploreContent />
    </Suspense>
  );
}
