import type {
  EventItem,
  ExploreArtistItem,
  ExploreCategory,
  ExploreCollectionItem,
  MerchItem,
} from '@/lib/exploreService';

/** App-defined endpoints (`API_ENDPOINTS.MERCH`, `EVENTS`, `EXPLORE_*`); not served by AudioBlock_Backend yet. */
export const mockMerchFixture: MerchItem[] = [
  {
    id: 'merch-1',
    song: 'T-Shirts',
    artist: 'AudioBlocks',
    description: 'Tour tee',
    image: '/audio.jpg',
  },
  {
    id: 'merch-2',
    song: 'Folklore Vinyl',
    artist: 'AudioBlocks',
    description: 'Limited pressing',
    image: '/ad.jpg',
  },
];

export const mockEventsFixture: EventItem[] = [
  {
    id: 'event-1',
    name: 'World Tour',
    image: '/AFRO.jpg',
    date: '2025-06-14',
    going: 320,
    price: '25 XLM',
  },
  {
    id: 'event-2',
    name: 'Sweetener Live',
    image: '/tech.jpg',
    date: '2025-07-02',
    going: 180,
    price: '18 XLM',
  },
];

export const mockExploreCategoriesFixture: ExploreCategory[] = [
  { id: 'cat-1', name: 'Afrobeats', image: '/AFRO.jpg' },
  { id: 'cat-2', name: 'Electronic', image: '/tech.jpg' },
];

export const mockExploreCollectionsFixture: ExploreCollectionItem[] = [
  {
    id: 'col-1',
    song: 'Afrobeats Essentials',
    artist: 'Various Artists',
    description: '12 tracks',
    image: '/AFRO.jpg',
  },
  {
    id: 'col-2',
    song: 'Chill Vibes',
    artist: 'Yemi Sax',
    description: '8 tracks',
    image: '/tech.jpg',
  },
];

export const mockExploreArtistsFixture: ExploreArtistItem[] = [
  {
    id: 'art-1',
    song: 'Relax and Unwind',
    artist: 'Rozé',
    description: 'Afrobeats',
    image: '/AFRO.jpg',
  },
  {
    id: 'art-2',
    song: 'Vibe Mix',
    artist: 'Yemi Sax',
    description: 'Afrobeats',
    image: '/tech.jpg',
  },
];
