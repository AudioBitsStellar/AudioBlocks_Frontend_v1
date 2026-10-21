'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { useCollections } from '@/hooks/queries/collections';

const ITEMS_PER_PAGE = 12;

function pageFromSearch(search: string | null): number {
  const parsedPage = Number(search);
  return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function AllCollectionsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = pageFromSearch(searchParams.get('page'));
  const { data, error, isError, isLoading, refetch } = useCollections(currentPage, ITEMS_PER_PAGE);
  const totalPages = Math.ceil((data?.total ?? 0) / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen text-white">
      <div className="mb-4 text-sm text-on-muted">
        <Link className="transition-colors hover:text-white" href="/dashboard">
          Dashboard
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">All Collections</span>
      </div>

      <div className="mb-8 flex items-center gap-4">
        <Link href="/dashboard">
          <Button
            className="border-border-dark bg-surface-input text-on-muted hover:bg-surface-hover"
            size="icon"
            variant="outline"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="font-poppins text-2xl font-semibold text-white">All Collections</h1>
      </div>

      {isLoading ? (
        <div
          aria-label="Loading collections"
          className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4"
          role="status"
        >
          {Array.from({ length: ITEMS_PER_PAGE }, (_, index) => (
            <div key={index} className="space-y-3 p-3">
              <Skeleton className="aspect-square w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div aria-live="polite" className="py-16 text-center">
          <p className="mb-4 text-on-muted">
            {error instanceof Error ? error.message : 'Unable to load collections.'}
          </p>
          <Button className="gap-2" variant="outline" onClick={() => void refetch()}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : data?.items.length ? (
        <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {data.items.map((collection) => (
            <Link
              key={collection.id}
              aria-label={`View ${collection.title}`}
              className="rounded-lg p-3 transition-colors hover:bg-surface-hover"
              href={`/dashboard/collection/${encodeURIComponent(collection.id)}`}
            >
              <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md">
                <ArtworkImage
                  fill
                  alt={`Cover art for ${collection.title}`}
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  src={collection.cover}
                  title={collection.title}
                />
              </div>
              <p className="text-sm font-bold text-white">{collection.title}</p>
              <p className="text-xs text-on-muted">{collection.artist || 'Unknown artist'}</p>
              <p className="text-sm font-medium text-white">
                {collection.trackCount} {collection.trackCount === 1 ? 'track' : 'tracks'}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="py-16 text-center text-on-muted">No collections to show yet.</p>
      )}

      {totalPages > 1 && !isError && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={(page) => router.push(`${pathname}?page=${page}`)}
        />
      )}
    </div>
  );
}

export default function AllCollectionsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: ITEMS_PER_PAGE }, (_, index) => (
            <Skeleton key={index} className="aspect-square w-full" />
          ))}
        </div>
      }
    >
      <AllCollectionsContent />
    </Suspense>
  );
}
