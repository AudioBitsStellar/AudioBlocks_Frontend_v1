import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSorobanRelay } from '../useSorobanRelay';
import { purchaseStorageKey } from '@/lib/purchaseAttempt';

const mocks = vi.hoisted(() => ({ sign: vi.fn(), add: vi.fn(), reconcile: vi.fn() }));
vi.mock('@/context/StellarWalletContext', () => ({
  useStellarWallet: () => ({ publicKey: 'buyer', network: 'testnet', signTransaction: mocks.sign }),
}));
vi.mock('@/context/TransactionContext', () => ({ useTransaction: () => ({ addTransaction: mocks.add }) }));
vi.mock('@/lib/purchaseAttempt', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/lib/purchaseAttempt')>(), reconcilePurchase: mocks.reconcile,
}));
const prepared = { xdr: 'unsigned', networkPassphrase: 'Test SDF Network ; September 2015' };
const scope = purchaseStorageKey('testnet', 'buyer', 'token');

beforeEach(() => {
  vi.resetAllMocks(); localStorage.clear();
  mocks.sign.mockResolvedValue('signed');
  mocks.reconcile.mockResolvedValue({ status: 'pending' });
});

describe('purchase relay safety', () => {
  it('locks rapid clicks synchronously and sends one attempt key through prepare and submit', async () => {
    let finish!: (value: typeof prepared) => void;
    const prepare = vi.fn(() => new Promise<typeof prepared>(resolve => { finish = resolve; }));
    const submit = vi.fn().mockResolvedValue({ txHash: 'hash' });
    const { result, unmount } = renderHook(() => useSorobanRelay({ prepare, submit, purchaseTokenId: 'token' }));
    let first!: Promise<void>;
    await act(async () => { first = result.current.run(); void result.current.run(); });
    await waitFor(() => expect(prepare).toHaveBeenCalledTimes(1));
    const key = JSON.parse(localStorage.getItem(scope)!).key;
    await act(async () => { finish(prepared); await first; });
    expect(submit).toHaveBeenCalledExactlyOnceWith('signed', key);
    expect(prepare).toHaveBeenCalledWith(key);
    expect(result.current.status).toBe('pending');
    unmount();
  });

  it('recovers a reload during submission from server truth without signing again', async () => {
    localStorage.setItem(scope, JSON.stringify({ key: 'existing' }));
    mocks.reconcile.mockResolvedValue({ status: 'confirmed', txHash: 'confirmed-hash' });
    const prepare = vi.fn(); const submit = vi.fn(); const onSuccess = vi.fn();
    const { result, unmount } = renderHook(() => useSorobanRelay({ prepare, submit, onSuccess, purchaseTokenId: 'token' }));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(prepare).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
    expect(mocks.sign).not.toHaveBeenCalled(); expect(onSuccess).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('keeps ambiguous submission failures locked and persisted', async () => {
    const prepare = vi.fn().mockResolvedValue(prepared);
    const submit = vi.fn().mockRejectedValue(new Error('connection lost'));
    const { result, unmount } = renderHook(() => useSorobanRelay({ prepare, submit, purchaseTokenId: 'token' }));
    await act(async () => { await result.current.run(); });
    expect(result.current.status).toBe('pending'); expect(localStorage.getItem(scope)).toBeTruthy();
    await act(async () => { await result.current.run(); });
    expect(submit).toHaveBeenCalledTimes(1);
    unmount();
  });

  it('does not submit a rejected signature and allows retry', async () => {
    mocks.sign.mockRejectedValue({ code: 4001 });
    const submit = vi.fn();
    const { result, unmount } = renderHook(() => useSorobanRelay({
      prepare: vi.fn().mockResolvedValue(prepared), submit, purchaseTokenId: 'token',
    }));
    await act(async () => { await result.current.run(); });
    expect(submit).not.toHaveBeenCalled(); expect(localStorage.getItem(scope)).toBeNull();
    expect(result.current.error).toContain('Signature rejected');
    unmount();
  });

  it('rejects a prepared transaction for the wrong network before requesting a signature', async () => {
    const submit = vi.fn();
    const { result, unmount } = renderHook(() => useSorobanRelay({
      prepare: vi.fn().mockResolvedValue({ ...prepared, networkPassphrase: 'wrong-network' }),
      submit, purchaseTokenId: 'token',
    }));
    await act(async () => { await result.current.run(); });
    expect(mocks.sign).not.toHaveBeenCalled(); expect(submit).not.toHaveBeenCalled();
    expect(result.current.error).toContain('Wrong network');
    unmount();
  });
});
