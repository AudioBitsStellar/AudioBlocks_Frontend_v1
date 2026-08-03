import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { renderHook, act, waitFor } from '@testing-library/react';
import Cookies from 'js-cookie';
import { toast } from 'sonner';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { useAccount } from 'wagmi';
import { Auth } from '@/hooks/useAuth';
import apiClient from '@/lib/apiClient';

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicContext: vi.fn(),
}));

vi.mock('wagmi', () => ({
  useAccount: vi.fn(),
}));

vi.mock('js-cookie', () => ({
  default: {
    set: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock('@/lib/apiClient', () => ({
  default: {
    post: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUseDynamicContext = vi.mocked(useDynamicContext);
const mockUseAccount = vi.mocked(useAccount);
const mockCookies = vi.mocked(Cookies);
const mockApiClient = vi.mocked(apiClient);
const mockToast = vi.mocked(toast);

describe('Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const mockUser = { userId: 'user-1', email: 'test@example.com' };
  const mockAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38';

  it('triggers signature flow when user, wallet, and address are present', async () => {
    const mockWallet = { signMessage: vi.fn() };
    const mockHandleLogOut = vi.fn();

    mockUseDynamicContext.mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({ address: mockAddress, isConnected: true });

    const signature = '0xsignature';
    mockWallet.signMessage.mockResolvedValue(signature);
    mockApiClient.post.mockResolvedValue({
      data: { user: { token: 'jwt-token' }, message: 'Login successful' },
    });

    const { result } = renderHook(() => Auth());

    act(() => {
      result.current.setShouldTriggerSignature(true);
    });

    await waitFor(() => expect(mockWallet.signMessage).toHaveBeenCalled(), { timeout: 2000 });

    expect(mockApiClient.post).toHaveBeenCalledWith('/api/auth/login', {
      role: 'listener',
      email: 'test@example.com',
      walletAddress: mockAddress,
      signature,
      message: expect.stringContaining('Welcome to AudioBlocks!'),
    });
    expect(mockCookies.set).toHaveBeenCalledWith('audioblocks_jwt', 'jwt-token');
    expect(mockToast.success).toHaveBeenCalledWith('Login successful');
  });

  it('falls back to register when user is not found', async () => {
    const mockWallet = { signMessage: vi.fn() };
    const mockHandleLogOut = vi.fn();

    mockUseDynamicContext.mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({ address: mockAddress, isConnected: true });

    mockWallet.signMessage.mockResolvedValue('0xsignature');

    mockApiClient.post
      .mockRejectedValueOnce({
        response: { data: { message: 'User not found' } },
      })
      .mockResolvedValueOnce({
        data: { user: { token: 'register-token' }, message: 'Registered successfully' },
      });

    const { result } = renderHook(() => Auth());

    act(() => {
      result.current.setShouldTriggerSignature(true);
    });

    await waitFor(() => expect(mockApiClient.post).toHaveBeenCalledTimes(2), { timeout: 2000 });

    expect(mockApiClient.post).toHaveBeenNthCalledWith(1, '/api/auth/login', {
      role: 'listener',
      email: 'test@example.com',
      walletAddress: mockAddress,
      signature: '0xsignature',
      message: expect.stringContaining('Welcome to AudioBlocks!'),
    });
    expect(mockApiClient.post).toHaveBeenNthCalledWith(2, '/api/auth/register', {
      role: 'listener',
      email: 'test@example.com',
      walletAddress: mockAddress,
      signature: '0xsignature',
      message: expect.stringContaining('Welcome to AudioBlocks!'),
    });
    expect(mockCookies.set).toHaveBeenCalledWith('audioblocks_jwt', 'register-token');
  });

  it('shows error toast and calls handleLogOut on generic auth failure', async () => {
    const mockWallet = { signMessage: vi.fn() };
    const mockHandleLogOut = vi.fn();

    mockUseDynamicContext.mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({ address: mockAddress, isConnected: true });

    mockWallet.signMessage.mockResolvedValue('0xsignature');
    mockApiClient.post.mockRejectedValue({
      response: { data: { message: 'Server error' } },
    });

    const { result } = renderHook(() => Auth());

    act(() => {
      result.current.setShouldTriggerSignature(true);
    });

    await waitFor(() => expect(mockApiClient.post).toHaveBeenCalled(), { timeout: 2000 });

    expect(mockToast.error).toHaveBeenCalledWith('Server error');
  });

  it('shows cancellation toast on user rejection error', async () => {
    const mockWallet = { signMessage: vi.fn() };
    const mockHandleLogOut = vi.fn();

    mockUseDynamicContext.mockReturnValue({
      user: mockUser,
      primaryWallet: mockWallet,
      handleLogOut: mockHandleLogOut,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({ address: mockAddress, isConnected: true });

    mockWallet.signMessage.mockRejectedValue(new Error('User rejected the request'));
    mockApiClient.post.mockResolvedValue({
      data: { user: { token: 'jwt-token' }, message: 'Login successful' },
    });

    const { result } = renderHook(() => Auth());

    act(() => {
      result.current.setShouldTriggerSignature(true);
    });

    await waitFor(() => expect(mockWallet.signMessage).toHaveBeenCalled(), { timeout: 2000 });

    expect(mockToast.error).toHaveBeenCalledWith(
      'Signature request was cancelled. Please sign the message to continue.'
    );
  });

  it('does not trigger signature flow when required values are missing', async () => {
    const mockWallet = { signMessage: vi.fn() };

    mockUseDynamicContext.mockReturnValue({
      user: null,
      primaryWallet: null,
      handleLogOut: vi.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    mockUseAccount.mockReturnValue({ address: null, isConnected: false });

    const { result } = renderHook(() => Auth());

    act(() => {
      result.current.setShouldTriggerSignature(true);
    });

    await waitFor(() => expect(mockWallet.signMessage).not.toHaveBeenCalled(), { timeout: 1000 });
    expect(mockApiClient.post).not.toHaveBeenCalled();
  });
});
