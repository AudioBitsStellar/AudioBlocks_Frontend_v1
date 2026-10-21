import { cache } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArtistProfileView } from '@/components/artist/ArtistProfileView';
import Player from '@/components/common/Player';
import { artistDisplayName, fetchArtistProfile } from '@/lib/artistService';

type Props = { params: Promise<{ id: string }> };

// Metadata and the page render from one request per navigation.
const getArtist = cache(fetchArtistProfile);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const artist = await getArtist((await params).id);
  if (!artist) notFound();
  const name = artistDisplayName(artist);
  const title = `${name} | AudioBlocks`;
  const description = artist.bio ?? `Listen to ${name} on AudioBlocks.`;
  const image = artist.profileImage ?? undefined;
  return {
    title,
    description,
    alternates: { canonical: `/artist/${artist.id}` },
    openGraph: {
      title,
      description,
      type: 'profile',
      url: `/artist/${artist.id}`,
      images: image ? [{ url: image, alt: name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const artist = await getArtist((await params).id);
  if (!artist) notFound();
  return (
    <>
      <ArtistProfileView artist={artist} />
      <Player />
    </>
  );
}
