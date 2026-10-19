import { mockOwnProfileFixture } from './users';

/** Playlist rows (AudioBlock_Backend `src/entities/Playlist.ts`). */
export interface MockPlaylist {
  id: string;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  coverImageUrl: string;
  isRuleBased: boolean;
  rule: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export const mockPlaylistsFixture: MockPlaylist[] = [
  {
    id: '5e9a7d60-0000-4000-8000-000000000001',
    userId: mockOwnProfileFixture.id,
    name: 'Late Night Afrobeats',
    description: 'Wind-down favourites.',
    isPublic: true,
    coverImageUrl: '/AFRO.jpg',
    isRuleBased: false,
    rule: null,
    createdAt: '2025-02-01T21:00:00.000Z',
    updatedAt: '2025-03-01T21:00:00.000Z',
  },
];
