import { describe, expect, it } from 'vitest';
import {
  getWalletConnectionErrorMessage,
  isUserCancellationError,
  WALLET_CONNECTION_ERROR_MESSAGES,
  getWalletSigningErrorMessage,
  getSorobanErrorMessage,
} from '@/lib/walletErrors';

describe('walletErrors', () => {
  it.each([
    [{ message: 'Extension not found' }, 'Install or enable'],
    [{ error: { message: 'Wallet is locked' } }, 'unlock'],
    [{ code: 'WRONG_NETWORK' }, 'Switch your wallet'],
    [new Error('User declined'), 'cancelled'],
  ])('provides an actionable state for %o', (error, expected) => {
    expect(getWalletConnectionErrorMessage(error)).toContain(expected);
  });

  it('explains rejected signing without calling it a connection failure', () => {
    expect(getWalletSigningErrorMessage({ code: 4001 })).toContain('Nothing was submitted');
  });

  it('explains funding and exact asset identity for trustline failures', () => {
    expect(getSorobanErrorMessage('INSUFFICIENT_BALANCE')).toContain('account reserve');
    expect(getSorobanErrorMessage('MISSING_TRUSTLINE')).toContain('asset code and issuer');
  });
  describe('isUserCancellationError', () => {
    it.each([
      new Error('User rejected the request'),
      { code: 4001 },
      { code: '4001' },
      { reason: 'user-cancelled' },
      { error: new Error('ACTION_REJECTED') },
      { cause: { code: 'USER_CANCELLED' } },
      'user denied the request',
    ])('recognizes an intentional rejection: %o', (error) => {
      expect(isUserCancellationError(error)).toBe(true);
    });

    it('handles empty, non-object, and cyclic error values safely', () => {
      const cyclicError: { cause?: unknown } = {};
      cyclicError.cause = cyclicError;

      expect(isUserCancellationError(undefined)).toBe(false);
      expect(isUserCancellationError(null)).toBe(false);
      expect(isUserCancellationError(cyclicError)).toBe(false);
    });

    it('does not treat a generic provider failure as a cancellation', () => {
      expect(isUserCancellationError(new Error('RPC endpoint unavailable'))).toBe(false);
      expect(isUserCancellationError({ code: -32000, message: 'request failed' })).toBe(false);
      expect(isUserCancellationError(new Error('Request cancelled by the network client'))).toBe(
        false
      );
    });

    it('does not throw when an error field has a throwing getter', () => {
      const malformedError = Object.defineProperty({}, 'message', {
        get: () => {
          throw new Error('do not inspect this value');
        },
      });

      expect(isUserCancellationError(malformedError)).toBe(false);
      expect(getWalletConnectionErrorMessage(malformedError)).toBe(
        WALLET_CONNECTION_ERROR_MESSAGES.failed
      );
    });
  });

  describe('getWalletConnectionErrorMessage', () => {
    it('uses cancellation copy for a user rejection', () => {
      expect(getWalletConnectionErrorMessage({ code: 4001 })).toBe(
        WALLET_CONNECTION_ERROR_MESSAGES.cancelled
      );
    });

    it('uses safe fallback copy for an unknown connection failure', () => {
      expect(getWalletConnectionErrorMessage(new Error('private provider detail'))).toBe(
        WALLET_CONNECTION_ERROR_MESSAGES.failed
      );
    });
  });
});
