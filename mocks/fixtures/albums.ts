/** `GET /api/album` rows (AudioBlock_Backend `src/entities/Album.ts`). */
export interface MockAlbum {
  id: string;
  artistId: string;
  coverArtPath: string;
  title: string;
  description: string;
  genre?: string;
  artistAddress: string;
  metadataCid: string;
  metadata: Record<string, unknown> | null;
  composers?: string;
  createdAt: string;
  updatedAt: string;
}

export const mockAlbumsFixture: MockAlbum[] = [
  {
    id: '3c8b1f50-0000-4000-8000-000000000001',
    artistId: '6f1c2a10-0000-4000-8000-000000000001',
    coverArtPath: '/AFRO.jpg',
    title: 'Afrobeats Essentials',
    description: 'A collection of Afrobeats singles.',
    genre: 'Afrobeats',
    artistAddress: 'GAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQDZ7H',
    metadataCid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi',
    metadata: null,
    composers: 'Rozé',
    createdAt: '2025-01-12T10:00:00.000Z',
    updatedAt: '2025-01-12T10:00:00.000Z',
  },
  {
    id: '3c8b1f50-0000-4000-8000-000000000002',
    artistId: '6f1c2a10-0000-4000-8000-000000000002',
    coverArtPath: '/tech.jpg',
    title: 'Chill Vibes',
    description: 'Saxophone-led late night sessions.',
    genre: 'Afrobeats',
    artistAddress: 'GABAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEJXA',
    metadataCid: 'bafybeihkoviema7g3gxyt6la7vd5ho32ictqbilu3wnlo3rs7ewhnp7lly',
    metadata: null,
    createdAt: '2025-02-20T14:15:00.000Z',
    updatedAt: '2025-02-20T14:15:00.000Z',
  },
];
