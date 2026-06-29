import { useQuery } from '@tanstack/react-query';

// Query Keys
export const trackKeys = {
  all: ['tracks'] as const,
  detail: (id: string) => ['tracks', 'detail', id] as const,
  trending: () => ['tracks', 'trending'] as const,
  search: (query: string) => ['tracks', 'search', query] as const,
};

// Types
export interface Track {
  id: string;
  title: string;
  artist: string;
  cover: string;
  duration: number;
  genre?: string;
}

// Mock data for reference pattern
const mockTracks: Track[] = [
  {
    id: 'track-1',
    title: 'Relax and Unwind',
    artist: 'Rozé',
    cover: '/AFRO.jpg',
    duration: 240,
    genre: 'Afrobeats',
  },
  {
    id: 'track-2',
    title: 'Vibe Mix',
    artist: 'Yemi Sax',
    cover: '/AFRO.jpg',
    duration: 180,
    genre: 'Afrobeats',
  },
];

// Query Functions
async function fetchTrackDetail(id: string): Promise<Track> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get(`/api/tracks/${id}`);
  // return res.data;
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const track = mockTracks.find((t) => t.id === id);
      if (track) resolve(track);
      else reject(new Error('Track not found'));
    }, 300);
  });
}

async function fetchTrendingTracks(): Promise<Track[]> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get('/api/tracks/trending');
  // return res.data;
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockTracks), 300);
  });
}

async function searchTracks(query: string): Promise<Track[]> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get(`/api/tracks/search?q=${query}`);
  // return res.data;
  
  return new Promise((resolve) => {
    setTimeout(() => {
      const filtered = mockTracks.filter((t) =>
        t.title.toLowerCase().includes(query.toLowerCase()) ||
        t.artist.toLowerCase().includes(query.toLowerCase())
      );
      resolve(filtered);
    }, 300);
  });
}

// Hooks
export function useTrackDetail(id: string) {
  return useQuery({
    queryKey: trackKeys.detail(id),
    queryFn: () => fetchTrackDetail(id),
    staleTime: 1000 * 60 * 10,
    retry: 2,
    enabled: !!id,
  });
}

export function useTrendingTracks() {
  return useQuery({
    queryKey: trackKeys.trending(),
    queryFn: fetchTrendingTracks,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

export function useSearchTracks(query: string) {
  return useQuery({
    queryKey: trackKeys.search(query),
    queryFn: () => searchTracks(query),
    staleTime: 1000 * 60 * 2,
    retry: 1,
    enabled: query.length > 2,
  });
}
