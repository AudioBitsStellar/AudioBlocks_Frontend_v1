# AI Song Quality Filter (Mastra AI + NVIDIA)

AudioBlocks screens uploaded songs for quality before they reach the public catalog. The filter is part of the **AI Song Quality Filter (Mastra AI + NVIDIA)** initiative and runs songs through an NVIDIA-hosted model that returns a normalized quality assessment.

---

## 🎯 Assessment Contract

Every analysis produces a `SongQualityAssessment`:

- `score: number` — 0-100, clamped and rounded.
- `verdict: 'approved' | 'review' | 'rejected'` — unknown model verdicts fall back to `'review'`.
- `reasons: string[]` — short human-readable explanations.
- `model: string` — model that produced the assessment.

The integration point is `lib/songQualityFilter.ts`:

```typescript
import { analyzeSongQuality } from '@/lib/songQualityFilter';

const assessment = await analyzeSongQuality(
  { title: 'Midnight Drive', genre: 'Synthwave', durationSeconds: 184 },
  { apiKey: process.env.NVIDIA_API_KEY! }
);
```

- The API key is a **per-call parameter**, never a module constant, so it can be kept server-side and out of the client bundle.
- Raw audio is never uploaded; only song metadata is sent (see `docs/THIRD_PARTY_AI_SECURITY_REVIEW.md`).
- The model answer is expected to be JSON but is parsed leniently (markdown code fences and prose are tolerated); anything unparsable raises `SongQualityError`.

---

## 🧪 Integration Testing (#450)

`tests/integration/songQualityFilter.integration.test.ts` exercises the full request/response path against the NVIDIA API **with the network mocked**: the global `fetch` is stubbed with canned NVIDIA chat-completion responses (Vitest, same mocking style as `tests/lib/apiClient.test.ts`).

Covered scenarios:

1. **Happy path** — asserts the request URL (`POST {baseUrl}/v1/chat/completions`), the `Authorization: Bearer` header, the request body (model, prompt containing song metadata), and the normalized assessment.
2. **Markdown-fenced JSON** — model answers wrapped in ` ```json ` fences are still parsed.
3. **Normalization** — out-of-range scores are clamped to 0-100, unknown verdicts fall back to `'review'`, non-string reasons are dropped.
4. **HTTP errors** — non-OK responses map to `SongQualityError` carrying the status code (e.g. 429 rate limiting).
5. **Network failures** — rejected `fetch` calls map to `SongQualityError`.
6. **Unexpected shapes** — missing `choices` or JSON-less answers raise `SongQualityError` instead of leaking a parse crash.

The tests need no API key and no network access, so they run in CI as part of `npm run test`.

---

## 📡 Queue Monitoring & Alerting (#451)

Stalled analysis jobs (crashed worker, wedged HTTP call, lost message) block the queue and delay every upload behind them. `lib/analysisQueueMonitor.ts` tracks job heartbeats and surfaces the jobs that stopped sending them:

```typescript
import { AnalysisQueueMonitor } from '@/lib/analysisQueueMonitor';

const monitor = new AnalysisQueueMonitor({
  stuckThresholdMs: 5 * 60 * 1000, // default threshold
  onAlert: (stuck) => sendAlert(stuck), // PagerDuty / Slack / log sink
});

monitor.register(jobId); // when the analysis starts
monitor.heartbeat(jobId); // on every progress step
monitor.complete(jobId); // on success or requeue

const stuckJobs = monitor.check(); // on an interval
```

Behavior:

- A job is **stuck** when it has been silent (no heartbeat) for longer than the threshold.
- `check()` returns all stuck jobs oldest first and fires `onAlert` **once per newly stuck job**, so repeated checks do not spam the same alert.
- `complete()` clears the alert state, so a re-registered job id can alert again.

The monitor is storage-agnostic: it keeps state in memory and composes with any backend queue (e.g. BullMQ) whose worker loop calls `register`/`heartbeat`/`complete`. Tests live in `tests/lib/analysisQueueMonitor.test.ts` and use injected timestamps, so they are fully deterministic.

---

## 🎚️ Stems / Multi-Track Uploads (#452)

Artists upload multi-track projects as individual stems (vocals, drums, bass, …) rather than one bounced file. `lib/stemAnalysis.ts` analyzes every stem of an upload and aggregates the per-stem assessments into one verdict for the upload:

```typescript
import { analyzeStemUpload } from '@/lib/stemAnalysis';

const analysis = await analyzeStemUpload(stems, (stem) =>
  analyzeSongQuality(
    { title: `${project.title} — ${stem.role}`, genre: project.genre },
    { apiKey: process.env.NVIDIA_API_KEY! }
  )
);
```

Behavior:

- Every stem is analyzed **in parallel** (`Promise.allSettled`); one failing stem never cancels the others.
- Per-stem failures are captured on the result (`assessment: null` plus `error`), never thrown.
- The overall score is the average of successful stems; a single rejected stem rejects the upload, and any review or failed stem sends it to manual review — a broken stem can never slip through as approved.
- An upload with zero stems is rejected as invalid input.

Tests live in `tests/lib/stemAnalysis.test.ts` with an injected per-stem analyzer, so no network is involved.
