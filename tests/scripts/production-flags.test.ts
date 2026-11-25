import { describe, expect, it } from 'vitest';
const { assertSafeProductionFlags } = require('../../scripts/check-production-flags.cjs');

describe('production flag guard (#787)', () => {
  it.each([
    ['NEXT_PUBLIC_API_MOCKING', 'enabled'],
    ['NEXT_PUBLIC_API_MOCKING', 'true'],
    ['NEXT_PUBLIC_ENABLE_DEVTOOLS', 'true'],
    ['NEXT_PUBLIC_ENABLE_DEVTOOLS', '1'],
  ])('rejects %s=%s', (name, value) => {
    expect(() => assertSafeProductionFlags({ [name]: value })).toThrow(/Production build blocked/);
  });

  it('allows explicitly disabled production flags', () => {
    expect(() => assertSafeProductionFlags({
      NEXT_PUBLIC_API_MOCKING: 'disabled',
      NEXT_PUBLIC_ENABLE_DEVTOOLS: 'false',
    })).not.toThrow();
  });
});
