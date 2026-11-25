import { describe, expect, it } from 'vitest';
import { ipfsUrl } from '../ipfs';

describe('ipfsUrl', () => {
  it('handles raw CIDs correctly', () => {
    expect(ipfsUrl('QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng')).toBe(
      'https://ipfs.io/ipfs/QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng'
    );
  });

  it('handles ipfs:// URIs correctly', () => {
    expect(ipfsUrl('ipfs://QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng')).toBe(
      'https://ipfs.io/ipfs/QmVLwvmGehsrNEvhcCnnsw5RQNseohgEkFNN1848zNzdng'
    );
  });

  it('passes through http(s) URLs', () => {
    expect(ipfsUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(ipfsUrl('http://example.com/image.jpg')).toBe('http://example.com/image.jpg');
  });

  it('handles empty or invalid inputs gracefully', () => {
    expect(ipfsUrl('')).toBe('');
    expect(ipfsUrl(null)).toBe('');
    expect(ipfsUrl(undefined)).toBe('');
  });
});
