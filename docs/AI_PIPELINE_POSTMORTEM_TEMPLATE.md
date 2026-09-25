# AI Pipeline Incident Postmortem / Runbook Template

Use this template for postmortems on AI pipeline incidents (song quality
filter, inference jobs, API-driven analysis). Fill in every section — a
section that does not apply still gets a written "N/A because …".

## 1. Detection

- What alert fired (or didn't)? Include the exact alert name and threshold.
- Noise level: was the alert buried in noise? Link the dashboard or log query.
- Time to detect: how long between failure onset and human awareness?
  If it took more than 5 minutes to notice, that is a finding, not a footnote.

## 2. Blast Radius

- Data affected: tracks, embeddings, job records (counts + whether recoverable).
- Users affected: how many, which flows were degraded or wrong.
- Spend affected: LLM / GPU / API cost incurred by the misfire. AI pipelines
  bleed money differently than services — an unnoticed retry loop can cost
  more than the downtime itself.

## 3. Kill-Switch + Rollback Timeline

All timestamps in UTC.

| Time (UTC) | Event |
|-----------|-------|
| T0 | Failure onset |
| T1 | Alert fired |
| T2 | Kill-switch engaged / pipeline paused |
| T3 | Rollback started |
| T4 | Service restored |

Report time-to-stop (T2 − T0) explicitly. If there was no kill-switch,
that is a finding — see section 6.

## 4. Root-Cause Chain

Do not stop at the proximate failure. Walk the full chain:

1. Proximate cause (the line / request / prompt that failed).
2. The gap that let it through (missing validation, absent budget cap,
   untested prompt change, stale model version, missing retry limit).
3. Why earlier stages (review, tests, monitoring) did not catch it.

## 5. Spend Damage

- Total token / API / GPU cost of the incident (itemized if available).
- Cost of the misfire window only, excluding normal traffic.
- Any budget caps that were hit, missing, or misconfigured.

## 6. Permanent Fix + Verification Drill

- Permanent fix (PR link) and why it prevents recurrence of every link in the
  root-cause chain, not just the proximate cause.
- The test that would have caught it — add it to the suite, then run it on a
  schedule (CI job or cron) so regressions are caught even when nobody is
  looking.

## Postmortem Checklist

- [ ] Sections 1–6 filled in, including N/A justifications
- [ ] Timeline timestamps verified against logs
- [ ] Permanent-fix PR linked and merged
- [ ] Verification test added and scheduled
- [ ] Runbook updated with the new failure mode and its kill-switch
