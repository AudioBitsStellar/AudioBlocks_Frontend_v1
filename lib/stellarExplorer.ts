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

export function isValidContractId(value: string): boolean {
  return CONTRACT_ID_PATTERN.test(value);
}

/** Explorer URL for a Soroban contract, or `null` if the ID is malformed. */
export function getStellarContractUrl(
  contractId: string,
  network: StellarNetwork = 'testnet'
): string | null {
  if (!isValidContractId(contractId)) return null;
  return `${STELLAR_EXPERT_BASE}/${network}/contract/${contractId}`;
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
