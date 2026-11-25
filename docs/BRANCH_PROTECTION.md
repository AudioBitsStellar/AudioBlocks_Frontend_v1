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
| **Require signed commits** (#785, SEC-03) | **Enabled** |
| **Require linear history** (#785, SEC-03) | **Enabled** |
| Allowed merge methods | Squash, Rebase (no "Create a merge commit") |
| Include administrators | Enabled |
| Allow force pushes | Disabled |
| Allow deletions | Disabled |

## Required status checks

These map to jobs defined under [`.github/workflows`](../.github/workflows):

| Check | Workflow | Job | Blocks merge on |
|---|---|---|---|
| `test / lint` | `test.yml` | `lint` | ESLint failures |
| `test / type-check` | `test.yml` | `type-check` | TypeScript type-checking failures |
| `test / coverage` | `test.yml` | `coverage` | Test failures, or coverage dropping below the thresholds in `vitest.config.ts` |
| `security / dependency-audit` | `security.yml` | `dependency-audit` | `npm audit --audit-level=high` findings |
| `security / codeql` | `security.yml` | `codeql` | CodeQL static-analysis alerts |
| `security / trivy-image-scan` | `security.yml` | `trivy-image-scan` | CRITICAL/HIGH vulnerabilities in the built Docker image (#845) |

**To apply these rules:** See the branch protection configuration in GitHub Settings → Branches. Contact a repository administrator to update the branch protection rule for `main` to include `test / type-check` as a required status check.

Dependency audits run as the `security / dependency-audit` check in
`security.yml`. It blocks on high or critical advisories, runs for pull
requests that change `package.json` or `package-lock.json`, and runs weekly.

## Rationale

- **1 required approval** keeps review lightweight for a small contributor
  base while still catching obvious issues before merge.
- **Up-to-date branches** avoids merging a PR that passed CI against a stale
  base and would fail (or silently regress) against current `main`.
- **Include administrators** means the rules apply uniformly — no bypassing
  review or CI under time pressure, which is exactly when mistakes happen.
- **No force pushes / no deletions** on `main` preserves a reliable history
  for bisecting regressions.
- **Require signed commits** (SEC-03, #785) protects against author
  spoofing and tampered commits. GitHub verifies each commit's GPG, SSH, or
  S/MIME signature against the committer's registered keys; unverified
  commits are refused. Set up a key under **Settings → SSH and GPG keys**,
  then enable signing locally with `git config commit.gpgsign true`.
- **Require linear history** (SEC-03, #785) blocks locally-made merge
  commits from landing on `main`. All PRs must be fast-forwarded (squash or
  rebase); a merge commit someone created by running `git merge` on their
  workstation cannot be pushed. Combined with the "allowed merge methods"
  setting above, this means every commit on `main` is a signed, linear
  history entry produced by GitHub's merge UI — easy to audit after the
  fact.

## Contributor setup checklist (one-time)

1. Register a signing key on github.com under **Settings → SSH and GPG keys**
   (SSH signing keys are usually the lowest-friction option).
2. In each local clone:
   ```
   git config user.signingkey <key-id>
   git config commit.gpgsign true
   git config gpg.format ssh                   # only when using SSH signing
   git config gpg.ssh.allowedSignersFile ~/.ssh/allowed_signers
   ```
3. Confirm the signature appears green on the next commit:
   `git log --show-signature -1`.
