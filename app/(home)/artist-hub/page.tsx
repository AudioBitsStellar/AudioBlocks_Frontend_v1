import type { Metadata } from 'next';
import ArtistHubHero from '@/components/common/artist-hub/ArtistHubHero';
import ArtistFeatures from '@/components/common/artist-hub/ArtistFeatures';
import ArtistUpgrade from '@/components/common/artist-hub/ArtistUpgrade';

const TITLE = 'Artist Hub — Upload, Earn & Sell Music NFTs | AudioBlocks';
const DESCRIPTION =
  'Join AudioBlocks as an artist: upload your music, mint it as NFTs, earn fair royalties, and connect directly with fans who stream and collect your tracks.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'AudioBlocks Artist Hub' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
};

export default function ArtistHub() {
  return (
    <>
      <ArtistHubHero />
      <ArtistFeatures />
      <ArtistUpgrade />
    </>
  );
}

