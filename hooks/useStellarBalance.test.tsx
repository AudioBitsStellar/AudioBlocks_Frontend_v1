/**
 * Unit tests for useStellarBalance hook (#555).
 *
 * Tests balance calculation, reserve logic, unfunded accounts, and error handling
 * with mocked Horizon responses.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStellarBalance } from './useStellarBalance';
import { ACTIVE_STELLAR_NETWORK, STELLAR_BASE_RESERVE } from '@/lib/stellarConfig';

// Mock wagmi's useAccount
vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({ address: 'GABC123...' })),
}));

const mockAddress = 'GABC123MOCKADDRESS456789';
const horizonUrl = ACTIVE_STELLAR_NETWORK.horizonUrl;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useStellarBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches and calculates spendable balance for a funded account', async () => {
    const mockAccount = {
      account_id: mockAddress,
      balances: [
        {
          asset_type: 'native',
          balance: '100.5',
          selling_liabilities: '2.0',
        },
      ],
      subentry_count: 3,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAccount,
    });

    const { result } = renderHook(() => useStellarBalance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      `${horizonUrl}/accounts/${mockAddress}`,
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );

    // xlm = 100.5
    // minReserve = (2 + 3) * 0.5 = 2.5
    // sellingLiabilities = 2.0
    // spendable = 100.5 - 2.5 - 2.0 = 96.0
    expect(result.current.data).toEqual({
      xlm: 100.5,
      spendableXlm: 96.0,
      isFunded: true,
    });
  });

  it('returns isFunded: false for unfunded accounts (Horizon 404)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    });

    const { result } = renderHook(() => useStellarBalance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({
      xlm: 0,
      spendableXlm: 0,
      isFunded: false,
    });
  });

  it('computes minimum reserve correctly based on subentry count', async () => {
    const mockAccount = {
      account_id: mockAddress,
      balances: [
        {
          asset_type: 'native',
          balance: '10.0',
          selling_liabilities: '0',
        },
      ],
      subentry_count: 10,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAccount,
    });

    const { result } = renderHook(() => useStellarBalance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // minReserve = (2 + 10) * 0.5 = 6.0
    // spendable = 10.0 - 6.0 - 0 = 4.0
    expect(result.current.data?.spendableXlm).toBe(4.0);
  });

  it('returns 0 spendable when balance is below minimum reserve', async () => {
    const mockAccount = {
      account_id: mockAddress,
      balances: [
        {
          asset_type: 'native',
          balance: '1.0',
          selling_liabilities: '0',
        },
      ],
      subentry_count: 5,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAccount,
    });

    const { result } = renderHook(() => useStellarBalance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // minReserve = (2 + 5) * 0.5 = 3.5
    // spendable = max(0, 1.0 - 3.5 - 0) = 0
    expect(result.current.data?.xlm).toBe(1.0);
    expect(result.current.data?.spendableXlm).toBe(0);
    expect(result.current.data?.isFunded).toBe(true);
  });

  it('throws an error for non-404 HTTP failures', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useStellarBalance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Horizon request failed: 500');
  });

  it('accounts for selling liabilities when calculating spendable balance', async () => {
    const mockAccount = {
      account_id: mockAddress,
      balances: [
        {
          asset_type: 'native',
          balance: '50.0',
          selling_liabilities: '10.0',
        },
      ],
      subentry_count: 2,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockAccount,
    });

    const { result } = renderHook(() => useStellarBalance(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // minReserve = (2 + 2) * 0.5 = 2.0
    // sellingLiabilities = 10.0
    // spendable = 50.0 - 2.0 - 10.0 = 38.0
    expect(result.current.data?.spendableXlm).toBe(38.0);
  });
});
