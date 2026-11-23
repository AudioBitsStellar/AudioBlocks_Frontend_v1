import { afterEach, describe, expect, it, vi } from 'vitest';
import { Networks, StrKey } from '@stellar/stellar-sdk';
import { validateChainPolicy, validateSummary, validateTransaction } from './chainSafety';

const contract = StrKey.encodeContract(new Uint8Array(32).fill(1));
const asset = StrKey.encodeContract(new Uint8Array(32).fill(2));
const hostile = StrKey.encodeContract(new Uint8Array(32).fill(3));
const recipient = StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(4));
const policy = {
  networkPassphrase: Networks.TESTNET, chainId: 'configured-chain',
  rpcUrl: 'https://soroban-testnet.stellar.org', contracts: [contract], assets: [asset],
};

afterEach(() => vi.unstubAllEnvs());

function configure() {
  vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'testnet');
  vi.stubEnv('NEXT_PUBLIC_STELLAR_CHAIN_ID', policy.chainId);
  vi.stubEnv('NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL', policy.rpcUrl);
  vi.stubEnv('NEXT_PUBLIC_STELLAR_CONTRACTS', contract);
  vi.stubEnv('NEXT_PUBLIC_STELLAR_ASSETS', asset);
}

describe('chain policy gates', () => {
  it('accepts matching deployment and backend policy', () => {
    configure();
    expect(validateChainPolicy(policy)).toEqual(policy);
  });
  it.each([
    { networkPassphrase: Networks.PUBLIC }, { chainId: 'wrong' },
    { rpcUrl: 'https://hostile.invalid' }, { contracts: [hostile] },
    { assets: [hostile] }, { contracts: [] }, { assets: ['C-invalid'] },
  ])('blocks mismatched or hostile backend config: %j', override => {
    configure();
    expect(() => validateChainPolicy({ ...policy, ...override })).toThrow(/blocked/);
  });
  it('blocks missing deployment allowlists', () => {
    configure();
    vi.stubEnv('NEXT_PUBLIC_STELLAR_CONTRACTS', '');
    expect(() => validateChainPolicy(policy)).toThrow(/blocked/);
  });
  it('rejects malformed XDR before wallet access', () => {
    expect(() => validateTransaction('hostile input', policy, recipient)).toThrow();
  });
});

describe('transaction summary gate', () => {
  const summary = { item: 'Song #1', price: '2 XLM', royalties: '0 XLM', fees: '0.01 XLM', recipient };
  it('requires all five readable fields', () => {
    expect(validateSummary(summary)).toEqual(summary);
    for (const field of Object.keys(summary)) {
      expect(() => validateSummary({ ...summary, [field]: '' })).toThrow(/required/);
    }
  });
  it('rejects invalid recipients and absent details', () => {
    expect(() => validateSummary({ ...summary, recipient: 'G-invalid' })).toThrow();
    expect(() => validateSummary(undefined)).toThrow();
  });
});
