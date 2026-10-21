'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { ArtworkImage } from '@/components/ui/ArtworkImage';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/Skeleton';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { useArtists } from '@/hooks/queries/artists';

const ITEMS_PER_PAGE = 12;

function pageFromSearch(search: string | null): number {
  const parsedPage = Number(search);
  return Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
}

function AllArtistsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentPage = pageFromSearch(searchParams.get('page'));
  const { data, error, isError, isLoading, refetch } = useArtists(currentPage, ITEMS_PER_PAGE);
  const totalPages = Math.ceil((data?.total ?? 0) / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen text-white">
      <div className="mb-4 text-sm text-on-muted">
        <Link className="transition-colors hover:text-white" href="/dashboard">
          Dashboard
        </Link>
        <span className="mx-2">/</span>
        <span className="text-white">All Artists</span>
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
        <h1 className="font-poppins text-2xl font-semibold text-white">All Artists</h1>
      </div>

      {isLoading ? (
        <div
          aria-label="Loading artists"
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
            {error instanceof Error ? error.message : 'Unable to load artists.'}
          </p>
          <Button className="gap-2" variant="outline" onClick={() => void refetch()}>
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
            Try again
          </Button>
        </div>
      ) : data?.items.length ? (
        <div className="mb-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
          {data.items.map((artist) => {
            const name = artist.name?.trim() || artist.username?.trim() || 'Artist';
            return (
              <Link
                key={artist.id}
                aria-label={`View ${name}`}
                className="rounded-lg p-3 transition-colors hover:bg-surface-hover"
                href={`/dashboard/artist/${encodeURIComponent(artist.id)}`}
              >
                <div className="relative mb-3 aspect-square w-full overflow-hidden rounded-md">
                  <ArtworkImage
                    fill
                    alt={`Artwork for ${name}`}
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw"
                    src={artist.profileImage || artist.pageCover}
                    title={name}
                  />
                </div>
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="flex-1 text-sm font-bold text-white">{name}</p>
                  {artist.isVerified && <VerifiedBadge size="sm" />}
                </div>
                {artist.username && <p className="text-xs text-on-muted">@{artist.username}</p>}
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="py-16 text-center text-on-muted">No artists to show yet.</p>
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

export default function AllArtistsPage() {
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
      <AllArtistsContent />
    </Suspense>
  );
}
