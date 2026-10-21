/**
 * User-facing copy and error classification for wallet connection failures.
 *
 * Wallet providers expose errors in a few different shapes (for example, an
 * EIP-1193 object, an `Error` with a nested cause, or a provider-specific
 * string). Keep the UI copy in one place so raw provider details never leak
 * into the interface.
 *
 * Extended to support Soroban on-chain error codes (Issue #549)
 */

export const WALLET_CONNECTION_ERROR_MESSAGES = {
  cancelled: 'Wallet connection was cancelled. You can try again whenever you are ready.',
  failed: "We couldn't connect your wallet. Check your wallet and network, then try again.",
} as const;

/**
 * Map Soroban on-chain error codes to user-friendly messages
 * Based on AudioBlock_Backend/src/types/OnChainErrorCodes.ts
 */
export const SOROBAN_ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Insufficient balance to complete this transaction.',
  LISTING_NOT_FOUND: 'This listing is no longer available.',
  LISTING_ALREADY_SOLD: 'This item has already been sold.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  INVALID_PRICE: 'The price for this item is invalid.',
  CONTRACT_ERROR: 'A contract error occurred. Please try again.',
  TRANSACTION_FAILED: 'The transaction failed. Please check your balance and try again.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
} as const;

const ERROR_FIELDS = ['name', 'code', 'message', 'reason', 'cause', 'error', 'details'] as const;
const MAX_ERROR_DEPTH = 4;

const USER_CANCELLATION_CODES = new Set([
  '4001',
  'action rejected',
  'user rejected',
  'user denied',
  'user cancelled',
  'user canceled',
]);

const USER_CANCELLATION_PATTERNS = [
  'user rejected',
  'user denied',
  'rejected the request',
  'rejected by user',
  'user cancelled',
  'user canceled',
  'user cancellation',
  'action rejected',
] as const;

type ErrorRecord = Record<string, unknown>;

function isRecord(value: unknown): value is ErrorRecord {
  return typeof value === 'object' && value !== null;
}

function normalizeErrorValue(value: string): string {
  return value.toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function getErrorField(value: ErrorRecord, field: (typeof ERROR_FIELDS)[number]): unknown {
  try {
    return value[field];
  } catch {
    return undefined;
  }
}

/**
 * Collects only fields commonly used by wallet SDKs. The depth and cycle
 * guards keep malformed provider errors from causing the error handler itself
 * to fail.
 */
function collectErrorValues(value: unknown, depth = 0, visited = new Set<object>()): string[] {
  if (typeof value === 'string') return [normalizeErrorValue(value)];
  if (typeof value === 'number') return [normalizeErrorValue(String(value))];
  if (!isRecord(value) || depth >= MAX_ERROR_DEPTH || visited.has(value)) return [];

  visited.add(value);
  return ERROR_FIELDS.flatMap((field) =>
    collectErrorValues(getErrorField(value, field), depth + 1, visited)
  );
}

/**
 * Returns true when a provider error represents an intentional cancellation or
 * rejection rather than a wallet/RPC failure.
 */
export function isUserCancellationError(error: unknown): boolean {
  return collectErrorValues(error).some((value) => {
    return (
      USER_CANCELLATION_CODES.has(value) ||
      USER_CANCELLATION_PATTERNS.some((pattern) => value.includes(pattern))
    );
  });
}

/** Returns safe, actionable copy for a wallet connection error. */
export function getWalletConnectionErrorMessage(error: unknown): string {
  return isUserCancellationError(error)
    ? WALLET_CONNECTION_ERROR_MESSAGES.cancelled
    : WALLET_CONNECTION_ERROR_MESSAGES.failed;
}

/**
 * Returns user-friendly message for Soroban on-chain errors
 * @param errorCode - Error code from backend (e.g., 'LISTING_NOT_FOUND')
 * @returns User-friendly error message
 */
export function getSorobanErrorMessage(errorCode: string): string {
  return SOROBAN_ERROR_MESSAGES[errorCode] || 'An unexpected error occurred. Please try again.';
}

/**
 * Extracts error code from backend error response
 * @param error - Error object from backend
 * @returns Error code string or null
 */
export function extractErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (typeof err.code === 'string') return err.code;
    if (typeof err.errorCode === 'string') return err.errorCode;
    if (typeof err.error === 'object' && err.error !== null) {
      const nested = err.error as Record<string, unknown>;
      if (typeof nested.code === 'string') return nested.code;
    }
  }
  return null;
}
