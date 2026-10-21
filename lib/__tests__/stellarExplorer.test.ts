/**
 * Unit tests for Stellar explorer URL builders
 * Issue #547
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getStellarTxUrl, getStellarAccountUrl, getStellarContractUrl } from '../stellarExplorer';

describe('stellarExplorer', () => {
  const originalEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK;

  afterEach(() => {
    // Restore original environment
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalEnv;
  });

  describe('testnet configuration', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'testnet';
    });

    it('should generate testnet transaction URL', () => {
      const hash = 'abc123def456';
      const url = getStellarTxUrl(hash);
      expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${hash}`);
    });

    it('should generate testnet account URL', () => {
      const account = 'GABC123DEF456GABC123DEF456GABC123DEF456GABC123DEF456GA';
      const url = getStellarAccountUrl(account);
      expect(url).toBe(`https://stellar.expert/explorer/testnet/account/${account}`);
    });

    it('should generate testnet contract URL', () => {
      const contract = 'CABC123DEF456CABC123DEF456CABC123DEF456CABC123DEF456CA';
      const url = getStellarContractUrl(contract);
      expect(url).toBe(`https://stellar.expert/explorer/testnet/contract/${contract}`);
    });
  });

  describe('mainnet configuration', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet';
    });

    it('should generate mainnet transaction URL', () => {
      const hash = 'xyz789uvw012';
      const url = getStellarTxUrl(hash);
      expect(url).toBe(`https://stellar.expert/explorer/public/tx/${hash}`);
    });

    it('should generate mainnet account URL', () => {
      const account = 'GXYZ789UVW012GXYZ789UVW012GXYZ789UVW012GXYZ789UVW012GX';
      const url = getStellarAccountUrl(account);
      expect(url).toBe(`https://stellar.expert/explorer/public/account/${account}`);
    });

    it('should generate mainnet contract URL', () => {
      const contract = 'CXYZ789UVW012CXYZ789UVW012CXYZ789UVW012CXYZ789UVW012CX';
      const url = getStellarContractUrl(contract);
      expect(url).toBe(`https://stellar.expert/explorer/public/contract/${contract}`);
    });
  });

  describe('default configuration', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    });

    it('should default to testnet when no network is specified', () => {
      const hash = 'default123';
      const url = getStellarTxUrl(hash);
      expect(url).toBe(`https://stellar.expert/explorer/testnet/tx/${hash}`);
    });
  });
});
