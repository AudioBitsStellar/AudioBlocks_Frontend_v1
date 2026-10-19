import { useQuery } from '@tanstack/react-query';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';
import apiClient, { NotFoundError } from '@/lib/apiClient';
import { isPublishedRelease, type Release } from '@/lib/releases';
import { isCollectionRelease, releaseToCollection, type Collection } from '@/lib/mappers/collection';

export type { Collection } from '@/lib/mappers/collection';

// Query Keys
export const collectionKeys = {
  all: ['collections'] as const,
  explore: () => ['collections', 'explore'] as const,
  user: (userId: string) => ['collections', 'user', userId] as const,
  detail: (id: string) => ['collections', 'detail', id] as const,
};

/**
 * Collections are EP/album releases (see lib/mappers/collection.ts).
 *
 * The backend releases router is not mounted yet (AudioBlock_Backend#752),
 * so these endpoints currently 404. A 404 is treated as "no collections" for
 * lists and "not found" for details rather than surfacing an error.
 */
const EXPLORE_LIMIT = 50;
const PAGE_LIMIT = 100;

interface ReleaseListBody {
  data?: Release[];
  pagination?: { totalPages?: number };
}

function toCollections(releases: Release[]): Collection[] {
  return releases
    .filter((r) => isCollectionRelease(r) && isPublishedRelease(r))
    .sort((a, b) => Date.parse(b.releaseDate) - Date.parse(a.releaseDate))
    .map(releaseToCollection);
}

async function getReleasePage(query: string): Promise<ReleaseListBody | null> {
  try {
    const res = await apiClient.get(`/api/releases?${query}`);
    return (res.data ?? null) as ReleaseListBody | null;
  } catch (error) {
    if (error instanceof NotFoundError) return null;
    throw error;
  }
}

// Query Functions
export async function fetchExploreCollections(): Promise<Collection[]> {
  const body = await getReleasePage(`limit=${EXPLORE_LIMIT}&page=1`);
  return toCollections(body?.data ?? []);
}

/** All EP/album releases for one artist, following pagination. */
export async function fetchUserCollections(userId: string): Promise<Collection[]> {
  const releases: Release[] = [];
  let page = 1;
  let totalPages = 1;
  do {
    const body = await getReleasePage(
      `artistId=${encodeURIComponent(userId)}&limit=${PAGE_LIMIT}&page=${page}`
    );
    if (!body) break;
    releases.push(...(body.data ?? []));
    totalPages = body.pagination?.totalPages ?? 1;
    page++;
  } while (page <= totalPages);
  return toCollections(releases);
}

/** A single collection; rejects with NotFoundError for unknown, unpublished or single releases. */
export async function fetchCollectionDetail(id: string): Promise<Collection> {
  const res = await apiClient.get(`/api/releases/${encodeURIComponent(id)}`);
  const release = (res.data as { data?: Release } | null)?.data;
  if (!release || !isCollectionRelease(release) || !isPublishedRelease(release)) {
    throw new NotFoundError('Collection not found');
  }
  return releaseToCollection(release);
}

// Hooks
export function useExploreCollections() {
  return useQuery({
    queryKey: collectionKeys.explore(),
    queryFn: fetchExploreCollections,
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
  });
}

export function useUserCollections(userId: string) {
  return useQuery({
    queryKey: collectionKeys.user(userId),
    queryFn: () => fetchUserCollections(userId),
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
    enabled: !!userId,
  });
}

export function useCollectionDetail(id: string) {
  return useQuery({
    queryKey: collectionKeys.detail(id),
    queryFn: () => fetchCollectionDetail(id),
    staleTime: CACHE_DURATIONS.LONG,
    // A missing collection won't appear on retry.
    retry: (failureCount, error) => !(error instanceof NotFoundError) && failureCount < RETRY_CONFIG.IMPORTANT,
    enabled: !!id,
  });
}
