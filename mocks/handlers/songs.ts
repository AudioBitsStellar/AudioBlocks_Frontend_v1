import { http, HttpResponse } from 'msw';
import { mockSongsFixture } from '../fixtures/songs';
import { errorResponse, paginate, readPage } from './response';

/** AudioBlock_Backend `src/routes/SongRoutes.ts`, mounted at `/api/song`. */
export const songsHandlers = [
  // Registered before `/:id` so the static path is not captured as an id.
  http.get('*/api/song/popular', ({ request }) => {
    const byPlays = [...mockSongsFixture].sort((a, b) => b.playCount - a.playCount);
    return HttpResponse.json({ success: true, ...paginate(byPlays, readPage(request)) });
  }),

  // `paginatedResponse()`: totalPages is at least 1 and `hasMore` is included.
  http.get('*/api/song', ({ request }) => {
    const query = readPage(request);
    const { data, pagination } = paginate(mockSongsFixture, query);
    const totalPages = Math.max(1, pagination.totalPages);
    return HttpResponse.json({
      success: true,
      data,
      pagination: { ...pagination, totalPages, hasMore: query.page < totalPages },
    });
  }),

  http.get('*/api/song/:id', ({ params }) => {
    const song = mockSongsFixture.find((s) => s.id === params.id);
    if (!song) return errorResponse(404, 'Song not found', 'NOT_FOUND');
    return HttpResponse.json({ success: true, data: song });
  }),
];
