import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  useCollectionMetadata,
  collectionMetadataKeys,
  COLLECTION_METADATA_STALE_TIME,
  fetchCollectionMetadata,
} from '@/hooks/queries/useCollectionMetadata';
import { NotFoundError } from '@/lib/apiClient';

const mockGet = vi.fn();
vi.mock('@/lib/apiClient', async () => {
  const actual = await vi.importActual<typeof import('@/lib/apiClient')>('@/lib/apiClient');
  return {
    ...actual,
    default: {
      get: (...args: unknown[]) => mockGet(...args),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    },
  };
});

const walletState = { isConnected: false, address: null as string | null };
vi.mock('@/context/WalletContext', () => ({
  useWallet: () => ({
    isConnected: walletState.isConnected,
    address: walletState.address,
    chainId: null,
    isCorrectNetwork: true,
    disconnect: vi.fn(),
  }),
}));

function createWrapper(queryClient?: QueryClient) {
  const client =
    queryClient ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  }
  return { Wrapper, client };
}

describe('fetchCollectionMetadata', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('returns normalized metadata from the API', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'col-x',
        name: 'Test',
        description: 'Desc',
        artwork: '/a.jpg',
        trackCount: 3,
        totalPlays: 10,
        owner: '0x1',
      },
    });

    const meta = await fetchCollectionMetadata('col-x');
    expect(meta).toMatchObject({
      id: 'col-x',
      name: 'Test',
      trackCount: 3,
      totalPlays: 10,
      owner: '0x1',
    });
  });

  it('returns null when the collection is not found', async () => {
    mockGet.mockRejectedValue(new NotFoundError());
    await expect(fetchCollectionMetadata('missing')).resolves.toBeNull();
  });
});

describe('useCollectionMetadata', () => {
  beforeEach(() => {
    mockGet.mockReset();
    walletState.isConnected = false;
    walletState.address = null;
  });

  it('loads metadata for a known collection id', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'col-1',
        name: 'Afrobeats Essentials',
        description: 'desc',
        artwork: '/AFRO.jpg',
        trackCount: 12,
        totalPlays: 100,
        owner: '0xabc',
      },
    });

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCollectionMetadata('col-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data?.name).toBe('Afrobeats Essentials');
    expect(result.current.data?.trackCount).toBe(12);
    expect(result.current.error).toBeNull();
    expect(result.current.isNotFound).toBe(false);
  });

  it('reports isNotFound when metadata is missing', async () => {
    mockGet.mockRejectedValue(new NotFoundError());

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useCollectionMetadata('nope'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.isNotFound).toBe(true);
  });

  it('uses a 60 second staleTime', () => {
    expect(COLLECTION_METADATA_STALE_TIME).toBe(60_000);
    expect(collectionMetadataKeys.detail('x')).toEqual(['collection-metadata', 'x']);
  });

  it('invalidates cache when wallet connection changes', async () => {
    mockGet.mockResolvedValue({
      data: {
        id: 'col-1',
        name: 'A',
        description: '',
        artwork: '',
        trackCount: 1,
        totalPlays: 1,
        owner: '0x1',
      },
    });

    const { Wrapper, client } = createWrapper();
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries');

    const { rerender } = renderHook(() => useCollectionMetadata('col-1'), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(mockGet).toHaveBeenCalled());

    walletState.isConnected = true;
    walletState.address = '0xwallet';
    rerender();

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: collectionMetadataKeys.all,
      }),
    );
  });
});
