/**
 * Stellar explorer and IPFS link helpers.
 *
 * Issue #547 — point explorer links to stellar.expert instead of Etherscan.
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

/** Network used when a helper below isn't given one explicitly. */
function defaultNetwork(): StellarNetwork {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet' ? 'public' : 'testnet';
}

/** Explorer URL for a transaction hash. */
export function getStellarTxUrl(hash: string, network: StellarNetwork = defaultNetwork()): string {
  return `${STELLAR_EXPERT_BASE}/${network}/tx/${hash}`;
}

/** Explorer URL for a Stellar account (G... address). */
export function getStellarAccountUrl(
  accountId: string,
  network: StellarNetwork = defaultNetwork()
): string {
  return `${STELLAR_EXPERT_BASE}/${network}/account/${accountId}`;
}

export function isValidContractId(value: string): boolean {
  return CONTRACT_ID_PATTERN.test(value);
}

/** Explorer URL for a Soroban contract, or `null` if the ID is malformed. */
export function getStellarContractUrl(
  contractId: string,
  network: StellarNetwork = defaultNetwork()
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
