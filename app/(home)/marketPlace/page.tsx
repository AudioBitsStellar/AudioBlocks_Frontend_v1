import { Card, CardContent, CardHeader } from '@/components/ui/card';
import NatureDepthSlider from '../../../components/common/NatureDepth';
import NftCollections from '../../../components/common/NftCollections';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Marketplace | AudioBlocks',
  description:
    'Explore and purchase unique audio-inspired NFTs, sound packs, and digital art on the AudioBlocks marketplace.',
  openGraph: {
    title: 'Marketplace | AudioBlocks',
    description:
      'Explore and purchase unique audio-inspired NFTs, sound packs, and digital art on the AudioBlocks marketplace.',
    type: 'website',
    siteName: 'AudioBlocks',
  },
};

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-black">
      <div className="w-full space-y-12 py-6">
        {/* Main Demo - Full Width */}
        <div className="w-full">
          <Card className="border-0 shadow-2xl bg-black backdrop-blur-sm mx-4 sm:mx-6 lg:mx-8">
            <CardHeader className="text-center" />
            <CardContent className="py-8">
              <NatureDepthSlider />
            </CardContent>
          </Card>
          <NftCollections />
        </div>
      </div>
    </div>
  );
}
