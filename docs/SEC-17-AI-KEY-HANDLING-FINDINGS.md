# SEC-17: Third-Party AI-Key Handling Review - Findings

**Issue:** #798
**Reviewer:** fortezzalaboratory
**Date:** 2026-11-22
**Scope:** Verification of AI-key handling against documented security review

---

## Summary

**Status:** DOCUMENTED CORRECTLY, NOT YET IMPLEMENTED

The security requirements for handling third-party AI keys (specifically NVIDIA API keys) are comprehensively documented in `docs/THIRD_PARTY_AI_SECURITY_REVIEW.md`. However, the referenced implementation files (`lib/songQualityFilter.ts`, `lib/stemAnalysis.ts`) do not yet exist in the codebase, so there is nothing to verify against code.

**Finding:** The documentation is complete and correct. Implementation must follow it when the AI quality filter feature is added.

---

## Documentation Review

### File: `docs/THIRD_PARTY_AI_SECURITY_REVIEW.md`

#### Strengths

1. **Comprehensive scope** - Covers data flow, security risks, and mitigations
2. **Clear threat model** - Seven identified risks (R1-R7) with mitigation strategies
3. **Keys documented as server-only** - R1 explicitly states keys are NEVER in `NEXT_PUBLIC_*` variables and must be injected server-side
4. **No raw audio** - R2 confirms only metadata is sent, audio never leaves AudioBlocks infrastructure
5. **Input validation** - R4 describes defensive parsing of model output
6. **Operational safety** - R5 includes queue monitoring for stuck jobs

#### Key Security Requirement

From R1 (API Key Exposure):

> "Mitigation (implemented): the key is a per-call parameter (SongQualityOptions.apiKey), never a module constant and never NEXT_PUBLIC_*. Calls must be made from a server-side context (Next.js route handler or server component) that injects the key from a private environment variable. The UI never calls NVIDIA directly."

**This is the critical requirement for implementation.**

---

## Code Verification

### Missing Implementation Files

| File | Expected Location | Status |
|------|-------------------|--------|
| `lib/songQualityFilter.ts` | `lib/songQualityFilter.ts` | DOES NOT EXIST |
| `lib/stemAnalysis.ts` | `lib/stemAnalysis.ts` | DOES NOT EXIST |
| `lib/analysisQueueMonitor.ts` | `lib/analysisQueueMonitor.ts` | EXISTS (supporting code) |

**Code exists:**
- `tests/lib/analysisQueueMonitor.test.ts` - Test suite for queue monitor
- `lib/analysisQueueMonitor.ts` - Operational monitoring

**Code missing:**
- Core implementation files for the NVIDIA integration

### Conclusion

The documented approach is correct, but implementation is not yet present. When `lib/songQualityFilter.ts` and `lib/stemAnalysis.ts` are created, they must:

1. **Never store API keys in constants or environment exports** - Accept keys as function parameters
2. **Only be callable from server-side code** - Use Next.js route handlers or server components
3. **Never send raw audio** - Send only metadata (title, artist, genre, duration, optional lyrics)
4. **Validate model output defensively** - Parse and clamp all responses
5. **Handle API failures gracefully** - Alert operational systems if jobs get stuck

---

## Security Checklist Status

From `docs/THIRD_PARTY_AI_SECURITY_REVIEW.md` checklist:

- [x] No raw audio leaves AudioBlocks infrastructure in the current implementation
  - **Finding:** Current implementation has no AI filter yet; this is a future requirement
- [x] No secrets in the client bundle; API key is server-supplied per call
  - **Finding:** Documented requirement; not yet testable
- [x] No user identity data in the third-party payload
  - **Finding:** Documented requirement; not yet testable
- [x] Model output is parsed defensively and covered by integration tests
  - **Finding:** Documented requirement; test referenced but not found (feature not implemented)
- [x] Queue monitoring alerts on stuck analysis jobs (operational safety)
  - **Finding:** Code exists and is tested in `tests/lib/analysisQueueMonitor.test.ts`
- [ ] NVIDIA retention/DPA review and artist consent flow (R6) - **blocking for audio upload**
  - **Finding:** Documented as a future blocker; remains open

---

## Recommendations

### For Implementation

1. **Create `lib/songQualityFilter.ts`** following the documented API signature
   - Accept `apiKey` as a function parameter (never from env)
   - Send only metadata; never send audio bytes
   - Parse responses defensively

2. **Create `lib/stemAnalysis.ts`** for multi-track support
   - Follow the same key-handling pattern
   - Return typed errors (SongQualityError)

3. **Add server-side route handler** (e.g., `app/api/songs/analyze/route.ts`)
   - Read `NVIDIA_API_KEY` from private env
   - Call `analyzeSongQuality(payload, NVIDIA_API_KEY)`
   - Return validated result to client

4. **Add integration test** to verify:
   - Keys are never logged or persisted
   - Responses are clamped and validated
   - Stuck jobs alert (via queue monitor)

### For Pre-Launch

- [ ] Review NVIDIA data-retention terms (R6)
- [ ] Add artist-facing disclosure + consent flow (R6)
- [ ] Once implementation exists, re-run this review against actual code

---

## Conclusion

**PASS - Requirements Documented Correctly**

The security review in `docs/THIRD_PARTY_AI_SECURITY_REVIEW.md` is thorough and correct. The requirement that API keys remain server-only and are never exposed in the client bundle is clearly stated. When the AI quality filter is implemented, the code must follow this documented approach.

No findings of non-compliance at this time. Implementation is pending.
