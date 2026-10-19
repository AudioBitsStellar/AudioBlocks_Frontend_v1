import { http, HttpResponse } from 'msw';
import { mockCommunityArtistsFixture, mockMyVotesFixture } from '../fixtures/community';
import { errorResponse } from './response';

/**
 * App-defined endpoints (`API_ENDPOINTS.COMMUNITY_*`); not served by
 * AudioBlock_Backend yet. Stateless, so tests stay isolated.
 */
export const communityHandlers = [
  http.get('*/api/community/leaderboard', () =>
    HttpResponse.json({ success: true, data: mockCommunityArtistsFixture })
  ),

  http.post('*/api/community/vote', async ({ request }) => {
    const { artistId } = (await request.json().catch(() => ({}))) as { artistId?: unknown };
    const artist = mockCommunityArtistsFixture.find((a) => a.id === artistId);
    if (!artist) return errorResponse(404, 'Artist not found', 'NOT_FOUND');
    return HttpResponse.json({
      success: true,
      data: { artistId: artist.id, votes: artist.votes + 1 },
    });
  }),

  http.get('*/api/community/votes/me', () =>
    HttpResponse.json({ success: true, data: mockMyVotesFixture })
  ),
];
