import { cache } from 'react';
import { getApiUrl } from '@/lib/apiUrl';
import { songToTrack, type SongResponse } from '@/lib/tracks';

export interface Release {
  id: string;
  title: string;
  type: 'single' | 'ep' | 'album';
  artistId: string;
  artist?: { name?: string; username?: string };
  coverArt?: string;
  releaseDate: string;
  published?: boolean;
  status?: string;
  tracks: { trackNumber: number; song: SongResponse | null }[];
}
export const RELEASE_TYPES = { single: 'Single', ep: 'EP', album: 'Album' };
export function isPublishedRelease(release: Release): boolean {
  return (
    release.published !== false &&
    (!release.status || release.status === 'published') &&
    Number.isFinite(Date.parse(release.releaseDate)) &&
    Date.parse(release.releaseDate) <= Date.now()
  );
}
export function releaseTracks(release: Release) {
  return [...(release.tracks ?? [])]
    .sort((a, b) => a.trackNumber - b.trackNumber)
    .map(({ song, trackNumber }) => songToTrack(song, `${release.id}-${trackNumber}`));
}
export const getRelease = cache(async (id: string): Promise<Release | null> => {
  const response = await fetch(getApiUrl(`releases/${encodeURIComponent(id)}`), {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Unable to load this release. Please try again.');
  const body = await response.json();
  const release = body.data as Release | undefined;
  return release && isPublishedRelease(release) ? release : null;
});
export async function getArtistReleases(artistId: string): Promise<Release[]> {
  const releases: Release[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const response = await fetch(
      getApiUrl(`releases?artistId=${encodeURIComponent(artistId)}&limit=100&page=${page}`)
    );
    if (!response.ok) throw new Error('Unable to load releases.');
    const body = await response.json();
    releases.push(...(body.data ?? []));
    totalPages = body.pagination?.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return releases
    .filter(isPublishedRelease)
    .sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate));
}
