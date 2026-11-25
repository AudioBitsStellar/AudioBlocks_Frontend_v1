# Rollback procedure

**Launch-readiness item `OPS-05`** (#844): a written, tested way to undo a
bad production deploy in minutes, without rebuilding anything.

## Why this is safe to do without a rebuild

Every image pushed by `.github/workflows/docker-publish.yml` is tagged by
immutable commit SHA (`ghcr.io/<repo>:sha-<commit>`) in addition to the
mutable `staging`/`production` tags. Rolling back is therefore just
re-pointing the `production` tag at a previous `sha-<commit>` tag — the
same mechanism `promote.yml` uses to promote staging to production in the
first place (#843). There is nothing to rebuild and nothing that can fail
to compile; the previous image already passed CI and the staging parity
checklist when it was first promoted.

## Procedure

1. **Identify the last known-good SHA.** Check the deploy history (GitHub
   Actions runs for `promote.yml` targeting `production`, or
   `git log main` for the commit before the bad one).
2. **Run the rollback.**
   - Via GitHub Actions: run `promote.yml` with `source_tag: sha-<good
     commit>` and `target_tag: production`.
   - Via the CLI (requires registry auth — see `scripts/rollback.sh`):
     ```bash
     ./scripts/rollback.sh <good-commit-sha>
     ```
3. **Redeploy** the `production` tag on the host/orchestrator (however it
   currently picks up new pushes to that tag — e.g. a webhook, or a manual
   "pull latest and restart").
4. **Verify** `GET /api/health` on the production URL returns `200`, and
   spot-check the page that was broken.
5. **Record the rollback** — who, when, which SHA, why — in the incident
   channel/issue. If the break was caused by a bad environment variable
   rather than bad code, fix the variable instead of rolling back the image;
   rollback is for bad code/builds.

## Forward fix vs. rollback

Roll back immediately if the break affects users and the fix isn't obvious
within a few minutes. Roll forward (ship a fix commit) only once the
immediate user impact is gone — never debug a live incident on production.

## Tested

See `docs/ROLLBACK_DRILL_LOG.md` for a recorded run of this exact procedure
against a local registry, including the failure it was rolled back from.
