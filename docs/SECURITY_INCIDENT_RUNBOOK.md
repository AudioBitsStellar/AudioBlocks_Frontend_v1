# Security Incident Runbook: Credential & Supply-Chain Compromise

Launch-readiness item `DOC-02` (#866). This runbook covers the two incident
classes this repo is actually exposed to today: a leaked/compromised
**credential** (an Actions secret, API key or token this app or its CI holds),
and a **supply-chain compromise** (a malicious or hijacked npm dependency, a
compromised GitHub Action, or a compromised contributor/maintainer account
with write access). It does not cover on-chain incidents (contract bugs,
compromised wallets) — those belong with the Stellar/Soroban contracts and
`AudioBlock_Backend`, not this frontend.

Drafted from a read-only review of this repository and its public GitHub
Actions configuration; nothing here was exercised against a live incident.
Sections marked **(verify)** need a maintainer with repo-admin or org-owner
access to confirm, since that access is required to see the values this
runbook only reasons about from the outside (which secrets are actually
configured, who holds admin rights, whether 2FA/branch protection is
enforced).

## Credential inventory

What a credential compromise could actually mean here, and how bad it is.
"Secret" below means a value that must stay confidential; `NEXT_PUBLIC_*`
variables are inlined into the client bundle by Next.js and are **not**
secrets — treat "NEXT_PUBLIC_* leaked" as a wrong-configuration incident
(real secret shipped under a public name), not a rotation.

| Credential | Where it lives | Scope if compromised | Rotation owner |
|---|---|---|---|
| `GITHUB_TOKEN` (Actions) | Auto-issued per workflow run (`release.yml`, `docker-publish.yml` if present, etc.) | Repo-scoped, expires with the job; can't be rotated manually, only revoked by disabling the run / regenerating repo settings | GitHub (automatic) — repo admin can restrict its permissions in Settings → Actions |
| `NPM_TOKEN` (`.github/workflows/release.yml`) | Repository secret | Could publish/unpublish under whatever npm scope the token is authorized for. **(verify)**: `package.json` has `"private": true` and no npm `name` scope is configured for publishing, so confirm with maintainers whether this token is still needed or is a leftover from scaffolding | npm account owner who issued the token |
| `SENTRY_AUTH_TOKEN` (`next.config.ts`, build time) | Repository secret | Can upload/overwrite source maps and read error data for the configured Sentry org/project | Sentry org admin |
| RPC provider key embedded in `NEXT_PUBLIC_RPC_URL` (e.g. an Infura project id) | `.env.local` / deployment config, **not** committed (`.env.example` ships a placeholder) | Low severity: rate-limit abuse / quota exhaustion on the RPC provider, not a fund-draining risk by itself | Whoever owns the RPC provider account for the deployment |
| Deployment platform secrets (hosting provider env vars, if any) **(verify)** | Deployment platform's secret store, not this repo | Depends on platform scope; confirm which platform (Vercel/other) is in use and who administers it | Deployment platform account owner |

Notes:

- `.npmrc` at the repo root is empty — no registry auth token is committed
  there. Keep it that way; a token added to `.npmrc` would ship inside
  anything built from a checkout that includes it.
- `.env.local` is git-ignored (see `.gitignore`); `.env.example` is the
  committed template and must never contain a real secret, only placeholders
  (see [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md)).
- The NVIDIA API key used by the AI song quality filter has its own runbook —
  see [`docs/NVIDIA_KEY_ROTATION.md`](NVIDIA_KEY_ROTATION.md) — because it is
  tracked with a dual-key grace window the generic steps below don't cover.

## Rotation checklist

Work through this whenever a credential above is suspected leaked (found in a
log, a public gist, a screen share, a dependency's exfiltration report, etc.).
Treat "suspected" the same as "confirmed" — rotate first, investigate after.

1. **Contain**
   - [ ] Identify exactly which credential is exposed and where it was seen.
   - [ ] If it's a GitHub Actions secret: go to Settings → Secrets and
     variables → Actions and note which workflows reference it
     (`grep -rn "secrets\." .github/workflows/`).
   - [ ] If it's a third-party API key (Sentry, npm, an RPC provider): log in
     to that provider's console directly — do not trust any link from the
     context the leak was discovered in.
2. **Revoke**
   - [ ] Revoke/delete the exposed credential at its source (provider
     console, or GitHub secret deletion). Do this before issuing a
     replacement so the window where both are valid is as short as possible,
     unless the integration needs a dual-key grace period (see
     `NVIDIA_KEY_ROTATION.md` for that pattern).
3. **Rotate**
   - [ ] Issue a new credential from the same provider.
   - [ ] Update the GitHub Actions secret (repo Settings → Secrets and
     variables → Actions) or the deployment platform's secret store.
   - [ ] Never place the new value in `.env.example`, a commit, a PR
     description, or a CI log (`echo`/`print`-ing a secret in a workflow step
     leaks it into the public log for a public repo).
4. **Verify**
   - [ ] Re-run the workflow(s) that use the credential (`release.yml`, the
     Sentry source-map upload step in a build, etc.) and confirm they still
     succeed with the new value.
   - [ ] Confirm the old credential is actually rejected (a login attempt /
     API call with it should fail).
5. **Audit blast radius**
   - [ ] For an Actions secret: review recent workflow runs
     (`gh run list`) for anything unexpected that ran while the credential
     was exposed.
   - [ ] For a provider key (Sentry, npm): check that provider's own audit
     log for activity you don't recognize in the exposure window.
6. **Record**
   - [ ] File a short postmortem. There is no generic incident template in
     this repo yet; the closest precedent is
     [`docs/AI_PIPELINE_POSTMORTEM_TEMPLATE.md`](AI_PIPELINE_POSTMORTEM_TEMPLATE.md)
     — reuse its shape (what happened, blast radius, fix, follow-up) for a
     non-AI-pipeline incident too until a dedicated template exists.

## Supply-chain compromise

What's in scope: a malicious update to an npm dependency (including a
transitive one), a compromised GitHub Action, or a compromised
contributor/maintainer account pushing to `main` or merging a malicious PR.

### Current mitigations already in place

- `package-lock.json` is committed, so `npm ci` installs exactly what the
  lockfile pins rather than resolving fresh ranges.
- `.github/workflows/security.yml` runs `npm audit --audit-level=high` on
  every PR that touches `package.json`/`package-lock.json`, on push to
  `main`, and weekly — and crucially runs `npm ci --ignore-scripts
  --legacy-peer-deps`, so a malicious package's `postinstall` script does not
  execute in that job.
- CodeQL (`security.yml`) scans the JavaScript/TypeScript source on the same
  triggers for injected or vulnerable code patterns.
- Dependabot is configured (see the `dependabot/*` branches) for both npm and
  GitHub Actions updates, which is also how a compromised-then-yanked package
  version or action tag normally gets flagged.
- Commits are gated by `commitlint` and PR review; there is no CODEOWNERS
  file in this repo today, so **(verify)** who besides a repo admin can
  merge to `main` without review.

### Gaps to flag for maintainers (not fixed by this PR)

- GitHub Actions in this repo's workflows are pinned to version tags
  (`actions/checkout@v4`, etc.), not to a commit SHA. A tag can be moved by
  whoever controls that action's repo; pinning to a SHA (and letting
  Dependabot bump the SHA) is the stronger guarantee against a compromised
  action. Left as a follow-up rather than changed here, since re-pinning
  every workflow is its own reviewable change.
