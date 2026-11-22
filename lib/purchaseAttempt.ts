import { getApiUrl } from './apiUrl';

export interface PurchaseAttempt { key: string; txHash?: string }
export function purchaseStorageKey(network: string, buyer: string, tokenId: string): string {
  return `audioblocks:purchase:${network}:${buyer}:${tokenId}`;
}
export function readPurchaseAttempt(scope: string): PurchaseAttempt | null {
  const raw = localStorage.getItem(scope);
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (!value || typeof value.key !== 'string' ||
      (value.txHash !== undefined && typeof value.txHash !== 'string'))
    throw new Error('Purchase recovery data is invalid. Check transaction history before buying again.');
  return value;
}
/** Proposed backend contract. Missing/unknown responses never unlock another purchase. */
export async function reconcilePurchase(attempt: PurchaseAttempt): Promise<{
  status: 'pending' | 'confirmed' | 'failed'; txHash?: string;
}> {
  const response = await fetch(getApiUrl(`marketplace/purchases/${encodeURIComponent(attempt.key)}`), {
    credentials: 'include', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Purchase status unavailable. Check transaction history; do not buy again yet.');
  const data = await response.json();
  if (!['pending', 'confirmed', 'failed'].includes(data.status) ||
      (data.txHash !== undefined && typeof data.txHash !== 'string') ||
      (data.status === 'confirmed' && !data.txHash))
    throw new Error('Purchase status is not confirmed yet. Check again shortly.');
  return data;
}
