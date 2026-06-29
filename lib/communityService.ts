import apiClient from './apiClient';

export interface CommunityArtist {
  id: string | number;
  name: string;
  image: string;
  genre: string;
  description: string;
  votes: number;
}

export interface LeaderboardResponse {
  artists: CommunityArtist[];
}

export async function getLeaderboard(): Promise<CommunityArtist[]> {
  const res = await apiClient.get('/api/community/leaderboard');
  return res.data?.data ?? res.data ?? [];
}

export async function castVote(artistId: string | number): Promise<{ artistId: string | number; votes: number }> {
  const res = await apiClient.post('/api/community/vote', { artistId });
  return res.data?.data ?? res.data;
}

export async function getMyVotes(): Promise<(string | number)[]> {
  const res = await apiClient.get('/api/community/votes/me');
  return res.data?.data ?? res.data ?? [];
}
