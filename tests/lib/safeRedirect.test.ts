import { describe, it, expect } from 'vitest';
import { safeReturnTo } from '@/lib/safeRedirect';

describe('safeReturnTo', () => {
  describe('allowed paths', () => {
    it('allows valid relative paths', () => {
      expect(safeReturnTo('/dashboard')).toBe('/dashboard');
      expect(safeReturnTo('/profile')).toBe('/profile');
      expect(safeReturnTo('/dashboard/playlist/123')).toBe('/dashboard/playlist/123');
      expect(safeReturnTo('/api/path?query=value')).toBe('/api/path?query=value');
    });

    it('uses fallback for null or empty', () => {
      expect(safeReturnTo(null)).toBe('/dashboard');
      expect(safeReturnTo('')).toBe('/dashboard');
      expect(safeReturnTo('   ')).toBe('/dashboard');
    });

    it('uses custom fallback', () => {
      expect(safeReturnTo(null, '/home')).toBe('/home');
      expect(safeReturnTo('invalid', '/home')).toBe('/home');
    });
  });

  describe('blocked paths', () => {
    it('rejects protocol-relative URLs', () => {
      expect(safeReturnTo('//evil.com')).toBe('/dashboard');
      expect(safeReturnTo('//evil.com/path')).toBe('/dashboard');
    });

    it('rejects backslash paths', () => {
      expect(safeReturnTo('/\\evil.com')).toBe('/dashboard');
      expect(safeReturnTo('/\\something')).toBe('/dashboard');
    });

    it('rejects URLs with schemes', () => {
      expect(safeReturnTo('http://evil.com')).toBe('/dashboard');
      expect(safeReturnTo('https://evil.com')).toBe('/dashboard');
      expect(safeReturnTo('javascript:alert(1)')).toBe('/dashboard');
      expect(safeReturnTo('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
      expect(safeReturnTo('ftp://evil.com')).toBe('/dashboard');
    });

    it('rejects encoded variants', () => {
      expect(safeReturnTo('%2F%2Fevil.com')).toBe('/dashboard');
      expect(safeReturnTo('%68%74%74%70%3A%2F%2Fevil.com')).toBe('/dashboard');
    });

    it('rejects paths without leading slash', () => {
      expect(safeReturnTo('evil.com')).toBe('/dashboard');
      expect(safeReturnTo('dashboard')).toBe('/dashboard');
      expect(safeReturnTo('//dashboard')).toBe('/dashboard');
    });
  });
});
