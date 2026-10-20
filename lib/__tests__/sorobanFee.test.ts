/**
 * Unit tests for Soroban fee utilities
 * Issue #548
 */

import { describe, it, expect } from 'vitest';
import { stroopsToXLM, xlmToStroops, extractFeeFromPrepareResponse } from '../sorobanFee';

describe('sorobanFee', () => {
  describe('stroopsToXLM', () => {
    it('should convert stroops to XLM correctly', () => {
      expect(stroopsToXLM(10_000_000)).toBe('1');
      expect(stroopsToXLM(1_000_000)).toBe('0.1');
      expect(stroopsToXLM(100_000)).toBe('0.01');
      expect(stroopsToXLM(10_000)).toBe('0.001');
      expect(stroopsToXLM(1_000)).toBe('0.0001');
      expect(stroopsToXLM(100)).toBe('0.00001');
    });

    it('should remove trailing zeros', () => {
      expect(stroopsToXLM(5_000_000)).toBe('0.5');
      expect(stroopsToXLM(2_500_000)).toBe('0.25');
      expect(stroopsToXLM(1_234_567)).toBe('0.1234567');
    });

    it('should handle zero', () => {
      expect(stroopsToXLM(0)).toBe('0');
    });

    it('should handle large amounts', () => {
      expect(stroopsToXLM(100_000_000_000)).toBe('10000');
      expect(stroopsToXLM(123_456_789_012)).toBe('12345.6789012');
    });
  });

  describe('xlmToStroops', () => {
    it('should convert XLM to stroops correctly', () => {
      expect(xlmToStroops(1)).toBe(10_000_000);
      expect(xlmToStroops(0.1)).toBe(1_000_000);
      expect(xlmToStroops(0.01)).toBe(100_000);
      expect(xlmToStroops(0.001)).toBe(10_000);
    });

    it('should round to nearest stroop', () => {
      expect(xlmToStroops(0.00000015)).toBe(2);
      expect(xlmToStroops(0.00000014)).toBe(1);
    });

    it('should handle zero', () => {
      expect(xlmToStroops(0)).toBe(0);
    });
  });

  describe('extractFeeFromPrepareResponse', () => {
    it('should extract fee from explicit fee field (number)', () => {
      const response = {
        xdr: 'mock-xdr',
        networkPassphrase: 'Test SDF Network ; September 2015',
        fee: 100_000,
      };

      const result = extractFeeFromPrepareResponse(response);
      expect(result.stroops).toBe(100_000);
      expect(result.xlm).toBe('0.01');
    });

    it('should extract fee from explicit fee field (string)', () => {
      const response = {
        xdr: 'mock-xdr',
        networkPassphrase: 'Test SDF Network ; September 2015',
        fee: '250000',
      };

      const result = extractFeeFromPrepareResponse(response);
      expect(result.stroops).toBe(250_000);
      expect(result.xlm).toBe('0.025');
    });

    it('should throw error for invalid fee', () => {
      const response = {
        xdr: 'mock-xdr',
        networkPassphrase: 'Test SDF Network ; September 2015',
        fee: 'invalid',
      };

      expect(() => extractFeeFromPrepareResponse(response)).toThrow('Invalid fee value');
    });

    it('should throw error when fee is missing and XDR parsing is not implemented', () => {
      const response = {
        xdr: 'mock-xdr',
        networkPassphrase: 'Test SDF Network ; September 2015',
      };

      expect(() => extractFeeFromPrepareResponse(response)).toThrow(
        'XDR parsing not yet implemented'
      );
    });

    it('should handle zero fee', () => {
      const response = {
        xdr: 'mock-xdr',
        networkPassphrase: 'Test SDF Network ; September 2015',
        fee: 0,
      };

      const result = extractFeeFromPrepareResponse(response);
      expect(result.stroops).toBe(0);
      expect(result.xlm).toBe('0');
    });
  });
});
