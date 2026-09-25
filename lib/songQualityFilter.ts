/**
 * AI song quality analysis through the NVIDIA API (#450).
 *
 * Part of the AI Song Quality Filter initiative: uploaded songs are screened
 * for quality before they reach the public catalog. This module is the single
 * integration point with the NVIDIA API — callers never talk to it directly,
 * and the API key is always supplied by the caller so it never ends up in the
 * client bundle.
 */

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
 * @param input - Song metadata used for the review. Raw audio is never sent
 *   to the API (see docs/THIRD_PARTY_AI_SECURITY_REVIEW.md).
 * @param options - API key plus optional base URL, model, and fetch.
 * @returns The normalized quality assessment.
 * @throws SongQualityError when the request fails or the answer is unusable.
 */
export async function analyzeSongQuality(
  input: SongQualityInput,
  options: SongQualityOptions
): Promise<SongQualityAssessment> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const model = options.model ?? DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
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
    if (error instanceof Error && error.name === 'AbortError') {
      throw new SongQualityError('NVIDIA API request timed out');
    }
    throw new SongQualityError(
      error instanceof Error
        ? `NVIDIA API request failed: ${error.message}`
        : 'NVIDIA API request failed'
    );
  }
  clearTimeout(timeout);

  if (!response.ok) {
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
    throw new SongQualityError('NVIDIA API returned an unexpected response shape');
  }

  const answer = extractJson(content);
  if (!answer) {
    throw new SongQualityError('NVIDIA API answer did not contain a JSON assessment');
  }

  return {
    score: normalizeScore(answer.score),
    verdict: normalizeVerdict(answer.verdict),
    reasons: normalizeReasons(answer.reasons),
    model: payload?.model ?? model,
  };
}
