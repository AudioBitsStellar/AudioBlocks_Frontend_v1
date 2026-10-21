import { http, HttpResponse } from 'msw';
import { mockGenresFixture } from '../fixtures/genres';
import { mockSongsFixture } from '../fixtures/songs';
import { errorResponse, paginate, readPage } from './response';

/** AudioBlock_Backend `src/routes/genreRoutes.ts` (`GET /api/genres`, Issue #78). */
export const genresHandlers = [
  http.get('*/api/genres', () => HttpResponse.json({ success: true, data: mockGenresFixture })),

  http.get('*/api/genres/:id/songs', ({ params, request }) => {
    const genre = mockGenresFixture.find((g) => g.id === params.id);
    if (!genre) return errorResponse(404, 'Genre not found', 'NOT_FOUND');
    const songs = mockSongsFixture.filter((s) => s.genreId === genre.id);
    return HttpResponse.json({
      success: true,
      genre: { id: genre.id, name: genre.name },
      ...paginate(songs, readPage(request)),
    });
  }),
];
