/**
 * AI song quality analysis through the NVIDIA API (#450).
 *
 * Part of the AI Song Quality Filter initiative: uploaded songs are screened
 * for quality before they reach the public catalog. This module is the single
 * integration point with the NVIDIA API — callers never talk to it directly,
 * and the API key is always supplied by the caller so it never ends up in the
 * client bundle.
 * 
 * Enhanced features:
 * - Caching support to avoid redundant API calls (#422)
 * - Comprehensive logging for the AI analysis pipeline (#427)
 * - Fallback behavior when NVIDIA API is unavailable (#425)
 */

import { getQualityCache } from './qualityAnalysisCache';

export interface SongQualityInput {
  title: string;
  artist?: string;
  genre?: string;
  durationSeconds?: number;
  lyrics?: string;
}

export type QualityVerdict = 'approved' | 'review' | 'rejected';

export interface SongQualityAssessment {
  /** Overall quality score on a 0-100 scale. */
  score: number;
  verdict: QualityVerdict;
  reasons: string[];
  model: string;
}

export interface SongQualityOptions {
  /** NVIDIA API key. Supplied per call so it can be kept server-side. */
  apiKey: string;
  baseUrl?: string;
  model?: string;
  /** Injectable fetch for testing; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Enable caching of quality analysis results (#422) */
  enableCache?: boolean;
  /** Cache key suffix for metadata-based cache invalidation */
  metadataHash?: string;
  /** Enable detailed logging for debugging (#427) */
  enableLogging?: boolean;
  /** Logger function (defaults to console.log) */
  logger?: (message: string, data?: unknown) => void;
  /** Enable fallback behavior when API is unavailable (#425) */
  enableFallback?: boolean;
  /** Fallback assessment to return when API fails */
  fallbackAssessment?: Partial<SongQualityAssessment>;
}

/** Error raised when the NVIDIA API call fails or returns an unusable answer. */
export class SongQualityError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'SongQualityError';
    this.status = status;
  }
}

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com';
const DEFAULT_MODEL = 'nvidia/llama-3.1-nemotron-70b-instruct';
const REQUEST_TIMEOUT_MS = 30_000;

const VERDICTS: readonly QualityVerdict[] = ['approved', 'review', 'rejected'];

const SYSTEM_PROMPT = [
  'You are an A&R reviewer for the AudioBlocks music platform.',
  'Rate the song quality and answer with a JSON object only:',
  '{"score": <0-100>, "verdict": "approved" | "review" | "rejected", "reasons": ["..."]}',
].join(' ');

function buildUserPrompt(input: SongQualityInput): string {
  const details = [
    `Title: ${input.title}`,
    input.artist ? `Artist: ${input.artist}` : null,
    input.genre ? `Genre: ${input.genre}` : null,
    input.durationSeconds != null ? `Duration: ${input.durationSeconds} seconds` : null,
    input.lyrics ? `Lyrics: ${input.lyrics}` : null,
  ].filter(Boolean);
  return details.join('\n');
}

/**
 * Pulls the first JSON object out of a model answer. NVIDIA models sometimes
 * wrap JSON in markdown code fences or prose, so the parser tolerates both.
 */
function extractJson(content: string): Record<string, unknown> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : content;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(candidate.slice(start, end + 1));
    const record = typeof parsed === 'object' && parsed !== null ? parsed : null;
    return record as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

function normalizeVerdict(value: unknown): QualityVerdict {
  return VERDICTS.includes(value as QualityVerdict) ? (value as QualityVerdict) : 'review';
}

