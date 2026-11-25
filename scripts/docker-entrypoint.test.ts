import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Guards against the Dockerfile's placeholder ENV block and this script's
// RUNTIME_ENV_VARS list drifting apart (#843) — each must list exactly the
// same NEXT_PUBLIC_* vars, or runtime substitution silently misses one.
describe('docker-entrypoint runtime var list', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const entrypointSource = fs.readFileSync(path.join(repoRoot, 'scripts/docker-entrypoint.js'), 'utf8');
  const dockerfileSource = fs.readFileSync(path.join(repoRoot, 'Dockerfile'), 'utf8');

  function extractEntrypointVars(): string[] {
    const match = entrypointSource.match(/RUNTIME_ENV_VARS = \[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    return Array.from(match![1].matchAll(/'(NEXT_PUBLIC_[A-Z0-9_]+)'/g)).map((m) => m[1]);
  }

  function extractDockerfileVars(): string[] {
    // The first var in the ENV block follows `ENV `; the rest are indented
    // line continuations — both must be matched.
    return Array.from(
      dockerfileSource.matchAll(/^\s*(?:ENV\s+)?(NEXT_PUBLIC_[A-Z0-9_]+)="@@RUNTIME:\1@@"/gm)
    ).map((m) => m[1]);
  }

  it('lists at least one runtime-configurable var', () => {
    expect(extractEntrypointVars().length).toBeGreaterThan(0);
  });

  it('matches exactly between the entrypoint script and the Dockerfile', () => {
    const entrypointVars = extractEntrypointVars().sort();
    const dockerfileVars = extractDockerfileVars().sort();
    expect(dockerfileVars).toEqual(entrypointVars);
  });
});
