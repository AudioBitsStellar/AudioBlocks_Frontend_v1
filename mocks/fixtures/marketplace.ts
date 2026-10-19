/**
 * Soroban relay payloads (AudioBlock_Backend `MarketplaceService`): `prepare-*`
 * returns an unsigned transaction for the wallet to sign, `submit-*` returns
 * the hash of the submitted transaction.
 */
export interface MockPreparedTransaction {
  xdr: string;
  networkPassphrase: string;
}

export const mockPreparedTransactionFixture: MockPreparedTransaction = {
  // Placeholder base64 envelope — wallets in mock mode never submit it on-chain.
  xdr: 'AAAAAgAAAABtb2NrLXVuc2lnbmVkLXRyYW5zYWN0aW9uLWZvci1tc3c=',
  // Stellar testnet passphrase.
  networkPassphrase: 'Test SDF Network ; September 2015',
};

export const mockSubmittedTransactionFixture = {
  txHash: 'b9d0b2292c4e09e8eb22d036171491e87b8d2086bf8b265874c8d182cb9c9020',
};
