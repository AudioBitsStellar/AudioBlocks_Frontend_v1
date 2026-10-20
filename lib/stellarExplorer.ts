/**
 * Stellar block explorer URL builders for stellar.expert
 * Issue #547: Point explorer links to stellar.expert instead of Etherscan
 */

interface StellarNetworkConfig {
  isTestnet: boolean;
}

// Get Stellar network configuration from environment
function getStellarNetwork(): StellarNetworkConfig {
  const network = process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
  return {
    isTestnet: network === 'testnet',
  };
}

/**
 * Get base URL for stellar.expert based on network configuration
 * @returns Base URL for stellar.expert
 */
function getStellarExplorerBase(): string {
  const config = getStellarNetwork();
  return config.isTestnet
    ? 'https://stellar.expert/explorer/testnet'
    : 'https://stellar.expert/explorer/public';
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

/**
 * Build stellar.expert URL for a Soroban contract (C... address)
 * @param contractId - Soroban contract ID (C...)
 * @returns Full URL to stellar.expert contract page
 */
export function getStellarContractUrl(contractId: string): string {
  const baseUrl = getStellarExplorerBase();
  return `${baseUrl}/contract/${contractId}`;
}
