import { mockSongsFixture } from './songs';

/** `GET /api/genres` rows: `{ id, name, songCount }`, ordered by name (GenreService). */
export interface MockGenre {
  id: string;
  name: string;
  songCount: number;
}

const GENRES = [
  { id: '9a3d5e20-0000-4000-8000-000000000001', name: 'Afrobeats' },
  { id: '9a3d5e20-0000-4000-8000-000000000002', name: 'Ambient' },
];

export const mockGenresFixture: MockGenre[] = GENRES.map((genre) => ({
  ...genre,
  songCount: mockSongsFixture.filter((song) => song.genreId === genre.id).length,
}));
