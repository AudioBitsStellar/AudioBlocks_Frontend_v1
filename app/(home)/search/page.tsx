import { Suspense } from 'react';
import { SearchResults } from '@/components/search/SearchResults';

export const metadata = { title: 'Search' };

// useSearchParams needs a Suspense boundary so the page can still prerender.
export default function SearchPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-gray-400">Loading search…</p>}>
      <SearchResults />
    </Suspense>
  );
}
