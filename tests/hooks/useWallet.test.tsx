import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAccount, useChainId, useDisconnect } from 'wagmi';
import { WalletProvider, useWallet } from '@/context/WalletContext';

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
  useChainId: vi.fn(),
  useDisconnect: vi.fn(),
}));

const mockUseDynamicContext = vi.mocked(useDynamicContext);
const mockUseAccount = vi.mocked(useAccount);
const mockUseChainId = vi.mocked(useChainId);
const mockUseDisconnect = vi.mocked(useDisconnect);

describe('useWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockPrimaryWallet = { address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38' };
  const mockHandleLogOut = vi.fn();
  const mockDisconnect = vi.fn();
  const supportedChainId = 11155111;

  function WalletTestWrapper({ children }: { children: React.ReactNode }) {
    return <WalletProvider>{children}</WalletProvider>;
  }

  it('returns disconnected state initially', () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: null,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({ address: null, isConnected: false });
    mockUseChainId.mockReturnValue(0);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    const { result } = renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(result.current.isConnected).toBe(false);
    expect(result.current.address).toBeNull();
    expect(result.current.chainId).toBeNull();
    expect(result.current.isCorrectNetwork).toBe(false);
  });

  it('returns connected state when wallet is connected', () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: mockPrimaryWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(supportedChainId);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    const { result } = renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.address).toBe('0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38');
    expect(result.current.chainId).toBe(supportedChainId);
    expect(result.current.isCorrectNetwork).toBe(true);
  });

  it('disconnect clears state and calls disconnect handlers', async () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: mockPrimaryWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(supportedChainId);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    const { result } = renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(result.current.isConnected).toBe(true);

    await act(async () => {
      result.current.disconnect();
    });

    expect(mockDisconnect).toHaveBeenCalled();
    expect(mockHandleLogOut).toHaveBeenCalled();
    expect(localStorage.getItem('audioblocks_wallet_connected')).toBeNull();
  });

  it('persists connection intent to localStorage when connected', () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: mockPrimaryWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(supportedChainId);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(localStorage.getItem('audioblocks_wallet_connected')).toBe('true');
  });

  it('removes persisted intent on disconnect', async () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: mockPrimaryWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(supportedChainId);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    const { result } = renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(localStorage.getItem('audioblocks_wallet_connected')).toBe('true');

    await act(async () => {
      result.current.disconnect();
    });

    expect(localStorage.getItem('audioblocks_wallet_connected')).toBeNull();
  });

  it('isCorrectNetwork true on supported chain', () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: mockPrimaryWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(1);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    const { result } = renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(result.current.isCorrectNetwork).toBe(true);
  });

  it('isCorrectNetwork false on unsupported chain', () => {
    mockUseDynamicContext.mockReturnValue({
      primaryWallet: mockPrimaryWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38',
      isConnected: true,
    });
    mockUseChainId.mockReturnValue(999999);

    mockUseDisconnect.mockReturnValue({ disconnect: mockDisconnect });

    const { result } = renderHook(() => useWallet(), { wrapper: WalletTestWrapper });

    expect(result.current.isCorrectNetwork).toBe(false);
  });

  it('throws error when used outside WalletProvider', () => {
    expect(() => renderHook(() => useWallet())).toThrow(
      'useWallet must be used inside WalletProvider'
    );
  });
});
