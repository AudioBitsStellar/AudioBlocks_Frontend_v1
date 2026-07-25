import type { Metadata } from 'next';
import Hero from '../../components/common/home/Hero';
import HomeSections from './HomeSections';

const TITLE = 'AudioBlocks — Stream, Earn & Collect Music NFTs';
const DESCRIPTION =
  'AudioBlocks is a Web3 music platform where listeners stream ad-free music and earn rewards while artists upload tracks, sell NFTs, and get paid fairly.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    images: [{ url: '/logo.png', width: 1200, height: 630, alt: 'AudioBlocks' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
  },
};

export default function Home() {
  return (
    <>
      <Hero />
      <HomeSections />
    </>
  );
}
