import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const { scanText, scanTree } = require('../../scripts/scan-client-secrets.cjs');

const dirs: string[] = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe('client secret bundle scan (#790)', () => {
  it('detects forbidden server-secret identifiers', () => {
    expect(scanText('const x = "SENTRY_AUTH_TOKEN"', 'bundle.js')).toEqual([
      'bundle.js: contains SENTRY_AUTH_TOKEN',
    ]);
  });

  it('detects secret-shaped NVIDIA tokens in built assets', () => {
    expect(scanText('nvapi-abcdefghijklmnopqrstuv', 'chunk.js')).toHaveLength(1);
  });

  it('walks nested static chunks and passes clean bundles', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audioblocks-secret-scan-'));
    dirs.push(dir);
    fs.mkdirSync(path.join(dir, 'chunks'));
    fs.writeFileSync(path.join(dir, 'chunks', 'clean.js'), 'console.log("public config")');
    expect(scanTree(dir)).toEqual([]);
  });
});
