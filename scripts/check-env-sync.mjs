#!/usr/bin/env node
// Keeps .env.example, the Dockerfile's build ARGs and
// docs/ENVIRONMENT_VARIABLES.md in sync (#867 — DOC-03). Every NEXT_PUBLIC_*
// variable in .env.example must be inlined at build time, so it needs a
// matching Dockerfile ARG/ENV pair or it silently falls back to whatever
// default is baked into the image. Every variable in .env.example should
// also have a row in docs/ENVIRONMENT_VARIABLES.md so it's discoverable.
//
// Run directly: `node scripts/check-env-sync.mjs`. Wired into CI via
// `npm run check-env-sync` (see .github/workflows/test.yml).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Variables that are intentionally NOT a Dockerfile build ARG, with the
// reason. Keep this list short — it's an escape hatch, not the default.
const DOCKER_ARG_ALLOWLIST = new Map([
  [
    'NEXT_PUBLIC_USE_DEMO_DATA',
    'dev-only fixture toggle; production images must never bake this on, so there is no build-time override for it',
  ],
]);

function readLines(relPath) {
  return readFileSync(path.join(rootDir, relPath), 'utf8').split('\n');
}

function parseEnvExampleVars(lines) {
  // Matches both active (`VAR=...`) and commented-out-but-documented
  // (`# VAR=...`) declarations; plain prose comments don't match because
  // they don't have an ALL_CAPS token immediately followed by `=`.
  const names = new Set();
  for (const line of lines) {
    const match = line.match(/^#?\s*([A-Z][A-Z0-9_]*)=/);
    if (match) names.add(match[1]);
  }
  return names;
}

function parseDockerfileArgs(lines) {
  const names = new Set();
  for (const line of lines) {
    const match = line.match(/^ARG\s+([A-Z0-9_]+)/);
    if (match) names.add(match[1]);
  }
  return names;
}

function parseDocumentedVars(lines) {
  const names = new Set();
  const inlineCode = /`([A-Z][A-Z0-9_]*)`/g;
  for (const line of lines) {
    for (const match of line.matchAll(inlineCode)) {
      names.add(match[1]);
    }
  }
  return names;
}

const envVars = parseEnvExampleVars(readLines('.env.example'));
const dockerArgs = parseDockerfileArgs(readLines('Dockerfile'));
const documentedVars = parseDocumentedVars(readLines('docs/ENVIRONMENT_VARIABLES.md'));

const publicEnvVars = [...envVars].filter((name) => name.startsWith('NEXT_PUBLIC_'));

const missingFromDockerfile = publicEnvVars.filter(
  (name) => !dockerArgs.has(name) && !DOCKER_ARG_ALLOWLIST.has(name)
);

const stalePublicDockerArgs = [...dockerArgs].filter(
  (name) => name.startsWith('NEXT_PUBLIC_') && !envVars.has(name)
);

const undocumentedVars = [...envVars].filter((name) => !documentedVars.has(name));

const problems = [];

if (missingFromDockerfile.length > 0) {
  problems.push(
    [
      'In .env.example but missing a Dockerfile ARG (add `ARG <name>` and the matching ENV line, or add it to DOCKER_ARG_ALLOWLIST in this script with a reason):',
      ...missingFromDockerfile.map((name) => `  - ${name}`),
    ].join('\n')
  );
}

if (stalePublicDockerArgs.length > 0) {
  problems.push(
    [
      'Dockerfile ARG for a NEXT_PUBLIC_* variable that is not (or no longer) in .env.example — remove the stale ARG, or add the variable to .env.example if it is still needed:',
      ...stalePublicDockerArgs.map((name) => `  - ${name}`),
    ].join('\n')
  );
}

if (undocumentedVars.length > 0) {
  problems.push(
    [
      'In .env.example but not documented in docs/ENVIRONMENT_VARIABLES.md (add a table row):',
      ...undocumentedVars.map((name) => `  - ${name}`),
    ].join('\n')
  );
}

if (problems.length > 0) {
  console.error('check-env-sync: .env.example, Dockerfile and docs/ENVIRONMENT_VARIABLES.md are out of sync.\n');
  console.error(problems.join('\n\n'));
  console.error('\nSee docs/ENVIRONMENT_VARIABLES.md and the "Sync .env.example, Dockerfile build args and ENVIRONMENT_VARIABLES.md" note there for the expected shape.');
  process.exit(1);
}

console.log(
  `check-env-sync: ok (${envVars.size} vars in .env.example, ${publicEnvVars.length} public, all accounted for in Dockerfile ARGs and docs).`
);
