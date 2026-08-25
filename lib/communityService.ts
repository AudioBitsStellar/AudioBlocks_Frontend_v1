import apiClient from './apiClient';
import { API_ENDPOINTS } from './constants';

export interface CommunityArtist {
  id: string | number;
  name: string;
  image: string;
  genre: string;
  description: string;
  votes: number;
  followerCount?: number;
}

export interface LeaderboardResponse {
  artists: CommunityArtist[];
}

export async function getLeaderboard(): Promise<CommunityArtist[]> {
  const res = await apiClient.get(API_ENDPOINTS.COMMUNITY_LEADERBOARD);
  return res.data?.data ?? res.data ?? [];
}

export async function castVote(
  artistId: string | number
): Promise<{ artistId: string | number; votes: number }> {
  const res = await apiClient.post(API_ENDPOINTS.COMMUNITY_VOTE, { artistId });
  return res.data?.data ?? res.data;
}

export async function getMyVotes(): Promise<(string | number)[]> {
  const res = await apiClient.get(API_ENDPOINTS.COMMUNITY_MY_VOTES);
  return res.data?.data ?? res.data ?? [];
}
