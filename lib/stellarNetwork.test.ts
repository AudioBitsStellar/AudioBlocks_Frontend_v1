import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Networks } from '@stellar/stellar-sdk';
import { getStellarNetworkConfig, getAccountExplorerUrl, getTransactionExplorerUrl, getContractExplorerUrl } from './stellarNetwork';

describe('stellarNetwork', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getStellarNetworkConfig', () => {
    it('should return testnet config when NEXT_PUBLIC_STELLAR_NETWORK is testnet', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
      const config = getStellarNetworkConfig();

      expect(config.isTestnet).toBe(true);
      expect(config.networkPassphrase).toBe(Networks.TESTNET);
      expect(config.horizonUrl).toBe('https://horizon-testnet.stellar.org');
      expect(config.sorobanRpcUrl).toBe('https://soroban-testnet.stellar.org');
      expect(config.explorerBaseUrl).toBe('https://stellar.expert/explorer/testnet');
    });

    it('should return public config when NEXT_PUBLIC_STELLAR_NETWORK is public', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public';
      const config = getStellarNetworkConfig();

      expect(config.isTestnet).toBe(false);
      expect(config.networkPassphrase).toBe(Networks.PUBLIC);
      expect(config.horizonUrl).toBe('https://horizon.stellar.org');
      expect(config.sorobanRpcUrl).toBe('https://soroban-rpc.stellar.org');
      expect(config.explorerBaseUrl).toBe('https://stellar.expert/explorer/public');
    });

    it('should default to testnet when NEXT_PUBLIC_STELLAR_NETWORK is not set', () => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
      const config = getStellarNetworkConfig();

      expect(config.isTestnet).toBe(true);
      expect(config.networkPassphrase).toBe(Networks.TESTNET);
    });

    it('should use custom URLs when provided', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
      process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL = 'https://custom-horizon.example.com';
      process.env.NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL = 'https://custom-rpc.example.com';

      const config = getStellarNetworkConfig();

      expect(config.horizonUrl).toBe('https://custom-horizon.example.com');
      expect(config.sorobanRpcUrl).toBe('https://custom-rpc.example.com');
    });

    it('should throw error for invalid network value', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'invalid';
      expect(() => getStellarNetworkConfig()).toThrow('Invalid NEXT_PUBLIC_STELLAR_NETWORK');
    });
  });

  describe('getAccountExplorerUrl', () => {
    it('should return correct testnet explorer URL for account', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
      const address = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const url = getAccountExplorerUrl(address);

      expect(url).toBe(`https://stellar.expert/explorer/testnet/account/${address}`);
    });

    it('should return correct public explorer URL for account', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'public';
      const address = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      const url = getAccountExplorerUrl(address);

      expect(url).toBe(`https://stellar.expert/explorer/public/account/${address}`);
    });
  });

  describe('getTransactionExplorerUrl', () => {
    it('should return correct testnet explorer URL for transaction', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
      const txHash = 'abc123';
      const url = getTransactionExplorerUrl(txHash);

      expect(url).toBe('https://stellar.expert/explorer/testnet/tx/abc123');
    });
  });

  describe('getContractExplorerUrl', () => {
    it('should return correct testnet explorer URL for contract', () => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
      const contractId = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
      const url = getContractExplorerUrl(contractId);

      expect(url).toBe(`https://stellar.expert/explorer/testnet/contract/${contractId}`);
    });
  });
});
