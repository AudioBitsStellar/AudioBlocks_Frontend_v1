import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Page, { generateMetadata } from '@/app/(home)/artist/[id]/page';
import LegacyArtistPage from '@/app/dashboard/artist/[id]/page';
import { PlaybackProvider } from '@/context/PlaybackContext';
import { fetchArtistProfile, type ArtistProfile } from '@/lib/artistService';
import { server } from '@/mocks/server';

vi.mock('@/components/common/Player', () => ({ default: () => null }));
vi.mock('@/components/releases/ArtistReleases', () => ({
  default: () => <p>Releases stub</p>,
}));
vi.mock('@/lib/artistService', async (original) => ({
  ...(await original<typeof import('@/lib/artistService')>()),
  fetchArtistProfile: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

const artist: ArtistProfile = {
  id: 'a1',
  username: 'alexia',
  name: 'Alexia Stephen',
  bio: 'Afro-jazz from Lagos',
  profileImage: null,
  pageCover: null,
  website: 'https://alexia.example.com',
  role: 'artist',
  totalStreams: 1200,
};
const params = Promise.resolve({ id: 'a1' });

function renderPage(node: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <PlaybackProvider>{node}</PlaybackProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.mocked(fetchArtistProfile).mockResolvedValue(artist);
});

describe('public artist page (#586)', () => {
  it('renders the backend profile with a validated website link', async () => {
    renderPage(await Page({ params }));
    expect(screen.getByRole('heading', { level: 1, name: 'Alexia Stephen' })).toBeInTheDocument();
    expect(screen.getByText('@alexia')).toBeInTheDocument();
    expect(screen.getByText('Afro-jazz from Lagos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Website' })).toHaveAttribute(
      'href',
      'https://alexia.example.com'
    );
  });

  it('does not link a website that is not a plain HTTP(S) URL', async () => {
    vi.mocked(fetchArtistProfile).mockResolvedValue({
      ...artist,
      website: 'javascript:alert(1)',
    });
    renderPage(await Page({ params }));
    expect(screen.queryByRole('link', { name: 'Website' })).not.toBeInTheDocument();
  });

  it('lists popular songs from the artist song endpoint', async () => {
    server.use(
      http.get('*/api/song', () =>
        HttpResponse.json({
          success: true,
          data: [{ id: 's1', title: 'First Song', status: 'ready', streamUrl: '/stream/s1' }],
        })
      )
    );
    renderPage(await Page({ params }));
    expect(await screen.findByText('First Song')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play top songs' })).toBeEnabled();
  });

  it('shows fan perks from the backend when the perks flag is on', async () => {
    server.use(
      http.get('*/api/artists/:id/perks', () =>
        HttpResponse.json({ success: true, data: [{ id: 'p1', title: 'Early access' }] })
      )
    );
    renderPage(await Page({ params }));
    expect(await screen.findByText('Early access')).toBeInTheDocument();
  });

  it('returns notFound for unknown artists', async () => {
    vi.mocked(fetchArtistProfile).mockResolvedValue(null);
    await expect(Page({ params })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('provides profile Open Graph metadata', async () => {
    const metadata = await generateMetadata({ params });
    expect(metadata.openGraph).toMatchObject({
      type: 'profile',
      title: 'Alexia Stephen | AudioBlocks',
      url: '/artist/a1',
    });
  });
});

describe('legacy dashboard artist route', () => {
  it('redirects to the public artist page', async () => {
    await expect(LegacyArtistPage({ params: Promise.resolve({ id: 'a1' }) })).rejects.toThrow(
      'REDIRECT:/artist/a1'
    );
  });
});
