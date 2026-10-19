import { http, HttpResponse } from 'msw';
import { describe, it, expect } from 'vitest';
import { castVote, getLeaderboard, getMyVotes } from '@/lib/communityService';
import { API_ENDPOINTS } from '@/lib/constants';
import { mockCommunityArtistsFixture, mockMyVotesFixture } from '@/mocks/fixtures/community';
import { server } from '@/mocks/server';

describe('communityService (migrated to MSW)', () => {
  describe('getLeaderboard', () => {
    it('requests the leaderboard endpoint and returns fixtures via MSW', async () => {
      await expect(getLeaderboard()).resolves.toEqual(mockCommunityArtistsFixture);
    });

    it('unwraps the `data` envelope from MSW response', async () => {
      const customArtists = [
        { id: 'a1', name: 'Mchivir', genre: 'Afro', description: '', votes: 4, image: '' },
      ];
      server.use(
        http.get(`*${API_ENDPOINTS.COMMUNITY_LEADERBOARD}`, () => {
          return HttpResponse.json({ data: customArtists });
        })
      );

      await expect(getLeaderboard()).resolves.toEqual(customArtists);
    });

    it('keeps optional fields such as followerCount absent when not returned', async () => {
      const artist = { id: 1, name: 'Wiffi', genre: 'Pop', description: '', votes: 0, image: '' };
      server.use(
        http.get(`*${API_ENDPOINTS.COMMUNITY_LEADERBOARD}`, () => {
          return HttpResponse.json([artist]);
        })
      );

      const [result] = await getLeaderboard();
      expect(result.followerCount).toBeUndefined();
    });

    it('propagates request errors through MSW', async () => {
      server.use(
        http.get(`*${API_ENDPOINTS.COMMUNITY_LEADERBOARD}`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      await expect(getLeaderboard()).rejects.toThrow();
    });
  });

  describe('castVote', () => {
    it('posts the artist id to the vote endpoint and returns votes', async () => {
      await expect(castVote('artist-1')).resolves.toEqual({
        artistId: 'artist-1',
        votes: mockCommunityArtistsFixture[0].votes + 1,
      });
    });

    it('returns the updated vote count with custom MSW handler', async () => {
      server.use(
        http.post(`*${API_ENDPOINTS.COMMUNITY_VOTE}`, () => {
          return HttpResponse.json({ data: { artistId: 7, votes: 12 } });
        })
      );

      await expect(castVote(7)).resolves.toEqual({ artistId: 7, votes: 12 });
    });

    it('rejects when the vote is refused', async () => {
      server.use(
        http.post(`*${API_ENDPOINTS.COMMUNITY_VOTE}`, () => {
          return new HttpResponse(null, { status: 400, statusText: 'already voted' });
        })
      );

      await expect(castVote('a1')).rejects.toThrow();
    });
  });

  describe('getMyVotes', () => {
    it('requests the current user votes from MSW', async () => {
      const votes = await getMyVotes();
      expect(votes).toEqual(mockMyVotesFixture);
    });

    it('returns an empty list when the body is empty', async () => {
      server.use(
        http.get(`*${API_ENDPOINTS.COMMUNITY_MY_VOTES}`, () => {
          return HttpResponse.json(null);
        })
      );

      await expect(getMyVotes()).resolves.toEqual([]);
    });

    it('propagates request errors', async () => {
      server.use(
        http.get(`*${API_ENDPOINTS.COMMUNITY_MY_VOTES}`, () => {
          return new HttpResponse(null, { status: 401 });
        })
      );

      await expect(getMyVotes()).rejects.toThrow();
    });
  });
});
