import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAccount } from 'wagmi';
import { useWalletAnalytics } from '@/hooks/useWalletAnalytics';
import { trackEvent } from '@/lib/analytics';

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseDynamicContext = vi.mocked(useDynamicContext);
const mockTrackEvent = vi.mocked(trackEvent);

const baseAccount = {
  address: null,
  isConnected: false,
  isDisconnected: true,
  chainId: null,
  connector: undefined,
};

describe('useWalletAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseDynamicContext.mockReturnValue({
      user: null,
      primaryWallet: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  });

  it('does not track on initial mount', () => {
    mockUseAccount.mockReturnValue({
      ...baseAccount,
      address: '0xabc',
      isConnected: true,
      isDisconnected: false,
      chainId: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connector: { name: 'MetaMask' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    renderHook(() => useWalletAnalytics());
    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('tracks wallet_connect when the wallet transitions to connected', () => {
    mockUseDynamicContext.mockReturnValue({
      user: { userId: 'user-1', verifiedCredentials: [] },
      primaryWallet: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    mockUseAccount.mockReturnValue(baseAccount as never);
    const { rerender } = renderHook(() => useWalletAnalytics());

    mockUseAccount.mockReturnValue({
      ...baseAccount,
      address: '0xabc',
      isConnected: true,
      isDisconnected: false,
      chainId: 11155111,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connector: { name: 'MetaMask' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    act(() => rerender());

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'wallet_connect',
      expect.objectContaining({
        address: '0xabc',
        chainId: 11155111,
        walletProvider: 'MetaMask',
        isNewUser: true,
      })
    );
  });

  it('tracks wallet_disconnect when the wallet transitions to disconnected', () => {
    mockUseAccount.mockReturnValue({
      ...baseAccount,
      address: '0xabc',
      isConnected: true,
      isDisconnected: false,
      chainId: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connector: { name: 'MetaMask' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { rerender } = renderHook(() => useWalletAnalytics());

    mockUseAccount.mockReturnValue(baseAccount as never);
    act(() => rerender());

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(
      'wallet_disconnect',
      expect.objectContaining({
        address: '0xabc',
        chainId: 1,
      })
    );
  });

  it('does not track when the connected state is unchanged', () => {
    mockUseAccount.mockReturnValue({
      ...baseAccount,
      address: '0xabc',
      isConnected: true,
      isDisconnected: false,
      chainId: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connector: { name: 'MetaMask' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    const { rerender } = renderHook(() => useWalletAnalytics());

    mockUseAccount.mockReturnValue({
      ...baseAccount,
      address: '0xabc',
      isConnected: true,
      isDisconnected: false,
      chainId: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      connector: { name: 'MetaMask' } as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    act(() => rerender());

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
