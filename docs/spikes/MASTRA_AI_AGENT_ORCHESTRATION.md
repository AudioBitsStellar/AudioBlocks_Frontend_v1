# Spike: Evaluate Mastra AI framework for agent orchestration

**Initiative:** AI Song Quality Filter (Mastra AI + NVIDIA)
**Question:** Is Mastra the right framework for orchestrating the song quality analysis agent, and how should we integrate it?
**Status:** Research complete (September 2026)

---

## TL;DR

1. **Mastra is a good fit** for AudioBlocks' song quality filter agent. It provides TypeScript-native agent orchestration with built-in tool calling, model routing, and workflow DAGs — all things the quality pipeline needs.
2. **Current integration is minimal.** `config/mastra.ts` pins SDK versions (`mastra@0.10.15`, `mastra-core@0.13.6`) and the NVIDIA model. `lib/songQualityFilter.ts` calls the NVIDIA API directly without using the Mastra SDK's agent abstractions.
3. **Recommendation:** Adopt Mastra's agent + tool architecture to replace the raw fetch calls in `songQualityFilter.ts`. This unlocks structured tool use, automatic retries, and workflow composition for the hybrid pipeline (#406).

---

## 1. What is Mastra?

Mastra is an open-source TypeScript framework for building AI agents and workflows. Key capabilities:

