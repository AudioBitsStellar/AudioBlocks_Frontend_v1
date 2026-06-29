import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getLeaderboard, castVote, getMyVotes, CommunityArtist } from '@/lib/communityService';

export function useArtistLeaderboard() {
  return useQuery<CommunityArtist[]>({
    queryKey: ['community-leaderboard'],
    queryFn: getLeaderboard,
    staleTime: 1000 * 30,
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
    queryKey: ['community-my-votes'],
    queryFn: getMyVotes,
    staleTime: 1000 * 60 * 5,
  });
}
