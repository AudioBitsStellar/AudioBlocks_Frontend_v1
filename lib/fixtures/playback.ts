import type { Track } from '@/context/PlaybackContext';

/** Demo playlist the player starts with when `NEXT_PUBLIC_USE_DEMO_DATA=true`. */
export const demoPlaylist: Track[] = [
  {
    id: 'track-1',
    title: 'Relax and Unwind',
    artist: 'Rozé',
    cover: '/AFRO.jpg',
  },
  {
    id: 'track-2',
    title: 'Vibe Mix',
    artist: 'Yemi Sax',
    cover: '/AFRO.jpg',
  },
  {
    id: 'track-3',
    title: 'Cool Session',
    artist: 'Dunsin',
    cover: '/AFRO.jpg',
  },
];
