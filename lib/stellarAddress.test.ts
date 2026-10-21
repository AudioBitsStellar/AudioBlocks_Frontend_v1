import { describe, it, expect } from 'vitest';
import { isValidStellarAddress, shortenAddress, getStellarAddressType } from './stellarAddress';

describe('stellarAddress', () => {
  describe('isValidStellarAddress', () => {
    it('should validate valid G account addresses', () => {
      const validAccount = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(isValidStellarAddress(validAccount)).toBe(true);
    });

    it('should validate valid C contract addresses', () => {
      const validContract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
      expect(isValidStellarAddress(validContract)).toBe(true);
    });

    it('should reject addresses with invalid checksums', () => {
      const invalidChecksum = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2X';
      expect(isValidStellarAddress(invalidChecksum)).toBe(false);
    });

    it('should reject addresses with wrong length', () => {
      const tooShort = 'GBRPYHIL2CI3FNQ4BXLFMNDL';
      const tooLong = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2HEXTRASTUFF';
      expect(isValidStellarAddress(tooShort)).toBe(false);
      expect(isValidStellarAddress(tooLong)).toBe(false);
    });

    it('should reject invalid input types', () => {
      expect(isValidStellarAddress('')).toBe(false);
      expect(isValidStellarAddress(null as any)).toBe(false);
      expect(isValidStellarAddress(undefined as any)).toBe(false);
      expect(isValidStellarAddress(123 as any)).toBe(false);
    });

    it('should reject addresses with wrong prefix', () => {
      const wrongPrefix = 'XBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(isValidStellarAddress(wrongPrefix)).toBe(false);
    });
  });

  describe('shortenAddress', () => {
    it('should shorten address with default lengths', () => {
      const address = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(shortenAddress(address)).toBe('GBRP...OX2H');
    });

    it('should shorten address with custom lengths', () => {
      const address = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(shortenAddress(address, 6, 6)).toBe('GBRPYH...C7OX2H');
    });

    it('should return full address if too short', () => {
      const shortAddress = 'GBRPYX';
      expect(shortenAddress(shortAddress)).toBe('GBRPYX');
    });

    it('should handle empty or invalid input', () => {
      expect(shortenAddress('')).toBe('');
      expect(shortenAddress(null as any)).toBe(null);
    });
  });

  describe('getStellarAddressType', () => {
    it('should identify account addresses', () => {
      const account = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';
      expect(getStellarAddressType(account)).toBe('account');
    });

    it('should identify contract addresses', () => {
      const contract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM';
      expect(getStellarAddressType(contract)).toBe('contract');
    });

    it('should return invalid for malformed addresses', () => {
      expect(getStellarAddressType('invalid')).toBe('invalid');
      expect(getStellarAddressType('')).toBe('invalid');
      expect(getStellarAddressType(null as any)).toBe('invalid');
    });
  });
});
