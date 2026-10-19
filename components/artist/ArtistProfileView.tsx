'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import ArtistReleases from '@/components/releases/ArtistReleases';
import { usePlayback } from '@/context/PlaybackContext';
import { getInitials } from '@/hooks/queries/users';
import {
  artistDisplayName,
  getArtistPerks,
  getArtistSongs,
  type ArtistProfile,
} from '@/lib/artistService';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { isValidProfileUrl } from '@/lib/profileService';
import { isTrackAvailable, songToTrack } from '@/lib/tracks';

/**
 * Public artist page body (#586). Everything comes from the backend: the
 * profile is passed in by the server page, and songs, releases and perks load
 * here. Nothing on this page reads contract data.
 */
export function ArtistProfileView({ artist }: { artist: ArtistProfile }) {
  const { playTracks, playTrack } = usePlayback();
  const name = artistDisplayName(artist);

  const songsQuery = useQuery({
    queryKey: ['artist-songs', artist.id],
    queryFn: () => getArtistSongs(artist.id),
  });
  const tracks = useMemo(
    () => (songsQuery.data ?? []).map((song) => songToTrack(song)),
    [songsQuery.data]
  );
  const playableTracks = useMemo(() => tracks.filter(isTrackAvailable), [tracks]);

  // Perks are behind a flag until the backend mounts the endpoint (see docs/ENVIRONMENT_VARIABLES.md).
  const perksEnabled = isFeatureEnabled('artistPerks');
  const perksQuery = useQuery({
    queryKey: ['artist-perks', artist.id],
    queryFn: () => getArtistPerks(artist.id),
    enabled: perksEnabled,
    retry: false,
  });
  const perks = perksQuery.data ?? [];

  const website = artist.website && isValidProfileUrl(artist.website) ? artist.website : null;

  return (
    <div className="mx-auto max-w-5xl pb-32">
      <header className="relative">
        <div className="h-40 md:h-56 w-full overflow-hidden bg-surface-elevated">
          {artist.pageCover && (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="" className="h-full w-full object-cover" src={artist.pageCover} />
          )}
        </div>
        <div className="flex items-end gap-4 px-4 -mt-12 md:-mt-16">
          <div
            aria-hidden="true"
            className="flex h-24 w-24 md:h-32 md:w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-background bg-surface-elevated text-2xl font-bold"
          >
            {artist.profileImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt="" className="h-full w-full object-cover" src={artist.profileImage} />
            ) : (
              getInitials(name)
            )}
          </div>
          <div className="min-w-0 pb-2">
            <h1 className="text-2xl md:text-3xl font-bold break-words">{name}</h1>
            {artist.username && <p className="text-on-muted">@{artist.username}</p>}
          </div>
        </div>

        <div className="px-4 mt-4 space-y-2">
          {artist.bio && <p className="max-w-2xl whitespace-pre-line">{artist.bio}</p>}
          <div className="flex flex-wrap gap-4 text-sm text-on-muted">
            {artist.totalStreams !== undefined && (
              <span>{artist.totalStreams.toLocaleString()} streams</span>
            )}
            {website && (
              <a
                className="underline"
                href={website}
                rel="noopener noreferrer nofollow"
                target="_blank"
              >
                Website
              </a>
            )}
          </div>
        </div>
      </header>

      <section aria-labelledby="popular-songs-heading" className="px-4 mt-10">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold" id="popular-songs-heading">
            Popular songs
          </h2>
          <button
            className="rounded-full bg-brand px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={playableTracks.length === 0}
            type="button"
            onClick={() => playTracks(playableTracks)}
          >
            Play top songs
          </button>
        </div>
        {songsQuery.isLoading ? (
          <p role="status">Loading songs…</p>
        ) : songsQuery.isError ? (
          <div role="alert">
            Unable to load songs.{' '}
            <button className="underline" type="button" onClick={() => void songsQuery.refetch()}>
              Retry
            </button>
          </div>
        ) : tracks.length === 0 ? (
          <p className="text-on-muted">No songs yet.</p>
        ) : (
          <ol className="space-y-2">
            {tracks.map((track, index) => {
              const playable = isTrackAvailable(track);
              return (
                <li key={`${track.id}-${index}`}>
                  <button
                    className="flex w-full items-center gap-3 rounded-lg border border-border-dark p-3 text-left disabled:opacity-50"
                    disabled={!playable}
                    type="button"
                    onClick={() => playTrack(track)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      className="h-12 w-12 shrink-0 rounded object-cover"
                      loading="lazy"
                      src={track.cover}
                    />
                    <span className="min-w-0 flex-1 truncate font-medium">{track.title}</span>
                    <span className="text-sm text-on-muted">
                      {playable ? 'Play' : 'Unavailable'}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className="px-4">
        <ArtistReleases artistId={artist.id} />
      </div>

      {perks.length > 0 && (
        <section aria-labelledby="fan-perks-heading" className="px-4 mt-10">
          <h2 className="mb-4 text-2xl font-semibold" id="fan-perks-heading">
            Fan perks
          </h2>
          <ul className="space-y-3">
            {perks.map((perk) => (
              <li key={perk.id} className="rounded-lg border border-border-dark p-4">
                <p className="font-semibold">{perk.title}</p>
                {perk.description && <p className="text-sm text-on-muted">{perk.description}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
