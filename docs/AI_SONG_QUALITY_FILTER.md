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
- ⚠️ Because only metadata is sent to a text-only model, the current verdict can't detect audio defects (clipping, noise, low bitrate). The #401 spike (`docs/spikes/NVIDIA_NIM_AUDIO_MODELS.md`) evaluates the NVIDIA NIM audio models and recommends computing audio features before the model call.
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

---

## 🧹 Audio Preprocessing Before AI Analysis (#406)

`lib/audioPreprocessing.ts` runs inside `processUploadQualityCheck` **after** the
exemption check and **before** plagiarism screening and the NVIDIA model call.

| Step | What it does |
|------|--------------|
| Metadata normalization | Trims title/artist/genre/lyrics, strips control characters, collapses whitespace, and caps lyrics at `MAX_LYRICS_CHARS` (4000) so prompts stay bounded. |
| Container sniffing | Identifies WAV, MP3, FLAC, OGG and M4A from magic bytes. Unknown containers only produce a warning. |
| WAV decoding | For PCM WAV, reads sample rate, channels, bit depth and duration from the header; for 16-bit PCM also measures peak and RMS level (dBFS). |
| Duration | Uses the caller's `durationSeconds`, else the decoded WAV duration. Must be `> 0` and `≤ 30 min`. |

**Verdict:** `preprocessAudio` returns `ok: false` with a `rejectReason` only for uploads that cannot be meaningfully analysed:
- empty audio;
- digitally silent audio (peak below `-60 dBFS`);
- an invalid duration.

The pipeline then returns `status: 'rejected'` **without calling the AI model**, which saves an NVIDIA request, and records a `failed` analytics outcome. Everything else, such as a full-scale peak that suggests clipping, truncated lyrics or an unknown container, is added to `warnings` and surfaced at the front of the result's `reasons`.

The full `PreprocessedAudio` object is returned on the pipeline result as `preprocessing`.


---

## 🚦 Admin Review Queue (#418)

A verdict short of a clean approval isn't final on the spot — `lib/uploadQualityPipeline.ts` sends it to the admin review queue (`lib/flaggedTrackReview.ts`) instead, so a false rejection or a borderline pass gets a human decision rather than a retry of the same model. This fires for a rejected or review verdict, a degraded/undecidable check (NVIDIA unreachable), and an immediate plagiarism-duplicate rejection.

```typescript
import { getFlaggedTracks, approveTrack, rejectTrack } from '@/lib/flaggedTrackReview';

const pending = getFlaggedTracks('pending'); // oldest first
approveTrack(pending[0].trackId, { role: 'admin' }, 'Sounds fine on relisten');
```

Behavior:

- Only a subject whose role is in `QUALITY_CHECK_EXEMPT_ROLES` (`lib/qualityChecks.ts`, currently `admin`) may decide an entry; anything else throws `UnauthorizedReviewError`.
- A decision is final: deciding an already-decided track throws `FlaggedTrackReviewError`, and re-flagging it (e.g. a re-run of the pipeline) does not reopen it — start a new attempt via `lib/reUploadFlow.ts` instead.
- Re-flagging a still-*pending* entry refreshes its score/reasons in place.

Tests live in `tests/lib/flaggedTrackReview.test.ts` (unit) and `tests/integration/uploadQualityPipeline.integration.test.ts` (pipeline wiring).

---

## 🔁 Re-upload After a Failed Check (#421)

An artist whose track was rejected or sent to review can fix the issue and try again. `lib/reUploadFlow.ts` threads the attempts behind one logical upload together — each attempt is its own pipeline run with its own `trackId` — so the re-upload UI can show why every prior attempt fell short instead of the artist guessing.

```typescript
import {
  registerUploadAttempt,
  recordAttemptOutcome,
  canReUpload,
  startReUpload,
  getUploadHistory,
} from '@/lib/reUploadFlow';

registerUploadAttempt('track_1');
// ...run the pipeline, then...
recordAttemptOutcome('track_1', 'rejected', ['Clipping detected']);

canReUpload('track_1'); // { allowed: true, attemptsUsed: 1, attemptsRemaining: 2 }
const attempt2 = startReUpload('track_1', 'track_2'); // attemptNumber: 2
getUploadHistory('track_2'); // [attempt for track_1, attempt for track_2], oldest first
```

