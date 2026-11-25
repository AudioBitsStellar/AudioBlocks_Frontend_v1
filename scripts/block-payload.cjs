const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const CANDIDATES = [
  'postcss.config.mjs',
  'next.config.ts',
  'eslint.config.mjs',
  'middleware.ts',
  'vite.playback.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'playwright.playback.config.ts',
];
const POLINRIDER = /global\s*\[\s*['"]!['"]\s*\]/;
const LEGACY_MARKERS = /node\s+api\.js|rmcej%otb%|Cot%3t=shtP|_\$_1e42/;

function detectBlockedPayload(source) {
  if (POLINRIDER.test(source)) return "PolinRider global['!'] signature";
  if (LEGACY_MARKERS.test(source)) return 'known payload marker';
  return null;
}

function scan(root = ROOT) {
  const findings = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === '.next') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'api.js') findings.push({ file: path.relative(root, full), reason: 'api.js is blocked' });
    }
  };
  walk(root);
  for (const rel of CANDIDATES) {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) continue;
    const reason = detectBlockedPayload(fs.readFileSync(file, 'utf8'));
    if (reason) findings.push({ file: rel, reason });
  }
  return findings;
}

function selfTest() {
  const padded = `export default {};\n${' '.repeat(4096)}global['!'] = () => import('./api.js');`;
  if (!detectBlockedPayload(padded)?.includes('PolinRider')) {
    throw new Error('PolinRider padded fixture was not detected');
  }
  if (detectBlockedPayload('export default { plugins: {} };') !== null) {
    throw new Error('clean config produced a false positive');
  }
}

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else {
    const findings = scan();
    if (findings.length) {
      for (const finding of findings) console.error(`${finding.file}: ${finding.reason}`);
      process.exit(1);
    }
  }
}
module.exports = { detectBlockedPayload, scan, selfTest };
