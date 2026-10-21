/**
 * Unit tests for useSorobanRelay hook
 * Issue #549
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSorobanRelay } from '../useSorobanRelay';

// Mock TransactionContext
vi.mock('@/context/TransactionContext', () => ({
  useTransaction: vi.fn(() => ({
    addTransaction: vi.fn(),
  })),
}));

describe('useSorobanRelay', () => {
  const mockPrepare = vi.fn();
  const mockSubmit = vi.fn();
  const mockOnError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
  });

  it('should start in idle state', () => {
    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
      })
    );

    expect(result.current.status).toBe('idle');
    expect(result.current.txHash).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should transition to preparing status when run is called', async () => {
    mockPrepare.mockImplementation(
      () =>
        new Promise(() => {
          /* never resolves */
        })
    );

    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
      })
    );

    act(() => {
      result.current.run();
    });

    await waitFor(() => {
      expect(result.current.status).toBe('preparing');
    });
  });

  it('should handle prepare failure', async () => {
    const prepareError = new Error('Prepare failed');
    mockPrepare.mockRejectedValue(prepareError);

    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
        onError: mockOnError,
      })
    );

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Prepare failed');
    expect(mockOnError).toHaveBeenCalledWith(prepareError);
  });

  it('should reject network mismatch', async () => {
    mockPrepare.mockResolvedValue({
      xdr: 'mock-xdr',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
    });

    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
      })
    );

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('Network mismatch');
  });

  it('should reject invalid prepare response', async () => {
    mockPrepare.mockResolvedValue({
      xdr: '',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });

    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
      })
    );

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('Invalid prepare response');
  });

  it('should reset state when reset is called', async () => {
    mockPrepare.mockRejectedValue(new Error('Test error'));

    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
      })
    );

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe('error');

    act(() => {
      result.current.reset();
    });

    expect(result.current.status).toBe('idle');
    expect(result.current.error).toBeNull();
    expect(result.current.txHash).toBeNull();
  });

  it('should handle user cancellation gracefully', async () => {
    const cancellationError = new Error('User rejected');
    mockPrepare.mockRejectedValue(cancellationError);

    const { result } = renderHook(() =>
      useSorobanRelay({
        prepare: mockPrepare,
        submit: mockSubmit,
      })
    );

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('cancelled');
  });
});
