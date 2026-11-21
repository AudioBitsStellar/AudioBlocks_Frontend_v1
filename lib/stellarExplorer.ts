/**
 * Stellar explorer and IPFS link helpers for on-chain song provenance.
 *
 * Soroban contract IDs are StrKey-encoded: a `C` prefix followed by 55
 * base32 characters. IPFS CIDs are base32/base58 alphanumerics. Both are
 * validated before they are placed in a URL so a malformed value from the
 * backend cannot change the link's host or path.
 */

export type StellarNetwork = 'public' | 'testnet';

const STELLAR_EXPERT_BASE = 'https://stellar.expert/explorer';
const IPFS_GATEWAY_BASE = 'https://ipfs.io/ipfs';

const CONTRACT_ID_PATTERN = /^C[A-Z2-7]{55}$/;
const CID_PATTERN = /^[A-Za-z0-9]{10,}$/;

// Get Stellar network configuration from environment
function getStellarNetwork(): StellarNetwork {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  return network === 'testnet' ? 'testnet' : 'public';
}

/**
 * Get base URL for stellar.expert based on network configuration
 * @returns Base URL for stellar.expert
 */
function getStellarExplorerBase(): string {
  const network = getStellarNetwork();
  return `${STELLAR_EXPERT_BASE}/${network}`;
}

export function isValidContractId(value: string): boolean {
  return CONTRACT_ID_PATTERN.test(value);
}

/**
 * Build stellar.expert URL for a transaction hash
 * @param hash - Transaction hash
 * @returns Full URL to stellar.expert transaction page
 */
export function getStellarTxUrl(hash: string): string {
  const baseUrl = getStellarExplorerBase();
  return `${baseUrl}/tx/${hash}`;
}

/**
 * Build stellar.expert URL for a Stellar account (G... address)
 * @param accountId - Stellar account public key (G...)
 * @returns Full URL to stellar.expert account page
 */
export function getStellarAccountUrl(accountId: string): string {
  const baseUrl = getStellarExplorerBase();
  return `${baseUrl}/account/${accountId}`;
}

/** Explorer URL for a Soroban contract, or `null` if the ID is malformed. */
export function getStellarContractUrl(
  contractId: string,
  network?: StellarNetwork
): string {
  const baseUrl = network 
    ? `${STELLAR_EXPERT_BASE}/${network}` 
    : getStellarExplorerBase();
  return `${baseUrl}/contract/${contractId}`;
}

/** IPFS gateway URL for a metadata CID, or `null` if the CID is malformed. */
export function getIpfsUrl(cid: string): string | null {
  if (!CID_PATTERN.test(cid)) return null;
  return `${IPFS_GATEWAY_BASE}/${cid}`;
}

/** Shortens a long identifier for display, e.g. `CABCDE…WXYZ`. */
export function shortenId(value: string, head = 6, tail = 4): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}
