import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  analyzeSongQuality,
  SongQualityError,
  SongQualityInput,
  SongQualityOptions,
} from '../../lib/songQualityFilter';

/**
 * Integration test for the song quality filter (#450).
 *
 * The global `fetch` is stubbed with canned NVIDIA API responses so the full
 * request/response path (URL, auth header, payload parsing, error mapping) is
 * exercised without any network access.
 */

const OPTIONS: SongQualityOptions = {
  apiKey: 'nvapi-test-key',
  baseUrl: 'https://integrate.api.nvidia.com',
};

const INPUT: SongQualityInput = {
  title: 'Midnight Drive',
  artist: 'Test Artist',
  genre: 'Synthwave',
  durationSeconds: 184,
  lyrics: 'Neon lights on the horizon',
};

function nvidiaChatResponse(content: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      id: 'chatcmpl-nvidia-test',
      object: 'chat.completion',
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
      choices: [{ index: 0, message: { role: 'assistant', content } }],
    }),
  } as unknown as Response;
}

describe('songQualityFilter integration (NVIDIA API mocked)', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('sends a chat completion request to the NVIDIA API and parses the assessment', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      nvidiaChatResponse(
        '{"score": 82, "verdict": "approved", "reasons": ["Clean mix", "Consistent loudness"]}'
      )
    );

    const assessment = await analyzeSongQuality(INPUT, OPTIONS);

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect((init as RequestInit).method).toBe('POST');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer nvapi-test-key');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.model).toBe('nvidia/llama-3.1-nemotron-70b-instruct');
    expect(body.messages[1].content).toContain('Title: Midnight Drive');

    expect(assessment).toEqual({
      score: 82,
      verdict: 'approved',
      reasons: ['Clean mix', 'Consistent loudness'],
      model: 'nvidia/llama-3.1-nemotron-70b-instruct',
    });
  });

  it('parses an assessment wrapped in a markdown code fence', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      nvidiaChatResponse(
        'Result:\n```json\n{"score": 40, "verdict": "rejected", "reasons": ["Clipping"]}\n```'
      )
    );

    const assessment = await analyzeSongQuality(INPUT, OPTIONS);

    expect(assessment.score).toBe(40);
    expect(assessment.verdict).toBe('rejected');
    expect(assessment.reasons).toEqual(['Clipping']);
  });

  it('normalizes out-of-range scores and unknown verdicts', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      nvidiaChatResponse('{"score": 250, "verdict": "excellent", "reasons": ["n/a", 42]}')
    );

    const assessment = await analyzeSongQuality(INPUT, OPTIONS);

    expect(assessment.score).toBe(100);
    expect(assessment.verdict).toBe('review');
    expect(assessment.reasons).toEqual(['n/a']);
  });

  it('maps non-OK NVIDIA responses to a SongQualityError with the status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({}),
    } as unknown as Response);

    await expect(analyzeSongQuality(INPUT, OPTIONS)).rejects.toMatchObject({
      name: 'SongQualityError',
      status: 429,
    });
  });

  it('maps network failures to a SongQualityError', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await expect(analyzeSongQuality(INPUT, OPTIONS)).rejects.toThrow(SongQualityError);
  });

  it('rejects an unexpected response shape', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: 'chatcmpl-nvidia-test', choices: [] }),
    } as unknown as Response);

    await expect(analyzeSongQuality(INPUT, OPTIONS)).rejects.toThrow(
      'unexpected response shape'
    );
  });

  it('rejects an answer without a JSON assessment', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(nvidiaChatResponse('The song sounds great!'));

    await expect(analyzeSongQuality(INPUT, OPTIONS)).rejects.toThrow(
      'did not contain a JSON assessment'
    );
  });
});
