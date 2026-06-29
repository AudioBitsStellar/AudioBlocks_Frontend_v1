import { useQuery } from '@tanstack/react-query';

// Query Keys
export const userKeys = {
  all: ['users'] as const,
  profile: (userId: string) => ['users', 'profile', userId] as const,
  activity: (userId: string) => ['users', 'activity', userId] as const,
};

// Types
export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  bio?: string;
  followers: number;
  following: number;
}

export interface UserActivity {
  id: string;
  type: 'play' | 'like' | 'collection';
  trackId?: string;
  collectionId?: string;
  timestamp: string;
}

// Mock data for reference pattern
const mockUserProfile: UserProfile = {
  id: 'user-1',
  name: 'Alexia Stephen',
  avatar: '/AFRO.jpg',
  bio: 'Music enthusiast and collector',
  followers: 1234,
  following: 567,
};

const mockActivities: UserActivity[] = [
  {
    id: 'act-1',
    type: 'play',
    trackId: 'track-1',
    timestamp: '2024-03-15T10:30:00Z',
  },
  {
    id: 'act-2',
    type: 'like',
    trackId: 'track-2',
    timestamp: '2024-03-14T15:45:00Z',
  },
];

// Query Functions
async function fetchUserProfile(userId: string): Promise<UserProfile> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get(`/api/users/${userId}`);
  // return res.data;
  
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userId === 'user-1') resolve(mockUserProfile);
      else reject(new Error('User not found'));
    }, 300);
  });
}

async function fetchUserActivity(userId: string): Promise<UserActivity[]> {
  // TODO: Replace with actual API call
  // const res = await apiClient.get(`/api/users/${userId}/activity`);
  // return res.data;
  
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockActivities), 300);
  });
}

// Hooks
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: () => fetchUserProfile(userId),
    staleTime: 1000 * 60 * 10,
    retry: 1,
    enabled: !!userId,
  });
}

export function useUserActivity(userId: string) {
  return useQuery({
    queryKey: userKeys.activity(userId),
    queryFn: () => fetchUserActivity(userId),
    staleTime: 1000 * 60 * 2,
    retry: 1,
    enabled: !!userId,
  });
}
