import { useQuery } from '@tanstack/react-query';
import { CACHE_DURATIONS, RETRY_CONFIG } from '@/lib/constants';

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
  socialLinks?: Record<string, string>;
  followers: number;
  following: number;
  /** ISO timestamp of last profile update, used to cache-bust the avatar URL. */
  updatedAt: string;
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
  socialLinks: { twitter: 'https://twitter.com/alexiastephen' },
  followers: 1234,
  following: 567,
  updatedAt: '2024-03-15T10:30:00Z',
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
export async function fetchUserProfile(userId: string): Promise<UserProfile> {
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

/** Appends a cache-busting version param derived from the profile's last update time. */
export function getVersionedAvatarUrl(avatar: string, updatedAt: string): string {
  const version = encodeURIComponent(updatedAt);
  const separator = avatar.includes('?') ? '&' : '?';
  return `${avatar}${separator}v=${version}`;
}

/** Derives up to two initials from a display name, for use as an avatar fallback. */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return `${first}${last}`.toUpperCase();
}

// Hooks
export function useUserProfile(userId: string, currentUserId?: string) {
  const query = useQuery({
    queryKey: userKeys.profile(userId),
    queryFn: () => fetchUserProfile(userId),
    staleTime: CACHE_DURATIONS.MEDIUM,
    retry: RETRY_CONFIG.DEFAULT,
    enabled: !!userId,
    // Stale-while-revalidate: keep showing the last known profile while a
    // background refetch is in flight instead of flashing a loading state.
    placeholderData: (previousData) => previousData,
  });

  return {
    ...query,
    avatarUrl: query.data ? getVersionedAvatarUrl(query.data.avatar, query.data.updatedAt) : undefined,
    initials: query.data ? getInitials(query.data.name) : undefined,
    isCurrentUser: !!currentUserId && currentUserId === userId,
  };
}

export function useUserActivity(userId: string) {
  return useQuery({
    queryKey: userKeys.activity(userId),
    queryFn: () => fetchUserActivity(userId),
    staleTime: CACHE_DURATIONS.SHORT,
    retry: RETRY_CONFIG.DEFAULT,
    enabled: !!userId,
  });
}
