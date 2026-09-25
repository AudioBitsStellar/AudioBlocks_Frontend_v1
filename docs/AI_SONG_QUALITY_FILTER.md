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
