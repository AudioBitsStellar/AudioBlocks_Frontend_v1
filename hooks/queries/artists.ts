import { useQuery } from '@tanstack/react-query';
import { unwrapPaginated } from '@/lib/api/unwrap';
import apiClient from '@/lib/apiClient';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';

export interface ArtistListItem {
  id: string;
  name?: string | null;
  username?: string | null;
  profileImage?: string | null;
  pageCover?: string | null;
  isVerified?: boolean;
}

export interface PaginatedArtists {
  items: ArtistListItem[];
  total: number;
}

export const artistKeys = {
  all: ['artists'] as const,
  page: (page: number, limit: number) => ['artists', 'page', page, limit] as const,
};

export async function fetchArtists(page: number, limit: number): Promise<PaginatedArtists> {
  const response = await apiClient.get(`/api/artist?page=${page}&limit=${limit}`);
  const { items, pagination } = unwrapPaginated<ArtistListItem>(response);
  const total = Number(pagination.total);

  if (!Number.isFinite(total) || total < 0) {
    throw new Error('The artists response did not include a valid total count.');
  }

  return { items, total };
}

export function useArtists(page: number, limit = 12) {
  return useQuery({
    queryKey: artistKeys.page(page, limit),
    queryFn: () => fetchArtists(page, limit),
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
  });
}
