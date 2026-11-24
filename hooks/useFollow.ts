'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHasAuthSession } from '@/hooks/useHasAuthSession';
import apiClient from '@/lib/apiClient';

export const FOLLOW_QUERY_KEYS = {
  all: ['follow'] as const,
  user: (userId: string) => ['follow', userId] as const,
};

export async function checkFollowStatus(userId: string): Promise<boolean> {
  const res = await apiClient.get(`/api/users/${encodeURIComponent(userId)}/following`);
  const data = res.data?.data ?? res.data;
  if (typeof data === 'boolean') {
    return data;
  }
  if (typeof data?.isFollowing === 'boolean') {
    return data.isFollowing;
  }
  return Boolean(data);
}

export async function followUser(userId: string): Promise<void> {
  await apiClient.post(`/api/users/${encodeURIComponent(userId)}/follow`);
}

export async function unfollowUser(userId: string): Promise<void> {
  await apiClient.delete(`/api/users/${encodeURIComponent(userId)}/follow`);
}

export interface UseFollowOptions {
  enabled?: boolean;
}

/**
 * Hook to manage follow state for a user/artist.
 *
 * Ensures:
 * - Follow state is fetched from the server on mount (matching server state on page load).
 * - Query key includes `targetUserId` so switching artist pages never uses stale state.
 * - Exposes `isLoading` to render loading state while initial status is being fetched.
 * - Out: Optimistic follow updates (updates state after server confirmation).
 */
export function useFollow(targetUserId: string | undefined | null, options: UseFollowOptions = {}) {
  const signedIn = useHasAuthSession();
  const queryClient = useQueryClient();
  const isEnabled = Boolean(targetUserId && signedIn && (options.enabled ?? true));

  // Query key MUST include the target user ID to prevent race conditions across pages
  const queryKey = FOLLOW_QUERY_KEYS.user(targetUserId || '');

  const query = useQuery({
    queryKey,
    queryFn: () => checkFollowStatus(targetUserId!),
    enabled: isEnabled,
    staleTime: 30_000,
    retry: 1,
  });

  const followMutation = useMutation({
    mutationFn: () => followUser(targetUserId!),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, true);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: () => unfollowUser(targetUserId!),
    onSuccess: () => {
      queryClient.setQueryData(queryKey, false);
    },
  });

  const isPending = followMutation.isPending || unfollowMutation.isPending;
  const isFollowing = query.data ?? false;
  const isLoading = isEnabled && query.isLoading;

  const toggleFollow = async () => {
    if (!targetUserId || !signedIn || isPending || isLoading) return;
    if (isFollowing) {
      await unfollowMutation.mutateAsync();
    } else {
      await followMutation.mutateAsync();
    }
  };

  return {
    isFollowing,
    isLoading,
    isPending,
    error: query.error || followMutation.error || unfollowMutation.error,
    toggleFollow,
    follow: () => followMutation.mutateAsync(),
    unfollow: () => unfollowMutation.mutateAsync(),
    refetch: query.refetch,
  };
}

export default useFollow;
