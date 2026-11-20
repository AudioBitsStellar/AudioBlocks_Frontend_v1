/**
 * JSON-LD structured data generation for AudioBlocks (#630).
 *
 * Generates structured data for SEO to help search engines understand
 * songs, artists, and other content on the platform.
 */

export interface SongMetadata {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  duration?: number;
  coverImage?: string;
  url?: string;
  releaseDate?: string;
  description?: string;
}

export interface ArtistMetadata {
  id: string;
  name: string;
  bio?: string;
  image?: string;
  url?: string;
  genres?: string[];
  followerCount?: number;
}

/**
 * Generate JSON-LD for a song (MusicRecording schema)
 */
export function generateSongJsonLd(song: SongMetadata): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicRecording',
    name: song.title,
    byArtist: {
      '@type': 'MusicGroup',
      name: song.artist,
      ...(song.artistId && { url: `/artist/${song.artistId}` }),
    },
    ...(song.duration && { duration: `PT${Math.floor(song.duration / 60)}M${song.duration % 60}S` }),
    ...(song.coverImage && { image: song.coverImage }),
    ...(song.url && { url: song.url }),
    ...(song.releaseDate && { datePublished: song.releaseDate }),
    ...(song.description && { description: song.description }),
  };

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD for an artist (MusicGroup schema)
 */
export function generateArtistJsonLd(artist: ArtistMetadata): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: artist.name,
    ...(artist.bio && { description: artist.bio }),
    ...(artist.image && { image: artist.image }),
    ...(artist.url && { url: artist.url }),
    ...(artist.genres && artist.genres.length > 0 && { genre: artist.genres }),
    ...(artist.followerCount && { interactionStatistic: {
      '@type': 'InteractionCounter',
      interactionType: 'https://schema.org/FollowAction',
      userInteractionCount: artist.followerCount,
    }}),
  };

  return JSON.stringify(jsonLd);
}

export interface ReleaseMetadata {
  id: string;
  title: string;
  /** Human label such as "Single", "EP" or "Album" (see `RELEASE_TYPES`). */
  releaseType: string;
  artist: string;
  artistId?: string;
  coverImage?: string;
  url?: string;
  releaseDate?: string;
  tracks?: Array<{ title: string; trackNumber: number }>;
}

/**
 * Generate JSON-LD for a release — a single, EP or album (MusicAlbum schema).
 * Used on `/release/[id]` (#860); singles use the same type as schema.org
 * does not define a separate one.
 */
export function generateReleaseJsonLd(release: ReleaseMetadata): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicAlbum',
    name: release.title,
    ...(release.releaseType === 'Single' && {
      albumProductionType: 'https://schema.org/SingleReleaseType',
    }),
    byArtist: {
      '@type': 'MusicGroup',
      name: release.artist,
      ...(release.artistId && { url: `/artist/${release.artistId}` }),
    },
    ...(release.coverImage && { image: release.coverImage }),
    ...(release.url && { url: release.url }),
    ...(release.releaseDate && { datePublished: release.releaseDate }),
    ...(release.tracks &&
      release.tracks.length > 0 && {
        numTracks: release.tracks.length,
        track: release.tracks.map((track) => ({
          '@type': 'MusicRecording',
          name: track.title,
          position: track.trackNumber,
        })),
      }),
  };

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD for an organization (for site footer/header)
 */
export function generateOrganizationJsonLd(): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AudioBlocks',
    description: 'A music streaming and discovery platform powered by blockchain',
    url: 'https://audioblocks.xyz',
    logo: 'https://audioblocks.xyz/logo.png',
    sameAs: [
      'https://twitter.com/audioblocksnft',
      'https://discord.gg/audioblocks',
    ],
  };

  return JSON.stringify(jsonLd);
}

/**
 * Generate JSON-LD for breadcrumb navigation
 */
export function generateBreadcrumbJsonLd(items: Array<{ name: string; url: string }>): string {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return JSON.stringify(jsonLd);
}
