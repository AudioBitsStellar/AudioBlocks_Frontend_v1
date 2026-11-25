import { describe, expect, it } from 'vitest';
const { detectBlockedPayload } = require('../../scripts/block-payload.cjs');

describe('blocked payload detection (#783)', () => {
  it('detects the PolinRider signature even after long whitespace padding', () => {
    const fixture = `export default {};\n${' '.repeat(4096)}global['!'] = () => import('./api.js');`;
    expect(detectBlockedPayload(fixture)).toMatch(/PolinRider/);
  });
  it('does not flag ordinary config source', () => {
    expect(detectBlockedPayload("export default { plugins: {} };")).toBeNull();
  });
});
