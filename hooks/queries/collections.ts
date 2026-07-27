import { useQuery } from '@tanstack/react-query';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';

// Query Keys
export const collectionKeys = {
  all: ['collections'] as const,
  explore: () => ['collections', 'explore'] as const,
  user: (userId: string) => ['collections', 'user', userId] as const,
  detail: (id: string) => ['collections', 'detail', id] as const,
};

// Types
export interface Collection {
  id: string;
  title: string;
  artist: string;
  cover: string;
  trackCount: number;
  published: boolean;
  createdAt: string;
}

// Mock data for reference pattern
const mockCollections: Collection[] = [
  {
    id: 'col-1',
    title: 'Afrobeats Essentials',
    artist: 'Various Artists',
    cover: '/AFRO.jpg',
    trackCount: 12,
    published: true,
    createdAt: '2024-01-15',
  },
  {
    id: 'col-2',
    title: 'Chill Vibes',
    artist: 'DJ Smooth',
    cover: '/tech.jpg',
    trackCount: 8,
    published: true,
    createdAt: '2024-02-20',
  },
];

// Query Functions
async function fetchExploreCollections(): Promise<Collection[]> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get('/api/collections/explore');
  // return res.data;
  
  // Mock implementation for reference
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCollections), 300);
  });
}

async function fetchUserCollections(userId: string): Promise<Collection[]> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get(`/api/users/${userId}/collections`);
  // return res.data;
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockCollections.slice(0, 1)), 300);
  });
}

export async function fetchCollectionDetail(id: string): Promise<Collection> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get(`/api/collections/${id}`);
  // return res.data;
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const collection = mockCollections.find((c) => c.id === id);
      if (collection) resolve(collection);
      else reject(new Error('Collection not found'));
    }, 300);
  });
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
    retry: RETRY_CONFIG.IMPORTANT,
    enabled: !!id,
  });
}
