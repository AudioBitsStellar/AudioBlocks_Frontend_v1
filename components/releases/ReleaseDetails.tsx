import Link from 'next/link';
import PlayCollection from '@/components/music/PlayCollection';
import TrackList from '@/components/music/TrackList';
import { RELEASE_TYPES, releaseTracks, type Release } from '@/lib/releases';

export default function ReleaseDetails({ release }: { release: Release }) {
  const tracks = releaseTracks(release);
  const artist = release.artist?.name || release.artist?.username || tracks[0]?.artist || 'Artist';
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 pb-48">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end">
        {/* Backend cover hosts vary; do not send arbitrary URLs to Next's optimizer. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={`${release.title} cover`}
          className="aspect-square w-full max-w-64 rounded-xl object-cover"
          height={256}
          src={release.coverArt || '/placeholder-cover.svg'}
          width={256}
        />
        <div className="space-y-3">
          <span className="rounded-full border border-border-dark px-3 py-1 text-sm">
            {RELEASE_TYPES[release.type]}
          </span>
          <h1 className="break-words text-3xl font-bold sm:text-5xl">{release.title}</h1>
          <Link
            className="underline"
            href={`/dashboard/artist/${encodeURIComponent(release.artistId)}`}
          >
            {artist}
          </Link>
          <p>
            <time dateTime={release.releaseDate}>
              {new Date(release.releaseDate).toLocaleDateString('en', {
                dateStyle: 'long',
                timeZone: 'UTC',
              })}
            </time>{' '}
            · {tracks.length} tracks
          </p>
        </div>
      </div>
      <PlayCollection label="Play release" tracks={tracks} />
      <TrackList tracks={tracks} />
    </div>
  );
}
