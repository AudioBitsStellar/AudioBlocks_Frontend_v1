import { http, HttpResponse } from 'msw';
import { mockAlbumsFixture } from '../fixtures/albums';
import { paginate, readPage } from './response';

/** AudioBlock_Backend `src/routes/AlbumRoutes.ts` (`GET /api/album?page&limit&artistId`). */
export const albumsHandlers = [
  http.get('*/api/album', ({ request }) => {
    const artistId = new URL(request.url).searchParams.get('artistId');
    const albums = artistId
      ? mockAlbumsFixture.filter((a) => a.artistId === artistId)
      : mockAlbumsFixture;
    return HttpResponse.json({ success: true, ...paginate(albums, readPage(request)) });
  }),
];
