'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';
import NatureDepthSlider from '../../../components/common/NatureDepth';
import NftCollections from '../../../components/common/NftCollections';

export default function MarketplacePage() {
  useScrollRestoration('marketplace');
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
