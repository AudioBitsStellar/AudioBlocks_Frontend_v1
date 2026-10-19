import { describe, expect, it } from 'vitest';
import {
  IPFS_GATEWAY,
  PUBLIC_IPFS_GATEWAY,
  ipfsGatewayUrls,
  ipfsToHttp,
  toGatewayOrigin,
} from '@/lib/ipfs';

const CID_V0 = 'QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng';
const CID_V1 = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi';
const PINATA = 'https://example.mypinata.cloud';

describe('ipfsToHttp', () => {
  it('converts ipfs:// URIs, including a sub-path', () => {
    expect(ipfsToHttp(`ipfs://${CID_V0}`, PINATA)).toBe(`${PINATA}/ipfs/${CID_V0}`);
    expect(ipfsToHttp(`ipfs://${CID_V1}/cover.png`, PINATA)).toBe(
      `${PINATA}/ipfs/${CID_V1}/cover.png`
    );
  });

  it('accepts the legacy ipfs://ipfs/<cid> form', () => {
    expect(ipfsToHttp(`ipfs://ipfs/${CID_V0}`, PINATA)).toBe(`${PINATA}/ipfs/${CID_V0}`);
  });

  it('accepts CIDv1 in the base58btc (z) and base16 (f) multibases', () => {
    const base58 = 'zb2rhe5P4gXftAwvA4eXQ5HJwsER2owDyS9sKaQRRVQPn93bA';
    const base16 = 'f01701220c3c4733ec8affd06cf9e9ff50ffc6bcd2ec85a6170004bb709669c31de94391a';
    expect(ipfsToHttp(base58, PINATA)).toBe(`${PINATA}/ipfs/${base58}`);
    expect(ipfsToHttp(base16, PINATA)).toBe(`${PINATA}/ipfs/${base16}`);
  });

  it('converts bare CIDv0 and CIDv1 values', () => {
    expect(ipfsToHttp(CID_V0, PINATA)).toBe(`${PINATA}/ipfs/${CID_V0}`);
    expect(ipfsToHttp(`  ${CID_V1}  `, PINATA)).toBe(`${PINATA}/ipfs/${CID_V1}`);
  });

  it('rewrites path-style and subdomain gateway URLs onto the given gateway', () => {
    expect(ipfsToHttp(`https://gateway.pinata.cloud/ipfs/${CID_V0}/art.jpg`, PINATA)).toBe(
      `${PINATA}/ipfs/${CID_V0}/art.jpg`
    );
    expect(ipfsToHttp(`https://${CID_V1}.ipfs.dweb.link/art.jpg`, PINATA)).toBe(
      `${PINATA}/ipfs/${CID_V1}/art.jpg`
    );
  });

  it('defaults to the configured primary gateway', () => {
    expect(ipfsToHttp(CID_V0)).toBe(`${IPFS_GATEWAY}/ipfs/${CID_V0}`);
  });

  it('returns null for non-IPFS values and malformed CIDs', () => {
    expect(ipfsToHttp('https://bucket.s3.amazonaws.com/covers/a.jpg', PINATA)).toBeNull();
    expect(ipfsToHttp('/placeholder-cover.svg', PINATA)).toBeNull();
    expect(ipfsToHttp('ipfs://not-a-cid', PINATA)).toBeNull();
    expect(ipfsToHttp('', PINATA)).toBeNull();
  });

  it('rejects paths that escape the CID root', () => {
    expect(ipfsToHttp(`ipfs://${CID_V0}/../../admin`, PINATA)).toBeNull();
  });
});

describe('toGatewayOrigin', () => {
  it('reduces a gateway URL or bare host to its origin', () => {
    expect(toGatewayOrigin(`${PINATA}/ipfs/`)).toBe(PINATA);
    expect(toGatewayOrigin('example.mypinata.cloud')).toBe(PINATA);
  });

  it('returns null for empty or non-HTTP values', () => {
    expect(toGatewayOrigin(undefined)).toBeNull();
    expect(toGatewayOrigin('  ')).toBeNull();
    expect(toGatewayOrigin('ftp://example.com')).toBeNull();
  });
});

describe('ipfsGatewayUrls', () => {
  it('returns the primary gateway URL first and never duplicates the public one', () => {
    const urls = ipfsGatewayUrls(CID_V0);
    expect(urls[0]).toBe(`${IPFS_GATEWAY}/ipfs/${CID_V0}`);
    expect(urls[urls.length - 1]).toBe(`${PUBLIC_IPFS_GATEWAY}/ipfs/${CID_V0}`);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('returns an empty list for non-IPFS values', () => {
    expect(ipfsGatewayUrls('https://cdn.example.com/a.jpg')).toEqual([]);
  });
});
