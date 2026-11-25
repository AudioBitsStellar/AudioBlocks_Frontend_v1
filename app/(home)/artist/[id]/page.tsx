import { cache } from 'react';
import { notFound } from 'next/navigation';
import { ArtistProfileView } from '@/components/artist/ArtistProfileView';
import Player from '@/components/common/Player';
import { JsonLdScript } from '@/components/JsonLdScript';
import { artistDisplayName, fetchArtistProfile } from '@/lib/artistService';
import { generateArtistJsonLd } from '@/lib/jsonld';
import type { Metadata } from 'next';

/**
 * #830 (PERF-05): Cache public artist profile pages with ISR (5-minute revalidation).
 */
export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

// Default preview image for artists without a profileImage, so share
// debuggers (#859) always have something to render.
const DEFAULT_OG_IMAGE = '/logo.png';

// Metadata and the page render from one request per navigation.
const getArtist = cache(fetchArtistProfile);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist((await params).id);
  if (!artist) notFound();
  const name = artistDisplayName(artist);
  const title = `${name} | AudioBlocks`;
  const description = artist.bio ?? `Listen to ${name} on AudioBlocks.`;
  const image = artist.profileImage || DEFAULT_OG_IMAGE;
  return {
    title,
    description,
    alternates: { canonical: `/artist/${artist.id}` },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `/artist/${artist.id}`,
      images: [{ url: image, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist((await params).id);
  if (!artist) notFound();
  const name = artistDisplayName(artist);
  const jsonLd = generateArtistJsonLd({
    id: artist.id,
    name,
    bio: artist.bio ?? undefined,
    image: artist.profileImage ?? undefined,
    url: `/artist/${artist.id}`,
  });
  return (
    <>
      <JsonLdScript data={jsonLd} id="artist-jsonld" />
      <ArtistProfileView artist={artist} />
      <Player />
    </>
  );
}
