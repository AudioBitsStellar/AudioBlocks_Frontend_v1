import { unwrap, unwrapList } from '@/lib/api/unwrap';
import { getApiUrl } from '@/lib/apiUrl';
import type { SongResponse } from '@/lib/tracks';

/** `GET /api/users/:id/public` (AudioBlock_Backend `UserService`, public subset). */
export interface ArtistProfile {
  id: string;
  username?: string | null;
  name: string | null;
  bio: string | null;
  profileImage: string | null;
  pageCover: string | null;
  website: string | null;
  role?: 'listener' | 'artist' | 'admin';
  totalStreams?: number;
  uniqueListeners?: number;
}

/** A fan perk shown on the artist page. Fields beyond `title` are optional until the endpoint ships. */
export interface ArtistPerk {
  id: string;
  title: string;
  description?: string | null;
}

/** Display name with the same fallbacks the rest of the app uses. */
export function artistDisplayName(artist: Pick<ArtistProfile, 'name' | 'username'>): string {
  return artist.name?.trim() || artist.username?.trim() || 'Unknown artist';
}

/**
 * Public profile for `/artist/[id]`. Resolves to `null` when the account does
 * not exist, so the page can return a 404.
 */
export async function fetchArtistProfile(id: string): Promise<ArtistProfile | null> {
  const response = await fetch(getApiUrl(`users/${encodeURIComponent(id)}/public`), {
    cache: 'no-store',
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('Unable to load this artist. Please try again.');
  return unwrap<ArtistProfile>({ data: await response.json() });
}

/** Songs by an artist, in the order the backend returns them. */
export async function getArtistSongs(artistId: string): Promise<SongResponse[]> {
  const response = await fetch(
    getApiUrl(`song?artistId=${encodeURIComponent(artistId)}&limit=50`)
  );
  if (!response.ok) throw new Error('Unable to load songs.');
  return unwrapList<SongResponse>({ data: await response.json() });
}

/**
 * Fan perks for an artist. Only called when the `artistPerks` feature flag is on,
 * because the endpoint is not mounted on the backend yet.
 */
export async function getArtistPerks(artistId: string): Promise<ArtistPerk[]> {
  const response = await fetch(getApiUrl(`artists/${encodeURIComponent(artistId)}/perks`));
  if (!response.ok) throw new Error('Unable to load perks.');
  const perks = unwrapList<ArtistPerk>({ data: await response.json() });
  return perks.filter((perk) => typeof perk?.title === 'string' && perk.title.trim() !== '');
}
