# Branch Protection Rules

This documents the branch protection configuration for `main`, and the CI
checks it should require. Repo admins can apply this under
**Settings → Branches → Branch protection rules**.

## `main`

| Setting | Value |
|---|---|
| Require a pull request before merging | Enabled |
| Required approvals | 1 |
| Dismiss stale approvals on new commits | Enabled |
| Require status checks to pass before merging | Enabled |
| Require branches to be up to date before merging | Enabled |
| Require conversation resolution before merging | Enabled |
| Include administrators | Enabled |
| Allow force pushes | Disabled |
| Allow deletions | Disabled |

## Required status checks

These map to jobs defined under [`.github/workflows`](../.github/workflows):

| Check | Workflow | Job | Blocks merge on |
|---|---|---|---|
| `test / lint` | `test.yml` | `lint` | ESLint failures |
| `test / coverage` | `test.yml` | `coverage` | Test failures, or coverage dropping below the thresholds in `vitest.config.ts` |
| `security / dependency-audit` | `security.yml` | `dependency-audit` | `npm audit` findings at or above the configured severity |
| `security / codeql` | `security.yml` | `codeql` | CodeQL static-analysis alerts |
| `Dependency Vulnerability Scanning / audit` | `dependency-scan.yml` | `audit` | Known-vulnerable dependency versions |

As CI gains new required jobs (see #290 Storybook build, #288 TypeScript
type checking, #297 coverage reporting), add their check names to this table
and to the branch protection rule at the same time — a status check that
exists in CI but isn't marked required doesn't block a merge.

## Rationale

- **1 required approval** keeps review lightweight for a small contributor
  base while still catching obvious issues before merge.
- **Up-to-date branches** avoids merging a PR that passed CI against a stale
  base and would fail (or silently regress) against current `main`.
- **Include administrators** means the rules apply uniformly — no bypassing
  review or CI under time pressure, which is exactly when mistakes happen.
- **No force pushes / no deletions** on `main` preserves a reliable history
  for bisecting regressions.
