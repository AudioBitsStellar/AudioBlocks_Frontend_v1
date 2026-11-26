#!/usr/bin/env node
// Container entrypoint: substitutes runtime values for the placeholder
// tokens baked into the build at image-build time, then starts the server.
// See docs/RUNTIME_CONFIG.md for the full explanation.
//
// RUNTIME_ENV_VARS must stay in sync with the ENV block in Dockerfile's
// `builder` stage (checked by scripts/docker-entrypoint.test.ts).
const fs = require('node:fs');
const path = require('node:path');

const RUNTIME_ENV_VARS = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_MEDIA_HOST',
  'NEXT_PUBLIC_IPFS_GATEWAY',
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_RPC_URL',
  'NEXT_PUBLIC_CONTRACT_ADDRESS',
  'NEXT_PUBLIC_USDC_ADDRESS',
  'NEXT_PUBLIC_PRIVY_APP_ID',
  'NEXT_PUBLIC_ANALYTICS_ENABLED',
  'NEXT_PUBLIC_API_MOCKING',
  'NEXT_PUBLIC_API_TIMEOUT',
  'NEXT_PUBLIC_ARTIST_DASHBOARD_URL',
  'NEXT_PUBLIC_CACHE_TTL',
  'NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID',
  'NEXT_PUBLIC_ENABLE_DEVTOOLS',
  'NEXT_PUBLIC_FEATURE_COMMUNITY_VOTING',
  'NEXT_PUBLIC_FEATURE_EVENTS',
  'NEXT_PUBLIC_FEATURE_MERCH',
  'NEXT_PUBLIC_FEATURE_ARTIST_PERKS',
  'NEXT_PUBLIC_LOG_LEVEL',
  'NEXT_PUBLIC_PLAYBACK_EVENT_URL',
  'NEXT_PUBLIC_SEGMENT_WRITE_KEY',
  'NEXT_PUBLIC_SENTRY_DSN',
  'NEXT_PUBLIC_SENTRY_TRACE_SAMPLE_RATE',
  'NEXT_PUBLIC_STELLAR_NETWORK',
  'NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE',
  'NEXT_PUBLIC_STELLAR_HORIZON_URL',
  'NEXT_PUBLIC_STELLAR_RPC_URL',
  'NEXT_PUBLIC_STELLAR_SOROBAN_RPC_URL',
  'NEXT_PUBLIC_STREAM_PLAY_COUNT_MODE',
  'NEXT_PUBLIC_USE_DEMO_DATA',
];

// The one pre-existing default from the old build-arg Dockerfile (#843) —
// kept so a container started with no env overrides still boots the same
// way a bare `docker run` of the previous image did.
const DEFAULTS = {
  NEXT_PUBLIC_API_URL: 'http://localhost:4000/api',
};

const APP_ROOT = path.resolve(__dirname, '..');
const SUBSTITUTABLE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.html', '.json', '.txt']);
const SCAN_DIRS = [path.join(APP_ROOT, '.next'), path.join(APP_ROOT, 'public')];

function placeholderFor(varName) {
  return `@@RUNTIME:${varName}@@`;
}

function walk(dir, onFile) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, onFile);
    } else if (entry.isFile() && SUBSTITUTABLE_EXTENSIONS.has(path.extname(entry.name))) {
      onFile(fullPath);
    }
  }
}

function substituteRuntimeConfig() {
  const replacements = RUNTIME_ENV_VARS.map((varName) => ({
    token: placeholderFor(varName),
    value: process.env[varName] ?? DEFAULTS[varName] ?? '',
  }));

  for (const dir of SCAN_DIRS) {
    walk(dir, (filePath) => {
      const original = fs.readFileSync(filePath, 'utf8');
      let updated = original;
      for (const { token, value } of replacements) {
        if (updated.includes(token)) {
          updated = updated.split(token).join(value);
        }
      }
      if (updated !== original) {
        fs.writeFileSync(filePath, updated);
      }
    });
  }
}

substituteRuntimeConfig();

require(path.join(APP_ROOT, 'server.js'));
