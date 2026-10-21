import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AllArtistsPage from '@/app/dashboard/all-artists/page';
import AllCollectionsPage from '@/app/dashboard/all-collections/page';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  push: vi.fn(),
  useArtists: vi.fn(),
  useCollections: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/current-catalog',
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => mocks.searchParams,
}));

vi.mock('@/hooks/queries/artists', () => ({
  useArtists: (...args: unknown[]) => mocks.useArtists(...args),
}));
vi.mock('@/hooks/queries/collections', () => ({
  useCollections: (...args: unknown[]) => mocks.useCollections(...args),
}));

const paginatedEmptyResult = {
  data: { items: [], total: 25 },
  error: null,
  isError: false,
  isLoading: false,
  refetch: vi.fn(),
};

describe('all catalog pages', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams('page=3');
    mocks.push.mockReset();
    mocks.useArtists.mockReset().mockReturnValue(paginatedEmptyResult);
    mocks.useCollections.mockReset().mockReturnValue(paginatedEmptyResult);
  });

  it('deep-links artists to the requested page and writes page changes to the URL', () => {
    render(<AllArtistsPage />);

    expect(mocks.useArtists).toHaveBeenCalledWith(3, 12);
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(mocks.push).toHaveBeenCalledWith('/dashboard/current-catalog?page=2');
  });

  it('deep-links collections to the requested page and writes page changes to the URL', () => {
    render(<AllCollectionsPage />);

    expect(mocks.useCollections).toHaveBeenCalledWith(3, 12);
    fireEvent.click(screen.getByRole('button', { name: 'Page 2' }));
    expect(mocks.push).toHaveBeenCalledWith('/dashboard/current-catalog?page=2');
  });
});