- There's no documented policy for 2FA / branch protection requirements on
  `main` — **(verify)** against the repo's actual branch protection rules
  (see `docs/BRANCH_PROTECTION.md` for what is currently documented there).

### If a compromise is suspected

1. **Dependency**: identify the package/version from the audit alert, lockfile
   diff, or install log. Pin `package-lock.json` back to the last known-good
   resolution (`npm install <pkg>@<good-version> --save-exact`), rotate any
   secret that a CI job using that dependency could have read (assume
   `postinstall` scripts in CI before this runbook existed could have run),
   and open an advisory/issue referencing the npm advisory ID.
2. **GitHub Action**: pin the affected action to a known-good commit SHA
   immediately, rotate `GITHUB_TOKEN`-scoped secrets that workflow could read
   (contents, packages, PR write — see each workflow's `permissions:` block),
   and check recent runs of that workflow for unexpected steps/output.
3. **Compromised account**: a repo admin revokes that account's access
   immediately (Settings → Collaborators), force-rotates any secret that
   account could view or that its commits could have exfiltrated via CI, and
   audits recent commits/merges from that account for injected code.

## Contacts

This repository does not currently have a `SECURITY.md` or a named security
contact, so there is no specific name or email to put here without guessing.
Until maintainers designate one:

- **Report a suspected vulnerability or credential leak** via GitHub's
  private vulnerability reporting for this repo (Security tab → "Report a
  vulnerability"), which reaches repo admins without exposing the report
  publicly. If that feature isn't enabled for this repo yet, open an issue
  with a redacted description (**never paste the actual secret or exploit
  details in a public issue**) and ask a maintainer to move the conversation
  to a private channel.
- **Rotating a secret requires repo-admin access** (Settings → Secrets and
  variables → Actions is admin-only), so any contributor who spots a leak
  should still escalate to an admin even if they can revoke the credential
  at the provider directly.
- Maintainers: consider adding a root `SECURITY.md` that names the actual
  contact(s) and enables private vulnerability reporting, so this section can
  point to a real name instead of "ask a repo admin."
