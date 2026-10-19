import NatureDepthSlider from '@/components/common/NatureDepth';
import NftCollections from '@/components/common/NftCollections';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Metadata } from 'next';

const TITLE = 'Marketplace | AudioBlocks';
const DESCRIPTION =
  'Explore and purchase unique audio-inspired NFTs, sound packs, and digital art on the AudioBlocks marketplace.';
/** Route path is case-sensitive: the folder is `marketPlace`. */
const PATH = '/marketPlace';

// Relative URLs resolve against `metadataBase` from app/layout.tsx (#12).
export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    siteName: 'AudioBlocks',
    url: PATH,
    // Without an image, shared marketplace links unfurl with no preview.
    images: [{ url: '/logo.png', width: 4096, height: 2216, alt: 'AudioBlocks Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.png'],
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
