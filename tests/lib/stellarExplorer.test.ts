import { afterEach, describe, expect, it } from 'vitest';
import {
  getIpfsUrl,
  getStellarAccountUrl,
  getStellarContractUrl,
  getStellarTxUrl,
  isValidContractId,
  shortenId,
} from '@/lib/stellarExplorer';

// 56-character StrKey contract ID: 'C' followed by 55 base32 characters.
const CONTRACT_ID = 'C' + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.repeat(2).slice(0, 55);
const CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';

describe('getStellarTxUrl / getStellarAccountUrl', () => {
  const originalEnv = process.env.NEXT_PUBLIC_STELLAR_NETWORK;

  afterEach(() => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = originalEnv;
  });

  it('defaults to testnet when NEXT_PUBLIC_STELLAR_NETWORK is unset', () => {
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK;
    expect(getStellarTxUrl('abc123')).toBe('https://stellar.expert/explorer/testnet/tx/abc123');
    expect(getStellarAccountUrl('GABC')).toBe(
      'https://stellar.expert/explorer/testnet/account/GABC'
    );
  });

  it('uses the public network when NEXT_PUBLIC_STELLAR_NETWORK is "mainnet"', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet';
    expect(getStellarTxUrl('abc123')).toBe('https://stellar.expert/explorer/public/tx/abc123');
    expect(getStellarAccountUrl('GABC')).toBe(
      'https://stellar.expert/explorer/public/account/GABC'
    );
  });

  it('lets an explicit network override the environment default', () => {
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'mainnet';
    expect(getStellarTxUrl('abc123', 'testnet')).toBe(
      'https://stellar.expert/explorer/testnet/tx/abc123'
    );
  });
});

describe('isValidContractId', () => {
  it('accepts a 56-character C-prefixed StrKey', () => {
    expect(CONTRACT_ID).toHaveLength(56);
    expect(isValidContractId(CONTRACT_ID)).toBe(true);
  });

  it('rejects G-prefixed account addresses and malformed values', () => {
    expect(isValidContractId('G' + CONTRACT_ID.slice(1))).toBe(false);
    expect(isValidContractId(CONTRACT_ID.slice(0, 40))).toBe(false);
    expect(isValidContractId(`${CONTRACT_ID}/../evil`)).toBe(false);
  });
});

describe('getStellarContractUrl', () => {
  it('builds a Stellar Expert contract URL for the testnet by default', () => {
    expect(getStellarContractUrl(CONTRACT_ID)).toBe(
      `https://stellar.expert/explorer/testnet/contract/${CONTRACT_ID}`
    );
  });

  it('uses the public network when requested', () => {
    expect(getStellarContractUrl(CONTRACT_ID, 'public')).toBe(
      `https://stellar.expert/explorer/public/contract/${CONTRACT_ID}`
    );
  });

  it('returns null for a malformed contract ID instead of building a URL', () => {
    expect(getStellarContractUrl('not-a-contract')).toBeNull();
  });
});

describe('getIpfsUrl', () => {
  it('builds a gateway URL for a valid CID', () => {
    expect(getIpfsUrl(CID)).toBe(`https://ipfs.io/ipfs/${CID}`);
  });

  it('returns null for a CID containing path or host characters', () => {
    expect(getIpfsUrl('abc/def')).toBeNull();
    expect(getIpfsUrl('short')).toBeNull();
  });
});

describe('shortenId', () => {
  it('keeps the head and tail of a long identifier', () => {
    expect(shortenId(CONTRACT_ID)).toBe(`${CONTRACT_ID.slice(0, 6)}…${CONTRACT_ID.slice(-4)}`);
  });

  it('returns short identifiers unchanged', () => {
    expect(shortenId('12345')).toBe('12345');
  });
});
