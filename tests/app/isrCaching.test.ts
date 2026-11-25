import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/common/home/Hero', () => ({ default: () => null }));
vi.mock('@/app/(home)/HomeSections', () => ({ default: () => null }));
vi.mock('@/components/ui/card', () => ({
  Card: () => null,
  CardContent: () => null,
  CardHeader: () => null,
}));
vi.mock('@/components/common/NatureDepth', () => ({ default: () => null }));
vi.mock('@/components/common/NftCollections', () => ({ default: () => null }));
vi.mock('@/components/common/artist-hub/ArtistFeatures', () => ({ default: () => null }));
vi.mock('@/components/common/artist-hub/ArtistHubHero', () => ({ default: () => null }));
vi.mock('@/components/common/artist-hub/ArtistUpgrade', () => ({ default: () => null }));
vi.mock('@/components/common/quality-standards/QualityStandardsCriteria', () => ({
  default: () => null,
}));
vi.mock('@/components/common/quality-standards/QualityStandardsHero', () => ({
  default: () => null,
}));
vi.mock('@/components/artist/ArtistProfileView', () => ({ ArtistProfileView: () => null }));
vi.mock('@/components/common/Player', () => ({ default: () => null }));
vi.mock('@/components/JsonLdScript', () => ({ JsonLdScript: () => null }));
vi.mock('@/lib/artistService', () => ({
  fetchArtistProfile: vi.fn(),
  artistDisplayName: vi.fn(),
}));
vi.mock('@/components/releases/ReleaseDetails', () => ({ default: () => null }));
vi.mock('@/lib/releases', () => ({
  getRelease: vi.fn(),
  RELEASE_TYPES: {},
}));

import * as HomeRoute from '@/app/(home)/page';
import * as MarketplaceRoute from '@/app/(home)/marketPlace/page';
import * as ArtistHubRoute from '@/app/(home)/artist-hub/page';
import * as QualityStandardsRoute from '@/app/(home)/quality-standards/page';
import * as ArtistRoute from '@/app/(home)/artist/[id]/page';
import * as ReleaseRoute from '@/app/(home)/release/[id]/page';

describe('PERF-05 (#830) Public Pages ISR Caching Strategy', () => {
  it('configures Home page with 60-second ISR revalidation', () => {
    expect(HomeRoute.revalidate).toBe(60);
  });

  it('configures Marketplace page with 60-second ISR revalidation', () => {
    expect(MarketplaceRoute.revalidate).toBe(60);
  });

  it('configures Artist Hub page with 1-hour ISR revalidation', () => {
    expect(ArtistHubRoute.revalidate).toBe(3600);
  });

  it('configures Quality Standards page with 1-hour ISR revalidation', () => {
    expect(QualityStandardsRoute.revalidate).toBe(3600);
  });

  it('configures public Artist profile page with 300-second ISR revalidation', () => {
    expect(ArtistRoute.revalidate).toBe(300);
  });

  it('configures public Release page with 300-second ISR revalidation', () => {
    expect(ReleaseRoute.revalidate).toBe(300);
  });
});
