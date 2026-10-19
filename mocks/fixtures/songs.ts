/**
 * Song views as returned by `GET /api/song` and `GET /api/song/:id`
 * (AudioBlock_Backend `docs/openapi.yaml` → `components.schemas.Song`).
 */
export interface MockSong {
  id: string;
  title: string;
  description: string | null;
  artist: {
    id: string;
    username: string | null;
    name: string | null;
    profileImage: string | null;
  } | null;
  cover: { path: string; thumbnails: Record<string, string> | null };
  genre: string | null;
  genreId: string | null;
  duration: number | null;
  playCount: number;
  status: 'processing' | 'ready' | 'failed';
  mintStatus: 'not_minted' | 'pending' | 'minted' | 'failed';
  onChainSongId: string | null;
  onChainTokenId: string | null;
  createdAt: string;
}

const ARTIST_ROZE = {
  id: '6f1c2a10-0000-4000-8000-000000000001',
  username: 'roze',
  name: 'Rozé',
  profileImage: '/AFRO.jpg',
};
const ARTIST_YEMI = {
  id: '6f1c2a10-0000-4000-8000-000000000002',
  username: 'yemisax',
  name: 'Yemi Sax',
  profileImage: '/tech.jpg',
};

export const mockSongsFixture: MockSong[] = [
  {
    id: '0b6e7c40-0000-4000-8000-000000000001',
    title: 'Relax and Unwind',
    description: 'Afro-fusion single.',
    artist: ARTIST_ROZE,
    cover: { path: '/AFRO.jpg', thumbnails: null },
    genre: 'Afrobeats',
    genreId: '9a3d5e20-0000-4000-8000-000000000001',
    duration: 240,
    playCount: 15420,
    status: 'ready',
    mintStatus: 'minted',
    onChainSongId: '1',
    onChainTokenId: '1',
    createdAt: '2025-01-10T09:00:00.000Z',
  },
  {
    id: '0b6e7c40-0000-4000-8000-000000000002',
    title: 'Vibe Mix',
    description: null,
    artist: ARTIST_YEMI,
    cover: { path: '/tech.jpg', thumbnails: null },
    genre: 'Afrobeats',
    genreId: '9a3d5e20-0000-4000-8000-000000000001',
    duration: 180,
    playCount: 12900,
    status: 'ready',
    mintStatus: 'not_minted',
    onChainSongId: null,
    onChainTokenId: null,
    createdAt: '2025-02-02T12:30:00.000Z',
  },
  {
    id: '0b6e7c40-0000-4000-8000-000000000003',
    title: 'Sunset Horizon',
    description: 'Ambient textures for late evenings.',
    artist: ARTIST_ROZE,
    cover: { path: '/audio.jpg', thumbnails: null },
    genre: 'Ambient',
    genreId: '9a3d5e20-0000-4000-8000-000000000002',
    duration: 195,
    playCount: 6200,
    status: 'ready',
    mintStatus: 'not_minted',
    onChainSongId: null,
    onChainTokenId: null,
    createdAt: '2025-03-18T18:45:00.000Z',
  },
];
