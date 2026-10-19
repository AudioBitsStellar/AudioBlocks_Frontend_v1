import { describe, it, expect, vi, beforeEach } from 'vitest';
import apiClient from '@/lib/apiClient';
import { API_ENDPOINTS } from '@/lib/constants';
import { castVote, getLeaderboard, getMyVotes } from '@/lib/communityService';
import { ApiShapeError } from '@/lib/api/unwrap';

vi.mock('@/lib/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const mockGet = vi.mocked(apiClient.get);
const mockPost = vi.mocked(apiClient.post);

describe('communityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('requests the leaderboard endpoint', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: [] } } as never);

      await getLeaderboard();

      expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.COMMUNITY_LEADERBOARD);
    });

    it('unwraps the `data` envelope', async () => {
      const artists = [
        { id: 'a1', name: 'Mchivir', genre: 'Afro', description: '', votes: 4, image: '' },
      ];
      mockGet.mockResolvedValueOnce({ data: { data: artists } } as never);

      await expect(getLeaderboard()).resolves.toEqual(artists);
    });

    it('keeps optional fields such as followerCount absent when not returned', async () => {
      const artist = { id: 1, name: 'Wiffi', genre: 'Pop', description: '', votes: 0, image: '' };
      mockGet.mockResolvedValueOnce({ data: { data: [artist] } } as never);

      const [result] = await getLeaderboard();

      expect(result.followerCount).toBeUndefined();
    });

    it('propagates request errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('network down'));

      await expect(getLeaderboard()).rejects.toThrow('network down');
    });
  });

  describe('castVote', () => {
    it('posts the artist id to the vote endpoint', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: { artistId: 'a1', votes: 5 } } } as never);

      await castVote('a1');

      expect(mockPost).toHaveBeenCalledWith(API_ENDPOINTS.COMMUNITY_VOTE, { artistId: 'a1' });
    });

    it('returns the updated vote count', async () => {
      mockPost.mockResolvedValueOnce({ data: { data: { artistId: 7, votes: 12 } } } as never);

      await expect(castVote(7)).resolves.toEqual({ artistId: 7, votes: 12 });
    });

    it('rejects when the vote is refused', async () => {
      mockPost.mockRejectedValueOnce(new Error('already voted'));

      await expect(castVote('a1')).rejects.toThrow('already voted');
    });
  });

  describe('getMyVotes', () => {
    it('requests the current user votes', async () => {
      mockGet.mockResolvedValueOnce({ data: { data: ['a1', 2] } } as never);

      await expect(getMyVotes()).resolves.toEqual(['a1', 2]);
      expect(mockGet).toHaveBeenCalledWith(API_ENDPOINTS.COMMUNITY_MY_VOTES);
    });

    it('rejects an empty body with ApiShapeError instead of returning [] (#564)', async () => {
      mockGet.mockResolvedValueOnce({ data: null } as never);

      await expect(getMyVotes()).rejects.toBeInstanceOf(ApiShapeError);
    });

    it('propagates request errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('unauthorized'));

      await expect(getMyVotes()).rejects.toThrow('unauthorized');
    });
  });
});
