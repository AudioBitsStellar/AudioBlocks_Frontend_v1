/**
 * User-facing copy and error classification for wallet connection failures.
 *
 * Wallet providers expose errors in a few different shapes (for example, an
 * EIP-1193 object, an `Error` with a nested cause, or a provider-specific
 * string). Keep the UI copy in one place so raw provider details never leak
 * into the interface.
 */

export const WALLET_CONNECTION_ERROR_MESSAGES = {
  cancelled: 'Wallet connection was cancelled. You can try again whenever you are ready.',
  failed: "We couldn't connect your wallet. Check your wallet and network, then try again.",
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
