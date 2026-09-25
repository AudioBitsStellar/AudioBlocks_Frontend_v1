import { useDynamicEvents } from '@dynamic-labs/sdk-react-core';
import { renderHook } from '@testing-library/react';
import { toast } from 'sonner';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { useWalletConnectionErrors } from '@/hooks/useWalletConnectionErrors';
import { WALLET_CONNECTION_ERROR_MESSAGES } from '@/lib/walletErrors';

vi.mock('@dynamic-labs/sdk-react-core', () => ({
  useDynamicEvents: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockUseDynamicEvents = vi.mocked(useDynamicEvents);
const mockToast = vi.mocked(toast);

type ConnectionFailureHandler = (walletConnector: unknown, error: unknown) => void;

function getConnectionFailureHandler(): ConnectionFailureHandler {
  const handler = mockUseDynamicEvents.mock.calls[0]?.[1];
  if (typeof handler !== 'function') {
    throw new Error('wallet connection failure handler was not registered');
  }
  return handler as ConnectionFailureHandler;
}

describe('useWalletConnectionErrors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers one provider-level connection failure handler', () => {
    renderHook(() => useWalletConnectionErrors());

    expect(mockUseDynamicEvents).toHaveBeenCalledTimes(1);
    expect(mockUseDynamicEvents).toHaveBeenCalledWith(
      'walletConnectionFailed',
      expect.any(Function)
    );
  });

  it('shows the fallback message without exposing provider details', () => {
    renderHook(() => useWalletConnectionErrors());

    getConnectionFailureHandler()({}, new Error('sensitive provider detail'));

    expect(mockToast.error).toHaveBeenCalledWith(WALLET_CONNECTION_ERROR_MESSAGES.failed);
    expect(mockToast.error).toHaveBeenCalledTimes(1);
    expect(mockToast.error).not.toHaveBeenCalledWith(
      expect.stringContaining('sensitive provider detail')
    );
  });

  it('shows cancellation-specific copy when the user rejects the request', () => {
    renderHook(() => useWalletConnectionErrors());

    getConnectionFailureHandler()({}, { code: 4001 });

    expect(mockToast.error).toHaveBeenCalledWith(WALLET_CONNECTION_ERROR_MESSAGES.cancelled);
    expect(mockToast.error).toHaveBeenCalledTimes(1);
  });
});
