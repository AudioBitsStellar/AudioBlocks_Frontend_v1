/**
 * Demo marketplace listings. Dev-only: components read these through
 * `USE_DEMO_DATA` (see `lib/fixtures/index.ts`) and show nothing in production
 * until the marketplace API is wired up. Prices are placeholders in ETH.
 */

export interface CollectionItem {
  id: string;
  image: string;
  artistName: string;
  songName?: string;
  eventName?: string;
  itemName?: string;
  price: string;
}

export const musicData: CollectionItem[] = [
  {
    id: 'music-1',
    image: '/wif.jpg',
    artistName: 'Wiffi Drips',
    songName: 'Bigger',
    price: '0.5 ETH',
  },
  {
    id: 'music-2',
    image: '/chilli.jpg',
    artistName: 'Mchivir',
    songName: 'ASILW',
    price: '0.3 ETH',
  },
  {
    id: 'music-3',
    image: '/cat.png',
    artistName: 'Soldier Cat',
    songName: 'Bad Guy',
    price: '0.7 ETH',
  },
  {
    id: 'music-4',
    image: '/moon.webp',
    artistName: 'Lost',
    songName: 'Circles',
    price: '0.4 ETH',
  },
];

export const eventData: CollectionItem[] = [
  {
    id: 'event-1',
    image: '/AFRO.jpg',
    artistName: 'Wiffi Drips Tour',
    eventName: 'World Tour',
    price: '1.2 ETH',
  },
  {
    id: 'event-2',
    image: '/tech.jpg',
    artistName: 'Ara',
    eventName: 'Sweetener World Tour',
    price: '0.9 ETH',
  },
  {
    id: 'event-3',
    image: '/rap.png',
    artistName: 'Rap Battle',
    eventName: 'Mat Tour',
    price: '0.8 ETH',
  },
];

export const merchData: CollectionItem[] = [
  {
    id: 'merch-1',
    image: '/audio.jpg',
    artistName: 'AudioBlocks',
    itemName: 'T-Shirts',
    price: '0.2 ETH',
  },
  {
    id: 'merch-2',
    image: '/ad.jpg',
    artistName: 'AudioBlocks',
    itemName: 'Folklore Vinyl',
    price: '0.15 ETH',
  },
  {
    id: 'merch-3',
    image: '/ads.jpg',
    artistName: 'BTS',
    itemName: 'Official T-Shirt',
    price: '0.1 ETH',
  },
];
