/**
 * Stellar network configuration (#555).
 *
 * Horizon URLs and network passphrases for Stellar Mainnet and Testnet.
 */

export interface StellarNetwork {
  /** Human-readable network name. */
  name: string;
  /** Horizon server URL for account and transaction queries. */
  horizonUrl: string;
  /** Network passphrase used for transaction signing. */
  passphrase: string;
  /** True for test networks; used to show Friendbot link on unfunded accounts. */
  testnet: boolean;
  /** Friendbot URL for funding testnet accounts (testnet only). */
  friendbotUrl?: string;
}

export const STELLAR_NETWORKS = {
  MAINNET: {
    name: 'Stellar Mainnet',
    horizonUrl: 'https://horizon.stellar.org',
    passphrase: 'Public Global Stellar Network ; September 2015',
    testnet: false,
  },
  TESTNET: {
    name: 'Stellar Testnet',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    passphrase: 'Test SDF Network ; September 2015',
    testnet: true,
    friendbotUrl: 'https://friendbot.stellar.org',
  },
} as const satisfies Record<string, StellarNetwork>;

/**
 * Active Stellar network for the application.
 * In production, this would be determined by an environment variable.
 */
export const ACTIVE_STELLAR_NETWORK: StellarNetwork =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'mainnet'
    ? STELLAR_NETWORKS.MAINNET
    : STELLAR_NETWORKS.TESTNET;

/**
 * Minimum account reserve: base reserve (2 XLM) + one entry per subentry (0.5 XLM each).
 * The actual reserve is computed per-account from its subentry count.
 */
export const STELLAR_BASE_RESERVE = 0.5; // XLM
export const STELLAR_ACCOUNT_BASE_RESERVE = 2 * STELLAR_BASE_RESERVE; // 1 XLM for the account itself
