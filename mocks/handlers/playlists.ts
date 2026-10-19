import { http, HttpResponse } from 'msw';
import { mockPlaylistsFixture } from '../fixtures/playlists';
import { mockOwnProfileFixture } from '../fixtures/users';
import { errorResponse, paginate, readPage } from './response';

/** AudioBlock_Backend `src/routes/playlistRoutes.ts`, mounted at `/api/playlists`. */
export const playlistsHandlers = [
  http.get('*/api/playlists', ({ request }) =>
    HttpResponse.json({ success: true, ...paginate(mockPlaylistsFixture, readPage(request)) })
  ),

  http.post('*/api/playlists', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof body.name !== 'string' || !body.name.trim()) {
      return errorResponse(400, 'name is required', 'VALIDATION_FAILED');
    }
    const now = new Date().toISOString();
    const playlist = {
      id: crypto.randomUUID(),
      userId: mockOwnProfileFixture.id,
      name: body.name,
      description: typeof body.description === 'string' ? body.description : '',
      isPublic: body.isPublic === true,
      coverImageUrl: typeof body.coverImageUrl === 'string' ? body.coverImageUrl : '',
      isRuleBased: body.isRuleBased === true,
      rule: null,
      createdAt: now,
      updatedAt: now,
    };
    return HttpResponse.json({ success: true, data: playlist }, { status: 201 });
  }),

  http.get('*/api/playlists/:id', ({ params }) => {
    const playlist = mockPlaylistsFixture.find((p) => p.id === params.id);
    if (!playlist) return errorResponse(404, 'Playlist not found', 'NOT_FOUND');
    return HttpResponse.json({ success: true, data: playlist });
  }),

  // The controller accepts the song id as `songId` or `id`.
  http.post('*/api/playlists/:id/songs', async ({ params, request }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const songId = body.songId ?? body.id;
    if (typeof songId !== 'string' || !songId) {
      return errorResponse(400, 'songId is required', 'VALIDATION_FAILED');
    }
    const entry = {
      id: crypto.randomUUID(),
      playlistId: params.id as string,
      songId,
      position: 0,
      addedAt: new Date().toISOString(),
    };
    return HttpResponse.json({ success: true, data: entry }, { status: 201 });
  }),
];