function normalizeScore(value: unknown): number {
  const score = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function normalizeReasons(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((reason): reason is string => typeof reason === 'string');
}

/**
 * Asks the NVIDIA API to assess the quality of a song and returns a
 * normalized assessment.
 *
 * Enhanced with:
 * - Caching to avoid redundant API calls (#422)
 * - Comprehensive logging for debugging (#427)
 * - Fallback behavior when API is unavailable (#425)
 *
 * @param input - Song metadata used for the review. Raw audio is never sent
 *   to the API (see docs/THIRD_PARTY_AI_SECURITY_REVIEW.md).
 * @param options - API key plus optional base URL, model, fetch, caching, logging, and fallback.
 * @returns The normalized quality assessment.
 * @throws SongQualityError when the request fails and fallback is not enabled.
 */
export async function analyzeSongQuality(
  input: SongQualityInput,
  options: SongQualityOptions
): Promise<SongQualityAssessment> {
  const log = options.enableLogging
    ? options.logger ?? ((msg: string, data?: unknown) => console.log(`[SongQuality] ${msg}`, data ?? ''))
    : () => {};

  log('Starting quality analysis', { trackTitle: input.title, artist: input.artist, genre: input.genre });

  // Check cache first if enabled (#422)
  if (options.enableCache !== false) {
    const cache = getQualityCache();
    const trackId = `${input.artist || 'unknown'}-${input.title}`;
    const cached = cache.get(trackId, options.metadataHash);

    if (cached) {
      log('Cache hit - returning cached assessment', { trackId });
      return cached;
    }

    log('Cache miss - proceeding with API call', { trackId });
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.model ?? DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    log('Making NVIDIA API request', { baseUrl, model });

    response = await fetchImpl(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${options.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(input) },
        ],
        temperature: 0.2,
        max_tokens: 512,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const errorMsg = isTimeout 
      ? 'NVIDIA API request timed out'
      : error instanceof Error
        ? `NVIDIA API request failed: ${error.message}`
        : 'NVIDIA API request failed';

    log('API request failed', { error: errorMsg, isTimeout });

    // Apply fallback if enabled (#425)
    if (options.enableFallback) {
      log('Applying fallback assessment');
      return createFallbackAssessment(input, options.fallbackAssessment, 'api_error');
    }

    throw new SongQualityError(errorMsg);
  }
  clearTimeout(timeout);

  if (!response.ok) {
    log('API returned non-OK status', { status: response.status });

    // Apply fallback if enabled (#425)
    if (options.enableFallback) {
      log('Applying fallback assessment due to API error');
      return createFallbackAssessment(input, options.fallbackAssessment, 'api_status_error');
    }

    throw new SongQualityError(
      `NVIDIA API request failed with status ${response.status}`,
      response.status
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | { choices?: Array<{ message?: { content?: string } }>; model?: string }
    | null;
  const content = payload?.choices?.[0]?.message?.content;
  
  if (typeof content !== 'string') {
    log('API returned unexpected response shape');

    if (options.enableFallback) {
      log('Applying fallback assessment due to invalid response');
      return createFallbackAssessment(input, options.fallbackAssessment, 'invalid_response');
    }

    throw new SongQualityError('NVIDIA API returned an unexpected response shape');
  }

  log('Received API response', { contentLength: content.length });

  const answer = extractJson(content);
  if (!answer) {
    log('Failed to extract JSON from API response');

    if (options.enableFallback) {
      log('Applying fallback assessment due to JSON parsing failure');
      return createFallbackAssessment(input, options.fallbackAssessment, 'json_parse_error');
    }

    throw new SongQualityError('NVIDIA API answer did not contain a JSON assessment');
  }

  const assessment: SongQualityAssessment = {
    score: normalizeScore(answer.score),
    verdict: normalizeVerdict(answer.verdict),
    reasons: normalizeReasons(answer.reasons),
    model: payload?.model ?? model,
  };

  log('Successfully created assessment', { score: assessment.score, verdict: assessment.verdict });

  // Cache the result if enabled (#422)
  if (options.enableCache !== false) {
    const cache = getQualityCache();
    const trackId = `${input.artist || 'unknown'}-${input.title}`;
    cache.set(trackId, assessment, options.metadataHash);
    log('Cached assessment result', { trackId });
  }

  return assessment;
}

/**
 * Create a fallback assessment when the NVIDIA API is unavailable (#425).
 */
function createFallbackAssessment(
  input: SongQualityInput,
  customFallback?: Partial<SongQualityAssessment>,
  reason?: string
): SongQualityAssessment {
  const defaultFallback: SongQualityAssessment = {
    score: 70,
    verdict: 'review',
    reasons: [
      'Quality assessment service temporarily unavailable',
      'Track sent to manual review queue',
      reason ? `Fallback reason: ${reason}` : '',
    ].filter(Boolean),
    model: 'fallback',
  };

  return {
    ...defaultFallback,
    ...customFallback,
  };
}
