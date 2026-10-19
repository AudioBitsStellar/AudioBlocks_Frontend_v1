import type { CommunityArtist } from '@/lib/communityService';

/** App-defined endpoint (`API_ENDPOINTS.COMMUNITY_*`); not served by AudioBlock_Backend yet. */
export const mockCommunityArtistsFixture: CommunityArtist[] = [
  {
    id: 'artist-1',
    name: 'Rozé',
    image: '/AFRO.jpg',
    genre: 'Afrobeats',
    description: 'Afro-fusion singer and producer pushing the boundaries of sound.',
    votes: 1420,
    followerCount: 28500,
  },
  {
    id: 'artist-2',
    name: 'Yemi Sax',
    image: '/tech.jpg',
    genre: 'Afrobeats',
    description: 'Master saxophonist blending jazz harmonies with African rhythm.',
    votes: 1180,
    followerCount: 21300,
  },
  {
    id: 'artist-3',
    name: 'Mchivir',
    image: '/chilli.jpg',
    genre: 'Afro-Soul',
    description: 'Soulful melodies and traditional percussion.',
    votes: 950,
  },
];

export const mockMyVotesFixture: CommunityArtist['id'][] = ['artist-1', 'artist-3'];
