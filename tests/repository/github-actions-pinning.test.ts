import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('GitHub Actions supply-chain pinning (#792)', () => {
  it('pins every external uses: reference to a full commit SHA', () => {
    const workflowDir = path.resolve('.github/workflows');
    const failures: string[] = [];
    for (const name of fs.readdirSync(workflowDir)) {
      if (!/\.ya?ml$/.test(name)) continue;
      const source = fs.readFileSync(path.join(workflowDir, name), 'utf8');
      for (const match of source.matchAll(/^\s*-?\s*uses:\s*([^\s#]+)/gm)) {
        const ref = match[1];
        if (ref.startsWith('./')) continue;
        const at = ref.lastIndexOf('@');
        const revision = at >= 0 ? ref.slice(at + 1) : '';
        if (!/^[0-9a-f]{40}$/i.test(revision)) failures.push(`${name}: ${ref}`);
      }
    }
    expect(failures).toEqual([]);
  });
});
