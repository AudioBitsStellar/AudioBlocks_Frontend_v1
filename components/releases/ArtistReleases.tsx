'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getArtistReleases, RELEASE_TYPES } from '@/lib/releases';
export default function ArtistReleases({ artistId }: { artistId: string }) {
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['artist-releases', artistId],
    queryFn: () => getArtistReleases(artistId),
  });
  return (
    <section aria-label="Releases" className="my-8">
      <h2 className="mb-4 text-2xl font-semibold">Releases</h2>
      {isLoading ? (
        <p role="status">Loading releases…</p>
      ) : isError ? (
        <div role="alert">
          Unable to load releases.{' '}
          <button className="underline" type="button" onClick={() => void refetch()}>
            Retry
          </button>
        </div>
      ) : !data.length ? (
        <p className="text-on-muted">No releases yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {data.map((release) => (
            <li key={release.id}>
              <Link
                className="block rounded-lg border border-border-dark p-3"
                href={`/release/${encodeURIComponent(release.id)}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt={`${release.title} cover`}
                  className="mb-3 aspect-square w-full rounded object-cover"
                  loading="lazy"
                  src={release.coverArt || '/placeholder-cover.svg'}
                />
                <p className="font-semibold">{release.title}</p>
                <p className="text-sm text-on-muted">
                  {RELEASE_TYPES[release.type]} · {new Date(release.releaseDate).getUTCFullYear()}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