Behavior:

- A re-upload is allowed only when the previous attempt's outcome is `'rejected'` or `'review'` — an approved or skipped track needs no retry, and `MAX_UPLOAD_ATTEMPTS` (3, original included) caps the chain so a track can't be resubmitted forever.
- `canReUpload` never throws; it returns why a retry isn't allowed (`allowed: false, reason`) so the UI can show it directly.
- `startReUpload` throws `ReUploadFlowError` when a retry isn't allowed for the previous attempt, or when the new `trackId` is already registered.

Tests live in `tests/lib/reUploadFlow.test.ts`, fully deterministic (no network, no timers).

---

## 🚧 NVIDIA API Rate Limiting (#423)

A burst of uploads can call the NVIDIA API faster than its own limits allow, wasting a request on a 429 the caller could have avoided. `lib/nvidiaRateLimiter.ts` is a sliding-window limiter callers pass to `analyzeSongQuality` so it refuses locally — before spending an HTTP round trip — once the configured budget is used up.

```typescript
import { NvidiaRateLimiter } from '@/lib/nvidiaRateLimiter';
import { analyzeSongQuality } from '@/lib/songQualityFilter';

const rateLimiter = new NvidiaRateLimiter({ maxRequests: 60, windowMs: 60_000 });

await analyzeSongQuality(input, { apiKey: process.env.NVIDIA_API_KEY!, rateLimiter });
// throws SongQualityError({ status: 429 }) once the window is full
```

Behavior:

- `tryAcquire()` records and allows a request under the limit, or returns `{ allowed: false, retryAfterMs }` without touching state further.
- `analyzeSongQuality` treats a denial the same as an NVIDIA 429: `SongQualityError` with `status: 429`.
- The limiter is optional and storage-agnostic (in-memory, one instance per process/worker), the same pattern as `lib/analysisQueueMonitor.ts`.

Tests live in `tests/lib/nvidiaRateLimiter.test.ts` (unit) and `tests/integration/songQualityFilter.integration.test.ts` (wired into a mocked NVIDIA call).

---

## 💰 NVIDIA API Cost/Usage Tracking (#424)

Every `analyzeSongQuality` call spends NVIDIA API tokens, which is real cost. `lib/nvidiaUsageTracking.ts` turns the token usage NVIDIA reports on each successful response into an estimated USD cost, tracked per model and platform-wide, instead of only showing up on an invoice at the end of the month.

```typescript
import { getNvidiaUsageStats } from '@/lib/nvidiaUsageTracking';
import { recordNvidiaUsage } from '@/lib/nvidiaUsageTracking';

await analyzeSongQuality(input, {
  apiKey: process.env.NVIDIA_API_KEY!,
  onUsage: (usage) => recordNvidiaUsage({ model: 'nvidia/llama-3.1-nemotron-70b-instruct', ...usage }),
});

getNvidiaUsageStats(); // { requests, promptTokens, completionTokens, totalTokens, estimatedCostUsd, averageCostPerRequestUsd }
```

Behavior:

- `SongQualityAssessment.usage` and `options.onUsage` are populated only when NVIDIA's response includes a `usage` object — never invented when it's absent.
- `lib/uploadQualityPipeline.ts` records usage automatically for the single-track path whenever it's present.
- Pricing (`DEFAULT_NVIDIA_PRICING`, keyed by model, with `FALLBACK_PRICING` for an unlisted model) is approximate and overridable per call — NVIDIA's published rates change independently of this repo.
- The store is bounded (oldest entries evicted past the cap), the same pattern as `lib/qualityAnalytics.ts`.

Tests live in `tests/lib/nvidiaUsageTracking.test.ts` (unit) and `tests/integration/songQualityFilter.integration.test.ts` (usage captured from a mocked NVIDIA response).
