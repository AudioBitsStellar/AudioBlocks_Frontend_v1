import { describe, expect, it, vi } from 'vitest';
import MarketplacePage, { metadata } from '@/app/(home)/marketPlace/page';

// vi.mock is hoisted above the imports. The page's client components aren't needed to read its static metadata.
vi.mock('@/components/ui/card', () => ({
  Card: () => null,
  CardContent: () => null,
  CardHeader: () => null,
}));
vi.mock('@/components/common/NatureDepth', () => ({ default: () => null }));
vi.mock('@/components/common/NftCollections', () => ({ default: () => null }));

describe('Marketplace page SEO metadata (#12)', () => {
  it('exports a production-named page component', () => {
    expect(MarketplacePage.name).toBe('MarketplacePage');
  });

  it('has a marketplace-specific title and description', () => {
    expect(metadata.title).toBe('Marketplace | AudioBlocks');
    expect(metadata.description).toMatch(/marketplace/i);
  });

  it('declares a canonical URL matching the case-sensitive route', () => {
    expect(metadata.alternates?.canonical).toBe('/marketPlace');
  });

  it('has Open Graph tags with a preview image so shared links unfurl', () => {
    const og = metadata.openGraph as Record<string, unknown>;
    expect(og).toMatchObject({
      title: 'Marketplace | AudioBlocks',
      description: metadata.description,
      type: 'website',
      siteName: 'AudioBlocks',
      url: '/marketPlace',
    });
    expect(og.images).toEqual([
      { url: '/logo.png', width: 4096, height: 2216, alt: 'AudioBlocks Marketplace' },
    ]);
  });

  it('has a large-image Twitter card', () => {
    expect(metadata.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Marketplace | AudioBlocks',
      images: ['/logo.png'],
    });
  });
});
