import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page, { generateMetadata } from '@/app/(home)/release/[id]/page';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { getRelease } from '@/lib/releases';
vi.mock('@/components/common/Player', () => ({ default: () => null }));
vi.mock('@/lib/releases', async (original) => ({
  ...(await original<typeof import('@/lib/releases')>()),
  getRelease: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
}));
const params = Promise.resolve({ id: 'release' });
beforeEach(() => {
  vi.mocked(getRelease).mockResolvedValue({
    id: 'release',
    title: 'New EP',
    type: 'ep',
    artistId: 'artist',
    artist: { name: 'The artist' },
    releaseDate: '2025-01-01',
    tracks: [
      {
        trackNumber: 1,
        song: {
          id: 'first',
          title: 'First track',
          artist: 'The artist',
          duration: 121,
          hlsMasterUrl: 'hls',
          status: 'ready',
        },
      },
    ],
  });
});
describe('release page', () => {
  it('renders backend details, durations, artist link and play controls', async () => {
    render(<PlaybackProvider>{await Page({ params })}</PlaybackProvider>);
    expect(screen.getByRole('heading', { name: 'New EP' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'The artist' })).toHaveAttribute(
      'href',
      '/dashboard/artist/artist'
    );
    expect(screen.getByText('2:01')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play release' })).toBeEnabled();
  });
  it('provides Open Graph metadata from the release', async () => {
    const metadata = await generateMetadata({ params });
    expect(metadata.openGraph).toMatchObject({
      title: 'New EP — EP | AudioBlocks',
      type: 'music.album',
      url: '/release/release',
    });
  });
  it('returns notFound for unavailable releases including metadata', async () => {
    vi.mocked(getRelease).mockResolvedValue(null);
    await expect(Page({ params })).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(generateMetadata({ params })).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
