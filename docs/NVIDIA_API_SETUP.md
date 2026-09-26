# NVIDIA API Integration Setup

This document describes how the NVIDIA API is integrated into the
**AI Song Quality Filter (Mastra AI + NVIDIA)** and what an operator must
set up to run the pipeline. The frontend never talks to NVIDIA directly —
the raw API key is held server-side, and this app surfaces the pipeline's
cost, errors, and admin controls.

## Pipeline Overview

1. An artist uploads a track.
2. The Mastra agent (configured in `config/mastra.ts`) sends the audio to
   the NVIDIA NIM inference endpoint for a quality verdict.
3. The verdict is stored with the track; admins can override it and the
   overrides feed the threshold feedback loop (#448).

## Step 1 — Obtain and Store an NVIDIA API Key

1. Create an account on [build.nvidia.com](https://build.nvidia.com) and
   generate an API key for the NIM endpoint.
2. Store the raw key **server-side only** — encrypted at rest, access
   limited to the inference service. Never commit it to this repo, never
   put it in a `NEXT_PUBLIC_*` variable (those are bundled into the client
   and are public by definition).
3. Record only the key **metadata** (`keyId`, `createdAt`) in the key
   registry tracked by `lib/nvidiaKeyRotation.ts` — never the raw key.

Key lifecycle (90-day rotation, 7-day dual-key grace) is documented in
`docs/NVIDIA_KEY_ROTATION.md`.

## Step 2 — Pin the Model Configuration

All agent/model versions are pinned to exact releases in
`config/mastra.ts` (`MASTRA_AGENT_CONFIG`); floating ranges are rejected
at startup by `assertPinnedMastraConfig()`. To change a model or SDK
release, edit the pin deliberately, then run the full quality filter
against the new version before shipping. Model upgrades are incidents
waiting to happen otherwise — see `docs/AI_PIPELINE_POSTMORTEM_TEMPLATE.md`.

## Step 3 — Configure the Inference Service

The inference service sits between this frontend and NVIDIA:

| Concern | Where it lives |
|---------|----------------|
| Raw API key | Inference service secrets (server-side only) |
| Model id / version | `config/mastra.ts` pins |
| Timeout / retry policy | Inference service; the frontend renders the timeout error UI (`components/ai/QualityCheckTimeoutError.tsx`, #446) |
| Cost accounting | `components/ai/CostEstimationBanner.tsx` constants (`COST_PER_TRACK_USD`, `FREE_TIER_TRACKS`) — tune these to actual NVIDIA pricing |

Point `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_API_BASE_URL` at the backend
that fronts the inference service (see `docs/ENVIRONMENT_VARIABLES.md`).

## Step 4 — Verify

- A test upload produces a stored quality verdict for the track.
- Killing the inference service mid-analysis shows the quality-check
  timeout error UI (#446) instead of a hung state.
- The cost banner shows a non-zero estimate for batches above the
  free-tier allowance.

## Related

- Key rotation: `docs/NVIDIA_KEY_ROTATION.md`
- Incident runbook template: `docs/AI_PIPELINE_POSTMORTEM_TEMPLATE.md`
- Admin skip option: `lib/qualityChecks.ts` (#447)
- Threshold feedback loop: `lib/qualityThresholds.ts` (#448)
