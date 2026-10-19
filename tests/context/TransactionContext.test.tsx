import { renderHook, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TransactionProvider, useTransaction } from '@/context/TransactionContext';

const toastMock = vi.fn();
vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <TransactionProvider>{children}</TransactionProvider>
);

const HASH = '0xabcdef1234567890';

function mockStatus(body: Record<string, unknown>, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  });
}

describe('TransactionContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    toastMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('throws when useTransaction is used outside the provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useTransaction())).toThrow(
      'useTransaction must be used inside TransactionProvider',
    );
    consoleSpy.mockRestore();
  });

  it('starts with no transactions', () => {
    const { result } = renderHook(() => useTransaction(), { wrapper });
    expect(result.current.transactions).toEqual([]);
  });

  it('adds a pending transaction, returns its id and shows an info toast', () => {
    vi.stubGlobal('fetch', mockStatus({ status: 'pending' }));
    const { result } = renderHook(() => useTransaction(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.addTransaction(HASH, 'buy');
    });

    expect(id).toMatch(/^tx-/);
    expect(result.current.transactions).toHaveLength(1);
    expect(result.current.transactions[0]).toMatchObject({
      id,
      hash: HASH,
      type: 'buy',
      status: 'pending',
    });
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'info', title: 'Transaction pending' }),
    );
  });

  it('keeps newest transactions first and caps the list at 20', () => {
    vi.stubGlobal('fetch', mockStatus({ status: 'pending' }));
    const { result } = renderHook(() => useTransaction(), { wrapper });

    act(() => {
      for (let i = 0; i < 25; i++) {
        result.current.addTransaction(`0x${i}`, 'vote');
      }
    });

    expect(result.current.transactions).toHaveLength(20);
    expect(result.current.transactions[0].hash).toBe('0x24');
  });

  it('marks a transaction confirmed, shows a success toast and auto-clears it after 60s', async () => {
    vi.stubGlobal('fetch', mockStatus({ confirmed: true }));
    const { result } = renderHook(() => useTransaction(), { wrapper });

    act(() => {
      result.current.addTransaction(HASH, 'stake');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(fetch).toHaveBeenCalledWith(
      `/api/transactions/${HASH}/status`,
      expect.objectContaining({ method: 'GET' }),
    );
    expect(result.current.transactions[0].status).toBe('confirmed');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'success', title: 'Transaction confirmed' }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(result.current.transactions).toHaveLength(0);
  });

  it('marks a transaction failed and shows an error toast', async () => {
    vi.stubGlobal('fetch', mockStatus({ status: 'failed' }));
    const { result } = renderHook(() => useTransaction(), { wrapper });

    act(() => {
      result.current.addTransaction(HASH, 'buy');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.transactions[0].status).toBe('failed');
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Transaction failed' }),
    );
  });

  it('ignores non-ok poll responses and keeps the transaction pending', async () => {
    vi.stubGlobal('fetch', mockStatus({}, false));
    const { result } = renderHook(() => useTransaction(), { wrapper });

    act(() => {
      result.current.addTransaction(HASH, 'vote');
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    expect(result.current.transactions[0].status).toBe('pending');
  });

  it('updateTransactionStatus changes the status of a single transaction', () => {
    vi.stubGlobal('fetch', mockStatus({ status: 'pending' }));
    const { result } = renderHook(() => useTransaction(), { wrapper });

    let id = '';
    act(() => {
      id = result.current.addTransaction(HASH, 'buy');
    });
    act(() => {
      result.current.updateTransactionStatus(id, 'failed');
    });

    expect(result.current.transactions[0].status).toBe('failed');
  });

  it('clearTransaction removes only the given transaction and stops its polling', async () => {
    const fetchMock = mockStatus({ status: 'pending' });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useTransaction(), { wrapper });

    let first = '';
    act(() => {
      first = result.current.addTransaction('0xfirst', 'buy');
      result.current.addTransaction('0xsecond', 'buy');
    });

    act(() => {
      result.current.clearTransaction(first);
    });

    expect(result.current.transactions.map((tx) => tx.hash)).toEqual(['0xsecond']);

    fetchMock.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });

    const polledHashes = fetchMock.mock.calls.map(([url]) => url);
    expect(polledHashes).not.toContain('/api/transactions/0xfirst/status');
    expect(polledHashes).toContain('/api/transactions/0xsecond/status');
  });

  it('clearAllTransactions empties the list and stops all polling', async () => {
    const fetchMock = mockStatus({ status: 'pending' });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => useTransaction(), { wrapper });

    act(() => {
      result.current.addTransaction('0xa', 'buy');
      result.current.addTransaction('0xb', 'stake');
    });

    act(() => {
      result.current.clearAllTransactions();
    });

    expect(result.current.transactions).toEqual([]);

    fetchMock.mockClear();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
