import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaderboard, castVote, getMyVotes, CommunityArtist } from '@/lib/communityService';
import { QUERY_KEYS, CACHE_DURATIONS } from '@/lib/constants';

export function useArtistLeaderboard() {
  return useQuery<CommunityArtist[]>({
    queryKey: QUERY_KEYS.COMMUNITY_LEADERBOARD,
    queryFn: getLeaderboard,
    staleTime: CACHE_DURATIONS.VERY_SHORT,
  });
}

export function useCastVote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artistId }: { artistId: string | number }) => castVote(artistId),
  });
}

export function useMyVotes() {
  return useQuery<(string | number)[]>({
    queryKey: QUERY_KEYS.COMMUNITY_MY_VOTES,
    queryFn: getMyVotes,
    staleTime: CACHE_DURATIONS.MEDIUM,
  });
}
