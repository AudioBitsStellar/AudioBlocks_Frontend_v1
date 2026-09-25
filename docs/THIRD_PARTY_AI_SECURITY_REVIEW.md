# Security Review: Sending Audio Files to Third-Party AI APIs

**Scope:** AI Song Quality Filter (Mastra AI + NVIDIA) initiative (#450, #451, #452, #458)
**Status:** Reviewed — implementation restricted to metadata-only analysis until item R6 is addressed.
**Related code:** `lib/songQualityFilter.ts`, `lib/stemAnalysis.ts`, `lib/analysisQueueMonitor.ts`

---

## 📦 Purpose & Scope

The AI Song Quality Filter screens uploaded songs through an NVIDIA-hosted model before they reach the public catalog. This review assesses what it means to send audio (or data derived from audio) to a third-party AI API, identifies the risks, and states the mitigations that the current implementation and its operators must follow.

In scope:

- `lib/songQualityFilter.ts` — the NVIDIA API integration point.
- `lib/stemAnalysis.ts` — per-stem analysis of multi-track uploads.
- `lib/analysisQueueMonitor.ts` — operational visibility into the analysis queue.

Out of scope: IPFS storage of published tracks (`docs/IPFS_INTEGRATION.md`), on-chain metadata, and payment flows.

---

## 🔁 Data Flow

```
 ┌────────────┐   upload    ┌──────────────────┐   metadata only   ┌──────────────┐
 │  Artist    │ ──────────► │  AudioBlocks     │ ────────────────► │  NVIDIA API  │
 │  (browser) │             │  (quality gate)  │ ◄──────────────── │  (assessor)  │
 └────────────┘             └──────────────────┘  JSON assessment  └──────────────┘
        │                           │            ▲
        │ audio → IPFS              │ job state  │ alert on stuck jobs
        ▼                           ▼            │
 ┌────────────┐             ┌──────────────────┐
 │ IPFS gateways│           │ Queue monitor    │
 └────────────┘             └──────────────────┘
```

Key property of the current implementation: **raw audio is never sent to the third-party API.** `analyzeSongQuality` transmits song metadata only (title, artist, genre, duration, optional lyrics) and receives a JSON assessment. Stems are described by role and name; their audio stays on the artist's storage (IPFS) until the track is published.

---

## 🚦 What Leaves the System Today

What leaves the system today:

- **Song title / genre / duration — sent to NVIDIA.** Required for the assessment.
- **Lyrics (optional) — sent to NVIDIA.** Assists quality review; see R3.
- **Raw audio / stems — never sent.** Audio remains in artist-controlled storage.
- **API keys — request header only.** Server-side, never logged or persisted.
- **User identity (wallet, email) — never sent.** Not part of the analysis payload.

---

## ⚠️ Risks & Mitigations

### R1 — API key exposure (high)

- **Risk:** NVIDIA API keys in a frontend bundle are public by definition; any visitor could extract and abuse them.
- **Mitigation (implemented):** the key is a **per-call parameter** (`SongQualityOptions.apiKey`), never a module constant and never `NEXT_PUBLIC_*`. Calls must be made from a server-side context (Next.js route handler or server component) that injects the key from a private environment variable. The UI never calls NVIDIA directly.

### R2 — Uploading unreleased audio to a third party (high, accepted with conditions)

- **Risk:** pre-release audio sent to an external service could be retained, mined, or breached — a direct loss of exclusivity for artists.
- **Mitigation (implemented):** the filter sends metadata only, so unreleased recordings never leave AudioBlocks infrastructure. If audio-based analysis is ever added, it must be gated on R6 first.

### R3 — Lyrics and personal data leakage (medium)

- **Risk:** lyrics can contain personal information, and metadata can inadvertently identify an artist.
- **Mitigation (implemented):** lyrics are optional; the analysis payload contains no wallet addresses, emails, or user ids. Operators should not add identity fields to `SongQualityInput` without re-review.

### R4 — Prompt injection / malicious model output (medium)

- **Risk:** model output is untrusted; a hostile or malformed answer could crash parsing or poison the verdict.
- **Mitigation (implemented):** the answer parser accepts only a JSON object with validated fields — scores are clamped to 0-100, verdicts fall back to `'review'`, reasons are filtered to strings; anything unparsable raises `SongQualityError` (tested in `tests/integration/songQualityFilter.integration.test.ts`).

### R5 — Availability and abuse of the third-party dependency (medium)

- **Risk:** NVIDIA outages or rate limits stall the upload pipeline; a stuck job blocks everything behind it.
- **Mitigation (implemented):** failures surface as typed errors (`SongQualityError` with status), and `lib/analysisQueueMonitor.ts` alerts on jobs silent beyond the threshold so they can be requeued instead of leaking.

### R6 — Data retention, consent, and contractual posture (owner: maintainers)

- **Risk:** without a retention guarantee, anything sent to NVIDIA may persist indefinitely; artists uploading pre-release material must know this.
- **Required before enabling audio upload:** (1) review NVIDIA's data-retention and training-use terms and record them here; (2) add artist-facing disclosure + consent at upload time; (3) keep audio submission behind server-side, short-lived, scoped access; (4) document an incident-response path for third-party breaches. Until then the metadata-only design stands.

### R7 — Transport security (low)

- **Risk:** metadata or keys intercepted in transit.
- **Mitigation:** the integration endpoint is HTTPS-only (`https://integrate.api.nvidia.com`); the browser context enforces HTTPS elsewhere (middleware). No change needed.

---

## ✅ Review Checklist

- [x] No raw audio leaves AudioBlocks infrastructure in the current implementation.
- [x] No secrets in the client bundle; API key is server-supplied per call.
- [x] No user identity data in the third-party payload.
- [x] Model output is parsed defensively and covered by integration tests.
- [x] Queue monitoring alerts on stuck analysis jobs (operational safety).
- [ ] NVIDIA retention/DPA review and artist consent flow (R6) — **blocking for audio upload**.

---

## 📌 Conclusion

Sending **audio files** to third-party AI APIs is **not approved** at this time; the implementation is intentionally restricted to **metadata-only** analysis, which keeps pre-release recordings inside AudioBlocks infrastructure. Any future change that puts audio bytes into `analyzeSongQuality` (or a successor) must close R6 first and re-run this review.
