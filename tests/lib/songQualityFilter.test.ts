/**
 * Unit tests for Song Quality Filter (#428)
 * Tests quality scoring logic including caching (#422), logging (#427), and fallback (#425)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { resetQualityCache, getQualityCache } from '../../lib/qualityAnalysisCache';
import {
  analyzeSongQuality,
  SongQualityError,
  type SongQualityInput,
  type SongQualityOptions,
  type SongQualityAssessment,
} from '../../lib/songQualityFilter';

describe('songQualityFilter', () => {
  const mockInput: SongQualityInput = {
    title: 'Test Song',
    artist: 'Test Artist',
    genre: 'Rock',
    durationSeconds: 180,
    lyrics: 'Test lyrics',
  };

  const mockAssessment: SongQualityAssessment = {
    score: 85,
    verdict: 'approved',
    reasons: ['Good production quality', 'Clear vocals'],
    model: 'test-model',
  };

  beforeEach(() => {
    resetQualityCache();
    vi.clearAllMocks();
  });

  describe('basic quality assessment', () => {
    it('should successfully analyze song quality', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  score: 85,
                  verdict: 'approved',
                  reasons: ['Good production quality', 'Clear vocals'],
                }),
              },
            },
          ],
          model: 'test-model',
        }),
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(result.score).toBe(85);
      expect(result.verdict).toBe('approved');
      expect(result.reasons).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it('should handle JSON in markdown code fences', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '```json\n{"score": 75, "verdict": "review", "reasons": ["Needs improvement"]}\n```',
              },
            },
          ],
          model: 'test-model',
        }),
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(result.score).toBe(75);
      expect(result.verdict).toBe('review');
    });

    it('should normalize score to 0-100 range', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"score": 150, "verdict": "approved", "reasons": []}' } },
          ],
        }),
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(result.score).toBe(100);
    });

    it('should normalize invalid verdict to "review"', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: '{"score": 80, "verdict": "invalid", "reasons": []}' } },
          ],
        }),
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(result.verdict).toBe('review');
    });

    it('should filter non-string reasons', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '{"score": 80, "verdict": "approved", "reasons": ["Valid", 123, null, "Another"]}',
              },
            },
          ],
        }),
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(result.reasons).toEqual(['Valid', 'Another']);
    });
  });

  describe('caching functionality (#422)', () => {
    it('should cache successful assessments', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: true,
      });

      const cache = getQualityCache();
      const trackId = `${mockInput.artist}-${mockInput.title}`;
      const cached = cache.get(trackId);

      expect(cached).not.toBeNull();
      expect(cached?.score).toBe(85);
    });

    it('should return cached result on subsequent calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      const options: SongQualityOptions = {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: true,
      };

      const result1 = await analyzeSongQuality(mockInput, options);
      const result2 = await analyzeSongQuality(mockInput, options);

      expect(result1).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledOnce(); // API called only once
    });

    it('should support metadata hash in cache key', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: true,
        metadataHash: 'hash-123',
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: true,
        metadataHash: 'hash-456',
      });

      expect(mockFetch).toHaveBeenCalledTimes(2); // Different hashes = cache miss
    });

    it('should skip cache when enableCache is false', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      const options: SongQualityOptions = {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      };

      await analyzeSongQuality(mockInput, options);
      await analyzeSongQuality(mockInput, options);

      expect(mockFetch).toHaveBeenCalledTimes(2); // API called twice
    });
  });

  describe('logging functionality (#427)', () => {
    it('should log analysis steps when logging is enabled', async () => {
      const mockLogger = vi.fn();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableLogging: true,
        logger: mockLogger,
        enableCache: false,
      });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Starting quality analysis'),
        expect.any(Object)
      );
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Making NVIDIA API request'),
        expect.any(Object)
      );
      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Successfully created assessment'),
        expect.any(Object)
      );
    });

    it('should log cache hits', async () => {
      const mockLogger = vi.fn();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      const options: SongQualityOptions = {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableLogging: true,
        logger: mockLogger,
        enableCache: true,
      };

      await analyzeSongQuality(mockInput, options);
      mockLogger.mockClear();

      await analyzeSongQuality(mockInput, options);

      expect(mockLogger).toHaveBeenCalledWith(
        expect.stringContaining('Cache hit'),
        expect.any(Object)
      );
    });

    it('should not log when logging is disabled', async () => {
      const mockLogger = vi.fn();
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableLogging: false,
        logger: mockLogger,
        enableCache: false,
      });

      expect(mockLogger).not.toHaveBeenCalled();
    });

    it('should use console.log as default logger', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableLogging: true,
        enableCache: false,
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('fallback behavior (#425)', () => {
    it('should return fallback assessment on network error', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableFallback: true,
        enableCache: false,
      });

      expect(result.score).toBe(70);
      expect(result.verdict).toBe('review');
      expect(result.model).toBe('fallback');
      expect(result.reasons).toContain('Quality assessment service temporarily unavailable');
    });

    it('should return fallback assessment on API timeout', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableFallback: true,
        enableCache: false,
      });

      expect(result.verdict).toBe('review');
      expect(result.model).toBe('fallback');
    });

    it('should return fallback assessment on non-OK response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableFallback: true,
        enableCache: false,
      });

      expect(result.verdict).toBe('review');
      expect(result.model).toBe('fallback');
    });

    it('should return fallback assessment on invalid JSON response', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'This is not JSON' } }],
        }),
      });

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableFallback: true,
        enableCache: false,
      });

      expect(result.verdict).toBe('review');
      expect(result.model).toBe('fallback');
    });

    it('should use custom fallback assessment', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const customFallback: Partial<SongQualityAssessment> = {
        score: 50,
        verdict: 'rejected',
        reasons: ['Custom fallback reason'],
      };

      const result = await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableFallback: true,
        fallbackAssessment: customFallback,
        enableCache: false,
      });

      expect(result.score).toBe(50);
      expect(result.verdict).toBe('rejected');
      expect(result.reasons).toContain('Custom fallback reason');
    });

    it('should throw error when fallback is disabled', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(
        analyzeSongQuality(mockInput, {
          apiKey: 'test-key',
          fetchImpl: mockFetch as unknown as typeof fetch,
          enableFallback: false,
          enableCache: false,
        })
      ).rejects.toThrow(SongQualityError);
    });
  });

  describe('error handling', () => {
    it('should throw SongQualityError on API timeout without fallback', async () => {
      const mockFetch = vi.fn().mockImplementation(() => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      await expect(
        analyzeSongQuality(mockInput, {
          apiKey: 'test-key',
          fetchImpl: mockFetch as unknown as typeof fetch,
          enableCache: false,
        })
      ).rejects.toThrow('NVIDIA API request timed out');
    });

    it('should throw SongQualityError on non-OK response without fallback', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      await expect(
        analyzeSongQuality(mockInput, {
          apiKey: 'test-key',
          fetchImpl: mockFetch as unknown as typeof fetch,
          enableCache: false,
        })
      ).rejects.toThrow(SongQualityError);
    });

    it('should include status code in error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      try {
        await analyzeSongQuality(mockInput, {
          apiKey: 'test-key',
          fetchImpl: mockFetch as unknown as typeof fetch,
          enableCache: false,
        });
      } catch (error) {
        expect(error).toBeInstanceOf(SongQualityError);
        expect((error as SongQualityError).status).toBe(503);
      }
    });

    it('should throw on unexpected response shape without fallback', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ unexpected: 'shape' }),
      });

      await expect(
        analyzeSongQuality(mockInput, {
          apiKey: 'test-key',
          fetchImpl: mockFetch as unknown as typeof fetch,
          enableCache: false,
        })
      ).rejects.toThrow('unexpected response shape');
    });

    it('should throw when JSON extraction fails without fallback', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Not valid JSON at all' } }],
        }),
      });

      await expect(
        analyzeSongQuality(mockInput, {
          apiKey: 'test-key',
          fetchImpl: mockFetch as unknown as typeof fetch,
          enableCache: false,
        })
      ).rejects.toThrow('did not contain a JSON assessment');
    });
  });

  describe('API integration', () => {
    it('should use correct default base URL and model', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        expect.any(Object)
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.model).toBe('nvidia/llama-3.1-nemotron-70b-instruct');
    });

    it('should use custom base URL and model', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        baseUrl: 'https://custom.api.com',
        model: 'custom-model',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.api.com/v1/chat/completions',
        expect.any(Object)
      );

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      expect(body.model).toBe('custom-model');
    });

    it('should include API key in authorization header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'my-secret-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      const callArgs = mockFetch.mock.calls[0][1];
      expect(callArgs.headers.Authorization).toBe('Bearer my-secret-key');
    });

    it('should build correct user prompt from input', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: JSON.stringify(mockAssessment) } }],
        }),
      });

      await analyzeSongQuality(mockInput, {
        apiKey: 'test-key',
        fetchImpl: mockFetch as unknown as typeof fetch,
        enableCache: false,
      });

      const callArgs = mockFetch.mock.calls[0][1];
      const body = JSON.parse(callArgs.body);
      const userMessage = body.messages.find((m: { role: string }) => m.role === 'user');

      expect(userMessage.content).toContain('Title: Test Song');
      expect(userMessage.content).toContain('Artist: Test Artist');
      expect(userMessage.content).toContain('Genre: Rock');
      expect(userMessage.content).toContain('Duration: 180 seconds');
      expect(userMessage.content).toContain('Lyrics: Test lyrics');
    });
  });
});
