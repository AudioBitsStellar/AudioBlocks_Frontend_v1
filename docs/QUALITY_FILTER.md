# AI Song Quality Filter Documentation

AudioBlocks Frontend implements parts of the AI Song Quality Filter initiative (Mastra AI + NVIDIA): uploads are analysed for audio quality, originals and remasters are compared, artists can opt out, and the quality standards are explained publicly.

---

## 🎚️ Overview & Architecture

The quality filter analyses an uploaded track and produces a `QualityAnalysis` with an overall score and per-metric scores, all on a 0–100 scale where higher is better:

| Metric | What it measures |
| --- | --- |
| `clarity` | Presence and intelligibility of the mix |
| `dynamicRange` | Preserved contrast between quiet and loud passages |
| `noiseFloor` | Absence of background noise and hiss |
| `distortion` | Absence of clipping and artefacts |

Analysis modules (`lib/qualityComparison.ts`, `lib/qualityLoadTest.ts`) are dependency-free so they can be unit tested with Vitest.

---

## 🔁 Quality Comparison (#453)

`lib/qualityComparison.ts` compares the analysis of an original upload with the analysis of its remaster.

### Types

- **`QualityAnalysis`** — `trackId`, `variant` (`'original' | 'remastered'`), overall `score`, and `metrics` (partial record of `QualityMetricKey` scores). Unknown or malformed values are treated as missing.
- **`QualityComparison`** — `scoreDelta`, per-`metric` deltas (`null` when a side is unknown), a `verdict` (`'improved' | 'unchanged' | 'regressed'`), and user-facing `summary` copy.

### Usage

```typescript
import { compareQualityAnalyses } from '@/lib/qualityComparison';

const comparison = compareQualityAnalyses(originalAnalysis, remasteredAnalysis);
// comparison.verdict   → 'improved' | 'unchanged' | 'regressed'
// comparison.scoreDelta→ e.g. 4
// comparison.summary   → 'Remaster improved overall quality by 4 points (72 → 76).'
```

### Verdict behaviour

- Deltas within a **1-point tolerance** are treated as measurement noise and reported as `'unchanged'`.
- Deltas beyond the tolerance flip the verdict to `'improved'` or `'regressed'`.
- When either overall score is unavailable, `scoreDelta` is `null`, the verdict stays `'unchanged'`, and the summary explains that scores are unavailable — the comparison never throws on malformed input.
- Score values are clamped to 0–100 before comparison, so out-of-range provider data cannot skew results.

---

## 🚫 Artist Opt-Out (#455)

Artists who decline automated quality checks can turn them off from **Dashboard → Settings → Quality Checks**.

- The preference is stored as `qualityAnalysisOptOut` (`boolean`, default `false`) on `UserPreferences` in `context/UserPreferencesContext.tsx`.
- It is persisted to `localStorage` and synced to the API together with the other preferences.
- Opting out does not affect playback quality preferences (`audioQuality`); it only skips automated quality analysis of the artist's uploads.

---

## 🌐 Public Explainer Page (#454)

`app/(home)/quality-standards/page.tsx` is a public, server-rendered page describing how AudioBlocks grades audio quality. Its sections live in `components/common/quality-standards/`:

- `QualityStandardsHero.tsx` — headline and introduction with a CTA to the artist hub.
- `QualityStandardsCriteria.tsx` — the four quality criteria cards (same metrics as the table above) plus how the comparison verdict is derived.

The page ships SEO metadata (Open Graph and Twitter cards) following the artist-hub page pattern.

---

## 🧪 Load Testing (#456)

`lib/qualityLoadTest.ts` provides a concurrency-capped load harness for the quality analysis endpoint so bursts of uploads can be validated before release.

```typescript
import { runQualityLoadTest } from '@/lib/qualityLoadTest';

const result = await runQualityLoadTest({
  endpoint: 'https://api.example.com/quality/analysis',
  totalRequests: 40,
  concurrency: 5,
  maxP95Ms: 2000,
  minSuccessRate: 0.98,
});
// result.passed → boolean
// result.latencyMs → { p50, p95, p99 }
```

- Requests are fired in batches of at most `concurrency` simultaneous in-flight requests.
- Each request has a per-request timeout and is counted as failed when it aborts or returns a non-2xx response.
- The summary reports request counts, latency percentiles (`p50`/`p95`/`p99`), the observed maximum concurrency, and whether the configured thresholds passed.
- `fetch` and the clock are injectable, which keeps the harness deterministic in unit tests (`tests/lib/qualityLoadTest.test.ts`) and reusable against any environment.

Run the harness through the existing Vitest setup:

```bash
npm test -- tests/lib/qualityLoadTest.test.ts
```
