import { Networks } from '@stellar/stellar-sdk';

export type StellarNetworkType = 'testnet' | 'public';

export interface StellarNetworkConfig {
  networkPassphrase: string;
  horizonUrl: string;
  sorobanRpcUrl: string;
  explorerBaseUrl: string;
  isTestnet: boolean;
}

const DEFAULT_HORIZON_URLS = {
  testnet: 'https://horizon-testnet.stellar.org',
  public: 'https://horizon.stellar.org',
};

const DEFAULT_SOROBAN_RPC_URLS = {
  testnet: 'https://soroban-testnet.stellar.org',
  public: 'https://soroban-rpc.stellar.org',
};

const EXPLORER_BASE_URLS = {
  testnet: 'https://stellar.expert/explorer/testnet',
  public: 'https://stellar.expert/explorer/public',
};

/**
 * Get the active Stellar network configuration from environment variables
 */
export function getStellarNetworkConfig(): StellarNetworkConfig {
  const networkType = (process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet') as StellarNetworkType;
  
  if (networkType !== 'testnet' && networkType !== 'public') {
    throw new Error(
      `Invalid NEXT_PUBLIC_STELLAR_NETWORK: "${networkType}". Must be "testnet" or "public".`
    );
  }

  const isTestnet = networkType === 'testnet';
  const networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;
  
  const horizonUrl = process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL || DEFAULT_HORIZON_URLS[networkType];
  const sorobanRpcUrl = process.env.NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL || DEFAULT_SOROBAN_RPC_URLS[networkType];
  const explorerBaseUrl = EXPLORER_BASE_URLS[networkType];

  return {
    networkPassphrase,
    horizonUrl,
    sorobanRpcUrl,
    explorerBaseUrl,
    isTestnet,
  };
}

/**
 * Get explorer URL for a specific account address
 */
export function getAccountExplorerUrl(address: string): string {
  const config = getStellarNetworkConfig();
  return `${config.explorerBaseUrl}/account/${address}`;
}

/**
 * Get explorer URL for a specific transaction
 */
export function getTransactionExplorerUrl(txHash: string): string {
  const config = getStellarNetworkConfig();
  return `${config.explorerBaseUrl}/tx/${txHash}`;
}

/**
 * Get explorer URL for a specific contract
 */
export function getContractExplorerUrl(contractId: string): string {
  const config = getStellarNetworkConfig();
  return `${config.explorerBaseUrl}/contract/${contractId}`;
}