| Feature               | Description                                                                 | Relevance to AudioBlocks                                                         |
| --------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Agent abstraction** | Define agents with system prompts, tools, and model bindings                | Encapsulate the quality scoring agent with its NVIDIA model and prompt template  |
| **Tool system**       | Typed tool definitions with Zod schemas, automatic parameter validation     | Wrap audio preprocessing (#406) outputs as structured tool inputs                |
| **Workflow DAGs**     | Multi-step workflows with branching, parallel execution, and error handling | Model the upload → preprocess → analyze → score pipeline                         |
| **Model routing**     | Connect to multiple model providers (OpenAI, Anthropic, NVIDIA, etc.)       | Use NVIDIA NIM for quality scoring, potentially other models for different tasks |
| **Memory / RAG**      | Built-in vector store integrations for agent memory                         | Not needed for v1, but useful for future feedback loops                          |
| **Observability**     | Built-in logging, tracing, and eval hooks                                   | Track quality analysis latency and accuracy                                      |

## 2. Architecture assessment

### Current state

```
Upload → lib/songQualityFilter.ts (raw fetch to NVIDIA) → SongQualityAssessment
```

- Direct HTTP calls to NVIDIA API
- No retry logic beyond what callers implement
- No structured tool use — metadata sent as a prompt string
- Job queue (`lib/qualityAnalysisJobQueue.ts`) handles async processing but doesn't use Mastra

### Proposed state with Mastra

```
Upload → Mastra Workflow
           ├─ Step 1: Audio preprocessing tool (#406) → feature vector
           ├─ Step 2: Quality analysis agent (Nemotron NIM) → scores + explanation
           └─ Step 3: Verdict aggregation tool → SongQualityAssessment
```

Benefits:

- **Typed tools**: Preprocessing outputs and model inputs validated at the boundary via Zod
- **Automatic retries**: Mastra agents support configurable retry with backoff for transient API failures
- **Workflow composition**: The DAG runner handles step ordering, parallel branches (e.g., run loudness + clipping analysis in parallel), and error propagation
- **Model swapping**: Version-pinned in `config/mastra.ts`; switching models requires only a config change
- **Eval integration**: Mastra's eval framework can score agent outputs against labelled test sets

### Risks and mitigations

| Risk                           | Severity | Mitigation                                                                                        |
| ------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| SDK instability (v0.x)         | Medium   | Version pinning in `config/mastra.ts` + `assertPinnedMastraConfig()` already in place             |
| Lock-in to Mastra abstractions | Low      | Tools and prompts are plain TypeScript; Mastra is the orchestration layer, not the business logic |
| Bundle size increase           | Low      | Mastra SDK is server-only; no client bundle impact                                                |
| Learning curve                 | Low      | TypeScript-native, well-documented, patterns similar to LangChain but simpler                     |

## 3. SDK evaluation

### Version compatibility

- Current pinned versions: `mastra@0.10.15`, `mastra-core@0.13.6`
- Latest stable (as of Sep 2026): check npm for most recent
- Breaking changes between 0.x releases are expected; pinning is correct strategy

### API surface review

```typescript
// Example: defining the quality analysis agent with Mastra
import { Agent } from '@mastra/core';
import { z } from 'zod';

const qualityAgent = new Agent({
  name: 'song-quality-analyzer',
  model: {
    provider: 'nvidia',
    name: 'nvidia/llama-3.1-nemotron-70b-instruct',
  },
  instructions: `You are a song quality analyzer. Given audio feature
    measurements, score the track on clarity, dynamic range, noise floor,
    and distortion. Return a JSON assessment.`,
  tools: {
    analyzeFeatures: {
      description: 'Analyze audio feature measurements',
      parameters: z.object({
        loudnessLUFS: z.number(),
        truePeakDBTP: z.number(),
        clippedSampleRatio: z.number(),
        noiseFloorDB: z.number(),
        spectralCutoffHz: z.number(),
      }),
      execute: async (params) => {
        // Process feature vector and return structured analysis
        return {
          /* ... */
        };
      },
    },
  },
});
```

### Workflow DAG example

```typescript
import { Workflow, Step } from '@mastra/core';

const qualityWorkflow = new Workflow({
  name: 'song-quality-pipeline',
  steps: [
    new Step({
      id: 'preprocess',
      execute: async ({ input }) => preprocessAudio(input.audioBuffer),
    }),
    new Step({
      id: 'analyze',
      execute: async ({ input }) => qualityAgent.generate(input.features),
      after: ['preprocess'],
    }),
    new Step({
      id: 'aggregate',
      execute: async ({ input }) => aggregateVerdict(input.analysis),
      after: ['analyze'],
    }),
  ],
});
```

## 4. Comparison with alternatives

| Framework            | TypeScript native | Agent + tools | Workflow DAGs    | NVIDIA support              | Maturity                     |
| -------------------- | ----------------- | ------------- | ---------------- | --------------------------- | ---------------------------- |
| **Mastra**           | Yes               | Yes           | Yes              | Yes (via OpenAI-compatible) | v0.x, active development     |
| **LangChain.js**     | Yes (port)        | Yes           | Yes (LangGraph)  | Yes                         | Mature, large ecosystem      |
| **Vercel AI SDK**    | Yes               | Yes (tools)   | No built-in DAGs | Yes                         | Mature, focused on streaming |
| **Custom (current)** | Yes               | No            | No               | Yes (raw fetch)             | N/A                          |

**Why Mastra over LangChain.js?**

- Mastra is TypeScript-first (not a Python port), resulting in more idiomatic APIs
- Lighter weight — no heavy abstraction layers or callback chains
- Built-in workflow DAGs without needing a separate package (LangGraph)
- Version pinning strategy already established in the codebase

**Why Mastra over Vercel AI SDK?**

- Vercel AI SDK lacks workflow/DAG orchestration
- Mastra provides agent memory and eval out of the box
- Better fit for server-side batch processing (quality analysis is not a streaming chat)

## 5. Recommendations

### Adopt Mastra for agent orchestration

1. **Keep the version-pinning strategy** — `config/mastra.ts` + `assertPinnedMastraConfig()` is the right approach for a v0.x dependency
2. **Refactor `lib/songQualityFilter.ts`** to use a Mastra agent with typed tools instead of raw fetch
3. **Model the quality pipeline as a Mastra Workflow** with steps for preprocessing, analysis, and aggregation
4. **Add Mastra eval tests** that run the agent against a labelled dataset to catch prompt regressions
5. **Keep business logic in plain TypeScript** — Mastra orchestrates; `lib/` modules implement

### Next steps

- [ ] Install `@mastra/core` at the pinned version from `config/mastra.ts`
- [ ] Create `lib/agents/qualityAgent.ts` wrapping the NVIDIA model as a Mastra agent
- [ ] Create `lib/workflows/qualityPipeline.ts` composing preprocessing + analysis steps
- [ ] Migrate `lib/songQualityFilter.ts` to use the workflow, keeping the public API unchanged
- [ ] Add eval tests with sample audio feature vectors and expected verdicts

---

## Sources

- [Mastra documentation](https://mastra.ai/docs)
- [Mastra GitHub repository](https://github.com/mastra-ai/mastra)
- Existing codebase: `config/mastra.ts`, `lib/songQualityFilter.ts`, `lib/qualityAnalysisJobQueue.ts`
- Related spike: `docs/spikes/NVIDIA_NIM_AUDIO_MODELS.md`
