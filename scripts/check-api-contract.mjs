#!/usr/bin/env node
// API contract drift check (#822).
//
// Compares the listener app's API paths (API_ENDPOINTS in lib/constants.ts)
// with the backend's OpenAPI spec and fails when they drift apart:
//   - a frontend path is neither in the spec nor in known-gaps.json (new drift),
//   - a known gap is now documented in the spec (remove it from the list),
//   - a known gap is no longer used by the frontend (remove it from the list),
//   - the spec cannot be read, or is not an OpenAPI 3 document with paths.
//
// Usage: node scripts/check-api-contract.mjs [spec-file-or-url]
// The spec comes from the argument, then BACKEND_OPENAPI_URL, then the
// backend's main branch. Only Node built-ins are used, so no npm install is needed.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_SPEC_URL =
  'https://raw.githubusercontent.com/AudioBitsStellar/AudioBlock_Backend/main/docs/openapi.yaml';

/** Collapses `:id`, `{id}` and `${id}` into `{}` so one route compares equal in every form. */
export function normalizePath(route) {
  return route
    .replace(/\$\{[^}]*\}/g, '{}')
    .replace(/\{[^}]*\}/g, '{}')
    .replace(/:[A-Za-z_]+/g, '{}')
    .replace(/\/+$/, '');
}

/** The /api paths declared in API_ENDPOINTS, normalized and sorted. */
export function frontendPaths(constantsSource) {
  const start = constantsSource.indexOf('export const API_ENDPOINTS');
  const end = constantsSource.indexOf('} as const', start);
  if (start === -1 || end === -1) throw new Error('API_ENDPOINTS was not found in lib/constants.ts');
  const block = constantsSource.slice(start, end);
  const routes = [...block.matchAll(/(['"`])(\/api\/[^'"`]*)\1/g)].map((match) =>
    normalizePath(match[2])
  );
  if (routes.length === 0) throw new Error('API_ENDPOINTS declares no /api paths');
  return [...new Set(routes)].sort();
}

/** The route paths in an OpenAPI 3 spec's `paths:` section, normalized and sorted. */
export function specPaths(spec) {
  if (!/^openapi:[ \t]*['"]?3\./m.test(spec)) {
    throw new Error('The spec is not an OpenAPI 3 document');
  }
  const section = spec.split(/^paths:[ \t]*$/m)[1];
  if (section === undefined) throw new Error('The spec has no paths section');
  // The section runs until the next top-level key, which starts in column 0.
  const body = section.split(/^\S/m)[0];
  const routes = [...body.matchAll(/^ {2}(\/[^\s:]+):[ \t]*$/gm)].map((match) =>
    normalizePath(match[1])
  );
  if (routes.length === 0) throw new Error('The spec lists no paths');
  return [...new Set(routes)].sort();
}

/** Returns the drift between the frontend's paths, the spec, and the known gaps. */
export function findDrift({ frontend, spec, knownGaps }) {
  const documented = new Set(spec);
  const used = new Set(frontend);
  const gaps = new Set(knownGaps.map(normalizePath));
  return {
    undocumented: frontend.filter((route) => !documented.has(route) && !gaps.has(route)),
    nowDocumented: [...gaps].filter((route) => documented.has(route)).sort(),
    unused: [...gaps].filter((route) => !used.has(route)).sort(),
  };
}

async function loadSpec(source) {
  if (!/^https?:\/\//.test(source)) return readFile(path.resolve(source), 'utf8');
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Fetching the spec returned HTTP ${response.status}`);
  return response.text();
}

async function main() {
  const source = process.argv[2] || process.env.BACKEND_OPENAPI_URL || DEFAULT_SPEC_URL;
  const [constants, specText, gapFile] = await Promise.all([
    readFile(path.join(ROOT, 'lib/constants.ts'), 'utf8'),
    loadSpec(source),
    readFile(path.join(ROOT, 'scripts/api-contract-known-gaps.json'), 'utf8'),
  ]);
  const knownGaps = JSON.parse(gapFile).paths;
  const frontend = frontendPaths(constants);
  const spec = specPaths(specText);
  const drift = findDrift({ frontend, spec, knownGaps });

  console.log(
    `API contract: ${frontend.length} frontend paths, ${spec.length} spec paths, ` +
      `${knownGaps.length} known gaps (spec: ${source})`
  );
  for (const route of drift.undocumented) {
    console.log(`::error::${route} is not in the backend spec. Document it there, or list it in scripts/api-contract-known-gaps.json.`);
  }
  for (const route of drift.nowDocumented) {
    console.log(`::error::${route} is now in the backend spec. Remove it from scripts/api-contract-known-gaps.json.`);
  }
  for (const route of drift.unused) {
    console.log(`::error::${route} is in known-gaps.json but the frontend no longer uses it. Remove it.`);
  }
  const problems =
    drift.undocumented.length + drift.nowDocumented.length + drift.unused.length;
  if (problems > 0) {
    console.log(`API contract drift found: ${problems} problem(s).`);
    process.exitCode = 1;
  } else {
    console.log('API contract matches the spec, apart from the known gaps.');
  }
}

main().catch((error) => {
  console.log(`::error::API contract check failed: ${error.message}`);
  process.exitCode = 1;
});
