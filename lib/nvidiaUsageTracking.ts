/**
 * Cost/usage tracking for NVIDIA API calls (#424).
 *
 * Part of the AI Song Quality Filter (Mastra AI + NVIDIA): every call to
 * `analyzeSongQuality` (`lib/songQualityFilter.ts`) consumes NVIDIA API
 * tokens, and token usage translates directly into cost. This module records
 * the usage NVIDIA reports on each successful response and turns it into an
 * estimated USD cost, so spend is visible per model and platform-wide
 * instead of only showing up on an invoice at the end of the month.
 *
 * The store is bounded (oldest entries evicted past the cap), the same
 * pattern as `lib/qualityAnalytics.ts`, so a long session can never grow it
 * without limit.
 */

/** Token usage as NVIDIA's chat completion API reports it. */
export interface NvidiaTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface NvidiaUsageEvent extends NvidiaTokenUsage {
  /** Track the call analyzed, when known. */
  trackId?: string;
  /** Model that served the request. */
  model: string;
  /** Unix ms; defaults to now. */
  recordedAt?: number;
}

export interface NvidiaUsageStats {
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  /** Estimated total cost in USD across the recorded requests. */
  estimatedCostUsd: number;
  /** estimatedCostUsd / requests. 0 when nothing recorded. */
  averageCostPerRequestUsd: number;
}

/** USD cost per 1,000 tokens for a model, split by prompt vs. completion. */
export interface NvidiaModelPricing {
  promptPer1kUsd: number;
  completionPer1kUsd: number;
}

/**
 * Default pricing table, keyed by model id. Approximate NVIDIA NIM hosted
 * pricing — operators should override entries here (or pass a custom table
 * to `estimateCost`/`recordNvidiaUsage`) as NVIDIA's published rates change.
 */
export const DEFAULT_NVIDIA_PRICING: Record<string, NvidiaModelPricing> = {
  'nvidia/llama-3.1-nemotron-70b-instruct': {
    promptPer1kUsd: 0.0002,
    completionPer1kUsd: 0.0006,
  },
};

/** Pricing used for a model with no entry in the table. */
export const FALLBACK_PRICING: NvidiaModelPricing = {
  promptPer1kUsd: 0.0002,
  completionPer1kUsd: 0.0006,
};

const MAX_EVENTS = 5000;

type StoredEvent = Required<Pick<NvidiaUsageEvent, 'model' | 'recordedAt'>> &
  NvidiaTokenUsage &
  Pick<NvidiaUsageEvent, 'trackId'> & { estimatedCostUsd: number };

const store: StoredEvent[] = [];

/** Estimates USD cost for a token usage, using the given (or default) pricing table. */
export function estimateCost(
  usage: NvidiaTokenUsage,
  model: string,
  pricing: Record<string, NvidiaModelPricing> = DEFAULT_NVIDIA_PRICING
): number {
  const rates = pricing[model] ?? FALLBACK_PRICING;
  const promptCost = (usage.promptTokens / 1000) * rates.promptPer1kUsd;
  const completionCost = (usage.completionTokens / 1000) * rates.completionPer1kUsd;
  return promptCost + completionCost;
}

/**
 * Records one NVIDIA API call's token usage and its estimated cost.
 *
 * @param event - Usage as reported by the API, plus the model that served it.
 * @param pricing - Optional pricing table override (defaults to `DEFAULT_NVIDIA_PRICING`).
 */
export function recordNvidiaUsage(
  event: NvidiaUsageEvent,
  pricing: Record<string, NvidiaModelPricing> = DEFAULT_NVIDIA_PRICING
): void {
  if (store.length >= MAX_EVENTS) {
    store.shift();
  }
  store.push({
    trackId: event.trackId,
    model: event.model,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    totalTokens: event.totalTokens,
    estimatedCostUsd: estimateCost(event, event.model, pricing),
    recordedAt: event.recordedAt ?? Date.now(),
  });
}

/**
 * Aggregates recorded usage. Pass an optional `model` to scope the stats to
 * one model.
 */
export function getNvidiaUsageStats(model?: string): NvidiaUsageStats {
  let requests = 0;
  let promptTokens = 0;
  let completionTokens = 0;
  let totalTokens = 0;
  let estimatedCostUsd = 0;

  for (const e of store) {
    if (model !== undefined && e.model !== model) continue;
    requests++;
    promptTokens += e.promptTokens;
    completionTokens += e.completionTokens;
    totalTokens += e.totalTokens;
    estimatedCostUsd += e.estimatedCostUsd;
  }

  return {
    requests,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedCostUsd,
    averageCostPerRequestUsd: requests === 0 ? 0 : estimatedCostUsd / requests,
  };
}

/** Clear all recorded usage events (tests / admin reset). */
export function resetNvidiaUsageTracking(): void {
  store.length = 0;
}
