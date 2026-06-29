export interface CollectionItem {
  id: number;
  song: string;
  artist: string;
  description: string;
  image: string;
}

export interface ArtistItem {
  id: number;
  song: string;
  artist: string;
  description: string;
  image: string;
}

export const collectionsData: CollectionItem[] = [
  { id: 1, song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/tech.jpg' },
  { id: 2, song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/image2.jpg' },
  { id: 3, song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/tech.jpg' },
  { id: 4, song: 'Echoes of the Soul', artist: 'Misty Brown', description: 'New Album', image: '/image1.jpg' },
  { id: 5, song: 'Rhythm of the Night', artist: 'Luna Vega', description: 'EP Release', image: '/audio.jpg' },
  { id: 6, song: 'Midnight Dreams', artist: 'Jazz Collective', description: 'Live Session', image: '/AFRO.jpg' },
  { id: 7, song: 'Urban Vibes', artist: 'Beat Makers', description: 'New Single', image: '/cat.png' },
  { id: 8, song: 'Soulful Journey', artist: 'Acoustic Duo', description: 'Acoustic Cover', image: '/tech.jpg' },
  { id: 9, song: 'Electric Nights', artist: 'Synth Wave', description: 'Remix', image: '/image2.jpg' },
  { id: 10, song: 'Ocean Breeze', artist: 'Tropical Sound', description: 'Summer Mix', image: '/audio.jpg' },
  { id: 11, song: 'City Lights', artist: 'Metro Beats', description: 'Instrumental', image: '/AFRO.jpg' },
  { id: 12, song: 'Velvet Moon', artist: 'Indie Folk', description: 'New Album', image: '/cat.png' },
  { id: 13, song: 'Golden Hour', artist: 'Sunset Trio', description: 'EP Release', image: '/tech.jpg' },
  { id: 14, song: 'Neon Dreams', artist: 'Synth Wave', description: 'Live Session', image: '/image1.jpg' },
  { id: 15, song: 'Wild Hearts', artist: 'Indie Folk', description: 'New Single', image: '/image2.jpg' },
  { id: 16, song: 'Crystal Clear', artist: 'Acoustic Duo', description: 'Remix', image: '/audio.jpg' },
  { id: 17, song: 'Summer Rain', artist: 'Tropical Sound', description: 'Summer Mix', image: '/AFRO.jpg' },
  { id: 18, song: 'Gravity', artist: 'Metro Beats', description: 'Instrumental', image: '/cat.png' },
  { id: 19, song: 'Starlight', artist: 'Luna Vega', description: 'New Album', image: '/tech.jpg' },
  { id: 20, song: 'Firefly', artist: 'Jazz Collective', description: 'EP Release', image: '/image1.jpg' },
  { id: 21, song: 'Wanderlust', artist: 'Beat Makers', description: 'New Single', image: '/image2.jpg' },
  { id: 22, song: 'Eclipse', artist: 'Sunset Trio', description: 'Live Session', image: '/audio.jpg' },
  { id: 23, song: 'Serenade', artist: 'Misty Brown', description: 'Acoustic Cover', image: '/AFRO.jpg' },
  { id: 24, song: 'Horizon', artist: 'Luna Vega', description: 'Summer Mix', image: '/cat.png' },
];

export const artistsData: ArtistItem[] = [
  { id: 1, song: 'Misty Brown', artist: 'Vocalist', description: 'R&B / Soul', image: '/tech.jpg' },
  { id: 2, song: 'Luna Vega', artist: 'Producer', description: 'Electronic', image: '/image2.jpg' },
  { id: 3, song: 'Jazz Collective', artist: 'Band', description: 'Jazz Fusion', image: '/tech.jpg' },
  { id: 4, song: 'Beat Makers', artist: 'Duo', description: 'Hip Hop', image: '/image1.jpg' },
  { id: 5, song: 'Acoustic Duo', artist: 'Duo', description: 'Folk', image: '/audio.jpg' },
  { id: 6, song: 'Synth Wave', artist: 'Solo', description: 'Synth Pop', image: '/AFRO.jpg' },
  { id: 7, song: 'Tropical Sound', artist: 'Trio', description: 'Reggae', image: '/cat.png' },
  { id: 8, song: 'Metro Beats', artist: 'Group', description: 'Lo-Fi', image: '/tech.jpg' },
  { id: 9, song: 'Indie Folk', artist: 'Duo', description: 'Indie', image: '/image1.jpg' },
  { id: 10, song: 'Sunset Trio', artist: 'Trio', description: 'Ambient', image: '/image2.jpg' },
  { id: 11, song: 'Neon Lights', artist: 'Solo', description: 'Electronic', image: '/audio.jpg' },
  { id: 12, song: 'Velvet Strings', artist: 'Quartet', description: 'Classical', image: '/AFRO.jpg' },
  { id: 13, song: 'Echo Valley', artist: 'Band', description: 'Rock', image: '/cat.png' },
  { id: 14, song: 'Skyline', artist: 'Solo', description: 'Pop', image: '/tech.jpg' },
  { id: 15, song: 'Midnight Jazz', artist: 'Trio', description: 'Jazz', image: '/image1.jpg' },
  { id: 16, song: 'Golden Records', artist: 'Label', description: 'Various', image: '/image2.jpg' },
  { id: 17, song: 'Crystal Waves', artist: 'Duo', description: 'Chill', image: '/audio.jpg' },
  { id: 18, song: 'Urban Collective', artist: 'Group', description: 'Rap', image: '/AFRO.jpg' },
  { id: 19, song: 'Pacific Sound', artist: 'Solo', description: 'World', image: '/cat.png' },
  { id: 20, song: 'Arctic Groove', artist: 'Duo', description: 'Electronica', image: '/tech.jpg' },
  { id: 21, song: 'Solar Flare', artist: 'Band', description: 'Alternative', image: '/image1.jpg' },
  { id: 22, song: 'Deep Current', artist: 'Trio', description: 'Dub', image: '/image2.jpg' },
  { id: 23, song: 'Lunar Phase', artist: 'Solo', description: 'Ambient', image: '/audio.jpg' },
  { id: 24, song: 'Desert Wind', artist: 'Group', description: 'World', image: '/AFRO.jpg' },
];
