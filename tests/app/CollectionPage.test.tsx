import type { ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CollectionsPage from '@/app/dashboard/collection/page';
import type { OwnedCollectionItem } from '@/lib/ownedCollectionService';

const mocks = vi.hoisted(() => ({ owned: [] as unknown[] }));

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: '0xabc', isConnected: true }),
}));
vi.mock('@/hooks/useNFTCollection', () => ({
  useNFTCollection: () => ({ nftBalance: BigInt(mocks.owned.length), isLoading: false }),
}));
vi.mock('@/hooks/useOwnedCollection', () => ({
  useOwnedCollection: () => ({ data: mocks.owned, isLoading: false }),
}));
vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: () => ({ sentinelRef: () => {} }),
}));
vi.mock('@/components/NftTransfer', () => ({ NftTransfer: () => null }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

const CID = 'QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng';
const row = (over: Partial<OwnedCollectionItem>): OwnedCollectionItem => ({
  songId: 1,
  songCID: CID,
  artistAddress: 'GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVW',
  totalStreams: 3,
  totalLikes: 1,
  createdAt: 0,
  ...over,
});

beforeEach(() => {
  window.scrollTo = vi.fn();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('CollectionsPage (#755)', () => {
  it('shows title, artist and artwork on each card', () => {
    mocks.owned = [
      row({
        title: 'Midnight Run',
        artistName: 'Ada Lovelace',
        coverUrl: 'https://cdn.example/a.jpg',
      }),
    ];
    render(<CollectionsPage />);

    expect(screen.getByText('Midnight Run')).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByAltText('Midnight Run cover art')).toHaveAttribute(
      'src',
      'https://cdn.example/a.jpg'
    );
    expect(screen.queryByText(/Song #/)).not.toBeInTheDocument();
  });

  it('falls back to a shortened CID and address when metadata is missing', () => {
    mocks.owned = [row({})];
    render(<CollectionsPage />);

    expect(screen.getByText('QmVLwvmG…zdng')).toBeInTheDocument();
    expect(screen.getByText('GABCDE…TUVW')).toBeInTheDocument();
  });

  it('finds an NFT by searching for its song title', () => {
    mocks.owned = [
      row({ songId: 1, title: 'Midnight Run', artistName: 'Ada' }),
      row({ songId: 2, title: 'Sunrise', artistName: 'Grace' }),
    ];
    render(<CollectionsPage />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search NFT songs' }), {
      target: { value: 'sunrise' },
    });

    expect(screen.getByText('Sunrise')).toBeInTheDocument();
    expect(screen.queryByText('Midnight Run')).not.toBeInTheDocument();
  });

  it('changes pages immediately, with no fake loading state', () => {
    vi.useFakeTimers();
    mocks.owned = Array.from({ length: 12 }, (_, i) =>
      row({ songId: i + 1, title: `Track ${String(i + 1).padStart(2, '0')}`, artistName: 'A' })
    );
    render(<CollectionsPage />);
    expect(screen.getByText('Track 01')).toBeInTheDocument();
    expect(screen.queryByText('Track 11')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^2$|page 2/i }));

    // No timers advanced: page two is already showing and no skeletons are.
    expect(screen.getByText('Track 11')).toBeInTheDocument();
    expect(screen.queryByText('Track 01')).not.toBeInTheDocument();
    expect(vi.getTimerCount()).toBe(0);
    act(() => {
      vi.runOnlyPendingTimers();
    });
    expect(screen.getByText('Track 11')).toBeInTheDocument();
  });
});
